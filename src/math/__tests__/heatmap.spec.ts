import { describe, expect, it } from 'vitest'
import { heatmapCells } from '../heatmap'
import { gridAims, type AimResult } from '../optimizer'
import { metresPastNet } from '../describeTarget'
import type { ShotOutcome } from '../simulation'

const outcome: ShotOutcome = { pIn: 1, pWin: 0.5, pRallyWin: 0.5, pRallyWinSE: 0, pReturnGivenIn: 0.5, winContributionVariance: 0 }

function result(aim: AimResult['aim'], value: number): AimResult {
  return { aim, outcome, value }
}

describe('heatmapCells', () => {
  it('centers each cell on its result aim', () => {
    const results = gridAims(27).map((aim, index) => result(aim, index))
    const cells = heatmapCells(results, 27)

    cells.forEach((cell, index) => {
      const aim = results[index]!.aim
      expect(cell.x + cell.width / 2).toBeCloseTo(aim.x)
      expect(cell.y + cell.height / 2).toBeCloseTo(aim.y)
    })
  })

  it('keeps filtered results on their own aims', () => {
    const full = gridAims(27)
    const results = full.filter((aim) => metresPastNet(aim) >= 4.5).map((aim, index) => result(aim, index))
    const cells = heatmapCells(results, 27)
    const firstGridAim = full[0]!

    expect(results[0]!.aim.x).not.toBeCloseTo(firstGridAim.x)
    cells.forEach((cell, index) => {
      const aim = results[index]!.aim
      expect(cell.x + cell.width / 2).toBeCloseTo(aim.x)
      expect(cell.y + cell.height / 2).toBeCloseTo(aim.y)
    })
    expect(cells[0]!.x + cells[0]!.width / 2).not.toBeCloseTo(firstGridAim.x)
  })

  it('ranks the highest value at 1 and the lowest at 0', () => {
    const aims = gridAims(3)
    const results = [result(aims[0]!, 2), result(aims[1]!, 10), result(aims[2]!, -1)]
    const cells = heatmapCells(results, 3)

    expect(cells[1]!.t).toBe(1)
    expect(cells[2]!.t).toBe(0)
  })

  it('uses 0.5 when every value is equal', () => {
    const aims = gridAims(3).slice(0, 2)
    const cells = heatmapCells([result(aims[0]!, 4), result(aims[1]!, 4)], 3)
    expect(cells.every((cell) => cell.t === 0.5)).toBe(true)
  })
})
