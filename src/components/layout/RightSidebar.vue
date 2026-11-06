<script setup lang="ts">
defineProps<{
    inProbability: number
}>()
</script>

<template>
    <div class="right-sidebar">
        Lands in: {{ Math.round(inProbability * 100) }}%
    </div>
</template>

<style scoped lang="scss">
.right-sidebar {
    background-color: var(--layout-bg-color);
    border: 1px solid var(--layout-border-color);
    border-radius: var(--border-radius);
}
</style>