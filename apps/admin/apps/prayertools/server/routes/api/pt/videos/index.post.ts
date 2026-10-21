// Uploads a video file (multipart `file`) for a landing section and returns
// its public URL. The file is stored as uploaded; the browser's own player plays it.
import { rateLimit } from '@prayertools/shared/rate-limit'

const MAX_BYTES = 100 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const user = await ptUser(event)
  if (!rateLimit(`video-upload:${user.userId}`, 20, 3600_000).ok) throw createError({ statusCode: 429, statusMessage: 'Too many uploads. Try again later.' })
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.data?.length)
  if (!file) ptBadRequest('Choose a video.')
  if (file.data.length > MAX_BYTES) ptBadRequest('Videos can be up to 100 MB.')
  const stored = await ptStoreVideo(file.data, file.type ?? '')
  return { url: stored.url }
})
