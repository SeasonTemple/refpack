import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { execa } from "execa";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "dist", "cli.js");
const tmpRoot = path.join(repoRoot, ".tmp-tests", "cli-smoke");
const skillPackPath = path.join(repoRoot, "examples", "basic-skill-pack");

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
  afterEach(async () => {
    await fs.remove(tmpRoot);
  }, 30_000);

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
            version: "1.0.0",
            tags: ["browser", "automation"],
            adapters: ["codex"]
          }
        ]
      },
      { spaces: 2 }
    );

    const init = await runCli(["--no-banner", "init", "--target", "./installed", "--registry", "./registry.json"]);
    expect(init.stdout).toContain("Saved config to");
    await expect(fs.pathExists(path.join(tmpRoot, ".refpackrc.json"))).resolves.toBe(true);

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
    expect(list.stdout).toContain("managed");

    const listJson = await runCli(["list", "--target", "./installed", "--json"]);
    const parsedList = JSON.parse(listJson.stdout);
    expect(parsedList.entries).toEqual([
      expect.objectContaining({
        id: "browser-agent",
        managed: true,
        missing: false
      })
    ]);

    const packV2 = path.join(tmpRoot, "pack-v2");
    await fs.outputFile(path.join(packV2, "skills", "browser-agent", "SKILL.md"), "# Browser Agent v2");
    await fs.writeJson(
      path.join(packV2, "skills.json"),
      {
        schemaVersion: "1.0",
        name: "pack-v2",
        skills: [
          {
            id: "browser-agent",
            name: "Browser Agent",
            description: "Automates browser workflows",
            source: "skills/browser-agent",
            target: "browser-agent"
          }
        ]
      },
      { spaces: 2 }
    );
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
            source: packV2,
            manifestPath: "skills.json",
            version: "1.1.0"
          }
        ]
      },
      { spaces: 2 }
    );

    const updateJson = await runCli(["update", "browser-agent", "--target", "./installed", "--registry", "./registry.json", "--yes", "--json"]);
    expect(JSON.parse(updateJson.stdout)).toEqual({
      target: path.join(tmpRoot, "installed"),
      updated: ["browser-agent"]
    });
    await expect(fs.readFile(path.join(tmpRoot, "installed", "browser-agent", "SKILL.md"), "utf8")).resolves.toBe("# Browser Agent v2");

    const remove = await runCli(["remove", "browser-agent", "--yes", "--target", "./installed"]);
    expect(remove.stdout).toContain("Removed browser-agent");
    await expect(fs.pathExists(path.join(tmpRoot, "installed", "browser-agent"))).resolves.toBe(false);
  }, 30_000);

  it("prints agent discovery JSON", async () => {
    await fs.ensureDir(tmpRoot);

    const agents = await runCli(["agents", "--json"]);
    const parsed = JSON.parse(agents.stdout);
    expect(parsed.agents.map((agent: { id: string }) => agent.id)).toEqual(["codex", "claude", "generic"]);
  }, 30_000);
});
