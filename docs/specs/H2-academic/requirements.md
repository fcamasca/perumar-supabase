# H2 — Base académica: requirements

**Versión:** 0.2 · **Fecha:** 22/10/2026 (America/Lima)
**H2 SPEC: PENDING HUMAN APPROVAL** · **IMPLEMENTATION: BLOCKED**

Revisión documental del Spec `a8490c3bf78f1a37a73a1a19bbfcb49cc3079bec`. OQ-H2-001 a 010 están **RESUELTAS POR DECISIÓN HUMANA APROBADA** del usuario el 22/10/2026. Aprobar estas decisiones funcionales no aprueba Gate 1 del Spec completo. No se construye H2, no se ejecutan TASK ni pruebas de producto en esta entrega.

## Fuentes y precedencia

1. [PLAN vigente](../../PLAN_MVP.md), H2 y criterio transversal 9.1. Esta revisión registra las precisiones funcionales humanas posteriores para H2, sin modificar el PLAN ni las historias fuente.
2. [Historias vigentes](../../requirements/Historias_de_Usuario.md): HU1 materias, HU2 carreras, HU3 ciclos, HU20 solo maestras necesarias, **HU23 como fuente funcional específica de consulta de auditoría** y alcance general de auditoría.
3. [Aceptación H0](../H0-bootstrap/acceptance.md), [aceptación H1](../H1-security/acceptance.md), diseño y evidencia H1 como base de propiedades de seguridad; sus roles de ensayo no son roles funcionales del producto.
4. [Evaluación arquitectónica](../../architecture/Informe_Evaluacion_Arquitectonica_PERUMAR.md) y [alternativas](../../architecture/Informe_Alternativas_Arquitectura_PERUMAR.md), contexto secundario que no añade reglas.

Referencias históricas a Keycloak/MinIO y símbolos ilegibles de la matriz fuente no prevalecen sobre PLAN y decisiones humanas. HU1–3/HU20/HU23 identifican la numeración original, sin renumerar ni corregir las fuentes para hacerlas coincidir.

## Registro de decisiones humanas aprobadas

| Decisión | Estado y regla aprobada para H2 | Precisión respecto de HU / borrador 0.1 |
|---|---|---|
| OQ-H2-001 | RESUELTA. Roles reales DIRECTOR_ACADEMICO, COORDINADOR_ACADEMICO y ADMIN_SISTEMA; multirol. Director mantiene materias/carreras. Director y Coordinador operan ciclos según permisos expresos; solo Director cambia estados manualmente. Los tres consultan auditoría | Sustituye uso de ADMIN/OPERADOR como producto; no mapeo automático de personas ni CRUD implícito por administración |
| OQ-H2-002 | RESUELTA. Ciclo es movimiento académico con UUID, código, fechas, carrera, materias, promoción, ubicación, estado, correlativo y auditoría | Incluye estos datos en H2; no boolean activo ni entidades futuras |
| OQ-H2-003 | RESUELTA. Rechazar superposición de fechas inclusivas de misma Carrera + misma Capitanía/puerto, con garantía concurrente en DB | Precisa universo ambiguo de HU3; no regla global por fecha |
| OQ-H2-004 | RESUELTA. Precargar materias activas de carrera; permitir adicionales propias; distinguir heredadas/adicionales; propagar cambios ordinarios a heredadas de ciclos modificables sin perder adicionales ni reescribir terminales. Inactivar materia no la retira de ciclos existentes | Precisa relación viva controlada y preservación histórica; detalles residuales R-H2-003 |
| OQ-H2-005 | RESUELTA. UUID técnico DB y FK por UUID. Materia/Carrera: código obligatorio trim+MAYÚSCULAS UNIQUE máximo 30, nombre obligatorio trim+MAYÚSCULAS UNIQUE máximo 150; editables sin conflicto y no reutilizables al inactivar; descripción opcional máximo 500 | Nombre único y normalización son decisión humana H2, no requisito atribuido retroactivamente a HU |
| OQ-H2-006 | RESUELTA. Materia/Carrera active BOOLEAN, reactivación permitida, sin DELETE físico. Inactivación conserva referencias; materia deja de precargarse y puede retirarse manualmente de ciclo editable; carrera inactiva no admite nuevos ciclos | Precisa ciclo diferente de maestra; no borrado/cascada histórica |
| OQ-H2-007 | RESUELTA. Carrera con sigla persistida trim+MAYÚSCULAS editable; sugerencia UI opcional. Código ciclo AÑO-CORRELATIVO-SIGLA, año de creación fijo, correlativo global anual fijo generado por DB y no editable. Cambio de sigla actualiza solo sufijo en ciclos modificables de forma atómica, con advertencia y auditoría; terminales no cambian | **Sustituye expresamente HU3:** no correlativo por carrera ni edición manual de código/nombre autogenerado |
| OQ-H2-008 | RESUELTA. estado_codigo PROGRAMADO, EN_CURSO, CERRADO, DESIERTO, ANULADO; inicial PROGRAMADO; transiciones manuales del Director, sin cron. DESIERTO/ANULADO con motivo, terminales sin uso nuevo/cascada destructiva. Geografía real jerárquica y Capitanía con carga inicial controlada, modalidades y motivos necesarios | Sustituye activar/inactivar ciclo de HU3; restricciones de matrícula/facturación diferidas hasta existir movimientos; no todo HU20 |
| OQ-H2-009 | RESUELTA. Auditoría PostgreSQL relacional append-only: UUID evento, entidad, UUID afectado, acción, auth.uid(), tiempo DB, motivo nullable, old_values/new_values JSONB; atómica. Motivo obligatorio solo en sensibles iniciales: DESIERTO, ANULADO, inactivar Materia/Carrera. Lectura por los tres roles; filtros fecha/actor/entidad/acción | HU23 fundamenta lectura; sin plataforma analítica, NoSQL ni motivos para cambios ordinarios |
| OQ-H2-010 | RESUELTA. Concurrencia optimista por updated_at controlado por servidor; versión leída exigida por DB al guardar, conflicto rechaza sin última escritura gana ni merge automático | Precisa comportamiento antes ambiguo; sin reserva de pantalla ni bloqueo pesimista entre usuarios |

