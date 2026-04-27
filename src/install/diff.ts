import path from "node:path";
import fs from "fs-extra";
import type { InstallPlan } from "./plan.js";
import { normalizeDisplayPath } from "../paths.js";

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }

  return files;
}

export async function renderInstallDiff(plan: InstallPlan): Promise<string> {
  const lines: string[] = [];

  for (const item of plan.items) {
    lines.push(`# ${item.skill.id}`);
    const sourceFiles = await walkFiles(item.sourceDir);

    for (const sourceFile of sourceFiles) {
      const relative = path.relative(item.sourceDir, sourceFile);
      const targetFile = path.join(item.targetDir, relative);
      const display = normalizeDisplayPath(path.relative(plan.targetDir, targetFile));

      if (!(await fs.pathExists(targetFile))) {
        lines.push(`+ ${display}`);
        continue;
      }

      const [sourceBuffer, targetBuffer] = await Promise.all([fs.readFile(sourceFile), fs.readFile(targetFile)]);
      if (!sourceBuffer.equals(targetBuffer)) {
        lines.push(`~ ${display} (${targetBuffer.length} bytes -> ${sourceBuffer.length} bytes)`);
      } else {
        lines.push(`= ${display}`);
      }
    }
  }

  return lines.join("\n");
}
