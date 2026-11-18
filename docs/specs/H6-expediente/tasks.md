# H6 — Expediente y documentos institucionales: tasks

Fecha: 18/11/2026 (America/Lima). **DRAFT / Gate 1 H6 PENDIENTE. Construcción NO AUTORIZADA.**
Rama: `feature/h6-expediente-spec`. Base exacta de main: `1228a028fc203e0319340b5b55d7d9aa99802760`, merge [PR #3 H5](https://github.com/fcamasca/perumar-supabase/pull/3). CI main [44381503820](https://github.com/fcamasca/perumar-supabase/actions/runs/44381503820) SUCCESS antes de crear la rama. H5 [CLOSED / ACEPTADO / INTEGRADO](../H5-enrollment-pdf/acceptance.md), candidato final `a19520a1733dca53b38bfe1463d0473304c88d86`, 440/440; cierre `1551538f1fdd190a4a70da402883734c40ff30f1`, CI `44379188039` SUCCESS. [GATE-A01 APROBADO CON AJUSTES](../../architecture/GATE-A01-continuidad-supabase.md).

Esta entrega contiene exclusivamente requirements.md, design.md, tasks.md y test-plan.md. No implementa código/SQL/React/Edge, tablas, buckets, Storage, migraciones ni dependencias H6. Todos los TEST-H6 están **NO EJECUTADOS**. Las propuestas técnicas se someten a Gate 1; las OQ no equivalen a decisiones aprobadas. No se crea acceptance ni Gate 1 automático.

## Regla de ejecución

**Todas las tareas están PLANIFICADAS / NO INICIADAS.** TASK-001 cierra OQ y obtiene Gate 1 humano. Las demás son instrucciones de construcción futura, no permiso actual. Orden por dependencias, no por número. RLS/grants/constraints/auditoría se incluyen desde cada bloque; TASK-017/020 consolidan la matriz, no posponen seguridad para el final. No ejecutar TASK-002+ antes del Gate 1 exacto ni comandos de reset sobre datos humanos.

Las dependencias de OQ por requisito están en requirements.md. Cualquier task dependiente de OQ sin respuesta permanece bloqueada aunque compile una solución provisional. Crear solo el helper/comando necesario para un requisito, reutilizar patrones existentes y reportar si se convierte en una API oculta o nueva arquitectura.

## Tareas trazables

### TASK-H6-001 — Revisión del Spec y Gate 1

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-001 / DES-H6-001. Dependencias: Ninguna; revisión humana del Spec.

Trabajo: Resolver OQ-H6-001 a 006; aprobar límites técnicos, matriz de estados/roles, fuente/fechas/textos y retención. Obtener Gate 1 humano sobre SHA exacto. No iniciar ninguna tarea de construcción antes.

Salida verificable: Cuatro documentos coherentes, OQ resueltas, SHA/Gate 1 registrados sin aceptación automática.

### TASK-H6-002 — Maestro tipo_documento

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-002 / DES-H6-002. Dependencias: TASK-H6-001, TASK-H6-018.

Trabajo: Migración aditiva y RPC guardar_tipo_documento con constraints, versión, rol y auditoría mínima; tipos de origen fijo y código estable referenciado. Semillas solo de tipos autorizados, nunca configuración ni PII inferidas de Word.

Salida verificable: Unicidad, origen inválido y cambios históricos rechazados; grants cerrados y CRUD autorizado probado.

### TASK-H6-003 — Configuración documental por Ciclo

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-003 / DES-H6-003. Dependencias: TASK-H6-002, TASK-H6-018.

Trabajo: ciclo_documento, comando guardar_documentos_ciclo y versiones. Unicidad, validación de tipo activo y efecto sobre existentes exactamente según OQ-001, sin propagación tácita.

Salida verificable: Configuración de dos Ciclos del mismo Curso independiente; guardado/carrera de matrícula coherente y auditado.

### TASK-H6-004 — Aplicación documental al registrar matrícula

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-004 / DES-H6-004. Dependencias: TASK-H6-003, TASK-H6-018.

Trabajo: matricula_documento y aplicación específica en la misma transacción de registrar_matricula; incluir TODOS los activos. Conservar firma/finanzas/cargos/código/snapshot H3/H4.

Salida verificable: Obligatorios y opcionales activos PENDIENTE; error inyectado deja cero matrícula/cargos/documentos parciales y auditoría de éxito ausente.

### TASK-H6-005 — Historia y obligatoriedad

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-005 / DES-H6-005. Dependencias: TASK-H6-004.

Trabajo: Protecciones de condiciones aplicadas, estado por origen, retiro con actor/fecha/motivo y vínculo de archivo; no DML cliente ni DELETE de historia. Reutilizar guard específico si basta.

Salida verificable: Obligatorio no retirable individualmente ni por Director; condiciones/estado imposibles rechazados y referencias históricas válidas.

### TASK-H6-006 — Retiro de opcionales individual y por selección

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-006 / DES-H6-006. Dependencias: TASK-H6-005, TASK-H6-017, TASK-H6-018.

Trabajo: RPC acotada para un Ciclo y hasta 50 seleccionados con versiones; rollback total y auditoría por afectado sin borrar archivos ni alterar configuración.

Salida verificable: Opcional PENDIENTE/CARGADO/GENERADO se retira conservando estado/versiones; lote mixto o versión obsoleta falla completamente, sin retry.

### TASK-H6-007 — Resumen derivado y faltantes

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-007 / DES-H6-007. Dependencias: TASK-H6-004, TASK-H6-017.

Trabajo: Consulta/vista invoker específica que derive aplicables/completados/pendientes y nombres faltantes; paginación estable, sin persistir COMPLETO.

Salida verificable: Cuenta también opcional activo PENDIENTE, excluye retirados y muestra cero aplicables sin división engañosa.

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

Trabajo: Tabla de versiones/reservas y RPC preparar/confirmar/abortar con grants cerrados y validación actor/contexto tras locks. No IO bajo transacción ni falsa atomicidad Storage/DB.

Salida verificable: Fallo antes/después de upload/confirmación preserva estado previo; huérfanos privados localizables, replay explícito sin segundo éxito.

### TASK-H6-012 — Versionado y reemplazos

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-012 / DES-H6-012. Dependencias: TASK-H6-010, TASK-H6-011.

Trabajo: Puntero de versión confirmada y propiedad documento/archivo; reemplazar sin upsert, UUID técnico único y confirmación idempotente del mismo resultado.

Salida verificable: Dos confirmaciones concurrentes no sobrescriben ni duplican eventos; fila vieja y bytes históricos conservados.

### TASK-H6-013 — Descarga autorizada

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-013 / DES-H6-013. Dependencias: TASK-H6-012, TASK-H6-017, TASK-H6-018, TASK-H6-021.

Trabajo: Edge expediente-descargar, lectura JWT/RLS, vínculo exacto, revalidación, entrega bytes no-store y auditoría de inicio; reglas OQ-002/004/006 resueltas.

Salida verificable: IDOR, revocación/estado cambiado durante espera, versión ajena y object_key cliente rechazados; no URL reutilizable como autoridad.

### TASK-H6-014 — Cuatro renderers institucionales

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-014 / DES-H6-014. Dependencias: TASK-H6-010, TASK-H6-012, TASK-H6-015.

Trabajo: Renderers fijos/versionados para solicitud, declaración, carta poder y ficha personal; textos/campos reales según OQ-005 y referencia adaptada, no editor.

Salida verificable: PDF institucional legible con tildes/ñ y extremos/multipágina, sin PII de muestra ni afirmación académica inventada.

### TASK-H6-015 — Fuente de datos y fingerprint

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-015 / DES-H6-015. Dependencias: TASK-H6-001, TASK-H6-004, TASK-H6-018.

Trabajo: Reutilizar proyección CHG-H5-002 y validación servidor; datos específicos solo tras OQ-005. No cambiar snapshot inicial/final, sin fallback ni hash React.

Salida verificable: Vigente/cierre correctos y cambio de alumno/contactos/contexto/plantilla entre reserva y confirmación produce PT409 sin éxito ni documento parcial.

### TASK-H6-016 — Integración persistente Ficha H5

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-016 / DES-H6-016. Dependencias: TASK-H6-012, TASK-H6-014, TASK-H6-015.

Trabajo: Compartir renderer/fuente institucional H5 y confirmar copia persistente propia; distinguir acción temporal/persistente conforme OQ-006.

Salida verificable: H5 sigue expirando a 24h y bloqueando obsoletos; H6 no depende del temporal ni copia archivo vencido a ciegas.

### TASK-H6-017 — RLS, grants y autorización

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-017 / DES-H6-017. Dependencias: TASK-H6-002, TASK-H6-003, TASK-H6-004, TASK-H6-005.

Trabajo: Matriz JWT/RLS sobre cada tabla y lectura relacionada; permisos DB en comandos; service_role limitado a Storage/confirmación/auditoría cerradas.

Salida verificable: Director/Coordinador permitidos según matriz, ADMIN solo/anon/bloqueado/revocado denegados; sin DML/Storage sensible desde React.

### TASK-H6-018 — Concurrencia y contratos de conflicto

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-018 / DES-H6-018. Dependencias: TASK-H6-001.

Trabajo: Fijar protocolo de locks, expected_updated_at y PT409 sin RAISE deliberado 40001; diseñar barreras de carreras específicas antes de comandos.

Salida verificable: Prueba de orden estable y fallos reales 40001/40P01 preservados; sin reintentos automáticos en React/SDK/Edge.

### TASK-H6-019 — Traslado y regularización de existentes

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-019 / DES-H6-019. Dependencias: TASK-H6-001, TASK-H6-003, TASK-H6-004, TASK-H6-018.

Trabajo: Solo conforme OQ-001/003 cerradas, adaptar transición de matrícula preservando relaciones/archivos/contexto anterior, nuevos pendientes y rollback. Sin tocar reglas de pagos ni cargos.

Salida verificable: Cambio de Ciclo no pierde historia ni reutiliza archivos sin decisión; existentes tratados explícitamente sin reset humano.

### TASK-H6-020 — Auditoría mínima

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-020 / DES-H6-020. Dependencias: TASK-H6-002, TASK-H6-003, TASK-H6-004, TASK-H6-006, TASK-H6-011, TASK-H6-013, TASK-H6-014.

Trabajo: Eventos específicos de operaciones confirmadas/intentos de descarga; excluir contenido/PII/keys/URLs/hashes de auditoría general.

Salida verificable: Sin auditoría de éxito en fallos; actor/IDs/correlación correctos y ningún trigger genérico de PII.

### TASK-H6-021 — Retención y operación manual

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-021 / DES-H6-021. Dependencias: TASK-H6-001, TASK-H6-011, TASK-H6-012.

Trabajo: Aplicar decisión OQ-004; documentar conciliación acotada de huérfanos, dry-run y referencias protegidas. No scheduler ni eliminación de confirmados por TTL H5.

Salida verificable: Retiro/anulación no borra bytes; cleanup nunca toca confirmado/referenciado y soporta repetición manual segura.

### TASK-H6-022 — UX de acciones y accesibilidad

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-022 / DES-H6-022. Dependencias: TASK-H6-006, TASK-H6-008, TASK-H6-010, TASK-H6-013, TASK-H6-014, TASK-H6-016.

Trabajo: Integrar carga/generación/descarga/retiro/historia, confirmaciones, errores precisos, estados busy, selección preservada, foco y temas existentes.

Salida verificable: Guardar solo ante cambios, confirmación de éxito, teclado/ancho reducido y forced-colors real registrado como ejecutado o NO VERIFICADO sin inventar.

### TASK-H6-023 — Regresión y pruebas de integración/seguridad

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-023 / DES-H6-023. Dependencias: TASK-H6-006, TASK-H6-007, TASK-H6-008, TASK-H6-012, TASK-H6-013, TASK-H6-014, TASK-H6-016, TASK-H6-019, TASK-H6-020, TASK-H6-021, TASK-H6-022.

Trabajo: Ejecutar plan H6 y suites H1–H5 progresivas; contratos PostgREST, Edge/Storage, rollback/carreras/expiración/rebuild/build-safety; fixture sintético y PII fuera de logs.

Salida verificable: Resultados exactos y riesgos documentados, 70+60 saldo100 y cierre H5 intactos; revisión humana de formatos pendiente de reporte real.

### TASK-H6-024 — Inventario, costos y candidato técnico

Estado: **PLANIFICADA / NO INICIADA**. Trazabilidad: REQ-H6-024 / DES-H6-024. Dependencias: TASK-H6-023.

Trabajo: Revisar inventario real contra DES-024; medir latencia/bytes/CPU/memoria si disponibles, estimar costos con supuestos y publicar evidencia. Sin ampliar arquitectura por dificultad.

Salida verificable: SHA/CI/inventario/mediciones reales y residuales; entregar para revisión humana, sin acceptance/Gate 2/merge automáticos.

## Bloques razonables de construcción futura

- Gate 1/OQ y contratos de concurrencia; maestro/configuración/aplicación con seguridad desde inicio.
- Protección de historia, retiro y resumen; RLS/grants reales y rollback inicial de matrícula.
- Storage/reserva/carga/versiones/retención y descarga; fallos por etapa y carreras antes de UI final.
- Fuente/renderers fijos y copia H5 persistente; contenido mínimo/extenso, privacidad y regresión de cierre.
- UX integrada/accesibilidad, regresión integral, inventario y candidato para revisión humana.

Validación progresiva por bloque: lint/typecheck/unidades y pruebas reales pertinentes. Repetir/broaden solo tras cambios/fallos/concern concreto. Rebuild completo/expiración/regresión H1–H5 al final técnico, sin reset humano. Las pruebas humanas H6 corresponden a los nuevos formatos/flujo de expediente, no a repetir la aprobación H5 ya aceptada.

## Entrega de esta fase

Publicar solo los cuatro documentos y sus comprobaciones documentales/CI. Informar SHA base main, rama/Spec SHA y OQ reales. **Sin Gate 1 H6, código, migraciones, tablas, buckets, Edge, acceptance ni PR/merge H6.** Las tareas técnicas, evidencias y mediciones siguen pendientes.
