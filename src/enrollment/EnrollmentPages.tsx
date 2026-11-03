import { enrollmentError } from '../lib/enrollmentError'
export { enrollmentError } from '../lib/enrollmentError'
export { Tariffs } from './TariffPages'
import { EnrollmentDrawer } from './EnrollmentDrawer'
import { studentSearchFilter } from '../lib/studentSearch'
import { documentRule, documentInputValue, pasteDocumentValue } from '../lib/documentInput'
import { formTextValue } from '../lib/formText'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSession } from '../security/SessionProvider';
import { AcademicTabs, AcademicRecordHeader } from '../academic/AcademicLayout';
import { InlineForm, EditorHeading, StatusBadge, useConfirmation } from '../academic/AcademicUi';
type Row = Record<string, unknown> & {
    id: string;
    updated_at?: string;
};
type Draft = Record<string, string>;
const value = (row: Record<string, unknown> | null | undefined, key: string) => String(row?.[key] ?? '');
export function ageAt(birth: string, today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth))
        return '';
    return String(Number(today.slice(0, 4)) - Number(birth.slice(0, 4)) - (today.slice(5) < birth.slice(5) ? 1 : 0));
}
function Steps({ names, step }: {
    names: string[];
    step: number;
}) {
    const heading = useRef<HTMLOListElement>(null);
    useEffect(() => { heading.current?.focus(); }, [step]);
    return <ol ref={heading} tabIndex={-1} aria-label="Pasos" className="enrollment-steps">{names.map((name, i) => <li key={name} aria-current={step === i ? 'step' : undefined}>{i + 1}. {name}{i < step ? ' ✓' : ''}</li>)}</ol>;
}
function Message({ children }: {
    children: ReactNode;
}) { return children ? <p role={typeof children === 'string' && /No |no se|cambió|Revisa|sin contacto/i.test(children) ? 'alert' : 'status'}>{children}</p> : null; }
function useReferences() {
    const { client } = useSession();
    const [refs, setRefs] = useState<Record<string, Row[]>>({}), [error, setError] = useState('');
    useEffect(() => {
        let active = true;
        void Promise.all(['catalogo', 'catalogo_valor', 'departamento', 'provincia', 'distrito'].map(async (table) => {
            const first = await client.from(table).select('*').range(0, 999);
            if (first.error)
                throw new Error('references');
            const second = table === 'distrito' ? await client.from(table).select('*').range(1000, 1999) : { data: [], error: null };
            if (second.error)
                throw new Error('references');
            return [table, [...first.data, ...(second.data ?? [])]];
        })).then(entries => { if (active)
            setRefs(Object.fromEntries(entries)); }).catch(() => { if (active)
            setError('No se pudieron cargar las referencias. Recarga la página.'); });
        return () => { active = false; };
    }, [client]);
    return { refs, error };
}
const catalogFields: Record<string, string> = { tipo_di_id: 'TIPO_DI', sexo_id: 'SEXO', estado_civil_id: 'ESTADO_CIVIL', grupo_sanguineo_id: 'GRUPO_SANGUINEO', grado_instruccion_id: 'GRADO_INSTRUCCION', color_ojos_id: 'COLOR_OJOS', color_cabello_id: 'COLOR_CABELLO', parentesco_id: 'PARENTESCO', ocupacion_id: 'OCUPACION' };
const studentGroups = [
    [['apellido_paterno', 'Apellido paterno', 'required'], ['apellido_materno', 'Apellido materno', 'required'], ['nombres', 'Nombres', 'required'], ['tipo_di_id', 'Tipo DI', 'required'], ['numero_di', 'Número DI', 'required'], ['fecha_nacimiento', 'Fecha de nacimiento', 'date'], ['sexo_id', 'Sexo', 'required'], ['estado_civil_id', 'Estado civil', 'optional'], ['nacimiento_departamento_id', 'Departamento nacimiento', 'required'], ['nacimiento_provincia_id', 'Provincia nacimiento', 'required'], ['nacimiento_distrito_id', 'Distrito nacimiento', 'required']],
    [['celular', 'Celular', 'required'], ['telefono_fijo', 'Teléfono fijo', 'optional'], ['email', 'Email', 'email'], ['domicilio', 'Domicilio', 'required'], ['numero_mz_lt', 'N° / Mz Lt', 'optional'], ['domicilio_departamento_id', 'Departamento domicilio', 'required'], ['domicilio_provincia_id', 'Provincia domicilio', 'required'], ['domicilio_distrito_id', 'Distrito domicilio', 'required']],
    [['grupo_sanguineo_id', 'Grupo sanguíneo', 'optional'], ['grado_instruccion_id', 'Grado de instrucción', 'optional'], ['color_ojos_id', 'Color de ojos', 'optional'], ['color_cabello_id', 'Color de cabello', 'optional'], ['estatura_cm', 'Estatura (cm)', 'number'], ['peso_kg', 'Peso (kg)', 'number'], ['ocupacion_id', 'Ocupación', 'optional'], ['senas_particulares', 'Señas particulares', 'optional']],
];
function studentDraft(row?: Row): Draft {
    return { ...Object.fromEntries(studentGroups.flat().map(([key]) => [key, value(row, key)])), ocupacion: value(row, 'ocupacion') };
}
function updateStudentDraft(draft: Draft, key: string, text: string): Draft {
    return { ...draft, [key]: text, ...(key === 'tipo_di_id' && text !== draft.tipo_di_id ? { numero_di: '' } : {}), ...(/departamento_id$/.test(key) ? { [key.replace('departamento', 'provincia')]: '', [key.replace('departamento', 'distrito')]: '' } : /provincia_id$/.test(key) ? { [key.replace('provincia', 'distrito')]: '' } : {}) };
}
const contactFields = [['apellido', 'Apellido contacto', 'required'], ['nombre', 'Nombre contacto', 'required'], ['parentesco_id', 'Parentesco', 'required'], ['celular', 'Celular contacto', 'required'], ['direccion', 'Dirección contacto', 'optional']];
export function OccupationField({ draft, change, options }: { draft: Draft; change: (key: string, text: string) => void; options: Row[] }) {
    const id = useId();
    const selected = options.find(r => r.id === draft.ocupacion_id);
    const available = options.filter(r => r.activo !== false || r.id === draft.ocupacion_id).sort((a, b) => Number(b.codigo === 'OTROS') - Number(a.codigo === 'OTROS') || Number(a.orden ?? 999) - Number(b.orden ?? 999));
    return <div data-field="ocupacion_id" className="occupation-field"><label htmlFor={id}>Ocupación</label>
        <select id={id} value={draft.ocupacion_id ?? ''} onChange={e => {
            const row = options.find(r => r.id === e.currentTarget.value);
            change('ocupacion_id', row?.id ?? '');
            change('ocupacion', row?.codigo === 'OTROS' ? '' : value(row, 'nombre'));
        }}><option value="">Seleccionar ocupación</option>{available.map(row => <option key={row.id} value={row.id} disabled={row.activo === false}>{value(row, 'nombre')}{row.activo === false ? ' (inactivo)' : ''}</option>)}</select>
        {selected?.codigo === 'OTROS' && <label>Especifica la ocupación *<input required maxLength={150} value={draft.ocupacion ?? ''} onChange={e => change('ocupacion', formTextValue(e.currentTarget))}/></label>}
        {!selected && draft.ocupacion && <small>Ocupación guardada anteriormente: {draft.ocupacion}. Selecciona una opción para actualizarla.</small>}
    </div>;
}
function occupationLabel(data: Record<string, unknown> | null | undefined, refs: Record<string, Row[]>) {
    const selected = refs.catalogo_valor?.find(r => r.id === data?.ocupacion_id);
    return selected?.codigo === 'OTROS' ? `OTROS — ${value(data, 'ocupacion')}` : value(selected, 'nombre') || value(data, 'ocupacion') || 'No indicado';
}
function Fields({ fields, draft, change, refs, readOnly = false }: {
    fields: string[][];
    readOnly?: boolean;
    draft: Draft;
    change: (key: string, v: string) => void;
    refs: Record<string, Row[]>;
}) {
    const id = useId();
    return <div className="form-grid">{fields.map(([key, label, kind]) => {
            if (readOnly) {
                const raw = draft[key] ?? '', geo = key.match(/_(departamento|provincia|distrito)_id$/);
                const text = key === 'ocupacion_id' ? occupationLabel(draft, refs) : catalogFields[key] ? value(refs.catalogo_valor?.find(r => r.id === raw), 'nombre') || (raw ? 'Referencia no disponible' : '') : geo ? value(refs[geo[1]]?.find(r => r.id === raw), 'nombre') || (raw ? 'Referencia no disponible' : '') : kind === 'date' && raw ? raw.split('-').reverse().join('/') : raw;
                return <label key={key} data-field={key}><span className="field-label">{label}</span>{key === 'senas_particulares' ? <textarea readOnly rows={3} value={text} placeholder="No indicado"/> : <input readOnly value={text} placeholder="No indicado"/>}</label>;
            }
            if (key === 'ocupacion_id') return <OccupationField key={key} draft={draft} change={change} options={(refs.catalogo_valor ?? []).filter(r => r.catalogo_id === refs.catalogo?.find(c => c.codigo === 'OCUPACION')?.id)}/>;
            if (key === 'senas_particulares') return <label key={key} data-field={key}><span className="field-label">{label}</span><textarea rows={3} maxLength={500} value={draft[key] ?? ''} onChange={e => change(key, formTextValue(e.currentTarget))}/></label>;
            const cat = catalogFields[key], required = kind === 'required' || kind === 'date';
            const rule = documentRule(key === 'ruc' ? 'RUC' : key === 'numero_di' ? value(refs.catalogo_valor?.find(v => v.id === draft.tipo_di_id), 'codigo') : '');
            let options: Row[] | undefined;
            if (cat)
                options = (refs.catalogo_valor ?? []).filter(v => v.catalogo_id === refs.catalogo?.find(c => c.codigo === cat)?.id);
            const geo = key.match(/^(nacimiento|domicilio)_(departamento|provincia|distrito)_id$/);
            if (geo)
                options = (refs[geo[2]] ?? []).filter(r => geo[2] === 'departamento' || value(r, geo[2] === 'provincia' ? 'departamento_id' : 'provincia_id') === draft[`${geo[1]}_${geo[2] === 'provincia' ? 'departamento' : 'provincia'}_id`]);
            const max = key === 'razon_social' ? 200 : key === 'codigo' ? 30 : key === 'descripcion' ? 500 : key === 'numero_di' ? 30 : /domicilio$|direccion|senas_particulares/.test(key) ? 500 : key === 'numero_mz_lt' ? 100 : key === 'email' ? 254 : /celular|telefono/.test(key) ? 30 : 150;
            return <label key={key} data-field={key}><span className="field-label">{label}{required ? ' *' : ''}</span>{options ? <select required={required} value={draft[key] ?? ''} onChange={e => change(key, formTextValue(e.currentTarget))}><option value="">Seleccionar</option>{options.map(r => <option key={r.id} value={r.id} disabled={r.activo === false || r.active === false}>{value(r, 'nombre')}{r.activo === false || r.active === false ? ' (inactivo)' : ''}</option>)}</select> : <input required={required} type={kind === 'date' ? 'date' : kind === 'number' ? 'number' : kind === 'email' ? 'email' : 'text'} step={kind === 'number' ? 'any' : undefined} min={kind === 'number' ? '0.000001' : undefined} max={kind === 'date' ? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }) : undefined} id={rule ? `${id}-${key}` : undefined} aria-describedby={rule ? `${id}-${key}-help` : undefined} disabled={key === 'numero_di' && !rule} inputMode={rule?.numeric ? 'numeric' : undefined} minLength={rule?.minLength} maxLength={rule?.maxLength ?? max} data-pattern-error={key === 'ruc' ? 'El RUC debe tener exactamente 11 dígitos.' : key === 'numero_di' ? 'DNI: exactamente 8 dígitos. Carné de extranjería: 1 a 30 caracteres alfanuméricos.' : undefined} pattern={rule?.pattern} value={draft[key] ?? ''} onChange={e => change(key, rule ? documentInputValue(e.currentTarget, rule.kind) : formTextValue(e.currentTarget))} onPaste={rule ? e => { e.preventDefault(); change(key, pasteDocumentValue(e.currentTarget, e.clipboardData.getData('text'), rule.kind)); } : undefined}/>} {rule && <small id={`${id}-${key}-help`}>{rule.hint}</small>}{key === 'numero_di' && !rule && <small>Selecciona primero el tipo de documento.</small>}</label>;
        })}</div>;
}
function StudentReview({ draft, refs, editing, contacts, contactsError, busy, correct, readOnly = false, studentCode, asOf }: {
    asOf?: string; studentCode?: string; draft: Draft; refs: Record<string, Row[]>; editing: boolean; contacts: Row[] | null; contactsError: string; busy: boolean; correct?: (step: number) => void; readOnly?: boolean;
}) {
    const id = useId();
    function display(data: Record<string, unknown>, key: string) {
        if (key === 'ocupacion_id') return occupationLabel(data, refs);
        const text = value(data, key).trim();
        if (!text) return 'No indicado';
        if (catalogFields[key]) return value(refs.catalogo_valor?.find(v => v.id === text), 'nombre') || 'Referencia no disponible';
        const geo = key.match(/_(departamento|provincia|distrito)_id$/);
        if (geo) return value(refs[geo[1]]?.find(v => v.id === text), 'nombre') || 'Referencia no disponible';
        if (key === 'fecha_nacimiento') return text.split('-').reverse().join('/');
        if (key === 'estatura_cm') return `${text} cm`;
        if (key === 'peso_kg') return `${text} kg`;
        return text;
    }
    function details(data: Record<string, unknown>, fields: string[][]) {
        return <dl className="review-fields">{fields.map(([key, label]) => <div key={key} className={['domicilio', 'direccion', 'senas_particulares'].includes(key) ? 'review-wide' : undefined}><dt>{label}</dt><dd className={!value(data, key).trim() ? 'review-empty' : undefined}>{display(data, key)}</dd></div>)}</dl>;
    }
    const titles = ['Identificación', 'Domicilio', 'Información adicional'];
    const entries: Record<string, unknown>[] = contacts ?? [];
    const noActiveContacts = !entries.some(c => !editing || c.activo === true);
    return <div className="student-review">{!readOnly && <p>Verifica los datos antes de guardar. Puedes corregir cada sección sin perder lo que ingresaste.</p>}
        <div className="review-identity"><strong>{draft.apellido_paterno} {draft.apellido_materno}, {draft.nombres}</strong><span>Código de Alumno: {studentCode || 'Se asignará al guardar'}</span><span>{display(draft, 'tipo_di_id')} · {draft.numero_di}</span></div>
        {studentGroups.map((fields, index) => <section className="review-section" key={titles[index]} aria-labelledby={`${id}-${index}`}><header className="review-section-heading"><h3 id={`${id}-${index}`}>{titles[index]}</h3>{correct && <button type="button" className="secondary" disabled={busy} aria-label={`Corregir ${titles[index].toLocaleLowerCase('es')}`} onClick={() => correct(index)}>Corregir</button>}</header>{details(draft, fields)}{index === 0 && <p className="review-age">Edad calculada: {ageAt(draft.fecha_nacimiento, asOf)} años</p>}</section>)}
        <section className="review-section" aria-labelledby={`${id}-contacts`}><header className="review-section-heading"><h3 id={`${id}-contacts`}>Contacto de emergencia</h3>{!editing && correct && <button type="button" className="secondary" disabled={busy} aria-label="Corregir contacto de emergencia" onClick={() => correct(3)}>Corregir</button>}</header>
            {editing && contacts === null && !contactsError && <p role="status">Consultando contactos guardados…</p>}
            {contactsError && <p role="alert">{contactsError}</p>}
            {entries.map((c, index) => <div className="review-contact" key={value(c, 'id') || index}><p><strong>Contacto {index + 1}</strong>{editing && <> · <StatusBadge value={c.activo ? 'Activo' : 'Inactivo'}/></>}</p>{details(c, contactFields)}</div>)}
            {(!editing || contacts !== null) && !contactsError && noActiveContacts && <p className="review-contact-notice">No hay un contacto de emergencia activo. Puedes guardar la ficha del alumno, pero para matricularlo necesitará al menos un contacto activo y válido.</p>}
            {editing && <p className="help-text">Los contactos guardados se conservan. Puedes administrarlos desde la pestaña Contactos de la ficha.</p>}
        </section>{!readOnly && <p className="help-text">{editing ? 'Los cambios se guardarán al confirmar.' : 'El alumno se creará únicamente al pulsar Guardar.'}</p>}
    </div>;
}
function NewStudentIcon() {
    return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M19 8v8M15 12h8"/></svg>;
}
function NewStudentLabel() {
    return <span className="icon-label"><NewStudentIcon/><span>Nuevo Alumno</span></span>;
}
export function StudentEditor({ initial, done, cancel }: {
    initial?: Row;
    done: (row: Row) => void;
    cancel: () => void;
}) {
    const { client } = useSession(), { refs, error } = useReferences();
    const [draft, setDraft] = useState<Draft>(() => studentDraft(initial));
    const [contact, setContact] = useState<Draft | null>(null), [draftContacts, setDraftContacts] = useState<Row[]>([]), [editingContactId, setEditingContactId] = useState<string | null>(null);
    const nextContactId = useRef(0);
    const [step, setStep] = useState(0), [saved, setSaved] = useState<Row | undefined>(initial);
    const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
    const [returnToReview, setReturnToReview] = useState(false), [reviewContacts, setReviewContacts] = useState<Row[] | null>(null), [contactsError, setContactsError] = useState('');
    useEffect(() => {
        if (!initial?.id || step !== 4) return;
        let active = true;
        setReviewContacts(null); setContactsError('');
        void (async () => {
            const result = await client.from('alumno_contacto_emergencia').select('id,apellido,nombre,parentesco_id,celular,direccion,activo').eq('alumno_id', initial.id).order('created_at');
            if (!active) return;
            if (result.error) { setContactsError('No se pudieron consultar los contactos guardados. Sus datos se conservarán.'); return; }
            setReviewContacts(result.data as Row[]);
        })().catch(() => { if (active) setContactsError('No se pudieron consultar los contactos guardados. Sus datos se conservarán.'); });
        return () => { active = false; };
    }, [client, initial?.id, step]);
    function correctReview(index: number) { setMessage(''); setReturnToReview(true); setStep(index); }
    function change(k: string, v: string) { setDraft(d => updateStudentDraft(d, k, v)); }
    async function save() {
        setBusy(true);
        setMessage('');
        try {
            const p = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v.trim() || null]));
            const result = await client.rpc('guardar_alumno', { p: { ...p, contactos: initial ? [] : draftContacts.map(c => Object.fromEntries(contactFields.map(([key]) => [key, value(c, key).trim() || null]))), ...(saved ? { id: saved.id, expected_updated_at: saved.updated_at } : {}) } });
            if (result.error) { setMessage(enrollmentError(result.error)); return; }
            const row = result.data as Row;
            setSaved(row);
            done(row);
        }
        catch {
            setMessage(enrollmentError(null));
        }
        finally {
            setBusy(false);
        }
    }
    return <section><EditorHeading>{initial ? 'Editar Alumno' : <NewStudentLabel/>}</EditorHeading><Steps names={['Identificación', 'Domicilio', 'Información adicional', 'Contacto de emergencia', 'Revisar']} step={step}/><Message>{error || message}</Message><InlineForm onSubmit={() => { if (step < 4) { setStep(returnToReview ? 4 : step + 1); setReturnToReview(false); } else void save(); }}>
    <fieldset disabled={busy || !refs.catalogo}><legend>{['Identificación', 'Domicilio', 'Información adicional', 'Contacto de emergencia', 'Revisar'][step]}</legend>
      {step < 3 && <Fields fields={studentGroups[step]} draft={draft} change={change} refs={refs}/>}
      {step === 0 && <p>Edad calculada: {ageAt(draft.fecha_nacimiento ?? '') || '—'}</p>}
      {step === 3 && (initial ? <p>Los contactos se mantienen desde la pestaña Contactos de la ficha.</p> : <><div className="student-contacts-heading"><p>Puedes guardar una ficha sin contactos; para matricular se exige al menos uno activo y válido.</p><button type="button" onClick={() => { setEditingContactId(null); setContact({}); }}>Agregar contacto</button></div><ContactGrid contacts={draftContacts} refs={refs} draft onEdit={c => { setEditingContactId(c.id); setContact(Object.fromEntries(contactFields.map(([key]) => [key, value(c, key)]))); }} onRemove={c => setDraftContacts(list => list.filter(item => item.id !== c.id))}/><p className="help-text">Los contactos de esta lista se guardarán junto con el alumno al pulsar Guardar al final de Revisar.</p></>)}
      {step === 4 && <StudentReview studentCode={value(initial, 'codigo_alumno')} draft={draft} refs={refs} editing={!!initial} contacts={initial ? reviewContacts : draftContacts} contactsError={contactsError} busy={busy} correct={correctReview}/> }
    </fieldset>{returnToReview && <p className="help-text">Al continuar conservarás lo corregido y volverás a Revisar. El alumno todavía no se guarda.</p>}<div className="form-actions"><button type="button" disabled={busy} onClick={cancel}>Cancelar</button>{step > 0 && <button type="button" disabled={busy} onClick={() => { setReturnToReview(false); setStep(step - 1); }}>Anterior</button>}<button disabled={busy || !refs.catalogo}>{step < 4 ? returnToReview ? 'Aplicar cambios y revisar' : 'Siguiente' : busy ? 'Guardando…' : 'Guardar'}</button></div></InlineForm>{contact && <ContactDialog close={() => setContact(null)}><InlineForm onSubmit={() => {
        const entry: Row = { ...contact, id: editingContactId ?? `draft-contact-${++nextContactId.current}`, activo: true };
        setDraftContacts(list => editingContactId ? list.map(c => c.id === editingContactId ? entry : c) : [...list, entry]);
        setContact(null); setEditingContactId(null);
    }}><h3>{editingContactId ? 'Editar contacto' : 'Agregar contacto'}</h3><p className="help-text">Se guardará junto con el alumno al confirmar el registro.</p><Fields fields={contactFields} draft={contact} change={(key, text) => setContact({ ...contact, [key]: text })} refs={refs}/><div className="form-actions"><button type="button" onClick={() => setContact(null)}>Cancelar</button><button>{editingContactId ? 'Aplicar cambios' : 'Agregar a la lista'}</button></div></InlineForm></ContactDialog>}</section>;
}
function StudentRowAction({ id, name, action }: { id: string; name: string; action: 'view' | 'edit' }) {
    const tooltip = useId(), [dismissed, setDismissed] = useState(false), label = action === 'view' ? 'Ver alumno' : 'Editar alumno';
    return <span className="toolbar-action" onMouseEnter={() => setDismissed(false)}><Link className="icon-action student-row-action" to={`/alumnos/${id}${action === 'edit' ? '?editar=1' : ''}`} aria-label={`${label}: ${name}`} aria-describedby={tooltip} onFocus={() => setDismissed(false)} onKeyDown={e => { if (e.key === 'Escape') setDismissed(true); }}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{action === 'view' ? <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></> : <><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z"/></>}</svg></Link><span id={tooltip} role="tooltip" className="toolbar-tooltip" hidden={dismissed}>{label}</span></span>;
}
export function Students() {
    const tooltipId = useId(), [tooltipDismissed, setTooltipDismissed] = useState(false);
    const { client, state } = useSession(), [rows, setRows] = useState<Row[]>([]), [search, setSearch] = useState(''), [page, setPage] = useState(0), [message, setMessage] = useState('Cargando…');
    const canEdit = state.roles?.some(role => ['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO'].includes(role));
    useEffect(() => {
        let active = true;
        let query = client.from('alumno').select('id,codigo_alumno,apellido_paterno,apellido_materno,nombres,numero_di,created_at').order('created_at', { ascending: false }).order('id', { ascending: false }).range(page * 30, page * 30 + 29);
        if (search.trim())
            query = query.or(studentSearchFilter(search));
        void query.then(r => { if (active) {
            setRows(r.error ? [] : r.data as Row[]);
            setMessage(r.error ? 'No se pudo consultar Alumnos.' : !r.data.length ? 'No hay alumnos para esta búsqueda.' : '');
        } });
        return () => { active = false; };
    }, [client, search, page]);
    return <section><h2>Alumnos</h2><div className="filters students-toolbar" role="search" aria-label="Búsqueda de alumnos"><label className="student-search"><span className="field-label">Buscar alumnos</span><span className="search-input"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input type="search" placeholder="Apellidos, nombres, documento o código de alumno" value={search} onChange={e => { setSearch(formTextValue(e.currentTarget)); setPage(0); }}/></span></label>{canEdit && <span className="toolbar-action" onMouseEnter={() => setTooltipDismissed(false)}><Link to="/alumnos/nuevo" className="icon-action" aria-labelledby={tooltipId} onFocus={() => setTooltipDismissed(false)} onKeyDown={e => { if (e.key === 'Escape') setTooltipDismissed(true); }}><NewStudentIcon/></Link><span id={tooltipId} role="tooltip" className="toolbar-tooltip" hidden={tooltipDismissed}>Nuevo Alumno</span></span>}</div><Message>{message}</Message><div className="students-grid"><table aria-label="Alumnos por fecha de registro descendente"><thead><tr><th scope="col">Código</th><th scope="col">Alumno</th><th scope="col">Documento</th><th scope="col" className="student-row-date">Registro ↓</th><th scope="col" className="student-actions-heading">Acciones</th></tr></thead><tbody>{rows.map(r => { const name = `${value(r, 'apellido_paterno')} ${value(r, 'apellido_materno')}, ${value(r, 'nombres')}`; return <tr key={r.id}><td className="student-row-document">{value(r, 'codigo_alumno')}</td><td><Link className="student-row-name" to={`/alumnos/${r.id}`}>{name}</Link></td><td className="student-row-document">{value(r, 'numero_di')}</td><td className="student-row-date">{r.created_at ? new Date(String(r.created_at)).toLocaleString('es-PE', { timeZone:'America/Lima', dateStyle:'short', timeStyle:'short' }) : '—'}</td><td><div className="student-row-actions"><StudentRowAction id={r.id} name={name} action="view"/>{canEdit && <StudentRowAction id={r.id} name={name} action="edit"/>}</div></td></tr>; })}</tbody></table></div><div className="student-list-pagination"><span>{rows.length ? `Página ${page + 1} · ${rows.length} alumnos` : `Página ${page + 1}`}</span><div className="pagination-actions"><button disabled={!page} onClick={() => setPage(page - 1)}>Anterior</button><button disabled={rows.length < 30} onClick={() => setPage(page + 1)}>Siguiente página</button></div></div></section>;
}
export function NewStudent() { const navigate=useNavigate(),[params]=useSearchParams(); const cycle=params.get('ciclo'); const back=cycle?`/academico/ciclos?ciclo=${encodeURIComponent(cycle)}&seccion=matriculas`:'/alumnos'; return <StudentEditor done={()=>navigate(back)} cancel={()=>navigate(back)}/>; }
function ContactAction({ label, name, remove = false, disabled, onClick }: { label: string; name: string; remove?: boolean; disabled: boolean; onClick: () => void }) {
    const id = useId(), [dismissed, setDismissed] = useState(false);
    return <span className="toolbar-action" onMouseEnter={() => setDismissed(false)}><button type="button" className="icon-action student-row-action" aria-label={`${label}: ${name}`} aria-describedby={id} disabled={disabled} onClick={onClick} onFocus={() => setDismissed(false)} onKeyDown={e => { if (e.key === 'Escape') setDismissed(true); }}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{remove ? <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 12h7"/></> : <><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z"/></>}</svg></button><span id={id} role="tooltip" className="toolbar-tooltip" hidden={dismissed}>{label}</span></span>;
}
function ContactGrid({ contacts, refs, disabled = false, draft = false, onEdit, onRemove }: { contacts: Row[]; refs: Record<string, Row[]>; disabled?: boolean; draft?: boolean; onEdit?: (contact: Row) => void; onRemove?: (contact: Row) => void }) {
    return <div className="table-scroll contacts-grid"><table aria-label="Contactos de emergencia"><thead><tr><th scope="col">Apellidos</th><th scope="col">Nombres</th><th scope="col">Parentesco</th><th scope="col">Celular</th><th scope="col">Dirección</th><th scope="col">Estado</th><th scope="col" className="student-actions-heading">Acciones</th></tr></thead><tbody>{contacts.map(c => { const name = `${value(c, 'apellido')} ${value(c, 'nombre')}`; return <tr key={c.id}><td>{value(c, 'apellido')}</td><td>{value(c, 'nombre')}</td><td>{value(refs.catalogo_valor?.find(v => v.id === c.parentesco_id), 'nombre') || 'Referencia no disponible'}</td><td className="student-row-document">{value(c, 'celular')}</td><td className="contact-address">{value(c, 'direccion') || 'No indicado'}</td><td><StatusBadge value={draft ? 'Por guardar' : c.activo ? 'Activo' : 'Inactivo'}/></td><td><div className="student-row-actions">{c.activo === true && (onEdit || onRemove) ? <>{onEdit && <ContactAction label="Editar contacto" name={name} disabled={disabled} onClick={() => onEdit(c)}/>} {onRemove && <ContactAction label={draft ? 'Quitar contacto' : 'Retirar contacto'} name={name} remove disabled={disabled} onClick={() => onRemove(c)}/>}</> : <span className="help-text">Sin acciones</span>}</div></td></tr>; })}{!contacts.length && <tr><td colSpan={7}>No hay contactos registrados.</td></tr>}</tbody></table></div>;
}
export function StudentDetail() {
    const { id } = useParams(), { client, state } = useSession(), { refs, error: referencesError } = useReferences();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const returnCycle=searchParams.get('ciclo');
    const returnPath=returnCycle?`/academico/ciclos?ciclo=${encodeURIComponent(returnCycle)}&seccion=matriculas`:'/alumnos';
    const [row, setRow] = useState<Row>(), [tab, setTab] = useState(1), [edit, setEdit] = useState(() => searchParams.get('editar') === '1');
    const [draft, setDraft] = useState<Draft | null>(null), [editVersion, setEditVersion] = useState<string>();
    const [contacts, setContacts] = useState<Row[]>([]), [contactsError, setContactsError] = useState(''), [enrollments, setEnrollments] = useState<Row[]>([]), [message, setMessage] = useState('Cargando…'), [revision, setRevision] = useState(0);
    const [contact, setContact] = useState<Draft | null>(null), [contactRow, setContactRow] = useState<Row>(), [busy, setBusy] = useState(false);
    const { ask, dialog } = useConfirmation(busy);
    const canEdit = state.roles?.some(role => ['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO'].includes(role));
    const editing = edit && !!canEdit;
    const studentDirty=editing&&!!row&&!!draft&&Object.entries(studentDraft(row)).some(([key,text])=>draft[key]!==text);
    function reloadAfterContact(){setDraft(null);setEditVersion(undefined);setRow(undefined);setRevision(v=>v+1)}
    useEffect(() => {
        let active = true;
        void Promise.all([client.from('alumno').select('*').eq('id', id).single(), client.from('alumno_contacto_emergencia').select('*').eq('alumno_id', id), client.from('matricula').select('id,codigo_matricula,estado_codigo').eq('alumno_id', id)]).then(([a, c, m]) => { if (active) {
            setRow(a.error ? undefined : a.data as Row);
            if (!a.error) { setDraft(previous => previous ?? studentDraft(a.data as Row)); setEditVersion(previous => previous ?? value(a.data, 'updated_at')); }
            setContacts(c.error ? [] : c.data as Row[]);
            setContactsError(c.error ? 'No se pudieron consultar los contactos guardados. Recarga la ficha.' : '');
            setEnrollments(m.error ? [] : m.data as Row[]);
            setMessage(a.error || c.error || m.error ? 'No se pudo cargar la ficha completa. Recarga.' : '');
        } }).catch(() => { if (active) setMessage('No se pudo cargar la ficha completa. Recarga.'); });
        return () => { active = false; };
    }, [client, id, revision]);
    function closeEditor() {
        setEdit(false); setDraft(null); setEditVersion(undefined); setMessage('');
        if (searchParams.has('editar')) { const next = new URLSearchParams(searchParams); next.delete('editar'); setSearchParams(next, { replace: true }); }
    }
    function beginEdit() { if (row) { setDraft(studentDraft(row)); setEditVersion(row.updated_at); setEdit(true); setMessage(''); } }
    async function saveStudent() {
        if (!row || !draft || !editing) return;
        setBusy(true); setMessage('');
        try {
            const p = Object.fromEntries(Object.entries(draft).map(([key, text]) => [key, text.trim() || null]));
            const result = await client.rpc('guardar_alumno', { p: { ...p, id: row.id, expected_updated_at: editVersion, contactos: [] } });
            if (result.error) { setMessage(enrollmentError(result.error)); return; }
            navigate(returnPath);
        } catch { setMessage(enrollmentError(null)); }
        finally { setBusy(false); }
    }
    async function saveContact() {
        if (!row || !contact || studentDirty || busy || !canEdit) return;
        setBusy(true);
        try {
            const r = await client.rpc('guardar_contacto_emergencia', { p: { ...contact, alumno_id: row.id, expected_alumno_updated_at: row.updated_at, ...(contactRow ? { id: contactRow.id, expected_updated_at: contactRow.updated_at } : {}) } });
            if (r.error) setMessage(enrollmentError(r.error));
            else { setContact(null); reloadAfterContact(); }
        } catch { setMessage(enrollmentError(null)); }
        finally { setBusy(false); }
    }
    async function retireContact(c: Row) {
        if (!row || studentDirty || busy || !canEdit) return;
        const ok = await ask({ title: 'Retirar contacto', description: 'El contacto quedará inactivo y su historia se conservará.' });
        if (ok === null) return;
        setBusy(true);
        try {
            const r = await client.rpc('retirar_contacto_emergencia', { id: c.id, expected_alumno_updated_at: row.updated_at });
            if (r.error) setMessage(enrollmentError(r.error)); else reloadAfterContact();
        } catch { setMessage(enrollmentError(null)); }
        finally { setBusy(false); }
    }
    const tabs = ['Resumen', 'Identificación', 'Domicilio', 'Información adicional', 'Contactos', 'Matrículas'];
    const current = editing ? draft ?? studentDraft(row) : studentDraft(row);
    function revealField(field: HTMLElement) { const panel = field.closest<HTMLElement>('[data-student-section]'); if (panel) setTab(Number(panel.dataset.studentSection)); }
    return <section className="student-detail"><EditorHeading>Ficha del alumno</EditorHeading><Message>{message || referencesError}</Message>{row && <><header className="student-detail-header"><div><h3>{value(row, 'apellido_paterno')} {value(row, 'apellido_materno')}, {value(row, 'nombres')}</h3><p>Código de Alumno: {value(row, 'codigo_alumno')}</p><p>{value(refs.catalogo_valor?.find(v => v.id === row.tipo_di_id), 'nombre') || 'Documento'} · {value(row, 'numero_di')} · {ageAt(value(row, 'fecha_nacimiento')) || '—'} años</p><small>{editing ? 'Modo edición. Puedes cambiar de pestaña sin perder lo ingresado. Guarda para confirmar los cambios.' : 'Consulta los datos registrados. Para modificarlos, selecciona Editar alumno.'}</small></div>{editing ? <span className="student-edit-mode" role="status">Editando alumno</span> : <div className="record-header-actions"><button type="button" className="secondary" onClick={() => navigate(returnPath)}>{returnCycle?'Volver a matrículas del Ciclo':'Volver a alumnos'}</button>{canEdit && <button type="button" onClick={beginEdit}>Editar alumno</button>}</div>}</header>
    <InlineForm key={editing ? 'editing' : 'viewing'} className="student-record-form" onInvalidField={revealField} onSubmit={() => { if (editing) void saveStudent(); }}>
        <div className="student-section-tabs" role="tablist" aria-label="Ficha Alumno">{tabs.map((name, i) => <button type="button" disabled={busy} key={name} role="tab" id={`student-tab-${i}`} aria-controls={`student-panel-${i}`} aria-selected={tab === i} tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)} onKeyDown={e => { const n = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1; if (n >= 0) { e.preventDefault(); setTab(n); document.getElementById(`student-tab-${n}`)?.focus(); } }}>{name}</button>)}</div>
        <div className="student-section-panel" role="tabpanel" hidden={tab !== 0} tabIndex={0} id="student-panel-0" aria-labelledby="student-tab-0"><h3>Resumen</h3><StudentReview studentCode={value(row, 'codigo_alumno')} draft={current} refs={refs} editing contacts={contactsError ? null : contacts} contactsError={contactsError} busy={busy} readOnly={!editing} correct={editing ? index => setTab(index + 1) : undefined}/></div>
        {studentGroups.map((fields, index) => <div className="student-section-panel" key={index} role="tabpanel" hidden={tab !== index + 1} tabIndex={0} id={`student-panel-${index + 1}`} aria-labelledby={`student-tab-${index + 1}`} data-student-section={index + 1}><h3>{tabs[index + 1]}</h3><fieldset disabled={busy || (editing && !refs.catalogo)}><Fields fields={fields} draft={current} refs={refs} change={(key, text) => setDraft(d => updateStudentDraft(d ?? current, key, text))} readOnly={!editing}/>{index === 0 && <p>Edad calculada: {ageAt(current.fecha_nacimiento) || '—'} años</p>}</fieldset></div>)}
        <div className="student-section-panel" role="tabpanel" hidden={tab !== 4} tabIndex={0} id="student-panel-4" aria-labelledby="student-tab-4"><div className="student-contacts-heading"><h3>Contactos</h3>{canEdit && <button type="button" disabled={busy || studentDirty} onClick={() => { setContactRow(undefined); setContact({}); }}>Agregar contacto</button>}</div>{studentDirty && <p className="help-text">Hay cambios pendientes en la ficha. Guarda o cancela esos cambios antes de modificar contactos; cada contacto se guarda por separado.</p>}<Message>{contactsError}</Message>
            <ContactGrid contacts={contacts} refs={refs} disabled={busy || studentDirty} onEdit={canEdit ? c => { setContactRow(c); setContact(Object.fromEntries(contactFields.map(([key]) => [key, value(c, key)]))); } : undefined} onRemove={canEdit ? c => void retireContact(c) : undefined}/>

        </div>
        <div className="student-section-panel" role="tabpanel" hidden={tab !== 5} tabIndex={0} id="student-panel-5" aria-labelledby="student-tab-5"><h3>Matrículas</h3>{!enrollments.length && <p>No hay matrículas registradas.</p>}<ul>{enrollments.map(m => <li key={m.id}><Link to={`/matriculas/${m.id}`}>{value(m, 'codigo_matricula')}</Link> — {value(m, 'estado_codigo')}</li>)}</ul></div>
        {editing && <div className="form-actions student-record-actions"><button type="button" disabled={busy} onClick={closeEditor}>Cancelar</button><button disabled={busy || !refs.catalogo}>{busy ? 'Guardando…' : 'Guardar cambios'}</button></div>}
    </InlineForm></>}{contact && <ContactDialog close={() => { if (!busy) setContact(null); }}><InlineForm onSubmit={() => void saveContact()}><h3>{contactRow ? 'Editar contacto' : 'Agregar contacto'}</h3><Fields fields={contactFields} draft={contact} change={(key, text) => setContact({ ...contact, [key]: text })} refs={refs}/><div className="form-actions"><button type="button" disabled={busy} onClick={() => setContact(null)}>Cancelar</button><button disabled={busy}>Guardar contacto</button></div></InlineForm></ContactDialog>}{dialog}</section>;
}
function ContactDialog({ close, children }: {
    close: () => void;
    children: ReactNode;
}) {
    const panel = useRef<HTMLDivElement>(null);
    useEffect(() => { const opener = document.activeElement as HTMLElement; const background = [...document.body.children].filter(x => !x.contains(panel.current)) as HTMLElement[]; background.forEach(x => { x.inert = true; }); panel.current?.querySelector<HTMLElement>('input,select,button')?.focus(); return () => { background.forEach(x => { x.inert = false; }); opener?.focus(); }; }, []);
    return createPortal(<div className="dialog-backdrop"><div ref={panel} role="dialog" aria-modal="true" aria-label="Contacto de emergencia" className="confirm-dialog contact-dialog" onKeyDown={e => { if (e.key === 'Escape')
        close(); if (e.key === 'Tab') {
        const items = [...panel.current!.querySelectorAll<HTMLElement>('input,select,button:not(:disabled)')];
        if (e.shiftKey && document.activeElement === items[0]) {
            e.preventDefault();
            items.at(-1)?.focus();
        }
        else if (!e.shiftKey && document.activeElement === items.at(-1)) {
            e.preventDefault();
            items[0]?.focus();
        }
    } }}>{children}</div></div>, document.body);
}
function CompanyAction({ action, name, disabled = false, onClick }: { action: 'new' | 'view' | 'edit' | 'choose'; name?: string; disabled?: boolean; onClick: () => void }) {
    const id = useId(), [dismissed, setDismissed] = useState(false);
    const label = { new:'Nueva empresa', view:'Ver empresa', edit:'Editar empresa', choose:'Elegir empresa' }[action];
    return <span className="toolbar-action" onMouseEnter={() => setDismissed(false)}><button type="button" className={`icon-action${action === 'new' ? '' : ' student-row-action'}`} aria-label={name ? `${label}: ${name}` : label} aria-describedby={id} disabled={disabled} onClick={onClick} onFocus={() => setDismissed(false)} onKeyDown={e => { if (e.key === 'Escape') setDismissed(true); }}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{action === 'view' ? <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></> : action === 'edit' ? <path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z"/> : action === 'choose' ? <path d="m5 12 4 4L19 6"/> : <><path d="M3 21V4h11v17M7 8h3M7 12h3M7 16h3M2 21h14M19 5v8M15 9h8"/></>}</svg></button><span id={id} role="tooltip" className="toolbar-tooltip" hidden={dismissed}>{label}</span></span>;
}
export function Companies({ choose }: { choose?: (r: Row | null) => void }) {
    const { client, state } = useSession(), [search, setSearch] = useState(''), [page, setPage] = useState(0), [rows, setRows] = useState<Row[]>([]);
    const [selected, setSelected] = useState<Row>(), [draft, setDraft] = useState<Draft>({}), [mode, setMode] = useState<'new' | 'view' | 'edit' | null>(null), [message, setMessage] = useState('Cargando…'), [revision, setRevision] = useState(0), [busy, setBusy] = useState(false);
    const canEdit = state.roles?.some(role => ['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO'].includes(role));
    useEffect(() => {
        let active = true;
        let q = client.from('empresa_patrocinadora').select('id,ruc,razon_social,persona_contacto,telefono,email,created_at,updated_at').order('created_at', { ascending:false }).order('id', { ascending:false }).range(page * 30, page * 30 + 29);
        if (search) q = /^\d/.test(search) ? q.ilike('ruc', `%${search}%`) : q.ilike('razon_social', `%${search}%`);
        void q.then(r => { if (active) { setRows(r.error ? [] : r.data as Row[]); setMessage(r.error ? 'No se pudieron consultar empresas.' : !r.data.length ? 'No hay empresas para esta búsqueda.' : ''); } });
        return () => { active = false; };
    }, [client, search, page, revision]);
    const fields = [['ruc','RUC','required'],['razon_social','Razón social','required'],['persona_contacto','Persona de contacto','optional'],['telefono','Teléfono / celular','optional'],['email','Email empresa','email']];
    function open(next: 'new' | 'view' | 'edit', row?: Row) {
        setSelected(row); setDraft(Object.fromEntries(fields.map(([key]) => [key,value(row,key)]))); setMode(next);
    }
    async function save() {
        if (!canEdit || mode === 'view') return;
        setBusy(true);
        try {
            const r = await client.rpc('guardar_empresa_patrocinadora', { p: { ...Object.fromEntries(Object.entries(draft).map(([key,text]) => [key,text.trim() || null])), ...(selected ? { id:selected.id,expected_updated_at:selected.updated_at } : {}) } });
            if (r.error) { setMessage(enrollmentError(r.error)); return; }
            const saved = r.data as Row;
            setSelected(saved); setDraft(Object.fromEntries(fields.map(([key]) => [key,value(saved,key)])));
            setMode(null); setMessage('Empresa guardada correctamente.'); setRevision(v => v + 1); choose?.(saved);
        } catch { setMessage(enrollmentError(null)); }
        finally { setBusy(false); }
    }
    function cancelEditing() {
        setMessage('');
        if (selected) { setDraft(Object.fromEntries(fields.map(([key]) => [key,value(selected,key)]))); setMode('view'); }
        else setMode(null);
    }
    if (mode) return <section className="company-record"><EditorHeading>{mode === 'new' ? 'Nueva empresa' : 'Ficha de empresa patrocinadora'}</EditorHeading><Message>{message}</Message>
        <header className="student-detail-header"><div>{selected && <><h3>{value(selected,'razon_social')}</h3><p>RUC · {value(selected,'ruc')}</p></>}<small>{mode === 'view' ? 'Consulta los datos registrados. Para modificarlos, selecciona Editar empresa.' : 'Los cambios se guardarán al confirmar Guardar empresa.'}</small></div><div className="record-header-actions">{mode === 'view' ? <><button type="button" className="secondary" onClick={() => { setMessage(''); setMode(null); }}>Volver a empresas</button>{canEdit && <button type="button" onClick={() => setMode('edit')}>Editar empresa</button>}{choose && selected && <button type="button" onClick={() => choose(selected)}>Elegir empresa</button>}</> : <span className="student-edit-mode">{mode === 'new' ? 'Nueva empresa' : 'Editando empresa'}</span>}</div></header>
        <InlineForm key={`${selected?.id ?? 'new'}-${mode}`} onSubmit={() => void save()}><fieldset disabled={busy}><Fields fields={fields} draft={draft} change={(key,text) => setDraft(d => ({...d,[key]:text}))} refs={{}} readOnly={mode === 'view'}/></fieldset>{mode !== 'view' && <div className="form-actions"><button type="button" disabled={busy} onClick={cancelEditing}>Cancelar</button><button disabled={busy}>{busy ? 'Guardando…' : 'Guardar empresa'}</button></div>}</InlineForm>
    </section>;
    return <section><h2>Empresa patrocinadora</h2><div className="filters students-toolbar" role="search" aria-label="Búsqueda de empresas"><label className="student-search"><span className="field-label">Buscar empresas</span><span className="search-input"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input type="search" placeholder="RUC o razón social" value={search} onChange={e => { setSearch(formTextValue(e.currentTarget)); setPage(0); }}/></span></label>{canEdit && <CompanyAction action="new" disabled={busy} onClick={() => open('new')}/>}</div><Message>{message}</Message>{choose && <div className="company-selection-actions"><button type="button" className="secondary" disabled={busy} onClick={() => choose(null)}>Sin patrocinador</button></div>}
        <div className="students-grid companies-grid"><table aria-label="Empresas patrocinadoras por fecha de registro descendente"><thead><tr><th scope="col">Empresa</th><th scope="col">RUC</th><th scope="col" className="student-row-date">Registro ↓</th><th scope="col">Contacto</th><th scope="col">Teléfono</th><th scope="col">Email</th><th scope="col" className="student-actions-heading">Acciones</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td><button type="button" className="student-row-name company-row-name" onClick={() => open('view',r)}>{value(r,'razon_social')}</button></td><td className="student-row-document">{value(r,'ruc')}</td><td className="student-row-date">{r.created_at ? new Date(String(r.created_at)).toLocaleString('es-PE',{timeZone:'America/Lima',dateStyle:'short',timeStyle:'short'}) : '—'}</td><td>{value(r,'persona_contacto') || 'No indicado'}</td><td>{value(r,'telefono') || 'No indicado'}</td><td>{value(r,'email') || 'No indicado'}</td><td><div className="student-row-actions"><CompanyAction action="view" name={value(r,'razon_social')} disabled={busy} onClick={() => open('view',r)}/>{canEdit && <CompanyAction action="edit" name={value(r,'razon_social')} disabled={busy} onClick={() => open('edit',r)}/>} {choose && <CompanyAction action="choose" name={value(r,'razon_social')} disabled={busy} onClick={() => choose(r)}/>}</div></td></tr>)}</tbody></table></div>
        <div className="student-list-pagination"><span>{rows.length ? `Página ${page + 1} · ${rows.length} empresas` : `Página ${page + 1}`}</span><div className="pagination-actions"><button disabled={!page || busy} onClick={() => setPage(v => v - 1)}>Anterior</button><button disabled={rows.length < 30 || busy} onClick={() => setPage(v => v + 1)}>Siguiente página</button></div></div>

    </section>;
}
export function NewEnrollment({cycleContext,onComplete,onCancel,onEditorChange}:{cycleContext?:Row;onComplete?:(row:Row)=>void;onCancel?:()=>void;onEditorChange?:(editing:boolean)=>void}={}) {
    const { client, state }=useSession(), navigate=useNavigate();
    const [cycles,setCycles]=useState<Row[]>([]),[cycle,setCycle]=useState<Row|undefined>(cycleContext),[student,setStudent]=useState<Row>(),[company,setCompany]=useState<Row|null>(null),[charges,setCharges]=useState<Row[]>([]),[options,setOptions]=useState<string[]>([]);
    const [tab,setTab]=useState(0),[search,setSearch]=useState(''),[found,setFound]=useState<Row[]>([]),[searchStatus,setSearchStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle');
    const [editor,setEditor]=useState(false),[editing,setEditing]=useState(false),[choosingCompany,setChoosingCompany]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[registered,setRegistered]=useState<Row>(),[discount,setDiscount]=useState('0'),[reason,setReason]=useState(''),[code,setCode]=useState('');
    const [tariffsStatus,setTariffsStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle');
    const studentSearch=useRef<HTMLInputElement>(null);
    const director=state.roles?.includes('DIRECTOR_ACADEMICO');
    useEffect(()=>{onEditorChange?.(editor);return()=>onEditorChange?.(false)},[editor,onEditorChange]);
    useEffect(()=>{if(cycleContext)return;let active=true;void client.from('ciclo').select('id,codigo_ciclo,carrera_id,estado_codigo,updated_at').in('estado_codigo',['PROGRAMADO','EN_CURSO']).order('codigo_ciclo').then(r=>{if(active){setCycles(r.error?[]:r.data as Row[]);if(r.error)setMessage('No se pudieron cargar Ciclos.')}});return()=>{active=false}},[client,cycleContext]);
    useEffect(()=>{
        let active=true;
        if(!cycle)return;
        setTariffsStatus('loading');
        void client.from('ciclo_tarifa').select('id,tarifa_id,importe,obligatorio,activo,tarifa(codigo,nombre,tipo,activo)').eq('ciclo_id',cycle.id).eq('activo',true).then(r=>{
            if(!active)return;
            setCharges(r.error?[]:(r.data as Row[]).filter(x=>(x.tarifa as Record<string,unknown>)?.activo));setTariffsStatus(r.error?'error':'ready');
        });return()=>{active=false};
    },[client,cycle]);
    useEffect(()=>{
        let active=true;setFound([]);
        if(search.trim().length<2){setSearchStatus('idle');return}
        setSearchStatus('loading');
        const timer=setTimeout(()=>{
            void client.from('alumno').select('id,codigo_alumno,apellido_paterno,apellido_materno,nombres,numero_di,updated_at').or(studentSearchFilter(search)).order('apellido_paterno').order('nombres').limit(20).then(r=>{if(active){setFound(r.error?[]:r.data as Row[]);setSearchStatus(r.error?'error':'ready')}});
        },300);
        return()=>{active=false;clearTimeout(timer)};
    },[client,search]);
    async function chooseStudent(id:string){
        setBusy(true);
        try{if(cycleContext){const existing=await client.from('matricula').select('id').eq('ciclo_id',cycleContext.id).eq('alumno_id',id).limit(1);if(existing.error){setMessage('No se pudo comprobar la matrícula del Alumno. Vuelve a seleccionarlo.');return}if(existing.data.length){setMessage('El Alumno ya tiene una matrícula en este Ciclo, incluso si está anulada. Consulta la grilla de matriculados.');return}}const r=await client.from('alumno').select('*').eq('id',id).single();if(r.error)setMessage('No se pudo cargar la ficha del Alumno. Vuelve a seleccionarlo.');else{setStudent(r.data as Row);setSearch('');setFound([]);setCompany(null);setOptions([]);setDiscount('0');setReason('');setCode('')}}
        catch{setMessage('No se pudo cargar la ficha del Alumno. Vuelve a seleccionarlo.')}
        finally{setBusy(false)}
    }
    function chooseCycle(id:string){
        if(id===cycle?.id)return;
        setCycle(cycles.find(c=>c.id===id));setCharges([]);setOptions([]);setDiscount('0');setReason('');setTariffsStatus(id?'loading':'idle');
        if(cycle)setMessage('Al cambiar de Ciclo se actualizarán los cargos; los opcionales y el descuento se reiniciaron.');
    }
    async function confirm(){
        if(!cycle || !student){setMessage('Selecciona el Ciclo y el Alumno antes de confirmar.');setTab(0);setTimeout(()=>studentSearch.current?.focus(),0);return}
        if(tariffsStatus!=='ready' || !charges.length){setMessage('Revisa los cargos del Ciclo antes de confirmar.');setTab(1);return}
        setBusy(true);const p={ciclo_id:cycle.id,expected_ciclo_updated_at:cycle.updated_at,alumno_id:student.id,expected_alumno_updated_at:student.updated_at,empresa_patrocinadora_id:company?.id??null,...(code?{codigo_matricula:code}:{}),...(director?{descuento:discount,motivo_descuento:reason}:{})};
        try{const r=await client.rpc('registrar_matricula',{p,opcionales:options});if(r.error)setMessage(enrollmentError(r.error));else{if(onComplete)onComplete(r.data as Row);else{setRegistered(r.data as Row);setMessage('Matrícula registrada correctamente.')}}}
        catch{setMessage('Respuesta no confirmada. Consulta el historial del Alumno antes de reintentar.')}
        finally{setBusy(false)}
    }
    async function another(){
        if(!cycle)return;
        const r=await client.from('ciclo').select('id,codigo_ciclo,carrera_id,estado_codigo,updated_at').eq('id',cycle.id).single();
        if(r.error || !['PROGRAMADO','EN_CURSO'].includes(r.data.estado_codigo)){setMessage('El Ciclo ya no permite matrícula. Selecciona otro.');setCycle(undefined);setCharges([]);setTariffsStatus('idle')}
        else{setCycle(r.data as Row);setCharges([]);setTariffsStatus('loading')}
        setTab(0);setStudent(undefined);setCompany(null);setOptions([]);setDiscount('0');setReason('');setCode('');setSearch('');setFound([]);setRegistered(undefined);setChoosingCompany(false);
    }
    const studentName=(a:Row)=>`${value(a,'apellido_paterno')} ${value(a,'apellido_materno')}, ${value(a,'nombres')}`;
    const chosenCharges=charges.filter(c=>c.obligatorio===true || options.includes(c.id));
    if(editor)return <StudentEditor initial={editing?student:undefined} done={r=>{setStudent(r);setEditor(false);setMessage('Alumno guardado; revisa contactos antes de confirmar matrícula.')}} cancel={()=>setEditor(false)}/>;
    if(registered)return <section><h2>Matrícula registrada</h2><p>{value(registered,'codigo_matricula')}</p><button onClick={()=>void another()}>Matricular otro alumno en este Ciclo</button><button onClick={()=>navigate(`/matriculas/${registered.id}`)}>Ver matrícula</button></section>;
    const content=<section className="enrollment-record">{!cycleContext && <EditorHeading>Registrar Matrícula</EditorHeading>}
        {!cycleContext && <header className="enrollment-context"><span><strong>Ciclo:</strong> {cycle?value(cycle,'codigo_ciclo'):'Sin seleccionar'}</span><span><strong>Alumno:</strong> {student?`${studentName(student)} · ${value(student,'numero_di')}`:'Sin seleccionar'}</span></header>}
        {!cycleContext && <AcademicTabs id="enrollment-sections" names={['Datos de matrícula','Cargos','Resumen']} active={tab} disabled={busy} onChange={setTab}/>}<Message>{message}</Message>
        <InlineForm className="enrollment-record-form" onInvalidField={field=>setTab(Number(field.closest<HTMLElement>('[data-enrollment-tab]')?.dataset.enrollmentTab??0))} onSubmit={()=>{if(cycleContext || tab===2)void confirm()}}>
            <div hidden={!cycleContext && tab!==0} data-enrollment-tab="0" role={cycleContext?'region':'tabpanel'} id="enrollment-sections-panel-0" aria-label={cycleContext?'Alumno':undefined} aria-labelledby={cycleContext?undefined:'enrollment-sections-tab-0'} tabIndex={0} className="student-section-panel">
                <fieldset disabled={busy}><legend>{cycleContext?'Alumno':'Datos de matrícula'}</legend>
                    {!cycleContext && <label>Ciclo *<select aria-label="Ciclo" required value={cycle?.id??''} onChange={e=>chooseCycle(formTextValue(e.currentTarget))}><option value="">Seleccionar Ciclo</option>{cycles.map(c=><option key={c.id} value={c.id}>{value(c,'codigo_ciclo')} — {value(c,'estado_codigo')}</option>)}</select></label>}
                    {(!cycleContext || !student) && <div className="enrollment-student-search"><label><span>Buscar Alumno</span><span className="search-input"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input ref={studentSearch} type="search" maxLength={150} placeholder="Apellidos, nombres o número de documento" value={search} onChange={e=>setSearch(formTextValue(e.currentTarget))} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault()}}/></span></label>
                        {searchStatus==='idle' && <small>Escribe al menos 2 caracteres. Las coincidencias aparecen mientras escribes.</small>}
                        {searchStatus==='loading' && <p role="status">Buscando alumnos…</p>}
                        {searchStatus==='error' && <p role="alert">No se pudo buscar alumnos. Modifica la búsqueda para volver a consultar.</p>}
                        {searchStatus==='ready' && <>{cycleContext ? <ul className="enrollment-pupil-matches" aria-label="Coincidencias de alumnos">{found.map(a=><li key={a.id}><div><strong>{studentName(a)}</strong><small>{value(a,'codigo_alumno')} · {value(a,'numero_di')}</small></div><button type="button" className="secondary" onClick={()=>void chooseStudent(a.id)}>Seleccionar</button></li>)}{!found.length && <li>No hay alumnos que coincidan. Puedes registrar uno nuevo.</li>}</ul> : <div className="table-scroll"><table aria-label="Resultados de alumnos"><thead><tr><th>Alumno</th><th>Documento</th><th>Acción</th></tr></thead><tbody>{found.map(a=><tr key={a.id}><td>{studentName(a)}<small className="secondary-text">{value(a,'codigo_alumno')}</small></td><td>{value(a,'numero_di')}</td><td><button type="button" onClick={()=>void chooseStudent(a.id)}>Seleccionar Alumno</button></td></tr>)}{!found.length && <tr><td colSpan={3}>No hay alumnos que coincidan. Puedes registrar uno nuevo.</td></tr>}</tbody></table></div>}{found.length===20 && <small>Se muestran hasta 20 coincidencias. Escribe más para precisar la búsqueda.</small>}</>}
                    </div>}
                    {(!cycleContext || !student) && <button type="button" className="secondary" onClick={()=>{setEditing(false);setEditor(true)}}><NewStudentLabel/></button>}
                    {student && <div className="enrollment-selected-student"><strong>{value(student,'codigo_alumno')} · {studentName(student)}</strong><span>{value(student,'numero_di')}</span><div className="record-header-actions">{cycleContext && <button type="button" className="secondary" onClick={()=>{setStudent(undefined);setCompany(null);setOptions([]);setDiscount('0');setReason('');setCode('');setSearch('')}}>Cambiar alumno</button>}<button type="button" className="secondary" onClick={()=>{setEditing(true);setEditor(true)}}>Completar / editar ficha</button><Link to={`/alumnos/${student.id}`}>Ver ficha y contactos</Link></div></div>}
                    {(!cycleContext || student) && <div><h3>Empresa patrocinadora (opcional)</h3><p>{company?value(company,'razon_social'):'Sin patrocinador'}</p><div className="record-header-actions"><button type="button" className="secondary" onClick={()=>setChoosingCompany(true)}>Elegir empresa</button>{company && <button type="button" className="secondary" onClick={()=>setCompany(null)}>Quitar patrocinador</button>}</div></div>}
                </fieldset>
            </div>
            <div hidden={cycleContext?!student:tab!==1} data-enrollment-tab="1" role={cycleContext?'region':'tabpanel'} id="enrollment-sections-panel-1" aria-label={cycleContext?'Cargos':undefined} aria-labelledby={cycleContext?undefined:'enrollment-sections-tab-1'} tabIndex={0} className="student-section-panel"><h3>Cargos</h3>
                {!cycle && <p>Selecciona un Ciclo en Datos de matrícula para consultar los cargos.</p>}
                {tariffsStatus==='loading' && <p role="status">Cargando cargos del Ciclo…</p>}
                {tariffsStatus==='error' && <p role="alert">No se pudieron cargar los cargos. Vuelve a seleccionar el Ciclo antes de confirmar.</p>}
                {cycle && tariffsStatus==='ready' && !charges.length && <p role="alert">El Ciclo no tiene tarifas activas disponibles. Revisa su configuración.</p>}
                <fieldset disabled={busy || tariffsStatus!=='ready'}><legend>Tarifas del Ciclo</legend>{charges.map(c=><label key={c.id}><input type="checkbox" disabled={c.obligatorio===true} checked={c.obligatorio===true || options.includes(c.id)} onChange={e=>setOptions(e.target.checked?[...options,c.id]:options.filter(id=>id!==c.id))}/>{value(c.tarifa as Record<string,unknown>,'nombre')} — S/{value(c,'importe')} {c.obligatorio?'(Obligatoria)':'(Opcional)'}</label>)}
                    {director && <><label>Descuento Carrera (S/)<input type="number" min="0" step="0.01" value={discount} onChange={e=>setDiscount(formTextValue(e.currentTarget))}/></label><label>Motivo descuento (sin datos personales)<textarea rows={2} required={Number(discount)>0} maxLength={500} value={reason} onChange={e=>setReason(formTextValue(e.currentTarget))}/></label></>}
                </fieldset>
            </div>
            <div hidden={cycleContext?!student:tab!==2} data-enrollment-tab="2" role={cycleContext?'region':'tabpanel'} id="enrollment-sections-panel-2" aria-label={cycleContext?'Confirmación':undefined} aria-labelledby={cycleContext?undefined:'enrollment-sections-tab-2'} tabIndex={0} className="student-section-panel"><h3>{cycleContext?'Confirmación':'Resumen'}</h3>
                {!cycleContext && <><dl className="review-fields"><div><dt>Ciclo</dt><dd>{cycle?value(cycle,'codigo_ciclo'):'Sin seleccionar'}</dd></div><div><dt>Alumno</dt><dd>{student?`${studentName(student)} · ${value(student,'numero_di')}`:'Sin seleccionar'}</dd></div><div><dt>Patrocinador</dt><dd>{company?value(company,'razon_social'):'Sin patrocinador'}</dd></div></dl>
                <div className="table-scroll"><table aria-label="Resumen de cargos"><thead><tr><th>Concepto</th><th>Importe</th></tr></thead><tbody>{chosenCharges.map(c=><tr key={c.id}><td>{value(c.tarifa as Record<string,unknown>,'nombre')}</td><td>S/{value(c,'importe')}</td></tr>)}</tbody></table></div></>}
                <p>Descuento solicitado: S/{discount}. Total de referencia: S/{(chosenCharges.reduce((sum,c)=>sum+Number(c.importe),0)-Number(discount)).toFixed(2)}.</p><p className="help-text">El servidor valida y calcula los cargos definitivos al confirmar. Todavía no se ha registrado una matrícula.</p>
                <label>Código manual opcional<input value={code} pattern="[0-9]{4}-[A-Za-z0-9]{2,10}-[0-9]{3,}" data-pattern-error="Usa YYYY-SIGLA-CORRELATIVO, sigla alfanumérica de 2 a 10 y correlativo de al menos 3 dígitos." onChange={e=>setCode(formTextValue(e.currentTarget))}/></label>
            </div>
            <div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={()=>onCancel?onCancel():navigate('/alumnos')}>Cancelar</button>{(cycleContext?!!student:tab===2) && <button disabled={busy || tariffsStatus==='loading'}>{busy?'Registrando…':'Confirmar matrícula'}</button>}</div>
        </InlineForm>
        {(cycleContext || tab===0) && choosingCompany && <section><div className="record-header-actions"><button type="button" className="secondary" onClick={()=>setChoosingCompany(false)}>Cerrar selección de empresa</button></div><Companies choose={r=>{setCompany(r);setChoosingCompany(false)}}/></section>}
    </section>;
    return cycleContext && onCancel ? <EnrollmentDrawer title={`Matricular alumno en ${value(cycleContext,'codigo_ciclo')}`} busy={busy} close={onCancel}>{content}</EnrollmentDrawer> : content;
}
export function EnrollmentDetail() {
    const navigate=useNavigate();
    const [discountOpen,setDiscountOpen]=useState(false);
    const [changingCycle,setChangingCycle]=useState(false);
    const initializedCharges=useRef(false);
    const { id } = useParams(), { client, state } = useSession(), [row, setRow] = useState<Row>(), [student, setStudent] = useState<Row>(), [cycle, setCycle] = useState<Row>(), [cycles, setCycles] = useState<Row[]>([]), [charges, setCharges] = useState<Row[]>([]), [tariffs, setTariffs] = useState<Row[]>([]), [options, setOptions] = useState<string[]>([]), [target, setTarget] = useState(''), [code, setCode] = useState(''), [discount, setDiscount] = useState(''), [reason, setReason] = useState(''), [message, setMessage] = useState('Cargando…'), [revision, setRevision] = useState(0), [busy, setBusy] = useState(false), [tab,setTab]=useState(0),[choosingCompany,setChoosingCompany]=useState(false),[sponsor,setSponsor]=useState<Row|null>(null),[detailsReady,setDetailsReady]=useState(false),[tariffStatus,setTariffStatus]=useState<'idle'|'loading'|'ready'|'error'>('idle');
    const [searchParams,setSearchParams]=useSearchParams(),[editing,setEditing]=useState(searchParams.get('editar')==='1');
    const { ask, dialog } = useConfirmation(busy), director = state.roles?.includes('DIRECTOR_ACADEMICO');
    useEffect(() => { let active = true; void (async () => { const r = await client.from('matricula').select('*').eq('id', id).single(); if (!active)
        return; if (r.error) {
        setRow(undefined);
        setMessage('No se pudo cargar matrícula.');
        return;
    } const m = r.data as Row; const [a, c, cs, ch, company] = await Promise.all([client.from('alumno').select('id,nombres,apellido_paterno,apellido_materno,numero_di,domicilio').eq('id', String(m.alumno_id)).single(), client.from('ciclo').select('id,codigo_ciclo,estado_codigo,updated_at').eq('id', String(m.ciclo_id)).single(), client.from('ciclo').select('id,codigo_ciclo,estado_codigo,updated_at').in('estado_codigo', ['PROGRAMADO', 'EN_CURSO']), client.from('matricula_cargo').select('*').eq('matricula_id', id).order('created_at'),m.empresa_patrocinadora_id?client.from('empresa_patrocinadora').select('id,razon_social,ruc').eq('id',String(m.empresa_patrocinadora_id)).single():Promise.resolve({data:null,error:null})]); if (!active)
        return;setSponsor(company.error?null:company.data as Row|null);setDetailsReady(!a.error&&!c.error&&!cs.error&&!ch.error&&!company.error); setRow(m); setStudent(a.error ? undefined : a.data as Row); setCycle(c.error ? undefined : c.data as Row); setCycles(cs.error ? [] : cs.data as Row[]); setCharges(ch.error ? [] : ch.data as Row[]); setTarget(String(m.ciclo_id)); setCode(String(m.codigo_matricula)); setDiscount(''); setReason(''); setMessage(a.error || c.error || cs.error || ch.error || company.error ? 'No se pudo cargar detalle completo. Recarga.' : ''); })().catch(() => { if (active)
        setMessage('No se pudo consultar detalle.'); }); return () => { active = false; }; }, [client, id, revision]);
    useEffect(() => { let active = true; if (!target)
        return;setTariffStatus('loading'); void client.from('ciclo_tarifa').select('id,importe,obligatorio,tarifa(nombre,tipo,activo)').eq('ciclo_id', target).eq('activo', true).then(r => { if (active) {
        setTariffStatus(r.error?'error':'ready');setTariffs(r.error ? [] : (r.data as Row[]).filter(x => (x.tarifa as Record<string, unknown>)?.activo));
        setOptions(!initializedCharges.current || target!==row?.ciclo_id ? (r.error?[]:(r.data as Row[]).filter(x=>(x.tarifa as Record<string,unknown>)?.activo).map(x=>x.id)) : charges.filter(x=>x.activo).map(x=>String(x.ciclo_tarifa_id)));if(!r.error)initializedCharges.current=true;
    } }); return () => { active = false; }; }, [client, target, row, charges]);
    const editable = detailsReady && row?.estado_codigo === 'ACTIVO' && ['PROGRAMADO', 'EN_CURSO'].includes(value(cycle, 'estado_codigo'));
    async function save(extra: Draft = {}, selected?: string[]) { if (!row || !editing || !editable || (selected && tariffStatus!=='ready'))
        return; setBusy(true); const destination = target === cycle?.id ? cycle : cycles.find(c => c.id === target); const p = { id: row.id, expected_updated_at: row.updated_at, ...extra, ...(selected ? { ciclo_id: target, expected_ciclo_updated_at: destination?.updated_at } : {}) }; const r = await client.rpc('editar_matricula', { p, ...(selected ? { opcionales: selected } : {}) }); setBusy(false); if (r.error)
        setMessage(enrollmentError(r.error));
    else {
        if(selected)setChangingCycle(false);if('empresa_patrocinadora_id' in extra)setChoosingCompany(false);if('descuento' in extra)setDiscountOpen(false);setRevision(revision + 1);
        setMessage('Matrícula actualizada.');
    } }
    async function annul() { if (!row)
        return; const reason = await ask({ title: 'Anular matrícula', description: 'La anulación es terminal. Conserva toda la historia.', reason: true, sensitive: true }); if (reason === null)
        return; setBusy(true); const r = await client.rpc('anular_matricula', { id: row.id, expected_updated_at: row.updated_at, motivo: reason }); setBusy(false); if (r.error)
        setMessage(enrollmentError(r.error));
    else
        setRevision(revision + 1); }
    function leaveEdit(){setChangingCycle(false);setDiscountOpen(false);setEditing(false);setChoosingCompany(false);setCode(value(row,'codigo_matricula'));setTarget(value(row,'ciclo_id'));setDiscount('');setReason('');setOptions(charges.filter(c=>c.activo).map(c=>String(c.ciclo_tarifa_id)));const next=new URLSearchParams(searchParams);next.delete('editar');setSearchParams(next,{replace:true})}
    const back=()=>navigate(row?`/academico/ciclos?ciclo=${String(row.ciclo_id)}&seccion=matriculas`:'/academico/ciclos');
    const careerCharge=charges.find(c=>c.activo&&c.tipo==='CARRERA');
    function closeDiscount(){setDiscountOpen(false);setDiscount('');setReason('')}
    const money=(amount:unknown)=>`S/${Number(amount??0).toFixed(2)}`;
    const chargeRows=tariffs.map(t=>{
        const existing=target===row?.ciclo_id?charges.find(c=>c.activo&&c.ciclo_tarifa_id===t.id):undefined;
        return {id:t.id,name:value(existing,'nombre')||value(t.tarifa as Record<string,unknown>,'nombre'),required:t.obligatorio===true,selected:t.obligatorio===true||options.includes(t.id),original:Number(existing?.importe_original??t.importe),discount:Number(existing?.descuento??0)};
    });
    const pendingCharges=target!==row?.ciclo_id||tariffs.some(t=>!t.obligatorio&&options.includes(t.id)!==charges.some(c=>c.activo&&c.ciclo_tarifa_id===t.id));
    const extraCharges=target===row?.ciclo_id?charges.filter(c=>c.activo&&!tariffs.some(t=>t.id===c.ciclo_tarifa_id)):[];
    const previewSubtotal=chargeRows.filter(c=>c.selected).reduce((n,c)=>n+Math.round(c.original*100),0)+extraCharges.reduce((n,c)=>n+Math.round(Number(c.importe_original)*100),0);
    const previewDiscount=chargeRows.filter(c=>c.selected).reduce((n,c)=>n+Math.round(c.discount*100),0)+extraCharges.reduce((n,c)=>n+Math.round(Number(c.descuento)*100),0);
    const chargeTable=(items:Row[],historical=false)=><div className="table-scroll enrollment-saved-charges"><table aria-label={historical?'Cargos retirados':'Cargos vigentes'}><thead><tr><th>Concepto</th><th>Original</th><th>Descuento</th><th>Total</th><th>{historical?'Motivo de retiro':'Estado'}</th></tr></thead><tbody>{items.map(c=><tr key={c.id}><td>{value(c,'nombre')}</td><td>{money(c.importe_original)}</td><td>{money(c.descuento)}</td><td>{money(c.importe_final)}</td><td>{historical?value(c,'motivo_inactivacion').replaceAll('_',' '):'Activo'}</td></tr>)}{!items.length&&<tr><td colSpan={5}>{historical?'No hay cargos retirados.':'No hay cargos vigentes.'}</td></tr>}</tbody></table></div>;
    return <section className="academic-record enrollment-detail">{dialog}
      <AcademicRecordHeader title="Ficha de matrícula" name={value(row,'codigo_matricula')} status={row&&<StatusBadge value={row.estado_codigo==='ACTIVO'?'Activa':'Anulada'}/>} editing={!!editing&&!!editable} busy={busy} backLabel="Volver a matrículas del Ciclo" editLabel="Editar matrícula" onBack={back} onEdit={editable&&!editing?()=>setEditing(true):undefined}/>
      <Message>{message}</Message>
      {row&&<><div className="enrollment-context"><span><strong>Ciclo:</strong> {value(cycle,'codigo_ciclo')}</span><span><strong>Alumno:</strong> {value(student,'apellido_paterno')} {value(student,'apellido_materno')}, {value(student,'nombres')} · {value(student,'numero_di')}</span></div>
      <AcademicTabs id="enrollment-detail" names={['Resumen','Cargos','Historial']} active={tab} disabled={busy} onChange={setTab}/>
      <div hidden={tab!==0} role="tabpanel" id="enrollment-detail-panel-0" aria-labelledby="enrollment-detail-tab-0" tabIndex={0} className="student-section-panel">
        <h3>Resumen</h3><dl className="review-fields"><div><dt>Ciclo</dt><dd>{value(cycle,'codigo_ciclo')}</dd></div><div><dt>Alumno</dt><dd>{value(student,'apellido_paterno')} {value(student,'apellido_materno')}, {value(student,'nombres')} <Link to={`/alumnos/${String(row.alumno_id)}`}>Ver Alumno</Link></dd></div><div><dt>Documento</dt><dd>{value(student,'numero_di')}</dd></div><div><dt>Patrocinador</dt><dd>{sponsor?value(sponsor,'razon_social'):row.empresa_patrocinadora_id?'No disponible':'Sin patrocinador'}</dd></div><div><dt>Total vigente</dt><dd>{detailsReady?money(charges.filter(c=>c.activo).reduce((sum,c)=>sum+Number(c.importe_final),0)):'Sin consultar'}</dd></div><div><dt>Estado</dt><dd>{row.estado_codigo==='ACTIVO'?'Activa':'Anulada'}</dd></div></dl>
        {editable&&editing&&<><InlineForm className="enrollment-detail-form" onSubmit={()=>void save({codigo_matricula:code})}><fieldset disabled={busy}><legend>Código de matrícula</legend><label>Código visible<input required value={code} pattern="[0-9]{4}-[A-Za-z0-9]{2,10}-[0-9]{3,}" data-pattern-error="Usa YYYY-SIGLA-CORRELATIVO." onChange={e=>setCode(formTextValue(e.currentTarget))}/></label></fieldset><div className="form-actions"><button disabled={busy}>Guardar código</button></div></InlineForm>
        <div className="enrollment-sponsor"><h3>Patrocinador</h3><button type="button" className="secondary" disabled={busy} onClick={()=>setChoosingCompany(!choosingCompany)}>{choosingCompany?'Cerrar selección':'Elegir empresa'}</button>{sponsor&&<button type="button" className="secondary" disabled={busy} onClick={()=>void save({empresa_patrocinadora_id:''})}>Quitar patrocinador</button>}{choosingCompany&&<Companies choose={c=>void save({empresa_patrocinadora_id:c?.id??''})}/>}</div></>}
      </div>
      <div hidden={tab!==1} role="tabpanel" id="enrollment-detail-panel-1" aria-labelledby="enrollment-detail-tab-1" tabIndex={0} className="student-section-panel"><h3>Cargos</h3>
        {editable&&editing?<><InlineForm className="enrollment-detail-form enrollment-charge-form" onSubmit={()=>void save({},options.filter(id=>tariffs.find(t=>t.id===id)?.obligatorio===false))}>
        <div className="table-scroll enrollment-charges-grid"><table aria-label="Tarifas de la matrícula"><thead><tr><th>Incluir</th><th>Concepto</th><th>Subtotal</th><th>Descuento</th><th>Total</th></tr></thead><tbody>
        {chargeRows.map(c=><tr key={c.id}><td><input type="checkbox" aria-label={`Incluir ${c.name}`} disabled={busy||tariffStatus!=='ready'||c.required} checked={c.selected} onChange={e=>{setDiscountOpen(false);setOptions(e.target.checked?[...options,c.id]:options.filter(id=>id!==c.id))}}/></td><td>{c.name}{c.required&&<small className="help-text"> · Obligatoria</small>}</td><td>{money(c.original)}</td><td>{money(c.selected?c.discount:0)}</td><td>{money(c.selected?c.original-c.discount:0)}</td></tr>)}
        {extraCharges.map(c=><tr key={c.id}><td>Incluido</td><td>{value(c,'nombre')}<small className="help-text"> · Cargo vigente conservado</small></td><td>{money(c.importe_original)}</td><td>{money(c.descuento)}</td><td>{money(c.importe_final)}</td></tr>)}
        </tbody><tfoot><tr><th colSpan={4}>Subtotal</th><td>{money(previewSubtotal/100)}</td></tr><tr><th colSpan={4}>Descuento</th><td>{money(previewDiscount/100)}</td></tr><tr><th colSpan={4}>Total</th><td><strong>{money((previewSubtotal-previewDiscount)/100)}</strong></td></tr></tfoot></table></div>
        <p className="help-text">Desmarca los conceptos opcionales que no correspondan. Los importes son una vista previa; se confirman al guardar.</p>
        {tariffStatus==='loading'&&<p role="status">Cargando conceptos…</p>}{tariffStatus==='error'&&<p role="alert">No se pudieron cargar los conceptos. No se pueden guardar cambios incompletos.</p>}
        <div className="form-actions"><button disabled={busy||tariffStatus!=='ready'}>Guardar cargos</button><button type="button" className="secondary" disabled={busy} onClick={()=>{setChangingCycle(!changingCycle);setTarget(value(row,'ciclo_id'));setDiscountOpen(false)}}>{changingCycle?'Cancelar cambio de Ciclo':'Cambiar Ciclo'}</button></div>
        {changingCycle&&<fieldset disabled={busy||tariffStatus!=='ready'}><legend>Cambiar Ciclo de la matrícula</legend><label>Ciclo destino<select value={target} onChange={e=>{setTarget(formTextValue(e.currentTarget));setTariffStatus('loading')}}>{cycles.map(c=><option key={c.id} value={c.id}>{value(c,'codigo_ciclo')}</option>)}</select></label><p className="help-text">Cambiar Ciclo conserva los cargos anteriores como historia y crea los nuevos sin descuento. Confirma con Guardar cargos.</p></fieldset>}
        </InlineForm>
        {director&&pendingCharges&&<p className="help-text">Guarda los cargos antes de aplicar o modificar el descuento.</p>}
        {director&&(!discountOpen?<div className="form-actions"><button type="button" className="secondary" disabled={busy||pendingCharges} onClick={()=>{setDiscount(String(careerCharge?.descuento??0));setReason('');setDiscountOpen(true)}}>{Number(careerCharge?.descuento)>0?'Modificar descuento':'Aplicar descuento'}</button></div>:<InlineForm className="enrollment-detail-form" onSubmit={()=>void save({descuento:discount,motivo_descuento:reason})}><fieldset disabled={busy}><legend>Descuento de Carrera</legend><label>Nuevo descuento Carrera (S/)<input required type="number" min="0" step="0.01" value={discount} onChange={e=>setDiscount(formTextValue(e.currentTarget))}/></label><label>Motivo (sin datos personales)<textarea rows={2} required={Number(discount)>0} maxLength={500} value={reason} onChange={e=>setReason(formTextValue(e.currentTarget))}/></label></fieldset><div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={closeDiscount}>Cancelar descuento</button><button disabled={busy}>Aplicar</button></div></InlineForm>)}</>:<>{chargeTable(charges.filter(c=>c.activo))}<dl className="enrollment-charge-totals"><div><dt>Subtotal</dt><dd>{money(charges.filter(c=>c.activo).reduce((n,c)=>n+Number(c.importe_original),0))}</dd></div><div><dt>Descuento</dt><dd>{money(charges.filter(c=>c.activo).reduce((n,c)=>n+Number(c.descuento),0))}</dd></div><div><dt>Total</dt><dd>{money(charges.filter(c=>c.activo).reduce((n,c)=>n+Number(c.importe_final),0))}</dd></div></dl></>}
      </div>
      <div hidden={tab!==2} role="tabpanel" id="enrollment-detail-panel-2" aria-labelledby="enrollment-detail-tab-2" tabIndex={0} className="student-section-panel"><h3>Historial</h3><p className="help-text">Datos conservados al matricular y cargos retirados. Los cambios posteriores de la ficha no modifican esta información.</p><details><summary>Datos del alumno al matricular</summary><HistoricalStudent snapshot={row.alumno_snapshot}/></details><h3>Cargos retirados</h3>{chargeTable(charges.filter(c=>!c.activo),true)}{row.estado_codigo==='ANULADO'&&<p>Motivo de anulación: {value(row,'motivo_anulacion')||'No registrado'}</p>}</div>
      <div className="form-actions enrollment-detail-actions">{editing&&editable&&<button type="button" className="secondary" disabled={busy} onClick={leaveEdit}>Cancelar edición</button>}{row.estado_codigo==='ACTIVO'&&<button type="button" className="sensitive" disabled={busy} onClick={()=>void annul()}>Anular matrícula</button>}</div>
      {!editable&&<p className="help-text">Solo consulta.{row.estado_codigo==='ACTIVO'?' Puedes anular esta matrícula con motivo.':''}</p>}</>}
    </section>;

}

