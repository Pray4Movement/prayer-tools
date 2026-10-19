// Whether the user may send to several sites at once: they can send on at
// least two sites. Multi-site sends are only offered as a secondary action
// then.
export function useMarketingSeveralSites() {
  const { data } = useFetch<{ sites: unknown[] }>('/api/marketing/multi/sites', { key: 'marketing-multi-sites', lazy: true, server: false })
  return computed(() => (data.value?.sites.length ?? 0) >= 2)
}
