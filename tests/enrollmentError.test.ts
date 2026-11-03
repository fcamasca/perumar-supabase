import {expect,it} from 'vitest'
import {enrollmentError} from '../src/lib/enrollmentError'
it.each([
 ['Complete la ficha del Alumno','Completa los datos obligatorios'],
 ['Se requiere contacto de emergencia activo y válido','contacto de emergencia activo y válido'],
 ['El Ciclo requiere exactamente una tarifa Carrera activa obligatoria','pestaña Tarifas del Ciclo'],
 ['Ciclo no elegible','Programado o En curso'],
])('explains known enrollment validation: %s',(message,expected)=>{
 expect(enrollmentError({code:'23514',message})).toContain(expected)
})
it('does not expose unknown SQL errors or internal details',()=>{
 expect(enrollmentError({code:'23514',message:'internal SQL constraint secret'})).not.toContain('secret')
 expect(enrollmentError({code:'23514',message:'toString'})).toContain('No se pudo guardar')
})
