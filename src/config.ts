import path from "node:path";
import fs from "fs-extra";
import { UserError } from "./errors/user-error.js";

export interface RefpackConfig {
  target?: string;
  registry?: string;
}

export const CONFIG_FILE = ".refpackrc.json";

export async function loadConfig(cwd = process.cwd()): Promise<RefpackConfig> {
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

export async function saveConfig(config: RefpackConfig, cwd = process.cwd()): Promise<string> {
  const file = path.join(cwd, CONFIG_FILE);
  await fs.writeJson(file, config, { spaces: 2 });
  return file;
}

export function resolveTarget(optionsTarget: string | undefined, config: RefpackConfig): string {
  const target = optionsTarget ?? config.target;
  if (!target) {
    throw new UserError("Missing target directory. Pass --target <dir> or run refpack init.", "MISSING_TARGET");
  }
  return path.resolve(target);
}
