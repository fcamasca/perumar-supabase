# CHG-H3-011 — Director confirma cambios de asignaturas con matrículas activas

Autorización humana: 09/11/2026. El usuario solicita modificar el bloqueo y permitir continuar solo al Director tras advertencia explícita de matrículas activas. Esta enmienda sustituye exclusivamente el bloqueo absoluto de edición de asignaturas del Ciclo con matrícula activa. Los cuatro documentos aprobados de Gate 1 quedan intactos. No concede Gate 2.

## Regla vigente

En PROGRAMADO/EN_CURSO, con una o más matrículas ACTIVO, solo DIRECTOR_ACADEMICO puede agregar, retirar o reactivar asignaturas del Ciclo tras confirmar el impacto. Coordinador sigue bloqueado, incluso enviando la confirmación manualmente a la RPC. Sin matrículas activas se conserva la autorización académica anterior; solo anuladas no disparan la advertencia. Ciclos terminales no se modifican.

La lista vigente del Ciclo afecta a los alumnos matriculados, sin reescribir el snapshot, código de matrícula, cargos/descuentos, alumno ni contactos. No se agregan notas, asistencia, certificación ni funcionalidades H4. No cambia el Curso del Ciclo: la Carrera técnica sigue bloqueada con matrículas activas. Retirar conserva relación/origen/historia; Reactivar conserva el mismo UUID. Una nueva adicional crea relación ADICIONAL.

## Confirmación y autoridad

La UI consulta si hay matrículas activas al abrir la ficha y presenta advertencia dentro del diálogo de acción: el cambio afectará la lista vigente para alumnos matriculados, conservando códigos, cargos y datos históricos. Cancelar no escribe. Solo al confirmar envía confirmar_matriculas_activas=true. Si una nueva matrícula aparece después de abrir la ficha, DB rechaza sin cambios y UI solicita nueva confirmación explícita antes de enviar otra operación. No hay retries silenciosos ni renovación automática de versión. Si la versión ya cambió, se conserva el conflicto explícito.

PostgreSQL valida rol vigente, estado, confirmación y versión, con SERIALIZABLE. El indicador expresa consentimiento; no otorga permisos. El comando abre un contexto transaccional acotado al UUID de Ciclo y lo limpia antes de devolver resultado. El trigger existente exige Director y ese contexto para cambios de relación con matrículas activas; no se concede acceso directo a tablas. Auditoría existente guarda el actor, cambio y motivo de confirmación, sin copiar PII.

## Implementación acotada

Migración 20261109010000_director_cycle_subject_confirmation reemplaza cambiar_materia_ciclo con quinto argumento booleano opcional, false por defecto. Se mantiene un solo comando con ese nombre, no un overload ni una RPC adicional. Conserva clientes de cuatro argumentos y amplía el comando para agregar una relación adicional aún inexistente cuando activo=true y la Asignatura está activa. La UI deja de reenviar campos generales a guardar_ciclo para agregar una Asignatura existente en un Ciclo; usa este comando específico.

Se modifica únicamente la rama ciclo_materia de guard_enrollment_history. No hay tablas/columnas/helpers/policies nuevas. Inventario sigue en 22 tablas públicas, 17 RPC, 16 helpers y 25 policies SELECT; 15 migraciones. Sin reset, nuevas capas, eventos ni workflow.

## Validación

SQL transaccional con rollback: rechazo sin confirmación, Coordinador normal/confirmación forjada, Director confirmado, retiro/reactivación con mismo UUID, alta adicional activa, conflicto de versión, contexto no reutilizable, historial/código/cargos intactos, auditoría explícita, Curso bloqueado y Ciclo terminal bloqueado. Pruebas UI: cancelar, impacto informado, bandera explícita, Coordinador deshabilitado, aparición posterior de matrícula sin retry silencioso y alta sin campos ajenos.

Pruebas humanas pendientes: Director confirma/cancela las tres acciones; Coordinador no opera; dos sesiones con versión desactualizada; contrastar datos históricos/cargos antes y después. Gate 2 pendiente.
