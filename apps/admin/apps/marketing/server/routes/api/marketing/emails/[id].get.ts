export default defineMarketingHandler('marketing.access', async (event, tx) => {
  const id = getRouterParam(event, 'id')
  if (!marketingIsUuid(id)) marketingNotFound()
  const email = await tx.selectFrom('marketing_email').selectAll().where('id', '=', id).executeTakeFirst()
  if (!email) marketingNotFound('Email not found.')
  const reasons = await tx
    .selectFrom('marketing_delivery')
    .select(['status', 'skip_reason', eb => eb.fn.countAll<string>().as('n')])
    .where('email_id', '=', id)
    .where('status', 'in', ['skipped', 'failed', 'pending'])
    .groupBy(['status', 'skip_reason'])
    .execute()
  const pending = reasons.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.n), 0)
  return {
    email,
    pending,
    skipReasons: Object.fromEntries(reasons.filter(r => r.status === 'skipped').map(r => [r.skip_reason ?? 'other', Number(r.n)]))
  }
})
