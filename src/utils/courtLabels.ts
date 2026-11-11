import { CENTER_SERVICE_Y_M, COURT_SURFACE_LENGTH_M } from '@/math/courtGeometry'
import type { TargetZone } from '@/math/describeTarget'
import type { CourtPoint } from '@/math/point'

const LATERAL_LABEL: Record<TargetZone['lateral'], string> = {
  left: 'left channel',
  right: 'right channel',
  center: 'center',
}

/** UI wording for a target zone, e.g. "Short · right channel". */
export function zoneLabel(zone: TargetZone): string {
  const depth = `${zone.depth.charAt(0).toUpperCase()}${zone.depth.slice(1)}`
  return `${depth} · ${LATERAL_LABEL[zone.lateral]}`
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

/** UI wording for a player marker, using that player's own left and right. */
export function describePlayerPosition(who: 'you' | 'opponent', point: CourtPoint) {
  const metresInside = who === 'you' ? point.x : COURT_SURFACE_LENGTH_M - point.x
  // "right" always means the player's own right
  const metresRight = who === 'you' ? point.y - CENTER_SERVICE_Y_M : CENTER_SERVICE_Y_M - point.y
  return `${depthPhrase(metresInside)} · ${sidePhrase(metresRight)}`
}
