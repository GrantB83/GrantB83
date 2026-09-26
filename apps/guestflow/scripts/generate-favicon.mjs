#!/usr/bin/env node
/**
 * Regenerate GuestFlow favicon assets from approved brand raster.
 * Source: public/logos/the-browns-logo.png (emblem crop; same mark as thebrowns-logo-live SVG pack).
 *
 * Requires one-off dev deps (not committed):
 *   npm install --no-save sharp png-to-ico
 *
 * ICO: built from the PNG emblem files via png-to-ico (valid 32bpp multi-size ICO).
 * Do not use to-ico on raw PNG buffers — that produced corrupted /favicon.ico (Design FAIL).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'public/logos/the-browns-logo.png')
const pub = path.join(root, 'public')

const cropSize = 270
const left = Math.round((856 - cropSize) / 2)
const top = 10

function emblemPipeline() {
  return sharp(src).extract({ left, top, width: cropSize, height: cropSize })
}

await emblemPipeline().resize(16, 16, { fit: 'cover' }).png().toFile(path.join(pub, 'icon-16.png'))
await emblemPipeline().resize(32, 32, { fit: 'cover' }).png().toFile(path.join(pub, 'icon-32.png'))
await emblemPipeline()
  .resize(180, 180, { fit: 'cover' })
  .png()
  .toFile(path.join(pub, 'apple-touch-icon.png'))

const icon48Path = path.join(pub, '.icon-48-build.png')
await emblemPipeline().resize(48, 48, { fit: 'cover' }).png().toFile(icon48Path)

const icoBuffer = await pngToIco([
  path.join(pub, 'icon-16.png'),
  path.join(pub, 'icon-32.png'),
  icon48Path,
])
fs.writeFileSync(path.join(pub, 'favicon.ico'), icoBuffer)
fs.unlinkSync(icon48Path)

console.log(
  `Wrote favicon.ico (${icoBuffer.length} bytes, 16+32+48), icon-16.png, icon-32.png, apple-touch-icon.png`,
)
