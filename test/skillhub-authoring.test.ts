import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { execa } from "execa";
import { afterEach, describe, expect, it } from "vitest";
import { packSkillHubArtifact, validateSkillHubCatalog } from "../src/skillhub/authoring.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "dist", "cli.js");
const tmpRoot = path.join(process.cwd(), ".tmp-tests", "skillhub-authoring");

async function runCli(args: string[]) {
  return execa(process.execPath, [cliPath, ...args], {
    cwd: tmpRoot,
    env: {
      NO_COLOR: "1",
      FORCE_COLOR: "0"
    }
  });
}

async function writePack() {
  const packDir = path.join(tmpRoot, "pack");
  await fs.outputFile(path.join(packDir, "skills", "browser-agent", "SKILL.md"), "# Browser Agent\n");
  await fs.writeJson(
    path.join(packDir, "skills.json"),
    {
      schemaVersion: "1.0",
      name: "basic-pack",
      skills: [
        {
          id: "browser-agent",
          name: "Browser Agent",
          description: "Automates browser workflows",
          source: "skills/browser-agent",
          target: "browser-agent",
          tags: ["browser"],
          adapters: ["codex"]
        }
      ]
    },
    { spaces: 2 }
  );
  return packDir;
}

async function writeCatalog(version: unknown) {
  await fs.writeJson(
    path.join(tmpRoot, "catalog.json"),
    {
      schemaVersion: "1.0",
      name: "skillhub",
      skills: [
        {
          id: "browser-agent",
          name: "Browser Agent",
          description: "Automates browser workflows",
          latestVersion: "1.0.0",
          versions: [version]
        }
      ]
    },
    { spaces: 2 }
  );
}

describe("SkillHub authoring", () => {
  afterEach(async () => {
    await fs.remove(tmpRoot);
  });

  it("packs a skill pack and validates the catalog artifact metadata", async () => {
    const packDir = await writePack();
    const artifactRoot = path.join(tmpRoot, "artifacts");
    const packed = await packSkillHubArtifact({
      packDir,
      outDir: artifactRoot,
      version: "1.0.0",
      reviewStatus: "verified"
    });

    expect(packed.version).toMatchObject({
      artifactPath: "browser-agent/1.0.0.tgz",
      artifactType: "tgz",
      manifestPath: "skills.json",
      reviewStatus: "verified"
    });
    expect(packed.version.integrity).toMatch(/^sha256-/);
    await expect(fs.pathExists(path.join(artifactRoot, packed.version.artifactPath))).resolves.toBe(true);

    await writeCatalog(packed.version);
    await expect(
      validateSkillHubCatalog({
        catalogPath: path.join(tmpRoot, "catalog.json"),
        artifactRoot
      })
    ).resolves.toEqual({ catalogName: "skillhub", artifactCount: 1 });
  });

  it("packs artifacts through the real CLI without colliding with the global version option", async () => {
    const packDir = await writePack();
    const output = await runCli([
      "skillhub",
      "pack",
      packDir,
      "--artifact-version",
      "1.0.0",
      "--out",
      path.join(tmpRoot, "artifacts")
    ]);

    expect(output.stdout).toContain("Packed browser-agent@1.0.0");
    expect(output.stdout).toContain("catalog version:");
    await expect(fs.pathExists(path.join(tmpRoot, "artifacts", "browser-agent", "1.0.0.tgz"))).resolves.toBe(true);
  });

  it("rejects catalogs when artifact bytes do not match integrity metadata", async () => {
    const packDir = await writePack();
    const artifactRoot = path.join(tmpRoot, "artifacts");
    const packed = await packSkillHubArtifact({ packDir, outDir: artifactRoot, version: "1.0.0" });
    await writeCatalog({ ...packed.version, integrity: "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=" });

    await expect(
      validateSkillHubCatalog({
        catalogPath: path.join(tmpRoot, "catalog.json"),
        artifactRoot
      })
    ).rejects.toThrow("Artifact integrity mismatch for browser-agent@1.0.0");
  });
});
