# H4 — Evidencia técnica del candidato

**Construcción técnica; Gate 2 PENDIENTE. No acceptance, merge a main ni H5 autorizados.**

Gate 1 humano: `15f5e80492c4ba95a70f9fe56e068f7ba946510d`, 09/11/2026, 17 OQ y C-H4-001 resueltas. Rama `feature/h4-payments` creada desde ese SHA; registro incorporado por cherry-pick en `bf2c8ce`. Los cuatro archivos del Spec permanecen idénticos; sus estados históricos no se reescriben. [Registro](implementation-log.md), [Gate 1](gate-1.md), [pruebas humanas](human-test-guide.md).

## Implementación e inventario

Migraciones nuevas, aditivas:

| Migración | Contenido |
|---|---|
| `20261109020000_h4_payment_model.sql` | pago, pago_aplicacion, catálogo MEDIO_PAGO, restricciones/índices, RLS/grants, vistas invoker y guards de historia/integridad |
| `20261109030000_h4_payment_commands.sql` | registrar_pago y anular_pago transaccionales, idempotencia, locks, versiones y dos eventos mínimos |
| `20261109040000_h4_enrollment_guards.sql` | Sustituye el guard H3 existente para aplicar solo restricciones financieras aprobadas; conserva CHG-H3-011 |
| `20261109050000_logical_conflicts_pt409.sql` | Correccion pre-Gate 2: contratos de conflicto logico PT409 en cuatro funciones existentes |

Inventario final controlado por `assertSecurityInventory`: **24 tablas públicas, 2 vistas invoker, 19 RPC públicas, 18 funciones privadas, 27 policies SELECT authenticated, 19 migraciones**. El verificador distingue tablas y vistas: una vista no se presenta como tabla con RLS; exige `security_invoker=true` y conserva los controles de sus tablas base. Los 52 pares objeto/rol de grants (26 objetos × authenticated/anon) se comprueban explícitamente: únicamente SELECT authenticated; sin DML/TRUNCATE cliente.

Tablas públicas: alumno, alumno_contacto_emergencia, app_roles, app_user_roles, app_users, auditoria, capitania, carrera, carrera_materia, catalogo, catalogo_valor, ciclo, ciclo_materia, ciclo_tarifa, departamento, distrito, empresa_patrocinadora, materia, matricula, matricula_cargo, **pago, pago_aplicacion**, provincia, tarifa. Permanecen los dos contadores privados y la secuencia de Alumno H3; ninguno nuevo para pagos.

Vistas nuevas: **matricula_cargo_saldo** para imputación manual por cargo; **matricula_saldo** para resumen completo de matrícula independiente de páginas del historial. PostgreSQL calcula base/abonado/pendiente en cada consulta, sin saldo almacenado, clamp ni repricing. La UI solicita proyecciones monetarias como texto y calcula previsualizaciones en centavos enteros BigInt; la autoridad sigue siendo DB.

RPC finales: guardar_materia, guardar_carrera, cambiar_active_materia, cambiar_active_carrera, guardar_ciclo, cambiar_materia_ciclo, cambiar_estado_ciclo, guardar_alumno, guardar_contacto_emergencia, retirar_contacto_emergencia, guardar_empresa_patrocinadora, guardar_tarifa, cambiar_activo_tarifa, guardar_ciclo_tarifas, registrar_matricula, editar_matricula, anular_matricula, **registrar_pago, anular_pago**. Solo las dos últimas son nuevas. No endpoint de deuda, recuperación, mantenimiento de medios ni fallos.

Funciones privadas finales: academic_user, apply_enrollment_charges, assert_fields, audit_change, audit_enrollment, authorize, carrera_minimum, enrollment_snapshot, functional_user, guard_enrollment_history, **guard_payment_history**, has_active_role, require_catalog, require_version, stamp_update, sync_missing, validate_alumno, **validate_payment_applications**. Los dos helpers nuevos son triggers acotados para inmutabilidad e integridad diferida por cargo/suma; no reciben tablas, SQL, actor ni comandos genéricos. Todos con owner postgres/search_path vacío y permisos mínimos. Solo has_active_role/academic_user/functional_user mantienen EXECUTE authenticated para lectura de seguridad.

