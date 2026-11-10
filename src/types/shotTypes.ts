import { COURT_SURFACE_LENGTH_M, NET_X_M } from '@/math/courtGeometry'

export type ShotType = 'drive' | 'slice' | 'drop'

/**
 * How a shot type changes the player's level values, and where it can land.
 * The three factors are multipliers on the level's values (from "Your shot"),
 * so each level gets its own version of every shot type.
 * Example: Advanced side error 0.9 m × sideFactor 0.8 = 0.72 m for a drop shot.
 * All values are illustrative.
 */
export type ShotTypeProfile = {
  /** Name shown in the UI, e.g. "Drop shot". */
  label: string
  /** Multiplies the level's ball speed. Below 1 = slower, so the opponent gets more time. */
  speedFactor: number
  /** Multiplies the level's side-to-side error (σ). Below 1 = more accurate side to side. */
  sideFactor: number
  /** Multiplies the level's depth error (σ). Below 1 = more accurate in depth. */
  depthFactor: number
  /** Shortest landing this shot can reasonably make, in metres past the net. */
  minPastNetM: number
  /** Deepest landing this shot can reasonably make, in metres past the net. */
  maxPastNetM: number
  /** Multiplies the ball speed after the bounce. Below 1 = the ball slows down; a drop shot dies. */
  afterBounceSpeedFactor: number
  /** Fraction of the shot's speed used when aiming at minPastNetM.
      Grows linearly to 1 at maxPastNetM. A shorter target needs a slower ball
      to clear the net and come down in time. Illustrative. */
  minDepthSpeedFactor: number
}

/**
 * Illustrative profiles per shot type. In Detailed mode, the search only tries
 * targets between minPastNetM and maxPastNetM for the selected shot type.
 */
export const SHOT_TYPE_PROFILES: Record<ShotType, ShotTypeProfile> = {
  drive: {
    label: 'Drive',
    speedFactor: 1.0,
    sideFactor: 1.0,
    depthFactor: 1.0,
    minPastNetM: 4.5,
    maxPastNetM: COURT_SURFACE_LENGTH_M - NET_X_M,
    afterBounceSpeedFactor: 0.65,
    minDepthSpeedFactor: 0.6,
  },
  slice: {
    label: 'Slice',
    speedFactor: 0.75,
    sideFactor: 0.9,
    depthFactor: 1.1,
    minPastNetM: 3.0,
    maxPastNetM: COURT_SURFACE_LENGTH_M - NET_X_M,
    afterBounceSpeedFactor: 0.55,
    minDepthSpeedFactor: 0.75,
  },
  drop: {
    label: 'DropShot',
    speedFactor: 0.4,
    sideFactor: 0.8,
    depthFactor: 0.6,
    minPastNetM: 0.5,
    maxPastNetM: 5.0,
    afterBounceSpeedFactor: 0.3,
    minDepthSpeedFactor: 1.0,
  },
}
