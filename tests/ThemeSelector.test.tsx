import { act, fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ThemeSelector, palettes } from '../src/ThemeSelector'

afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map(x => parseInt(x, 16) / 255)
    .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4)
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
}
function contrast(a: string, b: string) {
  const x = luminance(a), y = luminance(b)
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05)
}
it.each(Object.keys(palettes) as (keyof typeof palettes)[])('%s: measured text and control contrast', theme => {
  const p = palettes[theme]
  for (const surface of [p.background, p.surface, p['surface-elevated'], p['field-background'], p['brand-soft']]) {
    for (const token of ['text-primary', 'text-secondary', 'text-disabled', 'success', 'warning', 'error', 'info'] as const) expect(contrast(p[token], surface), token).toBeGreaterThanOrEqual(4.5)
    expect(contrast(p.border, surface)).toBeGreaterThanOrEqual(3)
    expect(contrast(p.focus, surface)).toBeGreaterThanOrEqual(3)
  }
  expect(contrast(p.primary, p['primary-contrast'])).toBeGreaterThanOrEqual(4.5)
  expect(contrast(p['primary-hover'], p['primary-contrast'])).toBeGreaterThanOrEqual(4.5)
})
it('defaults to system, follows OS changes and persists choice', () => {
  let change: () => void = () => undefined
  const media = { matches: false, addEventListener: (_name: string, listener: () => void) => { change = listener }, removeEventListener: vi.fn() }
  vi.stubGlobal('matchMedia', (query: string) => query.includes('color-scheme') ? media : { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  render(<ThemeSelector />)
  expect(screen.getByLabelText('Preferencia visual')).toHaveValue('system')
  media.matches = true
  act(() => change())
  expect(document.documentElement.style.getPropertyValue('--background')).toBe(palettes.dark.background)
  fireEvent.change(screen.getByLabelText('Preferencia visual'), { target: { value: 'high-contrast' } })
  expect(localStorage.getItem('perumar.visual-preference')).toBe('high-contrast')
})
it('corrupt or unavailable storage does not block selection', () => {
  localStorage.setItem('perumar.visual-preference', 'arbitrary')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  render(<ThemeSelector />)
  fireEvent.change(screen.getByLabelText('Preferencia visual'), { target: { value: 'dark' } })
  expect(screen.getByLabelText('Preferencia visual')).toHaveValue('dark')
})
