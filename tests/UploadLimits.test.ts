import { expect, it } from 'vitest'
import { MAX_UPLOAD_BYTES, uploadSizeError } from '../src/documents/uploadLimits'

it('checks the exact 5 MiB boundary and empty files', () => {
  expect(uploadSizeError({ size: MAX_UPLOAD_BYTES })).toBe('')
  expect(uploadSizeError({ size: MAX_UPLOAD_BYTES + 1 })).toContain('supera el máximo de 5 MiB')
  expect(uploadSizeError({ size: 0 })).toContain('vacío')
})
