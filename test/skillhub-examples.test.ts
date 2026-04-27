import { describe, expect, it } from "vitest";
import fs from "fs-extra";
import { parseRegistry } from "../src/registry/schema.js";
import { parseSkillHubCatalog } from "../src/skillhub/catalog/schema.js";
import { projectCatalogToRegistry } from "../src/skillhub/catalog/registry-projection.js";

describe("SkillHub examples", () => {
  it("keeps the example catalog parseable and projectable", async () => {
    const catalog = parseSkillHubCatalog(await fs.readJson("examples/skillhub/catalog.json"));
    const registry = projectCatalogToRegistry(catalog, {
      publicBaseUrl: "https://skillhub.example.com"
    });

    expect(parseRegistry(registry).skills[0]).toMatchObject({
      id: "browser-agent",
      artifactType: "tgz",
      source: "https://skillhub.example.com/api/packs/browser-agent/1.0.0"
    });
  });
});
