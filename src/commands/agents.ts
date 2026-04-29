import { detectAgents } from "../agents/index.js";
import { printJson } from "../output/json.js";
import { color } from "../ui/theme.js";

export interface AgentsOptions {
  json?: boolean;
}

export async function runAgents(options: AgentsOptions): Promise<void> {
  const agents = await detectAgents();

  if (options.json) {
    printJson({ agents });
    return;
  }

  for (const agent of agents) {
    const status = agent.status === "available" || agent.status === "creatable" ? color.green(agent.status) : color.yellow(agent.status);
    console.log(`${color.bold(agent.id)} (${agent.name}) - ${status}`);
    if (agent.targetDir) console.log(`  target: ${agent.targetDir}`);
    if (agent.command) console.log(`  command: ${agent.command}`);
    if (agent.notes.length > 0) console.log(`  notes: ${agent.notes.join("; ")}`);
  }
}

