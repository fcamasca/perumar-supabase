import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { AccountMenu } from '../src/security/AccountMenu'
const mock = vi.hoisted(() => ({ state: { userId: 'user', displayName: 'Frankz Camasca', email: 'synthetic@example.invalid', roles: ['DIRECTOR_ACADEMICO'] }, logout: vi.fn() }))
vi.mock('../src/security/SessionProvider', () => ({ useSession: () => ({ state: mock.state, logout: mock.logout }) }))
beforeEach(() => { mock.state = { userId: 'user', displayName: 'Frankz Camasca', email: 'synthetic@example.invalid', roles: ['DIRECTOR_ACADEMICO'] }; mock.logout.mockReset().mockResolvedValue(undefined) })
function Form() {
 const [text,setText] = useState('')
 const location = useLocation()
 return <><AccountMenu key={mock.state.userId}/><input aria-label="Borrador" value={text} onChange={e=>setText(e.target.value)}/><output>{location.pathname}</output><button>Otra acción</button></>
}
function show() { return render(<MemoryRouter initialEntries={['/academico/ciclos']}><Form/></MemoryRouter>) }
it('keeps the signed-in name and DB role visible and shows initials', () => {
 show()
 const button=screen.getByRole('button',{name:'Mi cuenta: Frankz Camasca'})
 expect(button).toHaveTextContent('FC'); expect(button).toHaveTextContent('Director académico')
 expect(button).toHaveAttribute('aria-expanded','false');expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('opens identity and profiles without navigating, remounting or losing the form draft', () => {
 show();const input=screen.getByLabelText('Borrador');fireEvent.change(input,{target:{value:'DATOS SIN GUARDAR'}})
 fireEvent.click(screen.getByRole('button',{name:/Mi cuenta:/}))
 const dialog=screen.getByRole('dialog',{name:'Mi cuenta'})
 expect(within(dialog).getByText('synthetic@example.invalid')).toBeVisible()
 expect(within(dialog).getByText('Director académico')).toBeVisible()
 expect(screen.getByRole('button',{name:'Cerrar panel de cuenta'})).toHaveFocus()
 expect(screen.getByLabelText('Borrador')).toBe(input);expect(input).toHaveValue('DATOS SIN GUARDAR')
 expect(screen.getByText('/academico/ciclos')).toBeVisible()
 fireEvent.keyDown(document,{key:'Escape'})
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
 expect(screen.getByRole('button',{name:/Mi cuenta:/})).toHaveFocus();expect(input).toHaveValue('DATOS SIN GUARDAR')
})
it('dismisses on outside pointer and focus leaving the panel without navigation or a write', () => {
 show();const trigger=screen.getByRole('button',{name:/Mi cuenta:/})
 fireEvent.click(trigger);fireEvent.pointerDown(screen.getByLabelText('Borrador'))
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
 fireEvent.click(trigger);fireEvent.blur(screen.getByRole('button',{name:'Cerrar panel de cuenta'}),{relatedTarget:screen.getByLabelText('Borrador')})
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(mock.logout).not.toHaveBeenCalled()
})
it('shows all assigned profiles and the existing directory link only to admins', () => {
 mock.state.roles=['COORDINADOR_ACADEMICO','ADMIN_SISTEMA'];show();fireEvent.click(screen.getByRole('button',{name:/Mi cuenta:/}))
 const panel=screen.getByRole('dialog');expect(within(panel).getByText('Coordinador académico')).toBeVisible();expect(within(panel).getByText('Administrador del sistema')).toBeVisible()
 expect(within(panel).getByRole('link',{name:'Directorio de seguridad'})).toHaveAttribute('href','/seguridad/usuarios')
})
it('keeps navigation secondary and signs out only after explicit action', () => {
 show();expect(mock.logout).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:/Mi cuenta:/}))
 expect(screen.queryByRole('link',{name:'Directorio de seguridad'})).not.toBeInTheDocument()
 expect(screen.getByRole('link',{name:'Mi acceso'})).toHaveAttribute('href','/seguridad')
 fireEvent.click(screen.getByRole('button',{name:'Cerrar sesión'}));expect(mock.logout).toHaveBeenCalledOnce()
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('uses email when no display name exists and removes the old panel on identity change', () => {
 mock.state.displayName='';const view=show();fireEvent.click(screen.getByRole('button',{name:'Mi cuenta: synthetic@example.invalid'}))
 expect(within(screen.getByRole('dialog')).getAllByText('synthetic@example.invalid')).toHaveLength(1)
 mock.state={userId:'other',displayName:'Otra Cuenta',email:'other@example.invalid',roles:['COORDINADOR_ACADEMICO']}
 view.rerender(<MemoryRouter initialEntries={['/academico/ciclos']}><Form/></MemoryRouter>)
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.queryByText('synthetic@example.invalid')).not.toBeInTheDocument()
 expect(screen.getByRole('button',{name:'Mi cuenta: Otra Cuenta'})).toBeVisible()
})
