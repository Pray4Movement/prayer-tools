<script setup lang="ts">
// Custom domains: add a domain, see the CNAME to create and the verification
// status. The {slug} address always keeps working.
definePageMeta({ middleware: 'auth' })

const { data: site, refresh } = usePtSite()
const { data: meta } = usePtMeta()
const toast = usePtToast()
const hostname = ref('')
const adding = ref(false)
const checking = ref<string | null>(null)

async function add() {
  adding.value = true
  try {
    await $fetch('/api/pt/domains', { method: 'POST', body: { hostname: hostname.value } })
    hostname.value = ''
    await refresh()
  } catch (err) {
    toast.fail(err)
  } finally {
    adding.value = false
  }
}
async function check(id: string) {
  checking.value = id
  try {
    await $fetch(`/api/pt/domains/${id}/check`, { method: 'POST' })
    await refresh()
  } catch (err) {
    toast.fail(err)
  } finally {
    checking.value = null
  }
}
async function remove(id: string) {
  try {
    await $fetch(`/api/pt/domains/${id}`, { method: 'DELETE' })
    await refresh()
  } catch (err) {
    toast.fail(err)
  }
}
</script>

<template>
  <div
    v-if="site"
    class="max-w-3xl mx-auto space-y-6"
  >
    <PtSettingsTabs />
    <div>
      <h1 class="text-2xl font-semibold">
        Domains
      </h1>
      <p class="text-sm text-(--ui-text-muted)">
        <strong>{{ site.subdomainUrl.replace(/^https?:\/\//, '') }}</strong> always works. Once your own domain is active,
        it becomes the main address and the prayer.tools address redirects to it.
      </p>
    </div>
    <UCard>
      <div class="flex flex-wrap items-end gap-2">
        <UFormField
          label="Your domain"
          help="Use a subdomain such as pray.yourchurch.org."
          class="flex-1"
        >
          <UInput
            v-model="hostname"
            placeholder="pray.example.org"
            class="w-full"
          />
        </UFormField>
        <UButton
          label="Add domain"
          :loading="adding"
          :disabled="!hostname.trim()"
          @click="add"
        />
      </div>
    </UCard>
    <UCard
      v-for="d in site.domains"
      :key="d.id"
    >
      <div class="space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ d.hostname }}</span>
            <UBadge
              :label="PT_LABELS.domainStatus[d.status]"
              :color="ptStatusColor(d.status)"
              variant="subtle"
            />
          </div>
          <div class="flex gap-2">
            <UButton
              size="sm"
              variant="soft"
              label="Check now"
              :loading="checking === d.id"
              @click="check(d.id)"
            />
            <UButton
              size="sm"
              color="error"
              variant="ghost"
              label="Remove"
              @click="remove(d.id)"
            />
          </div>
        </div>
        <div
          v-if="d.status !== 'active'"
          class="text-sm space-y-2"
        >
          <p>Add these records at your domain provider:</p>
          <table class="w-full text-xs border border-(--ui-border) rounded">
            <thead class="bg-(--ui-bg-elevated)">
              <tr>
                <th class="text-start p-2">
                  Type
                </th>
                <th class="text-start p-2">
                  Name
                </th>
                <th class="text-start p-2">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(r, i) in d.verification?.records ?? [{ type: 'CNAME', name: d.hostname, value: meta?.fallbackOrigin }]"
                :key="i"
                class="border-t border-(--ui-border)"
              >
                <td class="p-2 font-mono">
                  {{ r.type }}
                </td>
                <td class="p-2 font-mono break-all">
                  {{ r.name }}
                </td>
                <td class="p-2 font-mono break-all">
                  {{ r.value }}
                </td>
              </tr>
            </tbody>
          </table>
          <p class="text-(--ui-text-muted)">
            DNS changes can take up to a day. We check every day and email you if a domain stops pointing to us.
          </p>
        </div>
        <p
          v-else
          class="text-sm text-(--ui-text-muted)"
        >
          Active since {{ ptFormatDate(d.activated_at) }}.
        </p>
      </div>
    </UCard>
  </div>
</template>
