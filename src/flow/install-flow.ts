import path from "node:path";
import { readManifest } from "../manifest/read.js";
import type { SkillDefinition } from "../manifest/types.js";
import { findRegistryEntry, readRegistry } from "../registry/client.js";
import type { RegistryEntry } from "../registry/types.js";
import { createSourceResolver } from "../source/index.js";
import type { SourceDescriptor } from "../source/provider.js";
import { createInstallPlan, selectedDependencies, type InstallPlan } from "../install/plan.js";
import { renderInstallDiff } from "../install/diff.js";
import { applyInstallPlan } from "../install/filesystem-installer.js";
import { hashInstalledFiles } from "../state/files.js";
import { relativeSkillTarget, upsertInstalledSkill } from "../state/store.js";
import { installDependencies } from "../install/dependency-installer.js";
import { confirmAction, createSpinner, selectSkills } from "../ui/prompts.js";
import { color, formatList } from "../ui/theme.js";
import { UserError } from "../errors/user-error.js";

export interface AddFlowOptions {
  sourceOrId: string;
  skillIds: string[];
  targetDir: string;
  registry?: string;
  all?: boolean;
  yes?: boolean;
  overwrite?: boolean;
  dryRun?: boolean;
  diff?: boolean;
  install?: boolean;
  allowScripts?: boolean;
  silent?: boolean;
  agent?: string;
}

interface ResolvedSourceInput {
  source: string;
  manifestPath?: string;
  artifactType?: "tgz";
  integrity?: string;
  sizeBytes?: number;
  registryEntry?: RegistryEntry;
}

export async function runAddFlow(options: AddFlowOptions): Promise<void> {
  const sourceInput = await resolveSourceInput(options);
  const resolver = createSourceResolver();
  const spinner = createSpinner();
  let cleanup: (() => Promise<void>) | undefined;

  try {
    if (!options.silent) spinner.start(`Fetching ${sourceInput.source}`);
    const resolution = await resolver.resolve(toSourceDescriptor(sourceInput));
    cleanup = resolution.cleanup;
    if (!options.silent) spinner.message("Reading skills manifest");

    const manifest = await readManifest(resolution.dir, resolution.manifestPath ?? sourceInput.manifestPath);
    const selected = await resolveSelectedSkills(manifest.skills, options, sourceInput.registryEntry);
    const plan = await createInstallPlan({
      packDir: resolution.dir,
      targetDir: options.targetDir,
      skills: selected,
      overwrite: options.overwrite ?? false,
      installDependencies: options.install ?? false,
      allowScripts: options.allowScripts ?? false
    });

    if (!options.silent) spinner.stop(`Prepared install plan for ${selected.length} skill(s)`);
    await presentPlan(plan, options);

    if (options.dryRun) {
      console.log(color.green("Dry run complete. No files were written."));
      return;
    }

    if (!options.yes) {
      const confirmed = await confirmAction(`Install ${selected.length} skill(s) to ${options.targetDir}?`, true);
      if (!confirmed) throw new UserError("Install cancelled.", "CANCELLED");
    }

    const result = await applyInstallPlan(plan);
    for (const item of plan.items) {
      const relativeTarget = relativeSkillTarget(plan.targetDir, item.targetDir);
      await upsertInstalledSkill(plan.targetDir, {
        id: item.skill.id,
        target: relativeTarget,
        source: sourceInput.source,
        registryId: sourceInput.registryEntry?.id,
        version: sourceInput.registryEntry?.version,
        manifestPath: sourceInput.manifestPath,
        agent: options.agent,
        installedAt: new Date().toISOString(),
        artifact: {
          type: sourceInput.artifactType,
          integrity: sourceInput.integrity,
          sizeBytes: sourceInput.sizeBytes
        },
        files: await hashInstalledFiles(plan.targetDir, relativeTarget)
      });
    }
    const dependencies = selectedDependencies(plan);

    if (options.install && dependencies.length > 0) {
      if (plan.items.some((item) => item.skill.requiresScripts) && !options.allowScripts) {
        console.log(color.yellow("Some selected skills declare lifecycle scripts. Re-run with --allow-scripts if you trust them."));
      }
      await installDependencies({
        cwd: process.cwd(),
        dependencies,
        allowScripts: options.allowScripts ?? false,
        silent: options.silent
      });
    }

    console.log(color.green(`Installed: ${formatList(result.installed)}`));
    if (result.overwritten.length > 0) console.log(color.yellow(`Overwritten: ${formatList(result.overwritten)}`));
    printConfigInstructions(selected);
  } finally {
    if (cleanup) await cleanup();
  }
}

