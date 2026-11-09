export type DocumentKind = 'DNI' | 'CARNET_EXTRANJERIA' | 'RUC'

export function documentRule(kind: string) {
  if (kind === 'DNI') return { kind: 'DNI' as const, maxLength: 8, minLength: 8, pattern: '[0-9]{8}', numeric: true, hint: 'Exactamente 8 dígitos.' }
  if (kind === 'RUC') return { kind: 'RUC' as const, maxLength: 11, minLength: 11, pattern: '[0-9]{11}', numeric: true, hint: 'Exactamente 11 dígitos.' }
  if (kind === 'CARNET_EXTRANJERIA') return { kind: 'CARNET_EXTRANJERIA' as const, maxLength: 30, minLength: 1, pattern: '[A-Z0-9]{1,30}', numeric: false, hint: 'De 1 a 30 letras y números.' }
  return undefined
}

export function documentInputValue(field: HTMLInputElement, kind: DocumentKind): string {
  const rule = documentRule(kind)!
  const clean = (text: string) => text.toUpperCase().replace(rule.numeric ? /[^0-9]/g : /[^A-Z0-9]/g, '').slice(0, rule.maxLength)
  const original = field.value, start = field.selectionStart, end = field.selectionEnd
  const result = clean(original)
  if (original !== result) {
    field.value = result
    if (start !== null && end !== null) field.setSelectionRange(clean(original.slice(0, start)).length, clean(original.slice(0, end)).length)
  }
  return result
}

export function pasteDocumentValue(field: HTMLInputElement, text: string, kind: DocumentKind): string {
  const start = field.selectionStart ?? field.value.length, end = field.selectionEnd ?? start
  field.value = field.value.slice(0, start) + text + field.value.slice(end)
  field.setSelectionRange(start + text.length, start + text.length)
  return documentInputValue(field, kind)
}
