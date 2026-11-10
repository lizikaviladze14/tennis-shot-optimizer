<script setup lang="ts">
import type { TennisCourtSurface } from '@/types/tennisCourt'
import IconReset from '@/assets/icons/icon-reset.vue'
import { computed } from 'vue'
import { describePlayerPosition, DEFAULT_YOU, DEFAULT_OPPONENT } from '@/math/playerPosition'
import type { CourtPoint } from '@/math/point'
import { SHOT_ACCURACY_PRESETS, type ShotAccuracy, type ShotAccuracyLevel } from '@/types/shotAccuracy'
import { OPPONENT_SKILL_PRESETS, type OpponentSkill, type OpponentSkillLevel } from '@/types/opponentSkill'
import SegmentedControl from '@/components/base/SegmentedControl.vue'
import { RISK_PRESETS, type RiskPreference } from '@/types/riskPreference'
import { DEFAULT_SHOT_COUNT, SHOT_COUNT_OPTIONS, type ShotCount, type ShotCountId } from '@/types/shotCount'
import type { ModelLevel } from '@/types/modelLevel'
import { SHOT_TYPE_PROFILES, type ShotType } from '@/types/shotTypes'

const props = withDefaults(defineProps<{
    surface?: TennisCourtSurface,
    you?: CourtPoint,
    opponent?: CourtPoint,
    shotAccuracy?: ShotAccuracy,
    opponentSkill?: OpponentSkill,
    riskPreference?: RiskPreference,
    shotCount?: ShotCount,
    modelLevel?: ModelLevel,
    shotType?: ShotType,
    effectiveShot?: ShotAccuracy,
}>(), {
    surface: 'hard',
    you: () => ({ ...DEFAULT_YOU }),
    opponent: () => ({ ...DEFAULT_OPPONENT }),
    shotAccuracy: () => ({ level: 'advanced', ...SHOT_ACCURACY_PRESETS.advanced }),
    opponentSkill: () => ({ level: 'advanced', ...OPPONENT_SKILL_PRESETS.advanced }),
    riskPreference: 'balanced',
    shotCount: DEFAULT_SHOT_COUNT,
    modelLevel: 'simple',
    shotType: 'drive',
    effectiveShot: () => ({ level: 'advanced', ...SHOT_ACCURACY_PRESETS.advanced }),
})

const emit = defineEmits<{
    selectSurface: [surface: TennisCourtSurface]
    resetPositions: []
    selectAccuracy: [level: ShotAccuracyLevel]
    updateSideError: [metres: number]
    updateDepthError: [metres: number]
    updateBallSpeed: [metresPerSecond: number]
    selectOpponentSkill: [level: OpponentSkillLevel]
    updateRunSpeed: [metresPerSecond: number]
    updateConsistency: [fraction: number]
    selectRiskPreference: [preference: RiskPreference]
    selectShotCount: [count: ShotCount]
    selectShotType: [shotType: ShotType]
}>()

const surfaces: { id: TennisCourtSurface; label: string }[] = [
    { id: 'hard', label: 'Hard' },
    { id: 'clay', label: 'Clay' },
    { id: 'grass', label: 'Grass' },
]

const accuracyLevels: { id: ShotAccuracyLevel; label: string }[] = [
    { id: 'club', label: 'Club' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'pro', label: 'Pro' },
]

const opponentSkillLevels: { id: OpponentSkillLevel; label: string }[] = [
    { id: 'club', label: 'Club' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'pro', label: 'Pro' },
]

const riskPreferences = (Object.keys(RISK_PRESETS) as RiskPreference[]).map((id) => ({
    id,
    label: RISK_PRESETS[id].label,
}))

const shotCountOptions = SHOT_COUNT_OPTIONS.map(({ id, label }) => ({ id, label }))
const shotTypeOptions = (Object.keys(SHOT_TYPE_PROFILES) as ShotType[]).map((id) => ({
    id,
    label: id === 'drop' ? 'DropShot' : SHOT_TYPE_PROFILES[id].label,
}))

const effectiveShotLine = computed(() => {
    const shot = props.effectiveShot
    const profile = SHOT_TYPE_PROFILES[props.shotType]
    const minSpeed = shot.ballSpeedMps * profile.minDepthSpeedFactor
    const maxSpeed = shot.ballSpeedMps
    const speed = minSpeed === maxSpeed
        ? `${maxSpeed.toFixed(1)} m/s`
        : `${minSpeed.toFixed(1)}–${maxSpeed.toFixed(1)} m/s`
    return `${profile.label} uses: ± ${shot.sideErrorM.toFixed(2)} m side · ± ${shot.depthErrorM.toFixed(2)} m depth · ${speed}`
})
const shotCountId = computed<ShotCountId>(() => String(props.shotCount) as ShotCountId)

