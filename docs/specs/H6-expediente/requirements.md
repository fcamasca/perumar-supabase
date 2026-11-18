# H6 — Expediente y documentos institucionales: requirements

Fecha: 18/11/2026 (America/Lima). **DRAFT / Gate 1 H6 PENDIENTE. Construcción NO AUTORIZADA.**
Rama: `feature/h6-expediente-spec`. Base exacta de main: `1228a028fc203e0319340b5b55d7d9aa99802760`, merge [PR #3 H5](https://github.com/fcamasca/perumar-supabase/pull/3). CI main [44381503820](https://github.com/fcamasca/perumar-supabase/actions/runs/44381503820) SUCCESS antes de crear la rama. H5 [CLOSED / ACEPTADO / INTEGRADO](../H5-enrollment-pdf/acceptance.md), candidato final `a19520a1733dca53b38bfe1463d0473304c88d86`, 440/440; cierre `1551538f1fdd190a4a70da402883734c40ff30f1`, CI `44379188039` SUCCESS. [GATE-A01 APROBADO CON AJUSTES](../../architecture/GATE-A01-continuidad-supabase.md).

Esta entrega contiene exclusivamente requirements.md, design.md, tasks.md y test-plan.md. No implementa código/SQL/React/Edge, tablas, buckets, Storage, migraciones ni dependencias H6. Todos los TEST-H6 están **NO EJECUTADOS**. Las propuestas técnicas se someten a Gate 1; las OQ no equivalen a decisiones aprobadas. No se crea acceptance ni Gate 1 automático.

## Decisiones humanas ya cerradas

Modelo propio `tipo_documento → ciclo_documento → matricula_documento`, sin catalogo_valor documental; orígenes SUBIDO/GENERADO; configuración por Ciclo. TODOS los activos se aplican inicialmente, obligatorios y opcionales; opcional activo PENDIENTE cuenta como faltante. Obligatorio no retirable individualmente; Director/Coordinador retiran opcionales a uno o varios alumnos conservando estado, archivos e historia. Estados únicamente PENDIENTE/CARGADO o PENDIENTE/GENERADO; activo independiente. Completitud derivada. Metadatos DB y bytes persistentes en Supabase Storage privado, object_key servidor sin PII, no URL como identidad. Cuatro formatos institucionales, sin editor genérico ni S3. No reabrir estas decisiones en las OQ.

## Referencia funcional y límites

`Expediente Perú Mar Nuevos.docx` se encuentra localmente en docs/usuario (archivo del usuario ignorado, no se incorpora al repositorio). Se inspeccionó su contenido OOXML: ficha de matrícula H5, Solicitud de inscripción y obtención de Libreta de Embarco / Carné, Declaración jurada, Carta poder y Ficha de datos personales. Sus personas, DI, domicilios, apoderado, fechas, resoluciones y afirmaciones académicas de ejemplo no son semillas ni datos de producción ni acreditación legal vigente. No hay fuentes externas de universidades ni se copia PII a Spec/tests.

El renderer de referencia no pudo ejecutarse por ausencia local de pdf2image: **revisión visual de ese Word NO EJECUTADA en esta preparación**. No se alteró el archivo ni instalaron dependencias. La adaptación visual/textual de los cuatro formatos se revisará con datos sintéticos durante construcción y revisión humana H6, sin repetir Gate 2 H5. OQ-005 impide inventar contenido o datos de negocio para completar huecos.

## Requisitos

### REQ-H6-001 — Alcance y gates

Preparar H6 — Expediente y documentos institucionales: documentos SUBIDOS y GENERADOS por matrícula. Este Spec es DRAFT; Gate 1 PENDIENTE, construcción NO AUTORIZADA. No crear tablas, migraciones, buckets, Edge, React, dependencias ni código en esta entrega. Mantener H1–H5 y GATE-A01 como base, no reescribir sus Specs.

### REQ-H6-002 — Maestro documental propio

tipo_documento es un maestro propio con id, codigo, nombre, descripcion, origen SUBIDO/GENERADO, activo y timestamps. No usar catalogo_valor para documentos. Código único normalizado; origen y código quedan estables al ser referenciados. Inactivar no elimina ni invalida por sí solo documentos históricos; nuevas aplicaciones requieren tipo activo.

### REQ-H6-003 — Configuración por Ciclo

ciclo_documento vincula Ciclo y tipo_documento, obligatorio y activo. La configuración efectiva pertenece al Ciclo, no al Curso. Evitar duplicados de tipo dentro del mismo Ciclo. Conservar historia de configuración. No trasladar cambios de un expediente individual a la configuración. Efectos sobre matrículas existentes sujetos a OQ-H6-001.

### REQ-H6-004 — Aplicación inicial completa y atómica

Al registrar una matrícula aplicar TODOS los ciclo_documento activos, tanto obligatorios como opcionales, creando matricula_documento activo y PENDIENTE. No aceptar selección inicial de opcionales desde React. Matrícula/cargos/snapshot/documentos se confirman en la misma transacción DB; un fallo revierte todo. Cero documentos configurados produce cero aplicables, sin impedir la matrícula salvo decisión posterior explícita.

### REQ-H6-005 — Obligatorios protegidos

Un documento aplicado como obligatorio nace activo y no puede retirarse individualmente, ni siquiera por Director. La condición aplicada no puede alterarse desde React o por cambiar silenciosamente la configuración. Tenerlo PENDIENTE indica faltante, no bloquea pagos, matrícula ni cierre H3 por una regla nueva implícita.

### REQ-H6-006 — Retiro opcional individual y múltiple

Director Académico o Coordinador Académico pueden retirar un opcional para una o varias matrículas seleccionadas. Retirar establece activo=false y conserva estado previo, archivo, versiones, actor, fecha, motivo e historia. Funciona también con CARGADO/GENERADO. Prohibir DELETE funcional y no borrar bytes automáticamente. Validación DB para cada fila y autorización/contexto actuales, con lote atómico y conflictos explícitos.

### REQ-H6-007 — Estados y completitud derivados

SUBIDO admite solo PENDIENTE/CARGADO; GENERADO solo PENDIENTE/GENERADO. No VALIDADO ni IMPRESO. No persistir COMPLETO/INCOMPLETO. Faltante equivale a activo=true y estado=PENDIENTE, incluidos opcionales. Aplicables cuenta activos; completados cuenta activos CARGADO/GENERADO; pendientes cuenta activos PENDIENTE. Un retirado no cuenta aunque conserve archivo/estado. Con cero aplicables mostrar Sin documentos aplicables, con cero pendientes.

### REQ-H6-008 — Expediente individual y visión por Ciclo

Mostrar por matrícula/alumno aplicables, completados, pendientes y nombres de faltantes; por Ciclo grilla Alumno | Aplicables | Pendientes | Estado derivado. Mantener documento/expediente referido a matrícula, no expediente único compartido entre matrículas del mismo alumno. Búsqueda por apellidos, nombres y DI y grillas compactas con acciones autorizadas a la derecha, coherentes con H3/H4.

### REQ-H6-009 — Storage privado e identidad de archivo

PostgreSQL almacena relaciones/metadatos, Supabase Storage privado persistente almacena bytes. No binarios DB, URLs públicas, URLs firmadas/permanentes como identidad ni nombres personales en paths. object_key y UUID se generan exclusivamente en servidor. No S3 ni StorageProvider genérico. Identidad de dominio independiente de URL del proveedor; un archivo solo pertenece al documento/matrícula autorizado.

### REQ-H6-010 — Carga controlada y contenido real

Permitir inicialmente PDF, JPEG y PNG sujeto a los límites técnicos propuestos de DES-H6-010. Validar autenticación, autorización, origen documental, tamaño real acotado, extensión/MIME coherentes, firma y parseo/decodificación real; no confiar en Content-Type/nombre cliente. Rechazar HTML/SVG, ejecutables, ZIP, PDF cifrado o con contenido activo/adjuntos y archivos corruptos/no verificables. No afirmar garantía antivirus por hash o magic bytes; riesgo y capacidad del parser visibles ante Gate 1.

### REQ-H6-011 — Confirmación y consistencia DB/Storage

Carga/generación solo cambia el estado documental al confirmar metadatos y archivo válidos en DB. No fingir transacción distribuida entre Storage y PostgreSQL. Usar reserva técnica acotada y confirmación específica con revalidación; en fallo no marcar CARGADO/GENERADO ni emitir éxito. Si se escribió objeto y falla confirmación, compensar o conservar huérfano privado identificable para limpieza manual. Respuesta incierta se consulta por identificador; sin retry automático ni duplicación silenciosa.

### REQ-H6-012 — Metadatos y versiones inmutables

Registrar por archivo SHA-256 servidor, bytes, MIME verificado, object_key, actor/fecha y, para generados, versión de plantilla y huella de fuente. Nombre original opcional saneado solo si necesario, nunca en object_key/logs. Reemplazar/regenerar crea nueva versión y conserva la anterior, sin sobrescribir bytes. Solo una versión vigente por documento, confirmada por DB. Retiro funcional no borra versiones.

### REQ-H6-013 — Descarga y privacidad

Descargar solo mediante verificación JWT y autorización/contexto server-side del archivo exacto y su vínculo a la matrícula; proteger IDOR de documento, archivo y key. La posesión de UUID no autoriza. Proponer entrega de bytes con Cache-Control private,no-store y Content-Disposition seguro; sin URLs públicas ni capacidades de larga duración. Revalidar tras esperas y antes de entrega. Las reglas de estados/historia por confirmar están en OQ-H6-002/004/006.

### REQ-H6-014 — Formatos institucionales fijos

Contemplar Solicitud de inscripción y obtención de Libreta de Embarco / Carné, Declaración jurada, Carta poder y Ficha de datos personales. Evaluar renderers fijos/versionados con pdf-lib, reutilizando componentes de H5 sin crear motor editable. Cada resultado se asocia a matricula_documento. Español completo, campos largos, blanco explícito para datos ausentes y paginación legible sin recortes. Fuente Word local solo referencia: no semillas de personas, apoderados, fechas o resoluciones de ejemplo.

### REQ-H6-015 — Fuente y datos específicos de generados

Propuesta mínima: reutilizar proyección autorizada y regla CHG-H5-002 (vigente en PROGRAMADO/EN_CURSO, snapshot final exclusivo en CERRADO), fuente de contexto e impresión explícitas por plantilla. No modificar alumno_snapshot inicial ni snapshot de cierre. Declaraciones, fecha/edad, apoderado, tratamiento/Capitanía y afirmación de haber aprobado el Curso requieren resolución OQ-H6-005; no inferir aprobación académica desde CERRADO ni usar un contacto como apoderado automáticamente.

### REQ-H6-016 — Integración persistente de Ficha H5

Evaluar registrar Ficha de Matrícula como tipo GENERADO y usar renderer/fuente/fingerprint de H5 para producir una copia persistente H6, sin duplicar reglas ni reutilizar como permanente el bucket temporal. H5 mantiene TTL 24h y bloqueo de fuente obsoleta. No promover artefactos viejos/temporales por copia ciega; generar y confirmar bajo autorización actual. OQ-H6-006 define la política de vigencia/historia H6 y coexistencia UX antes de construir.

### REQ-H6-017 — Autorización y RLS

Base propuesta: Director/Coordinador consultan/configuran/suben/generan/descargan y retiran opcionales; ADMIN_SISTEMA sin rol académico no accede a PII/bytes, anonymous/bloqueado/revocado tampoco. Confirmar matriz de estados en OQ-H6-002. Roles provienen de DB y sesión confirmada; React nunca autoriza. SELECT RLS en cada tabla/vista; sin DML sensible autenticado directo ni acceso cliente a Storage. service_role solo Edge/operación técnica cerrada y nunca bundle.

### REQ-H6-018 — Concurrencia, locks y conflictos

Conservar protocolo H3/H4/H5: Ciclo(s) por UUID → Alumno(s) por UUID → Matrícula(s) por UUID; después configuración/documentos/archivos en UUID estable. Bloquear config al aplicar documentos para que guardar configuración y registrar matrícula serialicen coherentemente. expected_updated_at obligatorio, PT409/HTTP409 para conflictos lógicos; 40001/40P01 reales se propagan como conflicto explícito. Revalidar roles/estado/fuente tras esperas. Sin retries ocultos ni pérdidas de borrador.

### REQ-H6-019 — Estados académicos, traslado y existentes

No cambiar reglas financieras, saldos, idempotencia, estados académicos ni cierre transaccional H5 para imponer completitud documental. Propuesta de traslado: conservar las relaciones/archivos anteriores como historia y aplicar todos los documentos del destino en PENDIENTE, sin reutilizar automáticamente bytes o firmas. Configuración posterior y regularización de matrículas ya existentes deben resolverse en OQ-H6-001/003 antes de implementar, sin reset de datos humanos.

### REQ-H6-020 — Auditoría mínima

Auditar maestro/configuración, aplicación, retiro opcional, reserva/confirmación técnica, generación y descarga iniciada con actor/fecha/IDs/resultado/correlación/versiones estrictamente necesarias. No contenido PDF/imagen, snapshots, nombres/DI/dirección, filename original, claves secretas, JWT o URLs. No trigger genérico copiando PII. Éxito de negocio y auditoría correspondiente atómicos; intento de descarga no equivale a entrega recibida o impresión.

### REQ-H6-021 — Retención y operación

Persistente no significa TTL 24h. Retirar, anular matrícula o cerrar Ciclo no elimina archivo/historia automáticamente. Política final de retención/purga funcional requiere OQ-H6-004; mientras no exista decisión no implementar DELETE de historia. Separar limpieza manual de reservas/objetos no confirmados, acotada y sin afectar archivos confirmados; sin scheduler, colas ni infraestructura adicional. Antes de producción resolver/aceptar residuales relevantes.

### REQ-H6-022 — UX consistente y accesible

Pestañas y grillas existentes: Ciclo Documentos para configuración, resumen de expedientes en Matrículas, detalle Documentos por matrícula. Carga, Generar, Descargar e Historia según origen/permiso/estado, menú Más acciones para retiro no principal y confirmación clara individual/múltiple. Separar selección de alumnos de selección de archivos; no subir ni generar masivamente en esta fase. Guardar solo con cambios y éxito visible; borrador intacto ante error; teclado/foco y temas Sistema/Claro/Oscuro/Alto contraste con prioridad forced-colors, sin darlo por probado.

### REQ-H6-023 — Calidad y regresión proporcional

Probar contratos DB/API/Edge/Storage, límites, fallos intermedios, rollback, autorización, IDOR, carreras, no retry, versión e inmutabilidad; contenido/paginación y revisión humana de cuatro formatos, más integración H5. Regresión H1–H5 y 70+60 sobre saldo100 sin sobrepago. Fixtures sintéticos sin PII del usuario, reset solo CI desechable. Ninguna prueba H6 ejecutada en fase Spec.

### REQ-H6-024 — Arquitectura, inventario y costos

Continuar React/TS + Supabase Auth/PostgreSQL/RLS/RPC + Edge acotadas + Storage privado. Justificar cada tabla/helper/comando con requisito; no API adicional, motor documental/editor, OCR, firma electrónica/biometría, antivirus externo/colas, microservicios o S3 por defecto. Estimar volumen/egress/retención con supuestos, medir recursos al construir y revisar límites; no usar éxito local como prueba hospedada. Conservar seis residuales H5/GATE-A01 y gates humanos separados.

## Fuera de alcance

Implementación en esta rama; S3/AWS/WebFlux/API Node/Lambda/colas/microservicios/Kubernetes; StorageProvider multicloud; motor/editor de plantillas; OCR, validación académica nueva, firma electrónica, captura biométrica, estados VALIDADO/IMPRESO, antivirus externo/CDR como infraestructura nueva sin autorización; publicación pública de documentos, importación masiva de expedientes, cargas/generaciones ZIP por lote, pagos/facturación H7+, portal alumno y notificaciones. El retiro opcional por selección múltiple sí está incluido, no implica carga/generación masiva.

## OQ pendientes de decisión humana

Las propuestas siguientes no están aprobadas. Resolverlas antes de Gate 1 y antes de ejecutar tareas afectadas. No se simulan respuestas por defecto.

### OQ-H6-001 — Configuración posterior y matrículas existentes

**PENDIENTE HUMANO.** Definir qué ocurre al agregar/desactivar/cambiar obligatoriedad cuando ya hay matrículas, y cómo aplicar H6 a las matrículas preexistentes.

Propuesta mínima: cambios de configuración solo para nuevas aplicaciones; conservar condiciones aplicadas y archivos existentes. Regularizar matrículas previas mediante acción explícita por Ciclo, auditada y atómica; no sincronización/backfill silencioso. Confirmar si se necesita además aplicar nuevos tipos a todas las matrículas actuales.

Impacto trazable (IDs H6): REQ 003/004/005/019; TASK-003/004/019; TEST-004/005/007/042.

### OQ-H6-002 — Matriz de permisos y estados

**PENDIENTE HUMANO.** Confirmar quién mantiene tipos/configuración (propuesta Director/Coordinador) y operaciones de lectura/carga/generación/retiro/descarga en ACTIVO/ANULADO y PROGRAMADO/EN_CURSO/CERRADO/DESIERTO/ANULADO.

Propuesta mínima: mutaciones documentales y generación solo matrícula ACTIVA con Ciclo PROGRAMADO/EN_CURSO/CERRADO; bloqueo DESIERTO/ANULADO. Conservar archivos al anular; decidir si los roles académicos pueden consultar/descargar historia anulada o si se bloquea como H5. No crear nuevas barreras de matrícula, pagos o cierre por faltantes.

Impacto trazable (IDs H6): REQ 005/006/013/017/019; TASK-006/013/017/019; TEST-024/034/058.

### OQ-H6-003 — Traslado y regreso al Ciclo

**PENDIENTE HUMANO.** Definir si documentos/archivos se reaplican al trasladar y qué ocurre al regresar a un Ciclo anterior.

Propuesta: cerrar contexto documental anterior con motivo de traslado, conservar sus aplicaciones/versiones y crear las del destino activas/PENDIENTE. No reutilizar automáticamente bytes. Una nueva aplicación puede coexistir con historia inactiva del mismo ciclo_documento; si se prefiere reactivar la anterior, requiere decisión explícita. El obligatorio no se retira individualmente: cambia su contexto por transición aprobada, sin perder historia.

Impacto trazable (IDs H6): REQ 004/005/018/019; TASK-004/005/018/019; TEST-038/040/041.

### OQ-H6-004 — Retención, baja física e historia

**PENDIENTE HUMANO.** Definir plazo/política de conservación y quién puede descargar históricos/retirados/supersedidos/anulados o autorizar purga física.

Propuesta mínima durante MVP: confirmados persistentes, sin borrado automático por retiro/anulación/24h; baja lógica de opcional preserva versiones. Limpieza manual solo de huérfanos técnicos no confirmados. No proponer plazo legal sin decisión institucional; política relevante antes de H9/release.

Impacto trazable (IDs H6): REQ 012/013/021; TASK-013/021; TEST-044/045/059.

### OQ-H6-005 — Textos, datos propios y fechas de los formatos

**PENDIENTE HUMANO.** Aprobar textos institucionales adaptados de Word y cómo completar apoderado de Carta poder, tratamiento/destinatario de Solicitud, afirmación de Curso aprobado, L.M. y fechas/edad/lugar.

Propuesta: reutilizar fuente CHG-H5-002 para datos existentes; no importar personas/leyes/resoluciones de ejemplo ni asumir CERRADO=Curso aprobado. Mantener campos no existentes en blanco o exigir datos específicos aprobados por documento (apoderado no inferido). Confirmar fecha real de emisión en Lima o matrícula para cada formato, edad a fecha aprobada y distrito/Capitanía correctos. Si se requiere prueba de aprobación académica o nuevos campos de negocio, precisar alcance antes de implementar.

Impacto trazable (IDs H6): REQ 014/015; TASK-014/015; TEST-025/026/027/028/030/054/057.

### OQ-H6-006 — Vigencia de generados persistentes e integración H5

**PENDIENTE HUMANO.** Definir qué se considera vigente y descargable si cambia la fuente/plantilla y cómo mostrar la ficha persistente frente a la acción temporal H5.

Propuesta: conservar versión generada y sus bytes, mostrar aviso derivado de fuente cambiada sin persistir OBSOLETO ni alterar estado GENERADO/contadores aprobados; exigir generación explícita para presentar una versión como actual. Decidir descarga histórica identificada frente a bloqueo total del obsoleto. H5 temporal mantiene su contrato y TTL; H6 genera objeto propio con renderer/fuente compartidos.

Impacto trazable (IDs H6): REQ 007/012/014/015/016; TASK-012/014/015/016; TEST-020/029/031/032/033.

## Residuales y criterios de aceptación

Preservar seis residuales H5/GATE-A01: Hosted Edge/PostgREST 14 NO PROBADO DIRECTAMENTE, CPU y memoria NO MEDIDAS, forced-colors H5 NO VERIFICADO, bundle >500 kB y limpieza física H5 manual. No son PASSED H6 ni se cierran con este Spec. Nuevos riesgos: validación de archivos no equivale a garantía antimalware; consistencia DB/Storage requiere protocolo de compensación; retención/costo persistente y textos/datos por formato requieren las decisiones y evidencia indicadas. Los relevantes para producción deberán resolverse o aceptarse antes de H9/release.

Gate 1 exige revisión humana del modelo/diseño, OQ resueltas y aceptación del plan de pruebas. La entrega técnica futura exige trazabilidad REQ/DES/TASK/TEST, pruebas progresivas y candidaturas exactas; Gate 2 y acceptance solo con autorización humana posterior. No cerrar H6 por CI verde ni afirmar ejecución humana de subcasos no reportados.
