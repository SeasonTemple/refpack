import path from "node:path";
import fs from "fs-extra";
import { UserError } from "./errors/user-error.js";

export interface SkillsConfig {
  target?: string;
  registry?: string;
}

export const CONFIG_FILE = ".skillsrc.json";

export async function loadConfig(cwd = process.cwd()): Promise<SkillsConfig> {
  const file = path.join(cwd, CONFIG_FILE);
  if (!(await fs.pathExists(file))) return {};

  const config = await fs.readJson(file);
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new UserError(`${CONFIG_FILE} must contain a JSON object.`, "INVALID_CONFIG");
  }

  return {
    target: typeof config.target === "string" ? config.target : undefined,
    registry: typeof config.registry === "string" ? config.registry : undefined
  };
}

export async function saveConfig(config: SkillsConfig, cwd = process.cwd()): Promise<string> {
  const file = path.join(cwd, CONFIG_FILE);
  await fs.writeJson(file, config, { spaces: 2 });
  return file;
}

export function resolveTarget(optionsTarget: string | undefined, config: SkillsConfig): string {
  const target = optionsTarget ?? config.target;
  if (!target) {
    throw new UserError("Missing target directory. Pass --target <dir> or run skills init.", "MISSING_TARGET");
  }
  return path.resolve(target);
}
