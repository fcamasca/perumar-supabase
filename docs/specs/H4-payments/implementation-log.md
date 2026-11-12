# H4 — Registro de construcción

**Estado vigente al 12/11/2026: Gate 2 APROBADO HUMANAMENTE; cierre/acceptance/merge/H5 NO AUTORIZADOS.** [Registro](gate-2.md). Las entradas anteriores conservan sus estados históricos.

Gate 1 aprobado humanamente el 09/11/2026 sobre `15f5e80492c4ba95a70f9fe56e068f7ba946510d`.
Rama de construcción: `feature/h4-payments`, creada desde ese SHA. Registro incorporado mediante cherry-pick: `bf2c8ce` (SHA de inicio de construcción).
Los cuatro documentos aprobados se conservan idénticos. Las 17 OQ y C-H4-001 están resueltas; [Gate 1](gate-1.md).

## Bloques

| Bloque | Estado | Evidencia |
|---|---|---|
| A: modelo, dinero, permisos, saldo y protocolo | IMPLEMENTADO / validado | Modelo probado primero en rollback; inventario y RLS verificados en CI |
| B: registro transaccional | IMPLEMENTADO / validado | Registro, suma, precision previa a cast y fallos aislados por etapa |
| C: idempotencia y recuperacion | IMPLEMENTADO / validado | Replay, UUID global concurrente, cuerpo HTTP descartado tras commit y referencia minima |
| D: anulacion | IMPLEMENTADO / validado | Transicion unica, fallos aislados, permisos Director y cruces concurrentes |
| E: restricciones H3 | IMPLEMENTADO / validado | C-H4-001, descuento, traslado, estados y patrocinador; historia preservada |
| F: UI, regresion y candidato | IMPLEMENTADO / evidencia de entrega | 335 unitarias tras correccion pre-Gate 2; CI del candidato exacto se comprueba antes de entregar; humanos pendientes |

No se resetea la base humana. Las pruebas locales de escritura deben revertirse mediante ROLLBACK; la concurrencia con fixtures confirmados se limita a una base desechable.

Gate 2 PENDIENTE. No acceptance, merge a main ni H5 autorizados.

## Decisiones de implementación

- Dos tablas, dos RPC concretas; dos vistas invoker distinguen saldo por cargo y resumen de matrícula independiente de paginación.
- Dos helpers privados nuevos exclusivamente para integridad diferida de aplicaciones e inmutabilidad financiera. Autorización, catálogo, versiones, sello y guard H3 se reutilizan.
- Auditoría explícita en los dos comandos: IDs, actor, instante DB y motivo de anulación. No payload financiero ni PII.
- Concurrencia local usa una base temporal del mismo contenedor: copia solo esquema y catálogos públicos; dos conexiones SERIALIZABLE esperan una barrera observada en pg_stat_activity. Se elimina en finally. No se copia negocio humano.
- Matriz Auth/RLS se ejecutará en CI desechable. No confundir claims SQL de las pruebas locales con JWT ordinario.
- Pruebas locales ejecutadas: modelo primero en rollback; script rollback con errores forzados por etapa; trece carreras reales (incluidos cruces H3 y UUID global en matrículas distintas), sin retries. Todas PASSED.

## Validacion progresiva y publicaciones

1. A se valido en BEGIN/ROLLBACK antes de crear comandos; modelo/RLS/grants y cinco medios PASSED.
2. B-E se validaron en SQL antes de conectar UI: registro/replay/anulacion/saldo/guards PASSED. Los escenarios de fallos controlados se ejecutan en base desechable; el runner sobre base humana los omite.
3. UI comenzo con 31 pruebas especificas PASSED; la suite completa paso 314, luego 318 y finalmente 320 casos, sin sustituir la evidencia humana.
4. f56b2fc: primer bloque publicado. CI 42744547018 fallo en expectativas antiguas de conteos de catalogo H2; corregidas (12 definiciones y 72 valores activos).
5. 076261b: contrato completo, C-H4-001 y regresion ampliada. CI 42745269931 SUCCESS, incluidos reset/repeat y expiracion real.
6. 3e0a21f: trece carreras, perdida deliberada del cuerpo de respuestas tras commit y mayor cobertura. CI 42746284304 SUCCESS.
7. Revision final: lectura decimal del resumen como texto y formato exacto superior a la cota de un pago; foco y metadatos de recuperacion; inventario exige owner/definer/search_path/SERIALIZABLE/grants de ambas RPC. Se repiten checks antes de publicar candidato.

