import path from "node:path";
import fs from "fs-extra";
import type { SkillDefinition } from "../manifest/types.js";
import { normalizeDisplayPath, resolveInside } from "../paths.js";
import { UserError } from "../errors/user-error.js";

export interface InstallPlanOptions {
  packDir: string;
  targetDir: string;
  skills: SkillDefinition[];
  overwrite: boolean;
  installDependencies: boolean;
  allowScripts: boolean;
}

export interface InstallPlanItem {
  skill: SkillDefinition;
  sourceDir: string;
  targetDir: string;
  targetExists: boolean;
  dependencies: string[];
}

export interface InstallPlan {
  packDir: string;
  targetDir: string;
  overwrite: boolean;
  installDependencies: boolean;
  allowScripts: boolean;
  items: InstallPlanItem[];
}

export async function createInstallPlan(options: InstallPlanOptions): Promise<InstallPlan> {
  const items: InstallPlanItem[] = [];

  for (const skill of options.skills) {
    const sourceDir = resolveInside(options.packDir, skill.source, `${skill.id}.source`);
    const targetDir = resolveInside(options.targetDir, skill.target, `${skill.id}.target`);

    if (!(await fs.pathExists(sourceDir))) {
      throw new UserError(`Skill source not found for ${skill.id}: ${normalizeDisplayPath(skill.source)}`, "SKILL_SOURCE_NOT_FOUND");
    }

    const targetExists = await fs.pathExists(targetDir);
    if (targetExists && !options.overwrite) {
      throw new UserError(
        `Target already exists for ${skill.id}: ${targetDir}. Re-run with --overwrite to replace it.`,
        "TARGET_EXISTS"
      );
    }

    items.push({
      skill,
      sourceDir,
      targetDir,
      targetExists,
      dependencies: skill.dependencies?.npm ?? []
    });
  }

  return {
    packDir: path.resolve(options.packDir),
    targetDir: path.resolve(options.targetDir),
    overwrite: options.overwrite,
    installDependencies: options.installDependencies,
    allowScripts: options.allowScripts,
    items
  };
}

export function selectedDependencies(plan: InstallPlan): string[] {
  return [...new Set(plan.items.flatMap((item) => item.dependencies))];
}
