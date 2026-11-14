import type { ModelLevel } from '@/types/modelLevel'
import type { OpponentSkill } from '@/types/opponentSkill'
import type { ShotAccuracy } from '@/types/shotAccuracy'
import { SHOT_TYPE_PROFILES, type ShotType } from '@/types/shotTypes'
import {
  PLAYABLE_WINDOW_S,
  REACH_STEEPNESS,
  RETURN_VALUE_AT_BASELINE,
  RETURN_VALUE_AT_NET,
} from '@/math/modelConstants'
import type { CourtPoint } from '@/math/point'
import { applyShotProfile } from '@/math/shotProfle'
import type { ShotScenario } from '@/math/simulation'

/** The illustrative model values. The app always uses the defaults; the
    sensitivity analysis overrides one at a time. */
export type ModelGuesses = {
  playableWindowS: number
  reachSteepness: number
  returnValueAtNet: number
  returnValueAtBaseline: number
  /** Speed fraction at the shot's shortest depth (the profile's minDepthSpeedFactor). */
  minDepthSpeedFactor: number
  /** After-bounce speed = ball speed × this. */
  afterBounceSpeedFactor: number
  /** Shortest depth the search tries, also the start of the depth-speed range (m past net). */
  minPastNetM: number
}

export function defaultModelGuesses(shotType: ShotType): ModelGuesses {
  const profile = SHOT_TYPE_PROFILES[shotType]
  return {
    playableWindowS: PLAYABLE_WINDOW_S,
    reachSteepness: REACH_STEEPNESS,
    returnValueAtNet: RETURN_VALUE_AT_NET,
    returnValueAtBaseline: RETURN_VALUE_AT_BASELINE,
    minDepthSpeedFactor: profile.minDepthSpeedFactor,
    afterBounceSpeedFactor: profile.afterBounceSpeedFactor,
    minPastNetM: profile.minPastNetM,
  }
}

export type ScenarioInputs = {
  modelLevel: ModelLevel
  shotType: ShotType
  /** The player's level values, before the shot type's profile is applied. */
  shot: ShotAccuracy
  opponentSkill: OpponentSkill
  hitter: CourtPoint
  opponent: CourtPoint
  /** Detailed only (except reachSteepness, used by both): overrides of the defaults. */
  model?: Partial<ModelGuesses>
}

export type BuiltScenario = {
  scenario: ShotScenario
  /** The depth range the search tries; undefined in Simple mode (whole court). */
  pastNetRange?: { min: number; max: number }
}

/**
 * The one place that turns the setup into a ShotScenario, used by the app,
 * the sensitivity script and the "Test assumptions" dialog so they can't disagree.
 * Doesn't copy the positions or the shot: pass plain values if the result
 * must be sent to a worker.
 */
export function buildScenario(inputs: ScenarioInputs): BuiltScenario {
  const guesses = { ...defaultModelGuesses(inputs.shotType), ...inputs.model }
  const base = {
    hitter: inputs.hitter,
    opponent: inputs.opponent,
    opponentSkill: inputs.opponentSkill,
    reachSteepness: guesses.reachSteepness,
  }

  if (inputs.modelLevel !== 'detailed') {
    return {
      scenario: {
        ...base,
        shot: inputs.shot,
        bounce: { afterBounceSpeedMps: inputs.shot.ballSpeedMps, playableWindowS: 0 },
        depthSpeed: { minPastNetM: 0, maxPastNetM: 1, minFactor: 1 },
        returnValue: { atNet: 0, atBaseline: 0 },
      },
    }
  }

  const profile = SHOT_TYPE_PROFILES[inputs.shotType]
  const shot = applyShotProfile(inputs.shot, profile)
  return {
    scenario: {
      ...base,
      shot,
      bounce: {
        afterBounceSpeedMps: shot.ballSpeedMps * guesses.afterBounceSpeedFactor,
        playableWindowS: guesses.playableWindowS,
      },
      depthSpeed: {
        minPastNetM: guesses.minPastNetM,
        maxPastNetM: profile.maxPastNetM,
        minFactor: guesses.minDepthSpeedFactor,
      },
      returnValue: { atNet: guesses.returnValueAtNet, atBaseline: guesses.returnValueAtBaseline },
    },
    pastNetRange: { min: guesses.minPastNetM, max: profile.maxPastNetM },
  }
}
