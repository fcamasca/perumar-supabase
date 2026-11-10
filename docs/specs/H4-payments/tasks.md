# H4 — Pagos: tasks

Versión 0.2 · 09/11/2026 (America/Lima).

**17 OQ RESUELTAS HUMANAMENTE. TAREAS TÉCNICAS NO INICIADAS. GATE 1 PENDIENTE.**

REQ-H4-n → DES-H4-n → TASK-H4-n; TEST pueden cubrir varios requisitos. [Requirements](requirements.md), [design](design.md), [test-plan](test-plan.md). Solo documentación actual; ninguna tarea implementada ni prueba financiera ejecutada. TASK-H4-001 es prerrequisito de todas 002–020; C-H4-001 requiere precisión antes de Gate 1. Las dependencias numéricas no exigen orden estricto por ID y no autorizan empezar implementación.

## TASK-H4-001 — Revisión del Spec y Gate 1

- Trazabilidad: REQ-H4-001 → DES-H4-001. Pruebas: TEST-H4-001.
- Dependencias: Ninguna; revisión y decisión humana.
- Trabajo futuro: Consolidar 17 OQ RESUELTAS en los cuatro documentos, cerrar precisión C-H4-001 y obtener Gate 1 sobre SHA exacto. No implementar mientras falte aprobación.
- Finalización: Decisiones coherentes sin alternativas descartadas y autorización explícita del conjunto; este trabajo no la concede.
- Estado: PENDIENTE DE REVISIÓN / GATE 1.

## TASK-H4-002 — Permisos financieros

- Trazabilidad: REQ-H4-002 → DES-H4-002. Pruebas: TEST-H4-002, TEST-H4-003, TEST-H4-004, TEST-H4-020, TEST-H4-029, TEST-H4-032, TEST-H4-037, TEST-H4-042, TEST-H4-047.
- Dependencias: TASK-H4-001 y TASK-H4-004.
- Trabajo futuro: Configurar RLS/grants y autorización de comandos/lecturas: D/O registran/leen/recuperan; solo D anula. Sin privilegio financiero Admin, actor cliente ni acceso directo.
- Finalización: JWT ordinario positivo/negativo, incluida anulación forjada y recuperación por clave; auditoría mínima no abre finanzas al Admin.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-003 — Proyección exacta de deuda

- Trazabilidad: REQ-H4-003 → DES-H4-003. Pruebas: TEST-H4-005, TEST-H4-006, TEST-H4-014.
- Dependencias: TASK-H4-001 y TASK-H4-004, TASK-H4-005.
- Trabajo futuro: Calcular base de cargos activos, aplicaciones de pagos CONFIRMADO y pendiente; sin tabla deuda/saldo materializado ni repricing.
- Finalización: Totales/cargo y matrícula concilian, anulados fuera de abonado, historia visible y resumen autorizado consistente.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-004 — Modelo pago y pago_aplicacion

- Trazabilidad: REQ-H4-004 → DES-H4-004. Pruebas: TEST-H4-007, TEST-H4-008, TEST-H4-018, TEST-H4-053.
- Dependencias: TASK-H4-001.
- Trabajo futuro: Definir ambas tablas con integridad/propiedad/suma/UNIQUE, estados CONFIRMADO/ANULADO, timestamps DB y representación histórica de medio. Sin fecha manual/concepto libre ni estructura global alternativa.
- Finalización: Pago/aplicaciones no editables/DELETE; suma exacta, clave permanente y datos de anulación consistentes.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-005 — PEN y validaciones

- Trazabilidad: REQ-H4-005 → DES-H4-005. Pruebas: TEST-H4-008, TEST-H4-009, TEST-H4-010, TEST-H4-015, TEST-H4-022, TEST-H4-052, TEST-H4-053.
- Dependencias: TASK-H4-001 y TASK-H4-004.
- Trabajo futuro: Validar numeric(12,2), positivo, dos decimales antes de cast, overflow y pendiente por cargo/total; whitelist de inputs y cantidades manuales.
- Finalización: Rechazo de datos inválidos sin redondeo, total validado DB y sin autoridad float/React.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-006 — Estados de pago/matrícula/Ciclo

