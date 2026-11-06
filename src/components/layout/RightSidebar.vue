<script setup lang="ts">
import type { ShotOutcome } from '@/math/simulation'

defineProps<{
    outcome: ShotOutcome
}>()

function percent(fraction: number) {
    return `${Math.round(fraction * 100)}%`
}
</script>

<template>
    <div class="right-sidebar">
        <p>Lands in: {{ percent(outcome.pIn) }}</p>
        <p>Opponent returns (if in): {{ outcome.pReturnGivenIn === null ? '—' : percent(outcome.pReturnGivenIn) }}</p>
        <p>Wins the point: {{ percent(outcome.pWin) }}</p>
    </div>
</template>

<style scoped lang="scss">
.right-sidebar {
    background-color: var(--layout-bg-color);
    border: 1px solid var(--layout-border-color);
    border-radius: var(--border-radius);
}
</style>
