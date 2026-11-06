<script setup lang="ts">
import {
    COURT_SURFACE_LENGTH_M,
    COURT_SURFACE_WIDTH_M,
    NET_X_M,
    NET_POST_OVERHANG_M,
    RUNOFF_M,
    WHOLE_COURT_LENGTH_M,
    WHOLE_COURT_WIDTH_M,
    SINGLES_ALLEY_M,
    SERVICE_LINE_NEAR_X_M,
    SERVICE_LINE_FAR_X_M,
    CENTER_SERVICE_Y_M,
    COURT_SURFACE_SINGLES_WIDTH_M,
    CENTER_MARK_LENGTH_M
} from '@/math/courtGeometry'
import type { TennisCourtSurface } from '@/types/tennisCourt'
import { ref, computed } from 'vue'
import { isOnOpponentHalf } from '@/math/shotScore'
import { SHOT_ACCURACY_PRESETS, type ShotAccuracy } from '@/types/shotAccuracy'
import { DEFAULT_YOU, DEFAULT_OPPONENT } from '@/math/playerPosition'
import type { CourtPoint } from '@/math/point'

interface Props {
    surface?: TennisCourtSurface
    shotAccuracy?: ShotAccuracy
    you?: CourtPoint
    opponent?: CourtPoint
    target?: CourtPoint
    showDispersion?: boolean
    showTrajectory?: boolean
    showHeatmap?: boolean
    showLandings?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    surface: 'hard',
    shotAccuracy: () => ({
        level: 'advanced',
        ...SHOT_ACCURACY_PRESETS.advanced,
    }),
    you: () => ({ ...DEFAULT_YOU }),
    opponent: () => ({ ...DEFAULT_OPPONENT }),
    target: () => ({ x: 18, y: CENTER_SERVICE_Y_M }),
    showDispersion: true,
    showTrajectory: true,
    showHeatmap: false,
    showLandings: false
})

const emit = defineEmits<{
    'update:you': [point: CourtPoint]
    'update:opponent': [point: CourtPoint]
    'update:target': [point: CourtPoint]
}>()

const aim = ref<CourtPoint | null>(null)

const courtX = RUNOFF_M
const courtY = RUNOFF_M
const courtRight = courtX + COURT_SURFACE_LENGTH_M

const singlesTop = courtY + SINGLES_ALLEY_M
const singlesBottom = singlesTop + COURT_SURFACE_SINGLES_WIDTH_M

const netX = courtX + NET_X_M
const netTop = courtY - NET_POST_OVERHANG_M
const netBottom = courtY + COURT_SURFACE_WIDTH_M + NET_POST_OVERHANG_M

const serviceNearX = courtX + SERVICE_LINE_NEAR_X_M
const serviceFarX = courtX + SERVICE_LINE_FAR_X_M
const centerY = courtY + CENTER_SERVICE_Y_M

const lineWidth = 0.05
const netPostRadius = 0.08
const netShadeWidth = 0.3

// player markers
const playerMarkerOutlineRadius = 0.5
const playerMarkerOutlineRadiusDragging = 0.6
const playerMarkerRadius = 0.35
const playerMarkerDotRadius = 0.26
const playerMarkerOutlineOpacity = 0.28
const playerMarkerLabelGap = 0.25

// target
const targetInnerRx = computed(() => props.shotAccuracy.depthErrorM)
const targetInnerRy = computed(() => props.shotAccuracy.sideErrorM)
const targetOuterRx = computed(() => props.shotAccuracy.depthErrorM * 2)
const targetOuterRy = computed(() => props.shotAccuracy.sideErrorM * 2)

const targetDiamondSize = 0.6
const targetDiamondRadius = 0.08
const targetDash = 0.2
const targetDashGap = 0.16
const shotDash = 0.28
const shotDashGap = 0.18

const targetAngle = computed(() => {
    const dx = props.target.x - props.you.x
    const dy = props.target.y - props.you.y
    return Math.atan2(dy, dx) * (180 / Math.PI)
})

const svgRef = ref<SVGSVGElement | null>(null)

