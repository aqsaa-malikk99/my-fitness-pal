/**
 * Writes solid-color RGBA PNGs (no deps) for PWA install icons.
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, "ascii");
  const crc = crc32(Buffer.concat([t, data]));
  const cbuf = Buffer.alloc(4);
  cbuf.writeUInt32BE(crc);
  return Buffer.concat([len, t, data, cbuf]);
}

function solidPng(width, height, r, g, b) {
  const row = Buffer.alloc(1 + width * 4);
  row[0] = 0;
  for (let x = 0; x < width; x++) {
    const o = 1 + x * 4;
    row[o] = r;
    row[o + 1] = g;
    row[o + 2] = b;
    row[o + 3] = 255;
  }
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const compressed = zlib.deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
}

const out = path.join(__dirname, "..", "public");
const bg = { r: 15, g: 23, b: 42 };
fs.writeFileSync(path.join(out, "pwa-192.png"), solidPng(192, 192, bg.r, bg.g, bg.b));
fs.writeFileSync(path.join(out, "pwa-512.png"), solidPng(512, 512, bg.r, bg.g, bg.b));
console.log("Wrote public/pwa-192.png and public/pwa-512.png");
