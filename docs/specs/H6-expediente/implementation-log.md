# H6 — Registro de construcción

## Inicio autorizado — 18/11/2026

[Gate 1 humano](gate-1.md) sobre `e2de23443f887d4050aeb910a13e3611ae751be5`, CI44399674178 SUCCESS, árbol limpio. Rama `feature/h6-expediente` nace exactamente de ese Spec. TASK-H6-001 satisfecha por autorización humana; cuatro documentos aprobados sin cambios.

Bloque inicial en curso: TASK-018,002,003,004,005,017,006,007 y sincronización/regularización/traslado pertinente TASK-019. No Storage/renderers antes de puerta técnica DB/API/concurrencia y regresión. TEST-H6 permanecen NO EJECUTADOS hasta evidencia individual registrada en technical-results.md.

Se preservan seis residuales H5/GATE-A01 (hosted/PostgREST14, CPU/memoria, forced-colors, bundle, limpieza manual). Gate2 pendiente; sin acceptance/merge.

## Bloque 1 — puerta técnica antes de Storage

Modelo aditivo en 20261118010000/020000: cuatro tablas previstas (la cuarta solo metadata técnica, sin bucket/bytes), dos helpers específicos sync_document_context/guard_document_history, cuatro RPC académicas concretas, una vista invoker y cuatro policies SELECT. Maestro de nueve tipos del Spec, sin personas ni configuración inferida. Sincronización actualiza condiciones efectivas de todas las ACTIVO en una transacción; retiro/traslado conservan historia, retorno crea contexto nuevo y guard impide reactivación histórica.

Pruebas reales en base h6_test UUID desechable: copia de esquema/ACL y solo referencias, sin usuarios/alumnos/pagos humanos. Contenedor PostgREST temporal con JWT de ensayo propio para esa DB; se destruyen contenedor/base/rol al terminar. No reset ni cambios persistentes a la base humana. SQL/HTTP: PT409/409 sin mutación/éxito auditado, RLS académico vs ADMIN, denegación DML cliente y payload actor inesperado. Dos conexiones SERIALIZABLE y barrera prueban config/config y config-obligatorio/retiro, sin retries.

Resultado: PASSED de los escenarios ejecutados de configuración/aplicación completa/retirada/reactivación/conversión obligatoria/conteos/regularización, metadata confirmada preservada, rollback de configuración+sincronización+auditoría, traslado/regreso, exclusión de ANULADO. Regresión SQL H3/H4 financiera/académica y H5 fuente/cierre/snapshots PASSED. Lint/typecheck PASSED; suite existente 440/440 PASSED. Se corrigieron en ensayo aislado una ambigüedad de alias SQL y el bootstrap del fallo temporal H5; no se omitieron aserciones. Puerta técnica inicial satisfecha; continuar Storage según dependencias. CI de este bloque se verifica en paralelo antes de la entrega completa.
