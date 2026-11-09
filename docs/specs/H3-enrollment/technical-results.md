# H3 — Evidencia técnica de construcción

Base aprobada: `551cd00ed2957178400dca8fe9d945cf3f9e8d20`. Rama: feature/h3-enrollment. Gate 1 en [gate-1.md](gate-1.md). Los cuatro documentos aprobados no se modifican. Este informe no es acceptance ni Gate 2. El pendiente de catálogos de 22c1fee se resolvió mediante valores autorizados el 23/10/2026; el candidato actualizado completó la validación técnica local.

## Cambios e inventario observado en PostgreSQL local

Migraciones aditivas: `20261023010000_h3_enrollment_model.sql` y `20261023020000_h3_enrollment_commands.sql`, más `20261023030000_h3_authorized_catalog_values.sql` (41 valores autorizados, solo datos). Migraciones H1/H2 intactas. Inventario real verificado mediante SQL y assertSecurityInventory: **22 tablas públicas, 17 RPC públicas, 16 funciones privadas, 25 policies SELECT authenticated**. Sin permisos cliente de mutación en tablas; lectura académica H3 excluye Admin Sistema sin rol académico. Contador matrícula privado separado de Ciclo, sin acceso cliente.

Tablas H3: alumno, alumno_contacto_emergencia, empresa_patrocinadora, tarifa, ciclo_tarifa, matricula, matricula_cargo. Tabla privada nueva matricula_correlativo. Las quince tablas públicas y el contador de Ciclo H2 permanecen. No tabla adicional de cada catálogo: solo ocho definiciones en catalogo existente.

RPC nuevas (10): guardar_alumno, guardar_contacto_emergencia, retirar_contacto_emergencia, guardar_empresa_patrocinadora, guardar_tarifa, cambiar_activo_tarifa, guardar_ciclo_tarifas, registrar_matricula, editar_matricula, anular_matricula. Siete RPC H2 conservadas.

Helpers nuevos (5), justificación concreta:

- validate_alumno: trigger de reglas de ficha/documento/catálogo/geografía, también al guardar datos históricos completados.
- audit_enrollment: proyección explícita de H3 sin copia de PII/snapshot, separada del trigger H2 genérico.
- enrollment_snapshot: validación y fotografía histórica DB-side de un alumno/contactos, etiquetas de catálogo/geografía.
- apply_enrollment_charges: operación acotada de cargos compartida por alta/edición; no recibe SQL, tabla ni actor.
- guard_enrollment_history: inmutabilidad de historia y cierre de rutas H2 con matrículas activas.

Once helpers reutilizados: academic_user, assert_fields, audit_change, authorize, carrera_minimum, functional_user, has_active_role, require_catalog, require_version, stamp_update, sync_missing. Owner postgres y search_path vacío, sin EXECUTE público/anon en funciones privadas. Solo helpers de lectura de seguridad necesarios ejecutables por authenticated.

Policies: siete academic_read nuevas sobre las tablas H3; dieciocho H2 conservadas. SELECT por roles académicos activos y grants explícitos; comandos definer verifican sujeto/rol vigente, whitelist, tipos, versiones, estado e invariantes. Aislamiento SERIALIZABLE de cada comando, sin retry cliente. Auditoría H2 conserva permisos históricos, por ello nueva proyección minimizada excluye valores personales.

## Validación ejecutada — actualización del 23/10/2026

Entorno Windows local bajo guard H0 existente, Node 24.19.0 del runtime disponible, npm 10.9.0, Supabase/Docker locales; no link remoto ni cambio de firewall/host. Fixtures sintéticos con JWT ordinarios. SQL administrativo solo prepara/observa/inyecta fallos y limpia, nunca se presenta como evidencia de autorización.

| Comprobación | Resultado observado |
|---|---|
| lint / typecheck | PASSED |
| Suite unitaria completa | PASSED: 148 pruebas en 11 archivos |
| UI H3 y regresión de formularios académicos después del mensaje específico de formato | PASSED: 57 pruebas en 3 archivos |
| build / test:build-safety | PASSED; advertencia de bundle >500 kB conservada |
| supabase:reset / test:local | PASSED, migraciones aplicadas desde cero e inventario exacto |
| test:security | PASSED: regresión de matriz Auth/RLS H1/H2 |
| test:academic | PASSED: 11 grupos de invariantes académicas H2 con nuevo inventario/catálogos |
| test:enrollment | PASSED: 14 grupos técnicos DB/API, comparación exacta de 41 valores autorizados y matrícula con referencias de negocio desde reset; alta atómica con contactos, rollback de edición y reinicio anual con reloj desplazado/restaurado verificados |
| test:expiry | PASSED: token real 60s, renovación/residual/logout/expiración y restauración jwt_expiry=3600 |

