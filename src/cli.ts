#!/usr/bin/env node
import { Command } from "commander";
import { runAdd } from "./commands/add.js";
import { runAgents } from "./commands/agents.js";
import { runInit } from "./commands/init.js";
import { runInfo } from "./commands/info.js";
import { runList } from "./commands/list.js";
import { runOutdated } from "./commands/outdated.js";
import { runRemove } from "./commands/remove.js";
import { runSearch } from "./commands/search.js";
import { runSkillHubPack, runSkillHubValidate } from "./commands/skillhub.js";
import { runUpdate } from "./commands/update.js";
import { runView } from "./commands/view.js";
import { renderIntro, renderOutro } from "./ui/prompts.js";
import { color } from "./ui/theme.js";
import { toUserMessage, UserError } from "./errors/user-error.js";

const program = new Command();

program
  .name("refpack")
  .description("Package, distribute, install, and maintain reusable agent skills for teams.")
  .version("0.1.0")
  .option("--no-banner", "Disable ASCII banner");

program
  .command("init")
  .description("Create .refpackrc.json for this project")
  .option("-t, --target <dir>", "Target skills directory")
  .option("-a, --agent <id>", "Agent target to configure: codex, claude, or generic")
  .option("-r, --registry <ref>", "Registry URL or JSON file")
  .action(wrap(async (options) => {
    renderIntro("REFPACK", program.opts().banner);
    await runInit(options);
    renderOutro("Config ready.");
  }));

program
  .command("add")
  .description("Install skills from a registry id, local pack, or remote source")
  .argument("<sourceOrId>", "Registry skill id, local directory, or remote source")
  .argument("[skills...]", "Specific skill ids inside the pack")
  .option("-t, --target <dir>", "Target skills directory")
  .option("-a, --agent <id>", "Agent target to install into: codex, claude, or generic")
  .option("-r, --registry <ref>", "Registry URL or JSON file")
  .option("--all", "Install all skills from the pack")
  .option("-y, --yes", "Skip confirmation prompts")
  .option("--overwrite", "Overwrite existing target skill directories")
  .option("--dry-run", "Show install plan without writing files")
  .option("--diff", "Show file-level install diff")
  .option("--install", "Install declared npm dependencies")
  .option("--no-install", "Do not install dependencies")
  .option("--allow-scripts", "Allow package-manager lifecycle scripts during dependency install")
  .option("--silent", "Reduce subprocess and progress output")
  .action(wrap(async (sourceOrId, skills, options) => {
    renderIntro("REFPACK", program.opts().banner && !options.silent);
    await runAdd(sourceOrId, skills, options);
    renderOutro("Done.");
  }));

program
  .command("agents")
  .description("Detect local agent skill targets without writing files")
  .option("--json", "Print machine-readable output")
  .action(wrap(runAgents));

program
  .command("search")
  .description("Search configured registry")
  .argument("[query]", "Search query", "")
  .option("-r, --registry <ref>", "Registry URL or JSON file")
  .action(wrap(runSearch));

program
  .command("list")
  .description("List registry skills or installed target skills")
  .option("-r, --registry <ref>", "Registry URL or JSON file")
  .option("-t, --target <dir>", "Target skills directory")
  .option("-a, --agent <id>", "Agent target to list: codex, claude, or generic")
  .option("--json", "Print machine-readable output")
  .action(wrap(runList));

program
  .command("view")
  .description("View a registry skill")
  .argument("<id>", "Registry skill id")
  .option("-r, --registry <ref>", "Registry URL or JSON file")
  .action(wrap(runView));

program
  .command("remove")
  .description("Remove an installed skill directory")
  .argument("<id>", "Installed skill id")
  .option("-t, --target <dir>", "Target skills directory")
  .option("-a, --agent <id>", "Agent target to remove from: codex, claude, or generic")
  .option("-y, --yes", "Skip confirmation")
  .action(wrap(runRemove));

program
  .command("outdated")
  .description("Check managed installed skills against the configured registry")
  .option("-t, --target <dir>", "Target skills directory")
  .option("-a, --agent <id>", "Agent target to inspect: codex, claude, or generic")
  .option("-r, --registry <ref>", "Registry URL or JSON file")
  .option("--json", "Print machine-readable output")
  .action(wrap(runOutdated));

program
  .command("update")
  .description("Update one managed skill or all managed skills safely")
  .argument("[id]", "Installed managed skill id")
  .option("-t, --target <dir>", "Target skills directory")
  .option("-a, --agent <id>", "Agent target to update: codex, claude, or generic")
  .option("-r, --registry <ref>", "Registry URL or JSON file")
  .option("--all", "Update all managed skills")
  .option("-y, --yes", "Skip confirmation prompts")
  .option("--overwrite", "Overwrite local edits")
  .option("--dry-run", "Preview update without writing files")
  .option("--diff", "Show file-level update diff")
  .option("--json", "Print machine-readable output")
  .option("--silent", "Reduce progress output")
  .action(wrap(runUpdate));

program
  .command("info")
  .description("Show current refpack config")
  .action(wrap(runInfo));

const skillhub = program
  .command("skillhub")
  .description("Author and validate SkillHub catalogs and artifacts");

skillhub
  .command("pack")
  .description("Create a SkillHub .tgz artifact from a skill pack")
  .argument("<packDir>", "Skill pack directory containing root skills.json")
  .requiredOption("--artifact-version <version>", "Artifact version to publish")
  .option("--out <dir>", "Output artifact directory", ".")
  .option("--id <skillId>", "Skill id to publish when the pack contains multiple skills")
  .option("--review-status <status>", "Catalog review status: unreviewed, verified, or rejected")
  .action(wrap(runSkillHubPack));

skillhub
  .command("validate")
  .description("Validate a SkillHub catalog and its referenced artifacts")
  .requiredOption("--catalog <file>", "SkillHub catalog JSON path")
  .requiredOption("--artifact-root <dir>", "Directory containing catalog artifactPath files")
  .option("--max-artifact-bytes <bytes>", "Maximum allowed artifact size")
  .action(wrap(runSkillHubValidate));

program.parseAsync(process.argv).catch((error) => {
  console.error(color.red(toUserMessage(error)));
  process.exit(error instanceof UserError && error.code === "CANCELLED" ? 0 : 1);
});

function wrap<T extends unknown[]>(fn: (...args: T) => Promise<void> | void) {
  return async (...args: T) => {
    try {
      await fn(...args);
    } catch (error) {
      console.error(color.red(toUserMessage(error)));
      process.exit(error instanceof UserError && error.code === "CANCELLED" ? 0 : 1);
    }
  };
}
