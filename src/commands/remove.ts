import { loadConfig, resolveTarget } from "../config.js";
import { removeSkill } from "../install/filesystem-installer.js";
import { readInstalledState, removeInstalledSkill } from "../state/store.js";
import { confirmAction } from "../ui/prompts.js";
import { color } from "../ui/theme.js";

export interface RemoveOptions {
  target?: string;
  agent?: string;
  yes?: boolean;
}

export async function runRemove(id: string, options: RemoveOptions): Promise<void> {
  const config = await loadConfig();
  const target = (await resolveTarget({ target: options.target, agent: options.agent }, config)).targetDir;

  if (!options.yes) {
    const confirmed = await confirmAction(`Remove ${id} from ${target}?`, false);
    if (!confirmed) {
      console.log(color.yellow("Remove cancelled."));
      return;
    }
  }

  const state = await readInstalledState(target);
  const managed = state.installed.find((entry) => entry.id === id);
  const removed = await removeSkill(target, managed?.target ?? id);
  if (removed) await removeInstalledSkill(target, id);
  console.log(removed ? color.green(`Removed ${id}`) : color.yellow(`Skill not found: ${id}`));
}
