import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
const catalogFields: Record<string, string> = { tipo_di_id: 'TIPO_DI', sexo_id: 'SEXO', estado_civil_id: 'ESTADO_CIVIL', grupo_sanguineo_id: 'GRUPO_SANGUINEO', grado_instruccion_id: 'GRADO_INSTRUCCION', color_ojos_id: 'COLOR_OJOS', color_cabello_id: 'COLOR_CABELLO', parentesco_id: 'PARENTESCO' };
const studentGroups = [
    [['apellido_paterno', 'Apellido paterno', 'required'], ['apellido_materno', 'Apellido materno', 'required'], ['nombres', 'Nombres', 'required'], ['tipo_di_id', 'Tipo DI', 'required'], ['numero_di', 'Número DI', 'required'], ['fecha_nacimiento', 'Fecha de nacimiento', 'date'], ['sexo_id', 'Sexo', 'required'], ['estado_civil_id', 'Estado civil', 'optional'], ['nacimiento_departamento_id', 'Departamento nacimiento', 'required'], ['nacimiento_provincia_id', 'Provincia nacimiento', 'required'], ['nacimiento_distrito_id', 'Distrito nacimiento', 'required']],
    [['celular', 'Celular', 'required'], ['telefono_fijo', 'Teléfono fijo', 'optional'], ['email', 'Email', 'email'], ['domicilio', 'Domicilio', 'required'], ['numero_mz_lt', 'N° / Mz Lt', 'optional'], ['domicilio_departamento_id', 'Departamento domicilio', 'required'], ['domicilio_provincia_id', 'Provincia domicilio', 'required'], ['domicilio_distrito_id', 'Distrito domicilio', 'required']],
    [['grupo_sanguineo_id', 'Grupo sanguíneo', 'optional'], ['grado_instruccion_id', 'Grado de instrucción', 'optional'], ['color_ojos_id', 'Color de ojos', 'optional'], ['color_cabello_id', 'Color de cabello', 'optional'], ['estatura_cm', 'Estatura (cm)', 'number'], ['peso_kg', 'Peso (kg)', 'number'], ['senas_particulares', 'Señas particulares', 'optional'], ['ocupacion', 'Ocupación', 'optional']],
];
const contactFields = [['apellido', 'Apellido contacto', 'required'], ['nombre', 'Nombre contacto', 'required'], ['parentesco_id', 'Parentesco', 'required'], ['celular', 'Celular contacto', 'required'], ['direccion', 'Dirección contacto', 'optional']];
function Fields({ fields, draft, change, refs }: {
    fields: string[][];
    draft: Draft;
    change: (key: string, v: string) => void;
    refs: Record<string, Row[]>;
}) {
    return <div className="form-grid">{fields.map(([key, label, kind]) => {
            const cat = catalogFields[key], required = kind === 'required' || kind === 'date';
            let options: Row[] | undefined;
            if (cat)
                options = (refs.catalogo_valor ?? []).filter(v => v.catalogo_id === refs.catalogo?.find(c => c.codigo === cat)?.id);
            const geo = key.match(/^(nacimiento|domicilio)_(departamento|provincia|distrito)_id$/);
            if (geo)
                options = (refs[geo[2]] ?? []).filter(r => geo[2] === 'departamento' || value(r, geo[2] === 'provincia' ? 'departamento_id' : 'provincia_id') === draft[`${geo[1]}_${geo[2] === 'provincia' ? 'departamento' : 'provincia'}_id`]);
            const max = key === 'razon_social' ? 200 : key === 'codigo' ? 30 : key === 'descripcion' ? 500 : key === 'numero_di' ? 30 : /domicilio$|direccion|senas_particulares/.test(key) ? 500 : key === 'numero_mz_lt' ? 100 : key === 'email' ? 254 : /celular|telefono/.test(key) ? 30 : 150;
            return <label key={key} data-field={key}><span className="field-label">{label}{required ? ' *' : ''}</span>{options ? <select required={required} value={draft[key] ?? ''} onChange={e => change(key, e.target.value)}><option value="">Seleccionar</option>{options.map(r => <option key={r.id} value={r.id} disabled={r.activo === false || r.active === false}>{value(r, 'nombre')}{r.activo === false || r.active === false ? ' (inactivo)' : ''}</option>)}</select> : <input required={required} type={kind === 'date' ? 'date' : kind === 'number' ? 'number' : kind === 'email' ? 'email' : 'text'} step={kind === 'number' ? 'any' : undefined} min={kind === 'number' ? '0.000001' : undefined} max={kind === 'date' ? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }) : undefined} maxLength={max} data-pattern-error={key === 'ruc' ? 'El RUC debe tener exactamente 11 dígitos.' : key === 'numero_di' ? 'DNI: exactamente 8 dígitos. Carné de extranjería: 1 a 30 caracteres alfanuméricos.' : undefined} pattern={key === 'ruc' ? '[0-9]{11}' : key === 'numero_di' ? refs.catalogo_valor?.find(v => v.id === draft.tipo_di_id)?.codigo === 'DNI' ? '[0-9]{8}' : '[A-Za-z0-9]{1,30}' : undefined} value={draft[key] ?? ''} onChange={e => change(key, e.target.value)}/>}</label>;
        })}</div>;
}
export function StudentEditor({ initial, done, cancel }: {
    initial?: Row;
    done: (row: Row) => void;
    cancel: () => void;
}) {
    const { client } = useSession(), { refs, error } = useReferences();
    const [draft, setDraft] = useState<Draft>(() => Object.fromEntries(studentGroups.flat().map(([k]) => [k, value(initial, k)])));
    const [contact, setContact] = useState<Draft>({}), [step, setStep] = useState(0), [saved, setSaved] = useState<Row | undefined>(initial);
    const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
    function change(k: string, v: string) { setDraft(d => ({ ...d, [k]: v, ...(/departamento_id$/.test(k) ? { [k.replace('departamento', 'provincia')]: '', [k.replace('departamento', 'distrito')]: '' } : /provincia_id$/.test(k) ? { [k.replace('provincia', 'distrito')]: '' } : {}) })); }
    async function save() {
        setBusy(true);
        setMessage('');
        try {
            const p = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v.trim() || null]));
            const result = await client.rpc('guardar_alumno', { p: { ...p, contactos: !initial && contact.apellido ? [contact] : [], ...(saved ? { id: saved.id, expected_updated_at: saved.updated_at } : {}) } });
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
    return <section><EditorHeading>{initial ? 'Editar Alumno' : 'Nuevo Alumno'}</EditorHeading><Steps names={['Identificación', 'Domicilio', 'Información adicional', 'Contacto de emergencia', 'Revisar']} step={step}/><Message>{error || message}</Message><InlineForm onSubmit={() => { if (step < 4)
        setStep(step + 1);
    else
        void save(); }}>
    <fieldset disabled={busy || !refs.catalogo}><legend>{['Identificación', 'Domicilio', 'Información adicional', 'Contacto de emergencia', 'Revisar'][step]}</legend>
      {step < 3 && <Fields fields={studentGroups[step]} draft={draft} change={change} refs={refs}/>}
      {step === 0 && <p>Edad calculada: {ageAt(draft.fecha_nacimiento ?? '') || '—'}</p>}
      {step === 3 && (initial ? <p>Los contactos se mantienen desde la pestaña Contactos de la ficha.</p> : <><p>Puedes guardar una ficha sin contactos; para matricular se exige al menos uno activo y válido.</p><Fields fields={contactFields.map(([k, l, kind]) => [k, l, kind === 'required' && !Object.values(contact).some(v => v.trim()) ? 'optional' : kind])} draft={contact} change={(k, v) => setContact({ ...contact, [k]: v })} refs={refs}/></>)}
      {step === 4 && <><p>Revisa los pasos anteriores antes de guardar.</p><p>{draft.apellido_paterno} {draft.apellido_materno}, {draft.nombres} — {draft.numero_di}</p><p>{draft.domicilio}</p></>}
    </fieldset><div className="actions"><button type="button" disabled={busy} onClick={cancel}>Cancelar</button>{step > 0 && <button type="button" disabled={busy} onClick={() => setStep(step - 1)}>Anterior</button>}<button disabled={busy || !refs.catalogo}>{step < 4 ? 'Siguiente' : busy ? 'Guardando…' : 'Guardar'}</button></div></InlineForm></section>;
}
export function Students() {
    const { client } = useSession(), [rows, setRows] = useState<Row[]>([]), [search, setSearch] = useState(''), [page, setPage] = useState(0), [message, setMessage] = useState('Cargando…');
    useEffect(() => {
        let active = true;
        let query = client.from('alumno').select('id,apellido_paterno,apellido_materno,nombres,numero_di').order('apellido_paterno').range(page * 30, page * 30 + 29);
        if (search)
            query = /^\d/.test(search) ? query.ilike('numero_di', `%${search}%`) : query.ilike('apellido_paterno', `%${search}%`);
        void query.then(r => { if (active) {
            setRows(r.error ? [] : r.data as Row[]);
            setMessage(r.error ? 'No se pudo consultar Alumnos.' : !r.data.length ? 'No hay alumnos para esta búsqueda.' : '');
        } });
        return () => { active = false; };
    }, [client, search, page]);
    return <section><h2>Alumnos</h2><Link to="/alumnos/nuevo">Nuevo Alumno</Link><label>Documento o apellido paterno<input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}/></label><Message>{message}</Message><ul>{rows.map(r => <li key={r.id}><Link to={`/alumnos/${r.id}`}>{value(r, 'apellido_paterno')} {value(r, 'apellido_materno')}, {value(r, 'nombres')} — {value(r, 'numero_di')}</Link></li>)}</ul><button disabled={!page} onClick={() => setPage(page - 1)}>Anterior</button><button disabled={rows.length < 30} onClick={() => setPage(page + 1)}>Siguiente página</button></section>;
}
export function NewStudent() { const navigate = useNavigate(); return <StudentEditor done={r => navigate(`/alumnos/${r.id}`)} cancel={() => navigate('/alumnos')}/>; }
export function StudentDetail() {
    const { id } = useParams(), { client } = useSession(), { refs } = useReferences();
    const [row, setRow] = useState<Row>(), [tab, setTab] = useState(0), [edit, setEdit] = useState(false), [contacts, setContacts] = useState<Row[]>([]), [enrollments, setEnrollments] = useState<Row[]>([]), [message, setMessage] = useState('Cargando…'), [revision, setRevision] = useState(0);
    const [contact, setContact] = useState<Draft | null>(null), [contactRow, setContactRow] = useState<Row>(), [busy, setBusy] = useState(false);
    const { ask, dialog } = useConfirmation(busy);
    useEffect(() => {
        let active = true;
        void Promise.all([client.from('alumno').select('*').eq('id', id).single(), client.from('alumno_contacto_emergencia').select('*').eq('alumno_id', id), client.from('matricula').select('id,codigo_matricula,estado_codigo').eq('alumno_id', id)]).then(([a, c, m]) => { if (active) {
            setRow(a.error ? undefined : a.data as Row);
            setContacts(c.error ? [] : c.data as Row[]);
            setEnrollments(m.error ? [] : m.data as Row[]);
            setMessage(a.error || c.error || m.error ? 'No se pudo cargar la ficha completa. Recarga.' : '');
        } });
        return () => { active = false; };
    }, [client, id, revision]);
    if (edit && row)
        return <StudentEditor initial={row} done={() => { setEdit(false); setRevision(revision + 1); }} cancel={() => setEdit(false)}/>;
    const tabs = ['Resumen', 'Datos personales', 'Domicilio', 'Información adicional', 'Contactos', 'Matrículas'];
    const display = (k: string) => k in catalogFields ? value(refs.catalogo_valor?.find(v => v.id === row?.[k]), 'nombre') : /_(departamento|provincia|distrito)_id$/.test(k) ? value(refs[k.split('_').at(-2)!]?.find(v => v.id === row?.[k]), 'nombre') : value(row, k);
    async function saveContact() {
        if (!row || !contact)
            return;
        setBusy(true);
        const r = await client.rpc('guardar_contacto_emergencia', { p: { ...contact, alumno_id: row.id, expected_alumno_updated_at: row.updated_at, ...(contactRow ? { id: contactRow.id, expected_updated_at: contactRow.updated_at } : {}) } });
        setBusy(false);
        if (r.error)
            setMessage(enrollmentError(r.error));
        else {
            setContact(null);
            setRevision(revision + 1);
        }
    }
    return <section><h2>Ficha Alumno</h2><Message>{message}</Message>{row && <><h3>{value(row, 'nombres')} {value(row, 'apellido_paterno')}</h3><button onClick={() => setEdit(true)}>Completar / editar Alumno</button><div role="tablist" aria-label="Ficha Alumno">{tabs.map((name, i) => <button key={name} role="tab" id={`student-tab-${i}`} aria-controls={`student-panel-${i}`} aria-selected={tab === i} tabIndex={tab === i ? 0 : -1} onClick={() => setTab(i)} onKeyDown={e => { const n = e.key === 'ArrowRight' ? (i + 1) % 6 : e.key === 'ArrowLeft' ? (i + 5) % 6 : e.key === 'Home' ? 0 : e.key === 'End' ? 5 : -1; if (n >= 0) {
            e.preventDefault();
            setTab(n);
            document.getElementById(`student-tab-${n}`)?.focus();
        } }}>{name}</button>)}</div><div role="tabpanel" id={`student-panel-${tab}`} aria-labelledby={`student-tab-${tab}`}>
    {tab === 0 && <><p>{value(row, 'numero_di')} — Edad: {ageAt(value(row, 'fecha_nacimiento'))}</p><p>{value(row, 'domicilio')}</p></>}
    {tab > 0 && tab < 4 && <dl>{studentGroups[tab - 1].map(([k, l]) => <div key={k}><dt>{l}</dt><dd>{display(k) || 'Sin dato'}</dd></div>)}</dl>}
    {tab === 4 && <><button onClick={() => { setContactRow(undefined); setContact({}); }}>Agregar contacto</button><ul>{contacts.map(c => <li key={c.id}>{value(c, 'apellido')} {value(c, 'nombre')} — {value(refs.catalogo_valor?.find(v => v.id === c.parentesco_id), 'nombre')} — {value(c, 'celular')} — {c.activo ? 'Activo' : 'Inactivo'}{c.activo === true && <><button onClick={() => { setContactRow(c); setContact(Object.fromEntries(contactFields.map(([k]) => [k, value(c, k)]))); }}>Editar contacto</button><button disabled={busy} onClick={() => { void (async () => { const ok = await ask({ title: 'Retirar contacto', description: 'El contacto quedará inactivo y su historia se conservará.' }); if (ok === null)
            return; setBusy(true); const r = await client.rpc('retirar_contacto_emergencia', { id: c.id, expected_alumno_updated_at: row.updated_at }); setBusy(false); if (r.error)
            setMessage(enrollmentError(r.error));
        else
            setRevision(revision + 1); })(); }}>Retirar</button></>}</li>)}</ul></>}
    {tab === 5 && <ul>{enrollments.map(m => <li key={m.id}><Link to={`/matriculas/${m.id}`}>{value(m, 'codigo_matricula')}</Link> — {value(m, 'estado_codigo')}</li>)}</ul>}
    </div></>}{contact && <ContactDialog close={() => { if (!busy)
        setContact(null); }}><InlineForm onSubmit={() => void saveContact()}><Fields fields={contactFields} draft={contact} change={(k, v) => setContact({ ...contact, [k]: v })} refs={refs}/><button disabled={busy}>Guardar contacto</button><button type="button" disabled={busy} onClick={() => setContact(null)}>Cancelar</button></InlineForm></ContactDialog>}{dialog}</section>;
}
function ContactDialog({ close, children }: {
    close: () => void;
    children: ReactNode;
}) {
    const panel = useRef<HTMLDivElement>(null);
    useEffect(() => { const opener = document.activeElement as HTMLElement; const background = [...document.body.children].filter(x => !x.contains(panel.current)) as HTMLElement[]; background.forEach(x => { x.inert = true; }); panel.current?.querySelector<HTMLElement>('input,select,button')?.focus(); return () => { background.forEach(x => { x.inert = false; }); opener?.focus(); }; }, []);
    return createPortal(<div className="modal-backdrop"><div ref={panel} role="dialog" aria-modal="true" aria-label="Contacto de emergencia" className="confirm-dialog" onKeyDown={e => { if (e.key === 'Escape')
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
    return <section><h3>Empresa patrocinadora</h3><Message>{message}</Message><label>Buscar por RUC o razón social<input value={search} onChange={e => setSearch(e.target.value)}/></label><button type="button" onClick={() => edit()}>Nueva empresa</button>{choose && <button type="button" onClick={() => choose(null)}>Sin patrocinador</button>}<ul>{rows.map(r => <li key={r.id}>{value(r, 'ruc')} — {value(r, 'razon_social')} <button type="button" onClick={() => edit(r)}>Editar empresa</button>{choose && <button type="button" onClick={() => choose(r)}>Elegir empresa</button>}</li>)}</ul>{open && <InlineForm onSubmit={() => void save()}><Fields fields={fields} draft={draft} change={(k, v) => setDraft({ ...draft, [k]: v })} refs={{}}/><button disabled={busy}>Guardar empresa</button><button type="button" disabled={busy} onClick={() => setOpen(false)}>Cancelar</button></InlineForm>}</section>;
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
    {step === 0 && <label>Ciclo *<select required value={cycle?.id ?? ''} onChange={e => setCycle(cycles.find(c => c.id === e.target.value))}><option value="">Seleccionar Ciclo</option>{cycles.map(c => <option key={c.id} value={c.id}>{value(c, 'codigo_ciclo')} — {value(c, 'estado_codigo')}</option>)}</select></label>}
    {step === 1 && <><label>Buscar por documento<input value={search} onChange={e => setSearch(e.target.value)}/></label><button type="button" onClick={() => void find()}>Buscar Alumno</button><ul>{found.map(a => <li key={a.id}>{value(a, 'nombres')} {value(a, 'apellido_paterno')} <button type="button" onClick={() => setStudent(a)}>Seleccionar Alumno</button></li>)}</ul><button type="button" onClick={() => { setEditing(false); setEditor(true); }}>Nuevo Alumno</button>{student && <><p>{value(student, 'nombres')} — {value(student, 'numero_di')}</p><button type="button" onClick={() => { setEditing(true); setEditor(true); }}>Completar / editar ficha</button><Link to={`/alumnos/${student.id}`}>Ver ficha y contactos</Link></>}</>}
    {step === 2 && <p>{company ? value(company, 'razon_social') : 'Sin patrocinador'} — selecciona o crea una empresa en el panel inferior.</p>}
    {step === 3 && <><p>Las obligatorias se incluyen siempre. El servidor valida configuración, selección e importes.</p>{charges.map(c => { const t = c.tarifa as Record<string, unknown>; return <label key={c.id}><input type="checkbox" disabled={c.obligatorio === true} checked={c.obligatorio === true || options.includes(c.id)} onChange={e => setOptions(e.target.checked ? [...options, c.id] : options.filter(id => id !== c.id))}/>{value(t, 'nombre')} — S/{value(c, 'importe')} {c.obligatorio ? '(Obligatoria)' : '(Opcional)'}</label>; })}{director && <><label>Descuento Carrera (S/)<input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)}/></label><label>Motivo descuento (sin datos personales)<textarea required={Number(discount) > 0} maxLength={500} value={reason} onChange={e => setReason(e.target.value)}/></label></>}</>}
    {step === 4 && <><p>{value(cycle, 'codigo_ciclo')} — {value(student, 'nombres')} — {company ? value(company, 'razon_social') : 'Sin patrocinador'}</p><ul>{charges.filter(c => c.obligatorio === true || options.includes(c.id)).map(c => <li key={c.id}>{value(c.tarifa as Record<string, unknown>, 'nombre')} — S/{value(c, 'importe')}</li>)}</ul><p>Descuento solicitado: S/{discount}. Total de referencia: S/{(charges.filter(c => c.obligatorio === true || options.includes(c.id)).reduce((sum, c) => sum + Number(c.importe), 0) - Number(discount)).toFixed(2)}.</p><p>Importes mostrados según configuración consultada; la confirmación obtiene y calcula cargos desde el servidor.</p><label>Código manual opcional<input value={code} pattern="[0-9]{4}-[A-Za-z0-9]{2,10}-[0-9]{3,}" data-pattern-error="Usa YYYY-SIGLA-CORRELATIVO, sigla alfanumérica de 2 a 10 y correlativo de al menos 3 dígitos." onChange={e => setCode(e.target.value)}/></label></>}
    </fieldset><div className="actions">{step > 0 && <button type="button" disabled={busy} onClick={() => setStep(step - 1)}>Anterior</button>}<button disabled={busy || (step === 1 && !student) || (step >= 3 && !charges.length)}>{step < 4 ? 'Siguiente' : busy ? 'Registrando…' : 'Confirmar matrícula'}</button></div></InlineForm>{step === 2 && <Companies choose={setCompany}/>}</section>;
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
    {editable && <><InlineForm onSubmit={() => void save({ codigo_matricula: code })}><label>Código visible<input required value={code} pattern="[0-9]{4}-[A-Za-z0-9]{2,10}-[0-9]{3,}" data-pattern-error="Usa YYYY-SIGLA-CORRELATIVO, sigla alfanumérica de 2 a 10 y correlativo de al menos 3 dígitos." onChange={e => setCode(e.target.value)}/></label><button disabled={busy}>Guardar código</button></InlineForm><InlineForm onSubmit={() => void save({}, options.filter(id => tariffs.find(t => t.id === id)?.obligatorio === false))}><label>Ciclo destino<select value={target} onChange={e => setTarget(e.target.value)}>{cycles.map(c => <option key={c.id} value={c.id}>{value(c, 'codigo_ciclo')}</option>)}</select></label><p>Cambiar Ciclo conserva e inactiva los cargos anteriores; crea cargos nuevos con descuento cero. Solo Director podrá aplicar un nuevo descuento.</p>{tariffs.map(t => <label key={t.id}><input type="checkbox" disabled={t.obligatorio === true} checked={t.obligatorio === true || options.includes(t.id)} onChange={e => setOptions(e.target.checked ? [...options, t.id] : options.filter(x => x !== t.id))}/>{value(t.tarifa as Record<string, unknown>, 'nombre')} — S/{value(t, 'importe')}</label>)}<button disabled={busy}>Guardar Ciclo / opciones</button></InlineForm><Companies choose={c => void save({ empresa_patrocinadora_id: c?.id ?? '' })}/>{director && <InlineForm onSubmit={() => void save({ descuento: discount, motivo_descuento: reason })}><label>Nuevo descuento Carrera (S/)<input required type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)}/></label><label>Motivo (sin datos personales)<textarea required={Number(discount) > 0} maxLength={500} value={reason} onChange={e => setReason(e.target.value)}/></label><button disabled={busy}>Aplicar descuento</button></InlineForm>}</>}
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
        setRevision(revision + 1); }); }}>{r.activo ? 'Inactivar' : 'Activar'}</button></>}</li>)}</ul>{director && <InlineForm onSubmit={() => void save()}><h3>{selected ? 'Editar tarifa' : 'Nueva tarifa'}</h3><Fields fields={[["codigo", "Código tarifa", "required"], ["nombre", "Nombre tarifa", "required"], ["descripcion", "Descripción tarifa", "optional"], ["monto_por_defecto", "Monto por defecto (S/)", "required"]]} draft={draft} change={(k, v) => setDraft({ ...draft, [k]: v })} refs={{}}/><label>Tipo<select value={draft.tipo} onChange={e => setDraft({ ...draft, tipo: e.target.value })}><option>CARRERA</option><option>OTRO</option></select></label><button disabled={busy}>Guardar tarifa</button><button type="button" onClick={() => { setSelected(undefined); setDraft({ tipo: 'OTRO', monto_por_defecto: '0' }); }}>Nueva</button></InlineForm>}
    <h3>Tarifas por Ciclo</h3><label>Ciclo<select value={cycle?.id ?? ''} onChange={e => setCycle(cycles.find(c => c.id === e.target.value))}><option value="">Seleccionar</option>{cycles.map(c => <option key={c.id} value={c.id}>{value(c, 'codigo_ciclo')} — {value(c, 'estado_codigo')}</option>)}</select></label>{cycle && <InlineForm onSubmit={() => void configure()}><fieldset disabled={busy || !director || !['PROGRAMADO', 'EN_CURSO'].includes(value(cycle, 'estado_codigo'))}><legend>Selección manual; exactamente una Carrera activa obligatoria para matricular</legend>{rows.map(t => { const c = config[t.id]; return c && <div key={t.id}><label><input type="checkbox" disabled={!t.activo} checked={c.selected} onChange={e => setConfig({ ...config, [t.id]: { ...c, selected: e.target.checked } })}/>{value(t, 'nombre')}</label><label>Importe Ciclo (S/)<input type="number" min="0" step="0.01" value={c.importe} onChange={e => setConfig({ ...config, [t.id]: { ...c, importe: e.target.value } })}/></label><label><input type="checkbox" checked={c.obligatorio} onChange={e => setConfig({ ...config, [t.id]: { ...c, obligatorio: e.target.checked } })}/>Obligatoria</label></div>; })}<button>Guardar tarifas del Ciclo</button></fieldset></InlineForm>}</section>;
}
