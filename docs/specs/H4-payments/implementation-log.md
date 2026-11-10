# H4 â€” Registro de construcciÃ³n

Gate 1 aprobado humanamente el 09/11/2026 sobre `15f5e80492c4ba95a70f9fe56e068f7ba946510d`.
Rama de construcciÃ³n: `feature/h4-payments`, creada desde ese SHA. Registro incorporado mediante cherry-pick: `bf2c8ce` (SHA de inicio de construcciÃ³n).
Los cuatro documentos aprobados se conservan idÃ©nticos. Las 17 OQ y C-H4-001 estÃ¡n resueltas; [Gate 1](gate-1.md).

## Bloques

| Bloque | Estado | Evidencia |
|---|---|---|
| A: modelo, dinero, permisos, saldo y protocolo | EN CURSO | ValidaciÃ³n progresiva pendiente |
| B: registro transaccional | PENDIENTE | â€” |
| C: idempotencia y recuperaciÃ³n | PENDIENTE | â€” |
| D: anulaciÃ³n | PENDIENTE | â€” |
| E: restricciones H3 | PENDIENTE | â€” |
| F: UI, regresiÃ³n y candidato | PENDIENTE | â€” |

No se resetea la base humana. Las pruebas locales de escritura deben revertirse mediante ROLLBACK; la concurrencia con fixtures confirmados se limita a una base desechable.

Gate 2 PENDIENTE. No acceptance, merge a main ni H5 autorizados.

## Decisiones de implementación

- Dos tablas, dos RPC concretas; dos vistas invoker distinguen saldo por cargo y resumen de matrícula independiente de paginación.
- Dos helpers privados nuevos exclusivamente para integridad diferida de aplicaciones e inmutabilidad financiera. Autorización, catálogo, versiones, sello y guard H3 se reutilizan.
- Auditoría explícita en los dos comandos: IDs, actor, instante DB y motivo de anulación. No payload financiero ni PII.
- Concurrencia local usa una base temporal del mismo contenedor: copia solo esquema y catálogos públicos; dos conexiones SERIALIZABLE esperan una barrera observada en pg_stat_activity. Se elimina en finally. No se copia negocio humano.
- Matriz Auth/RLS se ejecutará en CI desechable. No confundir claims SQL de las pruebas locales con JWT ordinario.
- Pruebas locales ejecutadas: modelo primero en rollback; script rollback con errores forzados por etapa; cinco carreras reales (70/60, UUID, doble anulación, pago/descuento, anulación/pago), sin retries. Todas PASSED.
