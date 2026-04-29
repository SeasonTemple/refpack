import { loadConfig, resolveTarget } from "../config.js";
import { UserError } from "../errors/user-error.js";
import { checkOutdated } from "../lifecycle/outdated.js";
import { printJson } from "../output/json.js";
import { readInstalledState } from "../state/store.js";
import { color } from "../ui/theme.js";

export interface OutdatedOptions {
  target?: string;
  agent?: string;
  registry?: string;
  json?: boolean;
}

export async function runOutdated(options: OutdatedOptions): Promise<void> {
  const config = await loadConfig();
  const registry = options.registry ?? config.registry;
  if (!registry) throw new UserError("Missing registry. Pass --registry <url-or-file> or run refpack init.", "MISSING_REGISTRY");
  const target = (await resolveTarget({ target: options.target, agent: options.agent }, config)).targetDir;
  const state = await readInstalledState(target);
  const results = await checkOutdated(state.installed, registry);

  if (options.json) {
    printJson({ target, results });
    return;
  }

  if (results.length === 0) {
    console.log(color.yellow("No managed skills installed."));
    return;
  }

  for (const result of results) {
    const status = result.status === "outdated" ? color.yellow(result.status) : result.status === "current" ? color.green(result.status) : result.status;
    const versions = result.latestVersion ? `${result.installedVersion ?? "unknown"} -> ${result.latestVersion}` : result.installedVersion ?? "unknown";
    console.log(`${result.id}: ${status} (${versions})`);
  }
}

