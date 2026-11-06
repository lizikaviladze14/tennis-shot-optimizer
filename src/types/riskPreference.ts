export type RiskPreference = 'safer' | 'balanced' | 'aggressive'

// riskWeight is λ in value = P(win) − λ·P(miss). Illustrative values.
export const RISK_PRESETS: Record<RiskPreference, { label: string; riskWeight: number; description: string }> = {
    safer: {
        label: 'Safer',
        riskWeight: 1.0,
        description: 'Keeps the ball well inside the lines, even if the opponent gets more balls back',
    },
    balanced: {
        label: 'Balanced',
        riskWeight: 0.4,
        description: 'Gives up a little safety for a better chance to end the point',
    },
    aggressive: {
        label: 'Aggressive',
        riskWeight: 0,
        description: 'Goes for the point and accepts more missed shots',
    },
}
