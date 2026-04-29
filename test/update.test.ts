import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { runAddFlow } from "../src/flow/install-flow.js";
import { runUpdate } from "../src/commands/update.js";
import { readInstalledState } from "../src/state/store.js";

const tmpRoot = path.join(process.cwd(), ".tmp-tests", "update");

describe("update lifecycle", () => {
  afterEach(async () => {
    await fs.remove(tmpRoot);
  }, 30_000);

  it("updates managed registry installs and refreshes state", async () => {
    const { targetDir, registryPath, skillFile } = await installVersionedSkill("1.0.0", "old");
    await writeRegistry(registryPath, "1.1.0", await createPack("pack-v2", "new"));

    await runUpdate("browser-agent", { target: targetDir, registry: registryPath, yes: true, silent: true });

    await expect(fs.readFile(skillFile, "utf8")).resolves.toBe("new");
    const state = await readInstalledState(targetDir);
    expect(state.installed[0].version).toBe("1.1.0");
  });

  it("blocks locally modified files by default and leaves bytes unchanged", async () => {
    const { targetDir, registryPath, skillFile } = await installVersionedSkill("1.0.0", "old");
    await fs.writeFile(skillFile, "local edit");
    await writeRegistry(registryPath, "1.1.0", await createPack("pack-v2", "new"));

    await expect(runUpdate("browser-agent", { target: targetDir, registry: registryPath, yes: true, silent: true })).rejects.toThrow(/local edits/);
    await expect(fs.readFile(skillFile, "utf8")).resolves.toBe("local edit");
    const state = await readInstalledState(targetDir);
    expect(state.installed[0].version).toBe("1.0.0");
  });
});

async function installVersionedSkill(version: string, content: string) {
  const targetDir = path.join(tmpRoot, "target");
  const registryPath = path.join(tmpRoot, "registry.json");
  const packDir = await createPack("pack-v1", content);
  await writeRegistry(registryPath, version, packDir);

  await runAddFlow({
    sourceOrId: "browser-agent",
    skillIds: [],
    targetDir,
    registry: registryPath,
    yes: true,
    silent: true
  });

  return {
    targetDir,
    registryPath,
    skillFile: path.join(targetDir, "browser-agent", "SKILL.md")
  };
}

async function createPack(name: string, content: string): Promise<string> {
  const packDir = path.join(tmpRoot, name);
  await fs.outputFile(path.join(packDir, "skills", "browser-agent", "SKILL.md"), content);
  await fs.writeJson(
    path.join(packDir, "skills.json"),
    {
      schemaVersion: "1.0",
      name,
      skills: [
        {
          id: "browser-agent",
          name: "Browser Agent",
          description: "Automates browsers",
          source: "skills/browser-agent",
          target: "browser-agent"
        }
      ]
    },
    { spaces: 2 }
  );
  return packDir;
}

async function writeRegistry(registryPath: string, version: string, source: string): Promise<void> {
  await fs.writeJson(
    registryPath,
    {
      schemaVersion: "1.0",
      name: "test-registry",
      skills: [
        {
          id: "browser-agent",
          name: "Browser Agent",
          description: "Automates browser workflows",
          source,
          manifestPath: "skills.json",
          version
        }
      ]
    },
    { spaces: 2 }
  );
}

