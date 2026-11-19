# H6 — Expediente y documentos institucionales: design

Fecha: 18/11/2026 (America/Lima). **DRAFT / Gate 1 H6 PENDIENTE. Construcción NO AUTORIZADA.**
Rama: `feature/h6-expediente-spec`. Base exacta de main: `1228a028fc203e0319340b5b55d7d9aa99802760`, merge [PR #3 H5](https://github.com/fcamasca/perumar-supabase/pull/3). CI main [44381503820](https://github.com/fcamasca/perumar-supabase/actions/runs/44381503820) SUCCESS antes de crear la rama. H5 [CLOSED / ACEPTADO / INTEGRADO](../H5-enrollment-pdf/acceptance.md), candidato final `a19520a1733dca53b38bfe1463d0473304c88d86`, 440/440; cierre `1551538f1fdd190a4a70da402883734c40ff30f1`, CI `44379188039` SUCCESS. [GATE-A01 APROBADO CON AJUSTES](../../architecture/GATE-A01-continuidad-supabase.md).

Esta entrega contiene exclusivamente requirements.md, design.md, tasks.md y test-plan.md. No implementa código/SQL/React/Edge, tablas, buckets, Storage, migraciones ni dependencias H6. Todos los TEST-H6 están **NO EJECUTADOS**. Las decisiones humanas OQ-H6-001 a 006 quedan RESUELTAS en esta revisión sobre la base `cff11ab339ca9dc4ec32283631c7fb68f57d59a3`. El diseño técnico aún se somete a Gate 1, que sigue PENDIENTE; resolver OQ no autoriza construcción. No se crea acceptance ni Gate 1 automático.

## Recorrido propuesto

React solicita operaciones específicas bajo sesión confirmada. PostgreSQL mantiene condiciones, estados, historia, versiones, autorización y contadores derivados mediante constraints/RLS/RPC concretas. Tres Edge de propósito específico atienden bytes/generación bajo JWT; Storage privado conserva archivos. No API adicional ni abstracción multicloud. Ninguna llamada cliente decide estados, object_key, actor, hash, permisos o fuente.

El modelo conceptual humano de tres entidades se conserva. Se propone **una cuarta tabla de archivos/versiones**, estrictamente justificada por reemplazo inmutable, reserva/confirmación y recuperación ante fallo entre DB/Storage; no otro catálogo ni un motor de workflow. Es propuesta de esquema para Gate 1, no tabla creada.

## Diseño trazable

### DES-H6-001 — Frontera y gates

REQ-H6-001. El trabajo actual es exclusivamente documental. OQ-H6-001 a 006 RESUELTAS HUMANAMENTE; Gate 1 sigue PENDIENTE. Tras Gate 1 implementar por bloques con pruebas progresivas; detener expansión si exige API adicional, S3, worker, editor o motor de reglas. Los objetos técnicos propuestos se revisan en Gate 1, sin convertir las seis decisiones de negocio en permiso de construcción. H5 y seis residuales son base aceptada, no evidencia ejecutada H6.

### DES-H6-002 — tipo_documento

REQ-H6-002. Proponer tabla con UUID PK, codigo único normalizado (máx. 40), nombre (150), descripcion (500), origen con CHECK SUBIDO/GENERADO, activo, created_at/updated_at. Evitar enum/catalogo extra; constraints y comando específico. Nueve tipos candidatos para revisión de Gate 1: Documento de identidad (DNI/Carné de extranjería ya admitidos en H3), foto pasaporte, certificado psicofísico, certificado de estudios, cuatro formatos generados y Ficha H5. El listado es propuesta de carga inicial de tipos, nunca configura todos los Ciclos ni importa personas. Código/origen referenciados no se cambian. Sin DELETE funcional. Propuesta de integridad: impedir inactivar el tipo mientras tenga configuración de Ciclo activa; desactivar primero la configuración expresamente. Nunca omitir silenciosamente un ciclo_documento activo por un tipo inconsistente.

### DES-H6-003 — ciclo_documento

REQ-H6-003. ciclo_documento: UUID PK, ciclo_id FK, tipo_documento_id FK, obligatorio, activo, timestamps y UNIQUE(ciclo_id,tipo_documento_id). No reasignar tipo de configuración aplicada. guardar_documentos_ciclo valida versiones y configuración completa esperada, toma lock Ciclo → todos los Alumnos ACTIVO afectados UUID → todas sus Matrículas UUID → configuración/aplicaciones UUID, y guarda + sincroniza + audita en UNA transacción. No saltar matrículas por paginación, ejecutar backfill background ni hacer commit parcial. Verificar conjunto de IDs/versiones de configuración además de expected_updated_at de Ciclo para detectar altas concurrentes que no estaban en pantalla. Sin mutar aplicaciones de matrícula ANULADO ni contextos anteriores. OQ-001 determina la matriz de sincronización detallada debajo; no reasignar aplicaciones históricas.

### DES-H6-004 — matricula_documento y alta atómica

REQ-H6-004. matricula_documento: UUID PK, matricula_id/ciclo_documento_id/tipo_documento_id FK, contexto_id UUID servidor, contexto_vigente boolean, codigo/nombre/origen de aplicación, obligatorio efectivo, estado, activo, datos de inactivación/último retiro y timestamps; ultimo_archivo_confirmado_id nullable. UNIQUE(matricula_id,contexto_id,ciclo_documento_id), más unicidad de aplicación del contexto vigente por matrícula/configuración aunque esté retirada; no UNIQUE global que impida volver al mismo Ciclo. contexto_vigente es marcador de relación histórica independiente de activo: un retiro individual mantiene contexto_vigente=true; TRASLADO lo deja false y activo=false para todo el contexto, sin retorno a true. Guard y comandos aseguran un contexto vigente por matrícula y vínculos de tipo/configuración/archivo correctos; ningún catálogo o tabla de contextos adicional. Un AFTER INSERT específico aplica todos los documentos activos en contexto nuevo usando lock Ciclo de registrar_matricula; fallo revierte matrícula/cargos/snapshot/aplicaciones/auditoría. Guardar configuración/regularizar reutilizan la lógica de aplicación/sincronización, sin tocar historial de contextos pasados. Si no hay documentos no crear relaciones ficticias: al aplicar el primer documento asignar UUID de contexto actual.

### DES-H6-005 — Obligatoriedad aplicada

REQ-H6-005. Origen/código/tipo y contexto histórico son estables; obligatorio efectivo y activo NO son snapshots inmutables: solo cambian por guardar configuración, regularización autorizada o retiro/traslado específico. Impedir retiro individual de obligatorio, pero permitir inactivación por CONFIGURACION_DESACTIVADA/TRASLADO como decisiones de contexto. Conversión opcional→obligatorio en configuración activa reactiva incluso retiro individual y preserva estado/puntero/bytes. Conversión obligatorio→opcional mantiene activo si ya lo estaba y permite retiro posterior, sin retirar automáticamente. Audit append-only de flags anteriores/nuevos, actor, fecha, versión y causa codificada preserva historia sin copiar PII. DML/DELETE cliente cerrados y guard específico; nunca volver histórico de traslado a contexto vigente.

### DES-H6-006 — Retiro acotado y transaccional

REQ-H6-006. Una RPC retirar_documentos_opcionales acepta ciclo_id, documento de configuración y lista explícita de hasta 50 IDs de matrícula/documento con versiones esperadas y motivo (1–500). Solo Director/Coordinador activos. Lote debe pertenecer al mismo Ciclo, sin duplicados; lock estable y comprobar cada fila activa/opcional/contexto antes de escribir. Si una es obligatoria, ajena, obsoleta o no autorizada: rollback total y error identificable sin PII, no éxito parcial. Conserva estado/ultimo_archivo_confirmado_id/versiones; auditoría por afectado y correlación del lote. React mantiene selección para decisión explícita tras conflicto.

### DES-H6-007 — Lectura derivada

REQ-H6-007. Vista security_invoker específica o consulta equivalente bajo RLS: contar solo aplicaciones del contexto vigente con activo=true. Pendientes=estado PENDIENTE, incluidos opcionales; completados=CARGADO/GENERADO. Cambiar fuente/plantilla no convierte GENERADO en PENDIENTE ni altera conteos: mostrar indicador derivado histórica/desactualizada separado. Filtrar retirados/contextos anteriores de resumen actual, pero ofrecer sus documentos/versiones en Historia autorizada. Paginación estable y agregado DB antes de paginar, sin descargar todo a React para contar. Cero aplicables: Sin documentos aplicables.

### DES-H6-008 — Ubicación UX

REQ-H6-008. Reutilizar pestañas/grillas existentes. Ciclo: Documentos para configuración; Matrículas conserva la grilla y añade resumen derivado y selección explícita de alumnos para retiro del opcional elegido. Ficha matrícula: pestaña Expediente con resumen y grilla Documento | Origen | Obligatorio/opcional | Estado | Acciones. Diferenciar configuración del Ciclo y expediente del alumno; editar uno no cambia otro. Sin pantalla independiente con navegación redundante ni asistente Siguiente/Anterior. Mantenimiento del maestro Tipos de documento con búsqueda por código/nombre, grilla compacta, acciones ver/editar/nuevo a la derecha y formulario de sus campos; reutilizar estándares visuales existentes, sin mantenimiento genérico de catalogo_valor ni editor de plantillas.

### DES-H6-009 — Bucket y claves

REQ-H6-009. Proponer un bucket privado h6-expediente separado de h5-fichas temporales. object_key generado servidor con UUID de operación/archivo, sin nombres/DI/Curso ni paths cliente; no upsert. Bucket y keys no son autoridad: revalidar vínculo DB. No policies Storage que den acceso directo a anon/authenticated. Solo Edge con service_role para bytes, tras JWT/RLS y autorización DB; no DML SQL sobre storage.objects. Sin guardar URLs o bytes en tablas de negocio.

### DES-H6-010 — Límites y validación de carga

REQ-H6-010. Propuesta técnica para Gate 1: máximo 5 MiB por archivo, PDF hasta 20 páginas, imagen JPEG/PNG hasta 20 megapíxeles; una carga por petición, sin ZIP/lotes de bytes. Tipo Foto solo JPEG/PNG; demás SUBIDO PDF/JPEG/PNG. Medir bytes al leer con límite y abortar, aun sin Content-Length. Rechazar extensión/MIME/firma discordantes, doble extensión peligrosa, archivo vacío/corrupto, descompresión/imagen fuera de presupuesto, PDF cifrado/con JavaScript, acciones ejecutables, adjuntos o recursos remotos. Parser dentro del presupuesto; no abrir contenidos en HTML del navegador. La inspección estructural no equivale a antivirus/CDR ni certifica ausencia de malware; si no puede verificarse de forma fiable, rechazar y reportar límite, no agregar infraestructura por cuenta propia.

### DES-H6-011 — Reserva técnica y confirmación

REQ-H6-011. Cuarta tabla técnica matricula_documento_archivo: UUID, matricula_documento_id, object_key único, estado_tecnico PREPARADO/CONFIRMADO/ABORTADO, iniciado_por/at, confirmado_por/at, MIME/bytes/SHA256, nombre original saneado opcional, plantilla_version/fuente_fingerprint, fecha_generacion y datos_generacion específicos de lista cerrada cuando procedan, version_esperada_documento y timestamps. No nuevo estado de negocio. Datos explícitos de apoderado se fijan inmutables en la versión generada bajo RLS, nunca auditoría ni maestro de personas; no duplicar la ficha completa en JSON. Reserva/confirmación/aborto solo service_role desde Edge tras getUser y lectura JWT/RLS; actor/plantilla/metadatos proceden de servidor. DB genera UUID/key, calcula huella canónica y revalida actor/contexto/versión/activo/obligatorio tras locks. Confirmación actualiza versión confirmada, puntero, estado y auditoría atómicos; nunca IO Storage dentro de lock DB. Una reserva PREPARADO por documento/versión; respuesta incierta se consulta por lectura autorizada, sin reservar otra a ciegas. Sincronización/traslado que cambien versión impiden confirmar silenciosamente una reserva previa.

### DES-H6-012 — Versionado sin sobrescritura

REQ-H6-012. Cada carga/reemplazo/generación crea archivo nuevo, sin upsert, y deja versiones CONFIRMADO inmutables. ultimo_archivo_confirmado_id apunta solo a archivo confirmado propio mediante FK/guard: no lo llamar autoridad de versión actual. Para GENERADO actual se deriva con contexto vigente, activo, fuente y versión de plantilla vigentes; si dejan de coincidir, conserva puntero/estado GENERADO/bytes pero se muestra en Historia desactualizada, descargable autorizado. Retiro y traslado no borran puntero ni versiones. Dos confirmaciones compiten por versión de aplicación: una gana, otra PT409 sin segundo éxito; replay explícito del mismo UUID/resultado recupera sin duplicar evento y payload diferente se rechaza.

### DES-H6-013 — Descarga específica

REQ-H6-013. Edge expediente-descargar recibe archivo_id/documento_id y alcance de presentación actual/historia; nunca bucket/key/URL cliente. getUser, rol académico vigente, lectura JWT/RLS y vínculo de versión exacta antes de Storage; revalidar acceso tras esperas y antes de responder. Historia incluye reemplazados, retirados, contextos de traslado, fuente/plantilla desactualizadas y matrícula ANULADO o Ciclo DESIERTO/ANULADO: tales estados no revocan por sí solos lectura de confirmados autorizados. Si se pidió actual y cambió a histórico durante espera, conflicto de presentación y acceso explícito por Historia, no rechazo permanente de la versión. Rol revocado siempre deniega bytes. Entregar original confirmado sin regenerar ni consultar una fuente de render actual para descargar historia, con attachment/nosniff/private,no-store y auditoría de inicio. No reutilizar requireEligible temporal H5 para bloquear esta descarga H6; solo reutilizar autorización/proyección que corresponda.

### DES-H6-014 — Renderers institucionales

REQ-H6-014. Renderers fijos/versionados en expediente-generar para Solicitud, Declaración, Carta Poder, Ficha personal y copia H5. Lista cerrada, sin HTML/plantilla arbitraria. Todos admiten generación con matrícula ACTIVO y Ciclo PROGRAMADO/EN_CURSO/CERRADO; Solicitud no exige CERRADO, nota o resultado aprobado. Mantener texto institucional aprobado/referencial y permitir adaptación visual en revisión humana sin editor ni evaluación académica nueva. No inferir una afirmación de aprobado desde CERRADO ni inventar afirmaciones legales/académicas; texto referencial no certifica un resultado DB. Carta Poder requiere nombre completo e identificación del apoderado explícitos en CADA generación, con validación de identidad reutilizada de H3, nunca persona del Word/contacto emergente. Campos no existentes/no obligatorios, como L.M. o tratamiento personal no disponible, se dejan en blanco. Reutilizar componentes de maquetación/tipografía H5, español completo y multipágina, sin biometría/firma electrónica.

### DES-H6-015 — Proyección y huella

REQ-H6-015. Datos personales/contactos/etiquetas según CHG-H5-002: fuente vigente en PROGRAMADO/EN_CURSO, snapshot_cierre exclusivo en CERRADO; snapshot inicial y final intactos, sin fallback. Contexto autorizado al emitir. Fecha documento H6=generación real servidor America/Lima; edad a ese día desde nacimiento de la fuente seleccionada, no a matrícula ni al reloj React. El servidor calcula una fecha/edad por generación y la fija en esa versión. Apoderado explícito inmutable por versión y demás parámetros aprobados de lista cerrada se incluyen en procedencia, sin bolsa JSON genérica ni reutilizarlo automáticamente para próxima generación. Huella canónica DB cubre fuente/contexto/id de contexto/plantilla/perfil H6 y datos específicos que afectan el PDF; excluye instante real de emisión y la edad derivada solo de ese instante, para no invalidar por consultar más tarde la misma fuente. Fecha/edad impresas describen cuándo se generó la versión y nunca se recalculan al descargarla. Cambios de fuente/contexto/plantilla entre reserva y confirmación dan PT409 sin publicar archivo. Lugar se deriva del distrito/Capitanía del Ciclo donde corresponda, no de ejemplo fijo del Word.

### DES-H6-016 — Coexistencia H5 y H6

REQ-H6-016. Ficha H6 es GENERADO y escribe su objeto persistente propio, con renderer y selección de fuente CHG-H5-002 compartidos; no copia artefacto temporal, depende de TTL/bucket ni duplica renderers. Diferenciar proyección/perfil fijo H6 de fecha/edad de documento (generación real Lima) de campos históricos identificados como fecha de matrícula, que conservan su valor. Factorización mínima de parámetros/proyección reutiliza maquetación con versión de plantilla H6 propia, sin motor genérico. La ruta temporal H5 mantiene su contrato aceptado: fecha/edad a matrícula donde estaban definidas, TTL24h y descarga obsoleta bloqueada; no modificar esos defaults/condiciones ni Specs históricos. En H6, fuente/contexto/plantilla distintos dejan la generación previa como histórica/desactualizada descargable, con GENERADO y bytes intactos; regenerar explícitamente para actual. Nunca persistir OBSOLETO ni volver PENDIENTE por desactualización.

### DES-H6-017 — Matriz de permisos propuesta

REQ-H6-017. Director/Coordinador son roles funcionales del expediente y su mantenimiento/configuración; ADMIN_SISTEMA solo, anon, bloqueado o revocado sin acceso a PII/bytes. Mutaciones de documentos con matrícula ACTIVO y Ciclo PROGRAMADO/EN_CURSO/CERRADO, sin restricciones especiales por formato (solo SUBIDO usa cargar y GENERADO usa generar). Matrícula ANULADO o Ciclo DESIERTO/ANULADO bloquea nuevas mutaciones, NO consulta/descarga autorizada de confirmados históricos. Configurar/regularizar Ciclo requiere contexto admitido y sincroniza solo matrículas ACTIVO; no modificar las ANULADO. SELECT RLS cubre también documentos/archivos inactivos e históricos para ambos roles autorizados, sin filtrar solo activo=true ni conceder acceso por posesión de UUID. Sin DML sensible autenticado directo/Storage cliente; service_role acotado a preparación/confirmación/aborto/auditoría y bytes tras identidad confirmada, nunca p_actor de React.

### DES-H6-018 — Orden de locks y contrato de errores

REQ-H6-018. Ciclo(s) UUID → Alumnos UUID → Matrículas UUID → configuración/aplicaciones/archivos UUID, con relectura de pertenencia/rol/estado/versiones tras locks. guardar_documentos_ciclo y regularizar_expedientes_ciclo bloquean todas las matrículas ACTIVO afectadas y sincronizan/auditan todo en una transacción; no partir en lotes ni encolar background. Configuración esperada incluye conjunto/versión de filas para detectar altas ajenas a la pantalla, no solo timestamp académico que podría no cambiar. Retiro individual concurrente con conversión a obligatorio o reactivación se serializa: debe reevaluar condición y versión, no ganarle a la obligatoriedad por dato React obsoleto. Descargar histórico usa matriz de lectura, no la de mutación; revocar rol deniega siempre y anular solo bloquea confirmaciones nuevas. PT409/HTTP409 lógicos, 40001/40P01 reales visibles sin retries.

### DES-H6-019 — Compatibilidad H3/H4 y existentes

REQ-H6-019. Traslado autorizado por reglas H4 toma Ciclos UUID antes de Alumnos/Matrículas y desactiva todas las aplicaciones del contexto anterior con contexto_vigente=false y causa TRASLADO, incluidas ya retiradas; conserva estado, condiciones registradas, puntero, bytes, versiones e historia. Crea UUID de contexto nuevo y aplicaciones de TODOS los documentos activos destino como activos/PENDIENTE, obligatorios/opcionales, sin mover/copiar/reutilizar bytes. Volver al Ciclo anterior repite contexto nuevo: nunca seleccionar sus filas históricas como actuales por coincidir ciclo_documento_id. Regularización inicial es RPC específica por Ciclo, auditada/transaccional para matrículas ACTIVO; crea contexto/aplicaciones faltantes y repara condiciones efectivas sin duplicar ni borrar, sin reset/backfill background. H6 no altera bloqueos de traslado por pagos, finanzas, códigos/snapshots ni atomicidad H3/H4/H5.

### DES-H6-020 — Auditoría específica

REQ-H6-020. Eventos mínimos de tipo/configuración y sincronización: registrar IDs, versiones de configuración, contexto, cambios activo/obligatorio previos/nuevos y causas codificadas (CONFIGURACION_DESACTIVADA, CONFIGURACION_REACTIVADA, OBLIGATORIEDAD_ACTUALIZADA, RETIRO_INDIVIDUAL, TRASLADO, REGULARIZACION), actor/fecha/correlación. Conservar auditoría append-only aunque se reactive aplicación. Aplicación, retiro, confirmación y auditoría de éxito atómicos con operación; fallo de cualquier fila revierte todo el guardado de configuración o regularización. No contenido/snapshots/nombres/DI/filename/keys/URLs/JWT/hash ni apoderado en auditoría general. Datos imprescindibles de apoderado pertenecen a metadata protegida de la versión. No trigger genérico de PII; DESCARGA_INICIADA no prueba entrega/impresión.

### DES-H6-021 — Retención y huérfanos

REQ-H6-021. OQ-004 RESUELTA PARA MVP: confirmar implica persistencia, sin TTL24h ni purga funcional de confirmados o eliminación por retiro/anulación/cierre. Historia de actuales/reemplazados/retirados/traslado/desactualizados/anulados disponible a roles autorizados. Solo conciliación manual acotada, con dry-run y máximo50 reservas/objetos nunca confirmados mayores24h, revalidando antes de borrar; no tocar CONFIRMADO aunque sea histórico o sin puntero actual. Ese umbral es técnico de huérfanos, no retención documental. Política definitiva institucional/legal pendiente para H9/release, sin nueva OQ H6 ni scheduler/cola/S3.

### DES-H6-022 — Interacción y accesibilidad

REQ-H6-022. Acciones cargar/generar/descargar por fila con nombre accesible/tooltip; retiro en Más acciones y confirmación con documento/número de alumnos y aviso de conservación. Obligatorio con explicación no retirable. Mostrar PENDIENTE/CARGADO/GENERADO separados de Retirado y de diagnóstico de vigencia, sin inventar nuevos estados de negocio. Guardar deshabilitado sin cambios; success visible, errores junto a archivo/campo, foco claro, selección/borrador intactos al fallar, Escape/clic fuera según componente existente. Grilla compacta adaptable, cifras alineadas y sin depender solo de color; usar tokens/temas y no ocultar forced-colors pendiente.

### DES-H6-023 — Validación y entrega técnica futura

REQ-H6-023. Ejecutar progresivamente lint/tipos/unidades, reset solo desechable, integración DB/PostgREST/Edge/Storage, RLS matrix, carreras/rollback, contenido real/PDF, build/build-safety y regresión H1–H5, expiración y rebuild. No reemplazar carreras H4 ni pruebas de snapshot H5. Fixtures sintéticos y outputs ignorados. Registro técnico/humano después de construir, candidato/CI exactos, inventario final y OQ cerradas; Gate 2 futuro, no acceptance ahora.

### DES-H6-024 — Inventario proporcional y referencias

REQ-H6-024. Incremento propuesto: cuatro tablas documentales, hasta una vista invoker, un bucket privado persistente, tres Edge acotadas, ocho RPC específicas y dos helpers privados. La octava RPC regularizar_expedientes_ciclo responde expresamente a OQ-001 resuelta; no añade tabla/servicio ni API generalista. Reusar helper de aplicación/sincronización de configuración para alta, guardado y regularización, más guard de historia. Ningún objeto se crea ahora. Presupuestos técnicos para Gate1 se conservan (carga5MiB, generación2MiB, límites de parseo), con mediciones futuras/revisión de costos y seis residuales; no ampliar arquitectura ante un límite.

## Sincronización efectiva al guardar configuración — OQ-H6-001 resuelta

Objetivo: solo aplicaciones del contexto vigente de matrículas ACTIVO del Ciclo. No confundir contexto_vigente con activo individual. Conservar siempre estado, ultimo_archivo_confirmado_id, versiones y bytes al modificar condiciones de la misma aplicación. Nueva aplicación sí nace PENDIENTE.

| Cambio confirmado de configuración | Efecto transaccional en el contexto actual |
| --- | --- |
| Alta de documento activo | Crear aplicación faltante activa/PENDIENTE, con obligatoriedad efectiva |
| Inactivo→activo | Volver a aplicar: reactivar aplicación actual existente conservando estado/archivos o crear si faltaba; ambos obligatorios/opcionales nacen aplicables tras esa reactivación explícita |
| Activo→inactivo | activo=false por CONFIGURACION_DESACTIVADA, sin borrar registro/estado/archivo ni contexto vigente |
| Opcional→obligatorio con configuración activa | obligatorio=true y activo=true, incluso retirado individualmente; conservar CARGADO/GENERADO y bytes si existían |
| Obligatorio→opcional | Actualizar obligatorio=false; conservar aplicabilidad actual, no retirar ni borrar automáticamente |
| Sin transición de activo/obligatorio en esa configuración | Conservar retiro individual de opcional; guardar otra fila no resetea exclusiones individuales |
| Configuración inactiva con cambio de obligatorio | Mantener no aplicable; la obligatoriedad efectiva se ajusta sin reactivar hasta que la configuración se reactive |

Regularización inicial usa la misma lógica para crear lo faltante y comprobar condiciones, en una RPC explícita por Ciclo; repetirla sin cambios no duplica filas ni borra retiros válidos. No sustituye guardado transaccional por backfill background. Ninguna de estas operaciones selecciona aplicaciones históricas de un traslado, aunque la matrícula haya vuelto al mismo Ciclo.

Una sola transacción incluye guardar configuración, sincronizar todas las aplicaciones afectadas, actualizar versiones y auditar cambios. Si falla una fila/versión/rol o la auditoría, rollback total, incluidas las filas ciclo_documento. El límite50 corresponde al retiro opcional solicitado por selección; no autoriza partir una sincronización del Ciclo en commits parciales.

## Matriz uniforme de operación

| Contexto y rol | Cargar/generar/reemplazar/regenerar/retirar opcional | Consultar/descargar confirmados autorizados |
| --- | --- | --- |
| Director/Coordinador, matrícula ACTIVO y Ciclo PROGRAMADO/EN_CURSO/CERRADO | Permitido según origen y validaciones del archivo; Solicitud incluida sin condición académica adicional | Permitido actual e Historia |
| Director/Coordinador, matrícula ANULADO o Ciclo DESIERTO/ANULADO | Bloqueado | Permitido por Historia, claramente identificado |
| ADMIN solo, sin rol académico, anon, bloqueado o rol revocado | Bloqueado | Bloqueado |

Sin estados VALIDADO/IMPRESO/OBSOLETO ni resultado aprobado/desaprobado/nota. La marca histórica/desactualizada se deriva de fuente/contexto/plantilla o de pertenencia/historia, no es nuevo estado documental. Una descarga histórica no habilita mutaciones ni relaja la protección de H4.

## Inventario propuesto y necesidad de cada comando

Base H5: 24 tablas públicas, 4 vistas, 20 funciones públicas, 19 helpers privados, 27 policies de negocio; un bucket/Edge H5 temporal. H6 no crea ningún objeto en fase Spec. Si se aprueba este diseño, incremento inicial propuesto: 4 tablas, como máximo 1 vista invoker de resumen, 1 bucket privado persistente, 3 Edge, 8 RPC y 2 helpers privados. Policies SELECT por tabla y vista invoker bajo permisos de tablas, sin políticas Storage para clientes. Cualquier incremento adicional exige justificar el requisito antes de construir; no wrappers solo por uniformidad.

| Comando propuesto | Acceso / datos de entrada cerrados | Necesidad |
| --- | --- | --- |
| guardar_tipo_documento | JWT académico autorizado; campos del maestro y versión esperada; código/origen referenciados estables | REQ-002, sin CRUD generalista |
| guardar_documentos_ciclo | JWT Director/Coordinador; Ciclo/versión y conjunto/filas de configuración esperadas | REQ-003/018: guarda y sincroniza todas las matrículas ACTIVO en una transacción |
| regularizar_expedientes_ciclo | JWT Director/Coordinador; Ciclo y versiones esperadas | REQ-004/019, OQ-001: aplicación inicial explícita a existentes, auditada y transaccional, sin background |
| retirar_documentos_opcionales | JWT Director/Coordinador; un Ciclo, configuración y hasta50 documentos/matrículas con versiones, motivo | REQ-006, lote atómico específico |
| preparar_archivo_expediente | Solo service_role desde Edge tras getUser/lectura JWT; documento/versión y actor/plantilla confirmados por servidor; DB genera UUID/key y fingerprint | REQ-011/012; reserva técnica, no confirma bytes ni acepta paths cliente |
| confirmar_archivo_expediente | Solo service_role desde Edge; actor de getUser, reserva, metadatos calculados servidor y versión/fuente | REQ-011/012/015; confirma estado/puntero/auditoría atómicos, vuelve a autorizar actor |
| abortar_reserva_expediente | Solo service_role; reserva/actor/contexto, sin borrar versiones confirmadas | REQ-011/021; compensación técnica acotada, no DELETE funcional |
| registrar_descarga_expediente | Solo service_role desde Edge; archivo/contexto y actor confirmado | REQ-013/020; revalidación y auditoría de inicio, no lectura arbitraria |

Helpers privados propuestos: aplicación/sincronización documental para registro de matrícula, guardado de configuración y regularización explícita (REQ-003/004/019), más guard de historia/archivos (REQ-005/012). Reutilizar authorize, require_version y timestamps; no dispatcher SQL dinámico. La regularización específica es parte del alcance decidido, no OQ abierta. Actualizar la operación de traslado existente conservando sus restricciones financieras y firmas; no helper de reutilización automática de archivos.

Edge propuestas: expediente-cargar (SUBIDO, multipart limitado), expediente-generar (GENERADO, IDs/versiones y campos específicos solo aprobados) y expediente-descargar (archivo/contexto, bytes autorizados). No aceptan SQL, tabla, plantilla HTML, renderer arbitrario, bucket, URL, object_key, actor ni hash decididos por React. Orígenes desplegados explícitos y JSON/headers acotados, sin secretos cliente. No una función universal de documentos con rutas dinámicas.

## Protocolo de archivo y resultado incierto

1. Edge valida getUser, autorización académica y lectura JWT/RLS del documento/contexto; parsea petición y contenido con presupuesto sin almacenarlo públicamente.
2. Reserva mediante RPC service_role acotada, actor/plantilla confirmados por Edge, UUID generado por DB, versión esperada y contexto/fuente calculados en DB. Clave objeto servidor e inmutable; no lock DB durante Storage.
3. Edge escribe bytes nuevos sin upsert; valida respuesta e integridad/metadatos calculados servidor.
4. Confirmación bajo orden de locks; revalida actor, contexto, versión, activo/origen y fuente. Transacción única confirma archivo, puntero, estado y auditoría de éxito.
5. En fallo: mantener versión/estado anterior, compensar objeto o registrar reserva no confirmada para limpieza manual. No prometer rollback de bytes distribuido ni borrar confirmado.
6. Si respuesta es incierta: consultar operación/archivo por lectura autorizada. Si ya confirmó, recuperar resultado; si no se sabe, informar y esperar decisión humana. No upload/generate/retry automático ni nuevo UUID oculto. Confirmación repetida explícita del mismo UUID/resultado es idempotente; payload diferente o ajeno da conflicto.

Carga activa no se publica mientras PREPARADO. Retiro concurrente bloquea confirmación/reactivación silenciosa. Una reserva pendiente no suma completados. No mantener una segunda copia arbitraria de PII de plantilla en JSON: usar la fuente existente; los datos explícitos de apoderado permitidos por OQ-005 se modelan con lista cerrada por versión, excluidos de auditoría y sin copiar la ficha completa ni crear bolsa de campos.

## Contratos funcionales de error

| Situación | Respuesta propuesta | UX / efecto |
| --- | --- | --- |
| JWT inválido/expirado | 401 SESSION | Iniciar sesión; sin retry/bytes |
| Rol/contexto no autorizado o recurso ajeno | 403 ACCESS o respuesta no reveladora consistente | Sin PII ni existencia ajena; sin éxito |
| Archivo inválido / excede límite | 422 FILE_INVALID / 413 LIMIT | Error junto al archivo, estado previo intacto |
| Versión, estado, activo, fuente o contexto cambiados | PT409 / HTTP409, códigos acotados VERSION/SOURCE_CHANGED/STATE | Conservar borrador/selección, recargar/consultar y decidir |
| 40001/40P01 real PostgreSQL | Conflicto visible | No RAISE deliberado con40001; no retry SDK/React/Edge |
| Fallo Storage/DB o resultado incierto | 503 UNAVAILABLE / respuesta de operación incierta | No CARGADO/GENERADO ficticio; consultar UUID explícitamente |

## Decisiones resueltas y límites

[OQ-H6-001 a 006](requirements.md#oq-resueltas-por-decisión-humana): RESUELTAS HUMANAMENTE en esta revisión. Prevalecen sobre propuestas iniciales de condiciones inmutables, cambios solo para nuevas matrículas o bloqueo de descarga histórica. La política definitiva de eliminación se difiere expresamente a H9/release; no es OQ H6 pendiente. Diseño técnico sujeto a revisión de Gate1, que no se registra ni aprueba aquí. Sin construcción ni nuevos objetos.

## Referencias técnicas primarias consultadas el 18/11/2026

- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control): permisos Storage y uso privilegiado que evita RLS requieren frontera servidor explícita.
- [Standard Uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads): selección de mecanismo y límites de carga; el límite H6 de5MiB es propuesta propia conservadora, no cuota declarada de Supabase.
- [Edge Functions limits](https://supabase.com/docs/guides/functions/limits): revisar límites reales del runtime; bytes/tiempo local no acreditan CPU/memoria hospedadas ni aptitud de este parser.
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): defensa por capas, tipo/contenido/tamaño/nombre/acceso; no tratar extensión, MIME o firma aislados como prueba suficiente.

Seguridad: autorización/IDOR/secretos/PII; fiabilidad: transacción y compensación; operación: conciliación/errores/evidencia; rendimiento: límites/batches/paginación/medición; costos: bytes/versiones/descargas/retención con supuestos. Son criterios OWASP y AWS Well-Architected, no razones para desplegar AWS o nuevas capas. No se certifica conformidad legal de plantillas ni seguridad antimalware absoluta.
