import {
  createSensitivityDraws,
  runSensitivity,
  sensitivityParameters,
  type SensitivityResult,
  type SensitivitySetup,
} from '../analysis/sensitivity'

/** Plain data only: primitives and { x, y } points. */
export type SensitivityRequest = { id: number; setup: SensitivitySetup }

export type SensitivityResponse =
  | { id: number; type: 'progress'; done: number; total: number }
  | { id: number; type: 'result'; result: SensitivityResult }
  | { id: number; type: 'error'; message: string }

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<SensitivityRequest>) => void) | null
  postMessage: (message: SensitivityResponse) => void
}

scope.onmessage = (event: MessageEvent<SensitivityRequest>) => {
  const { id, setup } = event.data
  try {
    // built here: the parameters hold functions, which can't be sent to a worker
    const draws = createSensitivityDraws(setup)
    const parameters = sensitivityParameters(setup)
    const result = runSensitivity(
      setup,
      draws,
      (done, total) => scope.postMessage({ id, type: 'progress', done, total }),
      parameters,
    )
    scope.postMessage({ id, type: 'result', result })
  } catch (error) {
    scope.postMessage({ id, type: 'error', message: error instanceof Error ? error.message : String(error) })
  }
}
