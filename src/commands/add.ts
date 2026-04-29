import { loadConfig, resolveTarget } from "../config.js";
import { runAddFlow } from "../flow/install-flow.js";

export interface AddOptions {
  target?: string;
  agent?: string;
  registry?: string;
  all?: boolean;
  yes?: boolean;
  overwrite?: boolean;
  dryRun?: boolean;
  diff?: boolean;
  install?: boolean;
  allowScripts?: boolean;
  silent?: boolean;
}

export async function runAdd(sourceOrId: string, skillIds: string[], options: AddOptions): Promise<void> {
  const config = await loadConfig();
  const target = await resolveTarget({ target: options.target, agent: options.agent }, config);
  await runAddFlow({
    sourceOrId,
    skillIds,
    targetDir: target.targetDir,
    registry: options.registry ?? config.registry,
    agent: target.agent,
    all: options.all,
    yes: options.yes,
    overwrite: options.overwrite,
    dryRun: options.dryRun,
    diff: options.diff,
    install: options.install === true,
    allowScripts: options.allowScripts,
    silent: options.silent
  });
}
