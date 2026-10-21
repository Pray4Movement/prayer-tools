// Uploads: personal-library images resized for slow connections (a large and
// a small WebP) and landing-section videos stored as uploaded, kept in object
// storage, or on local disk under `.data/uploads` when S3 isn't configured
// (development).
import { access, mkdir, writeFile, readFile } from 'node:fs/promises'
import { join, normalize } from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import sharp from 'sharp'
import { S3Client } from '@bradenmacdonald/s3-lite-client'
import { uploadToS3 } from '#core/server/utils/storage'

const LOCAL_DIR = join(process.cwd(), '.data', 'uploads')

function s3Configured(): boolean {
  return !!(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_BUCKET_NAME && process.env.S3_PUBLIC_BASE_URL)
}

async function store(buf: Buffer, name: string, contentType: string, folder = 'pt-images'): Promise<{ key: string, url: string }> {
  if (s3Configured()) {
    const res = await uploadToS3(buf, name, contentType, 'public', folder)
    return { key: res.key, url: res.url }
  }
  const key = `${randomBytes(16).toString('hex')}.${name.split('.').pop()}`
  await mkdir(LOCAL_DIR, { recursive: true })
  await writeFile(join(LOCAL_DIR, key), buf)
  const base = (process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:2380').replace(/\/$/, '')
  return { key: `local/${key}`, url: `${base}/uploads/${key}` }
}

// Library images are named by a hash of the source image, so importing the
// same image again reuses the stored file instead of adding a copy.
const LIBRARY_IMAGE_VERSION = 'w1600-q78'
let libraryClient: S3Client | null = null

// An image inside a library entry: one WebP of up to 1600 px; returns its URL.
export async function ptStoreLibraryImage(input: Buffer): Promise<string> {
  const name = `${createHash('sha256').update(LIBRARY_IMAGE_VERSION).update(input).digest('hex').slice(0, 32)}.webp`
  const resize = () => sharp(input, { failOn: 'error' }).rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
  const env = process.env
  if (s3Configured()) {
    libraryClient ??= new S3Client({ endPoint: env.S3_ENDPOINT!, region: env.S3_REGION || 'us-west-004', bucket: env.S3_BUCKET_NAME!, accessKey: env.S3_ACCESS_KEY_ID, secretKey: env.S3_SECRET_ACCESS_KEY, pathStyle: true })
    const key = `pt-images/${name}`
    const bucketName = env.S3_PUBLIC_BUCKET_NAME || env.S3_BUCKET_NAME
    if (!await libraryClient.exists(key, { bucketName })) {
      await libraryClient.putObject(key, await resize(), { metadata: { 'Content-Type': 'image/webp' }, bucketName })
    }
    return `${env.S3_PUBLIC_BASE_URL!.replace(/\/$/, '')}/${key}`
  }
  await mkdir(LOCAL_DIR, { recursive: true })
  const path = join(LOCAL_DIR, name)
  if (!await access(path).then(() => true, () => false)) await writeFile(path, await resize())
  return `${(env.NUXT_PUBLIC_SITE_URL || 'http://localhost:2380').replace(/\/$/, '')}/uploads/${name}`
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

export const PT_VIDEO_TYPES: Record<string, string> = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' }

export async function ptStoreVideo(input: Buffer, contentType: string): Promise<{ key: string, url: string }> {
  const ext = PT_VIDEO_TYPES[contentType]
  if (!ext) ptBadRequest('Upload an MP4, WebM or MOV video.')
  return await store(input, `video.${ext}`, contentType, 'pt-videos')
}
