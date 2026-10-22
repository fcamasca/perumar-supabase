# H2 — Base académica: requirements

**Versión:** 0.1 · **Fecha:** 22/10/2026 (America/Lima)
**H2 SPEC: PENDING HUMAN APPROVAL** · **IMPLEMENTATION: BLOCKED**

Este documento propone requisitos para revisión. No autoriza construcción ni resuelve por defecto las preguntas abiertas. H0/H1 están aceptados; H2 no está construido. No se ejecutan tareas de implementación en esta entrega.

## Fuentes y precedencia

1. [PLAN vigente](../../PLAN_MVP.md), H2 y criterio transversal 9.1 aprobado el 22/10/2026.
2. [Historias vigentes](../../requirements/Historias_de_Usuario.md): HU1 (materias), HU2 (carreras), HU3 (ciclos), alcance de auditoría y HU23 del backlog. HU20 solo aporta contexto de catálogos; no incorpora todo ese módulo a H2.
3. Decisiones aceptadas: [H0](../H0-bootstrap/acceptance.md), [H1](../H1-security/acceptance.md), diseño H1 y evidencia de implementación. Sus estados antiguos se interpretan según sus aceptaciones posteriores.
4. [Evaluación arquitectónica](../../architecture/Informe_Evaluacion_Arquitectonica_PERUMAR.md), secciones 5, 8 y 9, y [alternativas](../../architecture/Informe_Alternativas_Arquitectura_PERUMAR.md), como contexto secundario. No sustituyen reglas de negocio.

La fuente de historias conserva referencias tecnológicas históricas a Keycloak/MinIO y una matriz con símbolos ilegibles. No prevalecen sobre el PLAN ni permiten deducir permisos. Sus historias no tienen identificadores formales estables: aquí HU1–3 significa su numeración original, sin renumerar el documento fuente.

## Requisitos y aceptación esperada

| ID | Requisito verificable | Fuente y límites |
|---|---|---|
| REQ-H2-001 | Trabajar sobre la base H0/H1 aceptada, entorno local, React/TypeScript/Vite, Supabase/PostgreSQL; conservar seguridad, migraciones previas y guard | PLAN; aceptaciones H0/H1 |
| REQ-H2-002 | Materia: alta, consulta/listado, modificación, activación/inactivación; nombre, código único, descripción opcional y fecha de creación del servidor | HU1; no eliminación física asumida |
| REQ-H2-003 | Carrera: alta, consulta/listado, modificación, activación/inactivación; nombre, código único, descripción, modalidad con/sin experiencia y selección de materias | HU2; obligatoriedad de descripción y mínimo de materias pendientes |
| REQ-H2-004 | Relación Carrera–Materia reutilizable entre carreras, sin duplicados ni referencias huérfanas; guardar carrera y selección como una unidad atómica cuando se editan juntas | HU1–2; estrategia de sustitución/baja de relaciones pendiente |
| REQ-H2-005 | Ciclo mínimo: alta, consulta, modificación y estado, asociado a carrera y materias, fechas de inicio/fin válidas | PLAN, HU3; recorte exacto requiere OQ-H2-002 |
| REQ-H2-006 | Conservar para decisión el nombre año-correlativo por carrera/año-código de carrera editable, promoción, ubicación, precarga/selección de materias, desierto con motivo y regla de superposición de HU3 | No omitir ni implementar silenciosamente; OQ-H2-002/003/004/007/008 |
| REQ-H2-007 | Proteger identidad, claves, campos obligatorios, unicidad, relaciones, modalidades y estados válidos desde PostgreSQL, incluso ante payload manipulado o escrituras concurrentes | HU1–3; reglas exactas de normalización/estado pendientes |
| REQ-H2-008 | Aplicar autorización efectiva en DB/RLS y comandos; negar por defecto a anónimos, identidad no habilitada y roles sin permiso. React no concede acceso | PLAN; H1; matriz funcional OQ-H2-001 |
| REQ-H2-009 | Registrar auditoría básica de altas, modificaciones, cambios de estado y asociaciones; actor verificado, fecha del servidor, acción, entidad/ID y datos cambiados, en la misma transacción | PLAN; alcance de auditoría/HU1–3/HU23; motivos y consulta pendientes |
| REQ-H2-010 | UI concreta de materias, carreras, relación y ciclo mínimo: listas, formularios, consulta, confirmación y errores comprensibles; no control genérico de CRUD | PLAN/HU1–3; propuesta de presentación en diseño |
| REQ-H2-011 | Ofrecer Sistema por defecto, Claro, Oscuro y Alto contraste, mediante tokens semánticos; prioridad del alto contraste/forced-colors del sistema sobre cualquier paleta propia | PLAN 9.1; cambio transversal aprobado |
| REQ-H2-012 | Paletas propias con criterios WCAG 2.2 AA aplicables, foco visible, estados legibles y distinguibles, información no dependiente solo del color, tablas y formularios accesibles | PLAN 9.1; incluye prueba humana, no certificación automática |
| REQ-H2-013 | Selección conceptual system/light/dark/high-contrast, persistencia simple solo local; sin DB/Auth/RLS/backend para preferencias ni framework de temas | PLAN 9.1; política concreta propuesta en diseño |
| REQ-H2-014 | Pruebas reales positivas/negativas de datos, autorización, auditoría y atomicidad, regresión H1, reset reproducible y cleanup sin secretos ni datos reales | PLAN; continuidad H0/H1 |
| REQ-H2-015 | Evaluación humana final de simplicidad de CRUD, RLS, constraints, ubicación de reglas, diagnóstico, código/configuración y accesibilidad | Gate H2 del PLAN; no sustituye GATE-A01 después de H5 |
| REQ-H2-016 | Gate 1 humano antes de construcción; Gate 2 humano posterior antes de acceptance/merge. Evidencia por commit, comando, resultado y correcciones | Disciplina del PLAN |