Policies nuevas: `payment_read` en pago y pago_aplicacion, ambas SELECT para Director/Coordinador activos usando el helper académico existente. Las 25 anteriores permanecen. Admin sin rol financiero conserva solo el evento mínimo de auditoría, sin tablas ni vistas financieras.

Índices nuevos: pago_matricula_fecha, pago_aplicacion_cargo; además PK, UNIQUE global permanente de idempotency_key y UNIQUE(pago_id,matricula_cargo_id). No TTL, ledger, materialización ni tabla de comandos.

Cinco triggers nuevos: pago_applications_valid, pago_aplicacion_valid (constraints diferidas); pago_history, pago_aplicacion_history; pago_stamp (helper existente). Auditoría insertada explícitamente por los dos comandos, nunca copia genérica del payload.

## Reglas comprobadas

- Importes PEN numeric(12,2), positivos; whitelist y máximo dos decimales comprobados antes de cast. Aplicaciones manuales propias/activas, sin duplicados, suma exacta y límite por cargo.
- Registro, aplicaciones, avance de matrícula y PAGO_REGISTRADO atómicos. Anulación solo Director, pago confirmado y matrícula activa; estado/datos de anulación, versiones y PAGO_ANULADO atómicos. Historia sin DELETE/edición de pagos ni aplicaciones.
- Auditoría financiera: IDs de pago/matrícula, actor y fecha DB; motivo solo al anular. Sin importes, medio, observaciones, aplicaciones, alumno ni snapshot.
- Ciclo(s) por UUID → Alumno → Matrícula → cargos ordenados → pago. Relectura y conflictos explícitos. Ambas RPC SERIALIZABLE; sin retries silenciosos ni actualización automática de expected_updated_at.
- Misma clave/contenido normalizado recupera el mismo pago incluso anulado, con medio inactivo, cargo retirado o matrícula congelada. Orden de aplicaciones y representación decimal equivalente no alteran identidad. Replay no modifica versiones/eventos. Clave distinta de contenido: conflicto.
- Cargo con aplicación vigente no se retira. Descuento final igual al aplicado se permite; inferior se rechaza. Tras anular todos los pagos puede retirarse el opcional bajo H3, sin reasignar historia; reañadir crea UUID nuevo. Cualquier pago histórico mantiene bloqueo de traslado y estados Desierto/Anulado del Ciclo.
- Patrocinador mutable bajo H3 sin reasignar finanzas; pagos particulares con/sin empresa. Cobro permitido en Programado/En curso/Cerrado. Matrícula Anulada congela también sus pagos sin reversarlos automáticamente.
- Pestaña Pagos dentro de matrícula: resumen, historial paginado, selección manual, parcial, Seleccionar todos, medio y observaciones; fecha DB solo consulta, sin concepto libre ni Editar pago. Director anula mediante diálogo con motivo.
- sessionStorage guarda únicamente UUID opaco y referencia matrícula en ámbito usuario/pestaña. No payload financiero ni PII. Lectura vacía conserva incertidumbre; recarga consulta antes de nueva alta. Anulación incierta consulta estado/actor/fecha/versión. No portabilidad automática entre dispositivos.

## Validación y límites de evidencia

Entorno local: Windows, Node 24.22.1 del runtime disponible. CI utiliza la versión fijada por `.nvmrc` y npm 10.9.0. No se cambió la versión del proyecto ni dependencias.

| Comprobación | Evidencia |
|---|---|
| lint / typecheck / git diff --check | PASSED durante construcción |
| Suite completa | 335/335 PASSED en 20 archivos tras la correccion pre-Gate 2; 320/320 corresponden al candidato anterior |
| build / build-safety | PASSED; advertencia bundle >500 kB conservada |
| Modelo primero, antes de comandos/UI | PASSED en BEGIN/ROLLBACK: tablas, RLS, grants y cinco medios |
| `test:payments:rollback` | PASSED; datos sintéticos y schema nuevo se revierten; comparación de huella de datos pre/post |
| `test:payments:isolated` | PASSED: bootstrap de esquema/referencias, invariantes, regresión H3, fallos por etapa, C-H4-001 y trece carreras reales |
| Auth/RLS, H1/H2/H3/H4, reset/repeat y expiración | PASSED en CI `42745269931` de `076261b1916d22f6bd1feff9b614d3c33606eb92` y `42746284304` de `3e0a21f7a4bf00a807ea68db2b37765562d76db3`; CI de entrega se comprueba también sobre SHA candidato exacto |

