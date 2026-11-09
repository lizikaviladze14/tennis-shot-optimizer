<script setup lang="ts">
import { computed } from 'vue'
import IconInfo from '@/assets/icons/icon-info.vue'
import { metresInsideSideline, metresPastNet, metresRightOfCenter, targetLabel } from '@/math/describeTarget'
import { distance, type CourtPoint } from '@/math/point'
import type { ShotOutcome } from '@/math/simulation'

const props = withDefaults(defineProps<{
    heading: string
    aim: CourtPoint
    opponent: CourtPoint
    outcome: ShotOutcome
    coverageM: number
    accentColor?: string
    isActive?: boolean
}>(), {
    accentColor: 'var(--text-color-primary)',
    isActive: false,
})

const emit = defineEmits<{
    showOnCourt: []
}>()

const title = computed(() => targetLabel(props.aim))

const position = computed(() => {
    const pastNet = `${metresPastNet(props.aim).toFixed(1)} m past net`
    const right = metresRightOfCenter(props.aim)
    const side = right >= 0 ? 'right' : 'left'
    return `${pastNet} · ${Math.abs(right).toFixed(1)} m ${side} of center`
})

const sentence = computed(() => {
    const fromOpponent = distance(props.opponent, props.aim).toFixed(1)
    const inside = metresInsideSideline(props.aim)
    const sideline = inside >= 0
        ? `and still ${inside.toFixed(1)} m inside the sideline`
        : `and ${Math.abs(inside).toFixed(1)} m outside the sideline`
    const coverage = `They can cover ${props.coverageM.toFixed(1)} m before this ball arrives.`
    return `Lands ${fromOpponent} m from your opponent ${sideline}. ${coverage}`
})

function percent(fraction: number) {
    return Math.round(fraction * 100)
}

const rows = computed(() => [
    { id: 'in', label: 'Lands in', value: props.outcome.pIn },
    { id: 'return', label: 'Opponent gets it back (if in)', value: props.outcome.pReturnGivenIn },
    { id: 'win', label: 'Wins the point', value: props.outcome.pWin },
])
</script>

<template>
    <div class="shot-result-card" :class="{ 'is-active': isActive }" :style="{ '--card-accent': accentColor }">
        <div class="heading">
            <h3>{{ heading }}</h3>
            <span v-if="isActive" class="on-court">On court</span>
            <button v-else type="button" class="show-on-court" @click="emit('showOnCourt')">Show on court</button>
        </div>

        <div class="title">
            <span class="ring" aria-hidden="true" />
            <h2>{{ title }}</h2>
        </div>
        <p class="position">{{ position }}</p>

        <p class="sentence">{{ sentence }}</p>

        <div class="rows">
            <div v-for="row in rows" :key="row.id" class="row" :class="`row-${row.id}`">
                <div class="row-heading">
                    <span>{{ row.label }}</span>
                    <span class="value">{{ row.value === null ? '—' : `${percent(row.value)}%` }}</span>
                </div>
                <div class="bar">
                    <div class="bar-fill" :style="{ width: `${row.value === null ? 0 : percent(row.value)}%` }" />
                </div>
            </div>
        </div>

        <p class="note">
            <IconInfo class="note-icon" color="var(--text-color-secondary)" />
            <span>These are estimates from a simplified model with illustrative settings. They are not real-world
                guarantees.</span>
        </p>
    </div>
</template>

<style scoped lang="scss">
.shot-result-card {
    --result-in-color: var(--text-color-primary);
    --result-return-color: #f0a070;
    --result-win-color: #6fd08c;

    padding: 1.6rem;

    &.is-active {
        background: color-mix(in srgb, var(--card-accent) 5%, transparent);
        box-shadow: inset 0.3rem 0 0 var(--card-accent);

        .heading h3 {
            color: var(--card-accent);
        }
    }

    .heading {
        display: flex;
        align-items: center;
        justify-content: space-between;

        h3 {
            color: var(--text-color-secondary);
            font-size: 1.1rem;
            font-weight: 600;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }

        .on-court {
            padding: 0.5rem 1rem;
            border: 1px solid color-mix(in srgb, var(--card-accent) 45%, transparent);
            border-radius: 10px;
            background: color-mix(in srgb, var(--card-accent) 12%, transparent);
            color: var(--card-accent);
            font-size: 1.2rem;
            font-weight: 600;
        }

        .show-on-court {
            padding: 0.5rem 1rem;
            border: 1px solid var(--layout-border-color);
            border-radius: 10px;
            background: transparent;
            color: var(--text-color-primary);
            font: inherit;
            font-size: 1.2rem;
            cursor: pointer;

            &:hover {
                background: rgba(255, 255, 255, 0.04);
            }

            &:focus-visible {
                outline: 1px solid var(--text-color-secondary);
                outline-offset: 2px;
            }
        }
    }

    .title {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-top: 1.4rem;

        .ring {
            flex: none;
            width: 1.4rem;
            height: 1.4rem;
            border: 0.3rem solid var(--result-win-color);
            border-radius: 50%;
            background: #2a3a30;
        }

        h2 {
            color: var(--text-color-primary);
            font-size: 1.8rem;
            font-weight: 700;
        }
    }

    .position {
        margin-top: 0.4rem;
        padding-left: 2.4rem;
        color: var(--text-color-secondary);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 1.1rem;
        line-height: 1.45;
    }

    .sentence {
        margin-top: 1.2rem;
        color: var(--text-color-primary);
        font-size: 1.3rem;
        line-height: 1.5;
    }

    .rows {
        display: flex;
        flex-direction: column;
        gap: 1.4rem;
        margin-top: 1.4rem;
        padding: 1.4rem;
        border: 1px solid var(--layout-border-color);
        border-radius: 1rem;
        background: #0d1116;

        .row-heading {
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            gap: 0.8rem;
            margin-bottom: 0.8rem;
            color: var(--text-color-primary);
            font-size: 1.2rem;

            .value {
                font-size: 1.6rem;
                font-weight: 500;
            }
        }

        .bar {
            height: 0.5rem;
            border-radius: 1rem;
            background: #1f252d;
            overflow: hidden;

            .bar-fill {
                height: 100%;
                border-radius: 1rem;
            }
        }

        .row-in {
            .value {
                color: var(--result-in-color);
            }

            .bar-fill {
                background: var(--result-in-color);
            }
        }

        .row-return {
            .value {
                color: var(--result-return-color);
            }

            .bar-fill {
                background: var(--result-return-color);
            }
        }

        .row-win {
            .value {
                color: var(--result-win-color);
            }

            .bar-fill {
                background: var(--result-win-color);
            }
        }
    }

    .note {
        display: flex;
        align-items: flex-start;
        gap: 0.8rem;
        margin-top: 1.4rem;
        color: var(--text-color-secondary);
        font-size: 1.1rem;
        line-height: 1.45;

        .note-icon {
            flex: none;
            margin-top: 0.1rem;
        }
    }
}
</style>
