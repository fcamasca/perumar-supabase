# H2 — Base académica: requirements

**Versión:** 0.3 · **Fecha:** 22/10/2026 (America/Lima)
**H2 SPEC: PENDING HUMAN APPROVAL** · **IMPLEMENTATION: BLOCKED**

Revisión documental del Spec publicado `b8c701b303c5610b065c3dfaa9018cc75008405e`. R-H2-001 a 006 y las precisiones de catálogos/eliminación de Ciclos quedan incorporadas por decisión humana. OQ-H2-001 a 010 están **RESUELTAS POR DECISIÓN HUMANA APROBADA** del usuario el 22/10/2026. Aprobar estas decisiones funcionales no aprueba Gate 1 del Spec completo. No se construye H2, no se ejecutan TASK ni pruebas de producto en esta entrega.

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
| OQ-H2-004 | RESUELTA. Precargar materias activas de carrera; permitir adicionales propias; distinguir heredadas/adicionales; sincronizar faltantes en ciclos modificables sin perder adicionales ni reescribir terminales. Inactivar materia no la retira de ciclos existentes | Precisada por R-H2-003: sincronización solo agrega faltantes, sin retiro/reclasificación/reactivación automática |
| OQ-H2-005 | RESUELTA. UUID técnico DB y FK por UUID. Materia/Carrera: código obligatorio trim+MAYÚSCULAS UNIQUE máximo 30, nombre obligatorio trim+MAYÚSCULAS UNIQUE máximo 150; editables sin conflicto y no reutilizables al inactivar; descripción opcional máximo 500 | Nombre único y normalización son decisión humana H2, no requisito atribuido retroactivamente a HU |
| OQ-H2-006 | RESUELTA. Materia/Carrera active BOOLEAN, reactivación permitida, sin DELETE físico. Inactivación conserva referencias; materia deja de precargarse y puede retirarse manualmente de ciclo editable; carrera inactiva no admite nuevos ciclos | Precisa ciclo diferente de maestra; no borrado/cascada histórica |
| OQ-H2-007 | RESUELTA. Carrera con sigla persistida trim+MAYÚSCULAS editable; sugerencia UI opcional. Código ciclo AÑO-CORRELATIVO-SIGLA, año de creación fijo, correlativo global anual fijo generado por DB y no editable. Cambio de sigla actualiza solo sufijo en ciclos modificables de forma atómica, con advertencia y auditoría; terminales no cambian | **Sustituye expresamente HU3:** no correlativo por carrera ni edición manual de código/nombre autogenerado |
| OQ-H2-008 | RESUELTA. estado_codigo PROGRAMADO, EN_CURSO, CERRADO, DESIERTO, ANULADO; inicial PROGRAMADO; transiciones manuales del Director y matriz cerrada en R-H2-001, sin cron. DESIERTO/ANULADO con motivo, terminales sin uso nuevo/cascada destructiva. Geografía real jerárquica y Capitanía con carga inicial controlada, modalidades y motivos necesarios | Sustituye activar/inactivar ciclo de HU3; restricciones de matrícula/facturación diferidas hasta existir movimientos; no todo HU20 |
| OQ-H2-009 | RESUELTA. Auditoría PostgreSQL relacional append-only: UUID evento, entidad, UUID afectado, acción, auth.uid(), tiempo DB, motivo nullable, old_values/new_values JSONB; atómica. Motivo obligatorio solo en sensibles iniciales: DESIERTO, ANULADO, inactivar Materia/Carrera. Lectura por los tres roles; filtros fecha/actor/entidad/acción | HU23 fundamenta lectura; sin plataforma analítica, NoSQL ni motivos para cambios ordinarios |
| OQ-H2-010 | RESUELTA. Concurrencia optimista por updated_at controlado por servidor; versión leída exigida por DB al guardar, conflicto rechaza sin última escritura gana ni merge automático | Precisa comportamiento antes ambiguo; sin reserva de pantalla ni bloqueo pesimista entre usuarios |

