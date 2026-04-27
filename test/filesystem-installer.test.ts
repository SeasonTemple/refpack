import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { createInstallPlan } from "../src/install/plan.js";
import { applyInstallPlan } from "../src/install/filesystem-installer.js";

const tmpRoot = path.join(process.cwd(), ".tmp-tests", "filesystem-installer");

describe("applyInstallPlan", () => {
  afterEach(async () => {
    await fs.remove(tmpRoot);
  });

  it("copies selected skill directories", async () => {
    const packDir = path.join(tmpRoot, "pack");
    const targetDir = path.join(tmpRoot, "target");
    await fs.outputFile(path.join(packDir, "skills/browser-agent/SKILL.md"), "# Browser Agent");

    const plan = await createInstallPlan({
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
    });

    const result = await applyInstallPlan(plan);
    expect(result.installed).toEqual(["browser-agent"]);
    await expect(fs.pathExists(path.join(targetDir, "browser-agent/SKILL.md"))).resolves.toBe(true);
  });
});
