export type OpponentSkillLevel = 'club' | 'advanced' | 'pro'

export type OpponentSkill = {
  level: OpponentSkillLevel
  runSpeedMps: number
  // fraction from 0 to 1
  consistency: number
}

export const OPPONENT_SKILL_PRESETS: Record<
  OpponentSkillLevel,
  Pick<OpponentSkill, 'runSpeedMps' | 'consistency'>
> = {
    club: { runSpeedMps: 4, consistency: 0.8 },
    advanced: { runSpeedMps: 5, consistency: 0.88 },
    pro: { runSpeedMps: 6, consistency: 0.95 },
}
