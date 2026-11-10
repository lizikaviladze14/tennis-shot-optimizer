<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseCheckbox from '@/components/base/BaseCheckbox.vue'

const showDispersion = ref(true)
const showTrajectory = ref(true)
const showHeatmap = ref(false)
const showLandings = ref(false)

withDefaults(defineProps<{
    isPlaying?: boolean
    progress?: number
}>(), {
    isPlaying: false,
    progress: 0,
})

const emit = defineEmits<{
    'update:showDispersion': [value: boolean]
    'update:showTrajectory': [value: boolean]
    'update:showHeatmap': [value: boolean]
    'update:showLandings': [value: boolean]
    play: []
    stop: []
}>()

watch(showDispersion, (value) => emit('update:showDispersion', value))
watch(showTrajectory, (value) => emit('update:showTrajectory', value))
watch(showHeatmap, (value) => emit('update:showHeatmap', value))
watch(showLandings, (value) => emit('update:showLandings', value))
</script>

<template>
    <div class="court-controls">
        <div class="toggles">
            <BaseCheckbox v-model="showDispersion" class="toggle">
                <span class="label-full">Shot dispersion</span>
                <span class="label-short">Dispersion</span>
            </BaseCheckbox>
            <BaseCheckbox v-model="showTrajectory" class="toggle">
                <span class="label-full">Trajectory</span>
                <span class="label-short">Trajectory</span>
            </BaseCheckbox>
            <BaseCheckbox v-model="showHeatmap" class="toggle">
                <span class="label-full">Value heatmap</span>
                <span class="label-short">Heatmap</span>
            </BaseCheckbox>
            <BaseCheckbox v-model="showLandings" class="toggle">
                <span class="label-full">Simulated landings</span>
                <span class="label-short">Landings</span>
            </BaseCheckbox>
            <button type="button" class="play" title="Plays 3× slower than real time"
                :aria-label="isPlaying ? 'Stop the shot animation' : 'Play the shot animation'"
                @click="emit(isPlaying ? 'stop' : 'play')">
                <svg v-if="isPlaying" class="icon is-stop" viewBox="0 0 12 12" aria-hidden="true">
                    <rect x="2" y="2" width="8" height="8" fill="currentColor" />
                </svg>
                <svg v-else class="icon is-play" viewBox="0 0 12 12" aria-hidden="true">
                    <path d="M2.2 1.2 L10.8 6 L2.2 10.8 Z" fill="currentColor" />
                </svg>
                <span class="label" aria-hidden="true">
                    <span :class="{ 'is-shown': !isPlaying }">Play shot</span>
                    <span :class="{ 'is-shown': isPlaying }">Stop</span>
                </span>
                <span v-if="isPlaying" class="progress" :style="{ width: `${progress * 100}%` }" aria-hidden="true" />
            </button>
        </div>
        <ul class="legend">
            <li>
                <div class="swatch you">
                    <div class="inner"></div>
                </div>
                <span>You</span>
            </li>
            <li>
                <div class="swatch opponent">
                    <div class="inner"></div>
                </div>
                <span>Opponent</span>
            </li>
            <li>
                <div class="swatch target" />
                <span>Your target</span>
            </li>
            <li>
                <div class="swatch recommended">
                    <div class="inner"></div>
                </div>
                <span>Recommended</span>
            </li>
        </ul>
    </div>
</template>

<style lang="scss" scoped>
@use '../../styles/breakpoints' as *;

.court-controls {
    margin-top: 1.2rem;

    .toggles {
        display: flex;
        align-items: center;
        gap: .5rem;

        .label-short {
            display: none;
        }

        .play {
            position: relative;
            display: inline-flex;
            align-items: center;
            gap: 0.6rem;
            padding: 0.8rem 1.2rem;
            border: 1px solid var(--layout-border-color);
            border-radius: 1rem;
            background: transparent;
            color: var(--text-color-primary);
            font: inherit;
            font-size: 1.2rem;
            font-weight: 500;
            line-height: 1;
            cursor: pointer;
            white-space: nowrap;
            overflow: hidden;

            &:hover {
                background: #1a2027;
            }

            &:focus-visible {
                outline: 1px solid var(--text-color-secondary);
                outline-offset: 2px;
            }

            .icon {
                width: 1.4rem;
                height: 1.4rem;
                flex: none;

                &.is-play {
                    color: var(--green);
                }

                &.is-stop {
                    color: var(--red);
                }
            }

            .label {
                display: grid;

                span {
                    grid-area: 1 / 1;
                    visibility: hidden;

                    &.is-shown {
                        visibility: visible;
                    }
                }
            }

            .progress {
                position: absolute;
                left: 0;
                bottom: 0;
                height: 2px;
                background: var(--court-ball-color);
                transition: none;
            }
        }
    }

    .legend {
        display: flex;
        align-items: center;
        gap: 1.6rem;
        margin-top: 1.2rem;

        li {
            display: flex;
            align-items: center;
            gap: 0.6rem;
        }

        span {
            font-size: 1.1rem;
            font-weight: 500;
            color: var(--text-color-secondary);
        }

        .swatch {
            width: 1.1rem;
            height: 1.1rem;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;

            .inner {
                width: 0.8rem;
                height: 0.8rem;
                border-radius: 50%;
            }

            &.you {
                background: var(--white);

                .inner {
                    background: var(--player-marker-you-dot-color);
                }
            }

            &.opponent {
                background: var(--white);

                .inner {
                    background: var(--player-marker-opponent-dot-color);
                }
            }

            &.target {
                width: .9rem;
                height: .9rem;
                border-radius: 0.12rem;
                background: var(--court-target-color);
                transform: rotate(45deg);
            }

            &.recommended {
                background: #3dcc6e;

                .inner {
                    width: 0.6rem;
                    height: 0.6rem;
                    background-color: var(--layout-bg-color);
                }
            }
        }
    }
}

@media (max-width: $layout-wide) {
    .court-controls {
        .toggles {
            flex-wrap: wrap;

            .label-full {
                display: none;
            }

            .label-short {
                display: inline;
            }

            :deep(.base-checkbox) {
                flex: 1;
                justify-content: center;
                min-width: 0;
                padding: 0.7rem 0.6rem;
                font-size: 1.1rem;
            }

            :deep(.box) {
                display: none;
            }
        }

        .legend {
            display: none;
        }
    }
}
</style>