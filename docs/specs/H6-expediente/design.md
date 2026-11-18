# H6 — Expediente y documentos institucionales: design

Fecha: 18/11/2026 (America/Lima). **DRAFT / Gate 1 H6 PENDIENTE. Construcción NO AUTORIZADA.**
Rama: `feature/h6-expediente-spec`. Base exacta de main: `1228a028fc203e0319340b5b55d7d9aa99802760`, merge [PR #3 H5](https://github.com/fcamasca/perumar-supabase/pull/3). CI main [44381503820](https://github.com/fcamasca/perumar-supabase/actions/runs/44381503820) SUCCESS antes de crear la rama. H5 [CLOSED / ACEPTADO / INTEGRADO](../H5-enrollment-pdf/acceptance.md), candidato final `a19520a1733dca53b38bfe1463d0473304c88d86`, 440/440; cierre `1551538f1fdd190a4a70da402883734c40ff30f1`, CI `44379188039` SUCCESS. [GATE-A01 APROBADO CON AJUSTES](../../architecture/GATE-A01-continuidad-supabase.md).

Esta entrega contiene exclusivamente requirements.md, design.md, tasks.md y test-plan.md. No implementa código/SQL/React/Edge, tablas, buckets, Storage, migraciones ni dependencias H6. Todos los TEST-H6 están **NO EJECUTADOS**. Las propuestas técnicas se someten a Gate 1; las OQ no equivalen a decisiones aprobadas. No se crea acceptance ni Gate 1 automático.

## Recorrido propuesto

React solicita operaciones específicas bajo sesión confirmada. PostgreSQL mantiene condiciones, estados, historia, versiones, autorización y contadores derivados mediante constraints/RLS/RPC concretas. Tres Edge de propósito específico atienden bytes/generación bajo JWT; Storage privado conserva archivos. No API adicional ni abstracción multicloud. Ninguna llamada cliente decide estados, object_key, actor, hash, permisos o fuente.

El modelo conceptual humano de tres entidades se conserva. Se propone **una cuarta tabla de archivos/versiones**, estrictamente justificada por reemplazo inmutable, reserva/confirmación y recuperación ante fallo entre DB/Storage; no otro catálogo ni un motor de workflow. Es propuesta de esquema para Gate 1, no tabla creada.

## Diseño trazable

### DES-H6-001 — Frontera y gates

REQ-H6-001. El cambio permitido hoy es exclusivamente documental. Tras Gate 1, implementar en bloques con pruebas progresivas; detener expansión si exige API adicional, worker, S3, editor de plantillas o motor de reglas. H5 y sus seis residuales son base aceptada, no pruebas H6. El diseño siguiente es una propuesta revisable; las OQ señaladas bloquean tareas dependientes.

### DES-H6-002 — tipo_documento

REQ-H6-002. Proponer tabla con UUID PK, codigo único normalizado (máx. 40), nombre (150), descripcion (500), origen con CHECK SUBIDO/GENERADO, activo, created_at/updated_at. Evitar enum/catalogo extra; constraints y comando específico. Nueve tipos candidatos para revisión de Gate 1: Documento de identidad (DNI/Carné de extranjería ya admitidos en H3), foto pasaporte, certificado psicofísico, certificado de estudios, cuatro formatos generados y Ficha H5. El listado es propuesta de carga inicial de tipos, nunca configura todos los Ciclos ni importa personas. Código/origen referenciados no se cambian. Sin DELETE funcional. Propuesta de integridad: impedir inactivar el tipo mientras tenga configuración de Ciclo activa; desactivar primero la configuración expresamente. Nunca omitir silenciosamente un ciclo_documento activo por un tipo inconsistente.

### DES-H6-003 — ciclo_documento

REQ-H6-003. Proponer UUID PK, ciclo_id FK, tipo_documento_id FK, obligatorio, activo, timestamps y UNIQUE(ciclo_id,tipo_documento_id). Guardado por comando con expected_updated_at de Ciclo y versiones de filas: lock Ciclo, validar tipo activo para altas/reactivación, configuración coherente, historial por auditoría mínima. No acoplar a Carrera. Desactivar excluye nuevas aplicaciones, sin borrar relaciones históricas. OQ-001 define efecto sobre existentes, no se implementa sincronización silenciosa. No reasignar tipo_documento_id de una configuración ya aplicada; usar nueva relación y conservar la anterior. Cambios de obligatoriedad de nuevas aplicaciones no mutan obligatorio_aplicado previo.

### DES-H6-004 — matricula_documento y alta atómica

REQ-H6-004. Proponer UUID PK; matricula_id, ciclo_documento_id, tipo_documento_id; codigo/nombre/origen/obligatorio_aplicado como copia de condiciones de aplicación, estado, activo, retirado_por/at/motivo, archivo_vigente_id nullable y timestamps. Unicidad de aplicación vigente por matrícula/configuración; historia de contextos anteriores separada si OQ-003 aprueba nuevas aplicaciones al regresar. CHECK origen/estado y motivo/actor/fecha para retiro; guard impide retiro individual de obligatorio. La única eventual excepción de contexto es el traslado expresamente aprobado en OQ-003, no una excepción manual de retiro. FK compuesta asegura tipo/configuración correspondiente y pertenencia de versión. Un trigger privado específico AFTER INSERT matrícula aplica toda configuración activa; usa el lock del Ciclo ya tomado en registrar_matricula y no crea autoridad alternativa. Fallo captura/aplicación/auditoría revierte matrícula y cargos. El trigger no copia PII ni altera RPC financieras.

### DES-H6-005 — Obligatoriedad aplicada

REQ-H6-005. obligatorio_aplicado y origen son inmutables para esa aplicación; cambios de maestro/configuración no hacen retirable un obligatorio ni convierten un opcional existente sin decisión OQ-001. Bloquear UPDATE/DELETE sensible directo con grants/RLS y guard específico; una RPC no puede eludir el CHECK. El usuario no necesita ver nombres técnicos ni snapshots de condiciones.

### DES-H6-006 — Retiro acotado y transaccional

REQ-H6-006. Una RPC retirar_documentos_opcionales acepta ciclo_id, documento de configuración y lista explícita de hasta 50 IDs de matrícula/documento con versiones esperadas y motivo (1–500). Solo Director/Coordinador activos. Lote debe pertenecer al mismo Ciclo, sin duplicados; lock estable y comprobar cada fila activa/opcional/contexto antes de escribir. Si una es obligatoria, ajena, obsoleta o no autorizada: rollback total y error identificable sin PII, no éxito parcial. Conserva estado/archivo_vigente_id/versiones; auditoría por afectado y correlación del lote. React mantiene selección para decisión explícita tras conflicto.

### DES-H6-007 — Lectura derivada

REQ-H6-007. Una vista específica security_invoker para resumen por matrícula (o consulta equivalente con RLS si basta) calcula count FILTER activo y pendientes; no tabla de saldos documentales ni estado completo persistido. Lista de faltantes consulta documentos activos PENDIENTE bajo misma autorización. Paginación estable y agregación antes de paginar matrículas, sin descargar todos los documentos en React para contarlos. Retirados se muestran por opción explícita e historia; cero activos tiene etiqueta Sin documentos aplicables.

### DES-H6-008 — Ubicación UX

REQ-H6-008. Reutilizar pestañas/grillas existentes. Ciclo: Documentos para configuración; Matrículas conserva la grilla y añade resumen derivado y selección explícita de alumnos para retiro del opcional elegido. Ficha matrícula: pestaña Expediente con resumen y grilla Documento | Origen | Obligatorio/opcional | Estado | Acciones. Diferenciar configuración del Ciclo y expediente del alumno; editar uno no cambia otro. Sin pantalla independiente con navegación redundante ni asistente Siguiente/Anterior. Mantenimiento del maestro Tipos de documento con búsqueda por código/nombre, grilla compacta, acciones ver/editar/nuevo a la derecha y formulario de sus campos; reutilizar estándares visuales existentes, sin mantenimiento genérico de catalogo_valor ni editor de plantillas.

### DES-H6-009 — Bucket y claves

REQ-H6-009. Proponer un bucket privado h6-expediente separado de h5-fichas temporales. object_key generado servidor con UUID de operación/archivo, sin nombres/DI/Curso ni paths cliente; no upsert. Bucket y keys no son autoridad: revalidar vínculo DB. No policies Storage que den acceso directo a anon/authenticated. Solo Edge con service_role para bytes, tras JWT/RLS y autorización DB; no DML SQL sobre storage.objects. Sin guardar URLs o bytes en tablas de negocio.

### DES-H6-010 — Límites y validación de carga

REQ-H6-010. Propuesta técnica para Gate 1: máximo 5 MiB por archivo, PDF hasta 20 páginas, imagen JPEG/PNG hasta 20 megapíxeles; una carga por petición, sin ZIP/lotes de bytes. Tipo Foto solo JPEG/PNG; demás SUBIDO PDF/JPEG/PNG. Medir bytes al leer con límite y abortar, aun sin Content-Length. Rechazar extensión/MIME/firma discordantes, doble extensión peligrosa, archivo vacío/corrupto, descompresión/imagen fuera de presupuesto, PDF cifrado/con JavaScript, acciones ejecutables, adjuntos o recursos remotos. Parser dentro del presupuesto; no abrir contenidos en HTML del navegador. La inspección estructural no equivale a antivirus/CDR ni certifica ausencia de malware; si no puede verificarse de forma fiable, rechazar y reportar límite, no agregar infraestructura por cuenta propia.

### DES-H6-011 — Reserva técnica y confirmación

REQ-H6-011. Cuarta tabla propuesta matricula_documento_archivo, justificada solo por historia de reemplazos y consistencia DB/Storage: UUID, matricula_documento_id, object_key único, estado_tecnico PREPARADO/CONFIRMADO/ABORTADO, iniciado_por/at, confirmado_por/at, MIME/bytes/SHA256, nombre_original saneado opcional, plantilla_version/fuente_fingerprint para generados, version_esperada_documento y timestamps. El estado técnico es interno, no nuevos estados de negocio del expediente. Reserva registra actor/contexto/UUID y key; confirmación service_role valida rol actual del actor, documento, estado, key y metadatos calculados exclusivamente por Edge, y actualiza archivo vigente + estado documental + auditoría en una transacción. Ningún lock DB queda abierto durante IO Storage. Fallo deja documento PENDIENTE o versión previa intacta y reserva abortable/conciliable, no CARGADO ficticio. UUID de reserva/archivo generado por DB, no elegido por cliente. Como máximo una reserva PREPARADO por documento/versión; si se pierde su respuesta, consultar la reserva propia por lectura JWT del documento antes de decidir continuar/abortar. No reservar otra operación a ciegas. Preparación/confirmación son comandos service_role llamados solo desde Edge tras getUser y lectura JWT/RLS; actor y versión de plantilla proceden del servidor. DB calcula la huella canónica y revalida actor/rol, versión y contexto, sin admitir esos campos desde React.

### DES-H6-012 — Versionado sin sobrescritura

REQ-H6-012. Cada carga/reemplazo/generación reserva una fila de archivo distinta. Solo CONFIRMADO puede ser archivo_vigente_id, con FK compuesta de pertenencia y guard; timestamp/version de matricula_documento cambia al confirmar. Dos confirmaciones compiten por la misma versión: solo una gana; la otra PT409, no mueve puntero ni emite éxito. Confirmar dos veces el mismo UUID ya confirmado con igual metadato devuelve el resultado existente sin segundo evento; no permite reutilizar UUID ajeno o payload distinto. Respuesta incierta se resuelve leyendo ese UUID, sin resubir/regenerar automáticamente.

### DES-H6-013 — Descarga específica

REQ-H6-013. Edge expediente-descargar recibe solo archivo_id/documento_id y contexto/version requeridos, nunca bucket/key/URL elegidos por React. getUser confirmado; lectura JWT/RLS; revalidación DB y actor antes de autorizar lectura; Storage bytes con service_role; límite y MIME/longitud/huella si se verifica integridad al descargar; revalidar contexto antes de responder y auditar DESCARGA_INICIADA, sin afirmar recepción/impresión. Content-Disposition attachment con nombre servidor neutro, nosniff, private,no-store. No firmar URL larga ni revelar key al cliente como permiso. Matriz de historia/anulación/supersedidos requiere OQ-002/004/006.

### DES-H6-014 — Renderers institucionales

REQ-H6-014. Una Edge expediente-generar con lista cerrada de códigos GENERADO y módulos fijos/versionados para los cuatro formatos y ficha H5, sin HTML arbitrario ni template body cliente. Reutilizar pdf-lib y utilidades existentes de texto/tablas/branding/fuentes, no duplicar contrato H5 ni empaquetar lógica en una plantilla DB editable. Solicitud: destinatario/Curso/datos/adjuntos y firma; Declaración: identidad/cuerpo aprobado/fecha/firma/huella física; Carta poder: otorgante/apoderado/alcance; Ficha personal: identificación/geografía/rasgos/contactos/espacios físicos. OQ-005 debe aprobar textos/datos no existentes. No renderizar afirmaciones legales o académicas por inferencia; no firma electrónica ni captura de huellas.

### DES-H6-015 — Proyección y huella

REQ-H6-015. Consumir fuente H5 autorizada y coherente en una lectura, con snapshot inicial sin cambios y snapshot_cierre exclusivo al CERRADO. Extender solo proyección específica si un dato ya existente realmente se necesita. DB calcula fingerprint canónico cubriendo datos usados, contexto, código/versión de plantilla y datos específicos aprobados; excluye emisión real. No hash JS como autoridad ni JSON serializado arbitrariamente por React. Capturar huella al reservar; al confirmar revalidar bajo locks y rechazar cambio, compensando objeto nuevo. No modificar/fabricar snapshots al generar. Lugar/fecha/edad y campos de apoderado pendientes OQ-005.

### DES-H6-016 — Coexistencia H5 y H6

REQ-H6-016. El flujo persistente genera su propio objeto confirmado a través del renderer compartido H5, con el mismo origen autorizado y reglas CHG-H5-002. No se depende de existencia, vigencia o limpieza de h5-fichas. La acción H5 temporal permanece disponible según contrato vigente; la UI H6 etiqueta claramente Guardar ficha en expediente, sin dos generadores con fuentes diferentes. OQ-006 debe fijar si versiones persistentes obsoletas se descargan solo como historia o se bloquean, y cómo se comunica la versión vigente; no imponer TTL 24h a H6.

### DES-H6-017 — Matriz de permisos propuesta

REQ-H6-017. Director/Coordinador: maestro/configuración/expediente, cargas/generación/descarga y retiro opcional. ADMIN_SISTEMA solo continúa seguridad H1, sin PII/Storage académico por ese rol solo; roles combinados suman autorización académica DB existente. Todos los nuevos SELECT con RLS sobre tablas y vista invoker; sin INSERT/UPDATE/DELETE autenticado. SET search_path vacío y grants cerrados en security definer, sin helper de autorización duplicado cuando private.authorize ya basta. RPC de preparación, confirmación, aborto y auditoría de bytes solo service_role, validan actor confirmado por Edge y rol DB tras locks. Nunca aceptar p_actor desde React. Estados exactos por OQ-002.

### DES-H6-018 — Orden de locks y contrato de errores

REQ-H6-018. Comandos reúnen IDs sin locks, toman Ciclo(s) UUID → Alumno(s) UUID → Matrícula(s) UUID → configuraciones/documentos/archivos UUID y vuelven a comprobar pertenencia. Configurar Ciclo serializa con matrícula/cierre a través del Ciclo; ninguna operación toma documento y luego padre. Conservar SERIALIZABLE donde exista; PT409/HTTP409 solo conflictos lógicos; 40001/40P01 reales sin traducir a éxito ni retry. expected_updated_at en mutaciones y contexto; el cliente no intenta de nuevo por polling/efecto React. Tamaño de lote acotado, sin cursores/jobs.

### DES-H6-019 — Compatibilidad H3/H4 y existentes

REQ-H6-019. No tocar contratos financieros ni derivación de deuda. En traslado, propuesta pendiente OQ-003: retirar relaciones documentales del contexto anterior con motivo TRASLADO (incluido obligatorio mediante transición específica del contexto, no retiro individual), conservar archivos/condiciones y crear todas las aplicaciones del destino en PENDIENTE. Mismo objeto no se enlaza automáticamente a otra matrícula. Matrículas existentes al desplegar: propuesta OQ-001 es regularización explícita, auditada y atómica por Ciclo después de configurar documentos, sin reset ni backfill silencioso de producto. No añadir esas RPC mientras OQ no estén cerradas.

### DES-H6-020 — Auditoría específica

REQ-H6-020. Eventos propuestos TIPO_DOCUMENTO_GUARDADO, CICLO_DOCUMENTOS_CONFIGURADOS, DOCUMENTOS_APLICADOS, DOCUMENTO_OPCIONAL_RETIRADO, ARCHIVO_RESERVADO, DOCUMENTO_CARGADO/GENERADO, RESERVA_ABORTADA y DOCUMENTO_DESCARGA_INICIADA. Guardar IDs, actor, fecha, correlación y versiones no sensibles; no snapshot/PII/filename/key/URL/hash de contenido en auditoría general. Hash queda en metadatos protegidos. Confirmación y evento de éxito atómicos; retiros atómicos por lote. No trigger genérico de PII ni eventos de éxito cuando fallan validación/confirmación.

### DES-H6-021 — Retención y huérfanos

REQ-H6-021. No TTL automático para confirmados. OQ-004 fija retención/baja física y acceso histórico; hasta decidir, bloquear purga funcional y conservar historia. Reserva PREPARADO expirada no equivale a archivo confirmado. Proponer comando operativo manual de conciliación, dry-run y máximo 50 reservas huérfanas mayores de 24h, sin borrar nada referenciado por CONFIRMADO o puntero vigente; revalidar antes de borrar. No escanear/borrar todo el bucket ni borrar por nombre cliente. Operación documentada, sin scheduler nuevo. El umbral de huérfanos es técnico y no retención de expediente.

### DES-H6-022 — Interacción y accesibilidad

REQ-H6-022. Acciones cargar/generar/descargar por fila con nombre accesible/tooltip; retiro en Más acciones y confirmación con documento/número de alumnos y aviso de conservación. Obligatorio con explicación no retirable. Mostrar PENDIENTE/CARGADO/GENERADO separados de Retirado y de diagnóstico de vigencia, sin inventar nuevos estados de negocio. Guardar deshabilitado sin cambios; success visible, errores junto a archivo/campo, foco claro, selección/borrador intactos al fallar, Escape/clic fuera según componente existente. Grilla compacta adaptable, cifras alineadas y sin depender solo de color; usar tokens/temas y no ocultar forced-colors pendiente.

### DES-H6-023 — Validación y entrega técnica futura

REQ-H6-023. Ejecutar progresivamente lint/tipos/unidades, reset solo desechable, integración DB/PostgREST/Edge/Storage, RLS matrix, carreras/rollback, contenido real/PDF, build/build-safety y regresión H1–H5, expiración y rebuild. No reemplazar carreras H4 ni pruebas de snapshot H5. Fixtures sintéticos y outputs ignorados. Registro técnico/humano después de construir, candidato/CI exactos, inventario final y OQ cerradas; Gate 2 futuro, no acceptance ahora.

### DES-H6-024 — Inventario proporcional y referencias

REQ-H6-024. Máximo propuesto inicialmente: cuatro tablas documentales, una vista de resumen si la consulta necesita agregación DB, un bucket privado persistente, tres Edge acotadas (expediente-cargar, expediente-generar, expediente-descargar), siete RPC cerradas y dos helpers privados de aplicación/guard de historia, sin nuevo motor. Justificación y excepciones abajo. No crear objetos en esta rama. Presupuestos propuestos: carga <=5 MiB; generación <=2 MiB PDF, deadline acotado; medir CPU/memoria/latencia y costos con supuestos de archivos/matrículas/descargas/retención. Si requiere archivos mayores/streaming externo/cola, detener y elevar revisión en vez de ampliar arquitectura.

## Inventario propuesto y necesidad de cada comando

Base H5: 24 tablas públicas, 4 vistas, 20 funciones públicas, 19 helpers privados, 27 policies de negocio; un bucket/Edge H5 temporal. H6 no crea ningún objeto en fase Spec. Si se aprueba este diseño, incremento inicial propuesto: 4 tablas, como máximo 1 vista invoker de resumen, 1 bucket privado persistente, 3 Edge, 7 RPC y 2 helpers privados. Policies SELECT por tabla y vista invoker bajo permisos de tablas, sin políticas Storage para clientes. Cualquier incremento adicional exige justificar el requisito antes de construir; no wrappers solo por uniformidad.

| Comando propuesto | Acceso / datos de entrada cerrados | Necesidad |
| --- | --- | --- |
| guardar_tipo_documento | JWT académico autorizado; campos del maestro y versión esperada; código/origen referenciados estables | REQ-002, sin CRUD generalista |
| guardar_documentos_ciclo | JWT autorizado; Ciclo/versión y filas tipo/obligatorio/activo/versiones | REQ-003; serializa con matrícula |
| retirar_documentos_opcionales | JWT Director/Coordinador; un Ciclo, configuración y hasta50 documentos/matrículas con versiones, motivo | REQ-006, lote atómico específico |
| preparar_archivo_expediente | Solo service_role desde Edge tras getUser/lectura JWT; documento/versión y actor/plantilla confirmados por servidor; DB genera UUID/key y fingerprint | REQ-011/012; reserva técnica, no confirma bytes ni acepta paths cliente |
| confirmar_archivo_expediente | Solo service_role desde Edge; actor de getUser, reserva, metadatos calculados servidor y versión/fuente | REQ-011/012/015; confirma estado/puntero/auditoría atómicos, vuelve a autorizar actor |
| abortar_reserva_expediente | Solo service_role; reserva/actor/contexto, sin borrar versiones confirmadas | REQ-011/021; compensación técnica acotada, no DELETE funcional |
| registrar_descarga_expediente | Solo service_role desde Edge; archivo/contexto y actor confirmado | REQ-013/020; revalidación y auditoría de inicio, no lectura arbitraria |

Helpers privados propuestos: aplicación de configuración al insertar matrícula (REQ-004) y guard específico de historia documental/archivos (REQ-005/012). Reutilizar authorize, require_version, timestamp y patrones ya existentes cuando satisfagan el requisito; no helper genérico de dispatch ni comandos SQL dinámicos. Cambios de RPC de matrícula/traslado, si OQ-001/003 los requieren, preservan las firmas actuales y no añaden un backend alternativo. La eventual acción de regularización de existentes no está autorizada sin OQ-001 y debe justificar si cabe en comando específico existente o necesita uno adicional.

Edge propuestas: expediente-cargar (SUBIDO, multipart limitado), expediente-generar (GENERADO, IDs/versiones y campos específicos solo aprobados) y expediente-descargar (archivo/contexto, bytes autorizados). No aceptan SQL, tabla, plantilla HTML, renderer arbitrario, bucket, URL, object_key, actor ni hash decididos por React. Orígenes desplegados explícitos y JSON/headers acotados, sin secretos cliente. No una función universal de documentos con rutas dinámicas.

## Protocolo de archivo y resultado incierto

1. Edge valida getUser, autorización académica y lectura JWT/RLS del documento/contexto; parsea petición y contenido con presupuesto sin almacenarlo públicamente.
2. Reserva mediante RPC service_role acotada, actor/plantilla confirmados por Edge, UUID generado por DB, versión esperada y contexto/fuente calculados en DB. Clave objeto servidor e inmutable; no lock DB durante Storage.
3. Edge escribe bytes nuevos sin upsert; valida respuesta e integridad/metadatos calculados servidor.
4. Confirmación bajo orden de locks; revalida actor, contexto, versión, activo/origen y fuente. Transacción única confirma archivo, puntero, estado y auditoría de éxito.
5. En fallo: mantener versión/estado anterior, compensar objeto o registrar reserva no confirmada para limpieza manual. No prometer rollback de bytes distribuido ni borrar confirmado.
6. Si respuesta es incierta: consultar operación/archivo por lectura autorizada. Si ya confirmó, recuperar resultado; si no se sabe, informar y esperar decisión humana. No upload/generate/retry automático ni nuevo UUID oculto. Confirmación repetida explícita del mismo UUID/resultado es idempotente; payload diferente o ajeno da conflicto.

Carga activa no se publica mientras PREPARADO. Retiro concurrente bloquea confirmación/reactivación silenciosa. Una reserva pendiente no suma completados. No mantener una segunda copia arbitraria de PII de plantilla en JSON: usar la fuente existente; datos nuevos del formato solo se modelan tras OQ-005 y con lista cerrada por plantilla, nunca como bolsa de campos.

## Contratos funcionales de error

| Situación | Respuesta propuesta | UX / efecto |
| --- | --- | --- |
| JWT inválido/expirado | 401 SESSION | Iniciar sesión; sin retry/bytes |
| Rol/contexto no autorizado o recurso ajeno | 403 ACCESS o respuesta no reveladora consistente | Sin PII ni existencia ajena; sin éxito |
| Archivo inválido / excede límite | 422 FILE_INVALID / 413 LIMIT | Error junto al archivo, estado previo intacto |
| Versión, estado, activo, fuente o contexto cambiados | PT409 / HTTP409, códigos acotados VERSION/SOURCE_CHANGED/STATE | Conservar borrador/selección, recargar/consultar y decidir |
| 40001/40P01 real PostgreSQL | Conflicto visible | No RAISE deliberado con40001; no retry SDK/React/Edge |
| Fallo Storage/DB o resultado incierto | 503 UNAVAILABLE / respuesta de operación incierta | No CARGADO/GENERADO ficticio; consultar UUID explícitamente |

## Decisiones pendientes y límites

[OQ-H6-001 a 006](requirements.md#oq-pendientes-de-decisión-humana) son normativas para el siguiente refinamiento. Donde exista propuesta de comportamiento no resuelto, no convertirla en aprobación ni construirla. En particular: política sobre existentes, estados/roles, traslado/regreso, retención/historia, datos/textos/fecha y vigencia de generados. Las tareas dependientes quedan bloqueadas hasta decisión y Gate 1. No hacer migración de desarrollo que simule esa decisión.

## Referencias técnicas primarias consultadas el 18/11/2026

- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control): permisos Storage y uso privilegiado que evita RLS requieren frontera servidor explícita.
- [Standard Uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads): selección de mecanismo y límites de carga; el límite H6 de5MiB es propuesta propia conservadora, no cuota declarada de Supabase.
- [Edge Functions limits](https://supabase.com/docs/guides/functions/limits): revisar límites reales del runtime; bytes/tiempo local no acreditan CPU/memoria hospedadas ni aptitud de este parser.
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): defensa por capas, tipo/contenido/tamaño/nombre/acceso; no tratar extensión, MIME o firma aislados como prueba suficiente.

Seguridad: autorización/IDOR/secretos/PII; fiabilidad: transacción y compensación; operación: conciliación/errores/evidencia; rendimiento: límites/batches/paginación/medición; costos: bytes/versiones/descargas/retención con supuestos. Son criterios OWASP y AWS Well-Architected, no razones para desplegar AWS o nuevas capas. No se certifica conformidad legal de plantillas ni seguridad antimalware absoluta.
