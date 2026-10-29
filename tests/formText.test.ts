import { expect, it } from 'vitest'
import { formTextValue } from '../src/lib/formText'
it('preserves the insertion point when uppercasing Spanish text', () => {
  const field=document.createElement('input')
  field.value='peña';field.setSelectionRange(2,2)
  expect(formTextValue(field)).toBe('PEÑA')
  expect(field.value).toBe('PEÑA')
  expect(field.selectionStart).toBe(2)
  expect(field.selectionEnd).toBe(2)
})
it('uppercases textarea content and leaves credentials, dates, numbers and select IDs intact', () => {
  const reason=document.createElement('textarea');reason.value='anulación por error'
  expect(formTextValue(reason)).toBe('ANULACIÓN POR ERROR')
  for(const type of ['email','password','date','number']) {
    const field=document.createElement('input');field.type=type
    field.value=type==='date'?'2026-10-28':type==='number'?'12.5':'ClaveMixta@Example.invalid'
    const original=field.value;expect(formTextValue(field)).toBe(original)
  }
  const field=document.createElement('select');field.innerHTML='<option value="reference-id">Referencia</option>'
  expect(formTextValue(field)).toBe('reference-id')
})
