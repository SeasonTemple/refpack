import fs from "fs-extra";
import path from "node:path";
import { execa } from "execa";
import type { AgentDetection, AgentId } from "./types.js";

interface DetectAgentTargetOptions {
  id: AgentId;
  name: string;
  command: string;
  targetDir: string;
}

export async function detectAgentTarget(options: DetectAgentTargetOptions): Promise<AgentDetection> {
  const [commandExists, targetExists, parentExists] = await Promise.all([
    commandAvailable(options.command),
    fs.pathExists(options.targetDir),
    fs.pathExists(path.dirname(options.targetDir))
  ]);

  const writable = targetExists ? await canWrite(options.targetDir) : parentExists ? await canWrite(path.dirname(options.targetDir)) : false;
  const notes: string[] = [];
  if (commandExists) notes.push(`${options.command} command found`);
  if (targetExists) notes.push("skills directory exists");
  if (!targetExists && parentExists) notes.push("skills directory can be created");
  if (!commandExists && !targetExists) notes.push("no command or skills directory found");

  let status: AgentDetection["status"] = "not-found";
  if (targetExists && writable) status = "available";
  else if (targetExists && !writable) status = "not-writable";
  else if (parentExists && writable) status = "creatable";
  else if (commandExists) status = "partial";

  return {
    id: options.id,
    name: options.name,
    status,
    targetDir: options.targetDir,
    command: options.command,
    writable,
    notes
  };
}

async function commandAvailable(command: string): Promise<boolean> {
  try {
    const probe = process.platform === "win32" ? "where.exe" : "command";
    const args = process.platform === "win32" ? [command] : ["-v", command];
    const options = process.platform === "win32" ? {} : { shell: true };
    await execa(probe, args, options);
    return true;
  } catch {
    return false;
  }
}

async function canWrite(dir: string): Promise<boolean> {
  try {
    await fs.access(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