Primera CI `42744547018` de `f56b2fc` falló por conteos antiguos de catálogo en test:academic (11/67 frente a 12/72); corregido y repetido con éxito. No se interpreta ese fallo como prueba financiera pasada.

La suite local aislada crea una base temporal del mismo contenedor y copia solo esquema + app_roles/catálogos/geografía/capitanías, **nunca usuarios humanos, alumnos, matrículas ni finanzas**. La elimina en finally incluso ante fallo. Copia de esquema para concurrencia sin ACL administradas de extensiones: prueba invariantes/locks; **no sustituye la matriz de JWT/grants/RLS del stack CI desde migraciones reales**.

Las trece carreras usan procesos psql/conexiones diferentes y transacciones SERIALIZABLE. Una tercera conexión mantiene lock de Ciclo(s); se libera únicamente al observar ambas sesiones esperando mediante pg_stat_activity. Se exige un único commit, se inspeccionan saldo/filas/eventos según escenario y no se reintenta: 70+60/100; misma clave; doble anulación; pago vs descuento/retiro/traslado/estado/patrocinador/anulación de matrícula; anulación vs nuevo pago/descuento/congelamiento; misma clave global en matrículas distintas. Nunca 130 sobre 100 ni cargo pagado retirado.

Los fallos de registro (pago/aplicación/matrícula/auditoría) y de anulación (pago/matrícula/auditoría) se inyectan únicamente en la base desechable y se verifican versiones/filas/eventos intactos tras rollback. El runner seguro sobre base humana omite esas inyecciones. El caso defensivo de Ciclo Anulado prepara un estado normalmente inalcanzable bajo H3 únicamente en la copia aislada, restaura el guard y comprueba rechazo de registrar_pago.

El ensayo API descarta deliberadamente el cuerpo HTTP después de un commit real de registrar/anular, recupera desde DB y comprueba efectos únicos. Las pruebas DOM simulan además error de transporte y referencia restaurada. Esto no equivale a un ensayo humano de caída de red en navegador.

## Estado de TASK

| TASK-H4 | Estado |
|---|---|
| 001 | COMPLETA: Gate 1 humano exacto registrado |
| 002 | IMPLEMENTADA / validacion tecnica: Permisos financieros |
| 003 | IMPLEMENTADA / validacion tecnica: Saldo derivado |
| 004 | IMPLEMENTADA / validacion tecnica: Modelo pago/aplicaciones |
| 005 | IMPLEMENTADA / validacion tecnica: Dinero y validaciones |
| 006 | IMPLEMENTADA / validacion tecnica: Estados elegibles |
| 007 | IMPLEMENTADA / validacion tecnica: Restricciones H3 |
| 008 | IMPLEMENTADA / validacion tecnica: Timestamp/notas/conceptos |
| 009 | IMPLEMENTADA / validacion tecnica: Medios genericos |
| 010 | IMPLEMENTADA / validacion tecnica: Comandos transaccionales |
| 011 | IMPLEMENTADA / validacion tecnica: Idempotencia permanente |
| 012 | IMPLEMENTADA / validacion tecnica: Recuperacion minima |
| 013 | IMPLEMENTADA / validacion tecnica: Locks y versiones |
| 014 | IMPLEMENTADA / validacion tecnica: Rollback |
| 015 | IMPLEMENTADA / validacion tecnica: Auditoria minima |
| 016 | IMPLEMENTADA / validacion tecnica: Lecturas/historial |
| 017 | IMPLEMENTADA / validacion tecnica: UI manual y anulacion |
| 018 | IMPLEMENTADA / validacion tecnica: Errores y sesion |
| 019 | Parte técnica ejecutada; revisión humana PENDIENTE |
| 020 | Candidato/evidencia publicados al entregar; revisión humana de arquitectura y Gate 2 PENDIENTES |

