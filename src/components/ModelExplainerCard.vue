<script setup lang="ts">
withDefaults(defineProps<{
    gridCells: number
    drawsCount: number
    highlighted?: boolean
}>(), {
    highlighted: false,
})
</script>

<template>
    <section class="model-explainer-card" :class="{ 'is-highlighted': highlighted }">
        <div class="heading">
            <h3>How the model picks a target</h3>
            <p>Simplified model. The parameters are illustrative, not fitted to data.</p>
        </div>
        <ol class="steps">
            <li>
                <p class="label">01 · AIM</p>
                <h4>Try every spot</h4>
                <p>The opponent's singles court is split into a {{ gridCells }} × {{ gridCells }} grid. The center of
                    each cell is a candidate target.</p>
            </li>
            <li>
                <p class="label">02 · SCATTER</p>
                <h4>Add your shot error</h4>
                <p>Each simulated shot lands at the target plus random error: Normal(0, σ) along and across its line,
                    with σ from your sliders. Every target uses the same {{ drawsCount }} simulated errors, so
                    comparisons are fair.</p>
            </li>
            <li>
                <p class="label">03 · CHASE</p>
                <h4>Can they get there?</h4>
                <p>The opponent's reach grows with the ball's flight time. A logistic curve turns the distance they'd
                    need to run into a chance of reaching the ball, and their consistency gives the chance they return
                    it.</p>
            </li>
            <li>
                <p class="label">04 · SCORE</p>
                <h4>Weigh risk vs reward</h4>
                <p class="formula">value = P(win) − λ · P(miss)</p>
                <p>λ comes from your risk preference: a miss costs λ points, a win scores 1. The target with the
                    highest value is recommended.</p>
            </li>
        </ol>
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
        border-color: #6fd08c;
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
        color: #6fd08c;
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
}

@media (prefers-reduced-motion: reduce) {
    .model-explainer-card {
        transition: none;
    }
}
</style>
