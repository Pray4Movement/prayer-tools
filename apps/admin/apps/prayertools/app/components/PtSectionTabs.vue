<script setup lang="ts">
// Tabs between the pages of one section (the rail is the only main
// navigation). `to` is the page's path without the site prefix; pages that
// live outside a site (`exempt`) keep their bare path.
import { useActiveOrg } from '#tenant'

export interface PtSectionTab {
  label: string
  to: string
  icon?: string
  query?: Record<string, string>
  exempt?: boolean
}

const props = defineProps<{ items: PtSectionTab[] }>()
const route = useRoute()
const { slug } = useActiveOrg()
const chromeSlug = useChromeOrgSlug()

const links = computed(() => props.items.map((t) => {
  const site = slug.value ?? chromeSlug.value
  const path = t.exempt || !site ? t.to : `/@${site}${t.to}`
  const active = (route.path === path || route.path === t.to)
    && Object.entries(t.query ?? {}).every(([k, v]) => route.query[k] === v)
  return { label: t.label, icon: t.icon, to: { path, query: t.query }, active }
}))
</script>

<template>
  <UNavigationMenu
    :items="links"
    highlight
    class="border-b border-(--ui-border)"
  />
</template>
