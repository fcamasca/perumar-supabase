# H5 — Evidencia técnica de construcción

## CHG-H5-001 — corrección humana aprobada posterior a Gate 1

Base `a303b679877aa4a9bcebcfb0c3564382edddeb15` (CI `43337996757` SUCCESS). [Enmienda aprobada](approved-institutional-note-amendment.md): FOTO eliminada, Nota literal incorporada, Libro/Folio/Registro vacíos, dos índices y Firma; normal 1 página A4 a 9 pt mínimo, extenso 5 páginas/100 contactos. Solo renderer, tests afectados y evidencia documental. **415/415 pruebas locales PASSED**, lint/typecheck/Deno check/build/build-safety PASSED; Candidato técnico posterior exacto **`2196348fec188880c8853d1cb80fac3b229eeea4`**; CI [43346943904](https://github.com/fcamasca/perumar-supabase/actions/runs/43346943904) **COMPLETED / SUCCESS**, **415/415 PASSED**. Lint/typecheck/Deno check/build/build-safety, H1–H4, rollback/concurrencia (70 + 60 sobre saldo 100, sin retry), Edge/Storage reales, expiración y reconstrucción con repetición de suites PASSED. `git diff --check` PASSED. No cambió el inventario ni hubo migraciones/datos humanos modificados. Esta consolidación solo modifica documentación; el candidato técnico permanece intacto.

Artefacto sintético de esta corrección: `14002660879`, ZIP SHA-256 `ca14ca656145ac1fbe27310903b5e959dcb6f86c8d412111060a3f6c8518d5b2`, retención tres días. Descargado y verificado: normal **1 página / 231.536 bytes**, extenso **5 páginas / 245.558 bytes**, comparación visual técnica y extracción independiente; aceptación humana pendiente. Primera pasada del escenario real Edge: PDF 244.214 bytes, primera invocación 254,63 ms, primera muestra caliente 139,19 ms, 20 muestras p95 368,24 ms / máximo 581,72 ms. Son tiempos observados del runtime local de CI, no CPU ni rendimiento hospedado. CPU: NOT MEASURED; Memory: NOT MEASURED; Hosted: NOT EXECUTED.

También se ejecutaron localmente `test:pdf:rollback`, `test:payments:rollback` y `test:payments:isolated`: PASSED, incluyendo conflictos PT409 y errores nativos 40001/40P01, sin retries ni reset/escrituras persistentes en datos humanos. Se recargó únicamente Edge Runtime; prueba anónima real HTTP 401/SESSION, sin lecturas de negocio, PDF ni auditoría. No se generó una ficha humana automáticamente.

Bloque 1 humano continúa NO OK / pendiente de nueva revisión; no se declara aceptación visual. Gate 1 y los cuatro documentos aprobados no cambian. Los apartados siguientes conservan historia anterior (incluidas referencias entonces válidas a FOTO/ausencia de Nota), sustituida únicamente en presentación por CHG-H5-001. Gate 2/GATE-A01 pendientes, hosted inconcluso; sin acceptance/PR/merge/H6. Residuales preservados en la enmienda.

## Corrección de maquetación en revisión humana

**Bloque 1 H5 inicialmente NO OK** sobre `8c0bfb355c9162aebcee3fab2d368a40aaf5cc0f` (CI `43327651731` SUCCESS). Se corrige exclusivamente la presentación institucional; [registro de corrección visual](human-review-layout.md). Código/pruebas: `ded34ebafb1d77933f467147aeda8ee06f06a964`, CI [43336489960](https://github.com/fcamasca/perumar-supabase/actions/runs/43336489960) **COMPLETED / SUCCESS**, **413/413 PASSED** (406 previas + 7 nuevas). Lint/tsc/Deno check/build/build-safety, integración real Edge/Storage, H1–H4, rollback/concurrencia, expiración y reconstrucción PASSED. Caso normal de un contacto sin patrocinador en **1 página A4**; caso ampliado de **100 contactos, textos largos y patrocinador en 5**. Extracción independiente y render de CI confirmados en ambas pasadas. La aceptación visual sigue siendo humana y está pendiente.

Las cifras de tamaño/rendimiento y CI que siguen describen el candidato anterior y se conservan como historia técnica; no prueban aceptación visual del nuevo layout. El nuevo logo embebido aumenta el tamaño del PDF. Gate 1/Spec/OQ, límites, contratos y controles de seguridad intactos. Gate 2 y GATE-A01 PENDIENTES; hosted inconcluso, sin aceptación/cierre/PR/merge/H6.

Baseline anterior: código/pruebas/lock `35d4b17a9fa63c011c5de9d44a72a78215b60980`, CI `43304950382` **COMPLETED / SUCCESS**. Estado actual: **CANDIDATO TÉCNICO CORREGIDO / Gate 2 PENDIENTE / GATE-A01 PENDIENTE**. Gate 1: `9804bb07063590e8917fc86d07995c474b84e718`. Los estados históricos del Spec aprobado no se reescriben. No acceptance, cierre, PR, merge ni H6.

## Evidencia local inicial (12/11/2026)

- Lint y typecheck: PASSED tras el primer bloque.
- Unit/component: **406/406 PASSED**, incluye 34 nuevas pruebas H5 de procedencia, estados, versión, render, fallos/compensación, límites, contenido adversarial y UX.
- Spike real Edge: HTTP 200, PDF español de 5.060 bytes, dos páginas, render 149,15 ms; parseo pypdf y render Poppler. No dato CPU ni resultado hosted.
- `test:pdf:rollback`: PASSED; actor, whitelist de eventos, versión, duplicado, expiración, anulación y denegaciones sin auditoría de éxito. Fingerprint de filas de negocio/auditoría idéntico antes/después.
- Regresión `test:payments:rollback`: PASSED; sin fixtures persistidos.
- Regresión `test:payments:isolated`: PASSED; base desechable, nunca reset humano. Incluye 70 + 60 sobre saldo 100, una confirmación sin sobrepago/retry, idempotencia, anulación, cruces con edición/descuento/cargos/Ciclo y conflictos nativos 40001/40P01 conservados.
- Build y build-safety: PASSED; bundle 678,31 kB, advertencia >500 kB conservada. Renderer solo Edge; pdf-lib no se importa en React.
- Inventario efectivo local: 24 tablas, 3 vistas, 20 funciones públicas (19 previas + auditoría H5), 18 helpers privados, 27 policies de negocio, un bucket privado y cero policies Storage para clientes. Comprobación exacta PASSED.
- Deno 2.1.4 / TypeScript 5.6.2 `check`: PASSED; lockfile v4 y comprobación congelada. Esto complementa tsc frontend, no sustituye la prueba real Edge.

## CI y artefactos

CI [43303520498](https://github.com/fcamasca/perumar-supabase/actions/runs/43303520498), SHA `62d399980e8062b3d5ab05a89c151a532669521a`: **COMPLETED / SUCCESS**. Incluye 406 pruebas, lint/types, seguridad Auth/RLS, invariantes H2/H3/H4, pagos/rollback/concurrencia, Edge/Storage reales, expiración JWT real con rechazo H5 y reconstrucción desde cero con repetición de suites. La reconstrucción ocurrió exclusivamente en CI desechable.

El ensayo inicial [43302006199](https://github.com/fcamasca/perumar-supabase/actions/runs/43302006199) falló en el fixture de expiración: service_role no tiene UPDATE/SELECT general de auditoría. No se ampliaron esos grants; se corrigió la inyección con SQL estático restringido a un UUID sintético en CI. El endpoint utiliza únicamente la RPC cerrada para escribir eventos. El ensayo posterior `43303081029` también terminó SUCCESS.

Artefacto sintético del run `43303520498`: `13983895240`, ZIP SHA-256 `8f489cc6e1f31a5e43bdde7a899abe64a583d7bc1c61a99602521c626611dde2`, retención CI tres días. PDF real Edge de **20.621 bytes / seis páginas / 100 contactos**, extraído por Poppler y pypdf; los 100 presentes. Conserva ÁNGELA después de cambiar el alumno vigente a otro nombre; sin fallback de PII actual. Revisión visual técnica de primera, intermedia y última página, cabeceras/pies y espacios vacíos. No equivale a aceptación humana de la plantilla.

Medición real de ese runner local: primera invocación observada 253,07 ms; 20 muestras posteriores, p95 115,57 ms, máximo 491,35 ms. Son tiempos completos observados de generación a través de gateway/DB/Storage/auditoría. No se ha aislado un cold-start hospedado ni CPU/peak memory. PDF mínimo del spike y casos máximos locales (nombres 150, domicilio/señas/dirección 500, tokens continuos y saltos) también renderizados. Documento de campos máximos: cuatro páginas; 100 contactos del fixture unitario: siete páginas; exceso de presupuesto rechazado sin truncar.

Candidato consolidado `35d4b17a9fa63c011c5de9d44a72a78215b60980`: lock Deno congelado, tipos Edge en CI, cruce de artefacto entre dos matrículas reales, rechazo real de MIME en Storage, fallo DB posterior al upload y compensación, dependencia Storage pausada para timeout real. CI [43304950382](https://github.com/fcamasca/perumar-supabase/actions/runs/43304950382): **COMPLETED / SUCCESS**. Los ensayos nuevos PASSED antes y después de reconstruir. Logs verifican 406/406, JWT real H5 expirado, fallos reales de frontera, concurrencia H4 nativa y cierre protegido del stack.

Artefacto de ese candidato: `13982544543`, ZIP SHA-256 `006d0123a2ec5ded70f0777ede29cfe14dff0f3b5cf149abb11fde777fbbea2f`, retención CI tres días. Primera pasada: PDF 20.616 bytes, primera invocación 240,60 ms, primera muestra caliente 113,98 ms, 20 muestras p95 427,37 ms / máximo 456,41 ms. Tras reconstrucción: PDF 20.632 bytes, primera invocación 257,70 ms, 20 muestras p95 119,01 ms / máximo 441,47 ms. Variación del contenido sintético/contexto explica diferencias de bytes; no se infiere costo/CPU hospedados ni cold-start puro. Los 100 contactos y la procedencia histórica se verificaron mediante extracción independiente en ambas pasadas.

Estado de las métricas no demostradas: **CPU: NOT MEASURED**; **Memory: NOT MEASURED**; **Hosted: NOT EXECUTED**. Las 20 muestras anteriores corresponden a Edge Runtime local real en CI, no al servicio hospedado.

## Inventario previsto implementado

| Recurso | Cambio H5 |
| --- | --- |
| Tablas/vistas de negocio | Ninguna nueva: 24 tablas y 3 vistas existentes |
| RPC pública | Una: `registrar_evento_ficha_pdf(uuid,uuid,uuid,text,timestamptz,timestamptz)`, ejecución solo service_role |
| Helpers privados DB | Ninguno nuevo; 18 existentes |
| Policies de negocio | Ninguna nueva; 27 SELECT existentes |
| Policies Storage para clientes | Ninguna; acceso directo denegado |
| Bucket | Uno privado: `fichas-matricula`, application/pdf, límite 2 MiB |
| Edge Functions de producto | Una: `ficha-matricula` |
| Migración | `20261112010000_h5_private_enrollment_pdf.sql` |

Inventario automatizado se amplió con comprobaciones exactas de bucket, ausencia de policies Storage y permisos/configuración del comando de auditoría; no se relajó el inventario financiero.

## Pendientes y límites explícitos

La evidencia técnica inicial no tenía pruebas humanas H5 reportadas. Posteriormente el usuario reportó **Bloque 1 NO OK** por maquetación; la corrección documentada arriba requiere nueva revisión humana. Los demás subcasos no se dan por reportados ni aprobados. Comparación institucional final mínima/extensa, teclado, accesibilidad y dictamen GATE-A01 requieren revisión humana. Forced-colors real H5 **NO VERIFICADO**; no se hereda un PASSED de H3/H4.

No existe entorno hospedado autorizado para este ensayo. Data API hospedada/PostgREST 14 y Edge hospedado **NO PROBADOS DIRECTAMENTE**. CPU/peak memory aisladas sin medición fiable; tiempo wall-clock no las sustituye. No afirmar aptitud hospedada a partir de local. No prueba de kill/504 real de la plataforma hospedada ni observabilidad integral de sus logs. Bundle >500 kB conservado. Sin desviaciones funcionales deliberadas del Spec; los límites de evidencia se declaran, no se convierten en PASSED.

En respuesta desconocida no hay retry automático. Puede quedar un artefacto privado hasta limpieza; si no llegó su UUID al navegador, una nueva generación es una decisión explícita. No se agregó un índice/listado documental ni idempotencia financiera para recuperar ese resultado. Los diez avisos npm moderados observados pertenecen a ESLint/minimatch preexistentes; no se amplió su alcance mediante actualizaciones ajenas a H5.

## Costos y mantenimiento (estimación, no factura)

Supuesto: 10.000 fichas/mes, una generación + una descarga cada una, flujo uniforme y limpieza diaria. Aproximadamente 20.000 invocaciones, 0,206 GB/mes por copia entregada con el PDF medido de 20.621 bytes y unos 6,9 MB de artefactos vivos al día. El máximo de 2 MiB por PDF elevaría una copia a unos 20,97 GB/mes y el almacenamiento vivo a 0,70 GB. Regeneraciones, errores, múltiples descargas y retrasos de limpieza aumentan uso; no se certifica facturación de los trayectos internos Storage/Edge ni disponibilidad de las cuotas compartidas.

Fuentes oficiales consultadas el 12/11/2026: [invocaciones Edge](https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations), 500.000 Free / 2 millones Pro incluidos y USD 2 por paquete adicional de un millón; [precios](https://supabase.com/pricing), Pro desde USD 25/mes, Storage Pro adicional USD 0,0213/GB y egress adicional USD 0,09/GB. Bajo el supuesto de cuotas disponibles, este volumen medido no añade overage; no representa el costo total del sistema ni una cotización. Costos DB de auditoría e índices y tráfico interno requieren observar el proyecto real.

[Límites Edge hospedados](https://supabase.com/docs/guides/functions/limits): 256 MB y 2 s CPU por petición; no se deduce cumplimiento de las mediciones locales. Objetivos del Spec CPU 1,5 s / memoria 128 MiB permanecen sin evidencia suficiente.

Mantenimiento: una función, una RPC cerrada, un bucket, sin servicio adicional. Limpieza manual local acotada a 20 carpetas × 100 objetos por comando; puede exigir decenas de comandos/día con el volumen supuesto. La descarga expira independientemente. Operabilidad manual diaria y costo de atención **no medidos**; requieren decisión humana antes de introducir scheduler/infraestructura o declarar operación hospedada suficiente. No se añadieron cron, colas, AWS ni motor documental.

## Dictamen para revisión

**Viabilidad técnica local demostrada; suficiencia hospedada INCONCLUSA. GATE-A01 PENDIENTE DE DECISIÓN HUMANA.** Se entrega evidencia para revisión, sin convertir el resultado local en continuidad de arquitectura aprobada ni iniciar H6.

## Trazabilidad de evidencia y revisión humana pendiente

| TEST planificados | Evidencia técnica / límite |
| --- | --- |
| 001–002 | Gate 1 exacto, árbol/base/CI verificados; regresión H1–H4 |
| 003–004, 017–018 | Espacios institucionales en blanco, adaptación sintética, parseo y render visual técnico; aprobación visual humana pendiente |
| 005–008 | Snapshot/contexto, edad/fecha Lima, RLS, IDs y conflicto de microsegundos; sin fallback actual ni auditoría de éxito al denegar |
| 009–012 | Español real Edge y extracción independiente, glifo no representable rechazado, campos máximos y tokens continuos |
| 013–016 | 100 contactos del snapshot presentes; tablas multipágina, cabeceras/pies y numeración; límites sin truncamiento |
| 019–020 | Componentes busy/foco/error, contexto preservado, estados controlados servidor; anulación posterior bloquea artefacto existente. Recorrido humano y estados EN_CURSO/CERRADO en UX pendientes |
| 021–024 | Matriz JWT/roles/Storage e IDOR real; ensayos de frontera y compensación, cruce de dos matrículas en último fortalecimiento |
| 025–028 | JWT auténtico expirado rechazado; URL firmada de fixture realmente expirada; duplicados explícitos, TTL matemático de 24 h e inyección controlada de manifest vencido (no se esperaron 24 h reales) |
| 029–034 | PDF parseable, presupuestos, fallos y deadline, auditoría mínima/actor/permisos, HTML/SSRF literal, paths/campos extra y origen hostil rechazados; logs hospedados no observados |
| 035–038 | Runtime real, tiempos medidos, dos generaciones concurrentes, regresión/reconstrucción/rollback. Hosted, CPU/memoria y kill/504 de plataforma no demostrados |
| 039–040 | Estimaciones y mantenibilidad documentadas; evaluación humana Gate 2/GATE-A01 pendiente, no PASSED automático |

No es una declaración de que cada subcaso de los 40 TEST fue ejecutado humanamente. Estado humano actual: **Bloque 1 inicialmente NO OK; corrección pendiente de revisión; restantes subcasos NO REPORTADOS**. Antes de Gate 2 revisar ficha mínima/extensa contra referencia adaptada, campos vacíos, trazabilidad histórica/contexto vigente/edad, generación/descarga sin perder contexto, teclado/foco, roles y estados, vencimiento/regeneración y bloqueo tras anulación. Registrar navegador/versión/SO reales, sin completar datos ausentes por inferencia. Forced-colors H5 NO VERIFICADO y aún sin aceptación humana de residual.

## Preparación local para revisión (sin reset)

Usar Node 24.19.0 / npm 10.9.0 del proyecto. `npm ci`, `npm run supabase:start`, `npm run supabase:env`, `npm run dev`. La migración H5 ya se aplicó aditivamente en este checkout; en otra copia con datos usar `node node_modules/supabase/dist/supabase.js migration up --local`, nunca reset para actualizar. Si el stack ya estaba arrancado sin Edge, un stop/start protegido conserva datos y toma la configuración nueva; también puede servirse la función con `node node_modules/supabase/dist/supabase.js functions serve --network-id perumar-h0-local` en otra terminal. Mantener verificación JWT activa.

`npm run fixtures:human` crea solo identidades de ensayo con contraseña introducida por la persona y las retira al terminar. Para pruebas seguras locales: `npm run typecheck:edge`, `npm run test:pdf:rollback`, `npm run test:payments:rollback` y `npm run test:payments:isolated`. `test:pdf` y los ensayos de fallo persistidos están restringidos a CI desechable. No resetear la base humana ni ejecutar allí esas inyecciones.
