# H3 — Alumno y Matrícula: tasks

Versión 0.1 · 22/10/2026 (America/Lima).

**SPEC ELABORADO. PENDIENTE DE REVISIÓN HUMANA Y GATE 1. CONSTRUCCIÓN NO AUTORIZADA.**

Todas las tareas son FUTURAS / NO INICIADAS / BLOQUEADAS POR GATE 1. La elaboración de este Spec no completa tareas de construcción. Resolver OQ antes del gate, no mediante implementación.

## TASK-H3-001 — Gate 1 y base

- REQ-H3-001 → DES-H3-001. Pruebas: TEST-H3-001.
- Dependencias: Aprobación humana explícita; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Resolver OQ, coherenciar cuatro documentos, obtener aprobación humana del SHA exacto, registrar Gate 1 y crear rama de implementación desde ese commit. No ejecutar construcción para resolver decisiones.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-002 — Permisos

- REQ-H3-002 → DES-H3-002. Pruebas: TEST-H3-002, TEST-H3-003.
- Dependencias: 001; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Aplicar matriz de roles, grants/RLS y contratos de ejecución privilegiada. Reutilizar helpers vigentes y comprobar rutas alternativas sin motor de permisos.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-003 — Ficha Alumno

- REQ-H3-003 → DES-H3-003. Pruebas: TEST-H3-004, TEST-H3-005.
- Dependencias: 001, 002; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Crear modelo aditivo, catálogos acordados y validación completa; guardar_alumno y edad derivada, geografía H2 y versión servidor.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-004 — Identidad y legado

- REQ-H3-004 → DES-H3-004. Pruebas: TEST-H3-006, TEST-H3-007.
- Dependencias: 003; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Implementar unicidad DI y búsqueda/edición independiente que admita lectura de incompletos. Si existe legado real, plan controlado de saneamiento.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-005 — Contactos

- REQ-H3-005 → DES-H3-005. Pruebas: TEST-H3-008, TEST-H3-009.
- Dependencias: 003, 004; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Implementar entidad separada y comandos de agregado, versión padre, retiro acordado y validación de contacto al matricular.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-006 — Snapshot/PII

- REQ-H3-006 → DES-H3-006. Pruebas: TEST-H3-010, TEST-H3-011.
- Dependencias: 003, 005; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Construir snapshot DB con whitelist y etiquetas históricas; impedir actualización y proyección accidental en auditoría/lista/logs.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-007 — Empresa mínima

- REQ-H3-007 → DES-H3-007. Pruebas: TEST-H3-012.
- Dependencias: 002 y OQ-H3-002; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Implementar alta/consulta/edición autorizada, unicidad y FK nullable en matrícula sin funcionalidades H7.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-008 — Tarifas

- REQ-H3-008 → DES-H3-008. Pruebas: TEST-H3-013, TEST-H3-014.
- Dependencias: 002 y OQ-H3-004; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Implementar catálogo, importes exactos, inactivación sin pérdida de usos y comandos Director con auditoría/concurrencia.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-009 — Configuración Ciclo

- REQ-H3-009 → DES-H3-009. Pruebas: TEST-H3-015, TEST-H3-016.
- Dependencias: 008; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Implementar ciclo_tarifa y guardar_ciclo_tarifas, default/override, obligatorias y versión padre. No automatizar por Carrera.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-010 — Registrar matrícula

- REQ-H3-010 → DES-H3-010. Pruebas: TEST-H3-017, TEST-H3-018, TEST-H3-019.
- Dependencias: 003–009, 011–014, 017–018; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Implementar comando transaccional de fases legibles, cargos históricos, selección servidor y respuesta segura; prueba rollback en cada fase.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-011 — Regresión Ciclos H2

- REQ-H3-011 → DES-H3-011. Pruebas: TEST-H3-020, TEST-H3-021, TEST-H3-022.
- Dependencias: 002, 009 y OQ-H3-005; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Extender mediante nueva migración comandos H2 y rutas indirectas para reglas con matrículas, conservando superposición/estados/historia.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-012 — Duplicados

- REQ-H3-012 → DES-H3-012. Pruebas: TEST-H3-023, TEST-H3-024.
- Dependencias: 003 y modelo 010; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Aplicar UNIQUE alumno+ciclo y conflictos seguros en alta/cambio, incluidas anuladas.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-013 — Correlativo/código

