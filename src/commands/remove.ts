import { loadConfig, resolveTarget } from "../config.js";
import { removeSkill } from "../install/filesystem-installer.js";
import { confirmAction } from "../ui/prompts.js";
import { color } from "../ui/theme.js";

export interface RemoveOptions {
  target?: string;
  yes?: boolean;
}

export async function runRemove(id: string, options: RemoveOptions): Promise<void> {
  const config = await loadConfig();
  const target = resolveTarget(options.target, config);

  if (!options.yes) {
    const confirmed = await confirmAction(`Remove ${id} from ${target}?`, false);
    if (!confirmed) {
      console.log(color.yellow("Remove cancelled."));
      return;
    }
  }

  const removed = await removeSkill(target, id);
  console.log(removed ? color.green(`Removed ${id}`) : color.yellow(`Skill not found: ${id}`));
}
