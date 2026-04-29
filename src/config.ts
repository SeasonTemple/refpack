import path from "node:path";
import fs from "fs-extra";
import { detectAgent } from "./agents/index.js";
import { UserError } from "./errors/user-error.js";

export interface RefpackConfig {
  target?: string;
  registry?: string;
  agent?: string;
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
    registry: typeof config.registry === "string" ? config.registry : undefined,
    agent: typeof config.agent === "string" ? config.agent : undefined
  };
}

export async function saveConfig(config: RefpackConfig, cwd = process.cwd()): Promise<string> {
  const file = path.join(cwd, CONFIG_FILE);
  await fs.writeJson(file, config, { spaces: 2 });
  return file;
}

export interface TargetResolutionOptions {
  target?: string;
  agent?: string;
}

export interface ResolvedTarget {
  targetDir: string;
  agent?: string;
}

export async function resolveTarget(options: TargetResolutionOptions, config: RefpackConfig): Promise<ResolvedTarget> {
  if (options.target) {
    return { targetDir: path.resolve(options.target), agent: options.agent ?? config.agent };
  }

  const agentId = options.agent ?? config.agent;
  if (agentId) {
    const agent = await detectAgent(agentId);
    if (agent.targetDir && (agent.status === "available" || agent.status === "creatable")) {
      return { targetDir: agent.targetDir, agent: agent.id };
    }
    if (config.target && agent.id === "generic") {
      return { targetDir: path.resolve(config.target), agent: agent.id };
    }
    throw new UserError(`Agent ${agentId} does not have a writable target. Pass --target <dir> to use an explicit path.`, "AGENT_TARGET_UNAVAILABLE");
  }

  const target = config.target;
  if (!target) {
    throw new UserError("Missing target directory. Pass --target <dir>, --agent <id>, or run refpack init.", "MISSING_TARGET");
  }
  return { targetDir: path.resolve(target), agent: config.agent };
}
