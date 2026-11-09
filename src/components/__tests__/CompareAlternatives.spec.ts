import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CompareAlternatives from '../CompareAlternatives.vue'
import type { AimResult } from '@/math/optimizer'
import type { ShownShot } from '@/types/shownShot'

function result(x: number, pIn: number, pWin: number): AimResult {
  return { aim: { x, y: 4 }, outcome: { pIn, pWin, pReturnGivenIn: null, winContributionVariance: 0 }, value: pWin }
}

const recommended = result(16, 0.99, 0.95)
const highestWin = result(17, 0.97, 0.96)
const target = result(19, 1, 0.3)

function mountPanel(shownShot: ShownShot = 'recommended') {
  return mount(CompareAlternatives, {
    props: {
      recommended,
      safest: recommended,
      highestWin,
      target: target.aim,
      targetOutcome: target.outcome,
      shownShot,
    },
  })
}

function rows(wrapper: ReturnType<typeof mountPanel>) {
  return wrapper.findAll('button.row')
}

describe('CompareAlternatives', () => {
  it('shows the three rows in order', () => {
    const titles = rows(mountPanel()).map((row) => row.find('.title').text())
    expect(titles).toEqual(['Safest shot', 'Highest win chance', 'Your target'])
  })

  it('labels a row that is the recommended aim', () => {
    expect(rows(mountPanel())[0]?.find('.badge').text()).toBe('Same as recommended')
  })

  it('shows the win difference against the recommended shot', () => {
    const [, highest, yours] = rows(mountPanel())
    expect(highest?.find('.badge').text()).toBe('+1 pts win')
    expect(yours?.find('.badge').text()).toBe('-65 pts win')
  })

  it('uses "Wins the point" for the win bar', () => {
    expect(rows(mountPanel())[0]?.find('.stat-win').text()).toContain('Wins the point')
  })

  it('highlights the row drawn on the court', () => {
    const shownAsRecommended = rows(mountPanel('recommended')).map((row) => row.classes('is-shown'))
    expect(shownAsRecommended).toEqual([true, false, false])

    const shownHighest = rows(mountPanel('highestWin')).map((row) => row.classes('is-shown'))
    expect(shownHighest).toEqual([false, true, false])

    const shownTarget = rows(mountPanel('target')).map((row) => row.classes('is-shown'))
    expect(shownTarget).toEqual([false, false, true])
  })

  it('emits the row when clicked', async () => {
    const wrapper = mountPanel()
    const [safest, highest, yours] = rows(wrapper)
    await safest?.trigger('click')
    await highest?.trigger('click')
    await yours?.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['safest'], ['highestWin'], ['target']])
  })
})
