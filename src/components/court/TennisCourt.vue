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
    CENTER_MARK_LENGTH_M,
} from '@/math/courtGeometry'
import type { TennisCourtSurface } from '@/types/tennisCourt'
import { ref, computed, watch, onUnmounted } from 'vue'
import type { BallState } from '@/animation/ballPath'
import { isOnOpponentHalf, isPointInCourt } from '@/math/shotScore'
import { SHOT_ACCURACY_PRESETS, type ShotAccuracy } from '@/types/shotAccuracy'
import { DEFAULT_YOU, DEFAULT_OPPONENT } from '@/math/playerPosition'
import { distance, type CourtPoint } from '@/math/point'
import type { AimResult } from '@/math/optimizer'
import type { LandingKind } from '@/math/analytics'
import { GRID_CELLS } from '@/math/modelConstants'
import { heatmapCells as heatmapRectangles } from '@/math/heatmap'
import { courtToViewBox, viewBoxToCourt } from './courtView'
import { placeLabels } from '@/utils/labelPlacement'
import { metresPastNet, targetZone } from '@/math/describeTarget'

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
    recommendedAim?: CourtPoint
    recommendedShot?: { depthErrorM: number; sideErrorM: number }
    recommendedHitter?: CourtPoint
    isStale?: boolean
    shownShot?: 'target' | 'recommended' | 'alternative'
    alternativeAim?: CourtPoint
    alternativeLabel?: string
    aimResults?: AimResult[]
    simulatedLandings?: { point: CourtPoint; kind: LandingKind }[]
    vertical?: boolean
    ballState?: BallState | null
    bouncePoint?: CourtPoint | null
    isCalculating?: boolean
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
    showLandings: false,
    recommendedAim: undefined,
    recommendedShot: undefined,
    recommendedHitter: undefined,
    isStale: false,
    shownShot: 'target',
    alternativeAim: undefined,
    alternativeLabel: '',
    aimResults: undefined,
    simulatedLandings: () => [],
    vertical: false,
    ballState: null,
    bouncePoint: null,
    isCalculating: false,
})

