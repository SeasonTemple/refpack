import crypto from "node:crypto";
import path from "node:path";
import fs from "fs-extra";
import { normalizeDisplayPath, resolveInside } from "../paths.js";
import type { InstalledFile } from "./types.js";

export async function hashInstalledFiles(targetDir: string, relativeSkillDir: string): Promise<InstalledFile[]> {
  const skillDir = resolveInside(targetDir, relativeSkillDir, "installed target");
  const files = await walkFiles(skillDir);
  const hashes: InstalledFile[] = [];

  for (const file of files) {
    const buffer = await fs.readFile(file);
    hashes.push({
      path: normalizeDisplayPath(path.join(relativeSkillDir, path.relative(skillDir, file))),
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
      sizeBytes: buffer.length
    });
  }

  return hashes.sort((a, b) => a.path.localeCompare(b.path));
}

export async function hashFile(file: string): Promise<{ sha256: string; sizeBytes: number }> {
  const buffer = await fs.readFile(file);
  return {
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    sizeBytes: buffer.length
  };
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(full)));
    else if (entry.isFile()) files.push(full);
  }

  return files;
}

