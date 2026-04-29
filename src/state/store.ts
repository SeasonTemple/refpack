import path from "node:path";
import fs from "fs-extra";
import { UserError } from "../errors/user-error.js";
import { normalizeDisplayPath, resolveInside } from "../paths.js";
import { parseInstalledState } from "./schema.js";
import type { InstalledSkill, InstalledState } from "./types.js";

export const STATE_DIR = ".refpack";
export const STATE_FILE = "installed-state.json";

export function stateFilePath(targetDir: string): string {
  return path.join(path.resolve(targetDir), STATE_DIR, STATE_FILE);
}

export async function readInstalledState(targetDir: string): Promise<InstalledState> {
  const file = stateFilePath(targetDir);
  if (!(await fs.pathExists(file))) return emptyState();

  try {
    return parseInstalledState(await fs.readJson(file));
  } catch (error) {
    if (error instanceof UserError) {
      throw new UserError(`Installed state is malformed at ${file}: ${error.message}. Remove or repair the file to continue.`, "INVALID_STATE");
    }
    throw new UserError(`Installed state is malformed at ${file}: ${(error as Error).message}. Remove or repair the file to continue.`, "INVALID_STATE");
  }
}

export async function writeInstalledState(targetDir: string, state: InstalledState): Promise<void> {
  await fs.ensureDir(path.dirname(stateFilePath(targetDir)));
  await fs.writeJson(stateFilePath(targetDir), state, { spaces: 2 });
}

export async function upsertInstalledSkill(targetDir: string, skill: InstalledSkill): Promise<void> {
  const state = await readInstalledState(targetDir);
  state.installed = state.installed.filter((entry) => entry.id !== skill.id);
  state.installed.push(skill);
  state.installed.sort((a, b) => a.id.localeCompare(b.id));
  await writeInstalledState(targetDir, state);
}

export async function removeInstalledSkill(targetDir: string, id: string): Promise<void> {
  const state = await readInstalledState(targetDir);
  state.installed = state.installed.filter((entry) => entry.id !== id);
  await writeInstalledState(targetDir, state);
}

export function emptyState(): InstalledState {
  return { schemaVersion: "1.0", installed: [] };
}

export function relativeSkillTarget(targetDir: string, skillTargetDir: string): string {
  const relative = normalizeDisplayPath(path.relative(path.resolve(targetDir), path.resolve(skillTargetDir)));
  resolveInside(targetDir, relative, "installed target");
  return relative;
}