- REQ-H3-013 → DES-H3-013. Pruebas: TEST-H3-025, TEST-H3-026, TEST-H3-027.
- Dependencias: 002 y OQ-H3-006; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Implementar contador privado por año+sigla, override autorizado, colisiones y metadatos originales trazables.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-014 — Descuento

- REQ-H3-014 → DES-H3-014. Pruebas: TEST-H3-028, TEST-H3-029.
- Dependencias: 008–009 y OQ-H3-007; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Implementar autorización Director, cálculo y motivo servidor; preservar descuento previo y cerrar cambios por Coordinador.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-015 — Edición activa

- REQ-H3-015 → DES-H3-015. Pruebas: TEST-H3-030, TEST-H3-031, TEST-H3-032.
- Dependencias: 010, 014 y OQ-H3-008; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Implementar editar_matricula atómico con cargos/versionado acordados; no repricing incidental ni restricciones de pagos inexistentes.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-016 — Anulación

- REQ-H3-016 → DES-H3-016. Pruebas: TEST-H3-033, TEST-H3-034.
- Dependencias: 010, 015; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Implementar comando con motivo/versión, terminalidad DB y consulta, sin borrados/reversos financieros.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-017 — Auditoría

- REQ-H3-017 → DES-H3-017. Pruebas: TEST-H3-035, TEST-H3-036.
- Dependencias: 002 y contratos 003–016; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Extender public.auditoria con proyecciones por entidad, actor/fecha DB y atomicidad; nunca trigger genérico que copie PII/snapshot.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-018 — Concurrencia

- REQ-H3-018 → DES-H3-018. Pruebas: TEST-H3-037, TEST-H3-038.
- Dependencias: Contratos 003–017; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Verificar aislamiento efectivo, orden común y participación de todos los escritores; carreras independientes y conflictos sin retry.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-019 — UI/UX

- REQ-H3-019 → DES-H3-019. Pruebas: TEST-H3-039, TEST-H3-040, TEST-H3-041, TEST-H3-042.
- Dependencias: Comandos 003–018 verificados; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
- Trabajo futuro: Implementar Stepper/Tabs y modales breves, retorno alta alumno a matrícula y repetición por Ciclo; conservar identidad/temas/accesibilidad H2.
- Finalización: criterios del requisito demostrados con pruebas vinculadas y revisión del diseño sobre SHA exacto; evidencia segura.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H3-020 — Evidencia y Gate 2

- REQ-H3-020 → DES-H3-020. Pruebas: TEST-H3-043, TEST-H3-044, TEST-H3-045.
- Dependencias: Todas las anteriores; todas las tareas 002–020 requieren 001 y OQ afectadas cerradas.
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

## Revisión documental de esta entrega — 22/10/2026

Revisión cruzada realizada por Codex sobre los cuatro documentos, la solicitud completa, PLAN y diseños/aceptación H1/H2. Verificados: 20 REQ, 20 DES, 20 TASK y 45 TEST con IDs únicos/contiguos; todos los requisitos/diseños tienen tarea y pruebas vinculadas; enlaces locales resuelven. Ocho OQ identifican decisiones reales pendientes, no resueltas por inferencia. Las dos evoluciones permanecen fuera de alcance. No se crea acceptance ni se ejecutan pruebas funcionales H3.

Compatibilidad revisada: roles funcionales/estado activo H1/H2 conservados; auditoría H2 requiere proyección nueva para no copiar PII; correlativo matrícula independiente del global de Ciclo; comandos H2 con matrícula requieren restricciones diferidas, incluidas rutas indirectas expresamente señaladas en OQ-005. El riesgo forced-colors SO de H2 no se convierte en prueba realizada. Estos puntos tienen diseño y casos negativos/concurrentes; decisiones OQ siguen bloqueando Gate 1.

Verificación de entrega: diff exclusivamente documental (seis Markdown), sin cambios React/SQL/configuración/dependencias; diff --check sin errores. Esta revisión no es revisión humana ni aprueba Gate 1. Los resultados de CI existentes, si se ejecutan al publicar, solo verifican regresión del código H2 conservado.
