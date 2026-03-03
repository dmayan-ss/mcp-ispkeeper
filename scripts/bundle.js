/**
 * Creates the .mcpb bundle (zip) for Claude App installation.
 */

import { createWriteStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { Writable } from "node:stream";

// Minimal zip creator using Node built-ins
// We avoid external deps so this script works without node_modules after build

const BUNDLE_NAME = "mcp-ispkeeper.mcpb";
const FILES_TO_INCLUDE = ["manifest.json", "package.json", "dist/index.js"];

class ZipBuilder {
  #entries = [];
  #offset = 0;

  addFile(name, data) {
    const nameBuffer = Buffer.from(name, "utf8");
    const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

    // Local file header
    const header = Buffer.alloc(30 + nameBuffer.length);
    header.writeUInt32LE(0x04034b50, 0); // signature
    header.writeUInt16LE(20, 4); // version needed
    header.writeUInt16LE(0, 6); // flags
    header.writeUInt16LE(0, 8); // compression (store)
    header.writeUInt16LE(0, 10); // mod time
    header.writeUInt16LE(0, 12); // mod date
    header.writeUInt32LE(crc32(dataBuffer), 14); // crc32
    header.writeUInt32LE(dataBuffer.length, 18); // compressed size
    header.writeUInt32LE(dataBuffer.length, 22); // uncompressed size
    header.writeUInt16LE(nameBuffer.length, 26); // name length
    header.writeUInt16LE(0, 28); // extra length
    nameBuffer.copy(header, 30);

    this.#entries.push({
      name: nameBuffer,
      data: dataBuffer,
      header,
      offset: this.#offset,
    });
    this.#offset += header.length + dataBuffer.length;
  }

  toBuffer() {
    const parts = [];

    // File entries
    for (const entry of this.#entries) {
      parts.push(entry.header, entry.data);
    }

    // Central directory
    const cdStart = this.#offset;
    let cdSize = 0;
    for (const entry of this.#entries) {
      const cd = Buffer.alloc(46 + entry.name.length);
      cd.writeUInt32LE(0x02014b50, 0); // signature
      cd.writeUInt16LE(20, 4); // version made by
      cd.writeUInt16LE(20, 6); // version needed
      cd.writeUInt16LE(0, 8); // flags
      cd.writeUInt16LE(0, 10); // compression
      cd.writeUInt16LE(0, 12); // mod time
      cd.writeUInt16LE(0, 14); // mod date
      cd.writeUInt32LE(crc32(entry.data), 16); // crc32
      cd.writeUInt32LE(entry.data.length, 20); // compressed size
      cd.writeUInt32LE(entry.data.length, 24); // uncompressed size
      cd.writeUInt16LE(entry.name.length, 28); // name length
      cd.writeUInt16LE(0, 30); // extra length
      cd.writeUInt16LE(0, 32); // comment length
      cd.writeUInt16LE(0, 34); // disk start
      cd.writeUInt16LE(0, 36); // internal attrs
      cd.writeUInt32LE(0, 38); // external attrs
      cd.writeUInt32LE(entry.offset, 42); // local header offset
      entry.name.copy(cd, 46);
      parts.push(cd);
      cdSize += cd.length;
    }

    // End of central directory
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // signature
    eocd.writeUInt16LE(0, 4); // disk number
    eocd.writeUInt16LE(0, 6); // disk with cd
    eocd.writeUInt16LE(this.#entries.length, 8); // entries on disk
    eocd.writeUInt16LE(this.#entries.length, 10); // total entries
    eocd.writeUInt32LE(cdSize, 12); // cd size
    eocd.writeUInt32LE(cdStart, 16); // cd offset
    eocd.writeUInt16LE(0, 20); // comment length
    parts.push(eocd);

    return Buffer.concat(parts);
  }
}

// CRC32 implementation
function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Main
import { readFileSync, writeFileSync } from "node:fs";

const zip = new ZipBuilder();
for (const file of FILES_TO_INCLUDE) {
  const data = readFileSync(file);
  zip.addFile(file, data);
  console.log(`  Added: ${file} (${data.length} bytes)`);
}

writeFileSync(BUNDLE_NAME, zip.toBuffer());
const finalSize = zip.toBuffer().length;
console.log(`\nBundle created: ${BUNDLE_NAME} (${finalSize} bytes)`);
