/** Business text entry: normalize the value sent to state, not just its appearance. */
export function formTextValue(field: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  if (!(field instanceof HTMLTextAreaElement) && !(field instanceof HTMLInputElement && ['text', 'search', 'tel'].includes(field.type))) return field.value
  const previous = field.value
  const upper = previous.toUpperCase()
  if (upper !== previous) {
    const start = field.selectionStart, end = field.selectionEnd, direction = field.selectionDirection
    field.value = upper
    if (start !== null && end !== null) field.setSelectionRange(previous.slice(0, start).toUpperCase().length, previous.slice(0, end).toUpperCase().length, direction ?? 'none')
  }
  return upper
}
