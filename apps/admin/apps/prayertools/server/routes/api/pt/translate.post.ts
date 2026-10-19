export default definePtHandler('pt.content.translate', async (event, tx) => {
  return await ptTranslate(tx, await ptBody(event))
})