## Requisitos verificables

| ID | Requisito y fuente | Alcance de aceptación futura |
|---|---|---|
| REQ-H2-001 | PLAN/H0/H1: misma arquitectura ligera local y seguridad validada | Migraciones futuras aditivas, guard intacto, evolución explícita de catálogo de roles sin reescribir evidencia H1 |
| REQ-H2-002 | HU1 + decisiones 005/006: CRUD lógico Materia | UUID DB; código/nombre normalizados y únicos incluso inactivos; descripción opcional; active, creación y updated_at servidor; reactivar; advertencia y motivo al inactivar |
| REQ-H2-003 | HU2 + decisiones 005/006/007/008: CRUD lógico Carrera | Mismas reglas de código/nombre/descripción; sigla persistida editable, modalidad de catálogo, active; sin borrar referencias; advertencia/motivo de inactivación |
| REQ-H2-004 | HU1–3 + decisión 004: Carrera–Materia y Ciclo–Materia | FK UUID, sin duplicados/huérfanos, origen heredado/adicional; cambios/propagación atómicos, adicionales preservadas, inactivación no elimina materias de ciclos existentes |
| REQ-H2-005 | HU3 precisada por 002/003/008: Ciclo operativo completo de H2 | UUID, código, año/correlativo, fechas, carrera, materias, promoción, ubicación real, estado_codigo y auditoría; sin active; no anticipar matrículas/facturas |
| REQ-H2-006 | Decisiones 003/007/008: reglas de ciclo y sigla | Exclusión concurrente Carrera+Capitanía+fechas inclusivas; correlativo global por año de creación; código no editable; cambio de sigla atómico solo en modificables; transiciones manuales Director y motivos sensibles |
| REQ-H2-007 | Decisiones 005/006/008/010: integridad en PostgreSQL | Normalización y límites desde DB, FK UUID, jerarquía geográfica, valores válidos, updated_at servidor y comparación de versión en toda edición afectada, incluso solicitudes directas |
| REQ-H2-008 | Decisión 001 + propiedades H1: permisos efectivos reales | Director mantiene materias/carreras; Director/Coordinador ciclos ordinarios; Director estados; ADMIN_SISTEMA sin CRUD académico implícito; multirol unión explícita; negar anónimos/no habilitados/roles técnicos |
| REQ-H2-009 | HU23 + decisión 009: auditoría básica transaccional | Tabla append-only y JSONB acotado, actor/tiempo confiables, acciones CREATE/UPDATE/estado/asociación/inactivar/reactivar/anular; rollback si falla auditoría; lectura de tres roles y filtros básicos; motivos solo sensibles |
| REQ-H2-010 | HU1–3 + decisiones: UI concreta | Listados/formularios/consulta de materias, carreras y ciclos, selector de relaciones, advertencias y listado básico de auditoría; conflicto de edición exige recarga, sin sobrescritura silenciosa |
| REQ-H2-011 | PLAN 9.1: cuatro preferencias visuales | Sistema por defecto, Claro, Oscuro y Alto contraste; forced-colors/accesibilidad equivalente del sistema prioritaria |
| REQ-H2-012 | PLAN 9.1: accesibilidad visual | Criterios aplicables WCAG 2.2 AA, foco visible y estados distinguibles con información adicional al color; validación humana |
| REQ-H2-013 | PLAN 9.1: preferencia simple local | system/light/dark/high-contrast; persistencia local sin DB/Auth/backend, tokens compartidos sin framework adicional |
| REQ-H2-014 | PLAN + decisiones: verificación real y operación | Positivos/negativos API/DB, roles reales, propagación/concurrencia/auditoría/catálogos, reset/reproducción/cleanup y regresión de propiedades H1, sin datos reales |
| REQ-H2-015 | Gate arquitectónico PLAN | Persona evalúa simplicidad del CRUD/RLS/constraints, diagnóstico, reglas localizadas y complejidad de temas; no autoaprobar por CI |
| REQ-H2-016 | PLAN: disciplina de gates | Spec completo espera Gate 1; construcción solo después. Acceptance/merge solo tras Gate 2; evidencia por commit y sin H3 anticipado |

