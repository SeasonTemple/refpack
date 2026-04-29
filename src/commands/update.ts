import { readManifest } from "../manifest/read.js";
import type { SkillDefinition } from "../manifest/types.js";
import { loadConfig, resolveTarget } from "../config.js";
import { UserError } from "../errors/user-error.js";
import { createInstallPlan } from "../install/plan.js";
import { renderInstallDiff } from "../install/diff.js";
import { applyUpdatePlan } from "../install/filesystem-installer.js";
import { detectLocalConflicts, type UpdateConflict } from "../lifecycle/conflicts.js";
import { printJson } from "../output/json.js";
import { findRegistryEntry, readRegistry } from "../registry/client.js";
import type { RegistryEntry } from "../registry/types.js";
import { createSourceResolver } from "../source/index.js";
import { hashInstalledFiles } from "../state/files.js";
import { readInstalledState, relativeSkillTarget, upsertInstalledSkill } from "../state/store.js";
import type { InstalledSkill } from "../state/types.js";
import { confirmAction, createSpinner } from "../ui/prompts.js";
import { color, formatList } from "../ui/theme.js";

export interface UpdateOptions {
  target?: string;
  agent?: string;
  registry?: string;
  all?: boolean;
  yes?: boolean;
  overwrite?: boolean;
  dryRun?: boolean;
  diff?: boolean;
  json?: boolean;
  silent?: boolean;
}

interface UpdateCandidate {
  installed: InstalledSkill;
  latest: RegistryEntry;
  status: "current" | "outdated" | "unknown-version";
  conflicts: UpdateConflict[];
}

export async function runUpdate(id: string | undefined, options: UpdateOptions): Promise<void> {
  const config = await loadConfig();
  const registryRef = options.registry ?? config.registry;
  if (!registryRef) throw new UserError("Missing registry. Pass --registry <url-or-file> or run refpack init.", "MISSING_REGISTRY");
  if (!id && !options.all) throw new UserError("Pass a skill id or --all.", "MISSING_UPDATE_TARGET");

  const target = await resolveTarget({ target: options.target, agent: options.agent }, config);
  const state = await readInstalledState(target.targetDir);
  const registry = await readRegistry(registryRef);
  const selected = id ? state.installed.filter((skill) => skill.id === id) : state.installed;
  if (id && selected.length === 0) throw new UserError(`Managed skill not found: ${id}`, "SKILL_NOT_FOUND");

  const candidates: UpdateCandidate[] = [];
  for (const installed of selected) {
    const latest = findRegistryEntry(registry, installed.registryId ?? installed.id);
    const status = !installed.version || !latest.version
      ? "unknown-version"
      : installed.version === latest.version
        ? "current"
        : "outdated";
    const conflicts = options.overwrite ? [] : await detectLocalConflicts(target.targetDir, installed);
    candidates.push({ installed, latest, status, conflicts });
  }

  const planned = candidates.filter((candidate) => candidate.status !== "current");
  const conflicts = candidates.flatMap((candidate) => candidate.conflicts);

  if (options.json && (options.dryRun || planned.length === 0 || conflicts.length > 0)) {
    printJson({
      target: target.targetDir,
      updates: candidates.map((candidate) => ({
        id: candidate.installed.id,
        status: candidate.status,
        current: candidate.installed.version,
        latest: candidate.latest.version,
        conflicts: candidate.conflicts
      }))
    });
    if (options.dryRun || planned.length === 0 || conflicts.length > 0) return;
  }

  if (planned.length === 0) {
    console.log(color.green("All selected managed skills are current."));
    return;
  }

  if (conflicts.length > 0) {
    for (const conflict of conflicts) {
      console.log(color.yellow(`Conflict: ${conflict.skillId} ${conflict.path} is ${conflict.reason}`));
    }
    throw new UserError("Update blocked by local edits. Re-run with --overwrite to replace local changes.", "UPDATE_CONFLICT");
  }

  const spinner = createSpinner();
  const resolver = createSourceResolver();
  const updated: string[] = [];
  const quiet = options.silent || options.json;

  for (const candidate of planned) {
    let cleanup: (() => Promise<void>) | undefined;
    try {
      if (!quiet) spinner.start(`Fetching ${candidate.latest.id}`);
      const resolution = await resolver.resolve({
        source: candidate.latest.source,
        manifestPath: candidate.latest.manifestPath,
        artifactType: candidate.latest.artifactType,
        integrity: candidate.latest.integrity,
        sizeBytes: candidate.latest.sizeBytes
      });
      cleanup = resolution.cleanup;
      const manifest = await readManifest(resolution.dir, resolution.manifestPath ?? candidate.latest.manifestPath);
      const skill = selectManifestSkill(manifest.skills, candidate.latest.id);
      const plan = await createInstallPlan({
        packDir: resolution.dir,
        targetDir: target.targetDir,
        skills: [skill],
        overwrite: true,
        installDependencies: false,
        allowScripts: false
      });

      if (!quiet) spinner.stop(`Prepared update for ${candidate.installed.id}`);
      if (!options.json) {
        console.log(`${candidate.installed.id}: ${candidate.installed.version ?? "unknown"} -> ${candidate.latest.version ?? "unknown"}`);
      }
      if (options.diff || options.dryRun) {
        const diff = await renderInstallDiff(plan);
        if (!options.json) console.log(diff);
      }
      if (options.dryRun) continue;

      if (!options.yes) {
        const confirmed = await confirmAction(`Update ${candidate.installed.id}?`, true);
        if (!confirmed) throw new UserError("Update cancelled.", "CANCELLED");
      }

      await applyUpdatePlan(plan);
      const item = plan.items[0];
      const relativeTarget = relativeSkillTarget(target.targetDir, item.targetDir);
      await upsertInstalledSkill(target.targetDir, {
        id: item.skill.id,
        target: relativeTarget,
        source: candidate.latest.source,
        registryId: candidate.latest.id,
        version: candidate.latest.version,
        manifestPath: candidate.latest.manifestPath,
        agent: target.agent ?? candidate.installed.agent,
        installedAt: new Date().toISOString(),
        artifact: {
          type: candidate.latest.artifactType,
          integrity: candidate.latest.integrity,
          sizeBytes: candidate.latest.sizeBytes
        },
        files: await hashInstalledFiles(target.targetDir, relativeTarget)
      });
      updated.push(candidate.installed.id);
    } finally {
      if (cleanup) await cleanup();
    }
  }

  if (options.dryRun) {
    if (!options.json) console.log(color.green("Dry run complete. No files were written."));
    return;
  }

  if (options.json) {
    printJson({ target: target.targetDir, updated });
    return;
  }
  console.log(color.green(`Updated: ${formatList(updated)}`));
}

function selectManifestSkill(skills: SkillDefinition[], id: string): SkillDefinition {
  const skill = skills.find((candidate) => candidate.id === id);
  if (!skill) throw new UserError(`Skill ${id} not found in update manifest.`, "SKILL_NOT_FOUND");
  return skill;
}
