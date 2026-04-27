import http from "node:http";
import fs from "fs-extra";
import { afterEach, describe, expect, it } from "vitest";
import { HttpArchiveSourceProvider } from "../src/source/http-archive-provider.js";
import { SourceResolver } from "../src/source/provider.js";
import { LocalSourceProvider } from "../src/source/local-provider.js";
import { createTgz, sha256Integrity } from "./helpers/tgz.js";

async function withServer(body: Buffer, statusCode = 200): Promise<{ url: string; close: () => Promise<void> }> {
  const server = http.createServer((_, response) => {
    response.statusCode = statusCode;
    response.setHeader("Content-Length", String(body.length));
    response.end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Failed to start test server");
  return {
    url: `http://127.0.0.1:${address.port}/pack.tgz`,
    close: () => new Promise((resolve) => server.close(() => resolve()))
  };
}

describe("HttpArchiveSourceProvider", () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
  });

  it("downloads, verifies, and extracts SkillHub archives", async () => {
    const archive = createTgz([
      { name: "skills.json", body: JSON.stringify({ name: "pack", skills: [{ id: "browser-agent" }] }) },
      { name: "skills/browser-agent/SKILL.md", body: "# Browser Agent" }
    ]);
    const server = await withServer(archive);
    cleanups.push(server.close);

    const provider = new HttpArchiveSourceProvider();
    const result = await provider.resolve({
      source: server.url,
      artifactType: "tgz",
      integrity: sha256Integrity(archive),
      sizeBytes: archive.length
    });
    cleanups.push(result.cleanup!);

    await expect(fs.pathExists(`${result.dir}/skills.json`)).resolves.toBe(true);
    await expect(fs.pathExists(`${result.dir}/skills/browser-agent/SKILL.md`)).resolves.toBe(true);
  });

  it("rejects integrity mismatches", async () => {
    const archive = createTgz([{ name: "skills.json", body: "{}" }]);
    const server = await withServer(archive);
    cleanups.push(server.close);

    await expect(
      new HttpArchiveSourceProvider().resolve({
        source: server.url,
        artifactType: "tgz",
        integrity: "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        sizeBytes: archive.length
      })
    ).rejects.toThrow(/integrity mismatch/);
  });

  it("rejects unsafe archive entries", async () => {
    const archive = createTgz([
      { name: "skills.json", body: "{}" },
      { name: "../outside.txt", body: "bad" }
    ]);
    const server = await withServer(archive);
    cleanups.push(server.close);

    await expect(
      new HttpArchiveSourceProvider().resolve({
        source: server.url,
        artifactType: "tgz",
        integrity: sha256Integrity(archive),
        sizeBytes: archive.length
      })
    ).rejects.toThrow(/archive entry/i);
  });

  it("rejects archives without a root manifest", async () => {
    const archive = createTgz([{ name: "nested/skills.json", body: "{}" }]);
    const server = await withServer(archive);
    cleanups.push(server.close);

    await expect(
      new HttpArchiveSourceProvider().resolve({
        source: server.url,
        artifactType: "tgz",
        integrity: sha256Integrity(archive),
        sizeBytes: archive.length
      })
    ).rejects.toThrow(/skills.json at the archive root/);
  });

  it("rejects truncated archive entries", async () => {
    const archive = createTgz([{ name: "skills.json", body: "{}" }]);
    const truncated = archive.subarray(0, archive.length - 20);
    const server = await withServer(truncated);
    cleanups.push(server.close);

    await expect(
      new HttpArchiveSourceProvider().resolve({
        source: server.url,
        artifactType: "tgz",
        integrity: sha256Integrity(truncated),
        sizeBytes: truncated.length
      })
    ).rejects.toThrow();
  });

  it("preserves legacy source resolution through descriptor inputs", async () => {
    const resolver = new SourceResolver([new LocalSourceProvider()]);
    const result = await resolver.resolve({ source: "." });

    expect(result.dir).toBe(process.cwd());
  });
});
