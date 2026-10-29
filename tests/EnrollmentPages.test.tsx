import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ageAt, enrollmentError, StudentEditor, OccupationField } from '../src/enrollment/EnrollmentPages';
const { client, sessionState } = vi.hoisted(() => ({ client: { from: vi.fn(), rpc: vi.fn() }, sessionState: { phase: 'authorized', roles: ['COORDINADOR_ACADEMICO'] } }));
vi.mock('../src/security/SessionProvider', () => ({ useSession: () => ({ client, state: sessionState }) }));
beforeEach(() => { sessionState.roles = ['COORDINADOR_ACADEMICO']; client.from.mockImplementation(() => ({ select: () => ({ range: async () => ({ data: [], error: null }) }) })); client.rpc.mockReset(); });
describe('H3 student flow and safe feedback', () => {
    it.each([['2000-10-23', '2026-10-22', '25'], ['2000-10-22', '2026-10-22', '26'], ['2000-10-21', '2026-10-22', '26'], ['', '2026-10-22', '']])('derives age without persistence for %s', (birth, today, expected) => expect(ageAt(birth, today)).toBe(expected));
    it('keeps business/SQL details out of errors and requires explicit reload', () => { expect(enrollmentError({ code: '40001' })).toContain('Recarga'); expect(enrollmentError({ code: '42501' })).toContain('permiso'); expect(enrollmentError({ code: '23505' })).toContain('registrado'); expect(enrollmentError(null)).not.toMatch(/SQL|JWT|token/); });
    it('does not advance or write when required identification is empty; focuses first error', async () => {
        render(<StudentEditor done={vi.fn()} cancel={vi.fn()}/>);
        await waitFor(() => expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled());
        fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
        await waitFor(() => expect(screen.getByRole('textbox', { name: /^Apellido paterno/ })).toHaveFocus());
        expect(screen.getByRole('alert')).toHaveTextContent('Revisa los campos');
        expect(document.querySelector('[aria-current="step"]')).toHaveTextContent('Identificación');
        expect(client.rpc).not.toHaveBeenCalled();
    });
    it('cancels independently without making a write', async () => { const cancel = vi.fn(); render(<StudentEditor done={vi.fn()} cancel={cancel}/>); fireEvent.click(screen.getByRole('button', { name: 'Cancelar' })); expect(cancel).toHaveBeenCalledOnce(); expect(client.rpc).not.toHaveBeenCalled(); });
});
import { MemoryRouter } from 'react-router-dom';
import { StudentDetail, NewEnrollment } from '../src/enrollment/EnrollmentPages';
function resultQuery(data: unknown) {
    const q = { select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q, single: () => q,
        then: (resolve: (r: {
            data: unknown;
            error: null;
        }) => unknown) => Promise.resolve({ data, error: null }).then(resolve) };
    return q;
}
it('supports Tabs with arrows/Home/End and exposes the selected panel', async () => {
    client.from.mockImplementation((table: string) => ['catalogo', 'catalogo_valor', 'departamento', 'provincia', 'distrito'].includes(table) ? { select: () => ({ range: async () => ({ data: [], error: null }) }) } : resultQuery(table === 'alumno' ? { id: 'student', nombres: 'SINTETICO', numero_di: '12345678' } : []));
    render(<MemoryRouter><StudentDetail /></MemoryRouter>);
    const summary = await screen.findByRole('tab', { name: 'Resumen' });
    fireEvent.keyDown(summary, { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Matrículas' })).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Matrículas' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Matrículas' }), { key: 'Home' });
    expect(summary).toHaveFocus();
    fireEvent.keyDown(summary, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Identificación' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'student-tab-1');
});
it('returns from the new pupil flow to enrollment without losing its selected cycle', async () => {
    client.from.mockImplementation((table: string) => ['catalogo', 'catalogo_valor', 'departamento', 'provincia', 'distrito'].includes(table) ? { select: () => ({ range: async () => ({ data: [], error: null }) }) } : resultQuery(table === 'ciclo' ? [{ id: 'cycle', codigo_ciclo: 'SINTETICO', estado_codigo: 'PROGRAMADO', updated_at: 'v1' }] : []));
    render(<MemoryRouter><NewEnrollment /></MemoryRouter>);
    await screen.findByRole('option', { name: /SINTETICO/ });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'cycle' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo Alumno' }));
    expect(screen.getByRole('heading', { name: 'Nuevo Alumno' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(document.querySelector('[aria-current="step"]')).toHaveTextContent('Alumno');
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByRole('combobox')).toHaveValue('cycle');
    expect(client.rpc).not.toHaveBeenCalled();
});
import { Companies } from '../src/enrollment/EnrollmentPages'
it('uppercases typed and pasted company text in both controls and the saved request, preserving email', async () => {
  client.from.mockImplementation(() => resultQuery([]))
  client.rpc.mockResolvedValue({data:{id:'company',updated_at:'v1'},error:null})
  render(<Companies />)
  fireEvent.click(screen.getByRole('button',{name:'Nueva empresa'}))
  fireEvent.change(screen.getByLabelText(/^RUC/),{target:{value:'20123456789'}})
  const name=screen.getByLabelText(/^Razón social/)
  fireEvent.input(name,{target:{value:'mar del perú'},inputType:'insertFromPaste'})
  expect(name).toHaveValue('MAR DEL PERÚ')
  const email=screen.getByLabelText(/^Email empresa/)
  fireEvent.change(email,{target:{value:'Contacto@Example.invalid'}})
  expect(email).toHaveValue('Contacto@Example.invalid')
  fireEvent.click(screen.getByRole('button',{name:'Guardar empresa'}))
  await waitFor(()=>expect(client.rpc).toHaveBeenCalledWith('guardar_empresa_patrocinadora',expect.objectContaining({p:expect.objectContaining({razon_social:'MAR DEL PERÚ',email:'Contacto@Example.invalid'})})))
})
it('restricts document characters and length by selected type and clears the number when that type changes', async () => {
  client.from.mockImplementation((table:string)=>({select:()=>({range:async()=>({error:null,data:table==='catalogo'?[{id:'di',codigo:'TIPO_DI'}]:table==='catalogo_valor'?[{id:'dni',catalogo_id:'di',codigo:'DNI',nombre:'DNI',activo:true},{id:'ce',catalogo_id:'di',codigo:'CARNET_EXTRANJERIA',nombre:'Carné de extranjería',activo:true}]:[]})})}))
  render(<StudentEditor done={vi.fn()} cancel={vi.fn()}/>)
  const type=screen.getByRole('combobox',{name:/^Tipo DI/})
  const number=screen.getByRole('textbox',{name:/^Número DI/}) as HTMLInputElement
  expect(number).toBeDisabled()
  await screen.findByRole('option',{name:'DNI'})
  fireEvent.change(type,{target:{value:'dni'}})
  expect(number).toBeEnabled();expect(number).toHaveAttribute('maxlength','8');expect(number).toHaveAttribute('inputmode','numeric')
  fireEvent.change(number,{target:{value:'00123456'}});expect(number).toHaveValue('00123456')
  fireEvent.change(number,{target:{value:'00a12345-6789'}});expect(number).toHaveValue('00123456')
  number.setSelectionRange(0,8)
  fireEvent.paste(number,{clipboardData:{getData:()=> ' 12 345 678 '}})
  expect(number).toHaveValue('12345678')
  fireEvent.change(number,{target:{value:'1234567'}});expect(number.checkValidity()).toBe(false)
  fireEvent.change(type,{target:{value:'ce'}})
  expect(number).toHaveValue('');expect(number).toHaveAttribute('maxlength','30')
  fireEvent.paste(number,{clipboardData:{getData:()=> 'ab-0123!'}})
  expect(number).toHaveValue('AB0123');expect(number.checkValidity()).toBe(true)
  number.setSelectionRange(0,number.value.length)
  fireEvent.paste(number,{clipboardData:{getData:()=> 'ab'.repeat(20)}})
  expect(number.value).toBe('AB'.repeat(15))
  fireEvent.change(type,{target:{value:'dni'}});expect(number).toHaveValue('')
  expect(client.rpc).not.toHaveBeenCalled()
})
it('accepts only eleven RUC digits, including formatted paste, and blocks an incomplete RUC', async () => {
  client.from.mockImplementation(()=>resultQuery([]))
  render(<Companies/>)
  fireEvent.click(screen.getByRole('button',{name:'Nueva empresa'}))
  const ruc=screen.getByRole('textbox',{name:/^RUC/}) as HTMLInputElement
  expect(ruc).toHaveAttribute('maxlength','11');expect(ruc).toHaveAttribute('inputmode','numeric')
  fireEvent.paste(ruc,{clipboardData:{getData:()=> '20.123.456.789ABC999'}})
  expect(ruc).toHaveValue('20123456789')
  fireEvent.change(ruc,{target:{value:'2012345678'}})
  fireEvent.change(screen.getByLabelText(/^Razón social/),{target:{value:'Empresa'}})
  fireEvent.click(screen.getByRole('button',{name:'Guardar empresa'}))
  await waitFor(()=>expect(ruc).toHaveFocus())
  ruc.setSelectionRange(0,ruc.value.length)
  fireEvent.paste(ruc,{clipboardData:{getData:()=> '20 123 456 789'}})
  await waitFor(()=>expect(ruc).not.toHaveAttribute('aria-invalid'))
  expect(client.rpc).not.toHaveBeenCalled()
})
it('shows full sex labels while retaining the catalog value IDs', async () => {
  client.from.mockImplementation((table:string)=>({select:()=>({range:async()=>({error:null,data:table==='catalogo'?[{id:'sex',codigo:'SEXO'}]:table==='catalogo_valor'?[{id:'female',catalogo_id:'sex',codigo:'F',nombre:'FEMENINO',activo:true},{id:'male',catalogo_id:'sex',codigo:'M',nombre:'MASCULINO',activo:true}]:[]})})}))
  render(<StudentEditor done={vi.fn()} cancel={vi.fn()}/>)
  expect(await screen.findByRole('option',{name:'FEMENINO'})).toHaveValue('female')
  expect(screen.getByRole('option',{name:'MASCULINO'})).toHaveValue('male')
})
import { Students } from '../src/enrollment/EnrollmentPages'
it('identifies student search and keeps icon-only creation accessible with a dismissible tooltip', async () => {
  const like=vi.fn()
  const q={select:()=>q,order:()=>q,range:()=>q,ilike:(...args:unknown[])=>{like(...args);return q},then:(resolve:(result:{data:unknown[];error:null})=>unknown)=>Promise.resolve({data:[],error:null}).then(resolve)}
  client.from.mockReturnValue(q)
  render(<MemoryRouter><Students/></MemoryRouter>)
  expect(screen.getByRole('search',{name:'Búsqueda de alumnos'})).toBeInTheDocument()
  const search=screen.getByRole('searchbox',{name:'Buscar alumnos'})
  expect(search).toHaveAttribute('placeholder','Documento o apellido paterno')
  const create=screen.getByRole('link',{name:'Nuevo Alumno'})
  expect(create).toHaveAttribute('href','/alumnos/nuevo')
  expect(create.textContent).toBe('')
  expect(create.querySelector('svg')).toHaveAttribute('aria-hidden','true')
  expect(screen.getByRole('tooltip')).toHaveTextContent('Nuevo Alumno')
  fireEvent.keyDown(create,{key:'Escape'})
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  fireEvent.focus(create)
  expect(screen.getByRole('tooltip')).toBeInTheDocument()
  fireEvent.change(search,{target:{value:'00123456'}})
  await waitFor(()=>expect(like).toHaveBeenCalledWith('numero_di','%00123456%'))
})
async function openFilledReview(editing=false) {
  const references:Record<string,unknown[]>={
    catalogo:[{id:'type-cat',codigo:'TIPO_DI'},{id:'sex-cat',codigo:'SEXO'},{id:'parent-cat',codigo:'PARENTESCO'},{id:'eyes-cat',codigo:'COLOR_OJOS'}],
    catalogo_valor:[{id:'doc-dni',catalogo_id:'type-cat',codigo:'DNI',nombre:'DNI',activo:true},{id:'sex-f',catalogo_id:'sex-cat',codigo:'F',nombre:'FEMENINO',activo:true},{id:'rel-mother',catalogo_id:'parent-cat',codigo:'MADRE',nombre:'MADRE',activo:true},{id:'eyes-brown',catalogo_id:'eyes-cat',codigo:'MARRONES',nombre:'MARRONES',activo:true}],
    departamento:[{id:'geo-dep',nombre:'LIMA',active:true}],provincia:[{id:'geo-prov',departamento_id:'geo-dep',nombre:'LIMA',active:true}],distrito:[{id:'geo-dist',provincia_id:'geo-prov',nombre:'MIRAFLORES',active:true}]
  }
  client.from.mockImplementation((table:string)=>table==='alumno_contacto_emergencia'?resultQuery([{id:'existing-contact',apellido:'PÉREZ',nombre:'ELENA',parentesco_id:'rel-mother',celular:'999111222',direccion:'AV. MAR',activo:true}]):{select:()=>({range:async(start:number)=>({data:start===0?references[table]??[]:[],error:null})})})
  const filled={apellido_paterno:'MUÑOZ',apellido_materno:'GÓMEZ',nombres:'ANA',tipo_di_id:'doc-dni',numero_di:'00123456',fecha_nacimiento:'2000-01-02',sexo_id:'sex-f',nacimiento_departamento_id:'geo-dep',nacimiento_provincia_id:'geo-prov',nacimiento_distrito_id:'geo-dist',celular:'999123456',email:'ana@example.invalid',domicilio:'AV. MAR',domicilio_departamento_id:'geo-dep',domicilio_provincia_id:'geo-prov',domicilio_distrito_id:'geo-dist',color_ojos_id:'eyes-brown',estatura_cm:'165',peso_kg:'60'}
  const done=vi.fn()
  render(<StudentEditor initial={editing?{id:'existing-student',updated_at:'version-1',...filled}:undefined} done={done} cancel={vi.fn()}/>)
  await screen.findByRole('option',{name:'DNI'})
  const enter=(label:RegExp,value:string)=>fireEvent.change(screen.getByLabelText(label),{target:{value}})
  if(!editing){
    enter(/^Apellido paterno/,'muñoz');enter(/^Apellido materno/,'gómez');enter(/^Nombres/,'ana');enter(/^Tipo DI/,'doc-dni');enter(/^Número DI/,'00123456');enter(/^Fecha de nacimiento/,'2000-01-02');enter(/^Sexo/,'sex-f');enter(/^Departamento nacimiento/,'geo-dep');enter(/^Provincia nacimiento/,'geo-prov');enter(/^Distrito nacimiento/,'geo-dist')
  }
  fireEvent.click(screen.getByRole('button',{name:'Siguiente'}))
  if(!editing){enter(/^Celular/,'999123456');enter(/^Email/,'ana@example.invalid');enter(/^Domicilio/,'av. mar');enter(/^Departamento domicilio/,'geo-dep');enter(/^Provincia domicilio/,'geo-prov');enter(/^Distrito domicilio/,'geo-dist')}
  fireEvent.click(screen.getByRole('button',{name:'Siguiente'}))
  if(!editing){enter(/^Color de ojos/,'eyes-brown');enter(/^Estatura/,'165');enter(/^Peso/,'60')}
  fireEvent.click(screen.getByRole('button',{name:'Siguiente'}))
  fireEvent.click(screen.getByRole('button',{name:'Siguiente'}))
  return {done,enter}
}
it('reviews complete readable data and allows correcting one section without saving or losing the other steps', async()=>{
  const {done,enter}=await openFilledReview()
  const identity=screen.getByRole('region',{name:'Identificación'}),address=screen.getByRole('region',{name:'Domicilio'}),extra=screen.getByRole('region',{name:'Información adicional'})
  expect(within(identity).getByText('FEMENINO')).toBeInTheDocument()
  expect(within(identity).getByText('02/01/2000')).toBeInTheDocument()
  expect(within(address).getByText('MIRAFLORES')).toBeInTheDocument()
  expect(within(extra).getByText('MARRONES')).toBeInTheDocument()
  expect(within(extra).getByText('165 cm')).toBeInTheDocument()
  expect(within(extra).getByText('60 kg')).toBeInTheDocument()
  expect(screen.getByText(/No hay un contacto de emergencia activo/)).toBeInTheDocument()
  expect(screen.queryByText('geo-dist')).not.toBeInTheDocument()
  expect(client.rpc).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Corregir domicilio'}))
  expect(screen.getByLabelText(/^Celular/)).toHaveValue('999123456')
  enter(/^Domicilio/,'av. nueva')
  fireEvent.click(screen.getByRole('button',{name:'Aplicar cambios y revisar'}))
  expect(within(screen.getByRole('region',{name:'Domicilio'})).getByText('AV. NUEVA')).toBeInTheDocument()
  expect(within(screen.getByRole('region',{name:'Identificación'})).getByText('00123456')).toBeInTheDocument()
  expect(client.rpc).not.toHaveBeenCalled()
  client.rpc.mockResolvedValue({data:{id:'saved-student',updated_at:'v2'},error:null})
  fireEvent.click(screen.getByRole('button',{name:'Guardar'}))
  await waitFor(()=>expect(done).toHaveBeenCalledOnce())
  expect(client.rpc).toHaveBeenCalledWith('guardar_alumno',{p:expect.objectContaining({nombres:'ANA',numero_di:'00123456',domicilio:'AV. NUEVA',contactos:[]})})
})
it('validates a contact correction before returning to review and shows its relationship as a label', async()=>{
  const {enter}=await openFilledReview()
  fireEvent.click(screen.getByRole('button',{name:'Corregir contacto de emergencia'}))
  fireEvent.click(screen.getByRole('button',{name:'Agregar contacto'}))
  enter(/^Apellido contacto/,'pérez')
  fireEvent.click(screen.getByRole('button',{name:'Agregar a la lista'}))
  await waitFor(()=>expect(screen.getByRole('textbox',{name:/^Nombre contacto/})).toHaveFocus())
  enter(/^Nombre contacto/,'elena');enter(/^Parentesco/,'rel-mother');enter(/^Celular contacto/,'999111222')
  fireEvent.click(screen.getByRole('button',{name:'Agregar a la lista'}))
  fireEvent.click(screen.getByRole('button',{name:'Aplicar cambios y revisar'}))
  const contacts=screen.getByRole('region',{name:'Contacto de emergencia'})
  expect(within(contacts).getByText('ELENA')).toBeInTheDocument()
  expect(within(contacts).getByText('MADRE')).toBeInTheDocument()
  expect(screen.queryByText(/No hay un contacto de emergencia activo/)).not.toBeInTheDocument()
  expect(client.rpc).not.toHaveBeenCalled()
})
it('reviews existing contacts read-only without pretending they are missing or replacing them',async()=>{
  await openFilledReview(true)
  const contacts=screen.getByRole('region',{name:'Contacto de emergencia'})
  expect(await within(contacts).findByText('ELENA')).toBeInTheDocument()
  expect(within(contacts).queryByRole('button',{name:/Corregir/})).not.toBeInTheDocument()
  expect(screen.queryByText(/No hay un contacto de emergencia activo/)).not.toBeInTheDocument()
  expect(client.rpc).not.toHaveBeenCalled()
})

describe('occupation catalog entry', () => {
    const options = [{ id: 'other', codigo: 'OTROS', nombre: 'OTROS', orden: 0 }, { id: 'mechanic', codigo: 'MECANICO', nombre: 'MECÁNICO', orden: 1 }, { id: 'inactive', codigo: 'OLD', nombre: 'INACTIVO', activo: false }];
    function Form() {
        const [draft, setDraft] = useState<Record<string, string>>({});
        return <form><OccupationField draft={draft} change={(key, text) => setDraft(d => ({ ...d, [key]: text }))} options={options}/><output data-testid="draft">{JSON.stringify(draft)}</output></form>;
    }
    it('filters without accents, supports keyboard selection and stores catalog identity', () => {
        render(<Form/>); const input = screen.getByRole('combobox', { name: 'Ocupación' });
        fireEvent.focus(input);
        expect(screen.getAllByRole('option')[0]).toHaveTextContent('OTROS');
        expect(screen.queryByRole('option', { name: 'INACTIVO' })).not.toBeInTheDocument();
        fireEvent.change(input, { target: { value: 'mecan' } });
        expect(input).toHaveValue('MECAN'); expect(input).toBeInvalid();
        expect(screen.getAllByRole('option')).toHaveLength(1);
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(input).toHaveValue('MECÁNICO'); expect(input).toBeValid();
        expect(screen.getByTestId('draft')).toHaveTextContent('"ocupacion_id":"mechanic"');
        expect(screen.queryByLabelText('Especifica la ocupación *')).not.toBeInTheDocument();
    });
    it('keeps the list open while its scrollbar blurs the input and still permits selection', () => {
        render(<Form/>);
        const input = screen.getByRole('combobox', { name:'Ocupación' });
        fireEvent.focus(input);
        const list = screen.getByRole('listbox', { name:'Ocupaciones' });
        // Do not cancel the native scrollbar pointer gesture.
        expect(fireEvent.pointerDown(list)).toBe(true);
        fireEvent.blur(input, { relatedTarget:null });
        fireEvent.blur(input, { relatedTarget:document.body });
        fireEvent.pointerMove(list); fireEvent.scroll(list, { target:{scrollTop:100} }); fireEvent.pointerUp(list);
        expect(screen.getByRole('listbox')).toBe(list);
        expect(input).toHaveAttribute('aria-expanded','true');
        fireEvent.click(screen.getByRole('option', { name:'MECÁNICO' }));
        expect(input).toHaveValue('MECÁNICO');
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        expect(screen.getByTestId('draft')).toHaveTextContent('"ocupacion_id":"mechanic"');
    });
    it('closes for outside interaction, Tab, Escape and focus moving to another control', () => {
        render(<Form/>);
        const input = screen.getByRole('combobox');
        fireEvent.focus(input); fireEvent.pointerDown(document.body);
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        fireEvent.focus(input); fireEvent.keyDown(input, { key:'Tab' });
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        fireEvent.focus(input); fireEvent.change(input,{target:{value:'mec'}});
        fireEvent.keyDown(input, { key:'Escape' });
        expect(input).toHaveValue(''); expect(input).toBeValid();
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        fireEvent.focus(input);
        fireEvent.blur(input, { relatedTarget:screen.getByTestId('draft') });
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
    it('requires a separate uppercase detail for OTROS and clears it when changing selection', () => {
        render(<Form/>); const input = screen.getByRole('combobox'); fireEvent.focus(input);
        fireEvent.click(screen.getByRole('option', { name: 'OTROS' }));
        const detail = screen.getByRole('textbox', { name: 'Especifica la ocupación *' });
        expect(detail).toBeRequired(); expect(detail).toBeInvalid();
        fireEvent.change(detail, { target: { value: 'soldador naval' } });
        expect(detail).toHaveValue('SOLDADOR NAVAL');
        fireEvent.focus(input); fireEvent.change(input, { target: { value: 'mec' } });
        fireEvent.click(screen.getByRole('option', { name: 'MECÁNICO' }));
        expect(screen.getByTestId('draft')).not.toHaveTextContent('SOLDADOR');
    });
});

it('places resizable three-line distinguishing marks last after occupation', async () => {
    await openFilledReview();
    fireEvent.click(screen.getByRole('button', { name: 'Corregir información adicional' }));
    const notes = screen.getByRole('textbox', { name: 'Señas particulares' });
    expect(notes.tagName).toBe('TEXTAREA'); expect(notes).toHaveAttribute('rows','3'); expect(notes).toHaveAttribute('maxlength','500');
    expect(notes.closest('.form-grid')?.lastElementChild).toBe(notes.closest('label'));
    fireEvent.change(notes, { target: { value: 'cicatriz en brazo' } }); expect(notes).toHaveValue('CICATRIZ EN BRAZO');
});

it('shows the registered form read-only in section tabs and edits the current section', async () => {
    const row = { id:'student', apellido_paterno:'ROBLES', apellido_materno:'CASTILLO', nombres:'PEDRO', numero_di:'01234987', tipo_di_id:'dni', sexo_id:'male', fecha_nacimiento:'1984-08-14', domicilio:'CALLE 1', ocupacion_id:'other', ocupacion:'SOLDADOR NAVAL', senas_particulares:'CICATRIZ EN BRAZO' };
    const refs: Record<string, unknown[]> = { catalogo:[], catalogo_valor:[{ id:'dni', nombre:'DNI' },{ id:'male', nombre:'MASCULINO' },{ id:'other', codigo:'OTROS', nombre:'OTROS' }], departamento:[], provincia:[], distrito:[] };
    client.from.mockImplementation((table: string) => table in refs ? { select: () => ({ range: async () => ({ data:refs[table], error:null }) }) } : resultQuery(table === 'alumno' ? row : []));
    render(<MemoryRouter><StudentDetail/></MemoryRouter>);
    const identification = await screen.findByRole('tab', { name:'Identificación' });
    expect(identification).toHaveAttribute('aria-selected','true');
    expect(screen.getByRole('heading', { name:'ROBLES CASTILLO, PEDRO' })).toBeInTheDocument();
    const document = screen.getByRole('textbox', { name:'Número DI' });
    expect(document).toHaveValue('01234987'); expect(document).toHaveAttribute('readonly');
    await waitFor(() => expect(screen.getByRole('textbox', { name:'Sexo' })).toHaveValue('MASCULINO'));
    expect(screen.getByRole('textbox', { name:'Fecha de nacimiento' })).toHaveValue('14/08/1984');
    fireEvent.click(screen.getByRole('tab', { name:'Información adicional' }));
    expect(screen.getByRole('textbox', { name:'Ocupación' })).toHaveValue('OTROS — SOLDADOR NAVAL');
    expect(screen.getByRole('textbox', { name:'Señas particulares' })).toHaveAttribute('rows','3');
    fireEvent.click(screen.getByRole('tab', { name:'Domicilio' }));
    expect(screen.getByRole('textbox', { name:'Domicilio' })).toHaveValue('CALLE 1');
    fireEvent.click(screen.getByRole('button', { name:'Editar alumno' }));
    expect(screen.getByRole('textbox', { name:/^Domicilio/ })).not.toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('button', { name:'Cancelar' }));
    expect(screen.getByRole('tab', { name:'Domicilio' })).toHaveAttribute('aria-selected','true');
    expect(screen.getByRole('textbox', { name:'Domicilio' })).toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('tab', { name:'Contactos' }));
    expect(screen.getByText('No hay contactos registrados.')).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name:'Matrículas' }));
    expect(screen.getByText('No hay matrículas registradas.')).toBeVisible();
    expect(client.rpc).not.toHaveBeenCalled();
});

it('lists pupils in compact rows with view/edit actions and newest-first pagination/search', async () => {
    const rows = Array.from({ length:30 }, (_,i) => ({ id:`s${i}`, apellido_paterno:`APELLIDO${i}`, apellido_materno:'PRUEBA', nombres:'ALUMNO', numero_di:`000000${String(i).padStart(2,'0')}`, created_at:'2026-10-28T16:00:00Z' }));
    const order = vi.fn(), range = vi.fn(), filter = vi.fn();
    const q = { select:()=>q, order:(...args:unknown[])=>{order(...args);return q}, range:(...args:unknown[])=>{range(...args);return q}, ilike:(...args:unknown[])=>{filter(...args);return q}, then:(resolve:(r:{data:unknown[];error:null})=>unknown)=>Promise.resolve({data:rows,error:null}).then(resolve) };
    client.from.mockReturnValue(q);
    render(<MemoryRouter><Students/></MemoryRouter>);
    const table = await screen.findByRole('table', { name:'Alumnos por fecha de registro descendente' });
    await waitFor(()=>expect(within(table).getAllByRole('row')).toHaveLength(31));
    expect(order).toHaveBeenCalledWith('created_at',{ascending:false});
    expect(order).toHaveBeenCalledWith('id',{ascending:false});
    expect(screen.getByRole('link',{name:'Ver alumno: APELLIDO0 PRUEBA, ALUMNO'})).toHaveAttribute('href','/alumnos/s0');
    expect(screen.getByRole('link',{name:'Editar alumno: APELLIDO0 PRUEBA, ALUMNO'})).toHaveAttribute('href','/alumnos/s0?editar=1');
    expect(within(table).getAllByRole('cell')[1]).toHaveTextContent('00000000');
    fireEvent.click(screen.getByRole('button',{name:'Siguiente página'}));
    await waitFor(()=>expect(range).toHaveBeenCalledWith(30,59));
    fireEvent.change(screen.getByRole('searchbox'),{target:{value:'robles'}});
    await waitFor(()=>expect(filter).toHaveBeenCalledWith('apellido_paterno','%ROBLES%'));
    expect(range).toHaveBeenLastCalledWith(0,29);
    expect(client.rpc).not.toHaveBeenCalled();
});
it('does not offer creation or edit when the existing academic editing roles are absent', async () => {
    sessionState.roles = [];
    const q = { select:()=>q, order:()=>q, range:()=>q, then:(resolve:(r:{data:unknown[];error:null})=>unknown)=>Promise.resolve({data:[{id:'s',nombres:'PRUEBA'}],error:null}).then(resolve) };
    client.from.mockReturnValue(q);
    render(<MemoryRouter><Students/></MemoryRouter>);
    await screen.findByRole('link',{name:/Ver alumno:/});
    expect(screen.queryByRole('link',{name:/Editar alumno:/})).not.toBeInTheDocument();
    expect(screen.queryByRole('link',{name:'Nuevo Alumno'})).not.toBeInTheDocument();
});
it('opens the editor from the list edit link and cancel returns to consultation', async () => {
    const refs = ['catalogo','catalogo_valor','departamento','provincia','distrito'];
    client.from.mockImplementation((table:string)=>refs.includes(table) ? {select:()=>({range:async()=>({data:[],error:null})})} : resultQuery(table==='alumno'?{id:'s',nombres:'PRUEBA',apellido_paterno:'ALUMNO'}:[]));
    render(<MemoryRouter initialEntries={['/alumnos/s?editar=1']}><StudentDetail/></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Editando alumno')).toBeVisible());
    expect(screen.getByRole('textbox',{name:/Apellido paterno/})).not.toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));
    expect(screen.getByRole('heading',{name:'Ficha del alumno'})).toBeInTheDocument();
    expect(screen.getByRole('textbox',{name:'Apellido paterno'})).toHaveAttribute('readonly');
    expect(client.rpc).not.toHaveBeenCalled();
});

async function openTabbedStudent({ editing = false, emptyContacts = false } = {}) {
    const refs: Record<string, unknown[]> = {
        catalogo:[{id:'cat-di',codigo:'TIPO_DI'},{id:'cat-sex',codigo:'SEXO'},{id:'cat-rel',codigo:'PARENTESCO'},{id:'cat-occupation',codigo:'OCUPACION'}],
        catalogo_valor:[{id:'dni',catalogo_id:'cat-di',codigo:'DNI',nombre:'DNI',activo:true},{id:'female',catalogo_id:'cat-sex',codigo:'F',nombre:'FEMENINO',activo:true},{id:'mother',catalogo_id:'cat-rel',codigo:'MADRE',nombre:'MADRE',activo:true},{id:'other',catalogo_id:'cat-occupation',codigo:'OTROS',nombre:'OTROS',orden:0,activo:true}],
        departamento:[{id:'dep',nombre:'LIMA',active:true}],provincia:[{id:'prov',nombre:'LIMA',departamento_id:'dep',active:true}],distrito:[{id:'dist',nombre:'MIRAFLORES',provincia_id:'prov',active:true}]
    };
    const row = {id:'s',updated_at:'student-v1',apellido_paterno:'MUÑOZ',apellido_materno:'GÓMEZ',nombres:'ANA',tipo_di_id:'dni',numero_di:'00123456',fecha_nacimiento:'2000-01-02',sexo_id:'female',nacimiento_departamento_id:'dep',nacimiento_provincia_id:'prov',nacimiento_distrito_id:'dist',celular:'999123456',domicilio:'AV. MAR',domicilio_departamento_id:'dep',domicilio_provincia_id:'prov',domicilio_distrito_id:'dist',email:'ana@example.invalid',ocupacion_id:'other',ocupacion:'SOLDADOR NAVAL',senas_particulares:'CICATRIZ',estatura_cm:'165',peso_kg:'60'};
    const contacts = emptyContacts ? [] : [{id:'c1',updated_at:'contact-v1',apellido:'PÉREZ',nombre:'ELENA',parentesco_id:'mother',celular:'999111222',direccion:'AV. PUERTO 123',activo:true},{id:'c2',updated_at:'contact-v2',apellido:'LÓPEZ',nombre:'LUIS',parentesco_id:'mother',celular:'999333444',direccion:null,activo:false}];
    client.from.mockImplementation((table:string)=>table in refs ? {select:()=>({range:async(start:number)=>({data:start===0?refs[table]:[],error:null})})} : resultQuery(table==='alumno'?row:table==='alumno_contacto_emergencia'?contacts:[]));
    render(<MemoryRouter initialEntries={[`/alumnos/s${editing?'?editar=1':''}`]}><StudentDetail/></MemoryRouter>);
    await screen.findByRole('heading',{name:'MUÑOZ GÓMEZ, ANA'});
    await waitFor(()=>expect(screen.getByRole(editing?'combobox':'textbox',{name:/^Sexo/})).toHaveValue(editing?'female':'FEMENINO'));
    return {row,contacts};
}
it('keeps the same record and tabs for viewing/editing and preserves drafts across arbitrary sections',async()=>{
    const {row}=await openTabbedStudent();
    const title=screen.getByRole('heading',{name:'Ficha del alumno'});
    const names=screen.getAllByRole('tab').map(t=>t.textContent);
    fireEvent.click(screen.getByRole('button',{name:'Editar alumno'}));
    expect(screen.getByRole('heading',{name:'Ficha del alumno'})).toBe(title);
    expect(screen.getAllByRole('tab').map(t=>t.textContent)).toEqual(names);
    const first=screen.getByRole('textbox',{name:/^Nombres/});
    fireEvent.change(first,{target:{value:'ana maría'}});
    fireEvent.click(screen.getByRole('tab',{name:'Domicilio'}));
    fireEvent.change(screen.getByRole('textbox',{name:/^Domicilio/}),{target:{value:'av. nueva'}});
    fireEvent.click(screen.getByRole('tab',{name:'Información adicional'}));
    fireEvent.change(screen.getByRole('textbox',{name:'Señas particulares'}),{target:{value:'cicatriz y lunar'}});
    fireEvent.click(screen.getByRole('tab',{name:'Contactos'}));
    expect(screen.getByRole('button',{name:'Agregar contacto'})).toBeDisabled();
    fireEvent.click(screen.getByRole('tab',{name:'Identificación'}));
    expect(screen.getByRole('textbox',{name:/^Nombres/})).toBe(first);
    expect(first).toHaveValue('ANA MARÍA');
    fireEvent.click(screen.getByRole('tab',{name:'Resumen'}));
    expect(within(screen.getByRole('region',{name:'Domicilio'})).getByText('AV. NUEVA')).toBeVisible();
    expect(within(screen.getByRole('region',{name:'Información adicional'})).getByText('CICATRIZ Y LUNAR')).toBeVisible();
    expect(client.rpc).not.toHaveBeenCalled();
    client.rpc.mockResolvedValue({data:{...row,nombres:'ANA MARÍA',domicilio:'AV. NUEVA',senas_particulares:'CICATRIZ Y LUNAR',updated_at:'student-v2'},error:null});
    fireEvent.click(screen.getByRole('button',{name:'Guardar cambios'}));
    await waitFor(()=>expect(screen.getByRole('button',{name:'Editar alumno'})).toBeVisible());
    expect(client.rpc).toHaveBeenCalledWith('guardar_alumno',{p:expect.objectContaining({id:'s',expected_updated_at:'student-v1',nombres:'ANA MARÍA',domicilio:'AV. NUEVA',senas_particulares:'CICATRIZ Y LUNAR',contactos:[]})});
    expect(screen.getByRole('tab',{name:'Resumen'})).toHaveAttribute('aria-selected','true');
});
it('uses the complete review data for Resumen with readable references, all sections and contacts',async()=>{
    await openTabbedStudent();
    fireEvent.click(screen.getByRole('tab',{name:'Resumen'}));
    const identity=screen.getByRole('region',{name:'Identificación'}),address=screen.getByRole('region',{name:'Domicilio'}),extra=screen.getByRole('region',{name:'Información adicional'}),contacts=screen.getByRole('region',{name:'Contacto de emergencia'});
    expect(within(identity).getByText('FEMENINO')).toBeVisible();
    expect(within(identity).getByText('02/01/2000')).toBeVisible();
    expect(within(address).getByText('MIRAFLORES')).toBeVisible();
    expect(within(extra).getByText('OTROS — SOLDADOR NAVAL')).toBeVisible();
    expect(within(extra).getByText('165 cm')).toBeVisible();
    expect(within(extra).getByText('60 kg')).toBeVisible();
    expect(within(contacts).getByText('AV. PUERTO 123')).toBeVisible();
    expect(within(contacts).getByText('ELENA')).toBeVisible();
    expect(within(contacts).getByText('LUIS')).toBeVisible();
    expect(screen.queryByRole('button',{name:/Corregir/})).not.toBeInTheDocument();
    expect(client.rpc).not.toHaveBeenCalled();
});
it('opens the first invalid section on save and error links reveal other hidden sections',async()=>{
    await openTabbedStudent({editing:true});
    fireEvent.change(screen.getByRole('textbox',{name:/^Apellido materno/}),{target:{value:''}});
    fireEvent.click(screen.getByRole('tab',{name:'Domicilio'}));
    fireEvent.change(screen.getByRole('textbox',{name:/^Domicilio/}),{target:{value:''}});
    fireEvent.click(screen.getByRole('tab',{name:'Resumen'}));
    fireEvent.click(screen.getByRole('button',{name:'Guardar cambios'}));
    await waitFor(()=>expect(screen.getByRole('textbox',{name:/^Apellido materno/})).toHaveFocus());
    expect(screen.getByRole('tab',{name:'Identificación'})).toHaveAttribute('aria-selected','true');
    expect(client.rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('link',{name:/^Domicilio: Completa/}));
    await waitFor(()=>expect(screen.getByRole('textbox',{name:/^Domicilio/})).toHaveFocus());
    expect(screen.getByRole('tab',{name:'Domicilio'})).toHaveAttribute('aria-selected','true');
});
it('cancel discards tabbed edits; a version conflict retains the draft and never retries',async()=>{
    await openTabbedStudent({editing:true});
    fireEvent.change(screen.getByRole('textbox',{name:/^Nombres/}),{target:{value:'borrador'}});
    fireEvent.click(screen.getByRole('tab',{name:'Domicilio'}));
    fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));
    fireEvent.click(screen.getByRole('tab',{name:'Identificación'}));
    expect(screen.getByRole('textbox',{name:'Nombres'})).toHaveValue('ANA');
    fireEvent.click(screen.getByRole('button',{name:'Editar alumno'}));
    fireEvent.change(screen.getByRole('textbox',{name:/^Nombres/}),{target:{value:'cambio'}});
    client.rpc.mockResolvedValue({data:null,error:{code:'40001'}});
    fireEvent.click(screen.getByRole('tab',{name:'Información adicional'}));
    fireEvent.click(screen.getByRole('button',{name:'Guardar cambios'}));
    await screen.findByText(/La información cambió/);
    fireEvent.click(screen.getByRole('tab',{name:'Identificación'}));
    expect(screen.getByRole('textbox',{name:/^Nombres/})).toHaveValue('CAMBIO');
    expect(client.rpc).toHaveBeenCalledTimes(1);
});
it('shows every functional contact field and exposes actions only for active contacts',async()=>{
    await openTabbedStudent();
    fireEvent.click(screen.getByRole('tab',{name:'Contactos'}));
    const table=screen.getByRole('table',{name:'Contactos de emergencia'});
    expect(within(table).getAllByRole('columnheader').map(h=>h.textContent)).toEqual(['Apellidos','Nombres','Parentesco','Celular','Dirección','Estado','Acciones']);
    const rows=within(table).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('PÉREZ');expect(rows[1]).toHaveTextContent('ELENA');expect(rows[1]).toHaveTextContent('MADRE');expect(rows[1]).toHaveTextContent('999111222');expect(rows[1]).toHaveTextContent('AV. PUERTO 123');
    expect(within(rows[2]).queryByRole('button')).not.toBeInTheDocument();
    expect(rows[2]).toHaveTextContent('Inactivo');expect(rows[2]).toHaveTextContent('No indicado');
    fireEvent.click(screen.getByRole('button',{name:'Editar contacto: PÉREZ ELENA'}));
    const dialog=screen.getByRole('dialog',{name:'Contacto de emergencia'});
    expect(within(dialog).getByRole('textbox',{name:'Dirección contacto'})).toHaveValue('AV. PUERTO 123');
    fireEvent.change(within(dialog).getByRole('textbox',{name:'Dirección contacto'}),{target:{value:'av. actualizada'}});
    client.rpc.mockResolvedValue({data:{id:'c1'},error:null});
    fireEvent.click(within(dialog).getByRole('button',{name:'Guardar contacto'}));
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(client.rpc).toHaveBeenCalledWith('guardar_contacto_emergencia',{p:expect.objectContaining({id:'c1',expected_updated_at:'contact-v1',alumno_id:'s',expected_alumno_updated_at:'student-v1',direccion:'AV. ACTUALIZADA'})});
});
it('requires confirmation to retire a contact and uses the existing command without DELETE',async()=>{
    await openTabbedStudent();
    fireEvent.click(screen.getByRole('tab',{name:'Contactos'}));
    fireEvent.click(screen.getByRole('button',{name:'Retirar contacto: PÉREZ ELENA'}));
    const dialog=screen.getByRole('dialog',{name:'Retirar contacto'});
    fireEvent.click(within(dialog).getByRole('button',{name:'Cancelar operación'}));
    expect(client.rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Retirar contacto: PÉREZ ELENA'}));
    client.rpc.mockResolvedValue({data:{},error:null});
    fireEvent.click(within(screen.getByRole('dialog',{name:'Retirar contacto'})).getByRole('button',{name:'Confirmar operación'}));
    await waitFor(()=>expect(client.rpc).toHaveBeenCalledWith('retirar_contacto_emergencia',{id:'c1',expected_alumno_updated_at:'student-v1'}));
});

it('stages multiple contacts in the shared grid, edits/removes locally and sends only final contacts in the student transaction', async()=>{
    const {done}=await openFilledReview();
    fireEvent.click(screen.getByRole('button',{name:'Corregir contacto de emergencia'}));
    expect(screen.getByText(/Al continuar conservarás lo corregido/)).toBeVisible();
    expect(screen.queryByRole('button',{name:'Volver al resumen'})).not.toBeInTheDocument();
    const add=(apellido:string,nombre:string,celular:string)=>{
        fireEvent.click(screen.getByRole('button',{name:'Agregar contacto'}));
        const dialog=within(screen.getByRole('dialog',{name:'Contacto de emergencia'}));
        fireEvent.change(dialog.getByRole('textbox',{name:/^Apellido contacto/}),{target:{value:apellido}});
        fireEvent.change(dialog.getByRole('textbox',{name:/^Nombre contacto/}),{target:{value:nombre}});
        fireEvent.change(dialog.getByRole('combobox',{name:/^Parentesco/}),{target:{value:'rel-mother'}});
        fireEvent.change(dialog.getByRole('textbox',{name:/^Celular contacto/}),{target:{value:celular}});
        fireEvent.click(dialog.getByRole('button',{name:'Agregar a la lista'}));
    };
    add('pérez','elena','999111222');add('lópez','luis','999333444');add('prueba','quitar','999555666');
    const table=screen.getByRole('table',{name:'Contactos de emergencia'});
    expect(within(table).getAllByRole('columnheader').map(h=>h.textContent)).toEqual(['Apellidos','Nombres','Parentesco','Celular','Dirección','Estado','Acciones']);
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getAllByText('Por guardar')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button',{name:'Editar contacto: PÉREZ ELENA'}));
    let dialog=within(screen.getByRole('dialog',{name:'Contacto de emergencia'}));
    fireEvent.change(dialog.getByRole('textbox',{name:/^Celular contacto/}),{target:{value:'999000000'}});
    fireEvent.click(dialog.getByRole('button',{name:'Cancelar'}));
    expect(within(table).getByText('999111222')).toBeVisible();
    fireEvent.click(screen.getByRole('button',{name:'Editar contacto: PÉREZ ELENA'}));
    dialog=within(screen.getByRole('dialog',{name:'Contacto de emergencia'}));
    fireEvent.change(dialog.getByRole('textbox',{name:/^Celular contacto/}),{target:{value:'999000000'}});
    fireEvent.click(dialog.getByRole('button',{name:'Aplicar cambios'}));
    fireEvent.click(screen.getByRole('button',{name:'Quitar contacto: PRUEBA QUITAR'}));
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).queryByText('QUITAR')).not.toBeInTheDocument();
    expect(client.rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Aplicar cambios y revisar'}));
    const review=screen.getByRole('region',{name:'Contacto de emergencia'});
    expect(within(review).getByText('ELENA')).toBeVisible();expect(within(review).getByText('LUIS')).toBeVisible();
    expect(within(review).getByText('999000000')).toBeVisible();
    client.rpc.mockResolvedValue({data:{id:'saved',updated_at:'v1'},error:null});
    fireEvent.click(screen.getByRole('button',{name:'Guardar'}));
    await waitFor(()=>expect(done).toHaveBeenCalledOnce());
    expect(client.rpc).toHaveBeenCalledOnce();
    expect(client.rpc).toHaveBeenCalledWith('guardar_alumno',{p:expect.objectContaining({contactos:[{apellido:'PÉREZ',nombre:'ELENA',parentesco_id:'rel-mother',celular:'999000000',direccion:null},{apellido:'LÓPEZ',nombre:'LUIS',parentesco_id:'rel-mother',celular:'999333444',direccion:null}]})});
});
it('retains staged contacts if final registration fails and makes no contact writes before confirmation',async()=>{
    await openFilledReview();
    fireEvent.click(screen.getByRole('button',{name:'Corregir contacto de emergencia'}));
    fireEvent.click(screen.getByRole('button',{name:'Agregar contacto'}));
    let dialog=within(screen.getByRole('dialog',{name:'Contacto de emergencia'}));
    fireEvent.change(dialog.getByRole('textbox',{name:/^Nombre contacto/}),{target:{value:'descartar'}});
    fireEvent.click(dialog.getByRole('button',{name:'Cancelar'}));
    expect(screen.getByText('No hay contactos registrados.')).toBeVisible();
    fireEvent.click(screen.getByRole('button',{name:'Agregar contacto'}));
    dialog=within(screen.getByRole('dialog',{name:'Contacto de emergencia'}));
    fireEvent.change(dialog.getByRole('textbox',{name:/^Apellido contacto/}),{target:{value:'pérez'}});
    fireEvent.change(dialog.getByRole('textbox',{name:/^Nombre contacto/}),{target:{value:'elena'}});
    fireEvent.change(dialog.getByRole('combobox',{name:/^Parentesco/}),{target:{value:'rel-mother'}});
    fireEvent.change(dialog.getByRole('textbox',{name:/^Celular contacto/}),{target:{value:'999111222'}});
    fireEvent.click(dialog.getByRole('button',{name:'Agregar a la lista'}));
    fireEvent.click(screen.getByRole('button',{name:'Aplicar cambios y revisar'}));
    expect(client.rpc).not.toHaveBeenCalled();
    client.rpc.mockResolvedValue({data:null,error:{code:'23514'}});
    fireEvent.click(screen.getByRole('button',{name:'Guardar'}));
    await screen.findByText(/No se pudo guardar/);
    fireEvent.click(screen.getByRole('button',{name:'Corregir contacto de emergencia'}));
    expect(screen.getByRole('table',{name:'Contactos de emergencia'})).toHaveTextContent('ELENA');
    expect(client.rpc).toHaveBeenCalledOnce();
});

