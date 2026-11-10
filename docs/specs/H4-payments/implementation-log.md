# H4 — Registro de construcción

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
