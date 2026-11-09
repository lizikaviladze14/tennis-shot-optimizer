<script setup lang="ts">
import {
    CENTER_SERVICE_Y_M,
    COURT_SURFACE_LENGTH_M,
    COURT_SURFACE_WIDTH_M,
    NET_X_M,
    SERVICE_LINE_FAR_X_M,
    SINGLES_LEFT_Y_M,
    SINGLES_RIGHT_Y_M,
} from '@/math/courtGeometry'

/**
 * Opponent's half in court metres (net → far baseline, doubles sideline → sideline),
 * plus a strip of runoff behind the baseline for the opponent marker.
 * Slot content uses the same coordinates as CourtPoint: no runoff offset.
 * Default slot is behind the lines (heatmap cells).
 * #overlay is in front (landings, markers).
 */
const pad = 0.4
const farPad = 1.5
const halfLength = COURT_SURFACE_LENGTH_M - NET_X_M
const viewX = NET_X_M - pad
const viewY = -pad
const viewW = halfLength + pad + farPad
const viewH = COURT_SURFACE_WIDTH_M + pad * 2
const viewBox = `${viewX} ${viewY} ${viewW} ${viewH}`
const lineWidth = 0.07
</script>

<template>
    <svg class="opponent-half-court" :viewBox="viewBox" role="img" aria-hidden="true">
        <rect :x="viewX" :y="viewY" :width="viewW" :height="viewH" fill="#121c22" />
        <rect :x="NET_X_M" y="0" :width="halfLength" :height="COURT_SURFACE_WIDTH_M" fill="#151b24" />
        <slot />
        <g class="lines" fill="none" stroke="rgba(232, 237, 240, 0.38)" :stroke-width="lineWidth" pointer-events="none">
            <!-- Net, full chart height -->
            <line :x1="NET_X_M" :y1="viewY" :x2="NET_X_M" :y2="viewY + viewH" stroke="var(--white)" />
            <!-- Doubles sidelines and far baseline -->
            <line :x1="NET_X_M" y1="0" :x2="COURT_SURFACE_LENGTH_M" y2="0" />
            <line :x1="NET_X_M" :y1="COURT_SURFACE_WIDTH_M" :x2="COURT_SURFACE_LENGTH_M" :y2="COURT_SURFACE_WIDTH_M" />
            <line :x1="COURT_SURFACE_LENGTH_M" y1="0" :x2="COURT_SURFACE_LENGTH_M" :y2="COURT_SURFACE_WIDTH_M" />
            <line :x1="NET_X_M" :y1="SINGLES_LEFT_Y_M" :x2="COURT_SURFACE_LENGTH_M" :y2="SINGLES_LEFT_Y_M" />
            <line :x1="NET_X_M" :y1="SINGLES_RIGHT_Y_M" :x2="COURT_SURFACE_LENGTH_M" :y2="SINGLES_RIGHT_Y_M" />
            <line :x1="SERVICE_LINE_FAR_X_M" :y1="SINGLES_LEFT_Y_M" :x2="SERVICE_LINE_FAR_X_M"
                :y2="SINGLES_RIGHT_Y_M" />
            <line :x1="NET_X_M" :y1="CENTER_SERVICE_Y_M" :x2="SERVICE_LINE_FAR_X_M" :y2="CENTER_SERVICE_Y_M" />
        </g>
        <slot name="overlay" />
    </svg>
</template>

<style scoped lang="scss">
.opponent-half-court {
    width: 100%;
    height: auto;
    display: block;
    overflow: visible;
}
</style>
