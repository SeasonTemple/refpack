import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { checkOutdated } from "../src/lifecycle/outdated.js";
import type { InstalledSkill } from "../src/state/types.js";

const tmpRoot = path.join(process.cwd(), ".tmp-tests", "outdated");

describe("outdated lifecycle", () => {
  afterEach(async () => {
    await fs.remove(tmpRoot);
  });

  it("compares installed state with registry latest versions", async () => {
    const registryPath = path.join(tmpRoot, "registry.json");
    await fs.ensureDir(tmpRoot);
    await fs.writeJson(registryPath, {
      schemaVersion: "1.0",
      name: "test-registry",
      skills: [
        {
          id: "browser-agent",
          name: "Browser Agent",
          description: "Automates browsers",
          source: "./pack",
          version: "1.1.0"
        }
      ]
    });

    const installed: InstalledSkill[] = [
      {
        id: "browser-agent",
        target: "browser-agent",
        source: "./pack",
        registryId: "browser-agent",
        version: "1.0.0",
        installedAt: "2026-04-29T00:00:00.000Z",
        files: []
      }
    ];

    await expect(checkOutdated(installed, registryPath)).resolves.toEqual([
      expect.objectContaining({
        id: "browser-agent",
        status: "outdated",
        installedVersion: "1.0.0",
        latestVersion: "1.1.0"
      })
    ]);
  });
});

