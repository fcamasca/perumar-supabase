import { useEffect, useState } from 'react'
import { useSession } from '../security/SessionProvider'
import {
  AcademicAction,
  AcademicPagination,
  AcademicRecordHeader,
  AcademicSearch,
} from '../academic/AcademicLayout'
import { InlineForm, StatusBadge } from '../academic/AcademicUi'
import { formTextValue } from '../lib/formText'
import { documentError, generatedCodes, type DocumentType } from './contracts'
import { DocumentPreview } from './DocumentPreview'

export function DocumentTypes() {
  const [preview, setPreview] = useState<{ codigo: string; nombre: string } | null>(null)
  const { client } = useSession()
  const [rows, setRows] = useState<DocumentType[]>([]),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(0),
    [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState<DocumentType | null>(null),
    [open, setOpen] = useState(false),
    [editing, setEditing] = useState(false),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState(''),
    [failure, setFailure] = useState(false)
  const blank = {
    codigo: '',
    nombre: '',
    descripcion: '',
    origen: 'SUBIDO' as 'SUBIDO' | 'GENERADO',
    activo: true,
  }
  const [draft, setDraft] = useState(blank)
  const dirty =
    !selected ||
    Object.keys(blank).some(
      (k) => draft[k as keyof typeof blank] !== (selected[k as keyof DocumentType] ?? ''),
    )
  useEffect(() => {
    let alive = true
    setLoading(true)
    void client
      .from('tipo_documento')
      .select('*')
      .order('nombre')
      .then((r) => {
        if (!alive) return
        setLoading(false)
        if (r.error) {
          setRows([])
          setFailure(true)
          setMessage('No se pudieron consultar los tipos de documento.')
        } else setRows(r.data as DocumentType[])
      })
    return () => {
      alive = false
    }
  }, [client, revision])
  function show(row: DocumentType | null, edit: boolean) {
    setSelected(row)
    setDraft(
      row
        ? {
            codigo: row.codigo,
            nombre: row.nombre,
            descripcion: row.descripcion ?? '',
            origen: row.origen,
            activo: row.activo,
          }
        : blank,
    )
    setEditing(edit)
    setOpen(true)
    setMessage('')
  }
  async function save() {
    setBusy(true)
    setMessage('')
    const r = await client.rpc('guardar_tipo_documento', {
      p: {
        ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}),
        ...draft,
        activo: String(draft.activo),
        descripcion: draft.descripcion || null,
      },
    })
    setBusy(false)
    setFailure(!!r.error)
    if (r.error) setMessage(documentError(r.error))
    else {
      setOpen(false)
      setRevision((v) => v + 1)
      setMessage('Tipo de documento guardado correctamente.')
    }
  }
  const filtered = rows.filter((r) =>
      (r.codigo + ' ' + r.nombre).toUpperCase().includes(search.trim().toUpperCase()),
    ),
    visible = filtered.slice(page * 30, page * 30 + 30)
  return (
    <section>
      {preview && <DocumentPreview code={preview.codigo} name={preview.nombre} onClose={() => setPreview(null)} />}
      {open ? (
        <>
          <AcademicRecordHeader
            title={selected ? 'Tipo de documento' : 'Nuevo tipo de documento'}
            name={selected?.nombre}
            editing={editing}
            busy={busy}
            backLabel="Volver a tipos de documento"
            editLabel="Editar tipo de documento"
            onBack={() => setOpen(false)}
            onEdit={() => setEditing(true)}
          />
          {draft.origen === 'GENERADO' && generatedCodes.includes(draft.codigo) && (
            <div className="record-header-actions document-preview-action">
              <button type="button" className="secondary" disabled={busy} onClick={() => setPreview({ codigo: draft.codigo, nombre: draft.nombre || draft.codigo })}>Vista previa</button>
            </div>
          )}
          <InlineForm onSubmit={() => void save()}>
            <fieldset disabled={!editing || busy} className="academic-fields">
              <legend>Datos del tipo</legend>
              <label>
                Código
                {draft.origen === 'GENERADO' ? (
                  <select
                    required
                    disabled={!!selected}
                    value={draft.codigo}
                    onChange={(e) => setDraft({ ...draft, codigo: e.target.value })}
                  >
                    <option value="">Seleccionar</option>
                    {generatedCodes.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    maxLength={40}
                    pattern="[A-Z][A-Z0-9_]{0,39}"
                    data-pattern-error="Usa hasta 40 letras mayúsculas, números o guion bajo, comenzando con una letra."
                    disabled={!!selected}
                    value={draft.codigo}
                    onChange={(e) => setDraft({ ...draft, codigo: formTextValue(e.currentTarget) })}
                  />
                )}
              </label>
              <label>
                Nombre
                <input
                  required
                  maxLength={150}
                  value={draft.nombre}
                  onChange={(e) => setDraft({ ...draft, nombre: formTextValue(e.currentTarget) })}
                />
              </label>
              <label>
                Origen
                <select
                  disabled={!!selected}
                  value={draft.origen}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      origen: e.target.value as typeof draft.origen,
                      codigo: '',
                    })
                  }
                >
                  <option value="SUBIDO">Subido</option>
                  <option value="GENERADO">Generado</option>
                </select>
              </label>
              <label className="academic-checkbox-field">
                <input
                  type="checkbox"
                  checked={draft.activo}
                  onChange={(e) => setDraft({ ...draft, activo: e.target.checked })}
                />
                Activo
              </label>
              <label>
                Descripción
                <textarea
                  rows={2}
                  maxLength={500}
                  value={draft.descripcion}
                  onChange={(e) =>
                    setDraft({ ...draft, descripcion: formTextValue(e.currentTarget) })
                  }
                />
              </label>
            </fieldset>
            {editing && (
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </button>
                <button disabled={busy || !dirty}>Guardar tipo de documento</button>
              </div>
            )}
          </InlineForm>
        </>
      ) : (
        <>
          <h2>Tipos de documento</h2>
          <div className="filters academic-toolbar">
            <AcademicSearch
              label="Buscar tipo de documento"
              placeholder="Código o nombre"
              value={search}
              onChange={(v) => {
                setSearch(v)
                setPage(0)
              }}
            />
            <AcademicAction
              label="Nuevo tipo de documento"
              icon="new"
              onClick={() => show(null, true)}
            />
          </div>
          {loading ? (
            <p role="status">Cargando tipos…</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Origen</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td>{r.codigo}</td>
                      <td>{r.nombre}</td>
                      <td>{r.origen === 'SUBIDO' ? 'Subido' : 'Generado'}</td>
                      <td>
                        <StatusBadge value={r.activo ? 'Activo' : 'Inactivo'} />
                      </td>
                      <td>
                        {r.origen === 'GENERADO' && generatedCodes.includes(r.codigo) && (
                          <button type="button" className="secondary document-preview-row-action" onClick={() => setPreview(r)}>Vista previa</button>
                        )}
                        <AcademicAction
                          icon="view"
                          label={`Ver ${r.nombre}`}
                          onClick={() => show(r, false)}
                        />
                        <AcademicAction
                          icon="edit"
                          label={`Editar ${r.nombre}`}
                          onClick={() => show(r, true)}
                        />
                      </td>
                    </tr>
                  ))}
                  {!visible.length && (
                    <tr>
                      <td colSpan={5}>No hay coincidencias.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <AcademicPagination
            page={page}
            count={visible.length}
            disabled={loading}
            onChange={setPage}
          />
        </>
      )}
      {message && (
        <p
          role={failure ? 'alert' : 'status'}
          className={failure ? 'validation-message' : 'success'}
        >
          {message}
        </p>
      )}
    </section>
  )
}
