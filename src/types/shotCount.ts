export const SHOT_COUNT_OPTIONS = [
    { id: '250', label: '250', count: 250 },
    { id: '500', label: '500', count: 500 },
    { id: '1000', label: '1k', count: 1000 },
    { id: '2000', label: '2k', count: 2000 },
] as const

export type ShotCountId = (typeof SHOT_COUNT_OPTIONS)[number]['id']
export type ShotCount = (typeof SHOT_COUNT_OPTIONS)[number]['count']

export const DEFAULT_SHOT_COUNT: ShotCount = 500