La agrupación 002–018 incluye individualmente permisos, saldo, modelo, dinero, estados, H3, timestamps/notas, medios, comandos, idempotencia, recuperación, locks, rollback, auditoría, lecturas, UI y errores/sesión. No convierte finalización técnica en aprobación humana de 019/020.

## Estado de TEST

`T` = componente automatizado técnico PASSED en los ejecutables indicados; **no significa ejecución humana**. `U` = tests/payments.test.ts y tests/EnrollmentPayments.test.tsx; `S` = h4-payments.sql/h4-regression.sql en suite aislada; `C` = barreras reales de test-payments-isolated; `A` = JWT/API test-payments + expiración e inventario CI. Para las ampliaciones posteriores a 076261b, exigir CI SUCCESS del SHA candidato de entrega.

| TEST-H4 | Estado / evidencia |
|---|---|
| 001 | T: base/Spec inmutable, Gate 1 y límites comprobados; Gate 2 separado |
| 002 | T: A, Director/Coordinador/multirol |
| 003 | T: A, anónimo/invalidado/inactivos/rol revocado/Admin/token Auth expirado |
| 004 | T: A/S, DML/grants/whitelist e inventario |
| 005 | T: S, deuda inicial y activos |
| 006 | T: S, tarifa/default/medio no reprician historia |
| 007 | T: S, aplicaciones obligatorias y constraint diferida |
| 008 | T: S/U, propias, suma, duplicadas, exceso individual |
| 009 | T: S/U, decimal exacto y parcial; saldo leído como texto |
| 010 | T: S/U, precisión/overflow/cero/negativo/NaN/infinito |
| 011 | T: S, con/sin patrocinador |
| 012 | T: S/A/U, matrícula anulada de solo consulta |
| 013 | T: S/U, estados elegibles; fixture defensivo Anulado solo aislado |
| 014 | T: S/C, parcial, aplicaciones restantes, retiro tras anular y UUID histórico |
| 015 | T: S/C, descuento vs abonado |
| 016 | T: S/C, traslado bloqueado por pago histórico |
| 017 | T: S/U, fecha/actor forjados rechazados y fecha DB |
| 018 | T: S/U, notas planas, caso, límites y conceptos derivados |
| 019 | T: S/A, cinco medios e historia |
| 020 | T: S/A, catálogo erróneo/inactivo y sin mantenimiento nuevo |
| 021 | T: S/A/U, una RPC y respuesta completa |
| 022 | T: S/A, campos forjados/cargo ajeno |
| 023 | T: S/U, clave permanente y referencia mínima |
| 024 | T: S/C, normalización y replay sin efectos |
| 025 | T: S/U, contenido distinto produce conflicto |
| 026 | T: A/U, commit real con cuerpo descartado + transporte simulado en DOM |
| 027 | T: S, rollback y clave sin reserva huérfana |
| 028 | T: U, recarga/consulta vacía no autorizan nueva alta |
| 029 | T: A/U y regresión SessionProvider, acceso vigente/ámbito/descartar respuestas desmontadas |
| 030 | T: C, dos conexiones, barrera 70+60/100 |
| 031 | T: C, misma clave simultánea y replay consciente |
| 032 | T: C/S, misma clave global y matrículas distintas |
| 033 | T: C, cruces H3 y estado |
| 034 | T: S, fallos por etapa registro/anulación |
| 035 | T: S, auditoría fallida revierte todo |
| 036 | T: S/A, dos eventos mínimos y Admin sin finanzas |
| 037 | T: A/S, paginación estable y resumen completo/RLS coherente |
| 038 | T: S/A, recuperación anulado/medio inactivo/otros pagos |
| 039 | T: U, UI contextual y acciones por rol |
| 040 | PARCIAL técnico U: etiquetas/foco/diálogo/texto/almacenamiento. Ensayo visual, móvil, teclado completo/temas/forced-colors real PENDIENTE humano |
| 041 | T: S/U/C, conflictos explícitos, borrador y consulta voluntaria |
| 042 | T: CI, regresión y reconstrucción desechable; exigir SHA candidato SUCCESS |
| 043 | PENDIENTE humano, sin resultados heredados de H3 |
| 044 | PENDIENTE revisión arquitectónica humana; inventario preparado no equivale a aprobación |
| 045 | PENDIENTE Gate 2 humano, no acceptance ni merge |
| 046 | T: S/A/U, anulación Director y datos DB |
| 047 | T: S/A/U, Coordinador/matrícula anulada/motivo inválido |
| 048 | T: S/C/A/U, transición única y recuperación de anulación |
| 049 | T: S/C, Desierto/Anulado bloqueados con pagos confirmados/anulados |
| 050 | T: S/C, traslado sigue bloqueado tras anular todos |
| 051 | T: S/C, empresa agregada/cambiada/quitada sin reasignación |
| 052 | T: S/C, igualdad con abonado válida; inferior rechazada |
| 053 | T: U/S, check/parcial/Seleccionar todos/cero |
| 054 | T: U/S, notas y ausencia de fecha/concepto manual |
| 055 | T: C/S, anular vs pagar/descontar/congelar |

