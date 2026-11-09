# H4 — Pagos: tasks

Versión 0.1 · 09/11/2026 (America/Lima).

**PLAN DE TRABAJO FUTURO. OQ ABIERTAS. GATE 1 PENDIENTE. CONSTRUCCIÓN NO AUTORIZADA.**

Trazabilidad uno a uno REQ-H4-n → DES-H4-n → TASK-H4-n. Los TEST pueden cubrir varios requisitos y se enumeran por tarea. [Requirements](requirements.md), [design](design.md), [test-plan](test-plan.md). Ninguna tarea técnica se ejecuta ahora. No generar SQL, migraciones, React ni pruebas ejecutables durante esta fase.

TASK-H4-001 es prerrequisito de todas las tareas 002–020; todas las OQ de requirements están ABIERTAS. No comenzar un bloque mientras una decisión que lo afecta siga pendiente. Las dependencias numéricas siguientes no implican orden estricto por ID; permiten implementar un bloque pequeño y validarlo antes del siguiente. Elegir la alternativa global/cargo elimina trabajo innecesario, no habilita tareas de ambos modelos por rutina.

## TASK-H4-001 — Gate 1 y decisiones humanas

- Trazabilidad: REQ-H4-001 → DES-H4-001. Pruebas: TEST-H4-001.
- Dependencias: Ninguna; requiere revisión y decisión humana.
- Trabajo futuro: Resolver OQ-H4-001…017 en los cuatro documentos, elegir granularidad y fijar política de estados/mutaciones/roles/clave/medios/fecha/concepto. Obtener Gate 1 sobre SHA exacto. No escribir implementación antes.
- Finalización: Decisión humana y Spec consistente, con alcance, matriz y contrato cerrados; registro futuro siguiendo gobernanza H3. Esta tarea no está aprobada por generar estos Markdown.
- Estado: PENDIENTE DE OQ / REVISIÓN HUMANA Y GATE 1.

## TASK-H4-002 — Permisos financieros mínimos

- Trazabilidad: REQ-H4-002 → DES-H4-002. Pruebas: TEST-H4-002, TEST-H4-003, TEST-H4-004, TEST-H4-020, TEST-H4-029, TEST-H4-032, TEST-H4-037, TEST-H4-042.
- Dependencias: TASK-H4-001 y TASK-H4-004.
- Trabajo futuro: Tras aprobación de matriz, reutilizar identidad/roles activos; configurar RLS/grants de tablas/proyección y autorización del comando. Comprobar accesos directos y recuperación por clave.
- Finalización: Casos positivos/negativos por JWT ordinario, sin facultad implícita del Admin ni de metadata cliente.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-003 — Proyección de deuda y saldo

- Trazabilidad: REQ-H4-003 → DES-H4-003. Pruebas: TEST-H4-005, TEST-H4-006, TEST-H4-014.
- Dependencias: TASK-H4-001 y TASK-H4-004, TASK-H4-005.
- Trabajo futuro: Expresar base exigible y aplicaciones efectivas según perímetro aprobado, sin deuda/saldo persistidos ni repricing de cargos. Preparar lectura DB consistente.
- Finalización: Ecuación aprobada demostrada con cargos a cero, históricos/inactivos y pagos, sin sumas sobre páginas React.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-004 — Modelo mínimo de pago/aplicación

- Trazabilidad: REQ-H4-004 → DES-H4-004. Pruebas: TEST-H4-007, TEST-H4-008, TEST-H4-018.
- Dependencias: TASK-H4-001.
- Trabajo futuro: Crear solo pago y, si procede, pago_aplicacion; integridad/FKs/propiedad/UNIQUE/índices mínimos. Omitir estructura redundante de alternativa descartada. Estados solo si corrección fue aprobada.
- Finalización: Modelo corresponde a OQ resueltas, conserva UUID e historia H3 y no introduce ledger, deuda ni reservas persistidas sin necesidad.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-005 — Validación monetaria y contrato de inputs

- Trazabilidad: REQ-H4-005 → DES-H4-005. Pruebas: TEST-H4-008, TEST-H4-009, TEST-H4-010, TEST-H4-015, TEST-H4-022.
- Dependencias: TASK-H4-001 y TASK-H4-004.
- Trabajo futuro: Validar decimal exacto, precisión/cota/moneda y >0 antes de conversión; whitelist, tipos, rechazos y coherencia de aplicaciones cuando corresponda.
- Finalización: Límites/NaN/infinito/overflow y exceso sobre saldo no producen registros ni redondeo no aprobado.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-006 — Estados y particular elegible

- Trazabilidad: REQ-H4-006 → DES-H4-006. Pruebas: TEST-H4-011, TEST-H4-012, TEST-H4-013, TEST-H4-016.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-003.
- Trabajo futuro: Aplicar política aprobada de matrícula ANULADO, Ciclos terminales y particular/patrocinado con revalidación bajo lock. Sin pagos de empresa ni alta de matrícula desde pago.
- Finalización: Todos los estados/pertenencias permitidos y denegados tienen pruebas; no inferencias por analogía con edición H3.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-007 — Coordinación económica de H3