- Trazabilidad: REQ-H4-006 → DES-H4-006. Pruebas: TEST-H4-011, TEST-H4-012, TEST-H4-013, TEST-H4-016, TEST-H4-047, TEST-H4-049, TEST-H4-051.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-003.
- Trabajo futuro: Implementar cobro ACTIVO y PROGRAMADO/EN_CURSO/CERRADO, bloqueo DESIERTO/ANULADO y congelamiento de matrícula ANULADO. Bloquear transiciones de Ciclo con pagos registrados.
- Finalización: Casos explícitos por estado, incluidos pagos ANULADO históricos, sin relajar prohibición H3 de Ciclo con matrículas.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-007 — Restricciones financieras sobre H3

- Trazabilidad: REQ-H4-007 → DES-H4-007. Pruebas: TEST-H4-006, TEST-H4-011, TEST-H4-012, TEST-H4-014, TEST-H4-015, TEST-H4-016, TEST-H4-033, TEST-H4-042, TEST-H4-049, TEST-H4-050, TEST-H4-051, TEST-H4-052, TEST-H4-055.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-004, TASK-H4-005, TASK-H4-013.
- Trabajo futuro: Coordinar retiro con aplicaciones vigentes, descuento final≥aplicado, traslado bloqueado por cualquier pago y patrocinador mutable bajo H3. Resolver retiro después de anular todos según C-H4-001 antes de construir.
- Finalización: Rutas directas/indirectas y concurrencia no eluden reglas; historia/UUID/aplicaciones conservados y H3 solo adaptado en lo autorizado.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-008 — Timestamp, notas y conceptos

- Trazabilidad: REQ-H4-008 → DES-H4-008. Pruebas: TEST-H4-017, TEST-H4-018, TEST-H4-054.
- Dependencias: TASK-H4-001 y TASK-H4-004, TASK-H4-005.
- Trabajo futuro: Solo created_at/actor DB; observaciones opcionales planas≤500, concepto derivado de cargos y motivo de anulación separado obligatorio≤500.
- Finalización: Sin edición de pago ni fecha/concepto manuales; texto escapado sin semántica financiera, representación histórica correcta.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-009 — Medios genéricos y semilla

- Trazabilidad: REQ-H4-009 → DES-H4-009. Pruebas: TEST-H4-019, TEST-H4-020.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-004.
- Trabajo futuro: Sembrar cinco opciones autorizadas en catalogo/catalogo_valor, validar pertenencia/vigencia y conservar ID/código/etiqueta histórica DB.
- Finalización: Sin mantenimiento específico ni integraciones; cambios posteriores de catálogo no reescriben pagos ni bloquean recuperación.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-010 — Registrar y anular: comandos concretos

- Trazabilidad: REQ-H4-010 → DES-H4-010. Pruebas: TEST-H4-012, TEST-H4-021, TEST-H4-022, TEST-H4-034, TEST-H4-039, TEST-H4-046, TEST-H4-047, TEST-H4-048, TEST-H4-055.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-003, TASK-H4-005, TASK-H4-006, TASK-H4-007, TASK-H4-008, TASK-H4-009, TASK-H4-011, TASK-H4-013, TASK-H4-015.
- Trabajo futuro: Implementar registrar_pago transaccional y anular_pago separado solo Director; versiones, aplicaciones e historial sin DELETE. No mezclar idempotencia del registro con anulación ni motor genérico de reversos.
- Finalización: Registro atómico y anulación única con motivo/actor/timestamp DB; saldo derivado recuperado, matrícula ANULADO bloqueada.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-011 — Idempotencia del registro