## Alcance excluido

No alumnos, matrículas, pagos, costos, profesores/asignaciones docentes, patrocinadores, documentos, PDF, Storage, reportes generales ni catálogos completos. No crear filas o tablas H3 para simular reglas futuras. La edición de ciclos con matrículas requiere diseño H3 antes de que existan matrículas; aquí debe acordarse el recorte y registrarse esa dependencia, no declarar la regla ya probada.

Sin backend propio, Edge Functions, Redux, repositorios/servicios genéricos, motor de permisos, multitenancy, infraestructura productiva ni nuevas dependencias anticipadas. Sin migraciones, SQL ni código en esta entrega del Spec. No reabrir H0/H1 ni convertir roles de validación en roles académicos por el nombre.

## Preguntas abiertas para decisión humana

Todas están **PENDIENTES**. Bloquean la construcción de los elementos afectados; Gate 1 debe cerrarlas o aprobar expresamente un recorte con trazabilidad. No hay valores implícitos por ausencia de respuesta.

| ID | Decisión requerida | Impacto |
|---|---|---|
| OQ-H2-001 | ¿Qué capacidades de leer/crear/editar/cambiar estado/asociar y consultar auditoría tendrán ADMIN, OPERADOR y ambos? ¿Se autoriza un mapeo temporal de ensayo a director/coordinador o se requiere otra decisión? | Matriz, grants, RLS, RPC, UI y negativos; H1 no definió esta equivalencia |
| OQ-H2-002 | ¿Qué parte exacta de HU3 constituye el ciclo mínimo de H2? Confirmar inclusión/diferimiento explícito de promoción, ubicación, correlativo, materias propias, desierto y condiciones futuras de matrícula | No reducir HU3 silenciosamente ni anticipar H3/catálogos HU20 |
| OQ-H2-003 | ¿Superposición se evalúa globalmente, por carrera o lugar? ¿Qué estados participan, fechas inclusivas, mismo día y extremos permitidos? | Regla DB concurrente y pruebas; HU3 no especifica universo |
| OQ-H2-004 | ¿Materias del ciclo son selección independiente inicial o reflejan cambios de carrera? ¿Se pueden quitar las precargadas y añadir inactivas? ¿Qué ocurre al cambiar de carrera? | Modelo de relación, atomicidad y preservación histórica |
| OQ-H2-005 | ¿Código único distingue mayúsculas/espacios? ¿Nombre también es único? ¿Puede reutilizarse código inactivo y editarse código ya referenciado? Definir límites de longitud y campos obligatorios | Constraints y mensajes; no inventar duplicado por nombre |
| OQ-H2-006 | ¿Qué efectos tiene inactivar materia/carrera/ciclo ya relacionados? ¿Se autoriza reactivación? ¿Mínimo de materias por carrera/ciclo y baja física de asociaciones? | Estados, referencias y operaciones compuestas; propuesta conservadora pendiente |
| OQ-H2-007 | Si se incluye correlativo: ¿qué año lo determina, formato, huecos aceptables, renombrado manual, unicidad y efecto de cambio de carrera/año? | Generación concurrente, sin usar máximo+1 en navegador |
| OQ-H2-008 | ¿Qué estados además de activo/inactivo corresponden al ciclo? ¿Desierto es estado o condición separada? ¿Motivo libre o catálogo y quién lo declara? ¿Ubicación requiere catálogo oficial en H2 o se difiere? | Modelo mínimo sin catálogo completo ni permisos inventados |
| OQ-H2-009 | ¿Cuándo exigir motivo y quién consulta auditoría básica? Confirmar propuesta de conservar antes/después de campos de negocio, sin tokens, y exclusión de plataforma/reportes de auditoría | Campos, acceso y pruebas; sin política de retención inventada |
| OQ-H2-010 | Ante dos ediciones simultáneas: ¿se acepta última escritura o debe advertirse conflicto y recargar? | Comportamiento de actualización de formularios; no decidir silenciosamente |

## Trazabilidad y estado

El diseño, tareas y plan de pruebas referencian los REQ anteriores y las OQ. Las propuestas técnicas están sujetas a Gate 1, no son decisiones ya aceptadas. Las pruebas humanas y el Gate final pertenecen a una persona; Codex prepara recorrido/evidencia y registra confirmaciones.

**H2 SPEC: PENDING HUMAN APPROVAL**
**H2 IMPLEMENTATION: BLOCKED — NOT STARTED**
