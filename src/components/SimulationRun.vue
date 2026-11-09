<script setup lang="ts">
import { computed } from 'vue'
import { intervalHalfWidth } from '@/math/analytics'
import type { ShotOutcome } from '@/math/simulation'
import { formatPercent } from '@/utils/formatPercent'

const props = defineProps<{
    candidateCount: number
    shotsPerTarget: number
    outcome: ShotOutcome
    computeTimeMs: number
}>()

function withInterval(p: number, variance: number) {
    const half = intervalHalfWidth(variance, props.shotsPerTarget) * 100
    return `${formatPercent(p)} ± ${half.toFixed(1)}`
}

const rows = computed(() => [
    { label: 'Candidate targets', value: String(props.candidateCount) },
    { label: 'Shots per candidate', value: String(props.shotsPerTarget) },
    {
        label: 'Lands in · recommended',
        value: withInterval(props.outcome.pIn, props.outcome.pIn * (1 - props.outcome.pIn)),
    },
    {
        label: 'Wins the point · recommended',
        value: withInterval(props.outcome.pWin, props.outcome.winContributionVariance),
    },
    { label: 'Compute time', value: `${props.computeTimeMs} ms` },
])
</script>

<template>
    <section class="simulation-run">
        <div class="heading">
            <h3>Simulation run</h3>
            <p>Last calculation</p>
        </div>
        <dl>
            <div v-for="row in rows" :key="row.label" class="row">
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
            </div>
        </dl>
        <p class="note">± is a 95% Monte Carlo interval. It shrinks with more simulated shots, but the model's
            simplifications stay.</p>
    </section>
</template>

<style scoped lang="scss">
.simulation-run {
    padding: 1.4rem;
    border: 1px solid var(--layout-border-color);
    border-radius: 1.2rem;
    background: #0d1116;

    .heading {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.4rem;

        h3 {
            color: var(--text-color-primary);
            font-size: 1.3rem;
            font-weight: 600;
        }

        p {
            color: var(--text-color-secondary);
            font-size: 1.1rem;
        }
    }

    .row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1.2rem;
        padding: 1.1rem 0;
        border-bottom: 1px solid var(--layout-border-color);
        color: var(--text-color-secondary);
        font-size: 1.2rem;

        dd {
            color: var(--text-color-primary);
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 1.3rem;
        }
    }

    .note {
        margin-top: 1.2rem;
        color: var(--text-color-secondary);
        font-size: 1.1rem;
        line-height: 1.45;
    }
}
</style>
