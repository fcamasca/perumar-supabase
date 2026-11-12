# H4 — Pagos: aceptación y cierre

Fecha: **12/11/2026 (America/Lima)**. Decisor: usuario/revisor humano de esta conversación.
Estado: **H4 CLOSED / ACEPTADO; Gate 2 APROBADO HUMANAMENTE**.
Decisión posterior explícita: «Cerrar formalmente H4 — Pagos», integrar a main mediante PR/merge trazable y, solo después de main verde, iniciar H5 únicamente en fase SPEC. No se autoriza construcción de H5.

## Candidato, gates y trazabilidad

- Rama: `feature/h4-payments`.
- Gate 1 y Spec aprobado: `15f5e80492c4ba95a70f9fe56e068f7ba946510d`; [registro](gate-1.md).
- Candidato funcional aprobado exacto: `0091190f0cf353d744d6b2d9a6447916d9c882d6`.
- Registro humano documental: `6943d5416dcf24ea81b6f3b30867090c2d3d83df`.
- Gate 2 aprobado: [gate-2.md](gate-2.md), publicado en `2b6a90f58e1165b2e729e8daf843b03390803530`.
- Main previo al cierre: `ba81106837de881b2b243e28b862dfd4a315a949` (merge de H3).
- Al comenzar este cierre, HEAD local/remoto coincide con `2b6a90f`; working tree limpio. `0091190` es ancestro y desde él solo existe documentación. Los cuatro documentos originales del Spec se conservan idénticos al Gate 1, incluidos sus estados históricos.

Este cierre prevalece sobre restricciones históricas de cierre no autorizado, sin reescribir las decisiones originales. Los detalles cronológicos quedan en [implementation-log.md](implementation-log.md) y [technical-results.md](technical-results.md).

## Enmiendas y correcciones aceptadas en el candidato

| Cambio | Evidencia |
| --- | --- |
| CHG-H4-001: acceso principal a Pagos por Alumno/Ciclo | [Enmienda UX](approved-direct-payment-access-amendment.md); misma operación financiera, contexto autorizado y vista invoker de lectura |
| CHG-H4-002: todas las tarifas activas incluidas inicialmente; opcionales retirables por alumno | [Enmienda funcional](approved-default-charges-amendment.md); sin backfill, protección de pagos vigentes e historia conservadas |
| Conflictos lógicos PT409 | Migración aditiva `20261109050000_logical_conflicts_pt409.sql`; reserva 40001/40P01 para fallos reales de PostgreSQL |
| Correcciones UX posteriores | Formulario compacto, exclusión de matrículas anuladas de los listados operativos, selección guardada al reabrir, check de todos los opcionales, menú Más acciones para traslado, Guardar cargos solo con cambios y confirmación persistente, errores vinculados al importe y estilos de validación |

No se incorporan funcionalidades H5+, facturación, ledger, deuda persistida, backend adicional ni infraestructura ajena.

## CI exacta y evidencia automática

