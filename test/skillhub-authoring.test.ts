import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { packSkillHubArtifact, validateSkillHubCatalog } from "../src/skillhub/authoring.js";

const tmpRoot = path.join(process.cwd(), ".tmp-tests", "skillhub-authoring");

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
