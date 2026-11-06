import { CENTER_SERVICE_Y_M, COURT_SURFACE_LENGTH_M } from "./courtGeometry";
import type { CourtPoint } from "./point";

export const DEFAULT_YOU: CourtPoint = {
    x: -0.4,
    y: CENTER_SERVICE_Y_M + 1.6,
}

export const DEFAULT_OPPONENT: CourtPoint = {
    x: COURT_SURFACE_LENGTH_M + 0.8,
    y: CENTER_SERVICE_Y_M - 1.8,
}

function roundTenth(value: number) {
    return Math.round(value * 10) / 10
}

function depthPhrase(metresInside: number) {
    const metres = roundTenth(metresInside)
    if (metres === 0) return 'on the baseline'
    if (metres > 0) return `${metres.toFixed(1)} m inside baseline`
    return `${Math.abs(metres).toFixed(1)} m behind baseline`
}

function sidePhrase(metresRight: number) {
    const metres = roundTenth(metresRight)
    if (metres === 0) return 'center'
    if (metres > 0) return `${metres.toFixed(1)} m right`
    return `${Math.abs(metres).toFixed(1)} m left`
}

export function describePlayerPosition(who: 'you' | 'opponent', point: CourtPoint) {
    const metresInside = who === 'you' ? point.x : COURT_SURFACE_LENGTH_M - point.x
    // "right" always means the player's own right
    const metresRight = who === 'you' ? point.y - CENTER_SERVICE_Y_M : CENTER_SERVICE_Y_M - point.y
    return `${depthPhrase(metresInside)} · ${sidePhrase(metresRight)}`
}