import fs from "fs-extra";
import type { InstallPlan } from "./plan.js";
import { resolveInside } from "../paths.js";

export interface InstallResult {
  installed: string[];
  overwritten: string[];
}

export async function applyInstallPlan(plan: InstallPlan): Promise<InstallResult> {
  await fs.ensureDir(plan.targetDir);
  const installed: string[] = [];
  const overwritten: string[] = [];

  for (const item of plan.items) {
    if (item.targetExists && plan.overwrite) {
      await fs.remove(item.targetDir);
      overwritten.push(item.skill.id);
    }

    await fs.copy(item.sourceDir, item.targetDir, {
      overwrite: false,
      errorOnExist: true
    });
    installed.push(item.skill.id);
  }

  return { installed, overwritten };
}

export async function removeSkill(targetDir: string, skillId: string): Promise<boolean> {
  const skillDir = resolveInside(targetDir, skillId, "skill id");
  if (!(await fs.pathExists(skillDir))) return false;
  await fs.remove(skillDir);
  return true;
}
