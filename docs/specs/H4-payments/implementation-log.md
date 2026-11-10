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
| F: UI, regresion y candidato | IMPLEMENTADO / evidencia de entrega | 320 unitarias; CI del candidato exacto se comprueba antes de entregar; humanos pendientes |

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
