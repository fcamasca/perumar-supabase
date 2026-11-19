# H6 — Evidencia técnica de construcción

Estado inicial: Gate1 aprobado sobre `e2de23443f887d4050aeb910a13e3611ae751be5`; construcción autorizada en `feature/h6-expediente`. Ningún TEST-H6 marcado PASSED todavía. Resultados se agregan por bloque real, sin modificar el plan aprobado.

Residuales: Hosted Edge/PostgREST14 NO PROBADOS DIRECTAMENTE; CPU y memoria NO MEDIDAS; forced-colors H5 NO VERIFICADO; bundle >500kB; limpieza H5 manual. Gate2 PENDIENTE. Sin acceptance/merge a main.

## Bloque 1 — puerta técnica antes de Storage

Modelo aditivo en 20261118010000/020000: cuatro tablas previstas (la cuarta solo metadata técnica, sin bucket/bytes), dos helpers específicos sync_document_context/guard_document_history, cuatro RPC académicas concretas, una vista invoker y cuatro policies SELECT. Maestro de nueve tipos del Spec, sin personas ni configuración inferida. Sincronización actualiza condiciones efectivas de todas las ACTIVO en una transacción; retiro/traslado conservan historia, retorno crea contexto nuevo y guard impide reactivación histórica.

Pruebas reales en base h6_test UUID desechable: copia de esquema/ACL y solo referencias, sin usuarios/alumnos/pagos humanos. Contenedor PostgREST temporal con JWT de ensayo propio para esa DB; se destruyen contenedor/base/rol al terminar. No reset ni cambios persistentes a la base humana. SQL/HTTP: PT409/409 sin mutación/éxito auditado, RLS académico vs ADMIN, denegación DML cliente y payload actor inesperado. Dos conexiones SERIALIZABLE y barrera prueban config/config y config-obligatorio/retiro, sin retries.

Resultado: PASSED de los escenarios ejecutados de configuración/aplicación completa/retirada/reactivación/conversión obligatoria/conteos/regularización, metadata confirmada preservada, rollback de configuración+sincronización+auditoría, traslado/regreso, exclusión de ANULADO. Regresión SQL H3/H4 financiera/académica y H5 fuente/cierre/snapshots PASSED. Lint/typecheck PASSED; suite existente 440/440 PASSED. Se corrigieron en ensayo aislado una ambigüedad de alias SQL y el bootstrap del fallo temporal H5; no se omitieron aserciones. Puerta técnica inicial satisfecha; continuar Storage según dependencias. CI de este bloque se verifica en paralelo antes de la entrega completa.

No atribuir un PASSED completo a todos los TEST-H6 por estas comprobaciones: aún faltan subcasos, Storage real, contenido de archivos, renderers, UX y regresión integral. Los casos ejecutados cubren parcialmente TEST-002…010/018…024/034…044/049/051; metadata sintética no equivale a bytes cargados/generados. La matriz final individual se completará con evidencia de cada bloque. Residuales previos y Gate2 pendiente conservados.

## Corrección de bootstrap CI del bloque 1

CI44406885369 sobre cd5f8c50ec2c244b03476d163597e81d29ca9ec7: lint/tipos/unidades, Auth/RLS, académico, matrícula y pagos PASSED; nuevo ensayo aislado falló por reaplicar CREATE TABLE tipo_documento cuando el esquema de CI ya incluía H6. Se corrigió solo el bootstrap: reconocer objetos existentes, restaurar referencias tipadas explícitamente con actor sintético y preservar ACL de objetos (sin ALTER DEFAULT PRIVILEGES de roles ajenos en la DB desechable). Prueba local con referencias documentales vacías equivalente a CI: DB/API/dos carreras/regresión H3–H5 PASSED; lint/diff-check PASSED. Sin debilitar aserciones ni tocar datos humanos. No declarar esa CI fallida como SUCCESS; el nuevo SHA se verifica posteriormente.

## Bloque 2 — verificación incremental

- Migración tercera aditiva verificada sobre esquema/referencias desechables, sin reset humano. Contratos service_role reales vía PostgREST PASSED (reserva/confirmación/replay/aborto/fuente/retiro/anulación/revocación).
- Suite local de trabajo 475/475 PASSED; lint/typecheck PASSED. Incluye UI aún en bloque posterior separado.
- Deno2.1.4: tres entry points comprobados; locks congelados.
- Incremento acumulado: cuatro tablas, una vista invoker, ocho RPC públicas específicas, dos helpers privados, un bucket privado persistente y tres Edge; 28 tablas públicas/5 vistas/28 funciones públicas/21 helpers/31 policies SELECT/26 migraciones SQL/2 buckets privados/4 Edge contando H5.
- Seguridad/IO: ningún campo privilegiado desde React; respuestas cerradas sin keys/PII, compensación solo después de aborto reconocido, nunca eliminar bytes confirmados ante respuesta incierta.
- Residual adicional: PDF comprimido estructural o filtros no verificables rechazados (subconjunto admitido conservador). No se ofrece antivirus.
- Auth/Edge/Storage integral nuevo PENDIENTE CI; pruebas humanas H6 PENDIENTES; Gate2 PENDIENTE. Los seis residuales H5/GATE-A01 se mantienen.