14 grupos H3 cubren ficha/catálogos/documentos/contactos, empresa/tarifas/importes manipulados, snapshot/etiquetas e historia, cambio Ciclo/cargos/descuento, grants/lecturas por actor, reglas Carrera con activas/solo anuladas y código histórico, duplicado/ediciones concurrentes, límites DNI/CE/RUC/medidas, cardinalidad Carrera/terminalidad/descuentos, precios/códigos >999/concurrencia, revocación mismo token, legado incompleto completado y carreras de documento/contactos/configuración/estado Ciclo; rollback inyectado en matrícula/cargo/auditoría y edición. No se atribuyen 45 pruebas humanas/funcionales completas por tener 14 grupos: los IDs del Spec se vinculan en cada escenario del harness y se revisan junto al recorrido humano.

Cobertura por familias: TEST-H3-001 revisión de base/Spec intacto; 002–038 integración/seguridad y carreras más inventario; 005/039 DOM/cálculos/foco/Tabs/retorno. TEST-H3-040/041/042 recorrido humano/teclado/temas/SO y 044 revisión arquitectónica humana PENDIENTES. TEST-H3-043 reset/inventario/CI técnico, TEST-H3-045 decisión Gate 2 PENDIENTE. Los archivos del plan de pruebas mantienen su estado histórico pre-Gate 1; este informe registra ejecución posterior sin reescribirlos.

## Límites y pendientes