async function resolveSourceInput(options: AddFlowOptions): Promise<ResolvedSourceInput> {
  if (looksLikeDirectSource(options.sourceOrId)) return { source: options.sourceOrId };
  if (!options.registry) return { source: options.sourceOrId };

  try {
    const registry = await readRegistry(options.registry);
    const entry = findRegistryEntry(registry, options.sourceOrId);
    return {
      source: entry.source,
      manifestPath: entry.manifestPath,
      artifactType: entry.artifactType,
      integrity: entry.integrity,
      sizeBytes: entry.sizeBytes,
      registryEntry: entry
    };
  } catch (error) {
    if (error instanceof UserError && error.code === "REGISTRY_ENTRY_NOT_FOUND") {
      return { source: options.sourceOrId };
    }
    throw error;
  }
}

function toSourceDescriptor(sourceInput: ResolvedSourceInput): SourceDescriptor {
  return {
    source: sourceInput.source,
    manifestPath: sourceInput.manifestPath,
    artifactType: sourceInput.artifactType,
    integrity: sourceInput.integrity,
    sizeBytes: sourceInput.sizeBytes
  };
}

function looksLikeDirectSource(value: string): boolean {
  return (
    value.startsWith(".") ||
    value.startsWith("/") ||
    value.startsWith("\\") ||
    /^[a-zA-Z]:[\\/]/.test(value) ||
    /^(gh|github|gitlab|bitbucket|sourcehut|git|http|https):/i.test(value) ||
    value.includes("/")
  );
}

async function resolveSelectedSkills(
  skills: SkillDefinition[],
  options: AddFlowOptions,
  entry?: RegistryEntry
): Promise<SkillDefinition[]> {
  const ids = new Set<string>();

  if (options.all) {
    skills.forEach((skill) => ids.add(skill.id));
  } else if (options.skillIds.length > 0) {
    options.skillIds.forEach((id) => ids.add(id));
  } else if (entry && skills.some((skill) => skill.id === entry.id)) {
    ids.add(entry.id);
  } else if (options.yes && skills.length === 1) {
    ids.add(skills[0].id);
  } else {
    const selected = await selectSkills(skills);
    selected.forEach((id) => ids.add(id));
  }

  const selected = skills.filter((skill) => ids.has(skill.id));
  const missing = [...ids].filter((id) => !skills.some((skill) => skill.id === id));
  if (missing.length > 0) {
    throw new UserError(`Skill(s) not found in manifest: ${missing.join(", ")}`, "SKILL_NOT_FOUND");
  }
  if (selected.length === 0) {
    throw new UserError("No skills selected.", "NO_SELECTION");
  }
  return selected;
}

async function presentPlan(plan: InstallPlan, options: AddFlowOptions): Promise<void> {
  console.log(color.bold("Install plan"));
  for (const item of plan.items) {
    const relativeTarget = path.relative(process.cwd(), item.targetDir) || item.targetDir;
    const status = item.targetExists ? "overwrite" : "create";
    console.log(`- ${item.skill.id}: ${status} ${relativeTarget}`);
  }

  const dependencies = selectedDependencies(plan);
  if (dependencies.length > 0) {
    console.log(`Dependencies: ${formatList(dependencies)} (${options.install ? "install requested" : "not installed"})`);
  }

  if (options.diff || options.dryRun) {
    console.log("");
    console.log(await renderInstallDiff(plan));
  }
}

function printConfigInstructions(skills: SkillDefinition[]): void {
  const instructions = skills.flatMap((skill) => skill.configInstructions ?? []);
  if (instructions.length === 0) return;

  console.log(color.bold("Config instructions"));
  for (const instruction of instructions) {
    console.log(`- ${instruction.adapter}: ${instruction.instructions}`);
  }
}
