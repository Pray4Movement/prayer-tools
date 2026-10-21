// Imports a content pack (pack.json, or a zip of pack.json and images/) into a
// platform library. Multipart fields: `file`; `target`: "auto" (the platform
// library with the pack's title, else a new one), "new", or a library id;
// `publish`: "1" to publish after importing; `confirm`: "1" to write. Without
// `confirm` it only returns the summary of what would change.
import { requireOperatorAdmin } from '#tenant/server'

export default defineEventHandler(async (event) => {
  await requireOperatorAdmin(event)
  const parts = await readMultipartFormData(event)
  const field = (name: string) => parts?.find(p => p.name === name)?.data.toString('utf8') ?? ''
  const file = parts?.find(p => p.name === 'file' && p.data?.length)
  if (!file) ptBadRequest('Choose a pack (.zip or .json).')
  const pack = ptReadPack(new Uint8Array(file.data))
  const target = field('target') || 'auto'
  const summary = await ptPackSummary(pack, target)
  if (field('confirm') !== '1') return { summary }
  const result = await ptApplyPack(pack, summary.target?.id ?? 'new', field('publish') === '1')
  return { summary, ...result }
})
