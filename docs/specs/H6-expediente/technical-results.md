# H6 — Evidencia técnica de construcción

Estado inicial: Gate1 aprobado sobre `e2de23443f887d4050aeb910a13e3611ae751be5`; construcción autorizada en `feature/h6-expediente`. Ningún TEST-H6 marcado PASSED todavía. Resultados se agregan por bloque real, sin modificar el plan aprobado.

Residuales: Hosted Edge/PostgREST14 NO PROBADOS DIRECTAMENTE; CPU y memoria NO MEDIDAS; forced-colors H5 NO VERIFICADO; bundle >500kB; limpieza H5 manual. Gate2 PENDIENTE. Sin acceptance/merge a main.

## Bloque 1 — puerta técnica antes de Storage

Modelo aditivo en 20261118010000/020000: cuatro tablas previstas (la cuarta solo metadata técnica, sin bucket/bytes), dos helpers específicos sync_document_context/guard_document_history, cuatro RPC académicas concretas, una vista invoker y cuatro policies SELECT. Maestro de nueve tipos del Spec, sin personas ni configuración inferida. Sincronización actualiza condiciones efectivas de todas las ACTIVO en una transacción; retiro/traslado conservan historia, retorno crea contexto nuevo y guard impide reactivación histórica.

Pruebas reales en base h6_test UUID desechable: copia de esquema/ACL y solo referencias, sin usuarios/alumnos/pagos humanos. Contenedor PostgREST temporal con JWT de ensayo propio para esa DB; se destruyen contenedor/base/rol al terminar. No reset ni cambios persistentes a la base humana. SQL/HTTP: PT409/409 sin mutación/éxito auditado, RLS académico vs ADMIN, denegación DML cliente y payload actor inesperado. Dos conexiones SERIALIZABLE y barrera prueban config/config y config-obligatorio/retiro, sin retries.

Resultado: PASSED de los escenarios ejecutados de configuración/aplicación completa/retirada/reactivación/conversión obligatoria/conteos/regularización, metadata confirmada preservada, rollback de configuración+sincronización+auditoría, traslado/regreso, exclusión de ANULADO. Regresión SQL H3/H4 financiera/académica y H5 fuente/cierre/snapshots PASSED. Lint/typecheck PASSED; suite existente 440/440 PASSED. Se corrigieron en ensayo aislado una ambigüedad de alias SQL y el bootstrap del fallo temporal H5; no se omitieron aserciones. Puerta técnica inicial satisfecha; continuar Storage según dependencias. CI de este bloque se verifica en paralelo antes de la entrega completa.

No atribuir un PASSED completo a todos los TEST-H6 por estas comprobaciones: aún faltan subcasos, Storage real, contenido de archivos, renderers, UX y regresión integral. Los casos ejecutados cubren parcialmente TEST-002…010/018…024/034…044/049/051; metadata sintética no equivale a bytes cargados/generados. La matriz final individual se completará con evidencia de cada bloque. Residuales previos y Gate2 pendiente conservados.
