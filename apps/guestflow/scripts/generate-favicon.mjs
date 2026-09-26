#!/usr/bin/env node
/**
 * Regenerate GuestFlow favicon assets from approved brand raster.
 * Source: public/logos/the-browns-logo.png (emblem crop; same mark as thebrowns-logo-live SVG pack).
 * Requires one-off: npm install --no-save sharp to-ico
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import toIco from 'to-ico'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'public/logos/the-browns-logo.png')
const pub = path.join(root, 'public')

const cropSize = 270
const left = Math.round((856 - cropSize) / 2)
const top = 10

function emblemPipeline() {
  return sharp(src).extract({ left, top, width: cropSize, height: cropSize })
}

const sizes = [16, 32, 48]
const pngBuffers = []
for (const s of sizes) {
  pngBuffers.push(await emblemPipeline().resize(s, s, { fit: 'cover' }).png().toBuffer())
}

fs.writeFileSync(path.join(pub, 'favicon.ico'), await toIco(pngBuffers))
await emblemPipeline().resize(32, 32, { fit: 'cover' }).png().toFile(path.join(pub, 'icon-32.png'))
await emblemPipeline().resize(16, 16, { fit: 'cover' }).png().toFile(path.join(pub, 'icon-16.png'))
await emblemPipeline()
  .resize(180, 180, { fit: 'cover' })
  .png()
  .toFile(path.join(pub, 'apple-touch-icon.png'))

console.log('Wrote favicon.ico, icon-16.png, icon-32.png, apple-touch-icon.png')
