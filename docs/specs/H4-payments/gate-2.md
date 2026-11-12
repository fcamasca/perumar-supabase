# H4 — Pagos: Gate 2 aprobado humanamente

Fecha de registro: **12/11/2026 (America/Lima)**.
Decisor: usuario/revisor humano de esta conversación.
Estado: **Gate 2 APROBADO HUMANAMENTE; cierre formal H4 NO AUTORIZADO**.
Declaración explícita: «Gate 2 de H4 — Pagos queda APROBADO HUMANAMENTE».

## Candidato y trazabilidad verificada

| Evidencia | Referencia exacta | Resultado |
| --- | --- | --- |
| Rama | `feature/h4-payments` | Se conserva la rama de construcción |
| Candidato funcional aprobado | `0091190f0cf353d744d6b2d9a6447916d9c882d6` | Aprobado expresamente por el usuario |
| Pruebas del candidato | 372/372 | PASSED automático; no equivale a subcasos humanos |
| CI funcional | [Run 42938230861](https://github.com/fcamasca/perumar-supabase/actions/runs/42938230861) | COMPLETED / SUCCESS, SHA funcional exacto verificado |
| Registro humano documental posterior | `6943d5416dcf24ea81b6f3b30867090c2d3d83df` | Solo documentación, sin cambios funcionales |
| CI de ese registro documental | [Run 43267712701](https://github.com/fcamasca/perumar-supabase/actions/runs/43267712701) | COMPLETED / SUCCESS, SHA documental exacto verificado |
| Gate 1 | `15f5e80492c4ba95a70f9fe56e068f7ba946510d` | [Registro histórico](gate-1.md) |

Al iniciar este registro, working tree limpio y HEAD exactamente `6943d5416dcf24ea81b6f3b30867090c2d3d83df`. El candidato funcional es ancestro. La diferencia desde `0091190` comprende únicamente cuatro documentos de evidencia humana; no existe código funcional posterior. Las CI se comprobaron por sus metadatos y el resultado del job verify.

Las enmiendas posteriores a Gate 1 y correcciones del candidato se conservan en [implementation-log.md](implementation-log.md), [technical-results.md](technical-results.md), [CHG-H4-001](approved-direct-payment-access-amendment.md) y [CHG-H4-002](approved-default-charges-amendment.md). Los cuatro documentos aprobados requirements.md, design.md, tasks.md y test-plan.md permanecen idénticos al SHA de Gate 1, incluidos sus estados históricos.

## Evidencia humana y límites de la declaración

El usuario reportó **OK global de las pruebas humanas sobre el recorrido H4** y confirmó la aprobación de este candidato. Entorno informado: **Chrome / Windows 11 Pro**. No se informó versión de Chrome ni roles concretos utilizados. No se inventan versiones, roles, pasos o resultados individuales de subcasos que no se desglosaron.

[human-results.md](human-results.md) conserva el reporte y [human-test-guide.md](human-test-guide.md) el recorrido de referencia. Una aprobación global no convierte cada TEST, ensayo de recuperación, concurrencia, accesibilidad o revisión de arquitectura en una ejecución humana individual reportada. Se distingue de la evidencia automática ya publicada.

## Residuales preservados

- **Forced-colors / contraste alto real de Windows: NO VERIFICADO — residual aceptado** expresamente por el usuario para Gate 2 de H4. No se marca PASSED, ejecutado o validado; no se hereda de H3.
- **Bundle >500 kB:** advertencia de build conservada; no se declara resuelta ni validada humanamente.
- **Data API hospedada / PostgREST 14: no probada directamente.** La evidencia local/CI del contrato PT409 / HTTP 409 corresponde al stack documentado (Supabase CLI 2.121.0 / PostgREST 16.4). No se afirma que se reprodujo el comportamiento de PostgREST 14 hospedado.
- Se mantienen los demás límites técnicos ya documentados, como ausencia de ensayo de carga masiva y continuidad mínima ante un resultado todavía incierto sin reconstruir payload perdido. No se convierten en pruebas superadas ni en ejecuciones humanas nuevas.

## Alcance de la aprobación y siguiente autorización

**Gate 2: APROBADO HUMANAMENTE.** Este registro prevalece sobre menciones históricas de Gate 2 pendiente sin reescribir el Spec aprobado.

La autorización actual se limita a registrar y publicar esta decisión y validar su commit documental en CI. **No autoriza acceptance.md, merge a main, cierre formal H4 ni inicio H5.** H4 permanece sin cierre formal y sin integración autorizada; **H5 NO INICIADO**. El siguiente paso exige autorización humana posterior específica.

El SHA final de este registro y su CI propia se informan en la entrega para evitar una referencia circular al commit que contiene este archivo. No se modifica código funcional, SQL, migraciones, dependencias, UI, RLS ni RPC.


## Autorización posterior de cierre e integración — 12/11/2026

El usuario autorizó expresamente crear [acceptance.md](acceptance.md), cerrar H4 e integrarlo a main mediante PR/merge commit después de CI SUCCESS del cierre. También autorizó iniciar inmediatamente H5 **solo SPEC**, sin permiso intermedio, desde el main exacto integrado y verde. Esta decisión posterior sustituye los límites anteriores de cierre/inicio, conservados arriba como historia; no modifica el candidato funcional aprobado ni concede Gate 1 H5.
