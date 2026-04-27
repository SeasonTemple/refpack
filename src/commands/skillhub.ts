import path from "node:path";
import { UserError } from "../errors/user-error.js";
import { packSkillHubArtifact, validateSkillHubCatalog } from "../skillhub/authoring.js";
import { color } from "../ui/theme.js";

export interface SkillHubPackCommandOptions {
  out?: string;
  id?: string;
  version: string;
  reviewStatus?: "unreviewed" | "verified" | "rejected";
}

export interface SkillHubValidateCommandOptions {
  catalog: string;
  artifactRoot: string;
  maxArtifactBytes?: string;
}

export async function runSkillHubPack(packDir: string, options: SkillHubPackCommandOptions): Promise<void> {
  const result = await packSkillHubArtifact({
    packDir,
    outDir: options.out ?? ".",
    version: options.version,
    skillId: options.id,
    reviewStatus: options.reviewStatus
  });

  console.log(color.green(`Packed ${result.skill.id}@${result.version.version}`));
  console.log(`artifact: ${path.relative(process.cwd(), result.artifactFile) || result.artifactFile}`);
  console.log(`integrity: ${result.version.integrity}`);
  console.log(`sizeBytes: ${result.version.sizeBytes}`);
  console.log("catalog version:");
  console.log(JSON.stringify(result.version, null, 2));
}

export async function runSkillHubValidate(options: SkillHubValidateCommandOptions): Promise<void> {
  const maxArtifactSizeBytes = options.maxArtifactBytes ? Number(options.maxArtifactBytes) : undefined;
  if (maxArtifactSizeBytes !== undefined && (!Number.isInteger(maxArtifactSizeBytes) || maxArtifactSizeBytes <= 0)) {
    throw new UserError("--max-artifact-bytes must be a positive integer.", "SKILLHUB_CONFIG_ERROR");
  }

  const result = await validateSkillHubCatalog({
    catalogPath: options.catalog,
    artifactRoot: options.artifactRoot,
    maxArtifactSizeBytes
  });

  console.log(color.green(`Validated ${result.artifactCount} artifact(s) in ${result.catalogName}.`));
}
