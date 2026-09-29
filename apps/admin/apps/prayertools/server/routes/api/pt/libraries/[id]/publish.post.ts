export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await ptEditableLibrary(event, id)
  return { version: await ptPublishLibrary(id) }
})
