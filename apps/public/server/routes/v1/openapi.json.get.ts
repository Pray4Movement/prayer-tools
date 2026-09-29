import spec from '../../openapi/v1.json'
import { setCache } from '../../utils/request'

export default defineEventHandler((event) => {
  setCache(event, 'public, max-age=3600, s-maxage=86400')
  return spec
})