const emit = defineEmits<{
    'update:you': [point: CourtPoint]
    'update:opponent': [point: CourtPoint]
    'update:target': [point: CourtPoint]
    dragStart: []
    dragEnd: []
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

const targetDiamondSize = 0.6
const targetDiamondRadius = 0.08
const targetDash = 0.2
const targetDashGap = 0.16
const shotDash = 0.28
const shotDashGap = 0.18
// Outer ring uses pathLength="100", so these are fractions of the circumference.
const outerDash = 1.4
const outerDashGap = 1.1

// recommended aim
const recommendedColor = 'var(--green)'
const recommendedRingRadius = 0.32
const recommendedDotRadius = 0.1

// alternative aim (safest or highest win), shown when picked in Compare alternatives
const alternativeColor = 'var(--text-color-primary)'

const RECOMMENDED_GLIDE_MS = 400

type RecommendedDisplay = {
    x: number
    y: number
    angle: number
    innerRx: number
    innerRy: number
    outerRx: number
    outerRy: number
}

const displayedRecommended = ref<RecommendedDisplay | null>(null)
let glideFrame: number | null = null

function prefersReducedMotion() {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
}

function easeOut(t: number) {
    return 1 - (1 - t) ** 3
}

function shortestAngle(from: number, to: number) {
    const delta = ((to - from + 180) % 360 + 360) % 360 - 180
    return from + delta
}

function dispersionRadii(depthErrorM: number, sideErrorM: number) {
    return {
        innerRx: depthErrorM,
        innerRy: sideErrorM,
        outerRx: depthErrorM * 2,
        outerRy: sideErrorM * 2,
    }
}

watch(
    () => {
        const aim = props.recommendedAim
        if (!aim) return null
        const shot = props.recommendedShot
        const depth = shot ? shot.depthErrorM : props.shotAccuracy.depthErrorM
        const side = shot ? shot.sideErrorM : props.shotAccuracy.sideErrorM
        const hitter = props.recommendedHitter ?? props.you
        const angle = Math.atan2(aim.y - hitter.y, aim.x - hitter.x) * (180 / Math.PI)
        return { x: aim.x, y: aim.y, angle, ...dispersionRadii(depth, side) }
    },
    (next) => {
        if (glideFrame !== null) {
            cancelAnimationFrame(glideFrame)
            glideFrame = null
        }
        if (!next) {
            displayedRecommended.value = null
            return
        }
        const from = displayedRecommended.value
        if (!from || prefersReducedMotion()) {
            displayedRecommended.value = { ...next }
            return
        }
        const origin = { ...from }
        const destination = { ...next, angle: shortestAngle(from.angle, next.angle) }
        const startMs = performance.now()
        displayedRecommended.value = origin
        function frame(now: number) {
            const t = Math.min(1, (now - startMs) / RECOMMENDED_GLIDE_MS)
            const eased = easeOut(t)
            const mix = (start: number, end: number) => start + (end - start) * eased
            displayedRecommended.value = {
                x: mix(origin.x, destination.x),
                y: mix(origin.y, destination.y),
                angle: mix(origin.angle, destination.angle),
                innerRx: mix(origin.innerRx, destination.innerRx),
                innerRy: mix(origin.innerRy, destination.innerRy),
                outerRx: mix(origin.outerRx, destination.outerRx),
                outerRy: mix(origin.outerRy, destination.outerRy),
            }
            if (t < 1) glideFrame = requestAnimationFrame(frame)
            else glideFrame = null
        }
        glideFrame = requestAnimationFrame(frame)
    },
    { immediate: true },
)

onUnmounted(() => {
    if (glideFrame !== null) cancelAnimationFrame(glideFrame)
})

const recommendedPoint = computed(() =>
    displayedRecommended.value
        ? { x: displayedRecommended.value.x, y: displayedRecommended.value.y }
        : (props.recommendedAim ?? null),
)

// the dispersion and trajectory follow the shown shot: recommended, alternative or your target
const shownShotDrawing = computed(() => {
    if (props.shownShot === 'recommended' && recommendedPoint.value) {
        return { aim: recommendedPoint.value, color: recommendedColor, fromCalculation: true }
    }
    if (props.shownShot === 'alternative' && props.alternativeAim) {
        return { aim: props.alternativeAim, color: alternativeColor, fromCalculation: true }
    }
    return { aim: props.target, color: 'var(--court-target-color)', fromCalculation: false }
})
const shotAim = computed(() => shownShotDrawing.value.aim)
const shotOrigin = computed(() =>
    shownShotDrawing.value.fromCalculation && props.recommendedHitter ? props.recommendedHitter : props.you,
)
const ellipseRadii = computed(() => {
    if (props.shownShot === 'recommended' && displayedRecommended.value) {
        const shown = displayedRecommended.value
        return {
            innerRx: shown.innerRx,
            innerRy: shown.innerRy,
            outerRx: shown.outerRx,
            outerRy: shown.outerRy,
        }
    }
    if (props.shownShot !== 'target' && props.recommendedShot) {
        return dispersionRadii(props.recommendedShot.depthErrorM, props.recommendedShot.sideErrorM)
    }
    return dispersionRadii(props.shotAccuracy.depthErrorM, props.shotAccuracy.sideErrorM)
})
const shotColor = computed(() => shownShotDrawing.value.color)
const shotOpacity = computed(() => (shownShotDrawing.value.fromCalculation && props.isStale ? 0.5 : 1))
const innerEllipseOpacity = computed(() =>
    props.isCalculating && props.shownShot === 'recommended' ? 0.6 : shotOpacity.value,
)
const recommendedOpacity = computed(() => (props.isCalculating ? 0.6 : props.isStale ? 0.5 : 1))
const flowingTrajectory = computed(() => props.isCalculating && props.shownShot === 'recommended')

const overlayOpacity = computed(() => (props.isStale ? 0.5 : 1))

const heatmapCells = computed(() => {
    const results = props.aimResults
    if (!results || results.length === 0) return []
    return heatmapRectangles(results, GRID_CELLS).map((cell) => ({
        ...cell,
        x: courtX + cell.x,
        y: courtY + cell.y,
    }))
})

function heatmapFill(t: number) {
    return `rgba(111, 208, 140, ${0.08 + t * 0.45})`
}

const landingColor: Record<LandingKind, string> = {
    in: '#e8edf0',
    long: '#e88980',
    wide: '#e88980',
    netShort: '#e88980',
}

const ballShadowRx = 0.14
const ballShadowRy = 0.09
const ballColor = 'var(--court-ball-color)'

const ballDraw = computed(() => {
    const state = props.ballState
    if (!state) return null
    // height lifts the ball toward the top of the screen: -y on the landscape
    // court, +x once the portrait court is rotated
    const lift = state.heightM * 0.5
    return {
        shadowX: courtX + state.position.x,
        shadowY: courtY + state.position.y,
        x: courtX + state.position.x + (props.vertical ? lift : 0),
        y: courtY + state.position.y - (props.vertical ? 0 : lift),
        radius: ballShadowRx * (1 + 0.12 * state.heightM),
    }
})

const bounceKey = ref(0)
watch(
    () => props.bouncePoint,
    (point) => {
        if (point) bounceKey.value += 1
    },
)

const shotAngle = computed(() => {
    if (props.shownShot === 'recommended' && displayedRecommended.value) return displayedRecommended.value.angle
    const dx = shotAim.value.x - shotOrigin.value.x
    const dy = shotAim.value.y - shotOrigin.value.y
    return Math.atan2(dy, dx) * (180 / Math.PI)
})

const svgRef = ref<SVGSVGElement | null>(null)

const viewBoxWidth = computed(() => (props.vertical ? WHOLE_COURT_WIDTH_M : WHOLE_COURT_LENGTH_M))
const viewBoxHeight = computed(() => (props.vertical ? WHOLE_COURT_LENGTH_M : WHOLE_COURT_WIDTH_M))
const courtTransform = computed(() =>
    props.vertical ? `translate(0 ${WHOLE_COURT_LENGTH_M}) rotate(-90)` : undefined,
)

function toView(point: CourtPoint) {
    return courtToViewBox(point, props.vertical)
}

function pointerToCourt(event: PointerEvent) {
    const svg = svgRef.value
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    const viewX = ((event.clientX - rect.left) / rect.width) * viewBoxWidth.value
    const viewY = ((event.clientY - rect.top) / rect.height) * viewBoxHeight.value
    return viewBoxToCourt(viewX, viewY, props.vertical)
}

const dragging = ref<'you' | 'opponent' | null>(null)

function startDrag(who: 'you' | 'opponent', event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()
    dragging.value = who
    svgRef.value?.setPointerCapture(event.pointerId)
    emit('dragStart')
}

const aimOnOpponentSide = ref(false)

function onPointerMove(event: PointerEvent) {
    const point = pointerToCourt(event)
    if (!point) return

    if (dragging.value) {
        event.preventDefault()
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
    if (dragging.value === null) return
    dragging.value = null
    emit('dragEnd')
}

function onPointerLeave() {
    if (!dragging.value) aim.value = null
}

// keyboard: arrow keys move a focused marker, Shift for bigger steps
const MARKER_KEY_STEP_M = 0.25
const MARKER_KEY_STEP_SHIFT_M = 1

const KEY_DIRECTIONS = computed<Record<string, CourtPoint>>(() =>
    props.vertical
        ? {
            ArrowLeft: { x: 0, y: -1 },
            ArrowRight: { x: 0, y: 1 },
            ArrowUp: { x: 1, y: 0 },
            ArrowDown: { x: -1, y: 0 },
        }
        : {
            ArrowLeft: { x: -1, y: 0 },
            ArrowRight: { x: 1, y: 0 },
            ArrowUp: { x: 0, y: -1 },
            ArrowDown: { x: 0, y: 1 },
        },
)

function nudge(who: 'you' | 'opponent', event: KeyboardEvent) {
    const direction = KEY_DIRECTIONS.value[event.key]
    if (!direction) return
    // otherwise the arrow keys also scroll the column
    event.preventDefault()
    const step = event.shiftKey ? MARKER_KEY_STEP_SHIFT_M : MARKER_KEY_STEP_M
    const current = who === 'you' ? props.you : props.opponent
    movePlayer(who, { x: current.x + direction.x * step, y: current.y + direction.y * step })
}

function nudgeTarget(event: KeyboardEvent) {
    const direction = KEY_DIRECTIONS.value[event.key]
    if (!direction) return
    event.preventDefault()
    const step = event.shiftKey ? MARKER_KEY_STEP_SHIFT_M : MARKER_KEY_STEP_M
    moveTarget({
        x: props.target.x + direction.x * step,
        y: props.target.y + direction.y * step,
    })
}

const markerKeyHint = 'Arrow keys move it 25 cm, Shift and arrow keys move it 1 m.'

const targetAriaLabel = computed(() => {
    const pastNet = metresPastNet(props.target).toFixed(1)
    const lateral = targetZone(props.target).lateral
    return `Your target, ${pastNet} m past the net, ${lateral}`
})

// hover tooltip: the nearest grid cell from the last calculation.
// The grid only covers the singles court, so there's no estimate outside it.
const hoverResult = computed(() => {
    const point = aim.value
    if (!point || !isPointInCourt(point) || dragging.value || !props.aimResults) return null
    let nearest: AimResult | null = null
    let nearestDistance = Infinity
    for (const result of props.aimResults) {
        const d = distance(result.aim, point)
        if (d < nearestDistance) {
            nearest = result
            nearestDistance = d
        }
    }
    return nearest
})

const tooltipStyle = computed(() => {
    const point = aim.value
    if (!point) return {}
    const view = toView(point)
    return {
        left: `${(view.x / viewBoxWidth.value) * 100}%`,
        top: `${(view.y / viewBoxHeight.value) * 100}%`,
    }
})

const tooltipFlipX = computed(() => {
    if (!aim.value) return false
    return toView(aim.value).x > viewBoxWidth.value * 0.75
})
const tooltipFlipY = computed(() => {
    if (!aim.value) return false
    return toView(aim.value).y > viewBoxHeight.value * 0.7
})

const courtLabels = computed(() => {
    const markers = []
    if (recommendedPoint.value) {
        const view = toView(recommendedPoint.value)
        markers.push({
            id: 'recommended',
            text: 'Recommended',
            markerX: view.x,
            markerY: view.y,
            markerRadius: recommendedRingRadius,
            kind: 'aim' as const,
        })
    }
    {
        const view = toView(props.target)
        markers.push({
            id: 'target',
            text: 'Your target',
            markerX: view.x,
            markerY: view.y,
            markerRadius: targetDiamondSize / Math.SQRT2,
            kind: 'aim' as const,
        })
    }
    if (props.shownShot === 'alternative' && props.alternativeAim) {
        const view = toView(props.alternativeAim)
        markers.push({
            id: 'alternative',
            text: props.alternativeLabel,
            markerX: view.x,
            markerY: view.y,
            markerRadius: recommendedRingRadius,
            kind: 'aim' as const,
        })
    }
    {
        const view = toView(props.you)
        markers.push({
            id: 'you',
            text: 'YOU',
            markerX: view.x,
            markerY: view.y,
            markerRadius: playerMarkerOutlineRadius,
            kind: 'hitter' as const,
        })
    }
    {
        const view = toView(props.opponent)
        markers.push({
            id: 'opponent',
            text: 'OPPONENT',
            markerX: view.x,
            markerY: view.y,
            markerRadius: playerMarkerOutlineRadius,
            kind: 'opponent' as const,
        })
    }
    return placeLabels(
        markers,
        { width: viewBoxWidth.value, height: viewBoxHeight.value },
        { vertical: props.vertical },
    )
})
const yourSideLabel = computed(() =>
    props.vertical
        ? { x: 0.8, y: WHOLE_COURT_LENGTH_M - 0.8, anchor: 'start' }
        : { x: 0.8, y: 0.8, anchor: 'start' },
)
const opponentSideLabel = computed(() =>
    props.vertical
        ? { x: 0.8, y: 0.8, anchor: 'start' }
        : { x: WHOLE_COURT_LENGTH_M - 0.8, y: 0.8, anchor: 'end' },
)

function percent(fraction: number) {
    return Math.round(fraction * 100)
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
    emit('update:target', clampTarget(point))
}

function clampTarget(point: CourtPoint) {
    const half = targetDiamondSize / Math.SQRT2
    const y = Math.min(
        COURT_SURFACE_WIDTH_M + RUNOFF_M - half,
        Math.max(-RUNOFF_M + half, point.y),
    )
    const x = Math.min(
        COURT_SURFACE_LENGTH_M + RUNOFF_M - half,
        Math.max(NET_X_M + half, point.x),
    )
    return { x, y }
}

function moveTarget(point: CourtPoint) {
    emit('update:target', clampTarget(point))
}

function movePlayer(who: 'you' | 'opponent', point: CourtPoint) {
    const next = clamp(who, point)
    if (who === 'you') emit('update:you', next)
    else emit('update:opponent', next)
}

</script>

<template>
    <div class="tennis-court">
        <svg :class="{ 'is-dragging': dragging !== null, 'is-aiming': aim !== null }" ref="svgRef"
            :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`" @pointermove="onPointerMove($event)" @pointerup="endDrag"
            @pointercancel="endDrag" @pointerleave="onPointerLeave">
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

            <g :transform="courtTransform">
                <!-- Green or colored margin around the court -->
                <rect @pointerdown="placeTarget($event)" :width="WHOLE_COURT_LENGTH_M" :height="WHOLE_COURT_WIDTH_M"
                    :fill="surface === 'grass' ? 'url(#grass-stripes)' : `var(--court-surround-${surface})`" />
                <!-- Doubles court surface and outer boundary -->
                <rect @pointerdown="placeTarget($event)" :x="courtX" :y="courtY" :width="COURT_SURFACE_LENGTH_M"
                    :height="COURT_SURFACE_WIDTH_M"
                    :fill="surface === 'grass' ? 'none' : `var(--court-surface-${surface})`" stroke="var(--court-line)"
                    :stroke-width="lineWidth" />
                <g v-if="showHeatmap" :opacity="overlayOpacity" pointer-events="none">
                    <rect v-for="(cell, index) in heatmapCells" :key="index" :x="cell.x" :y="cell.y" :width="cell.width"
                        :height="cell.height" :fill="heatmapFill(cell.t)" />
                </g>
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
                <line :x1="netX" :y1="netTop" :x2="netX" :y2="netBottom" stroke="var(--court-line)"
                    :stroke-width="lineWidth" />
                <g v-if="showLandings" :opacity="overlayOpacity" pointer-events="none">
                    <circle v-for="(landing, index) in simulatedLandings" :key="index" :cx="courtX + landing.point.x"
                        :cy="courtY + landing.point.y" r="0.12" :fill="landingColor[landing.kind]"
                        :opacity="landing.kind === 'in' ? 0.9 : 0.85" />
                </g>
                <g pointer-events="none">
                    <!-- Dispersion ellipse around the shown shot -->
                    <g v-if="showDispersion"
                        :transform="`rotate(${shotAngle} ${courtX + shotAim.x} ${courtY + shotAim.y})`">
                        <ellipse :cx="courtX + shotAim.x" :cy="courtY + shotAim.y" :rx="ellipseRadii.outerRx"
                            :ry="ellipseRadii.outerRy" :fill="shotColor" :opacity="0.12 * shotOpacity" />
                        <ellipse class="dispersion-ring" :class="{ 'is-flowing': flowingTrajectory }"
                            :pathLength="shownShot === 'recommended' ? 100 : undefined"
                            :style="shownShot === 'recommended' ? { '--dash-cycle': String(outerDash + outerDashGap), strokeDasharray: `${outerDash} ${outerDashGap}` } : undefined"
                            :cx="courtX + shotAim.x" :cy="courtY + shotAim.y" :rx="ellipseRadii.outerRx"
                            :ry="ellipseRadii.outerRy" fill="none" :stroke="shotColor" stroke-width="0.04"
                            :stroke-dasharray="shownShot === 'recommended' ? `${outerDash} ${outerDashGap}` : `${targetDash} ${targetDashGap}`"
                            :opacity="shotOpacity" />
                        <ellipse :cx="courtX + shotAim.x" :cy="courtY + shotAim.y" :rx="ellipseRadii.innerRx"
                            :ry="ellipseRadii.innerRy" fill="none" :stroke="shotColor" stroke-width="0.05"
                            :opacity="innerEllipseOpacity" />
                    </g>
                    <!-- Shot from you to the shown aim -->
                    <line v-if="showTrajectory" class="shot-line" :class="{ 'is-flowing': flowingTrajectory }"
                        :style="{ '--dash-cycle': String(shotDash + shotDashGap) }" :x1="courtX + shotOrigin.x"
                        :y1="courtY + shotOrigin.y" :x2="courtX + shotAim.x" :y2="courtY + shotAim.y" fill="none"
                        :stroke="shotColor" stroke-width="0.04" :stroke-dasharray="`${shotDash} ${shotDashGap}`"
                        :opacity="shotOpacity" />
                </g>

                <!-- Target marker -->
                <g class="target-marker" tabindex="0" role="button" aria-roledescription="movable marker"
                    :aria-label="targetAriaLabel" @keydown="nudgeTarget($event)">
                    <title>Your target</title>
                    <rect :x="courtX + target.x - targetDiamondSize / 2" :y="courtY + target.y - targetDiamondSize / 2"
                        :width="targetDiamondSize" :height="targetDiamondSize" :rx="targetDiamondRadius"
                        fill="var(--court-target-color)" stroke="#111" stroke-width="0.07" transform="rotate(45)"
                        :transform-origin="`${courtX + target.x} ${courtY + target.y}`" />
                </g>

                <!-- Recommended aim: ring with a dot -->
                <g v-if="recommendedPoint" :opacity="recommendedOpacity" pointer-events="none"
                    :transform="`translate(${courtX + recommendedPoint.x} ${courtY + recommendedPoint.y})`">
                    <title>Recommended</title>
                    <circle :r="recommendedRingRadius" fill="rgba(0, 0, 0, 0.35)" :stroke="recommendedColor"
                        stroke-width="0.08" />
                    <circle :r="recommendedDotRadius" :fill="recommendedColor" />
                </g>

                <!-- Alternative aim: white ring with a dot -->
                <g v-if="shownShot === 'alternative' && alternativeAim" :opacity="isStale ? 0.5 : 1"
                    pointer-events="none"
                    :transform="`translate(${courtX + alternativeAim.x} ${courtY + alternativeAim.y})`">
                    <title>{{ alternativeLabel }}</title>
                    <circle :r="recommendedRingRadius" fill="rgba(0, 0, 0, 0.35)" :stroke="alternativeColor"
                        stroke-width="0.08" />
                    <circle :r="recommendedDotRadius" :fill="alternativeColor" />
                </g>

                <!-- Ball: above the heatmap and landings, below the player markers -->
                <g v-if="ballDraw" pointer-events="none">
                    <ellipse :cx="ballDraw.shadowX" :cy="ballDraw.shadowY" :rx="ballShadowRx" :ry="ballShadowRy"
                        fill="#000" opacity="0.45" />
                    <circle :cx="ballDraw.x" :cy="ballDraw.y" :r="ballDraw.radius" :fill="ballColor" />
                </g>
                <circle v-if="bouncePoint" :key="bounceKey" class="bounce-ring" :cx="courtX + bouncePoint.x"
                    :cy="courtY + bouncePoint.y" r="0.1" fill="none" :stroke="ballColor" stroke-width="0.05"
                    pointer-events="none" />

                <!-- You: marker, then the label above it -->
                <g :class="{ 'player-marker': true, 'is-dragging': dragging === 'you' }" tabindex="0" role="button"
                    aria-roledescription="movable marker" :aria-label="`Your position. ${markerKeyHint}`"
                    @pointerdown="startDrag('you', $event)" @keydown="nudge('you', $event)">
                    <title>You</title>
                    <circle :cx="courtX + you.x" :cy="courtY + you.y"
                        :r="dragging === 'you' ? playerMarkerOutlineRadiusDragging : playerMarkerOutlineRadius"
                        fill="var(--player-marker-you-outline-color)" :opacity="playerMarkerOutlineOpacity" />
                    <circle :cx="courtX + you.x" :cy="courtY + you.y" :r="playerMarkerRadius"
                        fill="var(--player-marker-you-fill-color)" filter="url(#marker-shadow)" />
                    <circle :cx="courtX + you.x" :cy="courtY + you.y" :r="playerMarkerDotRadius"
                        fill="var(--player-marker-you-dot-color)" />
                </g>
                <!-- Opponent: marker, then the label above it -->
                <g :class="{ 'player-marker': true, 'is-dragging': dragging === 'opponent' }" tabindex="0" role="button"
                    aria-roledescription="movable marker" :aria-label="`Opponent position. ${markerKeyHint}`"
                    @pointerdown="startDrag('opponent', $event)" @keydown="nudge('opponent', $event)">
                    <title>Opponent</title>
                    <circle :cx="courtX + opponent.x" :cy="courtY + opponent.y"
                        :r="dragging === 'opponent' ? playerMarkerOutlineRadiusDragging : playerMarkerOutlineRadius"
                        fill="var(--player-marker-opponent-outline-color)" :opacity="playerMarkerOutlineOpacity" />
                    <circle :cx="courtX + opponent.x" :cy="courtY + opponent.y" :r="playerMarkerRadius"
                        fill="var(--player-marker-opponent-fill-color)" filter="url(#marker-shadow)" />
                    <circle :cx="courtX + opponent.x" :cy="courtY + opponent.y" :r="playerMarkerDotRadius"
                        fill="var(--player-marker-opponent-dot-color)" />
                </g>

                <!-- Aim -->
                <g v-if="aim" pointer-events="none">
                    <circle v-if="aimOnOpponentSide" :cx="courtX + aim.x" :cy="courtY + aim.y" r="0.2" fill="none"
                        stroke="#fff" stroke-width="0.03" />
                    <line :x1="courtX + aim.x - 0.28" :y1="courtY + aim.y" :x2="courtX + aim.x + 0.28"
                        :y2="courtY + aim.y" stroke="#fff" stroke-width="0.03" />
                    <line :x1="courtX + aim.x" :y1="courtY + aim.y - 0.28" :x2="courtX + aim.x"
                        :y2="courtY + aim.y + 0.28" stroke="#fff" stroke-width="0.03" />
                </g>
            </g>

            <text fill="var(--court-side-label-color)" class="side-label" :x="yourSideLabel.x" :y="yourSideLabel.y"
                :text-anchor="yourSideLabel.anchor" dominant-baseline="middle" font-size="0.38">YOUR SIDE</text>
            <text fill="var(--court-side-label-color)" class="side-label" :x="opponentSideLabel.x"
                :y="opponentSideLabel.y" :text-anchor="opponentSideLabel.anchor" dominant-baseline="middle"
                font-size="0.38">OPPONENT'S SIDE</text>

            <g v-if="courtLabels.you" :transform="`translate(${courtLabels.you.x} ${courtLabels.you.y})`"
                pointer-events="none">
                <rect x="0" y="0" :width="courtLabels.you.width" :height="courtLabels.you.height" rx="0.28"
                    fill="var(--player-marker-you-dot-color)" />
                <text :x="courtLabels.you.width / 2" :y="courtLabels.you.height / 2" font-family="Inter, sans-serif"
                    text-anchor="middle" dominant-baseline="central" font-size="0.3" font-weight="700"
                    fill="var(--text-color-tertiary)">YOU</text>
            </g>
            <g v-if="courtLabels.opponent"
                :transform="`translate(${courtLabels.opponent.x} ${courtLabels.opponent.y})`" pointer-events="none">
                <rect x="0" y="0" :width="courtLabels.opponent.width" :height="courtLabels.opponent.height" rx="0.28"
                    fill="var(--player-marker-opponent-dot-color)" />
                <text :x="courtLabels.opponent.width / 2" :y="courtLabels.opponent.height / 2"
                    font-family="Inter, sans-serif" text-anchor="middle" dominant-baseline="central" font-size="0.3"
                    font-weight="700" fill="var(--text-color-tertiary)">OPPONENT</text>
            </g>

            <g v-if="courtLabels.target" :transform="`translate(${courtLabels.target.x} ${courtLabels.target.y})`"
                pointer-events="none">
                <rect x="0" y="0" :width="courtLabels.target.width" :height="courtLabels.target.height" rx="0.12"
                    fill="#111" fill-opacity="0.8" />
                <text :x="courtLabels.target.width / 2" :y="courtLabels.target.height / 2"
                    font-family="Inter, sans-serif" text-anchor="middle" dominant-baseline="central" font-size="0.3"
                    font-weight="700" fill="var(--court-target-color)">Your target</text>
            </g>

            <g v-if="recommendedPoint && courtLabels.recommended" :opacity="isStale ? 0.5 : 1" pointer-events="none"
                :transform="`translate(${courtLabels.recommended.x} ${courtLabels.recommended.y})`">
                <rect x="0" y="0" :width="courtLabels.recommended.width" :height="courtLabels.recommended.height"
                    rx="0.28" :fill="recommendedColor" />
                <text :x="courtLabels.recommended.width / 2" :y="courtLabels.recommended.height / 2"
                    font-family="Inter, sans-serif" text-anchor="middle" dominant-baseline="central" font-size="0.3"
                    font-weight="700" fill="#0b1a10">Recommended</text>
            </g>

            <g v-if="courtLabels.alternative" :opacity="isStale ? 0.5 : 1" pointer-events="none"
                :transform="`translate(${courtLabels.alternative.x} ${courtLabels.alternative.y})`">
                <rect x="0" y="0" :width="courtLabels.alternative.width" :height="courtLabels.alternative.height"
                    rx="0.12" fill="#111" fill-opacity="0.8" />
                <text :x="courtLabels.alternative.width / 2" :y="courtLabels.alternative.height / 2"
                    font-family="Inter, sans-serif" text-anchor="middle" dominant-baseline="central" font-size="0.3"
                    font-weight="700" :fill="alternativeColor">{{ alternativeLabel }}</text>
            </g>
        </svg>

        <div v-if="hoverResult" class="hover-tooltip"
            :class="{ 'is-stale': isStale, 'flip-x': tooltipFlipX, 'flip-y': tooltipFlipY }" :style="tooltipStyle">
            <p class="tooltip-heading">Aim here · {{ isStale ? 'outdated estimate' : 'coarse estimate' }}</p>
            <p class="tooltip-line">Lands in {{ percent(hoverResult.outcome.pIn) }}%</p>
            <p class="tooltip-line is-win">Wins point {{ percent(hoverResult.outcome.pWin) }}%</p>
        </div>
    </div>
</template>

<style scoped lang="scss">
.tennis-court {
    position: relative;
}

.hover-tooltip {
    --tooltip-offset: 1.2rem;

    position: absolute;
    z-index: 1;
    transform: translate(var(--tooltip-offset), var(--tooltip-offset));
    padding: 1rem 1.4rem;
    border: 1px solid var(--layout-border-color);
    border-radius: 1rem;
    background: #0d1116;
    box-shadow: 0 0.8rem 2.4rem rgba(0, 0, 0, 0.45);
    white-space: nowrap;
    pointer-events: none;

    &.flip-x {
        transform: translate(calc(-100% - var(--tooltip-offset)), var(--tooltip-offset));
    }

    &.flip-y {
        transform: translate(var(--tooltip-offset), calc(-100% - var(--tooltip-offset)));
    }

    &.flip-x.flip-y {
        transform: translate(calc(-100% - var(--tooltip-offset)), calc(-100% - var(--tooltip-offset)));
    }

    &.is-stale {
        opacity: 0.6;
    }

    .tooltip-heading {
        margin-bottom: 0.6rem;
        color: var(--text-color-secondary);
        font-size: 1.2rem;
    }

    .tooltip-line {
        color: var(--text-color-primary);
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 1.3rem;
        line-height: 1.7;

        &.is-win {
            color: var(--green);
        }
    }
}

svg {
    width: 100%;
    height: auto;
    display: block;
    border-radius: var(--border-radius);
    touch-action: none;

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
        outline: none;
    }

    .player-marker:hover,
    .player-marker:focus-visible {
        transform: scale(1.12);
    }

    // the outer ring is translucent, so the focus stroke goes on the solid circle
    .player-marker:focus-visible circle:nth-of-type(2) {
        stroke: #fff;
        stroke-width: 0.06;
    }

    .target-marker {
        outline: none;
        cursor: grab;
    }

    .target-marker:focus-visible rect {
        stroke: #fff;
        stroke-width: 0.1;
    }

    .bounce-ring {
        opacity: 0.8;
        pointer-events: none;
        animation: bounce-ring 500ms ease-out forwards;
    }

    .shot-line.is-flowing,
    .dispersion-ring.is-flowing {
        animation: shot-dash-flow 0.8s linear infinite;
    }
}

@keyframes bounce-ring {
    from {
        r: 0.1;
        opacity: 0.8;
    }

    to {
        r: 0.6;
        opacity: 0;
    }
}

@keyframes shot-dash-flow {
    to {
        stroke-dashoffset: calc(var(--dash-cycle) * -1px);
    }
}

@media (prefers-reduced-motion: reduce) {
    svg .bounce-ring {
        animation: none;
        opacity: 0.6;
    }

    svg .shot-line.is-flowing,
    svg .dispersion-ring.is-flowing {
        animation: none;
    }
}
</style>