Los errores encontrados durante construccion se corrigieron y revalidaron; no se presentan ejecuciones fallidas como evidencia PASSED. Las pruebas humanas, incluidos forced-colors real, arquitectura humana y Gate 2, siguen pendientes. No acceptance, main ni H5.

## Correccion pre-Gate 2: conflictos logicos PT409

Hallazgo recibido sobre el candidato `9da9697771064a29574498a4acdb2c12b00cc395`. Gate 2 NO aprobado; sin acceptance, merge ni H5.

Fuente oficial: [Supabase KB, actualizada 04/11/2026](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).

Clasificacion de los cuatro RAISE deliberados historicos:

| Funcion | Origen | Significado | Correccion |
|---|---|---|---|
| private.require_version | H2, 20261022160000:73 | expected_updated_at ausente/obsoleto | PT409 |
| public.cambiar_estado_ciclo | H2, 20261022160000:350 | Transicion no aplicable o version obsoleta; ninguna fila actualizada | PT409 |
| public.registrar_pago | H4, 20261109030000:41 | Padres/contexto cambiaron entre lectura preliminar y lock | PT409 |
| public.anular_pago | H4, 20261109030000:94 | Padres/contexto cambiaron entre lectura preliminar y lock | PT409 |

Nueva migracion aditiva `20261109050000_logical_conflicts_pt409.sql`: reemplaza esas cuatro funciones existentes, sin cambiar firmas, permisos, aislamiento, locks ni cuerpos salvo esos SQLSTATE. H2 conserva su default_transaction_isolation=serializable efectivo. No modifica las migraciones anteriores ni traduce excepciones reales del motor.

academicError, enrollmentError y paymentError reconocen PT409 y mantienen 40001/40P01 defensivos con los mensajes existentes. Regresiones React de Asignatura, Tarifa y Pagos conservan borrador y una sola invocacion para los tres codigos.

Validacion local: lint/typecheck/build/build-safety/diff-check PASSED; 335/335 pruebas en 20 archivos PASSED; rollback PASSED; suite aislada con comparacion de definiciones efectivas (normaliza solo CRLF/LF), cero RAISE manuales 40001 efectivos y trece carreras PASSED. 70+60/100 conserva un unico commit y el perdedor devuelve 40001 REAL; deadlock aislado adicional produce 40P01 REAL sin traduccion/retry. La base temporal se elimina en finally.

Regresion API agregada: cinco RPC reales con version obsoleta (guardar_materia, cambiar_estado_ciclo, editar_matricula, registrar_pago, anular_pago), JWT ordinario Director, PT409 y HTTP 409; huellas de registros/versiones/aplicaciones/auditoria y conteo global de eventos sin cambios. Ejecutada con resultado PASSED en CI 42751754228, commit 372cd047a74de5e499c0d9b30b9f76c7c865ee5b: tambien PASSED la regresion H1-H3, expiracion real, reconstruccion desde cero y repeticion completa.

Busqueda final: cuatro coincidencias en archivos historicos inmutables; ninguna en la migracion correctora. Sobre pg_proc despues de aplicar la migracion en la base aislada: CERO RAISE deliberados 40001 en funciones public/private efectivas. Los errores reales de PostgreSQL no se reemplazan.

Inventario funcional sin cambios: 24 tablas, 2 vistas, 19 RPC, 18 helpers y 27 policies. Solo el inventario de migraciones pasa de 18 a 19. Los cuatro documentos del Spec aprobado permanecen identicos.

### Resultado pre-Gate 2 verificado

