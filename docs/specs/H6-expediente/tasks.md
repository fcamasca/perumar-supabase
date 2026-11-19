# H6 — Expediente y documentos institucionales: tasks

Fecha: 18/11/2026 (America/Lima). **DRAFT / Gate 1 H6 PENDIENTE. Construcción NO AUTORIZADA.**
Rama: `feature/h6-expediente-spec`. Base exacta de main: `1228a028fc203e0319340b5b55d7d9aa99802760`, merge [PR #3 H5](https://github.com/fcamasca/perumar-supabase/pull/3). CI main [44381503820](https://github.com/fcamasca/perumar-supabase/actions/runs/44381503820) SUCCESS antes de crear la rama. H5 [CLOSED / ACEPTADO / INTEGRADO](../H5-enrollment-pdf/acceptance.md), candidato final `a19520a1733dca53b38bfe1463d0473304c88d86`, 440/440; cierre `1551538f1fdd190a4a70da402883734c40ff30f1`, CI `44379188039` SUCCESS. [GATE-A01 APROBADO CON AJUSTES](../../architecture/GATE-A01-continuidad-supabase.md).

Esta entrega contiene exclusivamente requirements.md, design.md, tasks.md y test-plan.md. No implementa código/SQL/React/Edge, tablas, buckets, Storage, migraciones ni dependencias H6. Todos los TEST-H6 están **NO EJECUTADOS**. Las decisiones humanas OQ-H6-001 a 006 quedan RESUELTAS en esta revisión sobre la base `cff11ab339ca9dc4ec32283631c7fb68f57d59a3`. El diseño técnico aún se somete a Gate 1, que sigue PENDIENTE; resolver OQ no autoriza construcción. No se crea acceptance ni Gate 1 automático.

## Regla de ejecución

**Todas las tareas están PLANIFICADAS / NO INICIADAS.** OQ-H6-001 a 006 ya están RESUELTAS; TASK-001 verifica su incorporación coherente y obtiene Gate 1 humano, todavía PENDIENTE. Las demás son instrucciones de construcción futura, no permiso actual. Orden por dependencias, no por número. RLS/grants/constraints/auditoría se incluyen desde cada bloque; TASK-017/020 consolidan la matriz, no posponen seguridad para el final. No ejecutar TASK-002+ antes del Gate 1 exacto ni comandos de reset sobre datos humanos.

Las seis decisiones humanas son ya vinculantes en requisitos/diseño/pruebas. No quedan OQ H6 abiertas; todas las tareas de construcción siguen bloqueadas únicamente por Gate 1 pendiente, y después por sus dependencias técnicas. Crear solo el helper/comando necesario para un requisito, reutilizar patrones existentes y reportar si se convierte en una API oculta o nueva arquitectura.

## Tareas trazables

### TASK-H6-001 — Revisión del Spec y Gate 1

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-001 / DES-H6-001. Dependencias: Ninguna; revisión humana del Spec.

Trabajo: Verificar OQ-H6-001 a 006 RESUELTAS y coherentes en cuatro documentos; revisar diseño técnico/límites y obtener Gate 1 humano sobre SHA exacto. No volver a pedir decisión sobre las seis reglas ni registrar Gate 1 automáticamente.

Salida verificable: Cuatro documentos revisados, seis OQ resueltas y Gate 1 humano exacto antes de construir; política definitiva de eliminación solo pendiente para H9/release.

### TASK-H6-002 — Maestro tipo_documento

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-002 / DES-H6-002. Dependencias: TASK-H6-001, TASK-H6-018.

Trabajo: Migración aditiva y RPC guardar_tipo_documento con constraints, versión, rol y auditoría mínima; tipos de origen fijo y código estable referenciado. Semillas solo de tipos autorizados, nunca configuración ni PII inferidas de Word.

Salida verificable: Unicidad, origen inválido y cambios históricos rechazados; grants cerrados y CRUD autorizado probado.

### TASK-H6-003 — Configuración documental por Ciclo

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-003 / DES-H6-003. Dependencias: TASK-H6-002, TASK-H6-018.

Trabajo: Implementar guardar_documentos_ciclo con configuración efectiva y sincronización explícita/transaccional de TODAS las matrículas ACTIVO actuales: altas/reactivación/desactivación/obligatoriedad, incluida reactivación de opcional retirado que pasa a obligatorio. Detectar versión/conjunto de configuración obsoleto; locks ordenados, historia y auditoría atómicas.

Salida verificable: Tipos activos/unicidad, independencia por Ciclo, preservación de estado/bytes, exclusión de ANULADO/contextos históricos y rollback total si falla cualquier aplicación o auditoría; sin background ni commits por sublotes.

### TASK-H6-004 — Aplicación documental al registrar matrícula

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-004 / DES-H6-004. Dependencias: TASK-H6-003, TASK-H6-018.

Trabajo: Crear aplicaciones con contexto_id/contexto_vigente y unicidad por contexto/configuración. Al registrar matrícula, TODOS los activos nacen activos/PENDIENTE en la misma transacción de cargos/código/snapshot. Reutilizar aplicación/sincronización para altas y regularización sin duplicar reglas.

Salida verificable: Rollback completo de matrícula/cargos/documentos; estados de aplicaciones existentes conservados al sincronizar; contexto nuevo al trasladar/regresar, sin reutilizar histórico.

### TASK-H6-005 — Historia y obligatoriedad

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-005 / DES-H6-005. Dependencias: TASK-H6-004.

Trabajo: Proteger historia, origen/identidad/contexto y archivos; obligatorio efectivo/activo modificables solo por sincronización autorizada o retiro/traslado específico. Bloquear retiro individual obligatorio, permitir inactivación por configuración/traslado y reactivación al pasar a obligatorio.

Salida verificable: Documento/estado/bytes no se pierden al cambiar obligatoriedad o aplicabilidad; guard no confunde condición efectiva con snapshot inmutable ni bloquea configuración autorizada.

### TASK-H6-006 — Retiro de opcionales individual y por selección

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-006 / DES-H6-006. Dependencias: TASK-H6-005, TASK-H6-017, TASK-H6-018.

Trabajo: RPC de retiro opcional para Director/Coordinador, hasta50 seleccionados del mismo Ciclo/contexto vigente con versiones y motivo; matriz ACTIVO+PROGRAMADO/EN_CURSO/CERRADO, rollback total y auditoría sin borrar estado/bytes ni cambiar configuración.

Salida verificable: PENDIENTE/CARGADO/GENERADO conservados tras retiro; obligatorio/ajeno/obsoleto falla sin parcialidad; carrera con configuración que lo hace obligatorio se reevalúa, sin retry.

### TASK-H6-007 — Resumen derivado y faltantes

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-007 / DES-H6-007. Dependencias: TASK-H6-004, TASK-H6-017.

Trabajo: Resumen derivado solo del contexto vigente y aplicaciones activas; faltantes=activo+PENDIENTE, incluso opcionales. GENERADO desactualizado conserva conteos y se identifica por diagnóstico derivado separado, no OBSOLETO persistido.

Salida verificable: Cambios transaccionales de configuración/retirada/traslado actualizan conteos correctamente; retirados/históricos fuera del resumen y accesibles en Historia.

### TASK-H6-008 — Grillas y lectura de expediente

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-008 / DES-H6-008. Dependencias: TASK-H6-007, TASK-H6-017.

Trabajo: Pestañas de configuración/expediente y resumen en matrículas reutilizando componentes de Ciclo/Alumno; búsqueda y acciones según origen/rol. Incluir mantenimiento del maestro de tipos con búsqueda código/nombre, grilla y formulario compacto de origen fijo.

Salida verificable: Grillas compactas, sin listados confundidos, sin romper navegación o borradores existentes.

### TASK-H6-009 — Storage persistente privado

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-009 / DES-H6-009. Dependencias: TASK-H6-017.

Trabajo: Crear solo tras Gate 1 bucket propuesto h6-expediente privado; claves servidor, sin policies cliente ni URLs almacenadas. Separar bucket H5.

Salida verificable: Public/anon/authenticated directo denegado; ningún objeto H5 cambia de retención por H6.

### TASK-H6-010 — Carga y validación de contenido

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-010 / DES-H6-010. Dependencias: TASK-H6-009.

Trabajo: Edge expediente-cargar con entrada acotada, getUser/JWT, límites/MIME/firma/parseo real, hash servidor y metadatos saneados; usar protocolo TASK-011/012 al integrar.

Salida verificable: Casos frontera PDF/JPEG/PNG válidos e inválidos, bombas/activos/archivo cifrado/HTML rechazados sin estado ni éxito falso.

### TASK-H6-011 — Reserva, confirmación y compensación

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-011 / DES-H6-011. Dependencias: TASK-H6-004, TASK-H6-009, TASK-H6-017, TASK-H6-018.

Trabajo: Reserva/confirmación/aborto y cuarta tabla de versiones: actor/contexto/configuración/versiones revalidados, parámetros por generación de lista cerrada y apoderado/fecha protegidos e inmutables cuando se confirmen. No IO bajo lock DB ni falsa atomicidad Storage/DB.

Salida verificable: Sin CARGADO/GENERADO falso, huérfano privado conciliable; sincronización/traslado concurrentes impiden confirmación desactualizada, replay explícito sin segundo éxito.

### TASK-H6-012 — Versionado y reemplazos

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-012 / DES-H6-012. Dependencias: TASK-H6-010, TASK-H6-011.

Trabajo: ultimo_archivo_confirmado_id y metadatos inmutables de versión con vínculo exacto; reemplazo sin upsert. Derivar actual/histórica/desactualizada desde contexto/fuente/plantilla, manteniendo GENERADO y acceso histórico autorizado.

Salida verificable: Dos confirmaciones no sobrescriben; versiones reemplazadas/retiradas/anuladas conservadas, un puntero confirmado no se interpreta automáticamente como actual.

### TASK-H6-013 — Descarga autorizada

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-013 / DES-H6-013. Dependencias: TASK-H6-012, TASK-H6-017, TASK-H6-018, TASK-H6-021.

Trabajo: Edge descarga de archivo CONFIRMADO actual o histórico con JWT/RLS/vínculo/rol, bytes no-store y auditoría mínima. Permitir historia retirada/reemplazada/desactualizada/contexto anterior/matrícula anulada, incluso DESIERTO/ANULADO; no reutilizar bloqueo temporal H5.

Salida verificable: Revocar rol deniega; anular matrícula bloquea confirmación nueva pero permite historia autorizada; cambio de actual a histórico se comunica sin presentar viejo como actual ni borrar bytes.

### TASK-H6-014 — Cuatro renderers institucionales

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-014 / DES-H6-014. Dependencias: TASK-H6-010, TASK-H6-012, TASK-H6-015.

Trabajo: Cuatro renderers fijos/versionados con textos institucionales aprobados/referenciales, fecha/edad de generación H6 y apoderado explícito para cada Carta Poder. Todos admiten ACTIVO+PROGRAMADO/EN_CURSO/CERRADO; Solicitud sin requisito CERRADO/nota/aprobación.

Salida verificable: Formato legible/español/extremos/multipágina, sin personas de muestra, resultados académicos, afirmaciones inventadas ni contacto convertido en apoderado; no editor genérico.

### TASK-H6-015 — Fuente de datos y fingerprint

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-015 / DES-H6-015. Dependencias: TASK-H6-001, TASK-H6-004, TASK-H6-018.

Trabajo: Reutilizar selección de fuente CHG-H5-002. Calcular fecha real servidor Lima y edad a generación, separar campos de matrícula y usar datos de apoderado explícitos por versión. Huella canónica de datos/contexto/plantilla/perfil, sin fecha de emisión como invalidación diaria.

Salida verificable: Snapshot inicial/final intactos y sin fallback; fuente cambia durante generación da PT409, fecha/edad impresas quedan fijas al descargar versión histórica; no valores del reloj React.

### TASK-H6-016 — Integración persistente Ficha H5

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-016 / DES-H6-016. Dependencias: TASK-H6-012, TASK-H6-014, TASK-H6-015.

Trabajo: Compartir renderer/fuente/CHG-H5-002 y producir objeto persistente H6 propio. Parametrizar proyección/perfil fijo H6 de fecha/edad sin modificar defaults ni contrato temporal H5, sin copiar temporal ni depender de su TTL/bucket.

Salida verificable: H5 temporal sigue igual y bloquea obsoletos; H6 conserva generaciones como Historia descargable y exige regeneración explícita para actual, sin OBSOLETO persistido ni lógica duplicada.

### TASK-H6-017 — RLS, grants y autorización

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-017 / DES-H6-017. Dependencias: TASK-H6-002, TASK-H6-003, TASK-H6-004, TASK-H6-005.

Trabajo: RLS/grants y matriz resuelta: Director/Coordinador; mutaciones con ACTIVO y PROGRAMADO/EN_CURSO/CERRADO. ANULADO/DESIERTO bloquean mutar, no consultar/descargar historia. ADMIN solo/anon/bloqueado/revocado denegados; RLS SELECT no filtra fuera los archivos históricos autorizados.

Salida verificable: Matriz uniforme por tipo, solo operación adecuada al origen; sin DML/Storage cliente ni service_role bundle, roles vigentes revalidados tras locks.

### TASK-H6-018 — Concurrencia y contratos de conflicto

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-018 / DES-H6-018. Dependencias: TASK-H6-001.

Trabajo: Consolidar Ciclo→Alumnos→Matrículas→config/documentos/archivos, expected_updated_at y conjunto de configuración esperado; PT409 lógico, 40001/40P01 reales sin retry. Diseñar carreras config/matrícula/retiro/confirmación/traslado antes de comandos.

Salida verificable: Guardar configuración sincroniza todo una sola transacción, sin deadlocks por orden inverso ni partir en sublotes; revalidación conserva matriz de lectura histórica distinta de mutación.

### TASK-H6-019 — Traslado y regularización de existentes

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-019 / DES-H6-019. Dependencias: TASK-H6-001, TASK-H6-003, TASK-H6-004, TASK-H6-018.

Trabajo: Traslado H4 crea contexto nuevo: anterior inactivo/histórico TRASLADO y destino TODOS activos/PENDIENTE; regreso también nuevo contexto, sin reactivar/copy/reusar bytes. Añadir RPC regularizar_expedientes_ciclo para existentes ACTIVO, explícita, auditada y transaccional.

Salida verificable: Historia/pagos/restricciones financieras intactos; regularización no duplica al repetir ni altera ANULADO, no backfill/reset/background; fallo revierte todo.

### TASK-H6-020 — Auditoría mínima

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-020 / DES-H6-020. Dependencias: TASK-H6-002, TASK-H6-003, TASK-H6-004, TASK-H6-006, TASK-H6-011, TASK-H6-013, TASK-H6-014.

Trabajo: Auditoría mínima de configuración+sincronización, cambio de flags/causas, regularización, aplicación, retiro, traslado y versiones/descarga. Conservar cambios estructurales append-only, sin PII/contenido/apoderado/keys/URLs en auditoría general.

Salida verificable: Sin éxito auditado ante fallo; configurar/sincronizar/regularizar y auditoría atómicos, historia de reactivación/obligatoriedad disponible sin copias genéricas de PII.

### TASK-H6-021 — Retención y operación manual

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-021 / DES-H6-021. Dependencias: TASK-H6-001, TASK-H6-011, TASK-H6-012.

Trabajo: Confirmados persistentes, sin TTL/purga funcional ni eliminación por retiro/anulación/cierre. Acceso histórico autorizado. Solo limpieza manual acotada/dry-run de reservas/objetos nunca confirmados; registrar política definitiva como pendiente H9/release.

Salida verificable: Ningún CONFIRMADO se borra aunque esté retirado/reemplazado/desactualizado/anulado; limpieza no adopta TTL H5 ni toca referencias históricas; sin scheduler/S3.

### TASK-H6-022 — UX de acciones y accesibilidad

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-022 / DES-H6-022. Dependencias: TASK-H6-006, TASK-H6-008, TASK-H6-010, TASK-H6-013, TASK-H6-014, TASK-H6-016.

Trabajo: Grillas y acciones con configuración efectiva, retiro/historia/conteos y mensajes uniformes. Distinguir actual/histórico/retirado/desactualizado sin estado OBSOLETO; bloquear solo mutaciones en contexto cerrado a cambios y mantener descarga histórica autorizada.

Salida verificable: Confirmación de alcance de sincronización, feedback de éxito/errores, teclado/foco/temas, selección y borrador conservados; apoderado explícito por generación y regeneración nunca automática.

### TASK-H6-023 — Regresión y pruebas de integración/seguridad

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-023 / DES-H6-023. Dependencias: TASK-H6-006, TASK-H6-007, TASK-H6-008, TASK-H6-012, TASK-H6-013, TASK-H6-014, TASK-H6-016, TASK-H6-019, TASK-H6-020, TASK-H6-021, TASK-H6-022.

Trabajo: Ejecutar plan H6 y suites H1–H5 progresivas; contratos PostgREST, Edge/Storage, rollback/carreras/expiración/rebuild/build-safety; fixture sintético y PII fuera de logs.

Salida verificable: Resultados exactos y riesgos documentados, 70+60 saldo100 y cierre H5 intactos; revisión humana de formatos pendiente de reporte real.

### TASK-H6-024 — Inventario, costos y candidato técnico

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-024 / DES-H6-024. Dependencias: TASK-H6-023.

Trabajo: Inventario propuesto actualizado: cuatro tablas y ocho RPC, incluida regularización concreta por OQ-001, sin arquitectura adicional. Medir recursos/costos con supuestos y publicar candidato/evidencia futura; preservar seis residuales.

Salida verificable: Requisitos/OQ cerrados no implican Gate1/Gate2; SHA/CI/inventario y evidencias reales sin acceptance/merge automáticos.

## Bloques razonables de construcción futura

- Gate 1 pendiente (OQ ya resueltas) y contratos de concurrencia; maestro/configuración/aplicación con seguridad desde inicio.
- Protección de historia, retiro y resumen; RLS/grants reales y rollback inicial de matrícula.
- Storage/reserva/carga/versiones/retención y descarga; fallos por etapa y carreras antes de UI final.
- Fuente/renderers fijos y copia H5 persistente; contenido mínimo/extenso, privacidad y regresión de cierre.
- UX integrada/accesibilidad, regresión integral, inventario y candidato para revisión humana.

Validación progresiva por bloque: lint/typecheck/unidades y pruebas reales pertinentes. Repetir/broaden solo tras cambios/fallos/concern concreto. Rebuild completo/expiración/regresión H1–H5 al final técnico, sin reset humano. Las pruebas humanas H6 corresponden a los nuevos formatos/flujo de expediente, no a repetir la aprobación H5 ya aceptada.

## Entrega de esta fase

Publicar solo los cuatro documentos y sus comprobaciones documentales/CI. Informar SHA base main, rama/Spec SHA y OQ reales. **Sin Gate 1 H6, código, migraciones, tablas, buckets, Edge, acceptance ni PR/merge H6.** Las tareas técnicas, evidencias y mediciones siguen pendientes.
