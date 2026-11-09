<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseCheckbox from '@/components/base/BaseCheckbox.vue'

const showDispersion = ref(true)
const showTrajectory = ref(true)
const showHeatmap = ref(false)
const showLandings = ref(false)

const emit = defineEmits<{
    'update:showDispersion': [value: boolean]
    'update:showTrajectory': [value: boolean]
    'update:showHeatmap': [value: boolean]
    'update:showLandings': [value: boolean]
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