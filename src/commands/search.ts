import { loadConfig } from "../config.js";
import { readRegistry, searchRegistry } from "../registry/client.js";
import { color, formatList } from "../ui/theme.js";
import { UserError } from "../errors/user-error.js";

export interface SearchOptions {
  registry?: string;
}

export async function runSearch(query: string, options: SearchOptions): Promise<void> {
  const config = await loadConfig();
  const registryRef = options.registry ?? config.registry;
  if (!registryRef) throw new UserError("Missing registry. Pass --registry <url-or-file> or run refpack init.", "MISSING_REGISTRY");

  const registry = await readRegistry(registryRef);
  const results = searchRegistry(registry, query);

  if (results.length === 0) {
    console.log(color.yellow("No matching skills."));
    return;
  }

  for (const entry of results) {
    console.log(`${color.bold(entry.id)} ${color.dim(formatList(entry.tags ?? []))}`);
    console.log(`  ${entry.description}`);
  }
}
