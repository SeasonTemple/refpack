import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { UserError } from "../errors/user-error.js";
import { assertRootManifest, extractTgz } from "./archive.js";
import type { SourceDescriptor, SourceProvider, SourceResolution } from "./provider.js";

const INTEGRITY_PATTERN = /^sha256-[A-Za-z0-9+/]{43}=$/;
const DEFAULT_MAX_ARTIFACT_SIZE_BYTES = 10 * 1024 * 1024;

export class HttpArchiveSourceProvider implements SourceProvider {
  constructor(private readonly maxArtifactSizeBytes = DEFAULT_MAX_ARTIFACT_SIZE_BYTES) {}

  canResolve(input: SourceDescriptor): boolean {
    return input.artifactType === "tgz";
  }

  async resolve(input: SourceDescriptor): Promise<SourceResolution> {
    validateInput(input);

    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "skills-archive-"));
    const extractDir = path.join(tmp, "pack");
    try {
      const artifact = await downloadArtifact(input, this.maxArtifactSizeBytes);
      verifyIntegrity(artifact, input.integrity!);
      await fs.ensureDir(extractDir);
      await extractTgz(artifact, extractDir);
      await assertRootManifest(extractDir);

      return {
        dir: extractDir,
        source: input.source,
        manifestPath: input.manifestPath,
        cleanup: async () => {
          await fs.remove(tmp);
        }
      };
    } catch (error) {
      await fs.remove(tmp);
      throw error;
    }
  }
}

function validateInput(input: SourceDescriptor): void {
  if (!/^https?:\/\//i.test(input.source)) {
    throw new UserError(`SkillHub archive source must be HTTP(S): ${input.source}`, "INVALID_ARCHIVE_SOURCE");
  }
  if (input.artifactType !== "tgz") {
    throw new UserError(`Unsupported artifact type: ${input.artifactType ?? "none"}`, "UNSUPPORTED_ARTIFACT_TYPE");
  }
  if (!input.integrity || !INTEGRITY_PATTERN.test(input.integrity)) {
    throw new UserError("Archive integrity must use sha256-<base64-digest> format.", "INVALID_ARCHIVE_INTEGRITY");
  }
  if (!Number.isInteger(input.sizeBytes) || !input.sizeBytes || input.sizeBytes <= 0) {
    throw new UserError("Archive sizeBytes must be a positive integer.", "INVALID_ARCHIVE_SIZE");
  }
}

async function downloadArtifact(input: SourceDescriptor, maxArtifactSizeBytes: number): Promise<Buffer> {
  const response = await fetch(input.source);
  if (!response.ok) {
    throw new UserError(`Failed to fetch archive ${input.source}: ${response.status} ${response.statusText}`, "ARCHIVE_FETCH_FAILED");
  }

  const declaredSize = input.sizeBytes!;
  if (declaredSize > maxArtifactSizeBytes) {
    throw new UserError(`Archive exceeds configured size limit: ${declaredSize}`, "ARCHIVE_TOO_LARGE");
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    const parsed = Number(contentLength);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new UserError("Archive response has invalid content-length.", "INVALID_ARCHIVE_SIZE");
    }
    if (parsed > declaredSize || parsed > maxArtifactSizeBytes) {
      throw new UserError("Archive response exceeds declared size.", "ARCHIVE_TOO_LARGE");
    }
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length !== declaredSize) {
    throw new UserError("Archive response size does not match registry metadata.", "ARCHIVE_SIZE_MISMATCH");
  }
  if (buffer.length > maxArtifactSizeBytes) {
    throw new UserError("Archive exceeds configured size limit.", "ARCHIVE_TOO_LARGE");
  }
  return buffer;
}

function verifyIntegrity(buffer: Buffer, integrity: string): void {
  const actual = `sha256-${crypto.createHash("sha256").update(buffer).digest("base64")}`;
  if (actual !== integrity) {
    throw new UserError("Archive integrity mismatch.", "ARCHIVE_INTEGRITY_MISMATCH");
  }
}
