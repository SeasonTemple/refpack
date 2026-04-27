import { UserError } from "../errors/user-error.js";
import { assertSafeRelativePath } from "../paths.js";
import type { SkillConfigInstruction, SkillDefinition, SkillsManifest } from "./types.js";

function requireString(record: Record<string, unknown>, key: string, context: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new UserError(`${context}.${key} must be a non-empty string.`, "INVALID_MANIFEST");
  }
  return value;
}

function optionalStringArray(value: unknown, context: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new UserError(`${context} must be an array of non-empty strings.`, "INVALID_MANIFEST");
  }
  return value;
}

function parseDependencies(value: unknown, context: string): SkillDefinition["dependencies"] {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UserError(`${context} must be an object.`, "INVALID_MANIFEST");
  }
  const npm = optionalStringArray((value as Record<string, unknown>).npm, `${context}.npm`);
  return npm ? { npm } : undefined;
}

function parseConfigInstructions(value: unknown, context: string): SkillConfigInstruction[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new UserError(`${context} must be an array.`, "INVALID_MANIFEST");
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new UserError(`${context}[${index}] must be an object.`, "INVALID_MANIFEST");
    }
    const record = item as Record<string, unknown>;
    return {
      adapter: requireString(record, "adapter", `${context}[${index}]`),
      instructions: requireString(record, "instructions", `${context}[${index}]`)
    };
  });
}

function parseSkill(value: unknown, index: number): SkillDefinition {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UserError(`skills[${index}] must be an object.`, "INVALID_MANIFEST");
  }

  const record = value as Record<string, unknown>;
  const context = `skills[${index}]`;
  const id = requireString(record, "id", context);
  const name = requireString(record, "name", context);
  const description = requireString(record, "description", context);
  const source = assertSafeRelativePath(requireString(record, "source", context), `${context}.source`);
  const target = assertSafeRelativePath(
    typeof record.target === "string" ? record.target : id,
    `${context}.target`
  );

  return {
    id,
    name,
    description,
    source,
    target,
    adapters: optionalStringArray(record.adapters, `${context}.adapters`),
    dependencies: parseDependencies(record.dependencies, `${context}.dependencies`),
    requiresScripts: typeof record.requiresScripts === "boolean" ? record.requiresScripts : false,
    configInstructions: parseConfigInstructions(record.configInstructions, `${context}.configInstructions`)
  };
}

export function parseManifest(value: unknown): SkillsManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UserError("skills.json must contain a JSON object.", "INVALID_MANIFEST");
  }

  const record = value as Record<string, unknown>;
  const schemaVersion = typeof record.schemaVersion === "string" ? record.schemaVersion : "1.0";
  const name = requireString(record, "name", "manifest");
  const skillsValue = record.skills;

  if (!Array.isArray(skillsValue) || skillsValue.length === 0) {
    throw new UserError("manifest.skills must contain at least one skill.", "INVALID_MANIFEST");
  }

  const skills = skillsValue.map(parseSkill);
  const ids = new Set<string>();
  for (const skill of skills) {
    if (ids.has(skill.id)) {
      throw new UserError(`Duplicate skill id in manifest: ${skill.id}`, "INVALID_MANIFEST");
    }
    ids.add(skill.id);
  }

  return { schemaVersion, name, skills };
}
