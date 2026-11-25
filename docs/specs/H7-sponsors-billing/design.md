# H7 — Diseño propuesto

**SPEC EN REVISIÓN / Gate 1 PENDIENTE / SIN IMPLEMENTACIÓN**. 2026-11-23.
Base `fd230a7f36716129033f4c9b5a287f78647de111`.
[Requisitos y OQ-H7-001..005 RESUELTAS](requirements.md).

## DES-H7-001 — Frontera y enmienda H4

React/TypeScript → Auth → PostgreSQL/RLS/RPC. Reutilizar empresa_patrocinadora (RUC/contacto actuales), matrícula/alumno/Ciclo, roles/auditoría. No maestro ni estado empresa nuevo. H7 tiene pagos separados: transferencia bancaria fija, sin catálogo de formas de abono.

Futura migración aditiva actualiza registrar_pago H4. Tras locks Ciclo → Alumno → Matrícula y relectura, nueva operación con empresa_patrocinadora_id no NULL se rechaza por regla de negocio (23514 y mensaje específico estable); versión/contexto obsoleto conserva PT409. Sin mutación/auditoría de éxito. No cambiar importes/fórmulas/locks/aplicaciones H4 ni modificar migraciones históricas.

Recuperar resultado autorizado de clave idempotente existente aun después de asignar patrocinador sigue permitido: no es pago nuevo. Clave distinta no evade la nueva regla; misma clave con otro contenido conserva conflicto. Anulación/consulta H4 histórica siguen con autorización actual, sin nuevo requisito de ausencia de patrocinador.

H3 puede asignar/cambiar empresa aunque haya pagos previos conforme a sus reglas. Carrera con registrar_pago bajo locks comunes: si pago confirma primero, histórico válido; si asignación gana, pago nuevo rechazado. No bloquear H3 por mera cobertura OS ni reescribir pagos. No distribuir H7 a matricula_cargo, porcentajes ni sumar deudas.

UI H4 patrocinada: sin nuevo formulario; “Matrícula patrocinada. Los pagos se gestionan desde Facturación del patrocinador”. Historia visible. RPC cubre pantalla antigua/cliente directo; React no decide autoridad. Con patrocinador NULL otra vez se evalúa elegibilidad H4 normal.

## DES-H7-002 — Modelo: seis tablas de negocio

UUID/actor/timestamps técnicos servidor, FKs sin cascada destructiva, importes positivos numeric(12,2), sumas de capacidad suficiente.

| Objeto | Datos/restricciones |
| --- | --- |
| orden_servicio | Empresa FK, Ciclo FK histórico, serie text, correlativo text, fecha date, monto, observación opcional, VIGENTE/ANULADA con motivo/actor/instante. UNIQUE(empresa,serie,correlativo) incluye anuladas. |
| orden_servicio_matricula | PK(OS,matrícula), cobertura histórica inmutable, sin dinero por vínculo ni segunda empresa actual. |
| factura_patrocinador | Empresa FK, serie/correlativo text, importe, emisión/vencimiento, observación opcional, workflow cuatro valores y fechas externas; anulación timestamp/actor/motivo separada. UNIQUE(serie,correlativo) global incluye anuladas. |
| factura_orden_servicio | PK(factura,OS), n:m misma empresa, sin importe por relación. OS constituyen el detalle comercial. |
| pago_patrocinador | Empresa FK, importe, fecha_efectiva date NOT NULL, banco text NOT NULL, referencia_operacion/observación opcionales, CONFIRMADO/ANULADO con motivo/actor/instante; UUID idempotente global único y contenido canónico. |
| pago_patrocinador_aplicacion | PK(pago,factura), importe positivo inmutable, empresa coincidente; suma = importe pago. |

Serie trim/mayúsculas alfanumérica1–20; correlativo trim numérico1–20, **text** conserva ceros, comparación textual sin conversión a entero ni generador fiscal. Mostrar serie-correlativo sin fusionar almacenamiento. Banco trim1–150 sin nuevo catálogo; referencia hasta150, observación hasta500: límites técnicos propuestos.

