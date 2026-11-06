export type StandardDraw = { z1: number; z2: number }

/**
 * Box–Muller: turns two uniform numbers into two independent standard normal numbers.
 * u1 in [0, 1) picks the direction. u2 in (0, 1] picks the distance.
 * Throws if u2 <= 0, because ln(0) is -Infinity.
 */
export function standardNormalPair(u1: number, u2: number): StandardDraw {
  if (u2 <= 0) throw new Error('standardNormalPair: u2 must be greater than 0')

  const angle = 2 * Math.PI * u1
  const r = Math.sqrt(-2 * Math.log(u2))

  const z1 = r * Math.cos(angle)
  const z2 = r * Math.sin(angle)

  return { z1, z2 }
}

/**
 * Seeded pseudo-random generator. Same seed → same sequence.
 */
export function mulberry32(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Creates `count` standard normal swings using `rand` (Math.random by default).
 * Pass a seeded generator such as mulberry32 to get the same draws every time.
 * Shared by every aim, so comparisons between aims are fair.
 */
export function createDraws(count: number, rand: () => number = Math.random): StandardDraw[] {
  const draws: StandardDraw[] = []
  for (let i = 0; i < count; i++) {
    const u1 = rand()
    const u2 = 1 - rand()

    draws.push(standardNormalPair(u1, u2))
  }

  return draws
}
