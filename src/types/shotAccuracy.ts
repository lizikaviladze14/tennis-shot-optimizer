export type ShotAccuracyLevel = 'club' | 'advanced' | 'pro'

export type ShotAccuracy = {
  level: ShotAccuracyLevel
  sideErrorM: number
  depthErrorM: number
  ballSpeedMps: number
}

export const SHOT_ACCURACY_PRESETS: Record<
  ShotAccuracyLevel,
  Pick<ShotAccuracy, 'sideErrorM' | 'depthErrorM' | 'ballSpeedMps'>
> = {
    club: { sideErrorM: 1.3, depthErrorM: 1.9, ballSpeedMps: 18 },
    advanced: { sideErrorM: 0.9, depthErrorM: 1.4, ballSpeedMps: 23 },
    pro: { sideErrorM: 0.6, depthErrorM: 0.95, ballSpeedMps: 28 },
}