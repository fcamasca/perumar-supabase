import { useEffect, useState } from 'react'
import approvedMark from './assets/brand/perumar-isotipo.svg?raw'

export const palettes = {
  light: { 'pm-ink': '#173d50', 'pm-wheel': '#947044', 'pm-paper': '#fffaf0', 'pm-sea': '#39758a', 'pm-red': '#bb3544', background: '#f3f6f9', surface: '#edf2f6', 'surface-elevated': '#ffffff', 'field-background': '#ffffff', 'brand-soft': '#e6f0f4', 'text-primary': '#142d42', 'text-secondary': '#43576a', 'text-disabled': '#506477', border: '#6f8394', 'border-soft': '#d9e3eb', 'border-strong': '#435f75', primary: '#124c67', 'primary-hover': '#103e56', 'primary-contrast': '#ffffff', focus: '#006b83', success: '#166047', warning: '#805116', error: '#9a3042', info: '#18536f', shadow: '0 12px 36px rgb(17 44 65 / .06)', scrim: 'rgb(10 26 40 / .54)' },
  dark: { 'pm-ink': '#c9e7ef', 'pm-wheel': '#d4b78d', 'pm-paper': '#152b39', 'pm-sea': '#43899e', 'pm-red': '#ef7b88', background: '#0e1b29', surface: '#152638', 'surface-elevated': '#203247', 'field-background': '#152638', 'brand-soft': '#203247', 'text-primary': '#f0f6fb', 'text-secondary': '#d1dfe9', 'text-disabled': '#b5c8d8', border: '#8ca8bd', 'border-soft': '#41576b', 'border-strong': '#b5c8d8', primary: '#9ad7e9', 'primary-hover': '#c0e7f3', 'primary-contrast': '#102738', focus: '#8fe3f4', success: '#8de0b9', warning: '#f2d48e', error: '#ffb3c0', info: '#a1d8f2', shadow: '0 12px 36px rgb(0 0 0 / .12)', scrim: 'rgb(0 0 0 / .65)' },
  'high-contrast': { 'pm-ink': '#ffffff', 'pm-wheel': '#ffffff', 'pm-paper': '#000000', 'pm-sea': '#ffffff', 'pm-red': '#ffffff', background: '#000000', surface: '#000000', 'surface-elevated': '#111111', 'field-background': '#000000', 'brand-soft': '#111111', 'text-primary': '#ffffff', 'text-secondary': '#ffffff', 'text-disabled': '#e5e7eb', border: '#ffffff', 'border-soft': '#ffffff', 'border-strong': '#ffffff', primary: '#ffff00', 'primary-hover': '#ffffff', 'primary-contrast': '#000000', focus: '#00ffff', success: '#00ff00', warning: '#ffff00', error: '#ffb3b3', info: '#00ffff', shadow: 'none', scrim: '#000000' },
} as const
export type Preference = 'system' | keyof typeof palettes
export function validPreference(value: string | null): Preference {
  return value === 'light' || value === 'dark' || value === 'high-contrast' ? value : 'system'
}
const key = 'perumar.visual-preference'
function initialPreference(): Preference {
  try { return validPreference(localStorage.getItem(key)) } catch { return 'system' }
}
export function ThemeSelector() {
  const [preference, setPreference] = useState<Preference>(initialPreference)
  useEffect(() => {
    const scheme = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null
    const contrast = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-contrast: more)') : null
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    const fallbackIcon = favicon?.getAttribute('href')
    const forced = typeof window.matchMedia === 'function' ? window.matchMedia('(forced-colors: active)') : null
    const apply = () => {
      const resolved = preference === 'system' ? (contrast?.matches ? 'high-contrast' : scheme?.matches ? 'dark' : 'light') : preference
      document.documentElement.dataset.theme = preference
      document.documentElement.style.colorScheme = resolved === 'dark' || resolved === 'high-contrast' ? 'dark' : 'light'
      for (const [token, value] of Object.entries(palettes[resolved])) document.documentElement.style.setProperty(`--${token}`, value)
      if (favicon) {
        const tokens = Object.entries(palettes[resolved]).filter(([key]) => key.startsWith('pm-'))
          .map(([key, value]) => `--${key}:${forced?.matches ? (key === 'pm-paper' ? 'Canvas' : 'CanvasText') : value}`).join(';')
        // Standalone SVG favicons do not inherit the page CSS. Reuse the official
        // source with color variables only; do not alter paths or create a variant.
        favicon.href = `data:image/svg+xml,${encodeURIComponent(approvedMark.replace('<svg ', `<svg style="${tokens}" `))}`
      }
    }
    apply()
    scheme?.addEventListener('change', apply)
    contrast?.addEventListener('change', apply)
    forced?.addEventListener('change', apply)
    try { localStorage.setItem(key, preference) } catch { /* Selection remains available in memory. */ }
    return () => { scheme?.removeEventListener('change', apply); contrast?.removeEventListener('change', apply); forced?.removeEventListener('change', apply); if (favicon && fallbackIcon !== null && fallbackIcon !== undefined) favicon.setAttribute('href', fallbackIcon) }
  }, [preference])
  return <label className="theme-picker">Preferencia visual
    <select value={preference} onChange={event => setPreference(validPreference(event.target.value))}>
      <option value="system">Sistema</option><option value="light">Claro</option>
      <option value="dark">Oscuro</option><option value="high-contrast">Alto contraste</option>
    </select>
  </label>
}
