// The site's own wording for editable public strings, over the code-owned
// defaults the public server ships in i18n.
export default definePtHandler('pt.site.read', async (_event, tx) => {
  const rows = await tx.selectFrom('pt_site_string').select(['key', 'language', 'value']).execute()
  return { strings: rows }
})
