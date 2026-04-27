import { describe, expect, it } from "vitest";
import { parseManifest } from "../src/manifest/schema.js";

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
});
