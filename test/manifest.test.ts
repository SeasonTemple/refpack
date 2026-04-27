import { describe, expect, it } from "vitest";
import { parseManifest } from "../src/manifest/schema.js";
import { readManifest } from "../src/manifest/read.js";

describe("parseManifest", () => {
  it("parses a valid manifest", () => {
    const manifest = parseManifest({
      name: "pack",
      skills: [
        {
          id: "browser-agent",
          name: "Browser Agent",
          description: "Automates browsers",
          source: "skills/browser-agent"
        }
      ]
    });

    expect(manifest.skills[0]?.target).toBe("browser-agent");
  });

  it("rejects path traversal", () => {
    expect(() =>
      parseManifest({
        name: "pack",
        skills: [
          {
            id: "bad",
            name: "Bad",
            description: "Bad path",
            source: "../outside"
          }
        ]
      })
    ).toThrow(/escapes/);
  });

  it("rejects manifest paths that escape the pack directory", async () => {
    await expect(readManifest(process.cwd(), "../skills.json")).rejects.toThrow(/escapes/);
  });
});
