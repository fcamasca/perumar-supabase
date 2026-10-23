# H3 — Alumno y Matrícula: tasks

Versión 0.2 · 22/10/2026 (America/Lima).

**SPEC ELABORADO. PENDIENTE DE REVISIÓN HUMANA Y GATE 1. CONSTRUCCIÓN NO AUTORIZADA.**

Todas las tareas son FUTURAS / NO INICIADAS / BLOQUEADAS POR GATE 1. La elaboración de este Spec no completa tareas de construcción. Las ocho OQ están RESUELTAS por decisión humana registrada en requirements; aún falta Gate 1 del Spec completo.

## TASK-H3-001 — Gate 1 y base

- REQ-H3-001 → DES-H3-001. Pruebas: TEST-H3-001.
- Dependencias: Aprobación humana explícita; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Verificar las ocho decisiones cerradas/coherencia de los cuatro documentos, obtener aprobación humana del SHA exacto, registrar Gate 1 y crear rama de implementación desde ese commit. No ejecutar construcción para resolver decisiones.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-002 — Permisos

- REQ-H3-002 → DES-H3-002. Pruebas: TEST-H3-002, TEST-H3-003.
- Dependencias: 001; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Aplicar matriz de roles, grants/RLS y contratos de ejecución privilegiada. Reutilizar helpers vigentes y comprobar rutas alternativas sin motor de permisos.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-003 — Ficha Alumno

- REQ-H3-003 → DES-H3-003. Pruebas: TEST-H3-004, TEST-H3-005.
- Dependencias: 001, 002; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Crear modelo aditivo con DNI texto trim 8 dígitos, CE alfanumérico uppercase ≤30 y catálogos simples TIPO_DI/SEXO/ESTADO_CIVIL/GRUPO_SANGUINEO y referencias opcionales GRADO_INSTRUCCION/COLOR_OJOS/COLOR_CABELLO de Alumno usando exclusivamente catalogo/catalogo_valor; validar pertenencia y activo server-side, sin tablas ni motor/mantenimiento adicionales para estas propiedades, N°/Mz Lt opcional, cm/kg y cotas conservadas; edad derivada, geografía H2 y versión servidor.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-004 — Identidad y legado

- REQ-H3-004 → DES-H3-004. Pruebas: TEST-H3-006, TEST-H3-007.
- Dependencias: 003; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Implementar UNIQUE tipo_di+numero_di normalizado, nunca global por número, y búsqueda/edición que lea incompletos y valide al guardar. Si existe legado real, saneamiento controlado.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-005 — Contactos

- REQ-H3-005 → DES-H3-005. Pruebas: TEST-H3-008, TEST-H3-009.
- Dependencias: 003, 004; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Implementar entidad separada con parentesco_id obligatorio a catalogo_valor de PARENTESCO, validación server-side de pertenencia y activo sin texto libre ni tabla/mantenimiento adicional de catálogo, varios contactos sin principal, retiro lógico INACTIVO sin DELETE y versión padre; al matricular exigir ≥1 activo válido.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-006 — Snapshot/PII

- REQ-H3-006 → DES-H3-006. Pruebas: TEST-H3-010, TEST-H3-011.
- Dependencias: 003, 005; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Construir snapshot DB con whitelist y todos los contactos activos/válidos excluyendo inactivos; conservar ID y descripción/etiqueta histórica de GRADO_INSTRUCCION/COLOR_OJOS/COLOR_CABELLO del Alumno y PARENTESCO de contactos al matricular, NULL en opcionales ausentes; mantener histórico inmutable y sin proyección accidental en auditoría/lista/logs.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-007 — Empresa mínima

- REQ-H3-007 → DES-H3-007. Pruebas: TEST-H3-012.
- Dependencias: 002 y decisión OQ-H3-002 resuelta; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Implementar búsqueda/alta/edición por Director/Coordinador; RUC texto trim 11 dígitos UNIQUE y razón social obligatorios, contacto/teléfono/email opcionales. FK nullable en matrícula, sin SUNAT/H7.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-008 — Tarifas

- REQ-H3-008 → DES-H3-008. Pruebas: TEST-H3-013, TEST-H3-014.
- Dependencias: 002 y decisión OQ-H3-004 resuelta; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Implementar tipos CARRERA/OTRO e importes numeric(12,2) admitiendo cero sin negativos ni redondeo de precisión >2; comandos Director/auditoría/concurrencia y conservación de usos.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-009 — Configuración Ciclo

- REQ-H3-009 → DES-H3-009. Pruebas: TEST-H3-015, TEST-H3-016.
- Dependencias: 008; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Implementar ciclo_tarifa con exactamente una CARRERA activa obligatoria para matricular, default/override sin automatismo por Carrera, versión padre; mantenimiento solo PROGRAMADO/EN_CURSO, terminales consulta.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-010 — Registrar matrícula

