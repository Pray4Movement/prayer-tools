import { setCache } from '../../utils/request'

export default defineEventHandler((event) => {
  const pkg = process.env.PT_ANDROID_PACKAGE
  const prints = (process.env.PT_ANDROID_SHA256 || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!pkg || !prints.length) throw createError({ statusCode: 404 })
  setCache(event, 'public, max-age=3600, s-maxage=86400')
  return [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: pkg, sha256_cert_fingerprints: prints } }]
})
