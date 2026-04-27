import { loadConfig } from "../config.js";
import { findRegistryEntry, readRegistry } from "../registry/client.js";
import { color, formatList } from "../ui/theme.js";
import { UserError } from "../errors/user-error.js";

export interface ViewOptions {
  registry?: string;
}

export async function runView(id: string, options: ViewOptions): Promise<void> {
  const config = await loadConfig();
  const registryRef = options.registry ?? config.registry;
  if (!registryRef) throw new UserError("Missing registry. Pass --registry <url-or-file> or run skills init.", "MISSING_REGISTRY");

  const registry = await readRegistry(registryRef);
  const entry = findRegistryEntry(registry, id);

  console.log(color.bold(entry.name));
  console.log(entry.description);
  console.log(`id: ${entry.id}`);
  console.log(`source: ${entry.source}`);
  if (entry.manifestPath) console.log(`manifest: ${entry.manifestPath}`);
  if (entry.version) console.log(`version: ${entry.version}`);
  if (entry.artifactType) console.log(`artifact: ${entry.artifactType}`);
  if (entry.integrity) console.log(`integrity: ${entry.integrity}`);
  if (entry.sizeBytes) console.log(`size: ${entry.sizeBytes} bytes`);
  if (entry.tags?.length) console.log(`tags: ${formatList(entry.tags)}`);
  if (entry.adapters?.length) console.log(`adapters: ${formatList(entry.adapters)}`);
}