- Trazabilidad: REQ-H4-011 → DES-H4-011. Pruebas: TEST-H4-023, TEST-H4-024, TEST-H4-025, TEST-H4-026, TEST-H4-031, TEST-H4-032, TEST-H4-038, TEST-H4-054.
- Dependencias: TASK-H4-001 y TASK-H4-004, TASK-H4-005.
- Trabajo futuro: UUID opaco cliente UNIQUE permanente, igualdad semántica DB normalizada y rechazo de contenido distinto. Conservar clave de pago ANULADO sin resurrección.
- Finalización: Un efecto por clave y una alta de auditoría; sin TTL/tabla comandos/actualización del pago por replay.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-012 — Recuperación y continuidad mínima

- Trazabilidad: REQ-H4-012 → DES-H4-012. Pruebas: TEST-H4-026, TEST-H4-027, TEST-H4-028, TEST-H4-029, TEST-H4-038, TEST-H4-041, TEST-H4-048.
- Dependencias: TASK-H4-001 y TASK-H4-010, TASK-H4-011, TASK-H4-016.
- Trabajo futuro: Resolver commit ambiguo por clave con permisos actuales y referencia local opaca por usuario/pestaña, sin payload persistido. Anulación ambigua se consulta por id/estado, sin clave adicional.
- Finalización: Mismo UUID/estado real tras recarga/reenvío consciente; vacío temporal no dispara otra alta y no hay retry silencioso.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-013 — Locks compatibles y versiones

- Trazabilidad: REQ-H4-013 → DES-H4-013. Pruebas: TEST-H4-030, TEST-H4-031, TEST-H4-032, TEST-H4-033, TEST-H4-044, TEST-H4-049, TEST-H4-052, TEST-H4-055.
- Dependencias: TASK-H4-001 y TASK-H4-004.
- Trabajo futuro: Fijar protocolo Ciclos→Alumno→Matrícula→cargos/pagos y SERIALIZABLE para ambas RPC y rutas H3 económicas/estado; relectura y conflictos explícitos.
- Finalización: 70+60 sobre100, clave simultánea y anulaciones/mutaciones concurrentes, sin sobrepago/doble liberación/estado prohibido.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-014 — Rollback y efectos únicos

- Trazabilidad: REQ-H4-014 → DES-H4-014. Pruebas: TEST-H4-027, TEST-H4-034, TEST-H4-035, TEST-H4-046, TEST-H4-048, TEST-H4-055.
- Dependencias: TASK-H4-001 y TASK-H4-010, TASK-H4-013, TASK-H4-015.
- Trabajo futuro: Probar fallo por etapa de registro/anulación, versión/eventos y recuperación distinta de rollback. Harness solo aislado con restauración incluso fallos.
- Finalización: No pago/aplicación/estado/clave exitosa/evento huérfanos, sin nueva liberación de saldo al repetir anulación.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-015 — Auditoría mínima de dos eventos

- Trazabilidad: REQ-H4-015 → DES-H4-015. Pruebas: TEST-H4-035, TEST-H4-036, TEST-H4-044, TEST-H4-046.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-004.
- Trabajo futuro: Reutilizar auditoría explícita para registrado/anulado, IDs/actor/timestamp y motivo, sin importes/medio/notas/aplicaciones/PII/payload.
- Finalización: Evento atómico y sin duplicados por replay; detalle en tablas financieras, no trigger genérico/copia completa.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-016 — Lecturas de saldo e historial

- Trazabilidad: REQ-H4-016 → DES-H4-016. Pruebas: TEST-H4-016, TEST-H4-037, TEST-H4-038, TEST-H4-046, TEST-H4-050.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-003, TASK-H4-004, TASK-H4-011.
- Trabajo futuro: Proyección DB consistente y lecturas paginadas autorizadas de pago/aplicación, estados/medio/concepto histórico y recuperación por clave.
- Finalización: Totales no dependen de página o pagos ocultos por RLS; anulados visibles sin abonar, patrocinador no reasigna.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-017 — UI manual y anulación visible por rol

