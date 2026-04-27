import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import fsExtra from "fs-extra";
import { UserError } from "../errors/user-error.js";
import { readManifest } from "../manifest/read.js";
import type { SkillDefinition } from "../manifest/types.js";
import { assertRootManifest, createTgzFromDirectory, extractTgz, sha256Integrity } from "../source/archive.js";
import { isInside, resolveInside } from "../paths.js";
import { readSkillHubCatalog } from "./catalog/read.js";
import type { SkillHubCatalogVersion } from "./catalog/types.js";

const DEFAULT_MAX_ARTIFACT_SIZE_BYTES = 10 * 1024 * 1024;
const SLUG_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export interface PackSkillHubOptions {
  packDir: string;
  outDir: string;
  version: string;
  skillId?: string;
  reviewStatus?: SkillHubCatalogVersion["reviewStatus"];
}

export interface PackedSkillHubArtifact {
  skill: SkillDefinition;
  version: SkillHubCatalogVersion;
  artifactFile: string;
}

export interface ValidateSkillHubCatalogOptions {
  catalogPath: string;
  artifactRoot: string;
  maxArtifactSizeBytes?: number;
}

export interface SkillHubCatalogValidationResult {
  catalogName: string;
  artifactCount: number;
}

export async function packSkillHubArtifact(options: PackSkillHubOptions): Promise<PackedSkillHubArtifact> {
  requireSafeSlug(options.version, "version");
  if (options.reviewStatus && !["unreviewed", "verified", "rejected"].includes(options.reviewStatus)) {
    throw new UserError("reviewStatus must be unreviewed, verified, or rejected.", "INVALID_SKILLHUB_CATALOG");
  }

  const packDir = path.resolve(options.packDir);
  const outDir = path.resolve(options.outDir);
  if (isInside(packDir, outDir)) {
    throw new UserError("Output directory must be outside the skill pack directory.", "SKILLHUB_PACK_OUTPUT_INSIDE_PACK");
  }
  const manifest = await readManifest(packDir);
  const skill = selectSkill(manifest.skills, options.skillId);
  requireSafeSlug(skill.id, "skill id");

  const artifactPath = `${skill.id}/${options.version}.tgz`;
  const artifactFile = path.join(outDir, skill.id, `${options.version}.tgz`);
  const artifact = await createTgzFromDirectory(packDir);
  const version: SkillHubCatalogVersion = {
    version: options.version,
    artifactPath,
    artifactType: "tgz",
    integrity: sha256Integrity(artifact),
    sizeBytes: artifact.length,
    manifestPath: "skills.json",
    reviewStatus: options.reviewStatus
  };

  await fsExtra.ensureDir(path.dirname(artifactFile));
  await fs.writeFile(artifactFile, artifact);

  return { skill, version, artifactFile };
}

export async function validateSkillHubCatalog(
  options: ValidateSkillHubCatalogOptions
): Promise<SkillHubCatalogValidationResult> {
  const catalog = await readSkillHubCatalog(path.resolve(options.catalogPath));
  const artifactRoot = path.resolve(options.artifactRoot);
  const maxArtifactSizeBytes = options.maxArtifactSizeBytes ?? DEFAULT_MAX_ARTIFACT_SIZE_BYTES;
  if (!Number.isInteger(maxArtifactSizeBytes) || maxArtifactSizeBytes <= 0) {
    throw new UserError("maxArtifactSizeBytes must be a positive integer.", "SKILLHUB_CONFIG_ERROR");
  }
  let artifactCount = 0;

  for (const skill of catalog.skills) {
    for (const version of skill.versions) {
      await validateArtifact(artifactRoot, skill.id, version, maxArtifactSizeBytes);
      artifactCount += 1;
    }
  }

  return { catalogName: catalog.name, artifactCount };
}

async function validateArtifact(
  artifactRoot: string,
  skillId: string,
  version: SkillHubCatalogVersion,
  maxArtifactSizeBytes: number
): Promise<void> {
  const file = resolveInside(artifactRoot, version.artifactPath, "artifactPath");
  const stats = await fsExtra.stat(file).catch(() => undefined);
  if (!stats?.isFile()) {
    throw new UserError(`Artifact not found for ${skillId}@${version.version}: ${version.artifactPath}`, "SKILLHUB_ARTIFACT_NOT_FOUND");
  }
  if (stats.size !== version.sizeBytes) {
    throw new UserError(`Artifact size mismatch for ${skillId}@${version.version}`, "SKILLHUB_ARTIFACT_SIZE_MISMATCH");
  }
  if (stats.size > maxArtifactSizeBytes) {
    throw new UserError(`Artifact exceeds configured size limit for ${skillId}@${version.version}`, "SKILLHUB_ARTIFACT_TOO_LARGE");
  }

  const artifact = await fs.readFile(file);
  if (sha256Integrity(artifact) !== version.integrity) {
    throw new UserError(`Artifact integrity mismatch for ${skillId}@${version.version}`, "ARCHIVE_INTEGRITY_MISMATCH");
  }

  const tmp = await fsExtra.mkdtemp(path.join(os.tmpdir(), "skillhub-validate-"));
  try {
    await extractTgz(artifact, tmp);
    await assertRootManifest(tmp);
    await readManifest(tmp);
  } finally {
    await fsExtra.remove(tmp);
  }
}

function selectSkill(skills: SkillDefinition[], skillId?: string): SkillDefinition {
  if (skillId) {
    const found = skills.find((skill) => skill.id === skillId);
    if (!found) throw new UserError(`Skill not found in manifest: ${skillId}`, "SKILL_NOT_FOUND");
    return found;
  }
  if (skills.length !== 1) {
    throw new UserError("Pack contains multiple skills. Pass --id to choose the catalog skill id.", "SKILLHUB_PACK_REQUIRES_ID");
  }
  return skills[0];
}

function requireSafeSlug(value: string, label: string): void {
  if (!SLUG_PATTERN.test(value) || value.includes("..") || value.includes("%")) {
    throw new UserError(`${label} must be a route-safe slug.`, "INVALID_SKILLHUB_CATALOG");
  }
}
