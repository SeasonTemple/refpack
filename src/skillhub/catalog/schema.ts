import { UserError } from "../../errors/user-error.js";
import { assertSafeRelativePath } from "../../paths.js";
import type { SkillHubCatalog, SkillHubCatalogSkill, SkillHubCatalogVersion } from "./types.js";

const SLUG_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
const INTEGRITY_PATTERN = /^sha256-[A-Za-z0-9+/]{43}=$/;

function requireString(record: Record<string, unknown>, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new UserError(`${context}.${key} must be a non-empty string.`, "INVALID_SKILLHUB_CATALOG");
  }
  return value;
}

function optionalString(record: Record<string, unknown>, key: string, context: string): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new UserError(`${context}.${key} must be a non-empty string when provided.`, "INVALID_SKILLHUB_CATALOG");
  }
  return value;
}

function optionalRootManifest(record: Record<string, unknown>, key: string, context: string): string | undefined {
  const value = optionalString(record, key, context);
  if (value === undefined) return undefined;
  if (value !== "skills.json") {
    throw new UserError(`${context}.${key} must be skills.json for SkillHub v1.`, "INVALID_SKILLHUB_CATALOG");
  }
  return value;
}

function optionalStringArray(value: unknown, context: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new UserError(`${context} must be an array of non-empty strings.`, "INVALID_SKILLHUB_CATALOG");
  }
  return value;
}

function requireSafeSlug(value: string, label: string): string {
  if (!SLUG_PATTERN.test(value) || value.includes("..") || value.includes("%")) {
    throw new UserError(`${label} must be a route-safe slug.`, "INVALID_SKILLHUB_CATALOG");
  }
  return value;
}

function requireIntegrity(value: string, label: string): string {
  if (!INTEGRITY_PATTERN.test(value)) {
    throw new UserError(`${label} must use sha256-<base64-digest> format.`, "INVALID_SKILLHUB_CATALOG");
  }
  return value;
}

function requirePositiveInteger(record: Record<string, unknown>, key: string, context: string): number {
  const value = record[key];
  if (!Number.isInteger(value) || typeof value !== "number" || value <= 0) {
    throw new UserError(`${context}.${key} must be a positive integer.`, "INVALID_SKILLHUB_CATALOG");
  }
  return value;
}

function parseVersion(value: unknown, context: string): SkillHubCatalogVersion {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UserError(`${context} must be an object.`, "INVALID_SKILLHUB_CATALOG");
  }

  const record = value as Record<string, unknown>;
  const version = requireSafeSlug(requireString(record, "version", context), `${context}.version`);
  const artifactPath = assertSafeRelativePath(requireString(record, "artifactPath", context), `${context}.artifactPath`);
  if (!artifactPath.endsWith(".tgz")) {
    throw new UserError(`${context}.artifactPath must point to a .tgz artifact.`, "INVALID_SKILLHUB_CATALOG");
  }

  const artifactType = requireString(record, "artifactType", context);
  if (artifactType !== "tgz") {
    throw new UserError(`${context}.artifactType must be "tgz".`, "INVALID_SKILLHUB_CATALOG");
  }

  const reviewStatus = optionalString(record, "reviewStatus", context);
  if (reviewStatus && !["unreviewed", "verified", "rejected"].includes(reviewStatus)) {
    throw new UserError(`${context}.reviewStatus is invalid.`, "INVALID_SKILLHUB_CATALOG");
  }

  return {
    version,
    artifactPath,
    artifactType,
    integrity: requireIntegrity(requireString(record, "integrity", context), `${context}.integrity`),
    sizeBytes: requirePositiveInteger(record, "sizeBytes", context),
    manifestPath: optionalRootManifest(record, "manifestPath", context),
    reviewStatus: reviewStatus as SkillHubCatalogVersion["reviewStatus"],
    publishedAt: optionalString(record, "publishedAt", context)
  };
}

function parseSkill(value: unknown, index: number): SkillHubCatalogSkill {
  const context = `catalog.skills[${index}]`;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UserError(`${context} must be an object.`, "INVALID_SKILLHUB_CATALOG");
  }

  const record = value as Record<string, unknown>;
  const id = requireSafeSlug(requireString(record, "id", context), `${context}.id`);
  const latestVersion = requireSafeSlug(requireString(record, "latestVersion", context), `${context}.latestVersion`);
  const versionsValue = record.versions;
  if (!Array.isArray(versionsValue) || versionsValue.length === 0) {
    throw new UserError(`${context}.versions must contain at least one version.`, "INVALID_SKILLHUB_CATALOG");
  }

  const versions = versionsValue.map((item, versionIndex) => parseVersion(item, `${context}.versions[${versionIndex}]`));
  const versionIds = new Set<string>();
  for (const version of versions) {
    if (versionIds.has(version.version)) {
      throw new UserError(`Duplicate version for skill ${id}: ${version.version}`, "INVALID_SKILLHUB_CATALOG");
    }
    versionIds.add(version.version);
  }
  if (!versionIds.has(latestVersion)) {
    throw new UserError(`Latest version not found for skill ${id}: ${latestVersion}`, "INVALID_SKILLHUB_CATALOG");
  }

  return {
    id,
    name: requireString(record, "name", context),
    description: requireString(record, "description", context),
    latestVersion,
    versions,
    tags: optionalStringArray(record.tags, `${context}.tags`),
    adapters: optionalStringArray(record.adapters, `${context}.adapters`)
  };
}

export function parseSkillHubCatalog(value: unknown): SkillHubCatalog {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UserError("SkillHub catalog must contain a JSON object.", "INVALID_SKILLHUB_CATALOG");
  }

  const record = value as Record<string, unknown>;
  const skillsValue = record.skills;
  if (!Array.isArray(skillsValue) || skillsValue.length === 0) {
    throw new UserError("catalog.skills must contain at least one skill.", "INVALID_SKILLHUB_CATALOG");
  }

  const skills = skillsValue.map(parseSkill);
  const ids = new Set<string>();
  for (const skill of skills) {
    if (ids.has(skill.id)) {
      throw new UserError(`Duplicate SkillHub skill id: ${skill.id}`, "INVALID_SKILLHUB_CATALOG");
    }
    ids.add(skill.id);
  }

  return {
    schemaVersion: typeof record.schemaVersion === "string" ? record.schemaVersion : "1.0",
    name: requireString(record, "name", "catalog"),
    skills
  };
}
