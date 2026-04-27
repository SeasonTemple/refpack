import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import fsExtra from "fs-extra";
import { UserError } from "../errors/user-error.js";
import { assertSafeRelativePath, resolveInside } from "../paths.js";

const BLOCK_SIZE = 512;

export async function extractTgz(buffer: Buffer, destination: string): Promise<void> {
  const tar = zlib.gunzipSync(buffer);
  let offset = 0;

  while (offset + BLOCK_SIZE <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK_SIZE);
    if (isZeroBlock(header)) return;

    const name = readString(header, 0, 100);
    const size = readOctal(header, 124, 12);
    const typeflag = readString(header, 156, 1) || "0";
    const prefix = readString(header, 345, 155);
    const entryName = prefix ? `${prefix}/${name}` : name;

    validateEntryName(entryName);
    const target = resolveInside(destination, entryName, "archive entry");

    if (typeflag === "5") {
      await fsExtra.ensureDir(target);
    } else if (typeflag === "0" || typeflag === "") {
      const start = offset + BLOCK_SIZE;
      const end = start + size;
      if (end > tar.length) {
        throw new UserError(`Archive entry is truncated: ${entryName}`, "UNSAFE_ARCHIVE_ENTRY");
      }
      await fsExtra.ensureDir(path.dirname(target));
      await fs.writeFile(target, tar.subarray(start, end));
    } else {
      throw new UserError(`Unsupported archive entry type for ${entryName}.`, "UNSAFE_ARCHIVE_ENTRY");
    }

    offset += BLOCK_SIZE + Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE;
  }
}

export async function assertRootManifest(extractedDir: string): Promise<void> {
  if (!(await fsExtra.pathExists(path.join(extractedDir, "skills.json")))) {
    throw new UserError("SkillHub archive must contain skills.json at the archive root.", "INVALID_SKILLHUB_ARCHIVE");
  }
}

function validateEntryName(entryName: string): void {
  if (entryName.trim() === "") {
    throw new UserError("Archive entry name must not be empty.", "UNSAFE_ARCHIVE_ENTRY");
  }
  if (path.isAbsolute(entryName) || /^[a-zA-Z]:[\\/]/.test(entryName)) {
    throw new UserError(`Archive entry must be relative: ${entryName}`, "UNSAFE_ARCHIVE_ENTRY");
  }
  assertSafeRelativePath(entryName, "archive entry");
}

function readString(buffer: Buffer, offset: number, length: number): string {
  const raw = buffer.subarray(offset, offset + length);
  const end = raw.indexOf(0);
  return raw.subarray(0, end === -1 ? raw.length : end).toString("utf8").trim();
}

function readOctal(buffer: Buffer, offset: number, length: number): number {
  const value = readString(buffer, offset, length);
  if (!value) return 0;
  return Number.parseInt(value, 8);
}

function isZeroBlock(buffer: Buffer): boolean {
  return buffer.every((byte) => byte === 0);
}
