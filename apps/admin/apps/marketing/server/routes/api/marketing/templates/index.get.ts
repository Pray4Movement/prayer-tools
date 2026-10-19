// The user's personal template library, usable on any of their sites.
export default defineMarketingUserHandler(async (_event, tx, userId) => {
  const templates = await tx
    .selectFrom('marketing_template')
    .select(['id', 'name', 'versions', 'source_language', 'created_at', 'updated_at'])
    .where('owner_user_id', '=', userId)
    .orderBy('updated_at', 'desc')
    .execute()
  return { templates }
})
