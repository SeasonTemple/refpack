import { execa } from "execa";
import { describe, expect, it } from "vitest";

describe("package smoke", () => {
  it("includes built CLI, docs, examples, and README in npm package dry run", async () => {
    const result = await execa("npm", ["pack", "--dry-run", "--json"], {
      env: {
        NO_COLOR: "1",
        FORCE_COLOR: "0"
      }
    });

    const [pack] = JSON.parse(result.stdout) as Array<{ files: Array<{ path: string }> }>;
    const files = pack.files.map((file) => file.path);

    expect(files).toContain("dist/cli.js");
    expect(files).toContain("README.md");
    expect(files).toContain("README.zh-CN.md");
    expect(files).toContain("docs/agent-targets.md");
    expect(files).toContain("docs/installed-state.md");
    expect(files).toContain("docs/v1-release-checklist.md");
    expect(files.some((file) => file.startsWith("examples/"))).toBe(true);
  }, 30_000);
});
