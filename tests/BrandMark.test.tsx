import { readFileSync } from 'node:fs'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { BrandMark } from '../src/BrandMark'
import official from '../src/assets/brand/perumar-isotipo.svg?raw'

afterEach(cleanup)
it('uses the approved geometry without exposing a duplicate accessible brand name', () => {
  const { container } = render(<><BrandMark /><span>PERÚ MAR</span></>)
  const source = new DOMParser().parseFromString(official, 'image/svg+xml')
  const shapes = (root: ParentNode) => Array.from(root.querySelectorAll('path,circle')).map(e => [e.tagName, e.getAttribute('d'), e.getAttribute('cx'), e.getAttribute('cy'), e.getAttribute('r')])
  expect(shapes(container)).toEqual(shapes(source))
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  expect(container.querySelector('svg')).toHaveAttribute('focusable', 'false')
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getAllByText('PERÚ MAR')).toHaveLength(1)
})
it('multiple brand instances keep clip IDs and references isolated', () => {
  const { container } = render(<><BrandMark /><BrandMark /></>)
  const ids = Array.from(container.querySelectorAll('[id]')).map(e => e.id)
  expect(new Set(ids).size).toBe(ids.length)
  for (const svg of container.querySelectorAll('svg')) {
    const ref = svg.querySelector('[clip-path]')!.getAttribute('clip-path')!.slice(5, -1)
    expect(Array.from(svg.querySelectorAll('[id]')).some(e => e.id === ref)).toBe(true)
  }
})
it('HTML favicon fallback points to the same official SVG, without another icon variant', () => {
  const index = readFileSync('index.html', 'utf8')
  expect(index).toContain('href="/src/assets/brand/perumar-isotipo.svg"')
  expect(index).toContain('type="image/svg+xml"')
})
