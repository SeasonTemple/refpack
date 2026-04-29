import path from "node:path";
import { detectAgentTarget } from "./shared.js";
import type { AgentDetectOptions, AgentDetection } from "./types.js";

export async function detectCodex(options: AgentDetectOptions = {}): Promise<AgentDetection> {
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? env.USERPROFILE ?? env.HOME ?? process.cwd();
  const targetDir = path.resolve(env.CODEX_HOME ?? path.join(homeDir, ".codex"), "skills");
  return detectAgentTarget({
    id: "codex",
    name: "Codex",
    command: "codex",
    targetDir
  });
}