## Requisitos verificables

| ID | Requisito y fuente | Alcance de aceptación futura |
|---|---|---|
| REQ-H2-001 | PLAN/H0/H1: misma arquitectura ligera local y seguridad validada | Migraciones futuras aditivas, guard intacto, evolución explícita a tres roles funcionales sin mapeo desde roles técnicos, directorio de seguridad de solo lectura para ADMIN_SISTEMA y evidencia H1 intacta |
| REQ-H2-002 | HU1 + decisiones 005/006: CRUD lógico Materia | UUID DB; código/nombre normalizados y únicos incluso inactivos; descripción opcional; active, creación y updated_at servidor; reactivar; advertencia y motivo al inactivar; rechazar inactivación si deja alguna Carrera sin materia activa |
| REQ-H2-003 | HU2 + decisiones 005/006/007/008: CRUD lógico Carrera | Mismas reglas de código/nombre/descripción; sigla obligatoria trim/MAYÚSCULAS alfanumérica UNIQUE de 2–10, modalidad de catalogo_valor, mínimo una materia ACTIVA, active; sin borrar referencias; advertencia/motivo de inactivación |
| REQ-H2-004 | HU1–3 + decisión 004: Carrera–Materia y Ciclo–Materia | FK UUID, sin duplicados/huérfanos, origen único HEREDADA/ADICIONAL y activo/motivo_inactivacion en Ciclo–Materia; sincronizar solo faltantes sin reactivar/reclasificar; retiro manual conserva fila; cambio Carrera inactiva heredadas anteriores y preserva adicionales; operación atómica |
| REQ-H2-005 | HU3 precisada por 002/003/008: Ciclo operativo completo de H2 | UUID, código, año/correlativo, materias, promoción opcional ≤150, fechas/Carrera/Departamento/Provincia/Distrito/Capitanía activa obligatorios, mínimo una materia activa al alta, estado_codigo y auditoría; sin active ni DELETE de Ciclo persistido; no anticipar matrículas/facturas |
| REQ-H2-006 | Decisiones 003/007/008: reglas de ciclo y sigla | Exclusión concurrente Carrera+Capitanía+fechas inclusivas solo PROGRAMADO/EN_CURSO/CERRADO; correlativo global por año de creación America/Lima, mínimo tres dígitos sin límite 999 ni gapless; código no editable; cambio de sigla atómico solo en modificables; transiciones manuales Director y motivos sensibles |
| REQ-H2-007 | Decisiones 005/006/008/010: integridad en PostgreSQL | Normalización y límites desde DB, FK UUID, jerarquía geográfica, valores válidos, updated_at servidor y comparación de versión en toda edición afectada, incluso solicitudes directas |
| REQ-H2-008 | Decisión 001 + propiedades H1: permisos efectivos reales | Director mantiene materias/carreras; Director/Coordinador editan PROGRAMADO/EN_CURSO; Coordinador tiene lectura referencial activa/histórica sin mantenimiento; Director estados; ADMIN_SISTEMA sin CRUD académico implícito; multirol unión explícita; negar anónimos/no habilitados/roles técnicos |
| REQ-H2-009 | HU23 + decisión 009: auditoría básica transaccional | Tabla append-only y JSONB acotado, actor/tiempo confiables, acciones CREATE/UPDATE/estado/asociación/inactivar/reactivar/anular; rollback si falla auditoría; lectura de tres roles y filtros básicos; motivos solo sensibles |
| REQ-H2-010 | HU1–3 + decisiones: UI concreta | Listados/formularios/consulta de materias, carreras y ciclos, selector de relaciones, advertencias y listado básico de auditoría; Cancelar/Descartar Ciclo no guardado sin persistencia/auditoría, nunca eliminar Ciclo guardado; conflicto de edición exige recarga, sin sobrescritura silenciosa |
| REQ-H2-011 | PLAN 9.1: cuatro preferencias visuales | Sistema por defecto, Claro, Oscuro y Alto contraste; forced-colors/accesibilidad equivalente del sistema prioritaria |
| REQ-H2-012 | PLAN 9.1: accesibilidad visual | Criterios aplicables WCAG 2.2 AA, foco visible y estados distinguibles con información adicional al color; validación humana |
| REQ-H2-013 | PLAN 9.1: preferencia simple local | system/light/dark/high-contrast; persistencia local sin DB/Auth/backend, tokens compartidos sin framework adicional |
| REQ-H2-014 | PLAN + decisiones: verificación real y operación | Positivos/negativos API/DB, roles reales, propagación/concurrencia/auditoría/catálogos, reset/reproducción/cleanup y regresión de propiedades H1, sin datos reales |
| REQ-H2-015 | Gate arquitectónico PLAN | Persona evalúa simplicidad del CRUD/RLS/constraints, diagnóstico, reglas localizadas y complejidad de temas; no autoaprobar por CI |
| REQ-H2-016 | PLAN: disciplina de gates | Spec completo espera Gate 1; construcción solo después. Acceptance/merge solo tras Gate 2; evidencia por commit y sin H3 anticipado |

