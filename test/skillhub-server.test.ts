import path from "node:path";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { createSkillHubApp } from "../src/skillhub/server/app.js";

const tmpRoot = path.join(process.cwd(), ".tmp-tests", "skillhub-server");
const integrity = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

async function writeCatalog(sizeBytes = 5) {
  await fs.outputFile(path.join(tmpRoot, "artifacts/browser-agent/1.0.0.tgz"), "hello");
  await fs.writeJson(
    path.join(tmpRoot, "catalog.json"),
    {
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
              sizeBytes
            }
          ]
        }
      ]
    },
    { spaces: 2 }
  );
}

async function createApp(sizeBytes = 5) {
  await writeCatalog(sizeBytes);
  return createSkillHubApp({
    catalogPath: path.join(tmpRoot, "catalog.json"),
    artifactRoot: path.join(tmpRoot, "artifacts"),
    publicBaseUrl: "https://skillhub.example.com"
  });
}

describe("SkillHub server", () => {
  afterEach(async () => {
    await fs.remove(tmpRoot);
  });

  it("serves health and registry endpoints", async () => {
    const app = await createApp();

    const health = await app.inject({ url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({ status: "ok", catalog: "skillhub", skills: 1 });

    const registry = await app.inject({ url: "/registry.json" });
    expect(registry.statusCode).toBe(200);
    expect(registry.json()).toMatchObject({
      skills: [
        {
          id: "browser-agent",
          source: "https://skillhub.example.com/api/packs/browser-agent/1.0.0",
          artifactType: "tgz",
          integrity,
          sizeBytes: 5
        }
      ]
    });
  });

  it("serves skill details and artifacts by catalog lookup", async () => {
    const app = await createApp();

    const detail = await app.inject({ url: "/api/skills/browser-agent" });
    expect(detail.statusCode).toBe(200);
    expect(detail.json()).toMatchObject({ skill: { id: "browser-agent", latestVersion: "1.0.0" } });

    const artifact = await app.inject({ url: "/api/packs/browser-agent/1.0.0" });
    expect(artifact.statusCode).toBe(200);
    expect(artifact.body).toBe("hello");
  });

  it("returns 404 for missing skills", async () => {
    const app = await createApp();

    const response = await app.inject({ url: "/api/skills/missing" });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: "Skill not found: missing" });
  });

  it("rejects path-like route params", async () => {
    const app = await createApp();

    const response = await app.inject({ url: "/api/packs/browser-agent%2Foutside/1.0.0" });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "Invalid skill id." });
  });

  it("refuses artifacts whose size differs from catalog metadata", async () => {
    const app = await createApp(999);

    const response = await app.inject({ url: "/api/packs/browser-agent/1.0.0" });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "Artifact size mismatch for browser-agent@1.0.0" });
  });
});
