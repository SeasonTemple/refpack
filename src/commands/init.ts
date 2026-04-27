import path from "node:path";
import { saveConfig } from "../config.js";
import { promptForRegistry, promptForTarget } from "../ui/prompts.js";
import { color } from "../ui/theme.js";

export interface InitOptions {
  target?: string;
  registry?: string;
}

export async function runInit(options: InitOptions): Promise<void> {
  const target = options.target ?? (await promptForTarget("./skills"));
  const registry = options.registry ?? (await promptForRegistry());
  const file = await saveConfig({ target: path.resolve(target), registry });
  console.log(color.green(`Saved config to ${file}`));
}
