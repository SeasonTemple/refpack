import type { AgentDetection } from "./types.js";

export async function detectGeneric(): Promise<AgentDetection> {
  return {
    id: "generic",
    name: "Generic",
    status: "partial",
    writable: false,
    notes: ["Generic targets require an explicit --target or configured target."]
  };
}

