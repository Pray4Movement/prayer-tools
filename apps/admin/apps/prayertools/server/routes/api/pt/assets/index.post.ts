// Uploads an image into the personal library (multipart `file`, optional
// `alt` JSON TranslatableText and `credit`). Alt text is required.
import { db } from '#core/server/utils/database'
import { parseText } from '@prayertools/shared/translatable'
import { jsonb } from '@prayertools/shared/db/json'
import { rateLimit } from '@prayertools/shared/rate-limit'

const MAX_BYTES = 12 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const user = await ptUser(event)
  if (!rateLimit(`upload:${user.userId}`, 60, 3600_000).ok) throw createError({ statusCode: 429, statusMessage: 'Too many uploads. Try again later.' })
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.data?.length)
  if (!file) ptBadRequest('Choose an image.')
  if (file.data.length > MAX_BYTES) ptBadRequest('Images can be up to 12 MB.')
  if (!/^image\/(jpeg|png|webp|gif|avif|heic|heif)$/.test(file.type ?? '')) ptBadRequest('Upload a JPEG, PNG, WebP, GIF or AVIF image.')
  const altRaw = parts?.find(p => p.name === 'alt')?.data.toString('utf8')
  const alt = altRaw ? parseText(JSON.parse(altRaw)) : null
  if (!alt || !Object.values(alt.values).some(v => v.trim())) ptBadRequest('Describe the image (alt text) for people who can\'t see it.')
  const credit = parts?.find(p => p.name === 'credit')?.data.toString('utf8').slice(0, 200) || null
  const img = await ptProcessImage(file.data)
  const row = await db.insertInto('pt_personal_asset').values({
    owner_user_id: user.userId,
    storage_key: img.key,
    url: img.url,
    url_small: img.urlSmall,
    content_type: 'image/webp',
    width: img.width,
    height: img.height,
    alt: jsonb(alt),
    credit
  } as never).returningAll().executeTakeFirstOrThrow()
  return { asset: row }
})