function pointerToCourt(event: PointerEvent) {
    const svg = svgRef.value
    if (!svg) return null
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const screen = svg.getScreenCTM()
    if (!screen) return null
    const svgPoint = point.matrixTransform(screen.inverse())
    return { x: svgPoint.x - courtX, y: svgPoint.y - courtY }
}

const dragging = ref<'you' | 'opponent' | null>(null)

function startDrag(who: 'you' | 'opponent', event: PointerEvent) {
    dragging.value = who
    svgRef.value?.setPointerCapture(event.pointerId)
}

const aimOnOpponentSide = ref(false)

function onPointerMove(event: PointerEvent) {
    const point = pointerToCourt(event)
    if (!point) return

    if (dragging.value) {
        movePlayer(dragging.value, point)
        aim.value = null
        return
    }

    const overMarker =
        event.target instanceof Element &&
        event.target.closest('.player-marker')

    if (overMarker) {
        aim.value = null
        return
    }

    aim.value = point
    aimOnOpponentSide.value = isOnOpponentHalf(point)
}

function endDrag() {
    dragging.value = null
}

function clamp(who: 'you' | 'opponent', point: CourtPoint) {
    const y = Math.min(COURT_SURFACE_WIDTH_M + RUNOFF_M - playerMarkerOutlineRadius, Math.max(-RUNOFF_M + playerMarkerOutlineRadius, point.y))
    const x = who === 'you'
        ? Math.min(NET_X_M - playerMarkerOutlineRadius, Math.max(-RUNOFF_M + playerMarkerOutlineRadius, point.x))
        : Math.min(COURT_SURFACE_LENGTH_M + RUNOFF_M - playerMarkerOutlineRadius, Math.max(NET_X_M + playerMarkerOutlineRadius, point.x))
    return { x, y }
}

function placeTarget(event: PointerEvent) {
    const point = pointerToCourt(event)
    if (!point) return
    if (!isOnOpponentHalf(point)) return
    emit('update:target', { x: point.x, y: point.y })
}

function movePlayer(who: 'you' | 'opponent', point: CourtPoint) {
    const next = clamp(who, point)
    if (who === 'you') emit('update:you', next)
    else emit('update:opponent', next)
}

</script>

