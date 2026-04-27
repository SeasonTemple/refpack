import fs from "node:fs";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import fsExtra from "fs-extra";
import { UserError, toUserMessage } from "../../errors/user-error.js";
import { resolveInside } from "../../paths.js";
import { projectCatalogToRegistry } from "../catalog/registry-projection.js";
import { readSkillHubCatalog } from "../catalog/read.js";
import type { SkillHubCatalog, SkillHubCatalogSkill, SkillHubCatalogVersion } from "../catalog/types.js";
import { resolveSkillHubServerConfig, type SkillHubServerConfigInput, type SkillHubServerConfig } from "./config.js";

const ROUTE_PARAM_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export interface InjectOptions {
  method?: string;
  url: string;
  headers?: Record<string, string>;
}

export interface InjectResponse {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
  json: () => unknown;
}

export interface SkillHubApp {
  config: SkillHubServerConfig;
  catalog: SkillHubCatalog;
  inject(options: InjectOptions): Promise<InjectResponse>;
  listen(): Promise<http.Server>;
}

export async function createSkillHubApp(input: SkillHubServerConfigInput): Promise<SkillHubApp> {
  const config = resolveSkillHubServerConfig(input);
  const catalog = await readSkillHubCatalog(config.catalogPath);
  const handler = createRequestHandler(config, catalog);

  return {
    config,
    catalog,
    inject: (options) => inject(handler, options),
    listen: () =>
      new Promise((resolve, reject) => {
        const server = http.createServer(handler);
        server.once("error", reject);
        server.listen(config.port, config.host, () => resolve(server));
      })
  };
}

export function createRequestHandler(
  config: SkillHubServerConfig,
  catalog: SkillHubCatalog
): (request: IncomingMessage, response: ServerResponse) => void {
  return (request, response) => {
    handleRequest(config, catalog, request, response).catch((error) => {
      sendError(response, error);
    });
  };
}

async function handleRequest(
  config: SkillHubServerConfig,
  catalog: SkillHubCatalog,
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const method = request.method ?? "GET";
  const url = new URL(request.url ?? "/", "http://skillhub.local");

  if (method !== "GET") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (url.pathname === "/health") {
    sendJson(response, 200, {
      status: "ok",
      catalog: catalog.name,
      skills: catalog.skills.length
    });
    return;
  }

  if (url.pathname === "/registry.json") {
    response.setHeader("Cache-Control", "no-cache");
    sendJson(response, 200, projectCatalogToRegistry(catalog, { publicBaseUrl: config.publicBaseUrl }));
    return;
  }

  if (url.pathname === "/api/skills") {
    sendJson(response, 200, { skills: catalog.skills });
    return;
  }

  const detailMatch = /^\/api\/skills\/([^/]+)$/.exec(url.pathname);
  if (detailMatch) {
    sendJson(response, 200, { skill: findSkill(catalog, decodeRouteParam(detailMatch[1], "skill id")) });
    return;
  }

  const packMatch = /^\/api\/packs\/([^/]+)\/([^/]+)$/.exec(url.pathname);
  if (packMatch) {
    await sendArtifact(
      response,
      config,
      findSkill(catalog, decodeRouteParam(packMatch[1], "skill id")),
      decodeRouteParam(packMatch[2], "version")
    );
    return;
  }

  sendJson(response, 404, { error: "Not found" });
}

function decodeRouteParam(value: string, label: string): string {
  const decoded = decodeURIComponent(value);
  if (!ROUTE_PARAM_PATTERN.test(decoded) || decoded.includes("..") || decoded.includes("%")) {
    throw new UserError(`Invalid ${label}.`, "SKILLHUB_BAD_ROUTE_PARAM");
  }
  return decoded;
}

function findSkill(catalog: SkillHubCatalog, id: string): SkillHubCatalogSkill {
  const skill = catalog.skills.find((candidate) => candidate.id === id);
  if (!skill) throw new UserError(`Skill not found: ${id}`, "SKILLHUB_NOT_FOUND");
  return skill;
}

function findVersion(skill: SkillHubCatalogSkill, version: string): SkillHubCatalogVersion {
  const found = skill.versions.find((candidate) => candidate.version === version);
  if (!found) throw new UserError(`Version not found for ${skill.id}: ${version}`, "SKILLHUB_NOT_FOUND");
  return found;
}

async function sendArtifact(
  response: ServerResponse,
  config: SkillHubServerConfig,
  skill: SkillHubCatalogSkill,
  versionId: string
): Promise<void> {
  const version = findVersion(skill, versionId);
  const file = resolveInside(config.artifactRoot, version.artifactPath, "artifactPath");
  const stats = await fsExtra.stat(file).catch(() => undefined);
  if (!stats?.isFile()) throw new UserError(`Artifact not found: ${skill.id}@${version.version}`, "SKILLHUB_ARTIFACT_NOT_FOUND");
  if (stats.size !== version.sizeBytes) {
    throw new UserError(`Artifact size mismatch for ${skill.id}@${version.version}`, "SKILLHUB_ARTIFACT_SIZE_MISMATCH");
  }
  if (stats.size > config.maxArtifactSizeBytes) {
    throw new UserError(`Artifact exceeds configured size limit: ${skill.id}@${version.version}`, "SKILLHUB_ARTIFACT_TOO_LARGE");
  }

  response.statusCode = 200;
  response.setHeader("Content-Type", "application/gzip");
  response.setHeader("Content-Length", String(stats.size));
  response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  response.setHeader("X-SkillHub-Integrity", version.integrity);
  fs.createReadStream(file).pipe(response);
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function sendError(response: ServerResponse, error: unknown): void {
  const statusCode = error instanceof UserError && error.code.includes("NOT_FOUND") ? 404 : 400;
  sendJson(response, statusCode, { error: toUserMessage(error) });
}

async function inject(
  handler: (request: IncomingMessage, response: ServerResponse) => void,
  options: InjectOptions
): Promise<InjectResponse> {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new UserError("Failed to start SkillHub test server.", "SKILLHUB_TEST_SERVER_FAILED");
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${options.url}`, {
      method: options.method ?? "GET",
      headers: options.headers
    });
    const body = await response.text();
    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
      json: () => JSON.parse(body)
    };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
