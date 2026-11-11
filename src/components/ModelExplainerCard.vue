<script setup lang="ts">
import type { ModelLevel } from '@/types/modelLevel'

withDefaults(defineProps<{
    gridCells: number
    drawsCount: number
    highlighted?: boolean
    modelLevel?: ModelLevel
    shotLabel?: string
}>(), {
    highlighted: false,
    modelLevel: 'simple',
    shotLabel: '',
})
</script>

<template>
    <section class="model-explainer-card" :class="{ 'is-highlighted': highlighted }">
        <div class="heading">
            <h3>How the model picks a target</h3>
            <p v-if="modelLevel === 'detailed'">Detailed model: more factors, still illustrative values, not fitted to data.</p>
            <p v-else>Simplified model. The parameters are illustrative, not fitted to data.</p>
        </div>
        <ol class="steps">
            <li>
                <p class="label">01 · AIM</p>
                <h4>{{ modelLevel === 'detailed' ? 'Try every spot your shot can reach' : 'Try every spot' }}</h4>
                <p v-if="modelLevel === 'detailed'">The opponent's singles court is split into a {{ gridCells }} ×
                    {{ gridCells }} grid. Only targets your {{ shotLabel }} can land on are tried: each
                    shot type has its own range of depths.</p>
                <p v-else>The opponent's singles court is split into a {{ gridCells }} × {{ gridCells }} grid. The center
                    of each cell is a candidate target.</p>
            </li>
            <li>
                <p class="label">02 · SCATTER</p>
                <h4>Add your shot error</h4>
                <p v-if="modelLevel === 'detailed'">Each simulated shot lands at the target plus random error, Normal(0,
                    σ), along and across its line. Your level sets σ and the ball speed, and the shot type adjusts them.
                    Shorter targets are hit slower, so the ball can clear the net and come down in time. Every target
                    uses the same {{ drawsCount }} simulated errors, so comparisons are fair.</p>
                <p v-else>Each simulated shot lands at the target plus random error: Normal(0, σ) along and across its
                    line, with σ from your sliders. Every target uses the same {{ drawsCount }} simulated errors, so
                    comparisons are fair.</p>
            </li>
            <li>
                <p class="label">03 · CHASE</p>
                <h4>Can they get there?</h4>
                <p v-if="modelLevel === 'detailed'">The opponent can play the ball anywhere along its path after the
                    bounce, so they get the flight time plus a short playable window. A logistic curve turns the
                    distance they'd need to run into a chance of reaching it, and their consistency gives the chance
                    they return it.</p>
                <p v-else>The opponent's reach grows with the ball's flight time. A logistic curve turns the distance
                    they'd need to run into a chance of reaching the ball, and their consistency gives the chance they
                    return it.</p>
            </li>
            <li>
                <p class="label">04 · SCORE</p>
                <h4>Weigh risk vs reward</h4>
                <p class="formula">{{ modelLevel === 'detailed' ? 'value = P(rally win) − λ · P(miss)' : 'value = P(win) − λ · P(miss)' }}</p>
                <p v-if="modelLevel === 'detailed'">A returned ball still counts: it's worth the chance you go on to win
                    the rally, higher when your ball landed deep. A miss costs λ, from your risk preference. The target
                    with the highest value is recommended.</p>
                <p v-else>P(win) is the chance an in ball is not returned. A miss costs λ, from your risk preference.
                    The target with the highest value is recommended.</p>
            </li>
        </ol>
        <p v-if="modelLevel === 'detailed'" class="not-modeled">Not modeled: spin direction, net clearance, the
            opponent's anticipation or recovery between shots.</p>
    </section>
</template>

<style scoped lang="scss">
.model-explainer-card {
    container-type: inline-size;
    padding: 1.4rem;
    border: 1px solid var(--layout-border-color);
    border-radius: 1.2rem;
    background: #0d1116;
    transition: border-color 0.35s ease;

    &.is-highlighted {
        border-color: var(--green);
    }

    .heading {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 1.6rem;
        margin-bottom: 1.6rem;

        h3 {
            color: var(--text-color-primary);
            font-size: 1.3rem;
            font-weight: 600;
        }

        p {
            color: var(--text-color-secondary);
            font-size: 1.1rem;
            text-align: right;
        }
    }

    .steps {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.6rem;
        list-style: none;

        @container (min-width: 40rem) {
            grid-template-columns: 1fr 1fr;
        }

        @container (min-width: 70rem) {
            grid-template-columns: repeat(4, 1fr);
        }
    }

    .label {
        margin-bottom: 0.6rem;
        color: var(--green);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 1.1rem;
        font-weight: 600;
        letter-spacing: 0.06em;
    }

    h4 {
        margin-bottom: 0.6rem;
        color: var(--text-color-primary);
        font-size: 1.4rem;
        font-weight: 700;
    }

    p {
        color: var(--text-color-secondary);
        font-size: 1.2rem;
        line-height: 1.45;
    }

    .formula {
        margin-bottom: 0.6rem;
        color: var(--text-color-primary);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 1.2rem;
    }

    .not-modeled {
        margin-top: 1.6rem;
        color: var(--text-color-secondary);
        font-size: 1.1rem;
    }
}

@media (prefers-reduced-motion: reduce) {
    .model-explainer-card {
        transition: none;
    }
}
</style>
