import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { execa } from "execa";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "dist", "cli.js");
const tmpRoot = path.join(repoRoot, ".tmp-tests", "cli-smoke");
const skillPackPath = path.join(repoRoot, "examples", "basic-skill-pack");
const tscPath = path.join(repoRoot, "node_modules", "typescript", "lib", "tsc.js");

async function runCli(args: string[]) {
  return execa(process.execPath, [cliPath, ...args], {
    cwd: tmpRoot,
    env: {
      NO_COLOR: "1",
      FORCE_COLOR: "0"
    }
  });
}

describe("CLI smoke flow", () => {
  beforeAll(async () => {
    await execa(process.execPath, [tscPath, "-p", "tsconfig.json"], { cwd: repoRoot });
  });

  afterEach(async () => {
    await fs.remove(tmpRoot);
  });

  it("initializes config, discovers, installs, lists, and removes a registry skill", async () => {
    await fs.ensureDir(tmpRoot);
    await fs.writeJson(
      path.join(tmpRoot, "registry.json"),
      {
        schemaVersion: "1.0",
        name: "test-registry",
        skills: [
          {
            id: "browser-agent",
            name: "Browser Agent",
            description: "Automates browser workflows",
            source: skillPackPath,
            manifestPath: "skills.json",
            tags: ["browser", "automation"],
            adapters: ["codex"]
          }
        ]
      },
      { spaces: 2 }
    );

    const init = await runCli(["--no-banner", "init", "--target", "./installed", "--registry", "./registry.json"]);
    expect(init.stdout).toContain("Saved config to");
    await expect(fs.pathExists(path.join(tmpRoot, ".skillsrc.json"))).resolves.toBe(true);

    const search = await runCli(["search", "browser"]);
    expect(search.stdout).toContain("browser-agent");
    expect(search.stdout).toContain("Automates browser workflows");

    const view = await runCli(["view", "browser-agent"]);
    expect(view.stdout).toContain("Browser Agent");
    expect(view.stdout).toContain("manifest: skills.json");
    expect(view.stdout).toContain("adapters: codex");

    const dryRun = await runCli(["--no-banner", "add", "browser-agent", "--dry-run", "--silent"]);
    expect(dryRun.stdout).toContain("Dry run complete. No files were written.");
    await expect(fs.pathExists(path.join(tmpRoot, "installed", "browser-agent"))).resolves.toBe(false);

    const add = await runCli(["--no-banner", "add", "browser-agent", "--yes", "--silent"]);
    expect(add.stdout).toContain("Installed: browser-agent");
    await expect(fs.pathExists(path.join(tmpRoot, "installed", "browser-agent", "SKILL.md"))).resolves.toBe(true);

    const list = await runCli(["list", "--target", "./installed"]);
    expect(list.stdout).toContain(path.join(tmpRoot, "installed", "browser-agent"));

    const remove = await runCli(["remove", "browser-agent", "--yes", "--target", "./installed"]);
    expect(remove.stdout).toContain("Removed browser-agent");
    await expect(fs.pathExists(path.join(tmpRoot, "installed", "browser-agent"))).resolves.toBe(false);
  });
});