function HistoricalStudent({snapshot}:{snapshot:unknown}){
 if(!snapshot||typeof snapshot!=='object')return <p>No hay datos históricos disponibles.</p>;
 const shot=snapshot as Record<string,unknown>,data=(shot.alumno??{}) as Record<string,unknown>,catalogs=(shot.catalogos??{}) as Record<string,{id:string;etiqueta:string}|null>,geography=(shot.geografia??{}) as Record<string,string>;
 const contacts=Array.isArray(shot.contactos)?shot.contactos as Row[]:[];
 const values:Row[]=Object.entries(catalogs).flatMap(([code,item])=>item?[{id:item.id,nombre:item.etiqueta,catalogo_id:code}]:[]);
 for(const contact of contacts){const parent=contact.parentesco as {id?:string;etiqueta?:string}|undefined;if(parent?.id)values.push({id:parent.id,nombre:parent.etiqueta??'No registrado'})}
 const geo=Object.entries(geography).map(([id,nombre])=>({id,nombre}));
 const refs={catalogo:Object.keys(catalogs).map(id=>({id,codigo:id})),catalogo_valor:values,departamento:geo,provincia:geo,distrito:geo};
 const draft=Object.fromEntries([...studentGroups.flat().map(([key])=>[key,value(data,key)]),['ocupacion',value(data,'ocupacion')]]) as Draft;
 const date=typeof shot.fecha==='string'&&!Number.isNaN(Date.parse(shot.fecha))?new Date(shot.fecha).toLocaleDateString('en-CA',{timeZone:'America/Lima'}):undefined;
 return <StudentReview draft={draft} refs={refs} editing contacts={contacts} contactsError="" busy={false} readOnly studentCode={value(data,'codigo_alumno')||'No registrado en esta matrícula'} asOf={date}/>;
}
