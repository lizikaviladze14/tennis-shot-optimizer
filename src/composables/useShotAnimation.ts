// src/animation/useShotAnimation.ts
import { ref, onUnmounted } from 'vue'
import type { CourtPoint } from '@/math/point'
import { ballStateAt, type BallPath, type BallPhase, type BallState } from '@/animation/ballPath'

/** Real shots are too fast to follow; play them this many times slower. */
const SLOW_MOTION = 3
/** How long the ball stays visible at the end before disappearing. */
const HOLD_AFTER_DONE_MS = 600
/** With reduced motion there's no movement, so the end state stays visible longer. */
const REDUCED_MOTION_HOLD_MS = 2000

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Plays a BallPath in (slowed-down) real time and exposes the ball's current state. */
export function useShotAnimation() {
  const ballState = ref<BallState | null>(null)
  const isPlaying = ref(false)
  /** Elapsed model time ÷ the shot's duration, clamped to 0..1. 0 when stopped. */
  const progress = ref(0)
  /** Where the ball bounced in the current animation, for the bounce ring. */
  const bouncePoint = ref<CourtPoint | null>(null)

  let frameId: number | null = null
  let holdTimer: ReturnType<typeof setTimeout> | null = null

  function clearLater(delayMs: number) {
    holdTimer = setTimeout(() => {
      ballState.value = null
      bouncePoint.value = null
      holdTimer = null
    }, delayMs)
  }

  function stop() {
    if (frameId !== null) {
      cancelAnimationFrame(frameId)
      frameId = null
    }
    if (holdTimer !== null) {
      clearTimeout(holdTimer)
      holdTimer = null
    }
    ballState.value = null
    bouncePoint.value = null
    isPlaying.value = false
    progress.value = 0
  }

  function play(path: BallPath) {
    // a new shot replaces the old one. Without this, two frame loops
    // would run at once and fight over ballState.
    stop()

    if (prefersReducedMotion()) {
      // no movement: show where the ball ends up and where it bounced
      ballState.value = ballStateAt(path, Infinity)
      bouncePoint.value = path.aim
      progress.value = 1
      clearLater(REDUCED_MOTION_HOLD_MS)
      return
    }

    const startMs = performance.now()
    // remember the previous frame's phase to notice the moment it changes
    let previousPhase: BallPhase = 'flight'
    isPlaying.value = true

    function frame(nowMs: number) {
      // use the real elapsed time, not a frame count, so the shot takes the
      // same time on a 60 Hz and a 120 Hz screen, and survives dropped frames
      const elapsedS = (nowMs - startMs) / 1000 / SLOW_MOTION
      const state = ballStateAt(path, elapsedS)

      if (previousPhase === 'flight' && state.phase !== 'flight') {
        bouncePoint.value = path.aim
      }
      previousPhase = state.phase
      ballState.value = state
      const durationS = path.flightTimeS + path.playableWindowS
      progress.value =
        state.phase === 'done' || durationS <= 0
          ? 1
          : Math.min(1, Math.max(0, elapsedS / durationS))

      if (state.phase === 'done') {
        frameId = null
        isPlaying.value = false
        clearLater(HOLD_AFTER_DONE_MS)
        return
      }

      frameId = requestAnimationFrame(frame)
    }

    frameId = requestAnimationFrame(frame)
  }

  onUnmounted(stop)

  return { ballState, isPlaying, progress, bouncePoint, play, stop }
}