- Trazabilidad: REQ-H4-007 → DES-H4-007. Pruebas: TEST-H4-006, TEST-H4-012, TEST-H4-014, TEST-H4-015, TEST-H4-016, TEST-H4-033, TEST-H4-042.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-004, TASK-H4-005, TASK-H4-013.
- Trabajo futuro: Acotar únicamente las rutas H3 necesarias: descuento/opciones/traslado/patrocinador/anulación según decisiones. Compartir protocolo estable y preservar historia sin mover aplicaciones tácitamente.
- Finalización: Cambios con pagos previos no ocultan deuda, no exceden límites y funcionan bajo concurrencia; diferencias H3 concretas documentadas y autorizadas.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-008 — Fecha y concepto aprobados

- Trazabilidad: REQ-H4-008 → DES-H4-008. Pruebas: TEST-H4-017, TEST-H4-018.
- Dependencias: TASK-H4-001 y TASK-H4-004, TASK-H4-005.
- Trabajo futuro: Aplicar fecha de operación separada de registro DB y concepto mínimo acordado, límites/normalización y representación de historia.
- Finalización: Fechas/zona/longitudes/semántica y replay estables; no creación de cargo ni dato bancario no requerido.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-009 — Medios de pago mínimos

- Trazabilidad: REQ-H4-009 → DES-H4-009. Pruebas: TEST-H4-019, TEST-H4-020.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-004.
- Trabajo futuro: Reutilizar catálogo genérico, sembrar solo valores autorizados y validar catálogo/activo. Implementar mantenimiento solo si fue aprobado y necesario.
- Finalización: Lectura histórica/selección nueva y roles correctos; sin proveedor, adjunto ni motor adicional.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-010 — Comando transaccional de alta

- Trazabilidad: REQ-H4-010 → DES-H4-010. Pruebas: TEST-H4-021, TEST-H4-022, TEST-H4-034, TEST-H4-039.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-003, TASK-H4-005, TASK-H4-006, TASK-H4-007, TASK-H4-008, TASK-H4-009, TASK-H4-011, TASK-H4-013, TASK-H4-015.
- Trabajo futuro: Implementar la única RPC concreta de registro con permisos, locks/versiones, saldo DB, pago/aplicación y auditoría atómicos. Sin coordinación financiera React.
- Finalización: Alta parcial/total y respuesta mínima confiables, sin escrituras parciales ni bypass por campos cliente.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-011 — Idempotencia financiera

- Trazabilidad: REQ-H4-011 → DES-H4-011. Pruebas: TEST-H4-023, TEST-H4-024, TEST-H4-025, TEST-H4-026, TEST-H4-031, TEST-H4-032, TEST-H4-038.
- Dependencias: TASK-H4-001 y TASK-H4-004, TASK-H4-005.
- Trabajo futuro: Implementar clave UNIQUE y comparación semántica aprobadas en pago; gestionar mismo contenido y conflicto distinto, sin endpoint genérico ni reemitir clave automáticamente.
- Finalización: Reenvío confirmado devuelve misma operación y no cambia aplicaciones/versión/auditoría; alcance/retención y permisos comprobados.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-012 — Recuperación de respuesta ambigua

- Trazabilidad: REQ-H4-012 → DES-H4-012. Pruebas: TEST-H4-026, TEST-H4-027, TEST-H4-028, TEST-H4-029, TEST-H4-038, TEST-H4-041.
- Dependencias: TASK-H4-001 y TASK-H4-010, TASK-H4-011, TASK-H4-016.
- Trabajo futuro: Implementar consulta autorizada por identidad y estados UI de incertidumbre; continuidad de clave después de recarga según decisión aprobada. Reenvío solo consciente y de misma operación.
- Finalización: Commit perdido se recupera; vacío temporal no se presenta como fracaso definitivo ni dispara nuevo cobro.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-013 — Protocolo común de concurrencia

- Trazabilidad: REQ-H4-013 → DES-H4-013. Pruebas: TEST-H4-030, TEST-H4-031, TEST-H4-032, TEST-H4-033, TEST-H4-044.
- Dependencias: TASK-H4-001 y TASK-H4-004.
- Trabajo futuro: Establecer orden compatible Ciclo(s)→Alumno→Matrícula→cargos/pagos, relectura de referencias, unicidad y SERIALIZABLE/versiones. Aplicarlo en escritores financieros y mutaciones H3 relevantes.
- Finalización: Matriz de locks revisada y caso 70+60/100 probado con conexiones independientes; no saldo viejo ni retry silencioso.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-014 — Rollback e inyección controlada

- Trazabilidad: REQ-H4-014 → DES-H4-014. Pruebas: TEST-H4-027, TEST-H4-034, TEST-H4-035.
- Dependencias: TASK-H4-001 y TASK-H4-010, TASK-H4-013, TASK-H4-015.
- Trabajo futuro: Probar atomicidad por etapa y caída en auditoría; harness solo aislado, sin endpoint de producto. Distinguir rollback cierto de transporte después del commit.
- Finalización: Comparación DB antes/después y limpieza/restauración incluso con fallo, sin reservas o éxitos huérfanos.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-015 — Auditoría atómica mínima

