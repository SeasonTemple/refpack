import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { hashInstalledFiles } from "../src/state/files.js";
import { readInstalledState, stateFilePath, upsertInstalledSkill } from "../src/state/store.js";

const tmpRoot = path.join(process.cwd(), ".tmp-tests", "state");

describe("installed state", () => {
  afterEach(async () => {
    await fs.remove(tmpRoot);
  });

  it("records managed installs with file hashes", async () => {
    const targetDir = path.join(tmpRoot, "target");
    await fs.outputFile(path.join(targetDir, "browser-agent", "SKILL.md"), "# Browser");

    await upsertInstalledSkill(targetDir, {
      id: "browser-agent",
      target: "browser-agent",
      source: "./pack",
      registryId: "browser-agent",
      version: "1.0.0",
      agent: "codex",
      installedAt: "2026-04-29T00:00:00.000Z",
      files: await hashInstalledFiles(targetDir, "browser-agent")
    });

    const state = await readInstalledState(targetDir);
    expect(state.installed[0].files).toEqual([
      {
        path: "browser-agent/SKILL.md",
        sha256: expect.any(String),
        sizeBytes: 9
      }
    ]);
  });

  it("surfaces malformed state as a recovery error", async () => {
    const targetDir = path.join(tmpRoot, "target");
    await fs.outputFile(stateFilePath(targetDir), "{ bad json");

    await expect(readInstalledState(targetDir)).rejects.toThrow(/malformed/);
  });
});

