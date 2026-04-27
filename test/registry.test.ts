import { describe, expect, it } from "vitest";
import { parseRegistry } from "../src/registry/schema.js";
import { searchRegistry } from "../src/registry/client.js";

describe("registry", () => {
  it("parses and searches entries", () => {
    const registry = parseRegistry({
      name: "example",
      skills: [
        {
          id: "browser-agent",
          name: "Browser Agent",
          description: "Automates browsers",
          source: "./pack",
          tags: ["browser"]
        }
      ]
    });

    expect(searchRegistry(registry, "browser")).toHaveLength(1);
    expect(searchRegistry(registry, "missing")).toHaveLength(0);
  });

  it("parses hosted artifact metadata", () => {
    const registry = parseRegistry({
      name: "example",
      skills: [
        {
          id: "browser-agent",
          name: "Browser Agent",
          description: "Automates browsers",
          source: "https://skillhub.example.com/api/packs/browser-agent/1.0.0",
          artifactType: "tgz",
          integrity: "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
          sizeBytes: 123,
          version: "1.0.0"
        }
      ]
    });

    expect(registry.skills[0]).toMatchObject({
      artifactType: "tgz",
      integrity: "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      sizeBytes: 123,
      version: "1.0.0"
    });
  });

  it("rejects incomplete hosted artifact metadata", () => {
    expect(() =>
      parseRegistry({
        name: "example",
        skills: [
          {
            id: "browser-agent",
            name: "Browser Agent",
            description: "Automates browsers",
            source: "https://skillhub.example.com/api/packs/browser-agent/1.0.0",
            artifactType: "tgz"
          }
        ]
      })
    ).toThrow(/integrity and sizeBytes/);
  });
});