## Cierres residuales humanos y precisiones funcionales

Todos están **RESUELTOS POR DECISIÓN HUMANA** en esta revisión. No constituyen preguntas abiertas ni aprobación de Gate 1.

| ID | Estado | Decisión funcional incorporada |
|---|---|---|
| R-H2-001 | RESUELTA POR DECISIÓN HUMANA | Solo Director: PROGRAMADO→EN_CURSO, EN_CURSO→CERRADO, PROGRAMADO/EN_CURSO→DESIERTO y solo PROGRAMADO→ANULADO. DESIERTO/ANULADO con motivo; terminales CERRADO/DESIERTO/ANULADO sin reapertura MVP ni edición ordinaria. Director/Coordinador editan PROGRAMADO/EN_CURSO en H2. Superposición incluye PROGRAMADO/EN_CURSO/CERRADO; excluye DESIERTO/ANULADO, liberando rango |
| R-H2-002 | RESUELTA POR DECISIÓN HUMANA | catalogo/catalogo_valor para listas planas, Modalidad y Motivo Desierto; no tablas específicas de estas listas ni motor de configuración. Geografía/Capitanía con tablas propias. Datos iniciales: UBIGEO INEI, DICAPI, modalidades HU2 y motivos aprobados; registrar fuente/versión/fecha al implementar |
| R-H2-003 | RESUELTA POR DECISIÓN HUMANA | Carrera requiere ≥1 Materia ACTIVA al guardar; retirar/inactivar última activa de cualquier Carrera se rechaza. Ciclo requiere ≥1 materia activa al registrarse; inactivas no se precargan/agregan al nuevo Ciclo. Relación ciclo/materia única con activo, origen HEREDADA/ADICIONAL, motivo RETIRO_MANUAL/CAMBIO_CARRERA cuando se inactiva; sin borrar filas, reactivación automática ni doble origen. Cambio Carrera inactiva heredadas anteriores, conserva adicionales y agrega solo faltantes de nueva Carrera, todo atómico |
| R-H2-004 | RESUELTA POR DECISIÓN HUMANA | Sigla obligatoria trim/MAYÚSCULAS UNIQUE alfanumérica 2–10, sugerida opcionalmente pero persistida/editable sin recálculo por nombre. Correlativo global anual concurrente con ancho visual mínimo 3 (001/015/999/1000), sin máximo 999 ni gapless. Año de creación PostgreSQL en America/Lima; año/correlativo inmutables |
| R-H2-005 | RESUELTA POR DECISIÓN HUMANA | Fechas inicio/fin, Carrera, mínimo materia activa al alta, Departamento/Provincia/Distrito y Capitanía activa obligatorios; promoción opcional ≤150, sin dirección libre. Coordinador lee referencias necesarias, activas para seleccionar e inactivas históricas para representar ciclo existente, sin mantenimiento |
| R-H2-006 | RESUELTA POR DECISIÓN HUMANA | Tres roles funcionales, multirol, fixtures con asignación explícita, ningún mapeo ADMIN/OPERADOR; usuarios conservados requieren asignación explícita. Rutas /seguridad y /seguridad/usuarios conservan consulta existente adaptada; solo ADMIN_SISTEMA tiene directorio de seguridad de solo lectura, no Director por defecto. Sin CRUD completo HU17/HU18 |

