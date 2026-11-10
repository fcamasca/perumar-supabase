import { beforeEach, expect, it } from 'vitest'
import { cents, decimal, pen } from '../src/payments/money'
import { paymentError } from '../src/payments/paymentError'
import { clearPaymentReference, readPaymentReference, savePaymentReference } from '../src/payments/paymentRecovery'

beforeEach(() => sessionStorage.clear())
it.each(['0','0.01','10','10.0','10.00','9999999999.99'])('preserves exact money %s', raw => {
  const value = cents(raw)!
  expect(cents(decimal(value))).toBe(value)
})
it.each(['','-1','NaN','Infinity','1e2','100.000','0.001','10000000000','1,50',' 1','1.'])('rejects invalid precision or representation %s', raw => expect(cents(raw)).toBeNull())
it('adds cents without floating point authority', () => {
  expect(pen(cents('0.1')! + cents('0.2')!)).toBe('S/ 0.30')
  expect(cents('9999999999.99')).toBe(999999999999n)
})
it('stores only opaque operation reference scoped by user and enrollment', () => {
  const key = '91b635e5-e71d-45ab-9fe1-f658a3b7bc17'
  savePaymentReference('user1', 'enrollment1', key)
  expect(readPaymentReference('user1', 'enrollment1')).toEqual({ key, matriculaId: 'enrollment1' })
  expect(readPaymentReference('user2', 'enrollment1')).toBeNull()
  expect(readPaymentReference('user1', 'enrollment2')).toBeNull()
  expect(Object.keys(JSON.parse(sessionStorage.getItem(sessionStorage.key(0)!)!)).sort()).toEqual(['key','matriculaId'])
  clearPaymentReference('user1','enrollment1')
  expect(readPaymentReference('user1','enrollment1')).toBeNull()
})
it('fails closed for malformed recovery data', () => {
  expect(() => savePaymentReference('u','m','invalid')).toThrow()
  sessionStorage.setItem('perumar:payment:u:m','{"key":"bad","matriculaId":"m"}')
  expect(() => readPaymentReference('u','m')).toThrow()
})
it.each([
  ['PAYMENT_EXCEEDS_PENDING', /supera el pendiente/],
  ['PAYMENT_DISCOUNT_BELOW_PAID', /debajo de lo ya abonado/],
  ['PAYMENT_PREVENTS_CARGO_RETIREMENT', /no puede retirarse/],
  ['PAYMENT_IDEMPOTENCY_CONFLICT', /otro contenido/],
])('gives specific safe feedback for %s', (message, expected) => expect(paymentError({ message })).toMatch(expected))
