import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ageAt, enrollmentError, StudentEditor } from '../src/enrollment/EnrollmentPages';
const { client } = vi.hoisted(() => ({ client: { from: vi.fn(), rpc: vi.fn() } }));
vi.mock('../src/security/SessionProvider', () => ({ useSession: () => ({ client, state: { phase: 'authorized', roles: ['COORDINADOR_ACADEMICO'] } }) }));
beforeEach(() => { client.from.mockImplementation(() => ({ select: () => ({ range: async () => ({ data: [], error: null }) }) })); client.rpc.mockReset(); });
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
    expect(screen.getByRole('tab', { name: 'Datos personales' })).toHaveFocus();
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