function onSelectShotCount(id: ShotCountId) {
    const option = SHOT_COUNT_OPTIONS.find((entry) => entry.id === id)
    if (option) emit('selectShotCount', option.count)
}

const riskDescription = computed(() => {
    const preset = RISK_PRESETS[props.riskPreference]
    return `${preset.description} (λ = ${preset.riskWeight.toFixed(1)}).`
})

const sideErrorM = computed(() => props.shotAccuracy.sideErrorM)
const depthErrorM = computed(() => props.shotAccuracy.depthErrorM)
const ballSpeedMps = computed(() => props.shotAccuracy.ballSpeedMps)
const runSpeedMps = computed(() => props.opponentSkill.runSpeedMps)
const consistencyPercent = computed(() => Math.round(props.opponentSkill.consistency * 100))

function onRangeInput(event: Event) {
    return Number((event.target as HTMLInputElement).value)
}

const youDescription = computed(() => describePlayerPosition('you', props.you))
const opponentDescription = computed(() => describePlayerPosition('opponent', props.opponent))
</script>
<template>
    <div class="left-sidebar">
        <section class="court-surface">
            <div class="content-wrapper">
                <h3>Court surface</h3>
                <SegmentedControl :options="surfaces" :model-value="props.surface" ariaLabel="Court surface"
                    @update:model-value="emit('selectSurface', $event)">
                    <template #option="{ option }">
                        <span class="swatch" :class="`swatch-${option.id}`" aria-hidden="true" />
                        {{ option.label }}
                    </template>
                </SegmentedControl>
                <p class="hint">Changes the court's look only. It doesn't change the model's results.</p>
            </div>
        </section>

        <section class="positions">
            <div class="content-wrapper">
                <div class="heading">
                    <h3>Player positions</h3>

                    <button type="button" class="reset" @click="emit('resetPositions')">
                        <IconReset color="var(--text-color-primary)" />
                        <span>Reset</span>
                    </button>
                </div>
                <div class="positions-list">
                    <div class="position you">
                        <div class="pos-dot">
                            <div class="pos-dot-shadow">
                                <div class="pos-dot-white">
                                    <div class="pos-dot-inner"></div>
                                </div>
                            </div>
                        </div>
                        <div class="pos-info">
                            <div class="pos-name">You</div>
                            <div class="pos">{{ youDescription }}</div>
                        </div>
                    </div>
                    <div class="position opponent">
                        <div class="pos-dot">
                            <div class="pos-dot-shadow">
                                <div class="pos-dot-white">
                                    <div class="pos-dot-inner"></div>
                                </div>
                            </div>
                        </div>
                        <div class="pos-info">
                            <div class="pos-name">Opponent</div>
                            <div class="pos">{{ opponentDescription }}</div>
                        </div>
                    </div>
                </div>
                <p class="hint">Drag the markers on the court. With a marker focused, the arrow keys move it 25 cm,
                    Shift +
                    arrows 1 m.</p>
            </div>
        </section>

        <section class="shot-accuracy">
            <div class="content-wrapper">
                <h3>Your shot</h3>
                <template v-if="modelLevel === 'detailed'">
                    <div class="control-label">Shot type</div>
                    <SegmentedControl :options="shotTypeOptions" :model-value="shotType" ariaLabel="Shot type"
                        @update:model-value="emit('selectShotType', $event)" />
                    <div class="control-label level">Level</div>
                </template>
                <SegmentedControl :options="accuracyLevels" :model-value="shotAccuracy.level" ariaLabel="Shot accuracy"
                    @update:model-value="emit('selectAccuracy', $event)" />
                <div v-if="modelLevel !== 'detailed'" class="spread">
                    <div class="spread-mark" aria-hidden="true">
                        <svg viewBox="0 0 72 72">
                            <line x1="36" y1="6" x2="36" y2="66" />
                            <line x1="6" y1="36" x2="66" y2="36" />
                            <g transform="rotate(-18 36 36)">
                                <ellipse cx="36" cy="36" rx="24" ry="13" />
                                <ellipse cx="36" cy="36" rx="9" ry="5" />
                            </g>
                            <circle cx="36" cy="36" r="3" />
                        </svg>
                        <span>→</span>
                    </div>
                    <p>Each shot lands somewhere in this shape. The inner ring catches about <strong>39%</strong> of
                        shots, the outer ring about <strong>86%</strong>. Smaller means more consistent.</p>
                </div>
                <div class="error">
                    <div class="error-heading">
                        <span>Side-to-side error</span>
                        <span>± {{ sideErrorM.toFixed(2) }} m</span>
                    </div>
                    <input type="range" :value="sideErrorM" min="0.3" max="2" step="0.05"
                        aria-label="Side-to-side error" @input="emit('updateSideError', onRangeInput($event))" />
                </div>
                <div class="error">
                    <div class="error-heading">
                        <span>Depth error</span>
                        <span>± {{ depthErrorM.toFixed(2) }} m</span>
                    </div>
                    <input type="range" :value="depthErrorM" min="0.4" max="2.4" step="0.05" aria-label="Depth error"
                        @input="emit('updateDepthError', onRangeInput($event))" />
                </div>
                <div class="error">
                    <div class="error-heading">
                        <span>Ball speed</span>
                        <span>{{ ballSpeedMps.toFixed(1) }} m/s</span>
                    </div>
                    <input type="range" :value="ballSpeedMps" min="12" max="35" step="0.5" aria-label="Ball speed"
                        @input="emit('updateBallSpeed', onRangeInput($event))" />
                </div>
                <p v-if="modelLevel === 'detailed'" class="effective-shot">{{ effectiveShotLine }}</p>
                <p v-if="modelLevel !== 'detailed'" class="hint">Errors are one standard deviation of where your shots
                    land
                    around the point you aim at.
                    Ball speed is an illustrative average, including the bounce.</p>
            </div>
        </section>

        <section class="opponent-skill">
            <div class="content-wrapper">
                <h3>Opponent</h3>
                <SegmentedControl :options="opponentSkillLevels" :model-value="opponentSkill.level"
                    ariaLabel="Opponent skill" @update:model-value="emit('selectOpponentSkill', $event)" />
                <div class="error">
                    <div class="error-heading">
                        <span>Running speed</span>
                        <span>{{ runSpeedMps.toFixed(1) }} m/s</span>
                    </div>
                    <input type="range" :value="runSpeedMps" min="3" max="7" step="0.1" aria-label="Running speed"
                        @input="emit('updateRunSpeed', onRangeInput($event))" />
                </div>
                <div class="error">
                    <div class="error-heading">
                        <span>Consistency</span>
                        <span>{{ consistencyPercent }}%</span>
                    </div>
                    <input type="range" :value="consistencyPercent" min="50" max="99" step="1" aria-label="Consistency"
                        @input="emit('updateConsistency', onRangeInput($event) / 100)" />
                </div>
                <p class="hint">Running speed is how fast they cover the court. Consistency is how often they return a
                    ball they reach. Illustrative values, not fitted to real players.</p>
            </div>
        </section>

        <section class="simulation">
            <div class="content-wrapper">
                <h3>Simulation</h3>
                <div class="shot-count">
                    <div class="control-label">Shots per target</div>
                    <SegmentedControl :options="shotCountOptions" :model-value="shotCountId"
                        ariaLabel="Shots per target" @update:model-value="onSelectShotCount" />
                    <p class="hint">More shots give steadier percentages and take longer. Every candidate uses the same
                        draws.</p>
                </div>
                <div class="risk">
                    <div class="control-label">Risk preference</div>
                    <SegmentedControl :options="riskPreferences" :model-value="riskPreference"
                        ariaLabel="Risk preference" @update:model-value="emit('selectRiskPreference', $event)" />
                    <p class="hint">{{ riskDescription }}</p>
                </div>
            </div>
        </section>
    </div>