Contenido comercial confirmado OS/factura/cobertura inmutable; correcciones por anulación+nuevo registro. PDF es complemento versionado independiente de importe/cobertura. Sin reactivar anulados. Índices únicos/FKs inversas matrícula→OS→factura→aplicaciones y empresa/fecha/id, Ciclo OS; revisar planes antes de índices extra, sin rendimiento medido.

## DES-H7-003 — Selección, historia y proyecciones

OS nueva: matrícula ACTIVO, Ciclo PROGRAMADO/EN_CURSO/CERRADO y empresa coincidente. Seleccionar todos envía IDs concretos/versiones; revalidar tras locks, vacío/repetido/ajeno/mezcla Ciclos y DESIERTO-ANULADO rechazados sin omisiones.

Ciclo/empresa OS históricos no se recalculan desde matrícula transferida o con nuevo patrocinador. No nuevos snapshots PII. Factura selecciona OS propias vigentes distintas; servidor recalcula suma y, si total difiere, exige confirmación explícita contra versiones conocidas. OS10,000+5,000 → factura4,500 permitido. OS puede participar en varias facturas con acumulado diferente: sin techo, cuota ni importe asignado por OS.

Proyecciones security_invoker:
- Abonado factura = aplicaciones de pagos CONFIRMADO; pendiente = importe − abonado. SIN_DESEMBOLSO si0, PARCIAL si entre0 y total, DESEMBOLSADA si igual. No persistirlos.
- Anulada separada y excluida de deuda vigente, sin simular que anular equivale a pagar.
- Patrocinador suma facturas distintas una vez. OS muestra facturas/importe relacionado no aditivo entre OS, no dinero consumido.
- Ciclos por OS histórica; personas distintas globalmente y matrículas distintas por Ciclo. Un alumno dos Ciclos = una persona y dos matrículas. No multiplicar dinero por beneficiarios.
- Sin deuda real comparada con cargos ni distribución por alumno/Ciclo; reportar total factura una vez y lista de Ciclos.

## DES-H7-004 — Workflow y pagos

Workflow manual adyacente hacia adelante EMITIDA → REGISTRADA_PATROCINADOR → APROBADA → PENDIENTE_DESEMBOLSO; fecha por etapa, cronología desde emisión/no futuro en Lima, vencimiento >= emisión. Fechas negocio date, timestamps técnicos timestamptz. EMITIDA es registro interno, no acreditación SUNAT.

Pago solo facturas propias/no anuladas en PENDIENTE_DESEMBOLSO. Transferencia, banco y fecha obligatorios. Fecha_efectiva <= hoy America/Lima y >= emisión de todas aplicadas; referencia opcional. No exigir fecha >= etapa pendiente: decisión humana solo fija emisión. created_at real conserva cuándo registró Perú Mar, sin hora efectiva nueva.

Parciales/múltiples conservan workflow pendiente; anular pago cambia proyección financiera sin retroceso manual. Solo Director anula OS/factura/pago con motivo. **Decisión humana Gate 1, contrato obligatorio:** una OS no puede anularse si está asociada a alguna factura no anulada; una factura no puede anularse si tiene aplicaciones vigentes de pagos CONFIRMADOS. No existen anulaciones en cascada. Primero debe regularizarse/anularse el objeto dependiente conforme a sus propias reglas; la operación bloqueada no lo modifica automáticamente. Toda la historia se conserva, sin DELETE físico. Estados académicos posteriores no impiden cobrar factura válida. Anular OS conserva versiones PDF autorizadas.

## DES-H7-005 — RPC, locks e idempotencia

RPC específicas registrar/anular OS; registrar/avanzar/anular factura; registrar/anular pago. PDF usa DES008. No SQL arbitrario/CRUD genérico.

Orden académico cuando corresponde: Ciclo UUID → Alumno UUID → Matrícula UUID. Después empresa → OS UUID → factura UUID → pago UUID; versión PDF bajo su OS. Tomar solo raíces necesarias, nunca invertir. H3/H4 no adquieren locks H7. Lectura orientativa de IDs antes, relectura bajo locks después; conjunto cambiado aborta PT409, sin ampliar selección silenciosamente.

