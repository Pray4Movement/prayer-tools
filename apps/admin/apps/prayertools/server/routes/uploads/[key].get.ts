// Serves locally stored uploads in development (no object storage configured).
export default defineEventHandler(async (event) => {
  const buf = await ptReadLocalUpload(getRouterParam(event, 'key') ?? '')
  if (!buf) throw createError({ statusCode: 404 })
  setHeader(event, 'content-type', 'image/webp')
  setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
  setHeader(event, 'access-control-allow-origin', '*')
  return buf
})
