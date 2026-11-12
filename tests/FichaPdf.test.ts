import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { ageAtEnrollment, parseRequest, projectFicha, requireEligible } from '../supabase/functions/_shared/ficha/contract'
import { renderFicha } from '../supabase/functions/_shared/ficha/render'
import { fichaFixture } from './ficha-fixture'

describe('H5 provenance and closed request', () => {
  it('uses Lima matriculation day for age, never emission or updated_at', () => {
    expect(ageAtEnrollment('2000-01-02', '2026-01-02T02:00:00Z')).toBe('25 años')
    const source = fichaFixture(), model = projectFicha(source, new Date('2030-01-01T01:00:00Z'))
    expect(JSON.stringify(model)).toContain('25 años')
    expect(model.emitted).toContain('2029')
  })
  it('does not fill missing snapshot code and preserves historic contacts', () => {
    const source = fichaFixture(); delete source.alumno_snapshot.alumno.codigo_alumno
    expect(projectFicha(source, new Date()).sections[1].fields[0][1]).toBe('Sin dato')
    expect(projectFicha(source, new Date()).contacts[0][2]).toBe('Madre')
  })
  it.each(['actor', 'path', 'bucket', 'html', 'url', 'importe'])('rejects extra %s', key => {
    expect(() => parseRequest({ matricula_id: fichaFixture().id, expected_updated_at: fichaFixture().updated_at, [key]: 'x' })).toThrow('INPUT')
  })
  it('rejects stale microsecond version explicitly', () => {
    const s = fichaFixture()
    expect(() => requireEligible(s, { matricula_id: s.id, expected_updated_at: s.updated_at.replace('456', '457') })).toThrow('VERSION')
    expect(() => requireEligible(s, { matricula_id: s.id, expected_updated_at: s.updated_at })).not.toThrow()
  })
  it.each(['DESIERTO', 'ANULADO'])('blocks cycle %s even for existing artifact', state => {
    const s = fichaFixture(); s.ciclo!.estado_codigo = state
    expect(() => requireEligible(s, { matricula_id: s.id, expected_updated_at: s.updated_at, artefacto_id: s.id })).toThrow('STATE')
  })
  it('blocks annulled enrollment', () => {
    const s = fichaFixture(); s.estado_codigo = 'ANULADO'
    expect(() => requireEligible(s, { matricula_id: s.id, expected_updated_at: s.updated_at })).toThrow('STATE')
  })
})
describe('H5 portable renderer', () => {
  it('produces parseable A4 with Spanish, blank institutional spaces and no input mutation', async () => {
    const s = fichaFixture(), before = JSON.stringify(s), bytes = await renderFicha(s, new Date())
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBeGreaterThan(0)
    expect(pdf.getPages()[0].getWidth()).toBeCloseTo(595.28)
    expect(JSON.stringify(s)).toBe(before)
  })
  it('paginates 100 contacts', async () => {
    const pdf = await PDFDocument.load(await renderFicha(fichaFixture(100), new Date()))
    expect(pdf.getPageCount()).toBeGreaterThan(3)
    expect(pdf.getPageCount()).toBeLessThanOrEqual(20)
  })
  it('rejects unsupported glyphs without silent substitution', async () => {
    const s = fichaFixture(); s.alumno_snapshot.alumno.nombres = '😀'
    await expect(renderFicha(s, new Date())).rejects.toThrow('GLYPH')
  })
  it('rejects contacts beyond budget', async () => {
    await expect(renderFicha(fichaFixture(101), new Date())).rejects.toThrow('LIMIT')
  })
})
