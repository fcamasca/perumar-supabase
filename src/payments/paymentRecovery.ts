type Reference = { key: string; matriculaId: string }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const name = (user: string, enrollment: string) => `perumar:payment:${user}:${enrollment}`
export function readPaymentReference(user: string, enrollment: string): Reference | null {
  const raw = sessionStorage.getItem(name(user, enrollment))
  if (!raw) return null
  const value = JSON.parse(raw) as Reference
  if (!uuid.test(value.key) || value.matriculaId !== enrollment) throw new Error('Invalid recovery reference')
  return { key: value.key, matriculaId: value.matriculaId }
}
export function savePaymentReference(user: string, enrollment: string, key: string) {
  if (!uuid.test(key)) throw new Error('Invalid operation key')
  sessionStorage.setItem(name(user, enrollment), JSON.stringify({ key, matriculaId: enrollment }))
}
export function clearPaymentReference(user: string, enrollment: string) {
  sessionStorage.removeItem(name(user, enrollment))
}