| Commit | CI | Resultado verificado |
| --- | --- | --- |
| Funcional `0091190f0cf353d744d6b2d9a6447916d9c882d6` | [42938230861](https://github.com/fcamasca/perumar-supabase/actions/runs/42938230861) | COMPLETED / SUCCESS; 372/372 pruebas |
| Registro humano `6943d5416dcf24ea81b6f3b30867090c2d3d83df` | [43267712701](https://github.com/fcamasca/perumar-supabase/actions/runs/43267712701) | COMPLETED / SUCCESS; solo documentación |
| Registro Gate 2 `2b6a90f58e1165b2e729e8daf843b03390803530` | [43269767208](https://github.com/fcamasca/perumar-supabase/actions/runs/43269767208) | COMPLETED / SUCCESS; solo documentación |

La CI exacta del commit de este cierre se verifica antes de integrar; se informa con su SHA/run en la entrega para evitar una referencia circular. La CI de main también debe terminar SUCCESS antes de crear la rama Spec H5. No se resetea la base humana ni se crean fixtures financieros en ella para este cierre.

| Comprobación | Evidencia vigente |
| --- | --- |
| Lint / typecheck / unitarias / build / build-safety / diff-check | PASSED; 372/372 en 21 archivos; advertencia de bundle conservada |
| Transacción financiera | registrar_pago/anular_pago con importes/aplicaciones exactos en centavos, validación DB, locks ordenados y SERIALIZABLE |
| Concurrencia 70 + 60 sobre saldo 100 | Dos conexiones reales con barrera: un commit, sin sobrepago, saldo no negativo ni retry oculto |
| Otras carreras y rollback | Trece carreras reales; UUID concurrente, anulación, descuento, retiro opcional, traslado, estado de Ciclo y edición de patrocinador; fallos por etapa sin efectos parciales |
| Idempotencia | UUID global permanente; replay explícito del mismo payload sin segundo pago/evento, recuperación por lectura y protección ante respuesta incierta |
| Conflictos | PT409 / HTTP 409 real vía PostgREST con versión obsoleta, sin mutación ni auditoría de éxito; 40001/40P01 reales conservados y sin reintentos React |
| RLS/grants | SELECT autenticado autorizado, vistas security_invoker, rechazo de DML cliente y matriz JWT de roles; solo Director anula |
| Reglas H3/H4 | No retiro de cargos con aplicaciones vigentes; traslado y estados protegidos por pagos históricos; snapshots/códigos e historia conservados; saldo derivado |
| Auditoría | Eventos mínimos PAGO_REGISTRADO/PAGO_ANULADO, atómicos con la operación; sin copia genérica de PII ni notas personales |
| Integración | Auth/RLS, regresión H1–H4, expiración/restauración, reconstrucción y repetición SUCCESS en CI |
| Inventario final | 24 tablas públicas, 3 vistas invoker, 19 RPC públicas, 18 helpers privados, 27 policies SELECT authenticated, 21 migraciones; ningún objeto nuevo en el cierre |

## Evidencia humana y residuales

[human-results.md](human-results.md): **OK global reportado sobre el recorrido H4**. Entorno informado: **Chrome / Windows 11 Pro**. No se inventa versión de Chrome, roles concretos ni ejecución detallada de TEST/subcasos no reportados. La aprobación humana del paquete es independiente de las pruebas automáticas.

- **Forced-colors / contraste alto real de Windows: NO VERIFICADO — residual aceptado** expresamente para Gate 2 H4. No PASSED, ejecutado, validado ni heredado de H3.
- **Bundle >500 kB:** advertencia de build conservada, sin declararla resuelta.
- **Data API hospedada / PostgREST 14: no probada directamente.** El contrato se probó en el stack local/CI documentado (CLI 2.121.0 / PostgREST 16.4); no se atribuye una prueba hospedada ni humana inexistente.
- Se conservan los demás límites técnicos documentados: concurrencia acotada sin ensayo de carga masiva y continuidad mínima si se perdió un borrador y DB aún no devuelve resultado. No se reconstruyen importes ni se genera otra clave automáticamente.

## Cierre e integración autorizados

El commit de cierre solo contiene documentación de cierre y referencias de estado. No modifica código, migraciones, dependencias, UI, RLS, RPC ni los cuatro documentos del Spec. Se revisa el diff y se ejecuta git diff --check.

**H4 CLOSED / ACEPTADO / listo para integración.** La integración se ejecuta únicamente después de CI SUCCESS del cierre, mediante PR y merge commit, sin squash ni rebase que pierda candidato, enmiendas, Gate 2 y acceptance. **INTEGRADO** se hace efectivo al incorporar este registro a main y verificarlo. Los SHA de cierre/merge y CI de main se entregan al finalizar.

## Continuación H5 autorizada, solo Spec

La instrucción actual sustituye el bloqueo anterior de inicio H5: una vez H4 esté integrado y main verde, crear `feature/h5-enrollment-pdf-spec` desde ese main exacto y elaborar exclusivamente los cuatro documentos de Spec de Ficha de matrícula PDF, según PLAN. No se modifica el alcance H5 ni se hereda aprobación de Gate 1. No se implementan Edge Functions, PDF, Storage, buckets, migraciones, React o dependencias. Se detiene al entregar el Spec para resolver OQ/Gate 1 H5; ningún backend alternativo queda autorizado.
