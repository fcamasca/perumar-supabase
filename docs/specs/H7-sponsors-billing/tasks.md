# H7 — Tareas propuestas

**SPEC EN REVISIÓN / Gate 1 PENDIENTE / construcción NO INICIADA**.
Base `fd230a7f36716129033f4c9b5a287f78647de111`; 2026-11-23.
OQ-H7-001..005 RESUELTAS humanamente, ninguna tarea técnica ejecutada por este Spec.

| ID | Entrega | Dependencias | REQ-H7 | DES-H7 | TEST-H7 |
| --- | --- | --- | --- | --- | --- |
| TASK-H7-001 | Revisión cuatro docs/decisiones y Gate 1 humano sobre SHA exacto. Resolver OQ no supone aprobación. | Humana | 001–015 | 001–008 | 001 |
| TASK-H7-002 | Modelo aditivo seis tablas negocio + técnica PDF OS, constraints/serie-correlativo/índices/proyecciones sin estado financiero persistido. | 001 | 001–008,012,015 | 002–004,008 | 001–008,012,016 |
| TASK-H7-003 | RPC OS/factura/workflow/anulación, historia/locks, solo Director anula. Aplicar decisión humana Gate 1: bloquear OS con alguna factura no anulada y factura con aplicaciones vigentes de pagos CONFIRMADOS; primero regularizar/anular dependientes por sus propias reglas, sin cascadas ni DELETE físico. | 002 | 002–006,008,011–012 | 002–006 | 002–006,010–012 |
| TASK-H7-004 | RPC transferencia banco/fecha/aplicaciones, idempotencia/concurrencia/saldo derivado/anulación. Preservar toda la historia y exigir regularización/anulación explícita del dependiente, sin cascadas ni DELETE físico. | 003 | 007–008,011–012 | 004–006 | 007–012 |
| TASK-H7-005 | Enmienda aditiva registrar_pago H4 bloquea patrocinado tras locks; historia/idempotencia/anulación/carrera H3 preservadas. RLS/grants/auditoría DB/API antes de UI. | 004 | 009,011–012 | 001,005–006 | 009–012 |
| TASK-H7-006 | UX central patrocinador, serie-correlativo, diferencia confirmable, transferencia, bloqueo H4 y consulta matrícula. | 005 | 001–010 | 001–004,007 | 002–009,014 |
| TASK-H7-007 | **IMPLEMENTACIÓN TÉCNICA COMPLETADA / revisión humana PENDIENTE (25/11/2026)**. Tres listados existentes, filtros servidor, paginación estable y CSV completo; OS/facturas/pagos/beneficiarios, sin deuda H4+H7 ni distribución por alumno/Ciclo. | 006 | 010,013 | 003,007 | 013–014 |
| TASK-H7-008 | RUC opcional mediante OpenRUC, autorizado humanamente 25/11/2026; Edge específica/JWT/rol, timeout 5 s, consulta solo RUC 20, razón social/domicilio fiscal editables, última referencia normalizada JSONB opcional confirmada mediante Guardar empresa, migración compatible y pruebas DB/RLS/auditoría; ignorar _more; manual siempre disponible. Implementado para revisión humana, sin cierre automático. | 001; independiente núcleo | 014 | 008 | 015 |
| TASK-H7-009 | Bucket/Edge OS específicos, reserva-confirmación, validación, reemplazo/historia/recuperación y UX archivo opcional. No modificar entidades H6. | 002–003,005 | 003,011–012,015 | 006–008 | 010–012,014,016 |
| TASK-H7-010 | Regresión H1–H6.2 especialmente H3/H4, lint/typecheck/suite/build/build-safety/diff-check, DB/API/rollback/concurrencia/reconstrucción y candidato/CI. | 005–007,009 | 001–015 | 001–008 | 001–016 |
| TASK-H7-011 | Gate 2 humano futuro con evidencia real/residuales. Acceptance/merge solo autorización posterior. | 010 y humana | 001–015 | 001–008 | 014–016 |

Rangos inclusivos. [Requisitos](requirements.md), [diseño](design.md), [pruebas](test-plan.md).

## Bloques y evidencia futura

Primero modelo/RPC/concurrencia/seguridad y enmienda H4; comprobar DB/API antes de UI/bytes. Luego PDF OS privado y reportes. No plataforma genérica de archivos, tablas de reparto, jobs ni cambios de fórmulas H4. OS guardada independientemente de PDF evita prometer atomicidad DB+Storage.

Actualizar la regresión H4 que admitía pago nuevo patrocinado, manteniendo cobertura de historia/idempotencia/anulación. No borrar pruebas concurrentes ni sustituirlas por mocks.

Registrar comandos, resultados, SHA/CI/inventario por bloque, sin TEST-H7 PASSED antes de ejecución. No inferir hosted/CPU/memoria/forced-colors ni heredar pruebas humanas H6.2 para H7. **Detenerse tras SHA documental para Gate 1.**


## Estado posterior — TASK-H7-007, 25/11/2026

Autorización humana expresa para completar el alcance original REQ-H7-013 / DES-H7-007 / TEST-H7-013. No se difiere a H8. Migración aditiva 20261125060000: una vista de lectura `facturacion_reporte` con security_invoker; sin tablas/RPC/Edge/dependencias nuevas ni mutaciones financieras. Candidato técnico probado: 825/825 Vitest y 41/41 DB/API/JWT aislados. Resultados detallados en technical-results.md. El trabajo de consulta DNI permanece en sus commits independientes H3, sin cambios en este bloque.

TASK-H7-007 está lista para revisión funcional humana; TEST-H7-013 tiene evidencia automatizada, no aprobación humana del reporte/Excel. H7 sigue EN CONSTRUCCIÓN / NO CERRADO, sin Gate 2 ni acceptance ni merge. La autorización de cierre anterior queda detenida por instrucción humana mientras se completa esta revisión. El historial anterior registra los estados de cada checkpoint, no describe el estado técnico actual.


## Estado definitivo autorizado — 26/11/2026

H7 CLOSED / ACEPTADO. TASK-H7-001–011 completadas conforme al [checklist de acceptance](acceptance.md). [Gate 2 humano](gate-2.md) aprobado sobre el candidato 44d60b1; autorización de integración condicionada a CI exacta SUCCESS. Los encabezados y pendientes anteriores describen checkpoints históricos; no reabren Gate 1 ni contradicen esta decisión posterior. Forced-colors real NO VERIFICADO y residuales preservados. H8 no iniciado.
