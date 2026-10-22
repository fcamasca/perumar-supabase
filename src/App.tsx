import { useState } from 'react'
import { browserEnv, validateEnv } from './lib/env'
import { checkConnection } from './lib/supabase'
import { BrowserRouter } from 'react-router-dom'
import { SessionProvider } from './security/SessionProvider'
import { SecurityRoutes } from './security/SecurityRoutes'
import { ThemeSelector } from './ThemeSelector'

export default function App() {
  const [result, setResult] = useState('Conexión local pendiente de comprobación.')
  const [busy, setBusy] = useState(false)
  let configurationError = ''
  try { validateEnv(browserEnv()) } catch (error) { configurationError = (error as Error).message }

  async function diagnose() {
    setBusy(true)
    try { setResult(await checkConnection()) }
    catch (error) { setResult((error as Error).message) }
    finally { setBusy(false) }
  }
  return (
    <main className="bootstrap">
      <p className="eyebrow">H2 · Base académica</p>
      <h1>PERÚ MAR</h1>
      <ThemeSelector />
      <p className="intro">Base técnica de la nueva aplicación.</p>
      <section aria-labelledby="environment-title">
        <h2 id="environment-title">Entorno local</h2>
        <p>Supabase se utiliza exclusivamente en el entorno local de desarrollo.</p>
        {configurationError ? <p role="alert">{configurationError}</p> : <>
          <button type="button" disabled={busy} onClick={diagnose}>{busy ? 'Comprobando…' : 'Comprobar conexión local'}</button>
          <p role="status">{result}</p>
        </>}
      </section>
      {!configurationError && <SessionProvider><BrowserRouter><SecurityRoutes /></BrowserRouter></SessionProvider>}
      <p className="scope">Entorno local de validación académica. H2 pendiente de pruebas humanas y Gate 2.</p>
    </main>
  )
}
