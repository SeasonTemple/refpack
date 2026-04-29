import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { detectCodex } from "../src/agents/codex.js";
import { detectGeneric } from "../src/agents/generic.js";
import { resolveTarget } from "../src/config.js";

const tmpRoot = path.join(process.cwd(), ".tmp-tests", "agents");

describe("agent detection", () => {
  afterEach(async () => {
    await fs.remove(tmpRoot);
  });

  it("reports an existing Codex skills directory as available without writing files", async () => {
    const codexHome = path.join(tmpRoot, "codex-home");
    const skillsDir = path.join(codexHome, "skills");
    await fs.ensureDir(skillsDir);

    const detection = await detectCodex({ env: { ...process.env, CODEX_HOME: codexHome } });

    expect(detection.id).toBe("codex");
    expect(detection.targetDir).toBe(skillsDir);
    expect(detection.status).toBe("available");
    await expect(fs.pathExists(path.join(skillsDir, ".refpack"))).resolves.toBe(false);
  });

  it("reports Generic as explicit-target only", async () => {
    const detection = await detectGeneric();

    expect(detection.id).toBe("generic");
    expect(detection.status).toBe("partial");
    expect(detection.targetDir).toBeUndefined();
  });

  it("keeps explicit --target ahead of configured agent targets", async () => {
    const target = path.join(tmpRoot, "target");
    const resolved = await resolveTarget({ target, agent: "codex" }, { target: "./other", agent: "generic" });

    expect(resolved.targetDir).toBe(path.resolve(target));
    expect(resolved.agent).toBe("codex");
  });
});

