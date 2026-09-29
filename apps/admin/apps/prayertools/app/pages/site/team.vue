<script setup lang="ts">
// The site's team: owners, editors, translators and viewers. Invites and
// memberships use the tenancy layer's endpoints; a site always keeps an owner.
definePageMeta({ middleware: 'auth' })

interface Member { membership_id: string, user_id: string, email: string, display_name: string, roles: string[], status: string, joined_at: string }

const { data: site, can, slug } = usePtSite()
const { user } = useAuth()
const toast = usePtToast()
const { data, refresh } = useFetch<{ rows: Member[] }>(() => `/api/o/${slug.value}/members`, { key: computed(() => `pt-team-${slug.value}`) })

const ROLE_ITEMS = PT_ROLE_KEYS.map(value => ({ value, label: PT_LABELS.role[value], description: PT_LABELS.roleDescription[value] }))
const invite = reactive({ email: '', display_name: '', role: 'pt-editor' })
const inviting = ref(false)

function roleOf(m: Member): string {
  return PT_ROLE_KEYS.find(r => m.roles.includes(r)) ?? m.roles[0] ?? 'member'
}

async function sendInvite() {
  inviting.value = true
  try {
    const res = await $fetch<{ status: string }>(`/api/o/${slug.value}/invite`, { method: 'POST', body: { email: invite.email, display_name: invite.display_name || invite.email.split('@')[0], roles: [invite.role] } })
    toast.ok(res.status === 'pending' ? 'Invitation sent' : 'Added to the team')
    invite.email = ''
    invite.display_name = ''
    await refresh()
  } catch (err) {
    toast.fail(err, 'Could not invite')
  } finally {
    inviting.value = false
  }
}
async function setRole(m: Member, role: string) {
  try {
    await $fetch(`/api/o/${slug.value}/members/${m.user_id}/roles`, { method: 'PATCH', body: { roles: [role] } })
    await refresh()
    toast.ok('Role changed')
  } catch (err) {
    toast.fail(err)
    await refresh()
  }
}
async function remove(m: Member) {
  try {
    await $fetch(`/api/o/${slug.value}/members/${m.user_id}`, { method: 'DELETE' })
    if (m.user_id === user.value?.id) return navigateTo('/orgs')
    await refresh()
  } catch (err) {
    toast.fail(err)
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">
        Team
      </h1>
      <p class="text-sm text-(--ui-text-muted)">
        People you add see this site only, never your other sites.
      </p>
    </div>
    <UCard v-if="can('org.members.invite')">
      <template #header>
        <h2 class="font-semibold">
          Invite someone
        </h2>
      </template>
      <div class="space-y-3">
        <div class="grid sm:grid-cols-2 gap-3">
          <UFormField label="Email">
            <UInput
              v-model="invite.email"
              type="email"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Name">
            <UInput
              v-model="invite.display_name"
              class="w-full"
            />
          </UFormField>
        </div>
        <URadioGroup
          v-model="invite.role"
          :items="ROLE_ITEMS"
          variant="card"
        />
        <div class="flex justify-end">
          <UButton
            label="Invite"
            :loading="inviting"
            :disabled="!invite.email.includes('@')"
            @click="sendInvite"
          />
        </div>
      </div>
    </UCard>
    <UCard>
      <ul class="divide-y divide-(--ui-border)">
        <li
          v-for="m in data?.rows ?? []"
          :key="m.membership_id"
          class="py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <div>
            <p class="font-medium">
              {{ m.display_name }} <span
                v-if="m.user_id === user?.id"
                class="text-xs text-(--ui-text-muted)"
              >(you)</span>
            </p>
            <p class="text-sm text-(--ui-text-muted)">
              {{ m.email }}<span v-if="m.status === 'pending_invite'"> · invitation sent</span><span v-else-if="m.status === 'expired_invite'"> · invitation expired</span>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <USelect
              :model-value="roleOf(m)"
              :items="ROLE_ITEMS.map(r => ({ value: r.value, label: r.label }))"
              :disabled="!can('org.members.manage_roles')"
              class="w-36"
              @update:model-value="(v) => setRole(m, v as string)"
            />
            <UButton
              v-if="can('org.members.remove') || m.user_id === user?.id"
              size="sm"
              color="error"
              variant="ghost"
              :label="m.user_id === user?.id ? 'Leave' : 'Remove'"
              @click="remove(m)"
            />
          </div>
        </li>
      </ul>
    </UCard>
    <p
      v-if="site"
      class="text-xs text-(--ui-text-muted)"
    >
      A site can have several owners; the last owner can't leave or be demoted. If an owner leaves, Prayer.Tools can make another member an owner.
    </p>
  </div>
</template>
