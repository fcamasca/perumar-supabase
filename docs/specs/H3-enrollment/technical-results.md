# H3 — Evidencia técnica de construcción

Base aprobada: `551cd00ed2957178400dca8fe9d945cf3f9e8d20`. Rama: feature/h3-enrollment. Gate 1 en [gate-1.md](gate-1.md). Los cuatro documentos aprobados no se modifican. Este informe no es acceptance ni Gate 2; el dato pendiente de catálogos impide declarar cierre técnico final.

## Cambios e inventario observado en PostgreSQL local

Migraciones aditivas: `20261023010000_h3_enrollment_model.sql` y `20261023020000_h3_enrollment_commands.sql`. Migraciones H1/H2 intactas. Inventario real verificado mediante SQL y assertSecurityInventory: **22 tablas públicas, 17 RPC públicas, 16 funciones privadas, 25 policies SELECT authenticated**. Sin permisos cliente de mutación en tablas; lectura académica H3 excluye Admin Sistema sin rol académico. Contador matrícula privado separado de Ciclo, sin acceso cliente.

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

## Validación ejecutada

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
| test:enrollment | PASSED: 14 grupos técnicos DB/API; alta atómica con contactos, rollback de edición y reinicio anual con reloj desplazado/restaurado verificados |
| test:expiry | PASSED: token real 60s, renovación/residual/logout/expiración y restauración jwt_expiry=3600 |

14 grupos H3 cubren ficha/catálogos/documentos/contactos, empresa/tarifas/importes manipulados, snapshot/etiquetas e historia, cambio Ciclo/cargos/descuento, grants/lecturas por actor, reglas Carrera con activas/solo anuladas y código histórico, duplicado/ediciones concurrentes, límites DNI/CE/RUC/medidas, cardinalidad Carrera/terminalidad/descuentos, precios/códigos >999/concurrencia, revocación mismo token, legado incompleto completado y carreras de documento/contactos/configuración/estado Ciclo; rollback inyectado en matrícula/cargo/auditoría y edición. No se atribuyen 45 pruebas humanas/funcionales completas por tener 14 grupos: los IDs del Spec se vinculan en cada escenario del harness y se revisan junto al recorrido humano.

Cobertura por familias: TEST-H3-001 revisión de base/Spec intacto; 002–038 integración/seguridad y carreras más inventario; 005/039 DOM/cálculos/foco/Tabs/retorno. TEST-H3-040/041/042 recorrido humano/teclado/temas/SO y 044 revisión arquitectónica humana PENDIENTES. TEST-H3-043 reset/inventario/CI técnico, TEST-H3-045 decisión Gate 2 PENDIENTE. Los archivos del plan de pruebas mantienen su estado histórico pre-Gate 1; este informe registra ejecución posterior sin reescribirlos.

## Límites y pendientes

- Valores de negocio no enumerados en siete catálogos: consulta humana pendiente, no se inventan. Tras reset solo TIPO_DI tiene DNI/CE; tests usan valores TEST/SINTETICO. Sin SEXO/PARENTESCO autorizados no hay alta operativa limpia. Véase implementation-log; esto impide declarar un candidato final pendiente exclusivamente de humanos.
- CI ampliada; su estado se informará sobre SHA publicado, sin fingir SUCCESS antes de ejecución.
- Pruebas humanas y Gate 2 pendientes; no inspección visual real/SO atribuida a Codex. Forced-colors real conserva antecedente H2 NO VERIFICADO.
- Riesgos: crecimiento proporcional a 17 RPC/16 helpers requiere revisión humana del recorrido, no API adicional; bundle 577 kB aprox.; riesgos locales H0/H1 conservados. Futuras restricciones de pagos quedan para H4.
- Sin desviación funcional deliberada del Spec, sin nuevas dependencias/servicios, sin EVOL-001/002, H4+, acceptance o merge.
