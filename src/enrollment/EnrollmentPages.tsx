import { documentRule, documentInputValue, pasteDocumentValue } from '../lib/documentInput'
import { formTextValue } from '../lib/formText'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSession } from '../security/SessionProvider';
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
export function enrollmentError(error: {
    code?: string;
} | null) {
    if (error?.code === '40001' || error?.code === '40P01')
        return 'La información cambió. Recarga y revisa antes de volver a guardar.';
    if (error?.code === '23505')
        return 'El documento, RUC, código o par Alumno y Ciclo ya está registrado.';
    if (error?.code === '42501')
        return 'No tienes permiso para esta operación.';
    return 'No se pudo guardar. Revisa los campos, referencias activas, tarifas y estado del Ciclo. Recarga para consultar el resultado antes de reintentar.';
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
    const id = useId(), input = useRef<HTMLInputElement>(null);
    const selected = options.find(r => r.id === draft.ocupacion_id);
    const [query, setQuery] = useState<string | null>(null), [open, setOpen] = useState(false), [active, setActive] = useState(0);
    const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const matches = options.filter(r => r.activo !== false && normalize(value(r, 'nombre')).includes(normalize(query ?? ''))).sort((a, b) => Number(a.orden ?? 999) - Number(b.orden ?? 999));
    function choose(row?: Row) {
        change('ocupacion_id', row?.id ?? '');
        change('ocupacion', row?.codigo === 'OTROS' ? '' : value(row, 'nombre'));
        setQuery(null); setOpen(false); setActive(0); input.current?.setCustomValidity('');
    }
    return <div data-field="ocupacion_id" className="occupation-field"><label htmlFor={id}>Ocupación</label><div className="occupation-combobox">
        <input ref={input} id={id} role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open && matches[active] ? `${id}-${matches[active].id}` : undefined} placeholder="Escribe para buscar una ocupación" value={query ?? value(selected, 'nombre')} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onChange={e => { const text = formTextValue(e.currentTarget); setQuery(text); setOpen(true); setActive(0); if (!text) choose(); else e.currentTarget.setCustomValidity('Selecciona una ocupación de la lista o borra la búsqueda.'); }} onKeyDown={e => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); setActive(i => Math.max(0, Math.min(matches.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))); }
            if (e.key === 'Enter' && open) { e.preventDefault(); if (matches[active]) choose(matches[active]); }
            if (e.key === 'Escape') { setOpen(false); setQuery(null); input.current?.setCustomValidity(''); }
        }}/>
        {open && <ul id={`${id}-list`} role="listbox" aria-label="Ocupaciones">{matches.map((r, i) => <li id={`${id}-${r.id}`} key={r.id} role="option" aria-selected={r.id === draft.ocupacion_id} className={i === active ? 'highlighted' : undefined} onMouseDown={e => e.preventDefault()} onClick={() => choose(r)}>{value(r, 'nombre')}</li>)}{!matches.length && <li role="presentation">Sin coincidencias. Busca OTROS para especificar.</li>}</ul>}
        </div>{selected?.codigo === 'OTROS' && <label>Especifica la ocupación *<input required maxLength={150} value={draft.ocupacion ?? ''} onChange={e => change('ocupacion', formTextValue(e.currentTarget))}/></label>}
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
function StudentReview({ draft, refs, editing, contacts, contactsError, busy, correct, readOnly = false }: {
    draft: Draft; refs: Record<string, Row[]>; editing: boolean; contacts: Row[] | null; contactsError: string; busy: boolean; correct?: (step: number) => void; readOnly?: boolean;
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
        <div className="review-identity"><strong>{draft.apellido_paterno} {draft.apellido_materno}, {draft.nombres}</strong><span>{display(draft, 'tipo_di_id')} · {draft.numero_di}</span></div>
        {studentGroups.map((fields, index) => <section className="review-section" key={titles[index]} aria-labelledby={`${id}-${index}`}><header className="review-section-heading"><h3 id={`${id}-${index}`}>{titles[index]}</h3>{correct && <button type="button" className="secondary" disabled={busy} aria-label={`Corregir ${titles[index].toLocaleLowerCase('es')}`} onClick={() => correct(index)}>Corregir</button>}</header>{details(draft, fields)}{index === 0 && <p className="review-age">Edad calculada: {ageAt(draft.fecha_nacimiento)} años</p>}</section>)}
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
      {step === 4 && <StudentReview draft={draft} refs={refs} editing={!!initial} contacts={initial ? reviewContacts : draftContacts} contactsError={contactsError} busy={busy} correct={correctReview}/> }
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
        let query = client.from('alumno').select('id,apellido_paterno,apellido_materno,nombres,numero_di,created_at').order('created_at', { ascending: false }).order('id', { ascending: false }).range(page * 30, page * 30 + 29);
        if (search)
            query = /^\d/.test(search) ? query.ilike('numero_di', `%${search}%`) : query.ilike('apellido_paterno', `%${search}%`);
        void query.then(r => { if (active) {
            setRows(r.error ? [] : r.data as Row[]);
            setMessage(r.error ? 'No se pudo consultar Alumnos.' : !r.data.length ? 'No hay alumnos para esta búsqueda.' : '');
        } });
        return () => { active = false; };
    }, [client, search, page]);
    return <section><h2>Alumnos</h2><div className="filters students-toolbar" role="search" aria-label="Búsqueda de alumnos"><label className="student-search"><span className="field-label">Buscar alumnos</span><span className="search-input"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input type="search" placeholder="Documento o apellido paterno" value={search} onChange={e => { setSearch(formTextValue(e.currentTarget)); setPage(0); }}/></span></label>{canEdit && <span className="toolbar-action" onMouseEnter={() => setTooltipDismissed(false)}><Link to="/alumnos/nuevo" className="icon-action" aria-labelledby={tooltipId} onFocus={() => setTooltipDismissed(false)} onKeyDown={e => { if (e.key === 'Escape') setTooltipDismissed(true); }}><NewStudentIcon/></Link><span id={tooltipId} role="tooltip" className="toolbar-tooltip" hidden={tooltipDismissed}>Nuevo Alumno</span></span>}</div><Message>{message}</Message><div className="students-grid"><table aria-label="Alumnos por fecha de registro descendente"><thead><tr><th scope="col">Alumno</th><th scope="col">Documento</th><th scope="col">Registro ↓</th><th scope="col" className="student-actions-heading">Acciones</th></tr></thead><tbody>{rows.map(r => { const name = `${value(r, 'apellido_paterno')} ${value(r, 'apellido_materno')}, ${value(r, 'nombres')}`; return <tr key={r.id}><td><Link className="student-row-name" to={`/alumnos/${r.id}`}>{name}</Link></td><td className="student-row-document">{value(r, 'numero_di')}</td><td className="student-row-date">{r.created_at ? new Date(String(r.created_at)).toLocaleString('es-PE', { timeZone:'America/Lima', dateStyle:'short', timeStyle:'short' }) : '—'}</td><td><div className="student-row-actions"><StudentRowAction id={r.id} name={name} action="view"/>{canEdit && <StudentRowAction id={r.id} name={name} action="edit"/>}</div></td></tr>; })}</tbody></table></div><div className="student-list-pagination"><span>{rows.length ? `Página ${page + 1} · ${rows.length} alumnos` : `Página ${page + 1}`}</span><div className="pagination-actions"><button disabled={!page} onClick={() => setPage(page - 1)}>Anterior</button><button disabled={rows.length < 30} onClick={() => setPage(page + 1)}>Siguiente página</button></div></div></section>;
}
export function NewStudent() { const navigate = useNavigate(); return <StudentEditor done={r => navigate(`/alumnos/${r.id}`)} cancel={() => navigate('/alumnos')}/>; }
function ContactAction({ label, name, remove = false, disabled, onClick }: { label: string; name: string; remove?: boolean; disabled: boolean; onClick: () => void }) {
    const id = useId(), [dismissed, setDismissed] = useState(false);
    return <span className="toolbar-action" onMouseEnter={() => setDismissed(false)}><button type="button" className="icon-action student-row-action" aria-label={`${label}: ${name}`} aria-describedby={id} disabled={disabled} onClick={onClick} onFocus={() => setDismissed(false)} onKeyDown={e => { if (e.key === 'Escape') setDismissed(true); }}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{remove ? <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 12h7"/></> : <><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z"/></>}</svg></button><span id={id} role="tooltip" className="toolbar-tooltip" hidden={dismissed}>{label}</span></span>;
}
function ContactGrid({ contacts, refs, disabled = false, draft = false, onEdit, onRemove }: { contacts: Row[]; refs: Record<string, Row[]>; disabled?: boolean; draft?: boolean; onEdit?: (contact: Row) => void; onRemove?: (contact: Row) => void }) {
    return <div className="table-scroll contacts-grid"><table aria-label="Contactos de emergencia"><thead><tr><th scope="col">Apellidos</th><th scope="col">Nombres</th><th scope="col">Parentesco</th><th scope="col">Celular</th><th scope="col">Dirección</th><th scope="col">Estado</th><th scope="col" className="student-actions-heading">Acciones</th></tr></thead><tbody>{contacts.map(c => { const name = `${value(c, 'apellido')} ${value(c, 'nombre')}`; return <tr key={c.id}><td>{value(c, 'apellido')}</td><td>{value(c, 'nombre')}</td><td>{value(refs.catalogo_valor?.find(v => v.id === c.parentesco_id), 'nombre') || 'Referencia no disponible'}</td><td className="student-row-document">{value(c, 'celular')}</td><td className="contact-address">{value(c, 'direccion') || 'No indicado'}</td><td><StatusBadge value={draft ? 'Por guardar' : c.activo ? 'Activo' : 'Inactivo'}/></td><td><div className="student-row-actions">{c.activo === true && (onEdit || onRemove) ? <>{onEdit && <ContactAction label="Editar contacto" name={name} disabled={disabled} onClick={() => onEdit(c)}/>} {onRemove && <ContactAction label={draft ? 'Quitar contacto' : 'Retirar contacto'} name={name} remove disabled={disabled} onClick={() => onRemove(c)}/>}</> : <span className="help-text">Sin acciones</span>}</div></td></tr>; })}{!contacts.length && <tr><td colSpan={7}>No hay contactos registrados.</td></tr>}</tbody></table></div>;
}
export function StudentDetail() {
    const { id } = useParams(), { client, state } = useSession(), { refs, error: referencesError } = useReferences();
    const [searchParams, setSearchParams] = useSearchParams();
    const [row, setRow] = useState<Row>(), [tab, setTab] = useState(1), [edit, setEdit] = useState(() => searchParams.get('editar') === '1');
    const [draft, setDraft] = useState<Draft | null>(null), [editVersion, setEditVersion] = useState<string>();
    const [contacts, setContacts] = useState<Row[]>([]), [contactsError, setContactsError] = useState(''), [enrollments, setEnrollments] = useState<Row[]>([]), [message, setMessage] = useState('Cargando…'), [revision, setRevision] = useState(0);
    const [contact, setContact] = useState<Draft | null>(null), [contactRow, setContactRow] = useState<Row>(), [busy, setBusy] = useState(false);
    const { ask, dialog } = useConfirmation(busy);
    const canEdit = state.roles?.some(role => ['DIRECTOR_ACADEMICO', 'COORDINADOR_ACADEMICO'].includes(role));
    const editing = edit && !!canEdit;
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
            setRow(result.data as Row); closeEditor();
        } catch { setMessage(enrollmentError(null)); }
        finally { setBusy(false); }
    }
    async function saveContact() {
        if (!row || !contact || editing) return;
        setBusy(true);
        try {
            const r = await client.rpc('guardar_contacto_emergencia', { p: { ...contact, alumno_id: row.id, expected_alumno_updated_at: row.updated_at, ...(contactRow ? { id: contactRow.id, expected_updated_at: contactRow.updated_at } : {}) } });
            if (r.error) setMessage(enrollmentError(r.error));
            else { setContact(null); setRevision(v => v + 1); }
        } catch { setMessage(enrollmentError(null)); }
        finally { setBusy(false); }
    }
    async function retireContact(c: Row) {
        if (!row || editing) return;
        const ok = await ask({ title: 'Retirar contacto', description: 'El contacto quedará inactivo y su historia se conservará.' });
        if (ok === null) return;
        setBusy(true);
        try {
            const r = await client.rpc('retirar_contacto_emergencia', { id: c.id, expected_alumno_updated_at: row.updated_at });
            if (r.error) setMessage(enrollmentError(r.error)); else setRevision(v => v + 1);
        } catch { setMessage(enrollmentError(null)); }
        finally { setBusy(false); }
    }
    const tabs = ['Resumen', 'Identificación', 'Domicilio', 'Información adicional', 'Contactos', 'Matrículas'];
    const current = editing ? draft ?? studentDraft(row) : studentDraft(row);
    function revealField(field: HTMLElement) { const panel = field.closest<HTMLElement>('[data-student-section]'); if (panel) setTab(Number(panel.dataset.studentSection)); }
    return <section className="student-detail"><EditorHeading>Ficha del alumno</EditorHeading><Message>{message || referencesError}</Message>{row && <><header className="student-detail-header"><div><h3>{value(row, 'apellido_paterno')} {value(row, 'apellido_materno')}, {value(row, 'nombres')}</h3><p>{value(refs.catalogo_valor?.find(v => v.id === row.tipo_di_id), 'nombre') || 'Documento'} · {value(row, 'numero_di')} · {ageAt(value(row, 'fecha_nacimiento')) || '—'} años</p><small>{editing ? 'Modo edición. Puedes cambiar de pestaña sin perder lo ingresado. Guarda para confirmar los cambios.' : 'Consulta los datos registrados. Para modificarlos, selecciona Editar alumno.'}</small></div>{editing ? <span className="student-edit-mode" role="status">Editando alumno</span> : canEdit && <button type="button" onClick={beginEdit}>Editar alumno</button>}</header>
    <InlineForm key={editing ? 'editing' : 'viewing'} className="student-record-form" onInvalidField={revealField} onSubmit={() => { if (editing) void saveStudent(); }}>
        <div className="student-section-tabs" role="tablist" aria-label="Ficha Alumno">{tabs.map((name, i) => <button type="button" disabled={busy} key={name} role="tab" id={`student-tab-${i}`} aria-controls={`student-panel-${i}`} aria-selected={tab === i} tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)} onKeyDown={e => { const n = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1; if (n >= 0) { e.preventDefault(); setTab(n); document.getElementById(`student-tab-${n}`)?.focus(); } }}>{name}</button>)}</div>
        <div className="student-section-panel" role="tabpanel" hidden={tab !== 0} tabIndex={0} id="student-panel-0" aria-labelledby="student-tab-0"><h3>Resumen</h3><StudentReview draft={current} refs={refs} editing contacts={contactsError ? null : contacts} contactsError={contactsError} busy={busy} readOnly={!editing} correct={editing ? index => setTab(index + 1) : undefined}/></div>
        {studentGroups.map((fields, index) => <div className="student-section-panel" key={index} role="tabpanel" hidden={tab !== index + 1} tabIndex={0} id={`student-panel-${index + 1}`} aria-labelledby={`student-tab-${index + 1}`} data-student-section={index + 1}><h3>{tabs[index + 1]}</h3><fieldset disabled={busy || (editing && !refs.catalogo)}><Fields fields={fields} draft={current} refs={refs} change={(key, text) => setDraft(d => updateStudentDraft(d ?? current, key, text))} readOnly={!editing}/>{index === 0 && <p>Edad calculada: {ageAt(current.fecha_nacimiento) || '—'} años</p>}</fieldset></div>)}
        <div className="student-section-panel" role="tabpanel" hidden={tab !== 4} tabIndex={0} id="student-panel-4" aria-labelledby="student-tab-4"><div className="student-contacts-heading"><h3>Contactos</h3>{canEdit && <button type="button" disabled={busy || editing} onClick={() => { setContactRow(undefined); setContact({}); }}>Agregar contacto</button>}</div>{editing && <p className="help-text">Guarda o cancela los cambios del alumno para modificar sus contactos.</p>}<Message>{contactsError}</Message>
            <ContactGrid contacts={contacts} refs={refs} disabled={busy || editing} onEdit={canEdit ? c => { setContactRow(c); setContact(Object.fromEntries(contactFields.map(([key]) => [key, value(c, key)]))); } : undefined} onRemove={canEdit ? c => void retireContact(c) : undefined}/>

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
export function Companies({ choose }: {
    choose?: (r: Row | null) => void;
}) {
    const { client } = useSession(), [search, setSearch] = useState(''), [rows, setRows] = useState<Row[]>([]), [selected, setSelected] = useState<Row>(), [draft, setDraft] = useState<Draft>({}), [open, setOpen] = useState(false), [message, setMessage] = useState(''), [revision, setRevision] = useState(0), [busy, setBusy] = useState(false);
    useEffect(() => { let active = true; let q = client.from('empresa_patrocinadora').select('id,ruc,razon_social,persona_contacto,telefono,email,updated_at').order('razon_social').limit(40); if (search)
        q = /^\d/.test(search) ? q.ilike('ruc', `%${search}%`) : q.ilike('razon_social', `%${search}%`); void q.then(r => { if (active) {
        setRows(r.error ? [] : r.data as Row[]);
        if (r.error)
            setMessage('No se pudieron consultar empresas.');
    } }); return () => { active = false; }; }, [client, search, revision]);
    const fields = [['ruc', 'RUC', 'required'], ['razon_social', 'Razón social', 'required'], ['persona_contacto', 'Persona de contacto', 'optional'], ['telefono', 'Teléfono / celular', 'optional'], ['email', 'Email empresa', 'email']];
    function edit(r?: Row) { setSelected(r); setDraft(Object.fromEntries(fields.map(([k]) => [k, value(r, k)]))); setOpen(true); }
    async function save() { setBusy(true); const r = await client.rpc('guardar_empresa_patrocinadora', { p: { ...Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v.trim() || null])), ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}) } }); setBusy(false); if (r.error)
        setMessage(enrollmentError(r.error));
    else {
        setOpen(false);
        setRevision(revision + 1);
        choose?.(r.data as Row);
    } }
    return <section><h3>Empresa patrocinadora</h3><Message>{message}</Message><label>Buscar por RUC o razón social<input value={search} onChange={e => setSearch(formTextValue(e.currentTarget))}/></label><button type="button" onClick={() => edit()}>Nueva empresa</button>{choose && <button type="button" onClick={() => choose(null)}>Sin patrocinador</button>}<ul>{rows.map(r => <li key={r.id}>{value(r, 'ruc')} — {value(r, 'razon_social')} <button type="button" onClick={() => edit(r)}>Editar empresa</button>{choose && <button type="button" onClick={() => choose(r)}>Elegir empresa</button>}</li>)}</ul>{open && <InlineForm onSubmit={() => void save()}><Fields fields={fields} draft={draft} change={(k, v) => setDraft({ ...draft, [k]: v })} refs={{}}/><button disabled={busy}>Guardar empresa</button><button type="button" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button></InlineForm>}</section>;
}
export function NewEnrollment() {
    const { client, state } = useSession(), navigate = useNavigate();
    const [cycles, setCycles] = useState<Row[]>([]), [cycle, setCycle] = useState<Row>(), [student, setStudent] = useState<Row>(), [company, setCompany] = useState<Row | null>(null), [charges, setCharges] = useState<Row[]>([]), [options, setOptions] = useState<string[]>([]);
    const [step, setStep] = useState(0), [search, setSearch] = useState(''), [found, setFound] = useState<Row[]>([]), [editor, setEditor] = useState(false), [editing, setEditing] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [registered, setRegistered] = useState<Row>(), [discount, setDiscount] = useState('0'), [reason, setReason] = useState(''), [code, setCode] = useState('');
    const director = state.roles?.includes('DIRECTOR_ACADEMICO');
    useEffect(() => { let active = true; void client.from('ciclo').select('id,codigo_ciclo,carrera_id,estado_codigo,updated_at').in('estado_codigo', ['PROGRAMADO', 'EN_CURSO']).order('codigo_ciclo').then(r => { if (active) {
        setCycles(r.error ? [] : r.data as Row[]);
        if (r.error)
            setMessage('No se pudieron cargar Ciclos.');
    } }); return () => { active = false; }; }, [client]);
    useEffect(() => { let active = true; if (!cycle)
        return; void client.from('ciclo_tarifa').select('id,tarifa_id,importe,obligatorio,activo,tarifa(codigo,nombre,tipo,activo)').eq('ciclo_id', cycle.id).eq('activo', true).then(r => { if (active) {
        setCharges(r.error ? [] : (r.data as Row[]).filter(x => (x.tarifa as Record<string, unknown>)?.activo));
        setOptions([]);
        if (r.error)
            setMessage('No se pudieron cargar tarifas.');
    } }); return () => { active = false; }; }, [client, cycle]);
    async function find() { setBusy(true); const r = await client.from('alumno').select('*').eq('numero_di', search.trim().toUpperCase()).limit(20); setBusy(false); setFound(r.error ? [] : r.data as Row[]); setMessage(r.error ? 'No se pudo buscar Alumno.' : !r.data.length ? 'No existe Alumno para ese documento. Puedes crearlo.' : ''); }
    async function confirm() { if (!cycle || !student)
        return; setBusy(true); const p = { ciclo_id: cycle.id, expected_ciclo_updated_at: cycle.updated_at, alumno_id: student.id, expected_alumno_updated_at: student.updated_at, empresa_patrocinadora_id: company?.id ?? null, ...(code ? { codigo_matricula: code } : {}), ...(director ? { descuento: discount, motivo_descuento: reason } : {}) }; try {
        const r = await client.rpc('registrar_matricula', { p, opcionales: options });
        if (r.error)
            setMessage(enrollmentError(r.error));
        else {
            setRegistered(r.data as Row);
            setMessage('Matrícula registrada correctamente.');
        }
    }
    catch {
        setMessage('Respuesta no confirmada. Consulta el historial del Alumno antes de reintentar.');
    }
    finally {
        setBusy(false);
    } }
    async function another() { if (!cycle)
        return; const r = await client.from('ciclo').select('id,codigo_ciclo,carrera_id,estado_codigo,updated_at').eq('id', cycle.id).single(); if (r.error || !['PROGRAMADO', 'EN_CURSO'].includes(r.data.estado_codigo)) {
        setMessage('El Ciclo ya no permite matrícula. Selecciona otro.');
        setCycle(undefined);
        setStep(0);
    }
    else {
        setCycle(r.data as Row);
        setStep(1);
    } setStudent(undefined); setCompany(null); setOptions([]); setDiscount('0'); setReason(''); setCode(''); setSearch(''); setFound([]); setRegistered(undefined); }
    if (editor)
        return <StudentEditor initial={editing ? student : undefined} done={r => { setStudent(r); setEditor(false); setMessage('Alumno guardado; revisa contactos antes de confirmar matrícula.'); }} cancel={() => setEditor(false)}/>;
    if (registered)
        return <section><h2>Matrícula registrada</h2><p>{value(registered, 'codigo_matricula')}</p><button onClick={() => void another()}>Matricular otro alumno en este Ciclo</button><button onClick={() => navigate(`/matriculas/${registered.id}`)}>Ver matrícula</button></section>;
    return <section><h2>Registrar Matrícula</h2><Steps names={['Ciclo', 'Alumno', 'Patrocinador', 'Tarifas', 'Confirmación']} step={step}/><Message>{message}</Message><InlineForm onSubmit={() => { if (step < 4)
        setStep(step + 1);
    else
        void confirm(); }}><fieldset disabled={busy}><legend>{['Ciclo', 'Alumno', 'Patrocinador', 'Tarifas', 'Confirmación'][step]}</legend>
    {step === 0 && <label>Ciclo *<select required value={cycle?.id ?? ''} onChange={e => setCycle(cycles.find(c => c.id === formTextValue(e.currentTarget)))}><option value="">Seleccionar Ciclo</option>{cycles.map(c => <option key={c.id} value={c.id}>{value(c, 'codigo_ciclo')} — {value(c, 'estado_codigo')}</option>)}</select></label>}
    {step === 1 && <><label>Buscar por documento<input value={search} onChange={e => setSearch(formTextValue(e.currentTarget))}/></label><button type="button" onClick={() => void find()}>Buscar Alumno</button><ul>{found.map(a => <li key={a.id}>{value(a, 'nombres')} {value(a, 'apellido_paterno')} <button type="button" onClick={() => setStudent(a)}>Seleccionar Alumno</button></li>)}</ul><button type="button" onClick={() => { setEditing(false); setEditor(true); }}><NewStudentLabel/></button>{student && <><p>{value(student, 'nombres')} — {value(student, 'numero_di')}</p><button type="button" onClick={() => { setEditing(true); setEditor(true); }}>Completar / editar ficha</button><Link to={`/alumnos/${student.id}`}>Ver ficha y contactos</Link></>}</>}
    {step === 2 && <p>{company ? value(company, 'razon_social') : 'Sin patrocinador'} — selecciona o crea una empresa en el panel inferior.</p>}
    {step === 3 && <><p>Las obligatorias se incluyen siempre. El servidor valida configuración, selección e importes.</p>{charges.map(c => { const t = c.tarifa as Record<string, unknown>; return <label key={c.id}><input type="checkbox" disabled={c.obligatorio === true} checked={c.obligatorio === true || options.includes(c.id)} onChange={e => setOptions(e.target.checked ? [...options, c.id] : options.filter(id => id !== c.id))}/>{value(t, 'nombre')} — S/{value(c, 'importe')} {c.obligatorio ? '(Obligatoria)' : '(Opcional)'}</label>; })}{director && <><label>Descuento Carrera (S/)<input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(formTextValue(e.currentTarget))}/></label><label>Motivo descuento (sin datos personales)<textarea required={Number(discount) > 0} maxLength={500} value={reason} onChange={e => setReason(formTextValue(e.currentTarget))}/></label></>}</>}
    {step === 4 && <><p>{value(cycle, 'codigo_ciclo')} — {value(student, 'nombres')} — {company ? value(company, 'razon_social') : 'Sin patrocinador'}</p><ul>{charges.filter(c => c.obligatorio === true || options.includes(c.id)).map(c => <li key={c.id}>{value(c.tarifa as Record<string, unknown>, 'nombre')} — S/{value(c, 'importe')}</li>)}</ul><p>Descuento solicitado: S/{discount}. Total de referencia: S/{(charges.filter(c => c.obligatorio === true || options.includes(c.id)).reduce((sum, c) => sum + Number(c.importe), 0) - Number(discount)).toFixed(2)}.</p><p>Importes mostrados según configuración consultada; la confirmación obtiene y calcula cargos desde el servidor.</p><label>Código manual opcional<input value={code} pattern="[0-9]{4}-[A-Za-z0-9]{2,10}-[0-9]{3,}" data-pattern-error="Usa YYYY-SIGLA-CORRELATIVO, sigla alfanumérica de 2 a 10 y correlativo de al menos 3 dígitos." onChange={e => setCode(formTextValue(e.currentTarget))}/></label></>}
    </fieldset><div className="form-actions">{step > 0 && <button type="button" disabled={busy} onClick={() => setStep(step - 1)}>Anterior</button>}<button disabled={busy || (step === 1 && !student) || (step >= 3 && !charges.length)}>{step < 4 ? 'Siguiente' : busy ? 'Registrando…' : 'Confirmar matrícula'}</button></div></InlineForm>{step === 2 && <Companies choose={setCompany}/>}</section>;
}
export function EnrollmentDetail() {
    const { id } = useParams(), { client, state } = useSession(), [row, setRow] = useState<Row>(), [student, setStudent] = useState<Row>(), [cycle, setCycle] = useState<Row>(), [cycles, setCycles] = useState<Row[]>([]), [charges, setCharges] = useState<Row[]>([]), [tariffs, setTariffs] = useState<Row[]>([]), [options, setOptions] = useState<string[]>([]), [target, setTarget] = useState(''), [code, setCode] = useState(''), [discount, setDiscount] = useState(''), [reason, setReason] = useState(''), [message, setMessage] = useState('Cargando…'), [revision, setRevision] = useState(0), [busy, setBusy] = useState(false), [history, setHistory] = useState(false);
    const { ask, dialog } = useConfirmation(busy), director = state.roles?.includes('DIRECTOR_ACADEMICO');
    useEffect(() => { let active = true; void (async () => { const r = await client.from('matricula').select('*').eq('id', id).single(); if (!active)
        return; if (r.error) {
        setRow(undefined);
        setMessage('No se pudo cargar matrícula.');
        return;
    } const m = r.data as Row; const [a, c, cs, ch] = await Promise.all([client.from('alumno').select('id,nombres,apellido_paterno,apellido_materno,numero_di,domicilio').eq('id', String(m.alumno_id)).single(), client.from('ciclo').select('id,codigo_ciclo,estado_codigo,updated_at').eq('id', String(m.ciclo_id)).single(), client.from('ciclo').select('id,codigo_ciclo,estado_codigo,updated_at').in('estado_codigo', ['PROGRAMADO', 'EN_CURSO']), client.from('matricula_cargo').select('*').eq('matricula_id', id).order('created_at')]); if (!active)
        return; setRow(m); setStudent(a.error ? undefined : a.data as Row); setCycle(c.error ? undefined : c.data as Row); setCycles(cs.error ? [] : cs.data as Row[]); setCharges(ch.error ? [] : ch.data as Row[]); setTarget(String(m.ciclo_id)); setCode(String(m.codigo_matricula)); setDiscount(''); setReason(''); setMessage(a.error || c.error || cs.error || ch.error ? 'No se pudo cargar detalle completo. Recarga.' : ''); })().catch(() => { if (active)
        setMessage('No se pudo consultar detalle.'); }); return () => { active = false; }; }, [client, id, revision]);
    useEffect(() => { let active = true; if (!target)
        return; void client.from('ciclo_tarifa').select('id,importe,obligatorio,tarifa(nombre,activo)').eq('ciclo_id', target).eq('activo', true).then(r => { if (active) {
        setTariffs(r.error ? [] : (r.data as Row[]).filter(x => (x.tarifa as Record<string, unknown>)?.activo));
        setOptions(target === row?.ciclo_id ? charges.filter(x => x.activo).map(x => String(x.ciclo_tarifa_id)) : []);
    } }); return () => { active = false; }; }, [client, target, row, charges]);
    const editable = row?.estado_codigo === 'ACTIVO' && ['PROGRAMADO', 'EN_CURSO'].includes(value(cycle, 'estado_codigo'));
    async function save(extra: Draft = {}, selected?: string[]) { if (!row)
        return; setBusy(true); const destination = target === cycle?.id ? cycle : cycles.find(c => c.id === target); const p = { id: row.id, expected_updated_at: row.updated_at, ...extra, ...(selected ? { ciclo_id: target, expected_ciclo_updated_at: destination?.updated_at } : {}) }; const r = await client.rpc('editar_matricula', { p, ...(selected ? { opcionales: selected } : {}) }); setBusy(false); if (r.error)
        setMessage(enrollmentError(r.error));
    else {
        setRevision(revision + 1);
        setMessage('Matrícula actualizada.');
    } }
    async function annul() { if (!row)
        return; const reason = await ask({ title: 'Anular matrícula', description: 'La anulación es terminal. Conserva toda la historia.', reason: true, sensitive: true }); if (reason === null)
        return; setBusy(true); const r = await client.rpc('anular_matricula', { id: row.id, expected_updated_at: row.updated_at, motivo: reason }); setBusy(false); if (r.error)
        setMessage(enrollmentError(r.error));
    else
        setRevision(revision + 1); }
    return <section><h2>Matrícula {value(row, 'codigo_matricula')}</h2><Message>{message}</Message>{row && <><StatusBadge value={value(row, 'estado_codigo')}/><p>{value(cycle, 'codigo_ciclo')}</p><p>Ficha vigente: {value(student, 'nombres')} {value(student, 'apellido_paterno')} — {value(student, 'numero_di')} <Link to={`/alumnos/${String(row.alumno_id)}`}>Ver Alumno</Link></p><button onClick={() => setHistory(!history)}>Ver / ocultar fotografía histórica</button>{history && <pre className="snapshot-detail">{JSON.stringify(row.alumno_snapshot, null, 2)}</pre>}<p>Total vigente calculado de cargos servidor: S/{charges.filter(c => c.activo).reduce((sum, c) => sum + Number(c.importe_final), 0).toFixed(2)}</p><div className="table-scroll"><table><caption>Cargos actuales e históricos</caption><thead><tr><th>Concepto</th><th>Original</th><th>Descuento</th><th>Final</th><th>Vigencia</th></tr></thead><tbody>{charges.map(c => <tr key={c.id}><td>{value(c, 'nombre')}</td><td>S/{value(c, 'importe_original')}</td><td>S/{value(c, 'descuento')}</td><td>S/{value(c, 'importe_final')}</td><td>{c.activo ? 'Activo' : `Inactivo — ${value(c, 'motivo_inactivacion')}`}</td></tr>)}</tbody></table></div>
    {editable && <><InlineForm onSubmit={() => void save({ codigo_matricula: code })}><label>Código visible<input required value={code} pattern="[0-9]{4}-[A-Za-z0-9]{2,10}-[0-9]{3,}" data-pattern-error="Usa YYYY-SIGLA-CORRELATIVO, sigla alfanumérica de 2 a 10 y correlativo de al menos 3 dígitos." onChange={e => setCode(formTextValue(e.currentTarget))}/></label><button disabled={busy}>Guardar código</button></InlineForm><InlineForm onSubmit={() => void save({}, options.filter(id => tariffs.find(t => t.id === id)?.obligatorio === false))}><label>Ciclo destino<select value={target} onChange={e => setTarget(formTextValue(e.currentTarget))}>{cycles.map(c => <option key={c.id} value={c.id}>{value(c, 'codigo_ciclo')}</option>)}</select></label><p>Cambiar Ciclo conserva e inactiva los cargos anteriores; crea cargos nuevos con descuento cero. Solo Director podrá aplicar un nuevo descuento.</p>{tariffs.map(t => <label key={t.id}><input type="checkbox" disabled={t.obligatorio === true} checked={t.obligatorio === true || options.includes(t.id)} onChange={e => setOptions(e.target.checked ? [...options, t.id] : options.filter(x => x !== t.id))}/>{value(t.tarifa as Record<string, unknown>, 'nombre')} — S/{value(t, 'importe')}</label>)}<button disabled={busy}>Guardar Ciclo / opciones</button></InlineForm><Companies choose={c => void save({ empresa_patrocinadora_id: c?.id ?? '' })}/>{director && <InlineForm onSubmit={() => void save({ descuento: discount, motivo_descuento: reason })}><label>Nuevo descuento Carrera (S/)<input required type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(formTextValue(e.currentTarget))}/></label><label>Motivo (sin datos personales)<textarea required={Number(discount) > 0} maxLength={500} value={reason} onChange={e => setReason(formTextValue(e.currentTarget))}/></label><button disabled={busy}>Aplicar descuento</button></InlineForm>}</>}
    {!editable && <p>Solo consulta. La matrícula activa en Ciclo terminal aún puede anularse con motivo.</p>}{row.estado_codigo === 'ACTIVO' && <button disabled={busy} className="sensitive" onClick={() => void annul()}>Anular matrícula</button>}</>}{dialog}</section>;
}
export function Tariffs() {
    const { client, state } = useSession(), [rows, setRows] = useState<Row[]>([]), [cycles, setCycles] = useState<Row[]>([]), [selected, setSelected] = useState<Row>(), [draft, setDraft] = useState<Draft>({ tipo: 'OTRO', monto_por_defecto: '0' }), [cycle, setCycle] = useState<Row>(), [config, setConfig] = useState<Record<string, {
        selected: boolean;
        importe: string;
        obligatorio: boolean;
    }>>({}), [message, setMessage] = useState(''), [revision, setRevision] = useState(0), [busy, setBusy] = useState(false);
    const director = state.roles?.includes('DIRECTOR_ACADEMICO');
    useEffect(() => { let active = true; void Promise.all([client.from('tarifa').select('*').order('codigo'), client.from('ciclo').select('id,codigo_ciclo,estado_codigo,updated_at').order('codigo_ciclo')]).then(([t, c]) => { if (active) {
        setRows(t.error ? [] : t.data as Row[]);
        setCycles(c.error ? [] : c.data as Row[]);
        if (t.error || c.error)
            setMessage('No se pudo cargar tarifas.');
    } }); return () => { active = false; }; }, [client, revision]);
    useEffect(() => { let active = true; if (!cycle)
        return; void client.from('ciclo_tarifa').select('*').eq('ciclo_id', cycle.id).then(r => { if (active) {
        const cfg: typeof config = {};
        for (const t of rows) {
            const old = r.data?.find(x => x.tarifa_id === t.id);
            cfg[t.id] = { selected: old?.activo ?? false, importe: old ? String(old.importe) : value(t, 'monto_por_defecto'), obligatorio: old?.obligatorio ?? t.tipo === 'CARRERA' };
        }
        setConfig(cfg);
        if (r.error)
            setMessage('No se pudo cargar configuración del Ciclo.');
    } }); return () => { active = false; }; }, [client, cycle, rows]);
    async function save() { setBusy(true); const r = await client.rpc('guardar_tarifa', { p: { ...draft, ...(selected ? { id: selected.id, expected_updated_at: selected.updated_at } : {}) } }); setBusy(false); if (r.error)
        setMessage(enrollmentError(r.error));
    else {
        setSelected(undefined);
        setDraft({ tipo: 'OTRO', monto_por_defecto: '0' });
        setRevision(revision + 1);
        setMessage('Tarifa guardada.');
    } }
    async function configure() { if (!cycle)
        return; setBusy(true); const r = await client.rpc('guardar_ciclo_tarifas', { ciclo_id: cycle.id, expected_updated_at: cycle.updated_at, configuracion: Object.entries(config).filter(([, v]) => v.selected).map(([tarifa_id, v]) => ({ tarifa_id, importe: v.importe, obligatorio: String(v.obligatorio) })) }); setBusy(false); if (r.error)
        setMessage(enrollmentError(r.error));
    else {
        setCycle(r.data as Row);
        setRevision(revision + 1);
        setMessage('Configuración de Ciclo guardada.');
    } }
    return <section><h2>Tarifas</h2><Message>{message}</Message><ul>{rows.map(r => <li key={r.id}>{value(r, 'codigo')} — {value(r, 'nombre')} — S/{value(r, 'monto_por_defecto')} — {r.activo ? 'Activo' : 'Inactivo'}{director && <><button onClick={() => { setSelected(r); setDraft(Object.fromEntries(['codigo', 'nombre', 'descripcion', 'tipo', 'monto_por_defecto'].map(k => [k, value(r, k)]))); }}>Editar tarifa</button><button disabled={busy} onClick={() => { setBusy(true); void client.rpc('cambiar_activo_tarifa', { id: r.id, expected_updated_at: r.updated_at, activo: !r.activo }).then(result => { setBusy(false); if (result.error)
        setMessage(enrollmentError(result.error));
    else
        setRevision(revision + 1); }); }}>{r.activo ? 'Inactivar' : 'Activar'}</button></>}</li>)}</ul>{director && <InlineForm onSubmit={() => void save()}><h3>{selected ? 'Editar tarifa' : 'Nueva tarifa'}</h3><Fields fields={[["codigo", "Código tarifa", "required"], ["nombre", "Nombre tarifa", "required"], ["descripcion", "Descripción tarifa", "optional"], ["monto_por_defecto", "Monto por defecto (S/)", "required"]]} draft={draft} change={(k, v) => setDraft({ ...draft, [k]: v })} refs={{}}/><label>Tipo<select value={draft.tipo} onChange={e => setDraft({ ...draft, tipo: formTextValue(e.currentTarget) })}><option>CARRERA</option><option>OTRO</option></select></label><button disabled={busy}>Guardar tarifa</button><button type="button" onClick={() => { setSelected(undefined); setDraft({ tipo: 'OTRO', monto_por_defecto: '0' }); }}>Nueva</button></InlineForm>}
    <h3>Tarifas por Ciclo</h3><label>Ciclo<select value={cycle?.id ?? ''} onChange={e => setCycle(cycles.find(c => c.id === formTextValue(e.currentTarget)))}><option value="">Seleccionar</option>{cycles.map(c => <option key={c.id} value={c.id}>{value(c, 'codigo_ciclo')} — {value(c, 'estado_codigo')}</option>)}</select></label>{cycle && <InlineForm onSubmit={() => void configure()}><fieldset disabled={busy || !director || !['PROGRAMADO', 'EN_CURSO'].includes(value(cycle, 'estado_codigo'))}><legend>Selección manual; exactamente una Carrera activa obligatoria para matricular</legend>{rows.map(t => { const c = config[t.id]; return c && <div key={t.id}><label><input type="checkbox" disabled={!t.activo} checked={c.selected} onChange={e => setConfig({ ...config, [t.id]: { ...c, selected: e.target.checked } })}/>{value(t, 'nombre')}</label><label>Importe Ciclo (S/)<input type="number" min="0" step="0.01" value={c.importe} onChange={e => setConfig({ ...config, [t.id]: { ...c, importe: formTextValue(e.currentTarget) } })}/></label><label><input type="checkbox" checked={c.obligatorio} onChange={e => setConfig({ ...config, [t.id]: { ...c, obligatorio: e.target.checked } })}/>Obligatoria</label></div>; })}<button>Guardar tarifas del Ciclo</button></fieldset></InlineForm>}</section>;
}