</template>

<style scoped lang="scss">
.left-sidebar {
    width: 27rem;
    flex: none;
    min-height: 0;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #2a3340 transparent;
    background-color: var(--layout-bg-color);
    border: 1px solid var(--layout-border-color);
    border-radius: var(--border-radius);
}

section {
    border-bottom: 1px solid var(--layout-border-color);

    .content-wrapper {
        padding: 1.6rem;

        h3 {
            color: var(--text-color-secondary);
            font-size: 1.1rem;
            font-weight: 600;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }

        p {
            color: var(--text-color-secondary);
            font-size: 1.3rem;
            font-weight: 400;
            line-height: 1.45;
        }

        .hint {
            font-size: 1.1rem;
        }
    }

    &.court-surface {
        .options {
            margin-bottom: 1.2rem;

            :deep(.option) {
                gap: 0.8rem;
            }

            .swatch {
                width: 1.2rem;
                height: 1.2rem;
                border-radius: 0.3rem;

                &.swatch-hard {
                    background: #4c8bf5;
                }

                &.swatch-clay {
                    background: #e08a4a;
                }

                &.swatch-grass {
                    background: #3cba5a;
                }
            }
        }
    }

    &.positions {
        .heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-radius: 1rem;

            .reset {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                border: 1px solid var(--layout-border-color);
                border-radius: 10px;
                background: transparent;
                color: inherit;
                font: inherit;
                cursor: pointer;

                span {
                    font-size: 1.2rem;
                    color: var(--text-color-primary);
                }
            }
        }

        .positions-list {
            display: flex;
            flex-direction: column;
            gap: 1.4rem;
            margin-top: 1.6rem;
            margin-bottom: 1.2rem;

            .position {
                display: flex;
                align-items: flex-start;
                gap: 0.8rem;

                .pos-dot {
                    width: 2rem;
                    height: 2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-top: 0.1rem;
                    border-radius: 50%;

                    .pos-dot-shadow {
                        width: 1.4rem;
                        height: 1.4rem;
                        border-radius: 50%;
                        background: rgba(0, 0, 0, 0.1);
                        display: flex;
                        align-items: center;
                        justify-content: center;

                        .pos-dot-white {
                            width: 1.4rem;
                            height: 1.4rem;
                            border-radius: 50%;
                            background: #fff;
                            display: flex;
                            align-items: center;
                            justify-content: center;

                            .pos-dot-inner {
                                width: 1.04rem;
                                height: 1.04rem;
                                box-sizing: border-box;
                                border-radius: 50%;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            }
                        }
                    }
                }

                .pos-info {
                    .pos-name {
                        color: var(--text-color-primary);
                        font-size: 1.2rem;
                        font-weight: 600;
                        line-height: 1.2;
                    }

                    .pos {
                        margin-top: 0.2rem;
                        color: var(--text-color-secondary);
                        font-size: 1.1rem;
                        line-height: 1.4;
                    }
                }

                &.you .pos-dot {
                    background: var(--player-marker-you-outline-color-opacity);

                    .pos-dot-shadow .pos-dot-white .pos-dot-inner {
                        background-color: var(--player-marker-you-outline-color);
                    }
                }

                &.opponent .pos-dot {
                    background: var(--player-marker-opponent-outline-color-opacity);

                    .pos-dot-shadow .pos-dot-white .pos-dot-inner {
                        background-color: var(--player-marker-opponent-outline-color);
                    }
                }
            }
        }
    }

    &.shot-accuracy,
    &.opponent-skill {
        .options :deep(.option) {
            width: calc(100% / 3 - 0.4rem);
            justify-content: center;
        }

        .spread {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            margin-top: 1.2rem;
            padding: 1.2rem;
            border: 1px solid var(--layout-border-color);
            border-radius: 1rem;
            background: #0d1116;

            .spread-mark {
                display: flex;
                align-items: center;
                gap: 0.4rem;
                flex: none;
                color: var(--text-color-secondary);

                svg {
                    width: 6.4rem;
                    height: 6.4rem;

                    line {
                        stroke: #3a4450;
                        stroke-width: 1;
                    }

                    ellipse {
                        fill: none;
                        stroke: var(--court-target-color);
                        stroke-width: 1.4;
                    }

                    ellipse:first-child {
                        stroke-dasharray: 3 2;
                    }

                    circle {
                        fill: var(--court-target-color);
                    }
                }
            }

            p {
                strong {
                    color: var(--text-color-primary);
                    font-weight: 600;
                }
            }
        }

        .error {
            margin-top: 1.4rem;

            .error-heading {
                display: flex;
                align-items: baseline;
                justify-content: space-between;
                gap: 0.8rem;
                margin-bottom: 0.8rem;

                span:first-child {
                    color: var(--text-color-primary);
                    font-size: 1.3rem;
                    font-weight: 600;
                }

                span:last-child {
                    color: var(--text-color-secondary);
                    font-size: 1.2rem;
                }
            }

            input[type='range'] {
                -webkit-appearance: none;
                appearance: none;
                width: 100%;
                height: 0.3rem;
                border-radius: 1rem;
                background: #2a3340;
                outline: none;

                &::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 1.4rem;
                    height: 1.4rem;
                    border-radius: 50%;
                    background: #fff;
                    cursor: pointer;
                }
            }
        }

        .hint {
            margin-top: 1.4rem;
        }
    }

    &.shot-accuracy {
        .control-label {
            margin-top: 1.4rem;
            color: var(--text-color-primary);
            font-size: 1.1rem;
            font-weight: 600;

            &.level {
                margin-top: 1.6rem;
            }
        }

        :deep(.option.is-selected) {
            font-weight: 700;
        }

        .effective-shot {
            margin-top: 1.4rem;
            color: var(--text-color-secondary);
            font-size: 1.2rem;
            line-height: 1.45;
        }
    }

    &.simulation {
        .control-label {
            margin-top: 1.4rem;
            color: var(--text-color-primary);
            font-size: 1.1rem;
            font-weight: 600;
        }

        .shot-count .options :deep(.option) {
            width: calc(100% / 4 - 0.4rem);
            justify-content: center;
        }

        .risk .options :deep(.option) {
            width: calc(100% / 3 - 0.4rem);
            justify-content: center;
        }

        .options {
            margin-top: 0.8rem;
        }

        .hint {
            margin-top: 1rem;
        }
    }
}
</style>
