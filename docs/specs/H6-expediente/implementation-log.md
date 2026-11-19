# H6 — Registro de construcción

## Inicio autorizado — 18/11/2026

[Gate 1 humano](gate-1.md) sobre `e2de23443f887d4050aeb910a13e3611ae751be5`, CI44399674178 SUCCESS, árbol limpio. Rama `feature/h6-expediente` nace exactamente de ese Spec. TASK-H6-001 satisfecha por autorización humana; cuatro documentos aprobados sin cambios.

Bloque inicial en curso: TASK-018,002,003,004,005,017,006,007 y sincronización/regularización/traslado pertinente TASK-019. No Storage/renderers antes de puerta técnica DB/API/concurrencia y regresión. TEST-H6 permanecen NO EJECUTADOS hasta evidencia individual registrada en technical-results.md.

Se preservan seis residuales H5/GATE-A01 (hosted/PostgREST14, CPU/memoria, forced-colors, bundle, limpieza manual). Gate2 pendiente; sin acceptance/merge.

## Bloque 1 — puerta técnica antes de Storage

Modelo aditivo en 20261118010000/020000: cuatro tablas previstas (la cuarta solo metadata técnica, sin bucket/bytes), dos helpers específicos sync_document_context/guard_document_history, cuatro RPC académicas concretas, una vista invoker y cuatro policies SELECT. Maestro de nueve tipos del Spec, sin personas ni configuración inferida. Sincronización actualiza condiciones efectivas de todas las ACTIVO en una transacción; retiro/traslado conservan historia, retorno crea contexto nuevo y guard impide reactivación histórica.

Pruebas reales en base h6_test UUID desechable: copia de esquema/ACL y solo referencias, sin usuarios/alumnos/pagos humanos. Contenedor PostgREST temporal con JWT de ensayo propio para esa DB; se destruyen contenedor/base/rol al terminar. No reset ni cambios persistentes a la base humana. SQL/HTTP: PT409/409 sin mutación/éxito auditado, RLS académico vs ADMIN, denegación DML cliente y payload actor inesperado. Dos conexiones SERIALIZABLE y barrera prueban config/config y config-obligatorio/retiro, sin retries.

Resultado: PASSED de los escenarios ejecutados de configuración/aplicación completa/retirada/reactivación/conversión obligatoria/conteos/regularización, metadata confirmada preservada, rollback de configuración+sincronización+auditoría, traslado/regreso, exclusión de ANULADO. Regresión SQL H3/H4 financiera/académica y H5 fuente/cierre/snapshots PASSED. Lint/typecheck PASSED; suite existente 440/440 PASSED. Se corrigieron en ensayo aislado una ambigüedad de alias SQL y el bootstrap del fallo temporal H5; no se omitieron aserciones. Puerta técnica inicial satisfecha; continuar Storage según dependencias. CI de este bloque se verifica en paralelo antes de la entrega completa.

## Corrección de bootstrap CI del bloque 1

CI44406885369 sobre cd5f8c50ec2c244b03476d163597e81d29ca9ec7: lint/tipos/unidades, Auth/RLS, académico, matrícula y pagos PASSED; nuevo ensayo aislado falló por reaplicar CREATE TABLE tipo_documento cuando el esquema de CI ya incluía H6. Se corrigió solo el bootstrap: reconocer objetos existentes, restaurar referencias tipadas explícitamente con actor sintético y preservar ACL de objetos (sin ALTER DEFAULT PRIVILEGES de roles ajenos en la DB desechable). Prueba local con referencias documentales vacías equivalente a CI: DB/API/dos carreras/regresión H3–H5 PASSED; lint/diff-check PASSED. Sin debilitar aserciones ni tocar datos humanos. No declarar esa CI fallida como SUCCESS; el nuevo SHA se verifica posteriormente.

## Bloque 2 — archivos y renderers (18/11/2026)

Construido después de CI inicial `44408192177` SUCCESS: bucket privado persistente, cuatro RPC exclusivamente service_role, tres Edge cerradas; reserva/confirmación/aborto y descarga histórica con reautorización tras IO. Sin nuevas tablas/helpers ni modificación de reglas financieras. Se comparte renderer H5 mediante perfil H6 fijo, manteniendo defaults H5. Cinco formatos, fecha/edad de generación, apoderado explícito por Carta Poder. Confirmados inmutables/sin TTL; limpieza local manual dry-run, máximo50 nunca confirmados mayores24h.

Regresión aislada real DB/PostgREST PASSED: reserva sin completitud falsa; confirmación/puntero/auditoría atómicos con actor validado servidor; replay explícito exacto sin segundo éxito; aborto no elimina confirmado; fuente cambiada y retiro durante IO rechazan confirmación; matrícula anulada conserva descarga histórica; revocar rol deniega. Los casos de metadata no afirman haber escrito bytes Storage. Nueva suite CI exige Auth/Edge/Storage reales y fallo de auditoría tras upload; pendiente hasta ejecutar CI de este bloque.

Parser conservador: PDF clásico sin cifrado/formularios/enlaces/acciones; se rechazan estructuras ObjStm/XRef comprimidas y filtros no verificables. Límite adicional de compatibilidad explícito, no antivirus/CDR ni soporte de cualquier PDF. Se recorren diccionarios directos/indirectos y se limita inflación; JPEG/PNG usan decodificación real acotada. Tipos Deno verificados localmente; nuevas dependencias fijadas jpeg-js0.4.4/pngjs7.0.0 y @types/pngjs6.0.5. No hosted/CPU/memoria inferidos.

CI44433564200 de `946e645f76f4cabc3256d7f5fa2cb2a1a2fc1fb9` falló antes de ejecutar integración: Deno en caché local omitió registrar el specifier automático npm:@types/node@*, exigido por check fresco Linux. Se fija su resolución existente 22.5.4 en los tres lockfiles; no se elimina --frozen ni se cambia la versión del runtime. El run fallido no acredita Storage ni pruebas de integración.
