import crypto from "node:crypto";
import zlib from "node:zlib";

const BLOCK_SIZE = 512;

export interface TgzEntry {
  name: string;
  body?: string;
  type?: "file" | "directory" | "symlink";
  linkName?: string;
}

export function createTgz(entries: TgzEntry[]): Buffer {
  const blocks: Buffer[] = [];
  for (const entry of entries) {
    const body = Buffer.from(entry.body ?? "");
    const typeflag = entry.type === "directory" ? "5" : entry.type === "symlink" ? "2" : "0";
    blocks.push(createHeader(entry.name, body.length, typeflag, entry.linkName));
    if (typeflag === "0") {
      blocks.push(body);
      blocks.push(Buffer.alloc(padding(body.length)));
    }
  }
  blocks.push(Buffer.alloc(BLOCK_SIZE * 2));
  return zlib.gzipSync(Buffer.concat(blocks));
}

export function sha256Integrity(buffer: Buffer): string {
  return `sha256-${crypto.createHash("sha256").update(buffer).digest("base64")}`;
}

function createHeader(name: string, size: number, typeflag: string, linkName = ""): Buffer {
  const header = Buffer.alloc(BLOCK_SIZE);
  writeString(header, name, 0, 100);
  writeOctal(header, 0o644, 100, 8);
  writeOctal(header, 0, 108, 8);
  writeOctal(header, 0, 116, 8);
  writeOctal(header, size, 124, 12);
  writeOctal(header, 0, 136, 12);
  header.fill(" ", 148, 156);
  writeString(header, typeflag, 156, 1);
  writeString(header, linkName, 157, 100);
  writeString(header, "ustar", 257, 6);
  writeString(header, "00", 263, 2);
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeOctal(header, checksum, 148, 8);
  return header;
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