## Permisos funcionales y límites evolutivos

El detalle de operaciones figura en DES-H2-004. Coordinador no mantiene Materias/Carreras; la consulta mínima de referencias para operar Ciclo se identifica como propuesta de permiso específico, no como CRUD académico concedido implícitamente. ADMIN_SISTEMA obtiene consulta de auditoría, no CRUD de negocio ni asignación de roles desde cliente.

H2 no crea alumnos, matrículas, facturas, pagos ni profesores. Cuando esos movimientos existan: ciclo con matrículas solo permite al Director modificar promoción/fechas según HU3; ANULADO se deniega si hay matrículas o facturación, comunicando alternativa DESIERTO cuando corresponda. Debe implementarse esa comprobación efectiva en H3/H4/H7 antes de habilitar dependencias. Ahora no se usa boolean recibido del navegador, contador ficticio o tabla vacía futura como prueba de que no existen movimientos.

## Alcance documental y detalles residuales

Solo se actualizan los cuatro documentos del Spec. Sin SQL, migraciones, componentes, dependencias, aceptación, rama de implementación ni cambios históricos H0/H1. El alcance funcional H2 incluye solo las maestras realmente necesarias: Departamento/Provincia/Distrito/Capitanía, Modalidad de Carrera y Motivos de Ciclo Desierto cuando corresponda. Su carga inicial es responsabilidad controlada del sistema; no un requisito de carga manual por el usuario ni implementación completa de HU20.

OQ-H2-001 a 010 **no siguen pendientes**. Los siguientes son detalles nuevos que las decisiones no fijan por completo; no se rellenan por cuenta propia y deben resolverse o delimitarse expresamente al revisar Gate 1:

| ID residual | Detalle por confirmar antes de construir la parte afectada |
|---|---|
| R-H2-001 | Orígenes exactos de transiciones hacia DESIERTO/ANULADO; si terminales mantienen bloqueo de superposición (la decisión no excluye estados); edición ordinaria permitida en EN_CURSO y definición final de modificable. Propuesta conservadora en diseño, no aprobación inventada |
| R-H2-002 | Fuente/versión/cobertura autorizada de catálogos geográficos y Capitanías, modalidades y motivos iniciales; catálogo de motivos para DESIERTO frente a motivo libre ANULADO/inactivaciones; sin descargar o inventar contenido en este paso |
| R-H2-003 | Mínimo de materias por carrera/ciclo; selección adicional de materia inactiva, retiro de heredada y comportamiento ante cambio de carrera; qué sucede si una materia tiene ambos orígenes; no reintroducir por propagación una materia retirada manualmente sin acuerdo |
| R-H2-004 | Sigla obligatoria, longitud/caracteres/unicidad y formato del correlativo más allá del ejemplo 015 (relleno/ancho); zona horaria del año de creación. No asumir numeración sin huecos |
| R-H2-005 | Campos obligatorios/límites no definidos de promoción/ubicación y permiso mínimo de consulta de catálogos para Coordinador; mantenimiento UI de maestras iniciales fuera de CRUD académico no está autorizado automáticamente |
| R-H2-006 | Asignación inicial autorizada de roles reales a usuarios de producto y alcance vigente de las rutas/directorio de seguridad H1 al evolucionar catálogo; no convertir ADMIN→Director ni OPERADOR→Coordinador silenciosamente |

## Trazabilidad y estado

Matriz completa REQ → DES → TASK → TEST en [tasks.md](tasks.md). Las decisiones de negocio de esta revisión son humanas; los mecanismos técnicos y los detalles residuales propuestos siguen sujetos a revisión del Spec. Pruebas humanas y aceptación pertenecen a una persona, nunca a Codex.

**H2 SPEC: PENDING HUMAN APPROVAL**
**H2 IMPLEMENTATION: BLOCKED — NOT STARTED**
