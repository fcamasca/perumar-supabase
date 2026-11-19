# H6 — Evidencia técnica del candidato

Último registro humano: **19/11/2026, America/Lima**. **Gate 2 APROBADO HUMANAMENTE sobre ca7a4613e5e8f23d6942b2cb6f75309816f04f12**, CI44443096743 SUCCESS,483/483 pruebas técnicas y siete bloques humanos PASSED; [registro](gate-2.md). El usuario autorizó posteriormente incluir los ajustes revisados de HEAD1260712 y del árbol local: publicar un nuevo candidato, verificar su CI y cerrar sin repetir pruebas humanas. Las menciones humanas pendientes de las secciones técnicas siguientes son históricas o propias de esos ajustes posteriores; no anulan el Gate2 aprobado ni acreditan pruebas adicionales. Forced-colors real sigue NO VERIFICADO. El cierre y merge requieren CI propia SUCCESS del nuevo candidato; H7 NO INICIADO.

## Trazabilidad histórica del candidato original

- Spec exacto aprobado: `e2de23443f887d4050aeb910a13e3611ae751be5`; [Gate 1 humano](gate-1.md), CI44399674178 SUCCESS. requirements/design/tasks/test-plan permanecen byte a byte iguales al Spec aprobado; sus estados históricos no se reescriben.
- Rama: `feature/h6-expediente`, descendiente del Spec exacto. Main de referencia H5: `1228a028fc203e0319340b5b55d7d9aa99802760`; no se modifica ni integra H6 en esta entrega.
- **Candidato funcional: `0ea69b34c23c4b4b93a227e7b8e458ee30b93876`**. [CI44440069229](https://github.com/fcamasca/perumar-supabase/actions/runs/44440069229): **COMPLETED / SUCCESS**, incluidas expiración y reconstrucción con repetición H1–H6.
- **483/483 unidades PASSED,29 archivos**; lint, typecheck, Deno2.1.4 con locks congelados, build y build-safety PASSED. `git diff --check` y comparación del Spec PASSED localmente.
- El paquete posterior añade documentación y regresiones de archivos (PDF cifrado sintético, fallo inicial Storage/puntero y preservación CARGADO al cambiar configuración), sin cambios funcionales ni migraciones posteriores al candidato. La CI del SHA final se verifica y se informa con su identificador exacto en la entrega; no se presupone SUCCESS antes de terminar.

## Cambios locales posteriores durante revisión humana

La enmienda FOTO_ALUMNO incorpora una migración aditiva posterior (27 migraciones locales; demás objetos sin incremento), aplicada y verificada localmente. Prueba de preservación y regresión DB/API/concurrencia desechable completadas; detalle en implementation-log.md. Las cifras del inventario del candidato publicado abajo conservan su referencia histórica de26 migraciones.

Después del candidato publicado se corrigieron las cuatro composiciones institucionales y se añadió vista previa sintética del maestro, además de selección general de documentos del Ciclo y alineación de Activo. Detalle y verificaciones locales en implementation-log.md. Estos cambios funcionales locales **no están cubiertos por la CI histórica del candidato**; requieren publicar/verificar un nuevo candidato antes del cierre autorizado. Los cuatro documentos del Spec aprobado permanecen intactos. La evidencia de los runs anteriores conserva su alcance y sus SHA; no acredita nuevas ejecuciones humanas de estos ajustes; su inclusión fue autorizada expresamente sin repetir las pruebas.

## Bloques construidos

Primera puerta, antes de Storage: CI44408192177 SUCCESS sobre `da58db375677e2238e61628cc74f8c09032d12a2`. Modelo/locks/maestro/configuración/aplicaciones/sincronización/historia/RLS/retiro/resumen probados con DB/PostgREST reales desechables y regresión H1–H5.

Segundo bloque: bucket persistente privado, reserva/confirmación/aborto, carga con contenido verificado y descarga histórica reautorizada tras IO. Cinco renderers fijos; perfil H6 del renderer compartido H5 usa fecha/edad de generación en Lima. El perfil temporal H5, sus defaults, snapshots, TTL y reglas permanecen intactos. No se copia un temporal para crear el persistente.

Tercer bloque: maestro Documentos, pestaña Documentos del Ciclo, expediente por matrícula, resumen/faltantes, historia/versiones y selección múltiple por página. Configuración efectiva sincroniza TODAS las ACTIVO en una transacción, incluso existentes; no reset/backfill silencioso. Guardar sin cambios deshabilitado, alcance confirmado, éxito visible, borrador/selección conservados al fallar y retiro en Más acciones con teclado/foco/Escape/clic fuera. CERRADO admite operaciones H6 aunque el editor académico sea de consulta. Consultas de expediente paginan en servidor y separan faltantes actuales de pendientes históricos.

## Ejecuciones reales de CI

| Comprobación | Resultado / alcance |
| --- | --- |
| npm ci, lint, typecheck, typecheck:edge y typecheck:edge:expediente | PASSED; dependencias/acciones/runtime fijados y locks congelados |
| npm test | **483/483 PASSED** |
| supabase:start/reset/env, test:local | PASSED sobre stack CI desechable; inventario/RLS/grants comprobados |
| test:security / test:academic / test:enrollment | PASSED; Auth/RLS, invariantes, rollback, snapshot/historia/código y concurrencia previos |
| test:payments:rollback / isolated / payments | PASSED; **70+60 sobre saldo100**, dos sesiones SERIALIZABLE y barrera, un commit, sin sobrepago/retry |
| test:expediente:isolated | PASSED; esquema/ACL/referencias en DB aleatoria, PostgREST temporal y JWT de ensayo propios. No equivale a login GoTrue; ese recorrido se ejecuta separadamente en la suite Edge |
| test:pdf:rollback / test:pdf / test-pdf-layout | PASSED; Edge H5 real, Storage privado temporal, fuente vigente/final, bloqueo de obsoletos, expiración y renderer histórico |
| test:expediente / test-expediente-layout | PASSED en CI base; Auth GoTrue real, tres Edge reales, bytes privados, cinco formatos, parser/fechas/perfiles/historia y PDF independiente |
| build | PASSED; JS **714.82kB**, gzip198.93kB; advertencia >500kB conservada |
| test:build-safety | PASSED; canario privilegiado rechazado sin filtración ni bundle válido |
| test:expiry | PASSED; expiración real de JWT y restauración de configuración/perfiles |
| Reconstrucción desde cero y repetición | PASSED; repite suites H1–H6, incluidos archivos y barreras, después de reset exclusivamente CI |

### DB/API, transacciones y carreras

Maestro propio SUBIDO/GENERADO, versión, duplicados y referencias; configuración independiente, aplicación completa al registrar, regularización explícita/idempotente, obligatoriedad efectiva y opcional retirado preservado al guardar sin transición. Se preservan estados/punteros/versiones al desactivar/reactivar o convertir a obligatorio. Cero configuración no bloquea matrícula.

Fallos de sincronización y de aplicación durante registrar matrícula revierten matrícula/cargos/documentos/snapshot/auditoría completos. Lote de retiro: dos alumnos seleccionados positivos; mezcla obligatorio/ajeno/obsoleto, duplicados y51 rechazados sin parcialidad. DELETE histórico denegado. Traslado y retorno crean contextos nuevos, sin reactivar/reutilizar historia; H4 conserva sus bloqueos financieros.

Barreras reales con conexiones independientes: configuración/configuración, configuración/alta de matrícula, configuración/regularización, obligatoriedad/retiro, retiro/confirmación, traslado/confirmación y cierre/confirmación. Revocación se realiza mientras la RPC ya espera el lock del Ciclo: reautoriza después de esperar y rechaza confirmar sin éxito auditado. No deadlock observado ni retry de producto; una nueva decisión explícita en la fixture se distingue del comando rechazado.

PT409/HTTP409 real, versiones/conjunto obsoletos sin mutación/éxito auditado. 40001 nativo aparece en carreras SERIALIZABLE; 40P01 se conserva en mapeos y regresión H4, sin afirmar un deadlock H6 adicional. Ningún RAISE lógico40001 en las tres migraciones H6. SDK DB retry=false explícito; React/Edge no repiten carga/generación/RPC automáticamente.

Reserva PREPARADO no completa el documento. Confirmación actualiza archivo/estado/puntero/auditoría atómicamente; solo entonces CARGADO/GENERADO. Aborto nunca elimina CONFIRMADO. Replay explícito exacto no añade éxito; payload/actor distintos rechazan. Se descarta deliberadamente el cuerpo de una respuesta HTTP después del commit y se recupera el mismo UUID por lectura/replay; esto **no se presenta como un corte TCP físico**. El fallo modelado de respuesta perdida dentro de Edge verifica que la compensación no borre un archivo que pudo quedar confirmado.

### Edge, contenido, persistencia y permisos

PDF/JPEG/PNG reales; MIME/firma/estructura/CRC/decodificación/SHA/tamaño, foto solo imágenes. Límite exacto5MiB admitido con PNG válido, vacío/+1 y stream superior al presupuesto sin Content-Length rechazados. HTML/ejecutable/extensión peligrosa, MIME discordante, cola añadida, PDF corrupto/activo/estructura comprimida/páginas excedidas e imágenes corruptas/píxeles excedidos rechazados. PDF cifrado sintético se verifica en la regresión final. No hay garantía antivirus/CDR ni prueba de todo formato adversarial imaginable.

Carga/versionado/descarga tienen bytes reales en h6-expediente y comparación SHA, attachment/nosniff/no-store; sin URL como identidad. Acceso directo/public URL/listado/upload/signedURL del cliente denegados. Payload de actor/key/bucket/URL/hash/SQL/plantilla/service_role no aceptado. Se cruzan documento/archivo para IDOR, se prueban Director/Coordinador y denegaciones académicas, revocación y DML de las cuatro tablas; RPC privilegiadas solo service_role. Auditoría general mínima, sin PII, apoderado, nombres de archivo, keys, URL ni hash.

Fuente vigente/final CHG-H5-002 y huella servidor: cambiar Alumno/contactos/etiquetas/contexto impide publicar una generación capturada antes; tras CERRADO se usa exclusivamente snapshot_cierre, sin tocar el inicial ni fallback. Cambiar Alumno después del cierre no altera esa fuente. La versión previa sigue GENERADO/completada y se descarga expresamente como histórica; no OBSOLETO persistido ni generación automática.

ACTIVO+PROGRAMADO/EN_CURSO/CERRADO admiten generación, Solicitud sin filtro de nota/aprobación y carga en CERRADO. Anular matrícula o DESIERTO bloquea nueva mutación y conserva descarga histórica autorizada. **Ciclo ANULADO con matrícula no es alcanzable mediante H4**: primero se verifica ese rechazo23514 y luego se usa exclusivamente una fixture de estado defensivo CI, restaurando el guard, para probar la matriz H6 sin relajar H4. No se afirma que el recorrido normal anule un Ciclo con matrículas.

Retiro PENDIENTE/CARGADO/GENERADO conserva estado/bytes/versiones/configuración. H6 persiste después de limpiar el objeto temporal H5 de la misma matrícula. Edad de metadata sintética >24h demuestra ausencia de TTL H6; no es una espera real de48h. Limpieza manual dry-run/ejecución, máximo50 nunca confirmados, revalidación/aborto antes de borrar, conserva todo CONFIRMADO incluso sin puntero actual. Sin scheduler; política definitiva H9/release.

## Trazabilidad del plan y límites de lo ejecutado

La tabla agrupa evidencia por TEST para facilitar revisión; **no equivale a PASSED humano ni a ejecutar individualmente todos los subcasos de un TEST compuesto**. Las ampliaciones del paquete final de regresión se someten a la CI de ese SHA antes de entregar. No se modifican los estados históricos del test-plan aprobado.

| TEST-H6 | Evidencia / límite |
| --- | --- |
| 001,060 | Gate1 exacto registrado; OQ001–006 resueltas; cuatro MD intactos; gates separados y sin acceptance/merge |
| 002–007 | Maestro/configuración/registro/obligatorio, rollback integral e independencia por Ciclo: DB/API; UI del maestro y configuración |
| 008–010 | Retiro de tres estados, lote positivo/negativo atómico, conteos derivados y GENERADO desactualizado separado: DB/Storage/UI |
| 011 | Matrícula/contexto separados, búsqueda y paginación bajo RLS; no se afirma un ensayo de volumen masivo |
| 012–013 | Bucket privado, acceso directo denegado y cargas reales PDF/JPEG/PNG, SHA/MIME/bytes |
| 014 | Vacío/exacto/+1 y stream sin Content-Length; **cabecera Content-Length falsificada no ejecutada como escenario separado** |
| 015–016 | Disfraz, MIME, extensión/cola, contenido activo/cifrado/corrupto, páginas y píxeles; límites reales, no antivirus universal |
| 017–018,051 | Validación/reserva, fallos Storage/auditoría/puntero, rollback configuración/alta/regularización y retiro parcial rechazado; ampliaciones finales sujetas a su run exacto |
| 019 | Recuperación después de descartar cuerpo HTTP postcommit y replay exacto real, fallo de respuesta modelado en operación Edge; **no corte TCP físico separado** |
| 020–024 | Versiones privadas, carrera misma versión, IDOR, cabeceras/hash, revocación durante lock/tras IO y historia de anulada |
| 025–028 | Cinco formatos fijos, Solicitud sin condición académica, apoderado por generación, blancos, español y contactos; revisión visual humana PENDIENTE |
| 029–033 | Fuente vigente/final, datos/labels, conflicto entre reserva/confirmación, renderer H5 compartido con perfiles separados e independencia de TTL |
| 034–043 | Roles/RLS/grants, PT409, nativos, barreras reales, traslados/regularización y auditoría mínima; 40P01 conserva cobertura H4/mapeos |
| 044–045,059 | Sin TTL/purga funcional; limpieza dry-run y ejecución nunca confirmados; política H9/release y valoración humana pendientes |
| 046–047 | Guardar sin cambios, confirmación, conflicto/borrador/una llamada y selección explícita: tests React; recorrido humano PENDIENTE |
| 048 | Menú con teclado/Escape/foco y apertura/error de modal automatizados; Chrome headless sintético claro/oscuro/paleta alto contraste/sistema/ancho estrecho. **Forced-colors real H6 NO VERIFICADO; recorrido humano PENDIENTE** |
| 049–050 | Regresión H1–H5,70+60saldo100, expiración/rebuild, rechazo de payload, CORS y build-safety; no prueba hospedada |
| 052 | Inventario y recorrido de código concretos revisados técnicamente; valoración humana de mantenibilidad PENDIENTE |
| 053 | Cinco observaciones locales y bytes/volumen abajo; CPU/memoria NO MEDIDAS, Hosted NO EJECUTADO; no benchmark masivo |
| 054–055 | Normales/extensos, glifos,100 contactos y multipágina; frontera Lima/cumpleaños, perfiles de edad/fecha y bytes históricos fijos; aceptación visual humana PENDIENTE |
| 056–057 | **NO EJECUTADOS HUMANAMENTE**. Recorrido propuesto en operations.md |
| 058 | Matriz técnica SUBIDO/GENERADO y estados, con ANULADO/Ciclo defensivo explícito; no nuevo resultado académico |

## Inventario final proporcional

| Objeto | Base H5 | Incremento H6 | Total |
| --- | ---: | ---: | ---: |
| Tablas públicas | 24 | 4 (3 de dominio + archivo/versiones técnico) | 28 |
| Vistas security_invoker | 4 | 1 resumen | 5 |
| Funciones públicas | 20 | 8 específicas | 28 |
| Helpers privados | 19 | 2 | 21 |
| Policies públicas de negocio | 27 | 4 SELECT | 31 |
| Buckets privados | 1 temporal | 1 persistente | 2 |
| Edge | 1 H5 | 3 cerradas H6 | 4 |
| Migraciones SQL | 23 | 3 aditivas | 26 |

66 comprobaciones de grants (33 relaciones×authenticated/anon), sin DML cliente, sin policies Storage cliente. Ocho RPC: guardar_tipo_documento, guardar_documentos_ciclo, regularizar_expedientes_ciclo, retirar_documentos_opcionales (JWT académico); preparar_archivo_expediente, confirmar_archivo_expediente, abortar_reserva_expediente, registrar_descarga_expediente (solo service_role). Dos helpers: sync_document_context y guard_document_history. Sin quinta tabla, S3, API generalista, worker/cola/scheduler, motor editable ni infraestructura AWS. Las tres migraciones históricas nuevas no se reescriben después de publicar.

## Recursos y supuestos de volumen

Artefacto sintético CI44440069229, ID14489743844, digest `sha256:61aac16b752ff18bdaa050e30a66531d4725c941bf39852f2c238c4e4da24ec6`. Solo datos sintéticos; outputs y archivos del usuario no se versionan.

| Formato | Observación local ms | PDF bytes |
| --- | ---: | ---: |
| Solicitud | 321.43 | 228849 |
| Declaración jurada | 215.85 | 228290 |
| Carta Poder | 201.36 | 227958 |
| Ficha personal | 193.10 | 228886 |
| Ficha matrícula persistente | 212.15 | 234735 |

Una observación por formato de la secuencia **generar + consultar + descargar + parsear PDF**; no tiempo aislado de CPU, cold-start acreditado, p95 ni prueba de carga. **CPU: NOT MEASURED. Memory: NOT MEASURED. Hosted: NOT EXECUTED.**

Render/parseo/rasterización independientes: normales de1 página; datos extensos hasta100 contactos producen14 páginas en Ficha personal y4 en Ficha matrícula, dentro de20 páginas/2MiB. Bbox de CI comprueba márgenes y salida Poppler. Inspección técnica de PNG sintéticos y paletas propias; no aprobación humana ni forced-colors real.

Supuesto ilustrativo, no factura ni precio de proveedor:1000 matrículas,5 generados de0.25MiB con2 versiones y4 subidos de1MiB con1 versión →6500MiB≈6.35GiB almacenados. Tres descargas del conjunto vigente →15750MiB≈15.38GiB transferidos. Cambiar versiones/tamaño/retención cambia esos volúmenes; confirmados no se purgan en H6. Evaluar plan/costos reales antes de H9/release, sin inferir aptitud hospedada desde CI local.

## Residuales y decisión siguiente

Se preservan los seis H5/GATE-A01: **Hosted Edge/PostgREST14 NO PROBADOS DIRECTAMENTE; CPU NO MEDIDA; memoria NO MEDIDA; forced-colors H5 NO VERIFICADO; bundle >500kB; limpieza física H5 manual**. GATE-A01 conserva APROBADO CON AJUSTES, no se reabre ni se convierte en garantía hospedada.

En el registro técnico previo a Gate 2, la revisión humana figuraba PENDIENTE; el usuario posteriormente reportó siete bloques PASSED y autorizó los ajustes sin repetir pruebas. Forced-colors real H5/H6 sigue NO VERIFICADO; PDF admitido es un subconjunto conservador (ObjStm/XRef comprimidos y filtros no verificables rechazados), sin garantía antimalware; conciliación de nunca confirmados manual y política de purga definitiva H9/release. Los subcasos no separados de Content-Length falsificado/corte TCP se declaran arriba, no PASSED inventados.

**Registro histórico de construcción:** Gate 2 estaba pendiente al emitir la evidencia técnica anterior. El Gate 2 posterior está APROBADO HUMANAMENTE y la inclusión de ajustes fue autorizada expresamente; ver gate-2.md. Nuevo candidato sujeto a CI propia SUCCESS antes del cierre. H7 NO INICIADO.

## Verificación local del paquete autorizado de ajustes — 19/11/2026

**524/524 pruebas PASSED, 34 archivos**, suite completa con dos workers. Lint, typecheck, typecheck Edge expediente, build y build-safety PASSED. Bundle principal 732.32 kB y previewPdf 741.92 kB: advertencia >500 kB preservada. No sustituye la CI exacta del nuevo candidato ni las pruebas hospedadas/mediciones no realizadas. Inventario: 27 migraciones; sin tablas, RPC, helpers, buckets ni servicios nuevos frente al inventario de H6. Se publica el paquete para verificar CI completa y luego registrar acceptance, sin repetir pruebas humanas.

## Cierre técnico y humano vigente

**H6 CLOSED / ACEPTADO**, Gate 2 APROBADO HUMANAMENTE; [acceptance.md](acceptance.md). Candidato final autorizado `f6157e953eb4f307066b16e8b5580b7f09c23f58`, CI [44616848493](https://github.com/fcamasca/perumar-supabase/actions/runs/44616848493) **COMPLETED / SUCCESS**, **524/524 PASSED**. Pasaron lint/types/Deno/build/build-safety, Auth/RLS, DB/API, rollback/concurrencia H1–H6, Edge/Storage real de CI, render independiente, expiración y reconstrucción con repetición integral. La aprobación original ca7a461/483 pruebas mantiene su alcance histórico; los ajustes posteriores se aceptan por autorización expresa, sin repetir pruebas humanas ni inventar subcasos.

Inventario vigente:27 migraciones (cuatro H6); demás cifras de la tabla histórica sin cambio. Los siete bloques humanos reportados están PASSED; forced-colors H5/H6 NO VERIFICADO. Todos los residuales de acceptance permanecen. Commit de cierre solo documental, CI propia antes del merge y CI de main posterior; INTEGRADO se hace efectivo en main. H7 NO INICIADO.
