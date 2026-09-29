export default defineAppConfig({
  marketing: {
    // Host endpoint for AI translation: POST { doc | texts, from, to } → { doc | texts }; 409 when AI isn't set up.
    translateEndpoint: '/api/pt/translate'
  }
})
