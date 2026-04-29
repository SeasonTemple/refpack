import { UserError } from "../errors/user-error.js";
import { detectClaude } from "./claude.js";
import { detectCodex } from "./codex.js";
import { detectGeneric } from "./generic.js";
import type { AgentDetectOptions, AgentDetection, AgentId } from "./types.js";

export async function detectAgents(options: AgentDetectOptions = {}): Promise<AgentDetection[]> {
  return Promise.all([detectCodex(options), detectClaude(options), detectGeneric()]);
}

export async function detectAgent(id: string, options: AgentDetectOptions = {}): Promise<AgentDetection> {
  const agents = await detectAgents(options);
  const agent = agents.find((candidate) => candidate.id === id);
  if (!agent) throw new UserError(`Unknown agent: ${id}. Expected codex, claude, or generic.`, "UNKNOWN_AGENT");
  return agent;
}

export function isAgentId(value: string): value is AgentId {
  return value === "codex" || value === "claude" || value === "generic";
}

