import { useEffect, useState } from 'react'

export const palettes = {
  light: { background: '#ffffff', surface: '#f4f4f5', 'surface-elevated': '#ffffff', 'text-primary': '#111827', 'text-secondary': '#374151', 'text-disabled': '#4b5563', border: '#6b7280', 'border-strong': '#374151', primary: '#1d4ed8', 'primary-contrast': '#ffffff', focus: '#6d28d9', success: '#166534', warning: '#854d0e', error: '#991b1b', info: '#1e40af' },
  dark: { background: '#111827', surface: '#1f2937', 'surface-elevated': '#374151', 'text-primary': '#f9fafb', 'text-secondary': '#e5e7eb', 'text-disabled': '#d1d5db', border: '#9ca3af', 'border-strong': '#d1d5db', primary: '#a5b4fc', 'primary-contrast': '#111827', focus: '#fde047', success: '#86efac', warning: '#fde047', error: '#fca5a5', info: '#93c5fd' },
  'high-contrast': { background: '#000000', surface: '#000000', 'surface-elevated': '#111111', 'text-primary': '#ffffff', 'text-secondary': '#ffffff', 'text-disabled': '#e5e7eb', border: '#ffffff', 'border-strong': '#ffffff', primary: '#ffff00', 'primary-contrast': '#000000', focus: '#00ffff', success: '#00ff00', warning: '#ffff00', error: '#ffb3b3', info: '#00ffff' },
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
    const apply = () => {
      const resolved = preference === 'system' ? (contrast?.matches ? 'high-contrast' : scheme?.matches ? 'dark' : 'light') : preference
      document.documentElement.dataset.theme = preference
      document.documentElement.style.colorScheme = resolved === 'dark' || resolved === 'high-contrast' ? 'dark' : 'light'
      for (const [token, value] of Object.entries(palettes[resolved])) document.documentElement.style.setProperty(`--${token}`, value)
    }
    apply()
    scheme?.addEventListener('change', apply)
    contrast?.addEventListener('change', apply)
    try { localStorage.setItem(key, preference) } catch { /* Selection remains available in memory. */ }
    return () => { scheme?.removeEventListener('change', apply); contrast?.removeEventListener('change', apply) }
  }, [preference])
  return <label className="theme-picker">Preferencia visual
    <select value={preference} onChange={event => setPreference(validPreference(event.target.value))}>
      <option value="system">Sistema</option><option value="light">Claro</option>
      <option value="dark">Oscuro</option><option value="high-contrast">Alto contraste</option>
    </select>
  </label>
}
