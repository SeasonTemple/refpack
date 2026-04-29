export type AgentId = "codex" | "claude" | "generic";

export type AgentStatus = "available" | "creatable" | "partial" | "not-found" | "not-writable";

export interface AgentDetection {
  id: AgentId;
  name: string;
  status: AgentStatus;
  targetDir?: string;
  command?: string;
  writable: boolean;
  notes: string[];
}

export interface AgentDetectOptions {
  homeDir?: string;
  env?: NodeJS.ProcessEnv;
}

