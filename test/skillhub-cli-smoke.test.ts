import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import { execa } from "execa";
import { afterEach, describe, expect, it } from "vitest";
import { createSkillHubApp } from "../src/skillhub/server/app.js";
import { createTgz, sha256Integrity } from "./helpers/tgz.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(repoRoot, "dist", "cli.js");
const tmpRoot = path.join(repoRoot, ".tmp-tests", "skillhub-cli-smoke");

async function runCli(args: string[]) {
  return execa(process.execPath, [cliPath, ...args], {
    cwd: tmpRoot,
    env: {
      NO_COLOR: "1",
      FORCE_COLOR: "0"
    }
  });
}

async function reservePort(): Promise<number> {
  const server = await import("node:http").then((http) => http.createServer());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (!address || typeof address === "string") throw new Error("Failed to reserve port");
  return address.port;
}

describe("SkillHub CLI smoke flow", () => {
  afterEach(async () => {
    await fs.remove(tmpRoot);
  }, 30_000);

  it("installs a SkillHub-hosted archive through the real CLI", async () => {
    await fs.ensureDir(tmpRoot);
    const archive = createTgz([
      {
        name: "skills.json",
        body: JSON.stringify({
          schemaVersion: "1.0",
          name: "skillhub-pack",
          skills: [
            {
              id: "browser-agent",
              name: "Browser Agent",
              description: "Automates browser workflows",
              source: "skills/browser-agent",
              target: "browser-agent",
              adapters: ["codex"]
            }
          ]
        })
      },
      { name: "skills/browser-agent/SKILL.md", body: "# Browser Agent" }
    ]);
    const artifactPath = path.join(tmpRoot, "artifacts", "browser-agent", "1.0.0.tgz");
    await fs.outputFile(artifactPath, archive);
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
            tags: ["browser", "automation"],
            adapters: ["codex"],
            versions: [
              {
                version: "1.0.0",
                artifactPath: "browser-agent/1.0.0.tgz",
                artifactType: "tgz",
                integrity: sha256Integrity(archive),
                sizeBytes: archive.length
              }
            ]
          }
        ]
      },
      { spaces: 2 }
    );

    const port = await reservePort();
    const app = await createSkillHubApp({
      catalogPath: path.join(tmpRoot, "catalog.json"),
      artifactRoot: path.join(tmpRoot, "artifacts"),
      publicBaseUrl: `http://127.0.0.1:${port}`,
      port
    });
    const server = await app.listen();

    try {
      await runCli(["--no-banner", "init", "--target", "./installed", "--registry", `http://127.0.0.1:${port}/registry.json`]);

      const search = await runCli(["search", "browser"]);
      expect(search.stdout).toContain("browser-agent");

      const view = await runCli(["view", "browser-agent"]);
      expect(view.stdout).toContain("version: 1.0.0");
      expect(view.stdout).toContain("artifact: tgz");

      const dryRun = await runCli(["--no-banner", "add", "browser-agent", "--dry-run", "--silent"]);
      expect(dryRun.stdout).toContain("Dry run complete. No files were written.");
      await expect(fs.pathExists(path.join(tmpRoot, "installed", "browser-agent"))).resolves.toBe(false);

      const add = await runCli(["--no-banner", "add", "browser-agent", "--yes", "--silent"]);
      expect(add.stdout).toContain("Installed: browser-agent");
      await expect(fs.pathExists(path.join(tmpRoot, "installed", "browser-agent", "SKILL.md"))).resolves.toBe(true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 30_000);
});
