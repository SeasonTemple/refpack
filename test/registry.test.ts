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
});
