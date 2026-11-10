import { describe, expect, it } from 'vitest'
import { ballStateAt, createBallPath } from '../ballPath'

const hitter = { x: 0, y: 0 }
const aim = { x: 20, y: 0 }
const bounce = { afterBounceSpeedMps: 10, playableWindowS: 0.4 }

describe('createBallPath', () => {
  const path = createBallPath(hitter, aim, 20, bounce)

  it('records flight time, after-bounce distance, and direction', () => {
    expect(path.flightTimeS).toBeCloseTo(1)
    expect(path.afterBounceDistanceM).toBeCloseTo(4)
    expect(path.direction.x).toBeCloseTo(1)
    expect(path.direction.y).toBeCloseTo(0)
  })

  it('throws when ballSpeedMps is 0', () => {
    expect(() => createBallPath(hitter, aim, 0, bounce)).toThrow(
      'createBallPath: ballSpeedMps must be greater than 0',
    )
  })
})

describe('ballStateAt', () => {
  const path = createBallPath(hitter, aim, 20, bounce)

  it('starts at the hitter', () => {
    const state = ballStateAt(path, 0)
    expect(state.position.x).toBeCloseTo(0)
    expect(state.position.y).toBeCloseTo(0)
    expect(state.heightM).toBeCloseTo(0)
    expect(state.phase).toBe('flight')
  })

  it('is a quarter of the way through the flight at t = 0.25', () => {
    const state = ballStateAt(path, 0.25)
    expect(state.position.x).toBeCloseTo(5)
    expect(state.position.y).toBeCloseTo(0)
    expect(state.heightM).toBeCloseTo(1.125)
    expect(state.phase).toBe('flight')
  })

  it('is at the flight peak at t = 0.5', () => {
    const state = ballStateAt(path, 0.5)
    expect(state.position.x).toBeCloseTo(10)
    expect(state.position.y).toBeCloseTo(0)
    expect(state.heightM).toBeCloseTo(1.5)
    expect(state.phase).toBe('flight')
  })

  it('is halfway through the bounce at t = 1.2', () => {
    const state = ballStateAt(path, 1.2)
    expect(state.position.x).toBeCloseTo(22)
    expect(state.position.y).toBeCloseTo(0)
    expect(state.heightM).toBeCloseTo(0.8)
    expect(state.phase).toBe('bounce')
  })

  it('is at the end of the bounce at t = 1.4', () => {
    const state = ballStateAt(path, 1.4)
    expect(state.position.x).toBeCloseTo(24)
    expect(state.position.y).toBeCloseTo(0)
    expect(state.heightM).toBeCloseTo(0)
    expect(state.phase).toBe('bounce')
  })

  it('stays at the end of the path once the window is over', () => {
    const state = ballStateAt(path, 2)
    expect(state.position.x).toBeCloseTo(24)
    expect(state.position.y).toBeCloseTo(0)
    expect(state.heightM).toBeCloseTo(0)
    expect(state.phase).toBe('done')
  })

  it('treats a negative time as t = 0', () => {
    const state = ballStateAt(path, -1)
    expect(state.position.x).toBeCloseTo(0)
    expect(state.position.y).toBeCloseTo(0)
    expect(state.heightM).toBeCloseTo(0)
    expect(state.phase).toBe('flight')
  })

  it('is done at the aim when the playable window is 0', () => {
    const noWindow = createBallPath(hitter, aim, 20, { afterBounceSpeedMps: 10, playableWindowS: 0 })
    const state = ballStateAt(noWindow, 1.2)
    expect(state.phase).toBe('done')
    expect(state.position.x).toBeCloseTo(20)
    expect(state.position.y).toBeCloseTo(0)
  })

  it('is at the midpoint of a diagonal shot at half the flight time', () => {
    const diagonal = createBallPath({ x: 2, y: 4 }, { x: 22, y: 14 }, 20, bounce)
    const state = ballStateAt(diagonal, diagonal.flightTimeS / 2)
    expect(state.position.x).toBeCloseTo(12)
    expect(state.position.y).toBeCloseTo(9)
  })
})
