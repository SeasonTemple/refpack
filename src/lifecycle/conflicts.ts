import fs from "fs-extra";
import { resolveInside } from "../paths.js";
import { hashFile } from "../state/files.js";
import type { InstalledSkill } from "../state/types.js";

export interface UpdateConflict {
  skillId: string;
  path: string;
  reason: "modified" | "deleted";
}

export async function detectLocalConflicts(targetDir: string, skill: InstalledSkill): Promise<UpdateConflict[]> {
  const conflicts: UpdateConflict[] = [];

  for (const file of skill.files) {
    const current = resolveInside(targetDir, file.path, "installed file");
    if (!(await fs.pathExists(current))) {
      conflicts.push({ skillId: skill.id, path: file.path, reason: "deleted" });
      continue;
    }
    const hash = await hashFile(current);
    if (hash.sha256 !== file.sha256 || hash.sizeBytes !== file.sizeBytes) {
      conflicts.push({ skillId: skill.id, path: file.path, reason: "modified" });
    }
  }

  return conflicts;
}

