import path from "node:path";
import { UserError } from "./errors/user-error.js";

export function assertSafeRelativePath(value: string, label: string): string {
  if (!value || typeof value !== "string") {
    throw new UserError(`${label} must be a non-empty relative path.`, "INVALID_PATH");
  }

  if (path.isAbsolute(value)) {
    throw new UserError(`${label} must be relative: ${value}`, "INVALID_PATH");
  }

  const normalized = path.normalize(value);
  if (normalized === "." || normalized.startsWith("..") || path.isAbsolute(normalized)) {
    throw new UserError(`${label} escapes its base directory: ${value}`, "INVALID_PATH");
  }

  return normalized;
}

export function resolveInside(baseDir: string, relativePath: string, label: string): string {
  const safeRelative = assertSafeRelativePath(relativePath, label);
  const base = path.resolve(baseDir);
  const resolved = path.resolve(base, safeRelative);

  if (!isInside(base, resolved)) {
    throw new UserError(`${label} escapes its base directory: ${relativePath}`, "INVALID_PATH");
  }

  return resolved;
}

export function isInside(baseDir: string, targetPath: string): boolean {
  const relative = path.relative(path.resolve(baseDir), path.resolve(targetPath));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function normalizeDisplayPath(value: string): string {
  return value.split(path.sep).join("/");
}
