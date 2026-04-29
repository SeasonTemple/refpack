import { UserError } from "../errors/user-error.js";
import { assertSafeRelativePath, normalizeDisplayPath } from "../paths.js";
import type { InstalledFile, InstalledSkill, InstalledState } from "./types.js";

function stringValue(record: Record<string, unknown>, key: string, context: string, required = true): string | undefined {
  const value = record[key];
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new UserError(`${context}.${key} must be a non-empty string.`, "INVALID_STATE");
  }
  return value;
}

function parseFile(value: unknown, index: number, context: string): InstalledFile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UserError(`${context}.files[${index}] must be an object.`, "INVALID_STATE");
  }
  const record = value as Record<string, unknown>;
  const filePath = normalizeDisplayPath(assertSafeRelativePath(stringValue(record, "path", `${context}.files[${index}]`)!, `${context}.files[${index}].path`));
  const sha256 = stringValue(record, "sha256", `${context}.files[${index}]`)!;
  const sizeBytes = record.sizeBytes;
  if (typeof sizeBytes !== "number" || !Number.isInteger(sizeBytes) || sizeBytes < 0) {
    throw new UserError(`${context}.files[${index}].sizeBytes must be a non-negative integer.`, "INVALID_STATE");
  }
  return { path: filePath, sha256, sizeBytes };
}

function parseSkill(value: unknown, index: number): InstalledSkill {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UserError(`state.installed[${index}] must be an object.`, "INVALID_STATE");
  }
  const record = value as Record<string, unknown>;
  const context = `state.installed[${index}]`;
  const artifact = record.artifact && typeof record.artifact === "object" && !Array.isArray(record.artifact)
    ? record.artifact as Record<string, unknown>
    : undefined;

  return {
    id: stringValue(record, "id", context)!,
    target: normalizeDisplayPath(assertSafeRelativePath(stringValue(record, "target", context)!, `${context}.target`)),
    source: stringValue(record, "source", context)!,
    registryId: stringValue(record, "registryId", context, false),
    version: stringValue(record, "version", context, false),
    manifestPath: stringValue(record, "manifestPath", context, false),
    agent: stringValue(record, "agent", context, false),
    installedAt: stringValue(record, "installedAt", context)!,
    artifact: artifact
      ? {
          type: artifact.type === "tgz" ? "tgz" : undefined,
          integrity: typeof artifact.integrity === "string" ? artifact.integrity : undefined,
          sizeBytes: typeof artifact.sizeBytes === "number" ? artifact.sizeBytes : undefined
        }
      : undefined,
    files: Array.isArray(record.files) ? record.files.map((file, fileIndex) => parseFile(file, fileIndex, context)) : []
  };
}

export function parseInstalledState(value: unknown): InstalledState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UserError("Installed state must contain a JSON object.", "INVALID_STATE");
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== "1.0") {
    throw new UserError("Installed state schemaVersion must be 1.0.", "INVALID_STATE");
  }
  if (!Array.isArray(record.installed)) {
    throw new UserError("Installed state installed must be an array.", "INVALID_STATE");
  }
  return {
    schemaVersion: "1.0",
    installed: record.installed.map(parseSkill)
  };
}
