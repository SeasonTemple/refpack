import path from "node:path";
import fs from "fs-extra";
import { loadConfig, resolveTarget } from "../config.js";
import { printJson } from "../output/json.js";
import { readRegistry } from "../registry/client.js";
import { readInstalledState, STATE_DIR } from "../state/store.js";
import { color } from "../ui/theme.js";

export interface ListOptions {
  registry?: string;
  target?: string;
  agent?: string;
  json?: boolean;
}

interface ListEntry {
  id: string;
  path: string;
  managed: boolean;
  missing: boolean;
  version?: string;
  agent?: string;
  source?: string;
}

export async function runList(options: ListOptions): Promise<void> {
  const config = await loadConfig();
  const registryRef = options.target || options.agent || options.json ? undefined : options.registry ?? config.registry;

  if (registryRef) {
    const registry = await readRegistry(registryRef);
    for (const entry of registry.skills) {
      console.log(`${color.bold(entry.id)} - ${entry.description}`);
    }
    return;
  }

  const target = (await resolveTarget({ target: options.target, agent: options.agent }, config)).targetDir;
  if (!(await fs.pathExists(target))) {
    if (options.json) {
      printJson({ target, entries: [] });
      return;
    }
    console.log(color.yellow(`Target does not exist: ${target}`));
    return;
  }

  const state = await readInstalledState(target);
  const entries = await fs.readdir(target, { withFileTypes: true });
  const directories = entries.filter((item) => item.isDirectory() && item.name !== STATE_DIR).map((entry) => entry.name);
  const managed = new Map(state.installed.map((entry) => [entry.target.split("/")[0], entry]));
  const listEntries: ListEntry[] = [
    ...state.installed.map((entry) => ({
      id: entry.id,
      path: path.join(target, entry.target),
      managed: true,
      version: entry.version,
      agent: entry.agent,
      source: entry.source,
      missing: !directories.includes(entry.target.split("/")[0])
    })),
    ...directories
      .filter((name) => !managed.has(name))
      .map((name) => ({
        id: name,
        path: path.join(target, name),
        managed: false,
        missing: false
      }))
  ];

  if (options.json) {
    printJson({ target, entries: listEntries });
    return;
  }

  for (const entry of listEntries) {
    const marker = entry.managed ? "managed" : "unmanaged";
    const version = entry.version ? ` ${entry.version}` : "";
    const missing = entry.missing ? " missing" : "";
    console.log(`${entry.id}${version} [${marker}${missing}] ${entry.path}`);
  }
}