Registrar OS bloquea académico antes de comercial; registrar factura OS antes de factura; anular OS bloquea OS. Workflow/anulación bloquean factura. Pagos bloquean todas las facturas en UUID y luego pago. Anular pago lee IDs inmutables de aplicaciones antes de bloquear facturas UUID y pago, revalida. Mantener aislamiento/transacciones vigentes y errores nativos sin retry.

expected_updated_at para objetos existentes y versiones seleccionadas. PT409 lógico, 40001/40P01 reales defensivos; sin RAISE deliberado40001. Pago revalida etapa/empresa/fecha y pendiente bajo locks, total exacto=sumas. 70+60 sobre100: no más de uno confirma; perdedor sin aplicaciones/auditoría parcial.

Idempotencia permanente: UUID global y canónico empresa/importe/fecha/banco/referencia/observación/aplicaciones ordenadas. Misma clave/contenido recupera resultado autorizado aun anulado sin reactivarlo; distinto entra en conflicto. Restricción única/relectura segura resuelven carrera sin repetir comando financiero. Respuesta perdida se consulta explícitamente; React no repite. OS/factura previenen duplicados con combinación única, sin framework genérico.

## DES-H7-006 — Seguridad y auditoría

RLS SELECT roles académicos activos, sin DML directo anon/authenticated. RPC SECURITY DEFINER según patrón vigente, owner controlado, search_path vacío, nombres cualificados, EXECUTE mínimo y autorización interna. Vistas invoker sin elevar por joins.

Director/Coordinador registran/consultan/avanzan; solo Director anula. ADMIN solo sin autoridad académica. Whitelist, montos DB, texto escapado/consultas parametrizadas. No aceptar actor/permisos/estado financiero/saldo/SQL/timestamps técnicos del cliente.

Auditoría atómica mínima de acción/actor/IDs/estados/importes/motivo sin PII/snapshots/payload completo. PDF audita IDs/versiones, no contenido/nombre original. Fallo no deja éxito ni tokens/secretos en logs.

## DES-H7-007 — UX y reportes

Patrocinador→Facturación: selección matrícula OS/monto manual, serie-correlativo separados, selección OS factura con diferencia confirmable, cuatro etapas, transferencia banco/fecha/referencia. Matrícula solo resumen/enlaces y bloqueo H4 con historia intacta.

Reportes HU14/HU15 ajustados: OS como detalle, factura y pago/aplicaciones, empresa/Ciclos/beneficiarios, total/abonado/pendiente y banco/fecha/referencia; forma de abono como rótulo fijo Transferencia bancaria si se muestra. Sin cifras por alumno ni suma H4+H7.

Filtros servidor, orden fecha/id, paginación; CSV completo filtrado con total/dedup y sin parcial en error, BOM/ñ/tildes/comillas/saltos, neutralización fórmulas tras blancos/control. Sin alterar vista H6.1, dashboard o renderer. Residual sin snapshot transaccional/memoria por volumen.

OS se guarda primero; enseguida carga PDF opcional en misma experiencia. Cancelar/fallar mantiene OS válida sin archivo. Cargar/reemplazar después solo VIGENTE; consultar/descargar historia confirmada también ANULADA para roles H7. Archivo no es requisito de facturación/pago. Error/foco/teclado/temas/borradores, sin afirmar forced-colors ejecutado.

## DES-H7-008 — PDF OS privado y SUNAT opcional

Reutilizar patrón H6 de validación/reserva/confirmación, no sus tablas/endpoints/bucket. Séptima tabla **técnica** orden_servicio_archivo se justifica por versiones y recuperación DB/Storage; un path mutable en OS perdería historia.

Campos: UUID, OS FK, numero_version, object_key único generado servidor sin PII, PREPARADO/CONFIRMADO/ABORTADO, MIME/bytes/SHA256 calculados servidor, actor/instantes y versión OS/base esperada. UNIQUE(OS,numero_version), una reserva activa por OS; versiones asignadas bajo lock OS. Actual = última CONFIRMADO, nunca último intento; sin nuevo estado negocio ni URL pública. Total siete tablas: seis negocio + una técnica.

