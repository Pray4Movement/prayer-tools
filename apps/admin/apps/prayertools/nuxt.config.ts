// The prayer.tools layer: sites, domains, campaigns, setup, content,
// libraries, landing page, intercessors, commitments and stats. A site is a
// Nuxtinator org; everything here is scoped to the active org through the
// tenancy kernel.
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      // The champion's library is a personal app: its pages stay at this path
      // in every site.
      personalApps: { library: '/personal' }
    }
  }
})
