import { describe, expect, it } from "vitest";
import { parseRegistry } from "../src/registry/schema.js";
import { parseSkillHubCatalog } from "../src/skillhub/catalog/schema.js";
import { projectCatalogToRegistry } from "../src/skillhub/catalog/registry-projection.js";

const integrity = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

function validCatalog() {
  return {
    schemaVersion: "1.0",
    name: "skillhub",
    skills: [
      {
        id: "browser-agent",
        name: "Browser Agent",
        description: "Automates browser workflows",
        latestVersion: "1.0.0",
        tags: ["browser"],
        adapters: ["codex"],
        versions: [
          {
            version: "1.0.0",
            artifactPath: "browser-agent/1.0.0.tgz",
            artifactType: "tgz",
            integrity,
            sizeBytes: 321
          }
        ]
      }
    ]
  };
}

describe("SkillHub catalog", () => {
  it("projects latest versions to a CLI registry", () => {
    const catalog = parseSkillHubCatalog(validCatalog());
    const registry = projectCatalogToRegistry(catalog, {
      publicBaseUrl: "https://skillhub.example.com/"
    });

    expect(parseRegistry(registry).skills[0]).toMatchObject({
      id: "browser-agent",
      source: "https://skillhub.example.com/api/packs/browser-agent/1.0.0",
      manifestPath: "skills.json",
      artifactType: "tgz",
      integrity,
      sizeBytes: 321,
      version: "1.0.0"
    });
  });

  it("rejects duplicate skill ids", () => {
    const catalog = validCatalog();
    catalog.skills.push({ ...catalog.skills[0] });

    expect(() => parseSkillHubCatalog(catalog)).toThrow(/Duplicate SkillHub skill id/);
  });

  it("rejects missing latest versions", () => {
    const catalog = validCatalog();
    catalog.skills[0].latestVersion = "2.0.0";

    expect(() => parseSkillHubCatalog(catalog)).toThrow(/Latest version not found/);
  });

  it("rejects path-like ids and versions", () => {
    const catalog = validCatalog();
    catalog.skills[0].id = "../bad";

    expect(() => parseSkillHubCatalog(catalog)).toThrow(/route-safe slug/);
  });

  it("rejects invalid hosted artifact metadata", () => {
    const catalog = validCatalog();
    catalog.skills[0].versions[0].artifactType = "zip";

    expect(() => parseSkillHubCatalog(catalog)).toThrow(/artifactType/);
  });

  it("rejects artifact paths that escape the artifact root", () => {
    const catalog = validCatalog();
    catalog.skills[0].versions[0].artifactPath = "../outside.tgz";

    expect(() => parseSkillHubCatalog(catalog)).toThrow(/escapes/);
  });

  it("rejects nested manifest paths for hosted artifacts", () => {
    const catalog = validCatalog();
    catalog.skills[0].versions[0].manifestPath = "nested/skills.json";

    expect(() => parseSkillHubCatalog(catalog)).toThrow(/must be skills.json/);
  });
});