[CI 42751754228 — COMPLETED / SUCCESS](https://github.com/fcamasca/perumar-supabase/actions/runs/42751754228), SHA exacto de codigo `372cd047a74de5e499c0d9b30b9f76c7c865ee5b`.

- 335/335 unitarias en 20 archivos, lint, typecheck, build y build-safety: PASSED.
- test:payments:rollback, test:payments:isolated y test:payments con JWT ordinarios: PASSED.
- Cinco RPC H2/H3/H4 obsoletas: PT409 / HTTP 409, registros/versiones/aplicaciones y auditoria sin cambios; no se imprimen payloads en la evidencia (huellas SHA-256).
- React: Asignatura/Tarifa/Pagos conservan borrador y ejecutan una unica llamada ante PT409, 40001 o 40P01; la siguiente decision es explicita del usuario.
- Trece carreras existentes, incluido 70+60/100: PASSED, sin sobrepago ni retries. Se comprueba ademas 40001 NATIVO en esa carrera y 40P01 NATIVO en un deadlock aislado; no se traducen.
- Inventario, matriz RLS, regresion H1-H3, token Auth expirado, reconstruccion desde cero y repeticion de integracion: PASSED.
- git diff --check y comparacion de los cuatro documentos del Spec aprobado: PASSED; migraciones historicas intactas.

La publicacion que incorpora esta evidencia es documental respecto de ese SHA de codigo. La entrega informa tambien su SHA candidato y CI exacta; no se modifica codigo despues de la validacion anterior. Sin acceptance, merge ni H5. Gate 2 NO APROBADO.

## CHG-H4-001: acceso directo a Pagos posterior a Gate 1

Solicitud humana sobre `42e7737d23cf42ec5c70fd44c67f1bb2b6c8ba50`. [Enmienda aprobada y justificacion previa de lectura](approved-direct-payment-access-amendment.md). Gate 2 NO aprobado; cuatro documentos del Spec sin cambios; no acceptance, merge ni H5.

Menu Pagos (Director/Coordinador), rutas /pagos y /pagos/:id bajo AcademicOnly. Por Alumno inicial; studentSearchFilter reutilizado para codigo/DI/nombres/apellidos. Por Ciclo admite PROGRAMADO/EN_CURSO/CERRADO y filtra alumnos con el mismo helper. Pendiente DESC numerico en DB, luego fecha del Ciclo, fecha de matricula e ID descendentes. Cero visible al final; anuladas/estados no cobrables solo Ver.

Se agrega exclusivamente la vista invoker matricula_pago_listado mediante 20261109060000_direct_payment_access.sql. La necesidad se justifico antes de implementarla: une contexto y matricula_saldo en una consulta filtrable/paginada/ordenada, sin N+1 ni repetir formula financiera. SELECT authenticated, sin DML/anon; RLS de las mismas tablas/vistas H4. Inventario: 24 tablas, 3 vistas, 19 RPC, 18 helpers, 27 policies y 20 migraciones. Solo una vista y su grant SELECT adicionales, sin cambios de permisos sobre tablas o comandos.

PaymentAccess solo busca, presenta saldo DB y abre EnrollmentPayments existente. initialRegister es un indicador UI que muestra el mismo formulario al pulsar Pagar, sin llamadas financieras automaticas. El detalle reconsulta por ID bajo RLS y muestra alumno/DI/Ciclo/Curso/pendiente; IDs desconocidos o sin acceso tienen el mismo mensaje seguro. Pestaña Pagos contextual conservada. No cambios en RPC/modelo/estados/dinero/locks/PT409/idempotencia/auditoria.

Contexto de busqueda/seleccion/filtro/paginas en estado React de /pagos/* por identidad, conservado al volver; no PII ni saldos en history.state/URL/storage. Se descarta al abandonar/recargar el modulo o cambiar de identidad. history.state contiene solo el indicador UI de apertura del formulario.

Validacion local: lint/typecheck, 359/359 pruebas en 21 archivos PASSED; suite financiera aislada conserva las trece carreras, 70+60/100, PT409 y errores nativos. Rollback local PASSED sin fixtures persistidos. Build/build-safety y diff-check PASSED antes de publicacion y repetidos en CI. Pruebas API nuevas de proyeccion/orden numerico 100-20-0/filtros/roles e IDs manipulados, regresion H1-H3, expiracion y reset-repeat: PASSED en CI 42758669622 del SHA 914bb837ef570e214798f05634be363e2049d272.

Guia humana, Bloque 1 actualizado al nuevo acceso principal. Todas las pruebas humanas siguen PENDIENTES; no se infieren resultados de los tests DOM. Residuales: forced-colors real y QA visual/movil pendientes; busqueda sin persistencia entre recargas; sin ensayo masivo de throughput. Misma arquitectura React + Supabase/RLS/RPC concretas, sin backend adicional ni motor de deuda.

### CHG-H4-001: evidencia verificada el 10/11/2026

[CI 42758669622 — COMPLETED / SUCCESS](https://github.com/fcamasca/perumar-supabase/actions/runs/42758669622), codigo exacto `914bb837ef570e214798f05634be363e2049d272`.

- 359/359 pruebas en 21 archivos, lint/typecheck/build/build-safety: PASSED.
- Matriz JWT/RLS y nuevos listados: Director/Coordinador/multirol autorizados; Admin y actores no habilitados no obtienen filas ni consultando IDs conocidos/manipulados. Anon sin SELECT. Inventario de tres vistas invoker/grants exactos: PASSED.
- Consulta real Por Alumno con tres matriculas: pendiente numerico 100.00, 20.00 y 0.00 en ese orden. PROGRAMADO/EN_CURSO/CERRADO, filtros compartidos de codigo/DI/nombres/apellidos y UUID inexistente: PASSED.
- UI: Por Alumno inicial; busquedas y listados; Pagar/Ver apuntan al mismo EnrollmentPayments; estados no cobrables/anuladas de consulta; retorno conserva filtros/seleccion/pagina en React, sin PII/saldo en URL/history/storage. El nuevo indicador de abrir formulario no dispara ninguna RPC: PASSED DOM.
- Reutilizacion financiera: trece carreras conservadas, 70+60/100 sin sobrepago, deadlock nativo 40P01, serializacion nativa 40001, PT409/HTTP409 sin mutacion/auditoria, rollback, regresion H1-H3, expiracion real y reconstruccion/repeticion completa: PASSED.
- No se reseteo ni migró la base humana; ninguna fixture H4 confirmada en ella. El runner aislado elimina su base temporal.

Archivos afectados por esta enmienda:

- src/security/SecurityRoutes.tsx; src/payments/PaymentAccess.tsx; src/payments/EnrollmentPayments.tsx.
- supabase/migrations/20261109060000_direct_payment_access.sql.
- scripts/local-platform.mjs; scripts/test-payments.mjs; scripts/test-payments-isolated.mjs.
- tests/PaymentAccess.test.tsx; tests/SecurityRoutes.test.tsx; tests/EnrollmentPayments.test.tsx.
- docs/specs/H4-payments/approved-direct-payment-access-amendment.md; implementation-log.md; technical-results.md; human-test-guide.md.

La entrega publica tambien el SHA y la CI exacta del commit documental final, sin codigo posterior a 914bb83. Enmienda UX implementada, no cambio de reglas financieras. Todos los ensayos humanos siguen pendientes; forced-colors real NO VERIFICADO, QA visual/movil pendiente y advertencia de bundle >500 kB conservada. Sin garantia de carga masiva; contexto descartado al recargar o abandonar Pagos. Sin acceptance, merge ni H5; Gate 2 NO APROBADO.

## Compactacion visual de Pagos — 10/11/2026

Aprobada por el usuario tras revisar la captura del candidato 5d2ff47. Detalle en [enmienda UX](approved-direct-payment-access-amendment.md). Se compactan encabezado/contexto, se elimina el pendiente duplicado y el subtitulo redundante, se alinea formulario al ancho disponible y se reduce el alto de campos/espaciados. Seleccionar todos pasa al encabezado de la tabla con estado mixto accesible. La barra de acciones sticky presenta Cancelar a la izquierda y Confirmar pago con el total a la derecha. Estilos acotados a Pagos, incluidos sus accesos contextual/directo.

No cambia ninguna operacion financiera: mismo registrar_pago/anular_pago, importes/payload, idempotencia, errores PT409, roles ni esquema. No nuevas migraciones/dependencias; inventario permanece 24 tablas/3 vistas/19 RPC/18 helpers/27 policies/20 migraciones. Spec aprobado intacto. Gate 2 NO aprobado; sin acceptance, merge ni H5.

Validacion local: lint, typecheck y 362/362 pruebas en 21 archivos PASSED; nuevas regresiones de seleccion mixta/todos/ninguno, confirmacion con importe, resumen unico y foco de encabezado. Payload transaccional y ausencia de retries siguen cubiertos. Build/build-safety y diff-check PASSED antes de publicar; la CI del candidato se informa en la entrega.

Limitacion de evidencia: captura automatizada de escritorio no disponible por fallo de inicializacion del kernel; se intento reinicio y una unica repeticion. No se opero ni confirmo un pago desde el escritorio. Revision visual real de desktop/movil y forced-colors sigue NO VERIFICADA/PENDIENTE humana; no se afirma que una altura concreta de viewport haya sido comprobada.

## Ajuste operativo aprobado el 10/11/2026: ocultar matriculas anuladas

Solicitud humana: al ir a pagar, no mostrar matriculas anuladas. Ambos listados de Pagos (Por Alumno/Por Ciclo) incluyen ahora matricula_estado=ACTIVO en la consulta PostgREST antes de ordenar/paginar. Las activas con pendiente cero conservan Ver; no se cambia la proyeccion, el saldo ni las reglas financieras. La historia anulada sigue disponible en la ficha/contexto de matricula y por lectura autorizada; no se elimina ni se reactiva nada.

Regresiones nuevas: exclusión de anuladas en ambas rutas y conservacion de activas con cero; API real comprueba listados filtrados e historia conservada. Sin migraciones/inventario nuevo ni cambios al Spec aprobado. Gate 2 pendiente; sin acceptance, merge ni H5. Resultados y CI del candidato se informan en la entrega.

Filtro operativo validado localmente: 364/364 unitarias, lint/typecheck/build/diff-check PASSED. Misma rama y contratos financieros; CI exacta del commit se verifica antes de entregar.


## 10/11/2026 — CHG-H4-002: inclusión inicial de cargos opcionales

Decisión humana y contrato: [enmienda aprobada](approved-default-charges-amendment.md). Todas las tarifas activas se incluyen DB-side en el alta y en el Ciclo destino. Obligatoria impide retiro; opcional permite retiro por alumno, sujeto a los guards H4 de pagos vigentes. La edición conserva selección explícita y trazabilidad histórica. No hay backfill ni modificación automática de matrículas existentes.

Migración aditiva `20261110010000_default_all_enrollment_charges.sql`: reemplaza un helper existente. Inventario de objetos sin cambios: 24 tablas, 3 vistas invoker, 19 RPC, 18 helpers, 27 policies; total 21 migraciones. Cuatro documentos del Spec aprobado intactos. Gate 2 pendiente; sin acceptance, merge ni H5. Validación del candidato: ver entrega y CI exacta; ninguna prueba humana nueva se presume ejecutada.

Validación local CHG-H4-002: lint/typecheck, 364/364 unit tests, build y build-safety correctos. `test:payments:isolated` pasó regresión H3/H4, inclusión/retiro individual de opcionales, saldo/cargos, 13 carreras con barreras (incluye 70+60 sobre 100), PT409 y errores nativos 40001/40P01, sin retries. `test:payments:rollback` pasó. Nueva migración aplicada mediante `migration up --local`, sin reset; fingerprint de Alumno/matrícula/cargos/auditoría/Ciclos/catálogos idéntico antes/después. Reconstrucción desde cero, JWT/API, expiración y regresión completa quedan verificadas en la CI del nuevo candidato; su SHA/run exactos se reportan en la entrega.

CI inicial `42852846574` (`c5b2d37`) detectó interferencia del nuevo fixture de cambio de Ciclo con TEST-H3-021-027: dejaba una matrícula sintética activa adicional en el Ciclo que luego debía permitir cambiar de Curso tras anular la matrícula original. El guard DB rechazó correctamente el cambio. Se cierra explícitamente la nueva matrícula sintética al terminar su prueba; no se relaja ninguna regla ni aserción H3. Se publica candidato corregido y se repite CI completa.

CI `42853488272` (`168ac1d`) pasó la corrección del fixture y las demás invariantes H3 hasta el ensayo de configuración concurrente, donde persistía la expectativa anterior de un único cargo. Se actualiza esa aserción al nuevo contrato: exactamente dos cargos (Curso 650 + opcional 80, total 730), manteniendo la comprobación de importes de una única versión de configuración. No se sustituye ni debilita el ensayo concurrente. Se repite CI completa con el candidato siguiente.


## 10/11/2026 — Corrección de selección guardada al reabrir Cargos

Hallazgo humano posterior a CHG-H4-002: Ciclos → Matrículas → Editar matrícula → Cargos seleccionaba todos los conceptos en el primer montaje, aunque algunos opcionales estuvieran retirados. La inicialización UI aplicaba el valor por defecto del alta también a una matrícula existente. Se elimina esa excepción: en el Ciclo actual, la selección proviene siempre de `matricula_cargo.activo`; el alta y cambio de Ciclo mantienen la inclusión DB-side de CHG-H4-002. No se agregan cargos automáticamente ni se emite RPC al abrir.

Regresión de UI: opcional vigente aparece marcado y puede desmarcarse; opcional retirado y tarifa nunca incorporada permanecen desmarcados tanto al cambiar de pestaña como al desmontar/reabrir la ficha, con total coherente y sin escrituras. Sin cambios de SQL, modelo financiero, permisos, inventario ni Spec aprobado. Validación y CI exacta en entrega del candidato. Gate 2 pendiente; sin acceptance, merge ni H5.

Validación local del arreglo de reapertura: lint, typecheck, 365/365 pruebas en 21 archivos, build, build-safety y diff-check correctos. Sin migración adicional; inventario permanece en 21 migraciones y los mismos objetos. CI del candidato publicada en la entrega.


## 10/11/2026 — Seleccionar todos los cargos opcionales

Solicitud humana: agregar un check de seleccionar todos en la grilla Cargos de Editar matrícula. El encabezado marca/desmarca únicamente los opcionales y muestra estado mixto cuando la selección es parcial. Los obligatorios permanecen incluidos y bloqueados; sin opcionales, el control se deshabilita. Totales son vista previa; solo Guardar cargos ejecuta la RPC existente y conserva validación DB/H4 para cargos pagados. Marcar, desmarcar y navegar entre pestañas no genera escritura.

Regresión automatizada: todos/ninguno/mixto, actualización del total, obligatorio intacto, selección conservada entre pestañas, payload explícito de opcionales al guardar y control deshabilitado sin opcionales. Se mantiene la regresión de reapertura que respeta los retiros guardados. Sin SQL/migración ni cambios de inventario, permisos o Spec aprobado. Gate 2 pendiente; sin acceptance, merge ni H5.

La primera ejecución de 367 tests detectó una carrera preexistente en la aserción de foco de PaymentAccess: comprobaba antes de ejecutarse el efecto de React. Se conserva la aserción de accesibilidad y se espera explícitamente con waitFor; sin cambios de comportamiento productivo de Pagos. Se repite la suite completa.

Validación del selector: lint/typecheck/build/build-safety/diff-check correctos; suite completa 367/367 en 21 archivos con `npm test -- --maxWorkers=2`. La ejecución local anterior agotó 5s en un caso de navegación de Ciclos; la repetición limita procesos sin ampliar timeouts ni modificar ese test. La CI del candidato repite el workflow completo con su configuración ordinaria.


## 10/11/2026 — Jerarquía de acciones en matrículas del Ciclo

Mejora UX autorizada humanamente: Ver matrícula y Editar aparecen como botones secundarios compactos del mismo estilo; Cambiar Ciclo… pasa a un menú de tres puntos Más acciones. Solo matrículas activas de Ciclos elegibles y roles académicos conservan edición/menú; anuladas y estados de solo consulta muestran únicamente Ver matrícula. Se mantienen los bloqueos del borrador del Ciclo y el diálogo/comando existentes de cambio de Ciclo.

El menú tiene nombre accesible por matrícula, navegación con teclado, Escape/clic exterior/Tab para cerrar y retorno de foco al cerrarlo o volver del diálogo. Se presenta fuera del contenedor con scroll para evitar recortes; no ejecuta comandos al abrirse. Pruebas cubren exposición de acciones, permisos/estados/bloqueo, cierre/foco y la misma RPC transaccional con selección explícita del destino, versiones y conflicto sin retry. Sin SQL, migraciones, nuevos permisos ni modificación de los cuatro documentos aprobados. Gate 2 pendiente; sin acceptance, merge ni H5. Resultados exactos y CI del candidato en entrega.

Validación local de jerarquía de acciones: lint/typecheck/build/build-safety/diff-check correctos; suite completa 368/368 (21 archivos) y repetición focalizada CycleEnrollments 20/20 con las aserciones finales de visibilidad de roles/estados. No se declara QA visual humana ejecutada; revisión de temas/viewport/forced-colors queda pendiente. CI exacta del candidato en entrega.

Revisión adicional del menú: al devolver el foco al propio botón ⋮, el blur no cierra anticipadamente el menú; así un segundo clic lo cierra en vez de reabrirlo. Regresión explícita blur→clic y 20/20 casos de CycleEnrollments correctos; lint/typecheck/diff-check repetidos. La CI final cubre esta corrección de interacción.


## 10/11/2026 — Guardar cargos solo con cambios y confirmación persistente

Solicitud humana: Guardar cargos no debe parecer activo cuando no se modificó la selección; confirmar visiblemente al terminar. Se reutiliza la comparación existente `pendingCharges` para deshabilitar el botón cuando la selección coincide con los cargos guardados, incluyendo volver al valor original desde check individual/todos. La función de envío también rechaza un submit sin cambios y mientras está ocupada.

Durante el envío muestra Guardando… y bloquea la selección. Al confirmar la RPC, mantiene los controles de cargos bloqueados hasta recargar su estado desde DB y presenta Cargos guardados correctamente en una región status; la recarga de detalle ya no borra esa confirmación. Modificar de nuevo la selección o salir de edición elimina el mensaje anterior. Un conflicto mantiene el borrador, muestra el error existente y no declara éxito ni reintenta. No cambia ninguna regla financiera, RPC, permiso, migración ni Spec aprobado.

Regresión: estado inicial limpio; toggles individuales/todos y reversión; submit sin cambios sin RPC; envío pendiente; actualización del estado guardado y confirmación persistente tras recarga/pestañas; nuevo cambio limpia el aviso; PT409 conserva selección sin retry/éxito falso. Fixture de detalle devuelve objetos independientes por lectura para representar las respuestas reales de Supabase. Gate 2 pendiente; sin acceptance, merge ni H5. Resultados y CI exacta del candidato en entrega.

Validación local de guardado/feedback: lint/typecheck, EnrollmentPages 61/61, suite completa 370/370 (21 archivos), build, build-safety y diff-check correctos. Confirmación con la clase success existente, sin CSS nuevo. No migraciones ni cambios de inventario. QA humana pendiente; CI exacta del candidato en entrega.


## 10/11/2026 — Validación de importes de pago reconocible y vinculada al campo

Hallazgo humano: el error de importe se mostraba como un status neutro y el foco azul ocultaba el borde de error. Se distinguen explícitamente mensajes de validación/error (alert + estilo validation-errors existente), éxito, advertencia de resultado incierto e información; no se deduce severidad del texto. Importes inválidos muestran detalle junto al campo, vinculado mediante aria-describedby y aria-invalid. Exceso indica el pendiente concreto; formato inválido explica máximo dos decimales. Borde/foco mantienen el color de error incluso con el campo activo, usando los tokens existentes y sin anular el borde dashed de forced-colors.

Al corregir o desmarcar el importe se elimina la validación local anterior; los errores/conflictos del servidor no se borran por editar un importe. Se conservan valores, foco al primer importe inválido y no envío si la validación falla. Éxito y resultado ambiguo permanecen semánticamente diferenciados. No cambia el cálculo en centavos, las condiciones de validación, payload/RPC, UUID/idempotencia, recuperación, permisos ni autoridad DB. Sin SQL, migraciones, nueva dependencia o modificación del Spec aprobado.

Regresión: exceso/precisión, mensaje de campo asociado, aria-invalid y alert de resumen, corrección sin RPC ni referencia de intento; éxito con status/success y conflicto PT409 visible con borrador/sin retry. QA visual humana de temas/viewport/contraste real pendiente. Gate 2 pendiente; sin acceptance, merge ni H5. Resultados y CI exacta en entrega.

Validación local de mensajes/importe: lint/typecheck, EnrollmentPayments 19/19 y suite completa 372/372 (21 archivos) correctos. Éxito, conflicto, precisión/exceso, vinculación accesible y ausencia de escrituras ante validación cubiertos. Build/build-safety/diff-check antes de publicar; CI exacta y SHA en entrega. Sin cambios de inventario ni migraciones.


## 12/11/2026 — Confirmación global de pruebas humanas

El usuario reportó «listo ok las pruebas». Se registra **OK global reportado**, sin atribuir pasos, TEST o subcasos individuales no desglosados. Candidato de referencia de sesión: `0091190f0cf353d744d6b2d9a6447916d9c882d6`, con 372/372 y CI `42938230861` SUCCESS. El usuario confirmó expresamente Chrome / Windows 11 Pro y forced-colors real NO VERIFICADO. Versión de Chrome, roles y SHA ejecutado no fueron nuevamente indicados; no se inventan. No se presume residual aceptado. Detalle: [human-results.md](human-results.md). **Gate 2 continúa PENDIENTE**; no acceptance, merge, cierre ni H5.


## 12/11/2026 — Gate 2 APROBADO HUMANAMENTE, sin cierre autorizado

Decisión humana explícita sobre `0091190f0cf353d744d6b2d9a6447916d9c882d6`: **Gate 2 APROBADO HUMANAMENTE**. [Registro](gate-2.md). CI funcional `42938230861` y CI documental `43267712701` de `6943d5416dcf24ea81b6f3b30867090c2d3d83df`: COMPLETED / SUCCESS, verificadas. Solo documentación después del candidato; 372/372 pruebas automáticas. Reporte humano OK global en Chrome / Windows 11 Pro; no se inventan versión, roles ni subcasos individuales.

**Forced-colors / contraste alto real de Windows: NO VERIFICADO — residual aceptado** expresamente para Gate 2 de H4, sin declararlo ejecutado, PASSED, validado ni heredado de H3. Se conservan advertencia de bundle >500 kB y Data API hospedada / PostgREST 14 no probada directamente, así como los demás límites técnicos documentados. Este estado vigente prevalece sobre menciones históricas de Gate 2 pendiente; los cuatro documentos aprobados no se modifican. **No acceptance.md, merge a main, cierre formal H4 ni H5 autorizados. H5 NO INICIADO.** SHA documental final y CI propia en entrega.


## Cierre formal autorizado — 12/11/2026

La instrucción posterior autoriza H4 CLOSED / ACEPTADO y su integración trazable tras CI SUCCESS del commit documental de cierre. [Acceptance](acceptance.md) consolida gates, candidato, enmiendas, evidencia e inventario sin cambiar código ni el Spec. La integración se hace efectiva al merge a main, cuya CI debe ser SUCCESS. Sustituye los bloqueos anteriores de cierre conservados como historial. Después queda autorizado H5 únicamente en fase Spec desde ese main exacto, sin permiso intermedio ni construcción H5. Residuales y granularidad de evidencia humana permanecen intactos.
