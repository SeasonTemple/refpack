import fs from "fs-extra";
import { UserError } from "../../errors/user-error.js";
import { parseSkillHubCatalog } from "./schema.js";
import type { SkillHubCatalog } from "./types.js";

export async function readSkillHubCatalog(file: string): Promise<SkillHubCatalog> {
  if (!(await fs.pathExists(file))) {
    throw new UserError(`SkillHub catalog not found: ${file}`, "SKILLHUB_CATALOG_NOT_FOUND");
  }
  return parseSkillHubCatalog(await fs.readJson(file));
}
