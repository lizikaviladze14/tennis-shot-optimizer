import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RiskVsReward from '../RiskVsReward.vue'
import type { AimResult } from '@/math/optimizer'

function result(x: number, pIn: number, pWin: number, pRallyWin = pWin): AimResult {
  return { aim: { x, y: 4 }, outcome: { pIn, pWin, pRallyWin, pRallyWinSE: 0, pReturnGivenIn: null, winContributionVariance: 0 }, value: pWin }
}

const recommended = result(16, 0.99, 0.95)
const highestWin = result(17, 0.97, 0.96)
const target = result(19, 0.9, 0.7)

function mountChart(overrides: Record<string, unknown> = {}) {
  return mount(RiskVsReward, {
    props: {
      results: [recommended, highestWin, target],
      recommended,
      safest: recommended,
      highestWin,
      target: target.aim,
      targetOutcome: target.outcome,
      shownShot: 'recommended',
      ...overrides,
    },
  })
}

describe('RiskVsReward', () => {
  it('plots your target once, not also as a candidate dot', () => {
    const wrapper = mountChart()
    expect(wrapper.findAll('circle.dot')).toHaveLength(2)
    expect(wrapper.findAll('.mark.you')).toHaveLength(1)
  })

  it('combines labels when safest is the recommended aim', () => {
    const wrapper = mountChart({ highestWin: recommended })
    expect(wrapper.find('.callout.is-recommended').text()).toBe('Recommended · Max win · Safest')
  })

  it('keeps Max win on the recommended callout when it is the same aim', () => {
    expect(mountChart({ highestWin: recommended }).find('.callout.is-recommended').text()).toContain('Max win')
  })

  it('labels a separate max-win marker when it is a different aim', () => {
    const wrapper = mountChart()
    expect(wrapper.find('.callout.is-recommended').text()).toBe('Recommended · Safest')
    expect(wrapper.findAll('.callout.is-alt').map((node) => node.text())).toEqual(['Max win'])
  })

  it('labels your target', () => {
    expect(mountChart().find('.callout.is-you').text()).toBe('You')
  })

  it('emits the marker that was clicked', async () => {
    const wrapper = mountChart()
    await wrapper.find('.callout.is-recommended').trigger('click')
    await wrapper.find('.callout.is-you').trigger('click')
    await wrapper.find('.callout.is-alt').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['recommended'], ['target'], ['highestWin']])
  })

  it('has axis captions', () => {
    const text = mountChart().text()
    expect(text).toContain('Wins the point outright')
    expect(text).toContain('Chance of missing')
    expect(text).toContain('each dot = one target')
    expect(text).toContain('25%')
    expect(text).toContain('50%')
    expect(text).toContain('75%')
    expect(text).toContain('100%')
    expect(text).not.toContain('110%')
  })

  it('plots rally win on the vertical axis in detailed mode', () => {
    const rallyTarget = result(19, 0.9, 0.7, 0.2)
    const simple = mountChart().find('.mark.you rect').attributes('y')
    const detailed = mountChart({
      showRallyWin: true,
      target: rallyTarget.aim,
      targetOutcome: rallyTarget.outcome,
      results: [recommended, highestWin, rallyTarget],
    })
    expect(detailed.text()).toContain('Wins the rally ↑')
    expect(detailed.find('.mark.you rect').attributes('y')).not.toBe(simple)
  })

  it('draws an out-of-range target as a hollow marker', () => {
    const rect = mountChart({ targetOutOfRange: true }).find('.mark.you rect')
    expect(rect.attributes('fill')).toBe('none')
    expect(rect.attributes('stroke')).toBe('var(--court-target-color)')
  })

  it('offsets or drops a label that would cover another', () => {
    const same = { pIn: 0.5, pWin: 0.5 }
    const wrapper = mountChart({
      recommended: result(16, same.pIn, same.pWin),
      safest: result(18, 0.8, 0.2),
      highestWin: result(17, same.pIn, same.pWin),
      target: result(19, 0.2, 0.2).aim,
      targetOutcome: result(19, 0.2, 0.2).outcome,
      results: [result(16, same.pIn, same.pWin), result(17, same.pIn, same.pWin), result(18, 0.8, 0.2)],
    })
    const maxWin = wrapper.findAll('.callout.is-alt').find((node) => node.text() === 'Max win')
    if (maxWin) {
      expect(maxWin.attributes('style')).not.toBe(wrapper.find('.callout.is-recommended').attributes('style'))
    } else {
      expect(wrapper.findAll('.mark.alternative title').map((node) => node.text())).toContain('Max win')
    }
  })

  it('names your target on the shared marker when it is the recommended aim', () => {
    const wrapper = mountChart({ target: recommended.aim, targetOutcome: recommended.outcome })
    expect(wrapper.find('.mark.you').exists()).toBe(false)
    expect(wrapper.find('.callout.is-recommended').text()).toContain('You')
    expect(wrapper.findAll('.callout.is-you')).toHaveLength(0)
  })
})