- REQ-H3-010 → DES-H3-010. Pruebas: TEST-H3-017, TEST-H3-018, TEST-H3-019.
- Dependencias: 003–009, 011–014, 017–018; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Implementar comando transaccional de fases legibles, cargos UUID/vigencia sin DELETE y snapshot. Selección/precios servidor y rollback en cada fase, sin replaced_by/árboles/event sourcing.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-011 — Regresión Ciclos H2

- REQ-H3-011 → DES-H3-011. Pruebas: TEST-H3-020, TEST-H3-021, TEST-H3-022.
- Dependencias: 002, 009 y decisión OQ-H3-005 resuelta; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Extender comandos H2/rutas indirectas: matrícula ACTIVO bloquea cambio Carrera, solo ANULADO permite bajo H2 sin tocar historia/códigos. Con activas, edición ordinaria solo Director/promoción/fechas; terminal bloquea edición matrícula pero permite anularla. Conservar regla H2 de no ANULAR Ciclo con matrículas y demás invariantes.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-012 — Duplicados

- REQ-H3-012 → DES-H3-012. Pruebas: TEST-H3-023, TEST-H3-024.
- Dependencias: 003 y modelo 010; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Aplicar UNIQUE alumno+ciclo y conflictos seguros en alta/cambio, incluidas anuladas.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-013 — Correlativo/código

- REQ-H3-013 → DES-H3-013. Pruebas: TEST-H3-025, TEST-H3-026, TEST-H3-027.
- Dependencias: 002 y decisión OQ-H3-006 resuelta; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Implementar contador año+sigla America/Lima y código manual de formato YYYY-SIGLA-CORRELATIVO por ambos roles solo ACTIVO/Ciclo no terminal; sin tope 50 ni regeneración por cambio Ciclo/Carrera/sigla. Conservar original/metadatos y consumo con override, sin gapless.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-014 — Descuento

- REQ-H3-014 → DES-H3-014. Pruebas: TEST-H3-028, TEST-H3-029.
- Dependencias: 008–009 y decisión OQ-H3-007 resuelta; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Aplicar descuento solo Director. En mismo Ciclo Coordinador no modifica descuento; al cambiar Ciclo cargos anteriores íntegros/inactivos y nuevos con cero, sin traslado. Rechazar descuento en payload de cambio; solo Director aplica después descuento nuevo.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-015 — Edición activa

- REQ-H3-015 → DES-H3-015. Pruebas: TEST-H3-030, TEST-H3-031, TEST-H3-032.
- Dependencias: 010, 014 y decisión OQ-H3-008 resuelta; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Implementar editar_matricula atómico solo ACTIVO/Ciclo actual no terminal. Cambio Ciclo inactiva anteriores CAMBIO_CICLO, crea nuevos UUID/precios destino/descuento cero; opcional retirada inactiva con motivo, reagregar crea nuevo UUID/precio vigente; retenidos sin repricing y patrocinador no toca cargos.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-016 — Anulación

- REQ-H3-016 → DES-H3-016. Pruebas: TEST-H3-033, TEST-H3-034.
- Dependencias: 010, 015; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Implementar anular_matricula con motivo/versión por ambos roles incluso Ciclo terminal; ANULADO consulta sin borrado/edición/reactivación ni cascadas.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-017 — Auditoría

- REQ-H3-017 → DES-H3-017. Pruebas: TEST-H3-035, TEST-H3-036.
- Dependencias: 002 y contratos 003–016; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Extender auditoría con proyecciones sin PII/snapshot; cambio Ciclo registra origen/destino, inactivación CAMBIO_CICLO, nuevos cargos/UUID y actor en la misma transacción; retiro opcional con motivo.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-018 — Concurrencia

- REQ-H3-018 → DES-H3-018. Pruebas: TEST-H3-037, TEST-H3-038.
- Dependencias: Contratos 003–017; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Verificar aislamiento efectivo/orden común y participación de escritores; carreras activas/anuladas contra Carrera Ciclo, tarifas, cambio Ciclo/cargos y edición/anulación, con estado final/conflicto sin retry.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-019 — UI/UX

- REQ-H3-019 → DES-H3-019. Pruebas: TEST-H3-039, TEST-H3-040, TEST-H3-041, TEST-H3-042.
- Dependencias: Comandos 003–018 verificados; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Implementar Stepper/Tabs/modales y repetición por Ciclo conservando accesibilidad H2; terminal deshabilita edición ordinaria matrícula pero permite anular, y cambio Ciclo explica conservación de cargos previos/nuevos con descuento cero.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-020 — Evidencia y Gate 2

- REQ-H3-020 → DES-H3-020. Pruebas: TEST-H3-043, TEST-H3-044, TEST-H3-045.
- Dependencias: Todas las anteriores; todas las tareas 002–020 requieren 001 y decisiones cerradas registradas en requirements.
- Trabajo futuro: Ampliar suites/CI local tras Gate 1, revisar inventario/costo de mantenimiento y obtener pruebas/decisión humanas sobre candidato exacto. Solo después registrar acceptance e integración autorizada.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## Orden y cobertura

