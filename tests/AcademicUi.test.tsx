import { readFileSync, readdirSync } from 'node:fs'
import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { useConfirmation } from '../src/academic/AcademicUi'
function Example() {
  const { ask, dialog } = useConfirmation()
  return <><button onClick={() => void ask({ title: 'Confirmar ensayo', description: 'Cambio persistido de ensayo.' })}>Abrir ensayo</button>{dialog}</>
}
afterEach(cleanup)
it('accessible modal traps forward and reverse focus, blocks background and restores focus', () => {
  const { container } = render(<Example />)
  const opener = screen.getByRole('button', { name: 'Abrir ensayo' }); opener.focus(); fireEvent.click(opener)
  const cancel = screen.getByRole('button', { name: 'Cancelar operación' }), confirm = screen.getByRole('button', { name: 'Confirmar operación' })
  expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Cambio persistido de ensayo.')
  expect(cancel).toHaveFocus(); expect(container.inert).toBe(true)
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true }); expect(confirm).toHaveFocus()
  fireEvent.keyDown(document, { key: 'Tab' }); expect(cancel).toHaveFocus()
  opener.focus(); expect(cancel).toHaveFocus()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(opener).toHaveFocus(); expect(container.inert).not.toBe(true)
})

it('H2 flows contain no native alert, confirm or prompt calls', () => {
  for (const name of readdirSync('src/academic').filter(name => name.endsWith('.tsx'))) {
    expect(readFileSync(`src/academic/${name}`, 'utf8')).not.toMatch(/\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/)
  }
})
