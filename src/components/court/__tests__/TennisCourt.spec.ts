import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TennisCourt from '../TennisCourt.vue'
import { NET_X_M, WHOLE_COURT_LENGTH_M, WHOLE_COURT_WIDTH_M } from '@/math/courtGeometry'

const you = { x: 2, y: 5 }
const opponent = { x: 20, y: 4 }

function mountCourt() {
  return mount(TennisCourt, { props: { you, opponent } })
}

function markers(wrapper: ReturnType<typeof mountCourt>) {
  const [youMarker, opponentMarker] = wrapper.findAll('.player-marker')
  if (!youMarker || !opponentMarker) throw new Error('markers not rendered')
  return { youMarker, opponentMarker }
}

describe('TennisCourt: keyboard movement', () => {
  it('makes both markers focusable', () => {
    const { youMarker, opponentMarker } = markers(mountCourt())
    expect(youMarker.attributes('tabindex')).toBe('0')
    expect(opponentMarker.attributes('tabindex')).toBe('0')
  })

  it('moves a marker 25 cm per arrow key', async () => {
    const wrapper = mountCourt()
    const { youMarker } = markers(wrapper)

    await youMarker.trigger('keydown', { key: 'ArrowRight' })
    await youMarker.trigger('keydown', { key: 'ArrowLeft' })
    await youMarker.trigger('keydown', { key: 'ArrowUp' })
    await youMarker.trigger('keydown', { key: 'ArrowDown' })

    const moves = wrapper.emitted('update:you')?.map(([point]) => point)
    expect(moves).toEqual([
      { x: 2.25, y: 5 },
      { x: 1.75, y: 5 },
      { x: 2, y: 4.75 },
      { x: 2, y: 5.25 },
    ])
  })

  it('moves 1 m with Shift', async () => {
    const wrapper = mountCourt()
    await markers(wrapper).opponentMarker.trigger('keydown', { key: 'ArrowDown', shiftKey: true })
    expect(wrapper.emitted('update:opponent')?.[0]).toEqual([{ x: 20, y: 5 }])
  })

  it('keeps a marker on its own side of the net', async () => {
    const wrapper = mount(TennisCourt, { props: { you: { x: NET_X_M - 0.5, y: 5 }, opponent } })
    await markers(wrapper).youMarker.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
    const [point] = wrapper.emitted('update:you')?.[0] ?? []
    expect((point as { x: number }).x).toBeLessThan(NET_X_M)
  })

  it('ignores other keys', async () => {
    const wrapper = mountCourt()
    await markers(wrapper).youMarker.trigger('keydown', { key: 'a' })
    expect(wrapper.emitted('update:you')).toBeUndefined()
  })
})

describe('TennisCourt: vertical layout', () => {
  it('uses a portrait viewBox', () => {
    const wrapper = mount(TennisCourt, { props: { you, opponent, vertical: true } })
    expect(wrapper.get('svg').attributes('viewBox')).toBe(`0 0 ${WHOLE_COURT_WIDTH_M} ${WHOLE_COURT_LENGTH_M}`)
  })

  it('moves toward the opponent with ArrowUp', async () => {
    const wrapper = mount(TennisCourt, { props: { you, opponent, vertical: true } })
    await markers(wrapper).youMarker.trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.emitted('update:you')?.[0]).toEqual([{ x: 2.25, y: 5 }])
  })
})
