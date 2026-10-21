// Drops one-time query flags from the address bar without a router navigation,
// so a bookmark of the page doesn't replay them.
export function dropQueryParams(...names: string[]) {
  const url = new URL(location.href)
  if (!names.some((n) => url.searchParams.has(n))) return
  for (const n of names) url.searchParams.delete(n)
  history.replaceState(history.state, '', url.pathname + url.search + url.hash)
}