Bucket privado h7-os; sin acceso directo anon/authenticated ni URL pública. Dos Edge acotadas propuestas os-pdf-cargar/os-pdf-descargar, además de eventual SUNAT, justificadas por decisión humana PDF OS. JWT validado, actor del token/rol y recurso comprobados DB/RLS antes de service_role solo para bytes. React envía OS/ID archivo y bytes, nunca key/bucket/URL/hash/actor. Sin API genérica.

Protocolo:
1. Autorizar; reservar PREPARADO bajo lock OS vigente/versión esperada. DB genera UUID/key/base. Sin IO Storage dentro de lock.
2. Edge limita lectura aun sin Content-Length: máximo5MiB, PDF simple hasta20páginas. Validar extensión/MIME/firma/estructura; rechazar vacío/corrupto/cifrado/formularios/contenido activo/enlaces externos/archivos internos y estructuras no verificables conservadoramente. No HTML/ZIP. Validación no es antivirus/CDR.
3. Subir objeto nuevo sin upsert; confirmar transacción DB revalidando rol/OS/versión/base. Metadatos servidor, CONFIRMADO/auditoría/updated_at OS atómicos. Previa versión confirmada inmutable. Si se anuló OS/cambió contexto: conflicto, no publicar nueva.
4. Fallo conserva previa descargable y operación PREPARADO/ABORTADO consultable; recuperar explícitamente la misma operación, sin nueva subida/reserva automática. PREPARADO/ABORTADO no descargables.

Descarga/vista previa: Edge revalida rol/vínculo OS↔versión CONFIRMADO y entrega bytes con headers seguros, key solo servidor. Historia aun OS anulada autorizada. No interpretar contenido como HTML; nombre descarga saneado de serie/correlativo sin PII.

DB y Storage no transacción distribuida: upload con confirmación fallida puede dejar huérfano; conciliación/limpieza manual, sin jobs/colas. Nunca borrar confirmados por reemplazo; purga definitiva H9/release. No usar objetos H6 ni crear motor financiero de archivos.

TASK-H7-008, enmienda humana 25/11/2026: consultar-ruc usa exclusivamente GET https://openruc.com/api/ruc/{ruc}, proveedor externo autorizado, distinto de una API oficial SUNAT/CPE. JWT/rol vigente antes y después del I/O; entrada cerrada RUC 11 dígitos/verificador/prefijo20; timeout total 5 s, cuerpo proveedor máximo32KiB, JSON/esquema/RUC coincidente y as_of validados. Sin credenciales proveedor actualmente; sin service_role ni escritura DB, redirecciones, scraping/SSRF o consumo de _more. Retorno por proyección fija de ocho campos del proveedor más proveedor OpenRUC y consultado_at UTC generado en Edge. Modelo híbrido autorizado: empresa_patrocinadora agrega domicilio_fiscal text nullable (máx.500) y datos_tributarios JSONB nullable; misma RPC guardar_empresa_patrocinadora, control de versión, RLS y auditoría minimizada. CHECK servidor con lista exacta de diez campos, tipos, límites, fechas y RUC/verificador coincidente. No se aceptan _more ni extras. El formulario autocompleta razón social y domicilio si no fueron modificados durante la solicitud, permite correcciones operativas y conserva referencia original independiente. Solo Guardar empresa persiste ambos; consulta/edición recuperan referencia almacenada sin red externa automática. Nueva consulta fallida preserva referencia; cambio de RUC la invalida. Clientes antiguos que omiten nuevos campos conservan sus valores si RUC no cambia; cambio de RUC sin referencia la limpia. Datos antiguos quedan NULL sin backfill. Sin tablas/índices JSONB nuevos, historial, scheduler, API genérica ni cambios de facturación. Detalles y condiciones en openruc.md.

## Suficiencia y límites

Divergencias H4/HU14/HU15 resueltas en requisitos, sin nuevas OQ. Well-Architected con autoridad servidor, transacciones/recuperación, índices/paginación, reutilización Supabase y trazabilidad mínima; sin AWS. Preservar residuales, sin mediciones ni pruebas ejecutadas ahora. Gate 1 previo a código/migraciones/Edge/tests.
