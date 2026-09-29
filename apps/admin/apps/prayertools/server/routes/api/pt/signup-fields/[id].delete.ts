// Stops asking the question. Answers already given stay on the contacts.
export default definePtHandler('pt.site.write', async (event, tx) => {
  await tx.deleteFrom('pt_signup_field').where('id', '=', getRouterParam(event, 'id')!).execute()
  return { ok: true }
})
