<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
</script>

<template>
  <div class="max-w-[96rem] mx-auto space-y-6">
    <PtLandingTabs />
    <PtLandingEditor>
      <template #heading>
        <h1 class="text-2xl font-semibold">
          Landing page
        </h1>
        <p class="mt-1 text-sm text-(--ui-text-muted)">
          The first page people see. Write the parts that are yours; the rest comes from your site's setup.
        </p>
      </template>
    </PtLandingEditor>
  </div>
</template>
