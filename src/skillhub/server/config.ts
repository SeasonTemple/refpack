import path from "node:path";
import { UserError } from "../../errors/user-error.js";

export const DEFAULT_MAX_ARTIFACT_SIZE_BYTES = 10 * 1024 * 1024;

export interface SkillHubServerConfig {
  catalogPath: string;
  artifactRoot: string;
  publicBaseUrl: string;
  host: string;
  port: number;
  maxArtifactSizeBytes: number;
}

export interface SkillHubServerConfigInput {
  catalogPath?: string;
  artifactRoot?: string;
  publicBaseUrl?: string;
  host?: string;
  port?: number;
  maxArtifactSizeBytes?: number;
}

export function resolveSkillHubServerConfig(input: SkillHubServerConfigInput = {}): SkillHubServerConfig {
  const catalogPath = input.catalogPath ?? process.env.SKILLHUB_CATALOG;
  const artifactRoot = input.artifactRoot ?? process.env.SKILLHUB_ARTIFACT_ROOT;
  const publicBaseUrl = input.publicBaseUrl ?? process.env.SKILLHUB_PUBLIC_BASE_URL;

  if (!catalogPath) throw new UserError("Missing SkillHub catalog path.", "SKILLHUB_CONFIG_ERROR");
  if (!artifactRoot) throw new UserError("Missing SkillHub artifact root.", "SKILLHUB_CONFIG_ERROR");
  if (!publicBaseUrl) throw new UserError("Missing SkillHub public base URL.", "SKILLHUB_CONFIG_ERROR");

  return {
    catalogPath: path.resolve(catalogPath),
    artifactRoot: path.resolve(artifactRoot),
    publicBaseUrl,
    host: input.host ?? process.env.SKILLHUB_HOST ?? "127.0.0.1",
    port: input.port ?? readIntegerEnv("SKILLHUB_PORT", 3333),
    maxArtifactSizeBytes: input.maxArtifactSizeBytes ?? readIntegerEnv("SKILLHUB_MAX_ARTIFACT_BYTES", DEFAULT_MAX_ARTIFACT_SIZE_BYTES)
  };
}

function readIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new UserError(`${name} must be a positive integer.`, "SKILLHUB_CONFIG_ERROR");
  }
  return parsed;
}