Primero 001; después contratos/modelo/seguridad de 002–009 y 011–018; después registro 010 y edición/anulación 015–016; UI 019 sobre contratos verificados; evidencia/gates 020 al final. Dependencias de modelo/contratos no implican declarar completa una tarea sin pruebas. Auditoría/concurrencia se construyen con comandos, no como callback posterior.

| REQ | DES | TASK | TEST |
|---|---|---|---|
| REQ-H3-001 | DES-H3-001 | TASK-H3-001 | TEST-H3-001 |
| REQ-H3-002 | DES-H3-002 | TASK-H3-002 | TEST-H3-002, TEST-H3-003 |
| REQ-H3-003 | DES-H3-003 | TASK-H3-003 | TEST-H3-004, TEST-H3-005 |
| REQ-H3-004 | DES-H3-004 | TASK-H3-004 | TEST-H3-006, TEST-H3-007 |
| REQ-H3-005 | DES-H3-005 | TASK-H3-005 | TEST-H3-008, TEST-H3-009 |
| REQ-H3-006 | DES-H3-006 | TASK-H3-006 | TEST-H3-010, TEST-H3-011 |
| REQ-H3-007 | DES-H3-007 | TASK-H3-007 | TEST-H3-012 |
| REQ-H3-008 | DES-H3-008 | TASK-H3-008 | TEST-H3-013, TEST-H3-014 |
| REQ-H3-009 | DES-H3-009 | TASK-H3-009 | TEST-H3-015, TEST-H3-016 |
| REQ-H3-010 | DES-H3-010 | TASK-H3-010 | TEST-H3-017, TEST-H3-018, TEST-H3-019 |
| REQ-H3-011 | DES-H3-011 | TASK-H3-011 | TEST-H3-020, TEST-H3-021, TEST-H3-022 |
| REQ-H3-012 | DES-H3-012 | TASK-H3-012 | TEST-H3-023, TEST-H3-024 |
| REQ-H3-013 | DES-H3-013 | TASK-H3-013 | TEST-H3-025, TEST-H3-026, TEST-H3-027 |
| REQ-H3-014 | DES-H3-014 | TASK-H3-014 | TEST-H3-028, TEST-H3-029 |
| REQ-H3-015 | DES-H3-015 | TASK-H3-015 | TEST-H3-030, TEST-H3-031, TEST-H3-032 |
| REQ-H3-016 | DES-H3-016 | TASK-H3-016 | TEST-H3-033, TEST-H3-034 |
| REQ-H3-017 | DES-H3-017 | TASK-H3-017 | TEST-H3-035, TEST-H3-036 |
| REQ-H3-018 | DES-H3-018 | TASK-H3-018 | TEST-H3-037, TEST-H3-038 |
| REQ-H3-019 | DES-H3-019 | TASK-H3-019 | TEST-H3-039, TEST-H3-040, TEST-H3-041, TEST-H3-042 |
| REQ-H3-020 | DES-H3-020 | TASK-H3-020 | TEST-H3-043, TEST-H3-044, TEST-H3-045 |

La revisión cruzada del Spec coteja solicitud, reglas H1/H2, exclusiones, OQ y esta matriz; no constituye Gate 1 ni prueba funcional ejecutada.

## Revisión documental — cierre de OQ antes de Gate 1

Actualización sobre `96bd395487954f6fe1194c00b70487563a87ccfe`, misma rama feature/h3-enrollment-spec. OQ-H3-001…008 RESUELTAS por decisión humana registrada en requirements, incorporadas a REQ/DES/TASK/TEST sin cambiar IDs: 20/20/20/45. No quedan preguntas abiertas de esta ronda; aprobación humana de Gate 1 sigue pendiente, tareas futuras no iniciadas.

Revisión cruzada: se sustituye el bloqueo Carrera por cualquier matrícula por el criterio ACTIVO; solo anuladas permiten Carrera bajo H2 y conservan historia. La regla independiente H2 de no ANULAR Ciclo con matrículas permanece. Ciclo terminal bloquea edición ordinaria matrícula pero no anulación motivada. Cambio Ciclo por Coordinador es válido, inactiva cargos íntegros CAMBIO_CICLO y genera UUID nuevos/descuento cero por servidor; no modificación de descuento histórico ni transferencia. Opcionales retiradas no se borran, reagregar crea UUID/precio nuevos, retenidos sin repricing.

Verificación documental realizada antes de commit (satisfactoria): IDs únicos/contiguos, enlaces locales y cobertura completa de matriz, coherencia de decisiones en cuatro documentos y git diff --check. EVOL-001/002 siguen fuera de alcance, sin cambios; no implementación, SQL, React, acceptance ni merge. CI existente sobre nuevo SHA solo verifica regresión H2, no pruebas funcionales H3 ni aprobación humana. Riesgos conservados: complejidad RPC/helpers, PII en trigger genérico, concurrencia de todas las rutas H2 y forced-colors real del SO no probado en H2.
