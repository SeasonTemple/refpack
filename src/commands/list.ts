import path from "node:path";
import fs from "fs-extra";
import { loadConfig, resolveTarget } from "../config.js";
import { readRegistry } from "../registry/client.js";
import { color } from "../ui/theme.js";

export interface ListOptions {
  registry?: string;
  target?: string;
}

export async function runList(options: ListOptions): Promise<void> {
  const config = await loadConfig();
  const registryRef = options.target ? undefined : options.registry ?? config.registry;

  if (registryRef) {
    const registry = await readRegistry(registryRef);
    for (const entry of registry.skills) {
      console.log(`${color.bold(entry.id)} - ${entry.description}`);
    }
    return;
  }

  const target = resolveTarget(options.target, config);
  if (!(await fs.pathExists(target))) {
    console.log(color.yellow(`Target does not exist: ${target}`));
    return;
  }

  const entries = await fs.readdir(target, { withFileTypes: true });
  for (const entry of entries.filter((item) => item.isDirectory())) {
    console.log(path.join(target, entry.name));
  }
}
