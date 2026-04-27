import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { createInstallPlan } from "../src/install/plan.js";

const tmpRoot = path.join(process.cwd(), ".tmp-tests", "install-plan");

describe("createInstallPlan", () => {
  afterEach(async () => {
    await fs.remove(tmpRoot);
  });

  it("plans safe installs and blocks existing targets", async () => {
    const packDir = path.join(tmpRoot, "pack");
    const targetDir = path.join(tmpRoot, "target");
    await fs.ensureDir(path.join(packDir, "skills/browser-agent"));
    await fs.ensureDir(path.join(targetDir, "browser-agent"));

    await expect(
      createInstallPlan({
        packDir,
        targetDir,
        overwrite: false,
        installDependencies: false,
        allowScripts: false,
        skills: [
          {
            id: "browser-agent",
            name: "Browser Agent",
            description: "Automates browsers",
            source: "skills/browser-agent",
            target: "browser-agent"
          }
        ]
      })
    ).rejects.toThrow(/already exists/);
  });
});
