import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RiskVsReward from '../RiskVsReward.vue'
import type { AimResult } from '@/math/optimizer'

function result(x: number, pIn: number, pWin: number): AimResult {
  return { aim: { x, y: 4 }, outcome: { pIn, pWin, pReturnGivenIn: null, winContributionVariance: 0 }, value: pWin }
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
  it('plots one dot per candidate target', () => {
    expect(mountChart().findAll('circle.dot')).toHaveLength(3)
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
  })
})
