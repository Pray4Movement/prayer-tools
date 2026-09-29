// Image uploads for the champion's personal library: resized for slow
// connections (a large and a small WebP), stored in object storage, or on
// local disk under `.data/uploads` when S3 isn't configured (development).
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { join, normalize } from 'node:path'
import { randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { uploadToS3 } from '#core/server/utils/storage'

const LOCAL_DIR = join(process.cwd(), '.data', 'uploads')

function s3Configured(): boolean {
  return !!(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_BUCKET_NAME && process.env.S3_PUBLIC_BASE_URL)
}

async function store(buf: Buffer, name: string, contentType: string): Promise<{ key: string, url: string }> {
  if (s3Configured()) {
    const res = await uploadToS3(buf, name, contentType, 'public', 'pt-images')
    return { key: res.key, url: res.url }
  }
  const key = `${randomBytes(16).toString('hex')}.${name.split('.').pop()}`
  await mkdir(LOCAL_DIR, { recursive: true })
  await writeFile(join(LOCAL_DIR, key), buf)
  const base = (process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:2380').replace(/\/$/, '')
  return { key: `local/${key}`, url: `${base}/uploads/${key}` }
}

export async function ptReadLocalUpload(key: string): Promise<Buffer | null> {
  const safe = normalize(key).replace(/^(\.\.[/\\])+/, '')
  if (safe.includes('/') || safe.includes('\\')) return null
  return await readFile(join(LOCAL_DIR, safe)).catch(() => null)
}

export async function ptProcessImage(input: Buffer): Promise<{ key: string, url: string, urlSmall: string, width: number, height: number }> {
  const img = sharp(input, { failOn: 'error' }).rotate()
  const meta = await img.metadata()
  if (!meta.width || !meta.height) ptBadRequest('That file is not an image we can read.')
  const large = await img.clone().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer({ resolveWithObject: true })
  const small = await img.clone().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 70 }).toBuffer()
  const main = await store(large.data, 'image.webp', 'image/webp')
  const thumb = await store(small, 'image-small.webp', 'image/webp')
  return { key: main.key, url: main.url, urlSmall: thumb.url, width: large.info.width, height: large.info.height }
}