## Riesgos, pendientes y desviaciones

No se identificó una desviación funcional intencionada respecto del Spec aprobado. Se conservan sus cuatro documentos byte-idénticos. No API adicional, infraestructura, deuda materializada, ledger, proveedores, facturación, PDF/Storage, devoluciones ni H5.

- Revisión humana H4 completa PENDIENTE; **forced-colors real NO VERIFICADO**. No se presenta como PASSED ni como residual aceptado de H4.
- Bundle >500 kB: advertencia de build; no se añadió infraestructura ni una optimización ajena a H4.
- Sin ensayo de carga masiva: evidencia de concurrencia acotada y reproducible, no promesa de throughput.
- Si se pierde el borrador y DB aún no devuelve fila, queda una resolución pendiente con la misma referencia. No se inventan aplicaciones ni se emite otra clave automáticamente; límite previsto de continuidad mínima sin payload persistido.
- La base humana no se reseteó ni recibió fixtures automáticos confirmados de H4. Secuencias pueden consumir números en transacciones revertidas, conforme al código Alumno sin requisito gapless. Las nuevas migraciones se aplican para pruebas humanas mediante migration up --local, no reset.

La entrega informa SHA candidato exacto y su ejecución CI. Ninguna de estas verificaciones concede Gate 2. **H5 NO INICIADO.**

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

Residual de compatibilidad: no se ejecuta la Data API hospedada ni PostgREST 14. Se valida el contrato PT409 / HTTP 409 en el stack local/CI existente (CLI 2.121.0 / PostgREST 16.4), siguiendo la recomendacion oficial de Supabase. No se afirma haber reproducido el bucle de PostgREST 14. Los residuales humanos anteriores, forced-colors real NO VERIFICADO y bundle >500 kB, permanecen sin cambios.

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

Validacion local: lint/typecheck, 359/359 pruebas en 21 archivos PASSED; suite financiera aislada conserva las trece carreras, 70+60/100, PT409 y errores nativos. Rollback local PASSED sin fixtures persistidos. Build/build-safety y diff-check se completan antes de publicacion. Pruebas API nuevas de proyeccion/orden numerico 100-20-0/filtros/roles e IDs manipulados, junto con regresion H1-H3/expiracion/reset-repeat, se ejecutaran en CI desechable; PENDIENTES hasta observar resultado real.

Guia humana, Bloque 1 actualizado al nuevo acceso principal. Todas las pruebas humanas siguen PENDIENTES; no se infieren resultados de los tests DOM. Residuales: forced-colors real y QA visual/movil pendientes; busqueda sin persistencia entre recargas; sin ensayo masivo de throughput. Misma arquitectura React + Supabase/RLS/RPC concretas, sin backend adicional ni motor de deuda.
