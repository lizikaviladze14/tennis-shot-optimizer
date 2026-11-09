import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LeftSidebar from '../layout/LeftSidebar.vue'

describe('LeftSidebar shot count', () => {
  it('lets the user pick how many shots to simulate', async () => {
    const wrapper = mount(LeftSidebar)
    const group = wrapper.find('[aria-label="Shots per target"]')
    const buttons = group.findAll('button')

    expect(buttons.map((button) => button.text())).toEqual(['250', '500', '1k', '2k'])
    expect(buttons[1]?.attributes('aria-pressed')).toBe('true')

    await buttons[2]?.trigger('click')
    expect(wrapper.emitted('selectShotCount')).toEqual([[1000]])
  })
})
