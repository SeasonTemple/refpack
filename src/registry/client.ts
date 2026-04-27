import path from "node:path";
import fs from "fs-extra";
import { UserError } from "../errors/user-error.js";
import type { RegistryEntry, SkillsRegistry } from "./types.js";
import { parseRegistry } from "./schema.js";

export async function readRegistry(registryRef: string): Promise<SkillsRegistry> {
  let raw: unknown;

  if (/^https?:\/\//i.test(registryRef)) {
    const response = await fetch(registryRef);
    if (!response.ok) {
      throw new UserError(`Failed to fetch registry ${registryRef}: ${response.status} ${response.statusText}`, "REGISTRY_FETCH_FAILED");
    }
    raw = await response.json();
  } else {
    const file = path.resolve(registryRef);
    if (!(await fs.pathExists(file))) {
      throw new UserError(`Registry file not found: ${registryRef}`, "REGISTRY_NOT_FOUND");
    }
    raw = await fs.readJson(file);
  }

  return parseRegistry(raw);
}

export function searchRegistry(registry: SkillsRegistry, query: string): RegistryEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return registry.skills;

  return registry.skills.filter((entry) => {
    const haystack = [
      entry.id,
      entry.name,
      entry.description,
      ...(entry.tags ?? []),
      ...(entry.adapters ?? [])
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(needle);
  });
}

export function findRegistryEntry(registry: SkillsRegistry, id: string): RegistryEntry {
  const entry = registry.skills.find((candidate) => candidate.id === id);
  if (!entry) {
    throw new UserError(`Skill not found in registry: ${id}`, "REGISTRY_ENTRY_NOT_FOUND");
  }
  return entry;
}
