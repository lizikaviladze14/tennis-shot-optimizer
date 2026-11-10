export const REACH_STEEPNESS = 3 // 1/m, illustrative: uncertain zone ≈ ±1 m around reach
export const GRID_CELLS = 27
/** z for a 95% two-sided normal interval (≈ 97.5th percentile). */
export const Z_95 = 1.96

/**
 * How long the opponent has to hit the ball after it bounces, before it
 * bounces a second time (seconds). Illustrative, not measured.
 *
 * Used by the bounce model in two ways:
 * - distance the ball travels after the bounce = after-bounce speed × window
 * - extra time the opponent gets to reach a point along that path:
 *   a point a fraction s of the way along is reached s × window after the bounce
 *
 * Pass a window of 0 to turn the bounce model off: the opponent must then
 * reach the landing point itself (Simple mode).
 */
export const PLAYABLE_WINDOW_S = 0.4

/** Chance of still winning the rally after a return that lands at the net. Illustrative. */
export const RETURN_VALUE_AT_NET = 0.2
/** Chance of still winning the rally after a return that lands at the baseline. Illustrative. */
export const RETURN_VALUE_AT_BASELINE = 0.5
