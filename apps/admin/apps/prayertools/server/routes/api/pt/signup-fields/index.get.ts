export default definePtHandler('pt.site.read', async (_event, tx) => {
  const fields = await tx.selectFrom('pt_signup_field').selectAll().orderBy('position').execute()
  const options = await tx.selectFrom('pt_consent_option').selectAll().orderBy('position').execute()
  return { fields, consentOptions: options }
})
