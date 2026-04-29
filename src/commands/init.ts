import path from "node:path";
import { detectAgent } from "../agents/index.js";
import { saveConfig } from "../config.js";
import { UserError } from "../errors/user-error.js";
import { promptForRegistry, promptForTarget } from "../ui/prompts.js";
import { color } from "../ui/theme.js";

export interface InitOptions {
  target?: string;
  agent?: string;
  registry?: string;
}

export async function runInit(options: InitOptions): Promise<void> {
  const target = options.target ?? (options.agent ? await targetForAgent(options.agent) : await promptForTarget("./skills"));
  const registry = options.registry ?? (await promptForRegistry());
  const file = await saveConfig({ target: path.resolve(target), registry, agent: options.agent });
  console.log(color.green(`Saved config to ${file}`));
}

async function targetForAgent(agentId: string): Promise<string> {
  const agent = await detectAgent(agentId);
  if (agent.targetDir && (agent.status === "available" || agent.status === "creatable")) return agent.targetDir;
  throw new UserError(`Agent ${agentId} does not have a writable target. Pass --target <dir>.`, "AGENT_TARGET_UNAVAILABLE");
}
