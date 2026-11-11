import { findBestAim } from '../math/optimizer'
import type { StandardDraw } from '../math/random'
import type { ShotScenario } from '../math/simulation'

type OptimizerRequest = {
  id: number
  scenario: ShotScenario
  draws: StandardDraw[]
  riskWeight: number
  cellCount: number
  pastNetRange?: { min: number; max: number }
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<OptimizerRequest>) => void) | null
  postMessage: (message: { id: number; result: ReturnType<typeof findBestAim> }) => void
}

scope.onmessage = (event: MessageEvent<OptimizerRequest>) => {
  const { id, scenario, draws, riskWeight, cellCount, pastNetRange } = event.data
  const result = findBestAim(scenario, draws, riskWeight, cellCount, pastNetRange)
  scope.postMessage({ id, result })
}
