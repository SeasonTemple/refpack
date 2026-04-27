import path from "node:path";
import fs from "fs-extra";
import { UserError } from "../errors/user-error.js";
import { MANIFEST_FILE, type SkillsManifest } from "./types.js";
import { parseManifest } from "./schema.js";

export async function readManifest(packDir: string, manifestPath = MANIFEST_FILE): Promise<SkillsManifest> {
  const file = path.resolve(packDir, manifestPath);
  if (!(await fs.pathExists(file))) {
    throw new UserError(`Missing ${manifestPath} in ${packDir}.`, "MISSING_MANIFEST");
  }

  try {
    return parseManifest(await fs.readJson(file));
  } catch (error) {
    if (error instanceof UserError) throw error;
    throw new UserError(`Failed to read ${manifestPath}: ${(error as Error).message}`, "INVALID_MANIFEST");
  }
}
