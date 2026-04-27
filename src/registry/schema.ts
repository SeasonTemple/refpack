import { UserError } from "../errors/user-error.js";
import type { RegistryEntry, SkillsRegistry } from "./types.js";

const INTEGRITY_PATTERN = /^sha256-[A-Za-z0-9+/]{43}=$/;

function requireString(record: Record<string, unknown>, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new UserError(`${context}.${key} must be a non-empty string.`, "INVALID_REGISTRY");
  }
  return value;
}

function optionalStringArray(value: unknown, context: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new UserError(`${context} must be an array of non-empty strings.`, "INVALID_REGISTRY");
  }
  return value;
}

function optionalPositiveInteger(value: unknown, context: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new UserError(`${context} must be a positive integer.`, "INVALID_REGISTRY");
  }
  return value;
}

function optionalIntegrity(value: unknown, context: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !INTEGRITY_PATTERN.test(value)) {
    throw new UserError(`${context} must use sha256-<base64-digest> format.`, "INVALID_REGISTRY");
  }
  return value;
}

function optionalArtifactType(value: unknown, context: string): "tgz" | undefined {
  if (value === undefined) return undefined;
  if (value !== "tgz") {
    throw new UserError(`${context} must be "tgz".`, "INVALID_REGISTRY");
  }
  return value;
}

function parseEntry(value: unknown, index: number): RegistryEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UserError(`registry.skills[${index}] must be an object.`, "INVALID_REGISTRY");
  }

  const record = value as Record<string, unknown>;
  const context = `registry.skills[${index}]`;
  const artifactType = optionalArtifactType(record.artifactType, `${context}.artifactType`);
  const integrity = optionalIntegrity(record.integrity, `${context}.integrity`);
  const sizeBytes = optionalPositiveInteger(record.sizeBytes, `${context}.sizeBytes`);

  if ((artifactType || integrity || sizeBytes) && (!artifactType || !integrity || !sizeBytes)) {
    throw new UserError(`${context} archive entries must include integrity and sizeBytes.`, "INVALID_REGISTRY");
  }

  return {
    id: requireString(record, "id", context),
    name: requireString(record, "name", context),
    description: requireString(record, "description", context),
    source: requireString(record, "source", context),
    manifestPath: typeof record.manifestPath === "string" ? record.manifestPath : undefined,
    tags: optionalStringArray(record.tags, `${context}.tags`),
    adapters: optionalStringArray(record.adapters, `${context}.adapters`),
    version: typeof record.version === "string" ? record.version : undefined,
    artifactType,
    integrity,
    sizeBytes
  };
}

export function parseRegistry(value: unknown): SkillsRegistry {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UserError("Registry must contain a JSON object.", "INVALID_REGISTRY");
  }

  const record = value as Record<string, unknown>;
  const schemaVersion = typeof record.schemaVersion === "string" ? record.schemaVersion : "1.0";
  const name = requireString(record, "name", "registry");

  if (!Array.isArray(record.skills)) {
    throw new UserError("registry.skills must be an array.", "INVALID_REGISTRY");
  }

  const skills = record.skills.map(parseEntry);
  const ids = new Set<string>();
  for (const skill of skills) {
    if (ids.has(skill.id)) {
      throw new UserError(`Duplicate registry skill id: ${skill.id}`, "INVALID_REGISTRY");
    }
    ids.add(skill.id);
  }

  return { schemaVersion, name, skills };
}