### Catálogos iniciales aprobados

- `catalogo`: UUID, código único, nombre, activo y timestamps necesarios. `catalogo_valor`: UUID, catalogo_id UUID, código, nombre, activo, orden cuando se necesite y timestamps. Estructura simple para listas planas; sin lógica dinámica ni implementación completa de HU20.
- MODALIDAD_CARRERA: CON_EXPERIENCIA y SIN_EXPERIENCIA (HU2).
- MOTIVO_CICLO_DESIERTO: FALTA_ALUMNOS — FALTA DE ALUMNOS; FALTA_INSTRUCTOR — FALTA DE INSTRUCTOR; CANCELACION_INSTITUCIONAL — CANCELACIÓN INSTITUCIONAL; CONDICIONES_CLIMATICAS — CONDICIONES CLIMÁTICAS; OTRO — OTRO.
- DESIERTO exige valor activo perteneciente al catálogo correcto; OTRO exige detalle complementario. Conservar referencia aunque el valor se inactive después. ANULADO e inactivación de Materia/Carrera exigen motivo libre, sin reutilizar este catálogo automáticamente.
- Departamento/Provincia/Distrito: fuente oficial UBIGEO de INEI, jerarquía validada por DB. Capitanías: fuente oficial DICAPI, sin relación Capitanía→Distrito inventada. Registrar fuente/versión/fecha al cargar en la implementación futura. El usuario no carga manualmente todo el catálogo para empezar a usar H2. SEXO y otras listas futuras son ejemplos de reutilización, no alcance H2.

### Conservación de ciclos y límites evolutivos

Ciclo persistido = registro histórico permanente: ningún DELETE físico desde aplicación, incluso PROGRAMADO. Registro erróneo se trata con ANULADO si cumple sus reglas. Cancelar/Descartar formulario aún no guardado solo descarta estado local, sin DELETE ni auditoría porque no existió operación persistida.

No matrículas/facturas en H2. Cuando existan: ciclo con matrículas solo permite al Director modificar promoción/fechas según HU3; ANULADO se deniega con matrículas o facturación, comunicando DESIERTO cuando corresponda funcionalmente. Verificaciones efectivas se incorporan en H3/H4/H7 antes de habilitar esas entidades, sin flags del navegador ni tablas ficticias como prueba en H2.

Sin SQL, migraciones, React, dependencias, aceptación o rama de implementación en esta entrega. Sin backend/Edge Functions/Redux/motores genéricos, catálogos HU20 completos o gestión de usuarios HU17/HU18. No se modifican PLAN, historias fuente ni evidencia H0/H1.

No se identifican nuevas preguntas funcionales bloqueantes para revisar Gate 1. La selección técnica de carga/versionado, operadores y mecanismos transaccionales se concreta dentro del diseño sujeto a Gate 1, sin inventar comportamiento de negocio.

## Trazabilidad y estado

Matriz completa REQ → DES → TASK → TEST en [tasks.md](tasks.md). Las decisiones de negocio de esta revisión son humanas; los mecanismos técnicos propuestos siguen sujetos a revisión del Spec. Los seis detalles residuales funcionales ya están resueltos, sin nuevas preguntas bloqueantes identificadas. Pruebas humanas y aceptación pertenecen a una persona, nunca a Codex.

**H2 SPEC: PENDING HUMAN APPROVAL**
**H2 IMPLEMENTATION: BLOCKED — NOT STARTED**
