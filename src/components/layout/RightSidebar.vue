<script setup lang="ts">
import ShotResultCard from '@/components/ShotResultCard.vue'
import type { CourtPoint } from '@/math/point'
import type { ShotOutcome } from '@/math/simulation'

defineProps<{
    aim: CourtPoint
    opponent: CourtPoint
    outcome: ShotOutcome
    coverageM: number
}>()
</script>

<template>
    <div class="right-sidebar">
        <ShotResultCard heading="Your target" :aim="aim" :opponent="opponent" :outcome="outcome"
            :coverage-m="coverageM" />
    </div>
</template>

<style scoped lang="scss">
.right-sidebar {
    width: 30rem;
    flex: none;
    background-color: var(--layout-bg-color);
    border: 1px solid var(--layout-border-color);
    border-radius: var(--border-radius);
}
</style>