- Catálogos: pendiente RESUELTO el 23/10/2026; 41 valores autorizados en siete listas y 50 valores iniciales totales junto a H2/TIPO_DI. Ver [procedencia y etiquetas](catalog-values.md). PASAPORTE excluido por confirmación humana; solo DNI/CE. El alta y matrícula con referencias autorizadas se comprueban desde reset limpio; no hay pendiente de datos que bloquee el recorrido humano.
- CI del código base 22c1fee: [run 39902463891](https://github.com/fcamasca/perumar-supabase/actions/runs/39902463891), COMPLETED / SUCCESS verificado. La CI del nuevo SHA se informará al publicar; el éxito previo no se atribuye automáticamente al candidato nuevo.
- Pruebas humanas y Gate 2 pendientes; no inspección visual real/SO atribuida a Codex. Forced-colors real conserva antecedente H2 NO VERIFICADO.
- Riesgos: crecimiento proporcional a 17 RPC/16 helpers requiere revisión humana del recorrido, no API adicional; bundle 577 kB aprox.; riesgos locales H0/H1 conservados. Futuras restricciones de pagos quedan para H4.
- Sin desviación funcional deliberada del Spec, sin nuevas dependencias/servicios, sin EVOL-001/002, H4+, acceptance o merge.


**Construcción H3 completada técnicamente. Pendiente de pruebas humanas y Gate 2.**


## Actualización 02/11/2026 — CHG-H3-003

[Experiencia, modalidad y códigos de operación](approved-career-student-code-amendment.md), por solicitud y aclaración humanas posteriores al Gate 1. Carrera separa experiencia Sí/No (default No) de enseñanza (default Presencial); conserva CON/SIN antiguos como valores inactivos y convierte su significado al flag. Sigla/Nombre arriba, Modalidad/Experiencia en segunda fila. Materia/Carrera conservan codigo técnico nullable fuera de UI y comandos. Alumno incorpora código DB automático e inmutable A-0000001 con secuencia global, sin garantía gapless. Los snapshots históricos no se reescriben.

Migración 20261102020000 aplicada incrementalmente sin reset: huellas y mapeo previo/posterior verificados. Tres regresiones SQL reales con rollback y ocho transacciones concurrentes con códigos únicos pasaron, sin retries ni cambios a registros existentes. Inventario: 22 tablas públicas / 17 RPC / 16 helpers / 25 policies SELECT, más una secuencia privada sin acceso directo de producto. Los documentos aprobados H2/H3 se preservan. Gate 2 permanece pendiente.

Validación CHG-H3-003: lint, typecheck, 199 tests en 12 archivos, build, test:local, test:build-safety y git diff --check PASARON. Bundle 609.70 kB con advertencia conocida >500 kB. Los harness completos test:academic/test:enrollment fueron adaptados al contrato actual e incluyen la nueva regresión DB; su ejecución con reset se reserva a CI aislada, sin reset de datos humanos locales. CI del nuevo commit: pendiente de publicación/verificación. Pruebas humanas y Gate 2 pendientes.


## UX vigente — CHG-H3-005 (02/11/2026)

[Registro de matrícula dentro de Ciclo](approved-cycle-enrollment-amendment.md), autorizado humanamente después del Gate 1: Datos/Materias/Matrículas/Estado, una grilla de matriculados y panel lateral de búsqueda/lista de candidatos, cargos y confirmación individual. Sustituye navegación de CHG-H3-004, conserva búsqueda y transacción DB. Se retira Matrícula del menú y la ruta antigua redirige a Ciclos; detalle/historial permanecen con regreso contextual. Nuevo/editar Alumno conserva formulario completo fuera del panel. Sin SQL ni cambios en Spec aprobado. Gate 2 pendiente.

Validación CHG-H3-005: lint, typecheck, 226 pruebas en 13 archivos, build y git diff --check satisfactorios. Prueba real de solo lectura con Coordinador sintético: join matrícula/alumno, filtro de Ciclo, conteo exacto, paginación y búsqueda relacionada aceptados por Data API; identidades retiradas, sin modificar alumnos/matrículas ni reset. Inventario de seguridad exacto verificado, sin objetos DB nuevos. El harness test:enrollment incorpora consulta relacionada real para CI aislada; no se ejecutó su batería completa sobre la DB humana. Bundle conserva advertencia conocida >500 kB. CI del nuevo commit pendiente de publicación/verificación; revisión visual/teclado/SO y Gate 2 pendientes.


[CHG-H3-006 — Buscar y Agregar; edición individual](approved-quick-add-amendment.md), precisión humana del 02/11/2026: el buscador solo lista candidatos con Agregar; registra inmediatamente mediante la RPC existente con cargos obligatorios, sin patrocinador/opcionales/descuento/código manual. Solo éxito DB actualiza grilla; Editar matrícula abre pantalla completa para datos individuales. Error obligatorio impide registro parcial; historia/constraints intactos. Sustituye panel de CHG-H3-005, sin modificar Spec aprobado ni autorizar Gate 2.

Validación CHG-H3-006: 231 pruebas en 13 archivos, lint, typecheck, build y diff --check satisfactorios. Casos cubren Agregar sin confirmación, payload mínimo/solo obligatorios, actualización de grilla y búsqueda continua, exclusión de anuladas, fallo obligatorio sin fila ficticia, cierre/navegación bloqueados durante RPC, conflictos y respuestas inciertas sin retry, Ver frente a Editar individual con versión. El harness test:enrollment añade alta rápida con cargos obligatorios y descuento cero para CI aislada; no se ejecutó su batería completa ni reset sobre la DB humana. Sin migraciones ni cambios a documentos aprobados. CI del nuevo commit pendiente de publicación; pruebas humanas y Gate 2 pendientes.


[CHG-H3-007 — Tarifas dentro de Ciclo](approved-cycle-tariffs-amendment.md), autorización humana 03/11/2026: ficha Datos/Materias/Tarifas/Matrículas/Estado, grilla de conceptos asignados y agregar desde catálogo con monto inicial, importe propio/obligatoriedad/retiro antes de guardar. Solo Director modifica, Coordinador/terminales consultan. Se elimina editor duplicado del menú Tarifas; catálogo permanece allí. Avisos precisos de CARRERA obligatoria y configuración pendiente antes de matricular. Versiones y borradores coordinados entre pestañas; cargos históricos intactos. Sin cambios SQL/Spec aprobado. Gate 2 pendiente.

Validación CHG-H3-007: 253 pruebas en 15 archivos, lint, typecheck, build y git diff --check satisfactorios. Casos cubren agregar/default del catálogo, importe local/obligatoriedad, exclusiones, retiro/cancelación y payload completo con versión, conflicto sin retry, roles/terminales, fallo de carga, condición CARRERA para matrícula, borrador entre pestañas y versión actualizada para guardar Datos después. Sin reset ni migraciones. Suite DB completa reservada a CI aislada; RPC/reglas económicas existentes no modificadas. CI del nuevo commit pendiente de publicación/verificación; revisión humana y Gate 2 pendientes.


[CHG-H3-008 — Información DICAPI y carga inicial de pesca](approved-career-dicapi-amendment.md), autorizada 04/11/2026: cinco campos opcionales solo en Carrera, RPC existente, pestaña Información DICAPI/búsqueda por código y carga idempotente MAM-009/MAM-010 con 10/7 asociaciones. Sin reescribir Ciclos/matrículas/snapshots, sin horas. Spec aprobado conservado y Gate 2 pendiente.

## Enmienda CHG-H3-011 — 09/11/2026

El bloqueo absoluto de asignaturas con matrículas activas se sustituye por confirmación explícita solo Director. Coordinador sigue bloqueado. Véase [regla autorizada](approved-director-cycle-subjects-amendment.md). Cambiar Curso con activas, historia/códigos/cargos, terminalidad y versiones se conservan. Sigue un único cambiar_materia_ciclo, con quinto argumento booleano opcional; 17 RPC/16 helpers/22 tablas públicas/25 policies; 15 migraciones. Validación SQL con rollback y ensayo humano/Gate 2 pendientes de consolidar sobre candidato.

Validación final CHG-H3-011: migración aplicada incrementalmente en Supabase local, sin reset ni datos de negocio modificados por la migración. Suite completa 283/283 pruebas en 17 archivos; lint/typecheck/build/git diff --check correctos. SQL director-cycle-subjects y regresión de enmiendas/catálogos/códigos correctos con rollback; inventario exacto verificado, 8 transacciones concurrentes de código Alumno correctas. Advertencia conocida de bundle >500 kB. Revisión humana de la nueva confirmación y Gate 2 pendientes.
