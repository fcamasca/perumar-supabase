import { expect, it } from 'vitest'
import { academicError } from '../src/academic/AcademicPages'
import { enrollmentError } from '../src/lib/enrollmentError'
import { paymentError } from '../src/payments/paymentError'

it.each(['PT409', '40001', '40P01'])('academic conflict %s requires a new user decision', code => {
  expect(academicError({ code, message: 'SECRET SQL' })).toBe('El registro fue modificado por otro usuario. Actualiza la información antes de volver a guardar.')
})
it.each(['PT409', '40001', '40P01'])('enrollment conflict %s retains reload feedback', code => {
  expect(enrollmentError({ code, message: 'SECRET SQL' })).toBe('La información cambió. Recarga y revisa antes de volver a guardar.')
})
it.each(['PT409', '40001', '40P01'])('payment conflict %s is explicit and safe', code => {
  expect(paymentError({ code, message: 'SECRET SQL' })).toBe('La información cambió durante la operación. Consulta los datos y vuelve a confirmar; no se reintentó automáticamente.')
})
