# H6 — Expediente y documentos institucionales: requirements

Fecha: 18/11/2026 (America/Lima). **DRAFT / Gate 1 H6 PENDIENTE. Construcción NO AUTORIZADA.**
Rama: `feature/h6-expediente-spec`. Base exacta de main: `1228a028fc203e0319340b5b55d7d9aa99802760`, merge [PR #3 H5](https://github.com/fcamasca/perumar-supabase/pull/3). CI main [44381503820](https://github.com/fcamasca/perumar-supabase/actions/runs/44381503820) SUCCESS antes de crear la rama. H5 [CLOSED / ACEPTADO / INTEGRADO](../H5-enrollment-pdf/acceptance.md), candidato final `a19520a1733dca53b38bfe1463d0473304c88d86`, 440/440; cierre `1551538f1fdd190a4a70da402883734c40ff30f1`, CI `44379188039` SUCCESS. [GATE-A01 APROBADO CON AJUSTES](../../architecture/GATE-A01-continuidad-supabase.md).

Esta entrega contiene exclusivamente requirements.md, design.md, tasks.md y test-plan.md. No implementa código/SQL/React/Edge, tablas, buckets, Storage, migraciones ni dependencias H6. Todos los TEST-H6 están **NO EJECUTADOS**. Las decisiones humanas OQ-H6-001 a 006 quedan RESUELTAS en esta revisión sobre la base `cff11ab339ca9dc4ec32283631c7fb68f57d59a3`. El diseño técnico aún se somete a Gate 1, que sigue PENDIENTE; resolver OQ no autoriza construcción. No se crea acceptance ni Gate 1 automático.

## Decisiones humanas ya cerradas

Modelo propio `tipo_documento → ciclo_documento → matricula_documento`, sin catalogo_valor documental; orígenes SUBIDO/GENERADO; configuración por Ciclo. TODOS los activos se aplican inicialmente, obligatorios y opcionales; opcional activo PENDIENTE cuenta como faltante. Obligatorio no retirable individualmente; la condición/aplicabilidad efectiva se sincroniza transaccionalmente desde el Ciclo conforme a OQ-H6-001. Director/Coordinador retiran opcionales a uno o varios alumnos conservando estado, archivos e historia. Estados únicamente PENDIENTE/CARGADO o PENDIENTE/GENERADO; activo independiente. Completitud derivada. Metadatos DB y bytes persistentes en Supabase Storage privado, object_key servidor sin PII, no URL como identidad. Cuatro formatos institucionales, sin editor genérico ni S3. No reabrir estas decisiones en las OQ.

## Referencia funcional y límites

`Expediente Perú Mar Nuevos.docx` se encuentra localmente en docs/usuario (archivo del usuario ignorado, no se incorpora al repositorio). Se inspeccionó su contenido OOXML: ficha de matrícula H5, Solicitud de inscripción y obtención de Libreta de Embarco / Carné, Declaración jurada, Carta poder y Ficha de datos personales. Sus personas, DI, domicilios, apoderado, fechas, resoluciones y afirmaciones académicas de ejemplo no son semillas ni datos de producción ni acreditación legal vigente. No hay fuentes externas de universidades ni se copia PII a Spec/tests.

El renderer de referencia no pudo ejecutarse por ausencia local de pdf2image: **revisión visual de ese Word NO EJECUTADA en esta preparación**. No se alteró el archivo ni instalaron dependencias. La adaptación visual/textual de los cuatro formatos se revisará con datos sintéticos durante construcción y revisión humana H6, sin repetir Gate 2 H5. OQ-H6-005 RESUELTA fija datos/fechas y prohíbe inventar contenido o datos de negocio para completar huecos.

## Requisitos

### REQ-H6-001 — Alcance y gates

Preparar H6 — Expediente y documentos institucionales: documentos SUBIDOS y GENERADOS por matrícula. Este Spec es DRAFT; Gate 1 PENDIENTE, construcción NO AUTORIZADA. No crear tablas, migraciones, buckets, Edge, React, dependencias ni código en esta entrega. Mantener H1–H5 y GATE-A01 como base, no reescribir sus Specs.

### REQ-H6-002 — Maestro documental propio

tipo_documento es un maestro propio con id, codigo, nombre, descripcion, origen SUBIDO/GENERADO, activo y timestamps. No usar catalogo_valor para documentos. Código único normalizado; origen y código quedan estables al ser referenciados. Inactivar no elimina ni invalida por sí solo documentos históricos; nuevas aplicaciones requieren tipo activo.

### REQ-H6-003 — Configuración por Ciclo

ciclo_documento vincula Ciclo y tipo_documento, obligatorio y activo. La configuración del Ciclo es fuente efectiva para nuevas matrículas y para matrículas ACTIVO ya existentes. Guardar configuración sincroniza explícitamente en la misma transacción DB: alta activa se aplica; reactivación se vuelve a aplicar; desactivación deja de hacer aplicable conservando registro/estado/archivos; cambio obligatorio/opcional actualiza la condición de las aplicaciones del contexto actual. Un opcional retirado individualmente que pasa a obligatorio vuelve a activo/aplicable conservando estado y archivo. No borrar historia ni ejecutar backfill en background. La regularización inicial de matrículas preexistentes es una operación explícita por Ciclo, auditada y transaccional (OQ-H6-001 RESUELTA).

### REQ-H6-004 — Aplicación inicial completa y atómica

Al registrar una matrícula aplicar TODOS los ciclo_documento activos, obligatorios y opcionales, creando aplicaciones del contexto actual activas y PENDIENTE. No aceptar selección inicial de opcionales desde React. Matrícula/cargos/snapshot/documentos se confirman en la misma transacción; un fallo revierte todo. Cero configuración produce cero aplicables, sin barrera nueva para matricular. En guardar configuración y regularizar existentes se crean las aplicaciones faltantes del contexto actual, se actualizan/reactivan las correspondientes sin duplicarlas y se conservan sus estados/archivos previos; solo una aplicación nueva nace PENDIENTE. No tocar aplicaciones de contextos históricos ni matrículas ANULADO.

### REQ-H6-005 — Obligatorios protegidos

Todo documento obligatorio aplicable permanece activo y no puede retirarse individualmente, ni por Director. La obligatoriedad efectiva sí se actualiza mediante la sincronización transaccional de configuración del Ciclo autorizada en OQ-H6-001; no es un snapshot inmutable. Si un opcional retirado pasa a obligatorio, vuelve a aplicable preservando estado/archivo. Desactivación de configuración y traslado pueden dejar históricas/inactivas aplicaciones obligatorias como cambio de contexto, no como retiro individual. Conservar auditoría de condiciones anteriores. PENDIENTE no bloquea pagos, matrícula ni cierre H3 por una regla nueva.

### REQ-H6-006 — Retiro opcional individual y múltiple

Director Académico o Coordinador Académico pueden retirar un opcional para una o varias matrículas seleccionadas bajo la matriz general de OQ-H6-002. Establecer activo=false conserva estado, archivo, versiones, motivo/actor/fecha e historia, incluso CARGADO/GENERADO. No alterar configuración del Ciclo ni borrar registro/bytes. Lote atómico con validación DB de cada fila, contexto, condición y versión; conflicto explícito si una sincronización concurrente lo hizo obligatorio. Guardar otra configuración sin cambios de aplicabilidad no deshace un retiro individual; una reactivación de configuración o conversión a obligatorio sí sigue las reglas explícitas de sincronización.

### REQ-H6-007 — Estados y completitud derivados

SUBIDO solo PENDIENTE/CARGADO; GENERADO solo PENDIENTE/GENERADO. No VALIDADO, IMPRESO ni OBSOLETO de negocio. No persistir COMPLETO/INCOMPLETO. En el contexto actual, aplicables cuenta activo=true; completados cuenta activos CARGADO/GENERADO; pendientes cuenta activos PENDIENTE incluidos opcionales. Contextos anteriores y retirados no cuentan. Un generado desactualizado conserva GENERADO y no se convierte en faltante: mostrar diagnóstico de versión histórica/desactualizada separado del estado y de los conteos. Cero aplicables: Sin documentos aplicables y cero pendientes.

### REQ-H6-008 — Expediente individual y visión por Ciclo

Mostrar por matrícula/alumno aplicables, completados, pendientes y nombres de faltantes; por Ciclo grilla Alumno | Aplicables | Pendientes | Estado derivado. Mantener documento/expediente referido a matrícula, no expediente único compartido entre matrículas del mismo alumno. Búsqueda por apellidos, nombres y DI y grillas compactas con acciones autorizadas a la derecha, coherentes con H3/H4.

### REQ-H6-009 — Storage privado e identidad de archivo

PostgreSQL almacena relaciones/metadatos, Supabase Storage privado persistente almacena bytes. No binarios DB, URLs públicas, URLs firmadas/permanentes como identidad ni nombres personales en paths. object_key y UUID se generan exclusivamente en servidor. No S3 ni StorageProvider genérico. Identidad de dominio independiente de URL del proveedor; un archivo solo pertenece al documento/matrícula autorizado.

### REQ-H6-010 — Carga controlada y contenido real

Permitir inicialmente PDF, JPEG y PNG sujeto a los límites técnicos propuestos de DES-H6-010. Validar autenticación, autorización, origen documental, tamaño real acotado, extensión/MIME coherentes, firma y parseo/decodificación real; no confiar en Content-Type/nombre cliente. Rechazar HTML/SVG, ejecutables, ZIP, PDF cifrado o con contenido activo/adjuntos y archivos corruptos/no verificables. No afirmar garantía antivirus por hash o magic bytes; riesgo y capacidad del parser visibles ante Gate 1.

### REQ-H6-011 — Confirmación y consistencia DB/Storage

Carga/generación solo cambia el estado documental al confirmar metadatos y archivo válidos en DB. No fingir transacción distribuida entre Storage y PostgreSQL. Usar reserva técnica acotada y confirmación específica con revalidación; en fallo no marcar CARGADO/GENERADO ni emitir éxito. Si se escribió objeto y falla confirmación, compensar o conservar huérfano privado identificable para limpieza manual. Respuesta incierta se consulta por identificador; sin retry automático ni duplicación silenciosa.

### REQ-H6-012 — Metadatos y versiones inmutables

Por archivo confirmado registrar SHA-256 servidor, bytes, MIME verificado, object_key, actor/fecha y para generados versión de plantilla, huella y fecha real de generación. Nombre original solo saneado si es necesario, nunca en keys/logs. Cada carga/reemplazo/generación crea versión inmutable sin sobrescribir bytes; el vínculo a la última versión confirmada no afirma por sí solo vigencia de fuente. Versiones reemplazadas, retiradas, de contexto anterior y de matrícula anulada siguen en Historia autorizada. Datos de apoderado de Carta Poder se proporcionan explícitamente en cada generación y quedan ligados a esa versión, no inferidos de contactos ni reutilizados automáticamente.

### REQ-H6-013 — Descarga y privacidad

Director/Coordinador pueden consultar y descargar archivos CONFIRMADO autorizados: versión actual, reemplazadas, documentos retirados, contextos históricos y matrícula anulada, incluso cuando el estado académico bloquea nuevas mutaciones. No bloquear una descarga histórica solo porque la matrícula sea ANULADO o el Ciclo DESIERTO/ANULADO. Mantener JWT, rol activo y vínculo exacto documento/matrícula/archivo para evitar IDOR. Entregar bytes con private,no-store y nombre seguro, sin URL pública ni capacidades largas. Revalidar autorización tras esperas; si entretanto cambia el contexto, ofrecerlo/entregarlo claramente como Historia, nunca presentarlo como actual. service_role no autoriza por sí solo al usuario.

### REQ-H6-014 — Formatos institucionales fijos

Contemplar Solicitud de inscripción y obtención de Libreta de Embarco / Carné, Declaración jurada, Carta poder y Ficha de datos personales mediante renderers fijos/versionados, compartiendo utilidades H5 sin motor editable. Misma matriz de mutación para todos: matrícula ACTIVO y Ciclo PROGRAMADO/EN_CURSO/CERRADO; la Solicitud NO requiere CERRADO. Mantener el texto institucional aprobado/referencial sin inferir resultado académico desde el Ciclo: H6 no incorpora aprobado/desaprobado, nota ni equivalentes. No inventar afirmaciones legales/académicas ni importar ejemplos del Word. Ajustes visuales/textuales institucionales durante revisión humana H6 sin editor genérico. Español, blancos no obligatorios y multipágina legible sin recortes.

### REQ-H6-015 — Fuente y datos específicos de generados

Para H6, fecha del documento = fecha real de generación servidor en America/Lima; edad requerida se calcula a esa fecha desde fecha_nacimiento de la fuente autorizada. Reutilizar CHG-H5-002 para datos personales/contactos/etiquetas: vigentes en PROGRAMADO/EN_CURSO, exclusivamente snapshot de cierre en CERRADO; no modificar ni usar fallback a snapshots inicial/final. Contexto actual autorizado al emitir. Carta Poder exige apoderado explícito por generación, nunca contacto inferido; datos no existentes y no obligatorios quedan en blanco. No importar personas/DI/direcciones/resoluciones/fechas del Word. Separar fecha del documento de campos de negocio como fecha de matrícula, que no se reescriben. El contrato temporal H5 conserva su fecha/edad históricas; su copia persistente H6 aplica el perfil de fecha/edad H6 con renderer compartido, sin cambiar la ruta H5 aceptada.

### REQ-H6-016 — Integración persistente de Ficha H5

Ficha de Matrícula se configura como GENERADO y produce copia persistente H6 propia, con renderer/fuente y reglas CHG-H5-002 compartidos; no copiar a ciegas el temporal, depender de su bucket/TTL ni duplicar lógica. H5 temporal conserva contrato, vencimiento de 24h y bloqueo de artefacto obsoleto. H6 no hereda ese bloqueo de descarga histórica: si fuente/contexto/plantilla cambian, conserva GENERADO, bytes e historia, pero la versión deja de ser actual y solo se ofrece identificada como histórica/desactualizada. Regeneración explícita para versión actual. No estado OBSOLETO ni regeneración automática. Perfil fijo H6 de fecha/edad según REQ-015, separado del contrato H5.

### REQ-H6-017 — Autorización y RLS

Roles funcionales autorizados: DIRECTOR_ACADEMICO y COORDINADOR_ACADEMICO. ADMIN_SISTEMA solo no accede a expedientes/bytes. Carga, generación, reemplazo/regeneración y retiro opcional requieren matrícula ACTIVO y Ciclo PROGRAMADO/EN_CURSO/CERRADO; bloquear nuevas mutaciones con matrícula ANULADO o Ciclo DESIERTO/ANULADO. Consulta/descarga histórica autorizadas continúan en esos estados. Regla uniforme para tipos, respetando solo la operación propia del origen SUBIDO/GENERADO; no condicionar Solicitud a CERRADO ni a aprobado. Roles DB y sesión confirmada, RLS por tabla/vista, sin DML sensible ni Storage directo desde React y sin service_role cliente.

### REQ-H6-018 — Concurrencia, locks y conflictos

Conservar locks H3/H4/H5: Ciclo(s) UUID → Alumno(s) UUID → Matrícula(s) UUID → configuración/documentos/archivos en orden estable. Guardar configuración bloquea el Ciclo y todas las matrículas ACTIVO afectadas y sincroniza todo en UNA transacción, sin partir el lote ni mandar trabajo a background. Verificar versión de configuración y filas esperadas, además del contexto del Ciclo; detectar altas/filas ajenas al conjunto esperado. Tras esperar, revalidar rol, estado, contexto, obligatoriedad, fuente y versión. PT409/HTTP409 lógicos; 40001/40P01 reales visibles, sin retries ocultos ni pérdida de borrador. La descarga histórica revalida acceso, no exige estado apto para nuevas mutaciones.

### REQ-H6-019 — Estados académicos, traslado y existentes

Al trasladar, todas las aplicaciones del contexto anterior quedan históricas/inactivas por TRASLADO, conservando estado, archivos, versiones y auditoría, sin borrar/mover bytes. Crear nuevo contexto en destino y aplicar TODOS sus documentos activos como activos/PENDIENTE, sin reutilización automática de archivos. Si regresa, otro contexto/aplicaciones nuevos: nunca reactivar la aplicación histórica. Preservar restricciones financieras H4 y rollback del traslado completo; no relajar bloqueos por pagos. Regularizar matrículas ACTIVO preexistentes de un Ciclo explícitamente, con autorización/versiones, auditoría y transacción; no reset humano ni backfill silencioso.

### REQ-H6-020 — Auditoría mínima

Auditar maestro/configuración, sincronización efectiva, regularización, aplicación, cambio de obligatoriedad/reactivación, retiro opcional, traslado, reserva/confirmación y descarga iniciada. IDs/actor/fecha/correlación/versiones y cambios de flags/motivo codificado necesarios; conservar historia de condiciones sin copiar PII ni contenido/snapshots/filename/keys/JWT/URLs o apoderado. Éxito de sincronización/negocio y auditoría atómicos. No trigger genérico de PII. Descarga iniciada no acredita recepción ni impresión.

### REQ-H6-021 — Retención y operación

RESUELTA PARA MVP: todo archivo CONFIRMADO H6 es persistente, sin TTL de24h, eliminación por retiro/anulación/cierre ni purga funcional de confirmados. Director/Coordinador acceden a versiones actuales, reemplazadas, retiradas, contextos históricos y matrícula anulada según autorización, con etiquetas claras. Solo limpieza técnica manual y acotada de reservas/objetos NUNCA confirmados. La política institucional/legal de eliminación definitiva queda pendiente para H9/release, no como OQ H6 abierta ni bloqueo del Spec. Conservar los seis residuales de GATE-A01; sin scheduler/colas/S3 adicionales.

### REQ-H6-022 — UX consistente y accesible

Pestañas y grillas existentes: Ciclo Documentos para configuración, resumen de expedientes en Matrículas, detalle Documentos por matrícula. Carga, Generar, Descargar e Historia según origen/permiso/estado, menú Más acciones para retiro no principal y confirmación clara individual/múltiple. Separar selección de alumnos de selección de archivos; no subir ni generar masivamente en esta fase. Guardar solo con cambios y éxito visible; borrador intacto ante error; teclado/foco y temas Sistema/Claro/Oscuro/Alto contraste con prioridad forced-colors, sin darlo por probado.

### REQ-H6-023 — Calidad y regresión proporcional

Probar contratos DB/API/Edge/Storage, límites, fallos intermedios, rollback, autorización, IDOR, carreras, no retry, versión e inmutabilidad; contenido/paginación y revisión humana de cuatro formatos, más integración H5. Regresión H1–H5 y 70+60 sobre saldo100 sin sobrepago. Fixtures sintéticos sin PII del usuario, reset solo CI desechable. Ninguna prueba H6 ejecutada en fase Spec.

### REQ-H6-024 — Arquitectura, inventario y costos

Continuar React/TS + Supabase Auth/PostgreSQL/RLS/RPC + Edge acotadas + Storage privado. Justificar cada tabla/helper/comando con requisito; no API adicional, motor documental/editor, OCR, firma electrónica/biometría, antivirus externo/colas, microservicios o S3 por defecto. Estimar volumen/egress/retención con supuestos, medir recursos al construir y revisar límites; no usar éxito local como prueba hospedada. Conservar seis residuales H5/GATE-A01 y gates humanos separados.

## Fuera de alcance

Implementación en esta rama; S3/AWS/WebFlux/API Node/Lambda/colas/microservicios/Kubernetes; StorageProvider multicloud; motor/editor de plantillas; OCR, validación académica nueva, firma electrónica, captura biométrica, estados VALIDADO/IMPRESO, antivirus externo/CDR como infraestructura nueva sin autorización; publicación pública de documentos, importación masiva de expedientes, cargas/generaciones ZIP por lote, pagos/facturación H7+, portal alumno y notificaciones. El retiro opcional por selección múltiple sí está incluido, no implica carga/generación masiva.

## OQ resueltas por decisión humana

OQ-H6-001 a OQ-H6-006: **RESUELTAS HUMANAMENTE el 18/11/2026**, sobre el Spec base `cff11ab339ca9dc4ec32283631c7fb68f57d59a3`. Sustituyen las propuestas iniciales incompatibles; no equivalen a Gate 1 ni autorización de construcción. Sin nuevas OQ.

### OQ-H6-001 — Configuración posterior y matrículas existentes

**RESUELTA.** La configuración del Ciclo también es efectiva para matrículas ACTIVO existentes. Guardar sincroniza explícita y transaccionalmente altas activas, reactivaciones, desactivaciones y cambios obligatorio/opcional. El opcional retirado que pasa a obligatorio vuelve activo, conservando estado/archivo. Nunca borrar historia ni ejecutar backfill de background. Regularización inicial explícita por Ciclo, auditada y transaccional. REQ-H6-003/004/005/018/019; TASK-H6-003/004/005/019; TEST-H6-004/005/007/038/039/042/051.

### OQ-H6-002 — Permisos y estados

**RESUELTA.** Director y Coordinador; ADMIN solo sin acceso. Mutaciones del expediente (carga/generación/reemplazo/regeneración/retiro opcional) con matrícula ACTIVO y Ciclo PROGRAMADO/EN_CURSO/CERRADO. Bloquearlas con ANULADO o Ciclo DESIERTO/ANULADO, conservando historia. Consulta y descarga históricas autorizadas siguen permitidas. Matriz común por tipo; solo distinguir operación SUBIDO/GENERADO, no permisos académicos específicos por formato. Sin resultado académico. REQ-H6-006/013/014/017; TASK-H6-006/013/014/017; TEST-H6-024/025/034/044/058.

### OQ-H6-003 — Traslado y regreso

**RESUELTA.** Contexto anterior histórico/inactivo por TRASLADO, con estados/bytes/versiones/auditoría intactos. Aplicar todos los activos del destino en contexto nuevo y PENDIENTE, sin reutilizar bytes. Al regresar, crear contexto/aplicación nuevos, no reactivar históricos. H4 sigue restringiendo traslado por pagos. REQ-H6-004/005/018/019; TASK-H6-004/005/018/019; TEST-H6-038/040/041/049.

### OQ-H6-004 — Retención, historia y baja física

**RESUELTA PARA MVP.** Confirmados persistentes; sin TTL24h, eliminación automática por retiro/anulación/cierre ni purga funcional H6. Director/Coordinador descargan actuales/reemplazados/retirados/contextos históricos/matrícula anulada según autorización, identificados en UI. Solo limpieza manual acotada de objetos/reservas nunca confirmados. Política institucional/legal de eliminación definitiva pendiente para H9/release. REQ-H6-012/013/021; TASK-H6-012/013/021; TEST-H6-020/023/024/044/045/059.

### OQ-H6-005 — Textos, datos y fechas

**RESUELTA PARA MVP.** Generados con la misma matriz general, incluida Solicitud en PROGRAMADO/EN_CURSO/CERRADO; sin aprobado/desaprobado/nota/condición equivalente. Resultado académico queda como evolución futura, no requisito H6. Mantener texto institucional aprobado/referencial sin inferir resultado desde Ciclo ni inventar afirmaciones legales/académicas. Fecha del documento = generación real en America/Lima y edad a esa fecha. Apoderado explícito para cada Carta Poder, nunca inferido de contacto; datos no existentes/no obligatorios en blanco. No importar ejemplos del Word. Ajustes visuales institucionales en revisión humana H6, sin motor editable. REQ-H6-014/015/016; TASK-H6-014/015/016; TEST-H6-025/026/027/028/030/054/055/057.

### OQ-H6-006 — Vigencia de persistentes e integración H5

**RESUELTA.** Cada generación confirmada es versión inmutable. Cambio de fuente/contexto/plantilla conserva GENERADO/bytes/historia, pero quita consideración de actual; descargable en Historia como histórica/desactualizada. Sin estado OBSOLETO. Regeneración explícita para versión actual. Ficha de Matrícula H6 es GENERADO, objeto persistente propio con renderer/fuente/CHG-H5-002 compartidos, sin copia ciega del temporal, dependencia de TTL/bucket ni alteración de contrato temporal H5. REQ-H6-007/012/013/015/016; TASK-H6-012/013/015/016; TEST-H6-020/029/031/032/033/055.

## Residuales y criterios de aceptación

Preservar seis residuales H5/GATE-A01: Hosted Edge/PostgREST 14 NO PROBADO DIRECTAMENTE, CPU y memoria NO MEDIDAS, forced-colors H5 NO VERIFICADO, bundle >500 kB y limpieza física H5 manual. No son PASSED H6 ni se cierran con este Spec. Nuevos riesgos: validación de archivos no equivale a garantía antimalware; consistencia DB/Storage requiere protocolo de compensación; retención/costo persistente y textos/datos por formato siguen las seis decisiones resueltas; su implementación y evidencia continúan pendientes. La eliminación definitiva institucional/legal se resolverá antes de H9/release. Los relevantes para producción deberán resolverse o aceptarse antes de H9/release.

Gate 1 exige revisión humana del modelo/diseño, OQ resueltas y aceptación del plan de pruebas. La entrega técnica futura exige trazabilidad REQ/DES/TASK/TEST, pruebas progresivas y candidaturas exactas; Gate 2 y acceptance solo con autorización humana posterior. No cerrar H6 por CI verde ni afirmar ejecución humana de subcasos no reportados.
