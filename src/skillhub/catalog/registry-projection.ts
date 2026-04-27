import { UserError } from "../../errors/user-error.js";
import type { RegistryEntry, SkillsRegistry } from "../../registry/types.js";
import type { SkillHubCatalog, SkillHubCatalogSkill } from "./types.js";

export interface RegistryProjectionOptions {
  publicBaseUrl: string;
}

export function projectCatalogToRegistry(
  catalog: SkillHubCatalog,
  options: RegistryProjectionOptions
): SkillsRegistry {
  const baseUrl = normalizePublicBaseUrl(options.publicBaseUrl);
  return {
    schemaVersion: "1.0",
    name: catalog.name,
    skills: catalog.skills.map((skill) => projectSkill(skill, baseUrl))
  };
}

function projectSkill(skill: SkillHubCatalogSkill, baseUrl: string): RegistryEntry {
  const version = skill.versions.find((candidate) => candidate.version === skill.latestVersion);
  if (!version) {
    throw new UserError(`Latest version not found for skill ${skill.id}: ${skill.latestVersion}`, "INVALID_SKILLHUB_CATALOG");
  }

  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    source: `${baseUrl}/api/packs/${encodeURIComponent(skill.id)}/${encodeURIComponent(version.version)}`,
    manifestPath: version.manifestPath ?? "skills.json",
    tags: skill.tags,
    adapters: skill.adapters,
    version: version.version,
    artifactType: version.artifactType,
    integrity: version.integrity,
    sizeBytes: version.sizeBytes
  };
}

function normalizePublicBaseUrl(value: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new UserError("SkillHub publicBaseUrl must be a non-empty URL.", "INVALID_SKILLHUB_CONFIG");
  }
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new UserError("SkillHub publicBaseUrl must use http or https.", "INVALID_SKILLHUB_CONFIG");
  }
  return url.toString().replace(/\/$/, "");
}