it('keeps contact keyboard focus inside the modal and restores the opener without losing the pupil draft',async()=>{
    await openFilledReview();
    fireEvent.click(screen.getByRole('button',{name:'Corregir contacto de emergencia'}));
    const opener=screen.getByRole('button',{name:'Agregar contacto'});
    opener.focus();fireEvent.click(opener);
    const modal=screen.getByRole('dialog',{name:'Contacto de emergencia'});
    const first=within(modal).getByRole('textbox',{name:/^Apellido contacto/});
    const last=within(modal).getByRole('button',{name:'Agregar a la lista'});
    expect(first).toHaveFocus();
    expect(opener.closest('body > div')).toHaveProperty('inert',true);
    first.focus();fireEvent.keyDown(first,{key:'Tab',shiftKey:true});expect(last).toHaveFocus();
    fireEvent.keyDown(last,{key:'Tab'});expect(first).toHaveFocus();
    fireEvent.change(first,{target:{value:'borrador de contacto'}});
    fireEvent.keyDown(first,{key:'Escape'});
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();expect(opener.closest('body > div')).toHaveProperty('inert',false);
    fireEvent.click(screen.getByRole('button',{name:'Aplicar cambios y revisar'}));
    expect(within(screen.getByRole('region',{name:'Identificación'})).getByText('00123456')).toBeVisible();
    expect(within(screen.getByRole('region',{name:'Domicilio'})).getByText('AV. MAR')).toBeVisible();
    expect(client.rpc).not.toHaveBeenCalled();
});
