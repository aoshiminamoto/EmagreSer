// Gera os ícones PWA sem dependências externas (PNG RGBA com zlib do Node).
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outputDir = join(dirname(fileURLToPath(import.meta.url)), '../public/icons')
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function pixel(x, y, size) {
  const cx = x - size / 2
  const cy = y - size / 2
  const circle = Math.hypot(cx, cy) < size * 0.28
  const shaft = Math.abs(cx) < size * 0.035 && cy > -size * 0.13 && cy < size * 0.11
  const head = cy >= size * 0.07 && cy < size * 0.16 && Math.abs(cx) < (size * 0.16 - cy) * 1.6
  if (circle && (shaft || head)) return [21, 128, 61, 255]
  if (circle) return [255, 255, 255, 255]
  return [34, 197, 94, 255]
}

function makePng(size) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(stride * size)
  for (let y = 0; y < size; y++) {
    const row = y * stride
    raw[row] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y, size)
      raw[row + 1 + x * 4] = r
      raw[row + 2 + x * 4] = g
      raw[row + 3 + x * 4] = b
      raw[row + 4 + x * 4] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(outputDir, { recursive: true })
for (const [name, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
]) {
  writeFileSync(join(outputDir, name), makePng(size))
  console.log(`ícone gerado: ${name}`)
}
