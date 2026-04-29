import path from "node:path";
import { detectAgentTarget } from "./shared.js";
import type { AgentDetectOptions, AgentDetection } from "./types.js";

export async function detectClaude(options: AgentDetectOptions = {}): Promise<AgentDetection> {
  const env = options.env ?? process.env;
  const homeDir = options.homeDir ?? env.USERPROFILE ?? env.HOME ?? process.cwd();
  const targetDir = path.resolve(env.CLAUDE_HOME ?? path.join(homeDir, ".claude"), "skills");
  return detectAgentTarget({
    id: "claude",
    name: "Claude",
    command: "claude",
    targetDir
  });
}

