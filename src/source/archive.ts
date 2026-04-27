import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import fsExtra from "fs-extra";
import { UserError } from "../errors/user-error.js";
import { assertSafeRelativePath, normalizeDisplayPath, resolveInside } from "../paths.js";

const BLOCK_SIZE = 512;

export interface TgzEntry {
  name: string;
  body?: Buffer;
  type?: "file" | "directory";
}

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

export async function createTgzFromDirectory(sourceDir: string): Promise<Buffer> {
  const root = path.resolve(sourceDir);
  const entries = await listArchiveEntries(root);
  return createTgz(entries);
}

export function sha256Integrity(buffer: Buffer): string {
  return `sha256-${crypto.createHash("sha256").update(buffer).digest("base64")}`;
}

export async function assertRootManifest(extractedDir: string): Promise<void> {
  if (!(await fsExtra.pathExists(path.join(extractedDir, "skills.json")))) {
    throw new UserError("SkillHub archive must contain skills.json at the archive root.", "INVALID_SKILLHUB_ARCHIVE");
  }
}

async function listArchiveEntries(root: string): Promise<TgzEntry[]> {
  const entries: TgzEntry[] = [];

  async function walk(dir: string): Promise<void> {
    const children = (await fs.readdir(dir)).sort((a, b) => a.localeCompare(b));
    for (const child of children) {
      const absolute = path.join(dir, child);
      const relative = normalizeDisplayPath(path.relative(root, absolute));
      validateEntryName(relative);
      const stats = await fs.lstat(absolute);

      if (stats.isSymbolicLink()) {
        throw new UserError(`Cannot pack symbolic link: ${relative}`, "UNSAFE_ARCHIVE_ENTRY");
      }
      if (stats.isDirectory()) {
        entries.push({ name: `${relative}/`, type: "directory" });
        await walk(absolute);
      } else if (stats.isFile()) {
        entries.push({ name: relative, type: "file", body: await fs.readFile(absolute) });
      } else {
        throw new UserError(`Cannot pack unsupported file type: ${relative}`, "UNSAFE_ARCHIVE_ENTRY");
      }
    }
  }

  await walk(root);
  return entries;
}

function createTgz(entries: TgzEntry[]): Buffer {
  const blocks: Buffer[] = [];
  for (const entry of entries) {
    const body = entry.body ?? Buffer.alloc(0);
    const typeflag = entry.type === "directory" ? "5" : "0";
    blocks.push(createHeader(entry.name, typeflag === "0" ? body.length : 0, typeflag));
    if (typeflag === "0") {
      blocks.push(body);
      blocks.push(Buffer.alloc(padding(body.length)));
    }
  }
  blocks.push(Buffer.alloc(BLOCK_SIZE * 2));
  return zlib.gzipSync(Buffer.concat(blocks));
}

function createHeader(entryName: string, size: number, typeflag: string): Buffer {
  const header = Buffer.alloc(BLOCK_SIZE);
  const { name, prefix } = splitUstarName(entryName);
  writeString(header, name, 0, 100);
  writeOctal(header, typeflag === "5" ? 0o755 : 0o644, 100, 8);
  writeOctal(header, 0, 108, 8);
  writeOctal(header, 0, 116, 8);
  writeOctal(header, size, 124, 12);
  writeOctal(header, 0, 136, 12);
  header.fill(" ", 148, 156);
  writeString(header, typeflag, 156, 1);
  writeString(header, "ustar", 257, 6);
  writeString(header, "00", 263, 2);
  writeString(header, prefix, 345, 155);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeOctal(header, checksum, 148, 8);
  return header;
}

function splitUstarName(entryName: string): { name: string; prefix: string } {
  if (Buffer.byteLength(entryName) <= 100) return { name: entryName, prefix: "" };

  const parts = entryName.split("/");
  for (let split = parts.length - 1; split > 0; split -= 1) {
    const prefix = parts.slice(0, split).join("/");
    const name = parts.slice(split).join("/");
    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(name) <= 100) {
      return { name, prefix };
    }
  }

  throw new UserError(`Archive entry path is too long: ${entryName}`, "UNSAFE_ARCHIVE_ENTRY");
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

function writeString(buffer: Buffer, value: string, offset: number, length: number): void {
  buffer.write(value.slice(0, length), offset, length, "utf8");
}

function writeOctal(buffer: Buffer, value: number, offset: number, length: number): void {
  const text = value.toString(8).padStart(length - 1, "0");
  buffer.write(`${text}\0`.slice(0, length), offset, length, "ascii");
}

function padding(size: number): number {
  return (BLOCK_SIZE - (size % BLOCK_SIZE)) % BLOCK_SIZE;
}

function isZeroBlock(buffer: Buffer): boolean {
  return buffer.every((byte) => byte === 0);
}