- Trazabilidad: REQ-H4-015 → DES-H4-015. Pruebas: TEST-H4-035, TEST-H4-036, TEST-H4-044.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-004.
- Trabajo futuro: Reutilizar auditoría existente con proyección aprobada por evento, actor/fecha DB y visibilidad controlada. Justificar cualquier adaptación al helper existente por dato concreto.
- Finalización: Trazabilidad financiera sin PII/payload completo ni exposición a lectores no aprobados; replay sin segunda alta.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-016 — Consultas de saldo e historial

- Trazabilidad: REQ-H4-016 → DES-H4-016. Pruebas: TEST-H4-016, TEST-H4-037, TEST-H4-038.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-003, TASK-H4-004, TASK-H4-011.
- Trabajo futuro: Exponer proyección consistente y lecturas paginadas autorizadas, incluida recuperación por clave, etiquetas históricas y contexto de Ciclo acordado.
- Finalización: Totales no dependen de página visible ni combinan snapshots distintos; filtros no pierden/reasignan pagos.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-017 — UI mínima de pagos

- Trazabilidad: REQ-H4-017 → DES-H4-017. Pruebas: TEST-H4-039, TEST-H4-040, TEST-H4-043.
- Dependencias: TASK-H4-001 y TASK-H4-009, TASK-H4-010, TASK-H4-012, TASK-H4-016, TASK-H4-018.
- Trabajo futuro: Extender el recorrido individual vigente con resumen/grilla y formulario de pago según modelo aprobado. Manejar foco/borrador/clave/estado desconocido y no incorporar comprobantes o informes.
- Finalización: Flujo funcional y accesible bajo temas/teclado/móvil, operaciones y mensajes claros, sin autorización React.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-018 — Errores seguros y control de sesión

- Trazabilidad: REQ-H4-018 → DES-H4-018. Pruebas: TEST-H4-004, TEST-H4-022, TEST-H4-025, TEST-H4-040, TEST-H4-041.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-010, TASK-H4-011, TASK-H4-012.
- Trabajo futuro: Traducir validación/saldo/estado/versión/clave/transporte con errores seguros; descartar respuestas tardías al cambiar identidad y evitar datos sensibles en logs/URL.
- Finalización: Conflictos y respuesta ambigua distinguidos, sin reintentos invisibles ni exposición de SQL/PII/finanzas ajenas.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-019 — Integración, concurrencia y revisión humana

- Trazabilidad: REQ-H4-019 → DES-H4-019. Pruebas: TEST-H4-042, TEST-H4-043.
- Dependencias: TASK-H4-001 y TASK-H4-002, TASK-H4-003, TASK-H4-004, TASK-H4-005, TASK-H4-006, TASK-H4-007, TASK-H4-008, TASK-H4-009, TASK-H4-010, TASK-H4-011, TASK-H4-012, TASK-H4-013, TASK-H4-014, TASK-H4-015, TASK-H4-016, TASK-H4-017, TASK-H4-018.
- Trabajo futuro: Consolidar suites progresivas y regresión H1/H2/H3/H4 en base desechable, lint/types/unit/build y seguridad. Presentar recorrido humano con SHA y evidencias separadas.
- Finalización: Casos técnicos ejecutados y humanos reales o residuales explícitos; sin datos de ensayo persistidos en base humana.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## TASK-H4-020 — Candidato y Gate 2 futuro

- Trazabilidad: REQ-H4-020 → DES-H4-020. Pruebas: TEST-H4-042, TEST-H4-044, TEST-H4-045.
- Dependencias: TASK-H4-001 y TASK-H4-019.
- Trabajo futuro: Revisar arquitectura/mantenibilidad, publicar candidato e inventario, CI/evidencia y OQ resueltas. Solicitar decisión Gate 2; no concederla ni iniciar H5.
- Finalización: Candidato exacto y paquete revisable. Acceptance/merge solo después de autorización humana independiente; este Spec termina antes de Gate 1.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1 Y OQ.

## Bloques de validación propuestos

1. Modelo/decimal/permisos y protocolo: 004, 005, 002, 013, 003; validar integridad, dinero y denegaciones antes de UI.
2. Elegibilidad y compatibilidad H3, fecha/concepto/medios, idempotencia/auditoría: 006–009, 011, 015; verificar reglas decididas y datos mínimos.
3. Alta y consultas/recuperación: 010, 016, 012, 014, 018; probar commit perdido, rollback y 70+60 antes de presentar un flujo como correcto.
4. UI y regresión progresiva: 017, 019; roles, teclado, temas, dos sesiones y CI desechable. No esperar hasta el final para descubrir fallos transaccionales.
5. Revisión arquitectónica y futuro Gate 2: 020. Registrar evidencia real y residual, sin aprobación automática.

Las listas no crean tareas adicionales ni alteran dependencias. Verificación de Spec actual: únicamente links, IDs, cobertura y ausencia de ciclos de dependencias, más git diff --check. No se ejecutan suites técnicas/financieras ahora ni se modifica el cierre H3 o PLAN.

**DETENERSE PARA REVISIÓN HUMANA Y GATE 1.**
