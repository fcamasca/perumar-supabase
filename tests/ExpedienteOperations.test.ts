import { beforeEach, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { File as NodeFile } from 'node:buffer'
import type { SupabaseClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'
import {
  uploadDocument,
  downloadDocument,
} from '../supabase/functions/_shared/expediente/operation'
import { sha256 } from '../supabase/functions/_shared/expediente/contract'
const d = {
  id: 'doc',
  matricula_id: 'enrollment',
  codigo: 'DOCUMENTO_IDENTIDAD',
  origen: 'SUBIDO',
  activo: true,
  contexto_vigente: true,
  updated_at: 'version',
}
const r = {
  id: 'reservation',
  matricula_documento_id: 'doc',
  object_key: 'server/only',
  estado_tecnico: 'PREPARADO',
  iniciado_por: 'actor',
}
const upload = vi.fn(),
  remove = vi.fn(),
  download = vi.fn(),
  rpc = vi.fn()
let user: SupabaseClient, server: SupabaseClient, bytes: Uint8Array, file: File
beforeEach(async () => {
  vi.stubGlobal('crypto', webcrypto)
  upload.mockReset()
  remove.mockReset()
  download.mockReset()
  rpc.mockReset()
  const pdf = await PDFDocument.create()
  pdf.addPage()
  bytes = await pdf.save({ useObjectStreams: false })
  file = new NodeFile([Uint8Array.from(bytes)], 'scan.pdf', {
    type: 'application/pdf',
  }) as unknown as File
  const q = { select: () => q, eq: () => q, single: async () => ({ data: d, error: null }) }
  user = { from: () => q } as unknown as SupabaseClient
  server = {
    rpc,
    storage: { from: () => ({ upload, remove, download }) },
  } as unknown as SupabaseClient
})
it('does not delete confirmed bytes when confirmation committed but its response was lost', async () => {
  upload.mockResolvedValue({ error: null })
  rpc.mockImplementation(async (name: string) =>
    name === 'preparar_archivo_expediente'
      ? { data: r, error: null }
      : name === 'confirmar_archivo_expediente'
        ? { data: null, error: { code: 'FETCH_ERROR' } }
        : { data: null, error: { code: 'PT409', message: 'DOCUMENT_ALREADY_CONFIRMED' } },
  )
  await expect(
    uploadDocument(
      user,
      server,
      'actor',
      { documento_id: d.id, expected_updated_at: d.updated_at },
      file,
    ),
  ).rejects.toThrow('DOCUMENT_UNAVAILABLE')
  expect(upload).toHaveBeenCalledTimes(1)
  expect(rpc.mock.calls.map((c) => c[0])).toEqual([
    'preparar_archivo_expediente',
    'confirmar_archivo_expediente',
    'abortar_reserva_expediente',
  ])
  expect(remove).not.toHaveBeenCalled()
})
it('compensates an uploaded but unconfirmed file only after acknowledged abort', async () => {
  upload.mockResolvedValue({ error: null })
  remove.mockResolvedValue({ error: null })
  rpc.mockImplementation(async (name: string) =>
    name === 'preparar_archivo_expediente'
      ? { data: r, error: null }
      : name === 'confirmar_archivo_expediente'
        ? { data: null, error: { code: 'PT409', message: 'DOCUMENT_SOURCE_CHANGED' } }
        : { data: { ...r, estado_tecnico: 'ABORTADO' }, error: null },
  )
  await expect(
    uploadDocument(
      user,
      server,
      'actor',
      { documento_id: d.id, expected_updated_at: d.updated_at },
      file,
    ),
  ).rejects.toThrow('DOCUMENT_SOURCE_CHANGED')
  expect(remove).toHaveBeenCalledExactlyOnceWith(['server/only'])
  expect(upload).toHaveBeenCalledTimes(1)
  expect(rpc).toHaveBeenCalledTimes(3)
})
it('withholds all bytes if authorization is revoked after Storage IO', async () => {
  const f = {
    ...r,
    estado_tecnico: 'CONFIRMADO',
    mime: 'application/pdf',
    bytes: bytes.length,
    sha256: await sha256(bytes),
  }
  const q = { select: () => q, eq: () => q, single: async () => ({ data: f, error: null }) }
  user = {
    from: (name: string) =>
      name === 'matricula_documento' ? { ...q, single: async () => ({ data: d, error: null }) } : q,
  } as unknown as SupabaseClient
  download.mockResolvedValue({
    data: { size: bytes.length, arrayBuffer: async () => Uint8Array.from(bytes).buffer },
    error: null,
  })
  rpc.mockResolvedValue({ data: null, error: { code: '42501' } })
  await expect(
    downloadDocument(user, server, 'actor', {
      documento_id: d.id,
      archivo_id: f.id,
      historico: true,
    }),
  ).rejects.toThrow('DOCUMENT_ACCESS')
  expect(download).toHaveBeenCalledTimes(1)
  expect(rpc).toHaveBeenCalledTimes(1)
})
it('detects an actual byte/hash mismatch before recording a download event', async () => {
  const f = {
    ...r,
    estado_tecnico: 'CONFIRMADO',
    mime: 'application/pdf',
    bytes: bytes.length,
    sha256: '0'.repeat(64),
  }
  const q = { select: () => q, eq: () => q, single: async () => ({ data: f, error: null }) }
  user = {
    from: (name: string) =>
      name === 'matricula_documento' ? { ...q, single: async () => ({ data: d, error: null }) } : q,
  } as unknown as SupabaseClient
  download.mockResolvedValue({
    data: { size: bytes.length, arrayBuffer: async () => Uint8Array.from(bytes).buffer },
    error: null,
  })
  await expect(
    downloadDocument(user, server, 'actor', {
      documento_id: d.id,
      archivo_id: f.id,
      historico: false,
    }),
  ).rejects.toThrow('DOCUMENT_INTEGRITY')
  expect(rpc).not.toHaveBeenCalled()
})