<template>
    <svg :class="{ 'is-dragging': dragging !== null, 'is-aiming': aim !== null }" ref="svgRef"
        :viewBox="`0 0 ${WHOLE_COURT_LENGTH_M} ${WHOLE_COURT_WIDTH_M}`" @pointermove="onPointerMove($event)"
        @pointerup="endDrag">
        <defs>
            <pattern id="grass-stripes" patternUnits="userSpaceOnUse" width="3" height="1">
                <rect width="1.5" height="1" fill="var(--court-grass-stripe-1)" />
                <rect x="1.5" width="1.5" height="1" fill="var(--court-grass-stripe-2)" />
            </pattern>
            <linearGradient id="net-shade" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#000" stop-opacity="0.28" />
                <stop offset="1" stop-color="#000" stop-opacity="0" />
            </linearGradient>
            <filter id="marker-shadow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="0.03" stdDeviation="0.04" flood-color="#000" flood-opacity="0.35" />
            </filter>
        </defs>

        <!-- Green or colored margin around the court -->
        <rect @pointerdown="placeTarget($event)" :width="WHOLE_COURT_LENGTH_M" :height="WHOLE_COURT_WIDTH_M"
            :fill="surface === 'grass' ? 'url(#grass-stripes)' : `var(--court-surround-${surface})`" />
        <!-- Doubles court surface and outer boundary -->
        <rect @pointerdown="placeTarget($event)" :x="courtX" :y="courtY" :width="COURT_SURFACE_LENGTH_M"
            :height="COURT_SURFACE_WIDTH_M" :fill="surface === 'grass' ? 'none' : `var(--court-surface-${surface})`"
            stroke="var(--court-line)" :stroke-width="lineWidth" />
        <!-- Net shadow, on the opponent's side of the net -->
        <rect :x="netX + lineWidth / 2" :y="courtY" :width="netShadeWidth" :height="COURT_SURFACE_WIDTH_M"
            fill="url(#net-shade)" />
        <g stroke="var(--court-line)" :stroke-width="lineWidth" pointer-events="none">
            <!-- Singles sidelines -->
            <line :x1="courtX" :y1="singlesTop" :x2="courtRight" :y2="singlesTop" />
            <line :x1="courtX" :y1="singlesBottom" :x2="courtRight" :y2="singlesBottom" />
            <!-- Service lines -->
            <line :x1="serviceNearX" :y1="singlesTop" :x2="serviceNearX" :y2="singlesBottom" />
            <line :x1="serviceFarX" :y1="singlesTop" :x2="serviceFarX" :y2="singlesBottom" />
            <!-- Center service line -->
            <line :x1="serviceNearX" :y1="centerY" :x2="serviceFarX" :y2="centerY" />
            <!-- Center marks on the baselines -->
            <line :x1="courtX" :y1="centerY" :x2="courtX + CENTER_MARK_LENGTH_M" :y2="centerY" />
            <line :x1="courtRight - CENTER_MARK_LENGTH_M" :y1="centerY" :x2="courtRight" :y2="centerY" />
        </g>
        <!-- Net and posts -->
        <circle :cx="netX" :cy="netTop" :r="netPostRadius" fill="var(--court-line)" />
        <circle :cx="netX" :cy="netBottom" :r="netPostRadius" fill="var(--court-line)" />
        <line :x1="netX" :y1="netTop" :x2="netX" :y2="netBottom" stroke="var(--court-line)" :stroke-width="lineWidth" />
        <!-- Side names in the top margin -->
        <text fill="var(--court-side-label-color)" class="side-label" x="0.8" y="0.8" text-anchor="start"
            dominant-baseline="middle" font-size="0.38">YOUR
            SIDE</text>
        <text fill="var(--court-side-label-color)" class="side-label" :x="courtRight + RUNOFF_M - 0.8" y="0.8"
            text-anchor="end" dominant-baseline="middle" font-size="0.38">OPPONENT'S SIDE</text>
        <!-- Target marker ellipse -->
        <g v-if="showDispersion" :transform="`rotate(${targetAngle} ${courtX + target.x} ${courtY + target.y})`"
            pointer-events="none">
            <ellipse :cx="courtX + target.x" :cy="courtY + target.y" :rx="targetOuterRx" :ry="targetOuterRy"
                fill="var(--court-target-color)" opacity="0.12" />
            <ellipse :cx="courtX + target.x" :cy="courtY + target.y" :rx="targetOuterRx" :ry="targetOuterRy" fill="none"
                stroke="var(--court-target-color)" stroke-width="0.04"
                :stroke-dasharray="`${targetDash} ${targetDashGap}`" />
            <ellipse :cx="courtX + target.x" :cy="courtY + target.y" :rx="targetInnerRx" :ry="targetInnerRy" fill="none"
                stroke="var(--court-target-color)" stroke-width="0.05" />
        </g>
        <!-- Shot from you to the target -->
        <line v-if="showTrajectory" :x1="courtX + you.x" :y1="courtY + you.y" :x2="courtX + target.x"
            :y2="courtY + target.y" fill="none" stroke="var(--court-target-color)" stroke-width="0.04"
            :stroke-dasharray="`${shotDash} ${shotDashGap}`" />

        <!-- Target marker -->
        <rect :x="courtX + target.x - targetDiamondSize / 2" :y="courtY + target.y - targetDiamondSize / 2"
            :width="targetDiamondSize" :height="targetDiamondSize" :rx="targetDiamondRadius"
            fill="var(--court-target-color)" stroke="#111" stroke-width="0.07" transform="rotate(45)"
            :transform-origin="`${courtX + target.x} ${courtY + target.y}`" pointer-events="none" />

        <!-- Target label -->
        <g :transform="`translate(${courtX + target.x + targetDiamondSize / Math.SQRT2 + playerMarkerLabelGap} ${courtY + target.y})`"
            pointer-events="none">
            <rect x="0" y="-0.28" width="2.6" height="0.56" rx="0.12" fill="#111" fill-opacity="0.8" />
            <text x="1.3" font-family="Inter, sans-serif" text-anchor="middle" dominant-baseline="central"
                font-size="0.3" font-weight="700" fill="var(--court-target-color)">Your target</text>
        </g>

        <!-- You: marker, then the label above it -->
        <g :class="{ 'player-marker': true, 'is-dragging': dragging === 'you' }"
            @pointerdown="startDrag('you', $event)">
            <circle :cx="courtX + you.x" :cy="courtY + you.y"
                :r="dragging === 'you' ? playerMarkerOutlineRadiusDragging : playerMarkerOutlineRadius"
                fill="var(--player-marker-you-outline-color)" :opacity="playerMarkerOutlineOpacity" />
            <circle :cx="courtX + you.x" :cy="courtY + you.y" :r="playerMarkerRadius"
                fill="var(--player-marker-you-fill-color)" filter="url(#marker-shadow)" />
            <circle :cx="courtX + you.x" :cy="courtY + you.y" :r="playerMarkerDotRadius"
                fill="var(--player-marker-you-dot-color)" />
        </g>
        <g
            :transform="`translate(${courtX + you.x} ${courtY + you.y - playerMarkerOutlineRadiusDragging - playerMarkerLabelGap})`">
            <rect x="-0.7" y="-0.28" width="1.4" height="0.56" rx="0.28" fill="var(--player-marker-you-dot-color)" />
            <text font-family="Inter, sans-serif" text-anchor="middle" dominant-baseline="central" font-size="0.3"
                font-weight="700" fill="var(--text-color-tertiary)">YOU</text>
        </g>
        <!-- Opponent: marker, then the label above it -->
        <g :class="{ 'player-marker': true, 'is-dragging': dragging === 'opponent' }"
            @pointerdown="startDrag('opponent', $event)">
            <circle :cx="courtX + opponent.x" :cy="courtY + opponent.y"
                :r="dragging === 'opponent' ? playerMarkerOutlineRadiusDragging : playerMarkerOutlineRadius"
                fill="var(--player-marker-opponent-outline-color)" :opacity="playerMarkerOutlineOpacity" />
            <circle :cx="courtX + opponent.x" :cy="courtY + opponent.y" :r="playerMarkerRadius"
                fill="var(--player-marker-opponent-fill-color)" filter="url(#marker-shadow)" />
            <circle :cx="courtX + opponent.x" :cy="courtY + opponent.y" :r="playerMarkerDotRadius"
                fill="var(--player-marker-opponent-dot-color)" />
        </g>
        <g
            :transform="`translate(${courtX + opponent.x} ${courtY + opponent.y - playerMarkerOutlineRadiusDragging - playerMarkerLabelGap})`">
            <rect x="-1.3" y="-0.28" width="2.6" height="0.56" rx="0.28"
                fill="var(--player-marker-opponent-dot-color)" />
            <text font-family="Inter, sans-serif" text-anchor="middle" dominant-baseline="central" font-size="0.3"
                font-weight="700" fill="var(--text-color-tertiary)">OPPONENT</text>
        </g>

        <!-- Aim -->
        <g v-if="aim" pointer-events="none">
            <circle v-if="aimOnOpponentSide" :cx="courtX + aim.x" :cy="courtY + aim.y" r="0.2" fill="none" stroke="#fff"
                stroke-width="0.03" />
            <line :x1="courtX + aim.x - 0.28" :y1="courtY + aim.y" :x2="courtX + aim.x + 0.28" :y2="courtY + aim.y"
                stroke="#fff" stroke-width="0.03" />
            <line :x1="courtX + aim.x" :y1="courtY + aim.y - 0.28" :x2="courtX + aim.x" :y2="courtY + aim.y + 0.28"
                stroke="#fff" stroke-width="0.03" />
        </g>
    </svg>
</template>

<style scoped lang="scss">
svg {
    width: 100%;
    height: auto;
    display: block;
    border-radius: var(--border-radius);

    &.is-aiming {
        cursor: none;
    }

    &.is-dragging {
        cursor: grabbing;
    }

    &.is-dragging .player-marker.is-dragging {
        cursor: grabbing;
        transform: scale(1.12);
    }

    .player-marker {
        cursor: grab;
        transform-box: fill-box;
        transform-origin: center;
        transition: transform 0.12s ease;
    }

    .player-marker:hover {
        transform: scale(1.12);
    }
}
</style>