- Trazabilidad: REQ-H4-017 → DES-H4-017. Pruebas: TEST-H4-039, TEST-H4-040, TEST-H4-043, TEST-H4-053.
- Dependencias: TASK-H4-001 y TASK-H4-009, TASK-H4-010, TASK-H4-012, TASK-H4-016, TASK-H4-018.
- Trabajo futuro: Grilla de cargos pendientes con checks/importes/Seleccionar todos/total, medio/notas, fecha DB no editable e historial. Director anula con diálogo de motivo, sin Editar ni PDF.
- Finalización: Interacciones exactas de decisión humana, foco/errores/temas/móvil y resolución de incertidumbre sin nuevo cobro automático.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-018 — Errores seguros y sesión

- Trazabilidad: REQ-H4-018 → DES-H4-018. Pruebas: TEST-H4-004, TEST-H4-022, TEST-H4-025, TEST-H4-040, TEST-H4-041, TEST-H4-054.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-010, TASK-H4-011, TASK-H4-012.
- Trabajo futuro: Mensajes por precisión/saldo/cargo/permiso/estado/versión/clave/anulado/ambigüedad; whitelist, limpieza de UI y descarte de respuestas ajenas.
- Finalización: Sin SQL dinámico, PII/finanzas en logs o versión renovada automáticamente; clave no autoriza lectura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-019 — Integración y revisión humana

- Trazabilidad: REQ-H4-019 → DES-H4-019. Pruebas: TEST-H4-042, TEST-H4-043.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-003, TASK-H4-004, TASK-H4-005, TASK-H4-006, TASK-H4-007, TASK-H4-008, TASK-H4-009, TASK-H4-010, TASK-H4-011, TASK-H4-012, TASK-H4-013, TASK-H4-014, TASK-H4-015, TASK-H4-016, TASK-H4-017, TASK-H4-018.
- Trabajo futuro: Pruebas progresivas y regresión H1/H2/H3/H4 en base desechable, bootstrap/seed/inventario, lint/types/unit/build/security, dos sesiones y revisión humana con candidato exacto.
- Finalización: Resultados técnicos/humanos reales y residual explícito, sin ejecutar suites ahora ni dejar fixtures en base humana.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H4-020 — Candidato y Gate 2 futuro

- Trazabilidad: REQ-H4-020 → DES-H4-020. Pruebas: TEST-H4-001, TEST-H4-042, TEST-H4-044, TEST-H4-045.
- Dependencias: TASK-H4-001 y TASK-H4-019.
- Trabajo futuro: Revisar arquitectura/inventario, publicar candidato/evidencia y pedir Gate 2 independiente, sin asumir aprobación ni iniciar H5.
- Finalización: Acceptance/merge solo con autorización futura; mantener límites y detener expansión ante API oculta/infraestructura no necesaria.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## Bloques de validación futura

1. Modelo/decimal/roles/protocolo y deuda: 004/005/002/013/003; comprobar restricciones antes de UI.
2. Estados/rutas H3 y datos mínimos: 006/007/008/009/011/015; validar decisiones humanas y medios antes de comandos.
3. Registrar/anular, consultas, recuperación/rollback/errores: 010/016/012/014/018; probar commit perdido y 70+60 antes de presentar un flujo como correcto.
4. UI y regresión: 017/019; checks/parciales, Director anula, Coordinador no, temas/teclado/dos sesiones y CI desechable.
5. Arquitectura y Gate 2 futuro: 020; evidencia real y residual, nunca aprobación del agente.

Las verificaciones actuales son solo enlaces/IDs/cobertura/dependencias y git diff --check. No se ejecutan suites ni se modifica H3, PLAN o aceptación. **DETENERSE PARA REVISIÓN HUMANA Y GATE 1.**
