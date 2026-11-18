# H5 — Ficha de matrícula PDF: aceptación y cierre

Fecha: **18/11/2026 (America/Lima)**. Decisor: usuario/revisor humano de esta conversación.
Estado: **H5 CLOSED / ACEPTADO; Gate 2 APROBADO HUMANAMENTE**.

La instrucción humana «Cerremos H5 y preparemos H6 sin más ciclos documentales innecesarios» autoriza expresamente el cierre final sobre `a19520a1733dca53b38bfe1463d0473304c88d86`, incluidos los ajustes posteriores al candidato original de Gate 2, su integración mediante PR/merge commit y la preparación del Spec H6 después de verificar main verde. **No se repiten pruebas humanas H5 ni se inventan ejecuciones adicionales.**

## Gates, base y trazabilidad

- Rama: `feature/h5-enrollment-pdf`; working tree limpio al iniciar el cierre y HEAD exacto `a19520a1733dca53b38bfe1463d0473304c88d86`.
- Main previo: `2789c12ca80f1f5b3e9ee3ef33a6e50ecfea52a1`, integración de H4.
- Gate 1 H5: aprobado sobre `9804bb07063590e8917fc86d07995c474b84e718`; [gate-1.md](gate-1.md).
- Gate 2 original: candidato `f9fbc4ddbf0eae36786d2296d045900aa9ea818a`, CI [43474034111](https://github.com/fcamasca/perumar-supabase/actions/runs/43474034111) SUCCESS, 425/425; [gate-2.md](gate-2.md).
- Registro Gate 2: `09bbd2716d480f93bd81349c9fc17ca92ff531d0`, CI [44334708494](https://github.com/fcamasca/perumar-supabase/actions/runs/44334708494) SUCCESS.
- [GATE-A01](../../architecture/GATE-A01-continuidad-supabase.md): **APROBADO CON AJUSTES**, registro `a1058e3446e63b6d87a060d9097b2f831f15e5b1`, CI [44369637846](https://github.com/fcamasca/perumar-supabase/actions/runs/44369637846) SUCCESS. Continuidad de Supabase con seis residuales explícitos; no suficiencia hospedada sin reservas.
- Candidato final de cierre: **`a19520a1733dca53b38bfe1463d0473304c88d86`**, CI [44375383072](https://github.com/fcamasca/perumar-supabase/actions/runs/44375383072) **COMPLETED / SUCCESS**, **440/440 PASSED**.

Este cierre y la autorización humana posterior incorporan expresamente los cambios siguientes sin fingir que pertenecían al SHA original de Gate 2. Los cuatro documentos del Spec y los registros históricos de gates no se reescriben. [implementation-log.md](implementation-log.md) y [technical-results.md](technical-results.md) conservan la cronología.

## Enmiendas y ajustes aceptados

| Cambio | Evidencia / resultado aceptado |
| --- | --- |
| CHG-H5-001 | [Corrección institucional](approved-institutional-note-amendment.md): sin FOTO, Nota literal, Libro/Folio/Registro vacíos, dos índices y firma; ajustes posteriores de cabecera y distrito/fecha de matrícula |
| CHG-H5-002, trazabilidad H2–H3–H5 | [Fuente vigente y cierre final](approved-current-final-source-amendment.md): snapshot inicial intacto; fuente actual en PROGRAMADO/EN_CURSO, captura final transaccional y exclusiva en CERRADO, fingerprint servidor y sin fallback |
| Recuperación del PDF al volver a Matrícula | `439a4448b6266e3c48c9b4db17ce0523c36be238`: referencia recuperada desde metadatos bajo JWT/RLS, sin persistir PII/URLs en navegador ni descargar/generar automáticamente |
| Menú de cuenta con identidad y roles | `9650b697d97799091a5ebb9e36ee684a8322ec43`: panel no modal sin navegación ni pérdida de borrador, identidad Auth confirmada; roles siguen siendo autoridad DB |
| Avatar con tooltip y mensajes PDF diferenciados | `a19520a1733dca53b38bfe1463d0473304c88d86`: solo círculo, datos en tooltip/panel; distinguir vencimiento, cambio de fuente y consulta no verificable; pruebas y mock corregidos sin debilitar conflictos |

## Evidencia técnica vigente

| Comprobación | Resultado / alcance |
| --- | --- |
| Suite final | **440/440 PASSED**, 26 archivos, CI exacta del candidato final SUCCESS |
| Calidad y build | Lint, typecheck, Deno check, build, build-safety y diff-check PASSED; bundle JS 682,53 kB, advertencia conservada |
| Seguridad | JWT/RLS, roles, IDOR, denegación de Storage cliente, privilegio acotado de service_role y auditoría mínima sin PII; regresión H1–H4 |
| PDF real | Edge Runtime local/CI, Storage privado, generación/descarga, render y parseo sintético mínimo/extenso; no equivalente a ensayo hospedado |
| Fuente y cierre | Locks Ciclo → Alumnos UUID → Matrículas UUID; captura coherente atómica, rollback completo, snapshot final inmutable y exclusión de ambos snapshots de auditoría; etiquetas inactivas no bloquean cierre |
| Conflictos y artefactos | PT409 explícito, sin retry automático; validación de autorización/fuente/expiración después de esperar locks; descarga obsoleta rechazada y decisión explícita de regeneración |
| Regresión e integración | Matrícula/cargos, pagos, rollback, concurrencia (incluido 70 + 60 sobre saldo 100), expiración y reconstrucción desechable con repetición SUCCESS en CI |
| Inventario final | 24 tablas públicas, 4 vistas, 20 funciones públicas, 19 helpers privados, 27 policies de negocio SELECT, 24 migraciones; un bucket H5 privado, una Edge Function acotada y sin policies Storage para clientes |

La CI propia del cierre se verifica antes del PR/merge. Se verifica además CI SUCCESS del SHA exacto integrado en main antes de crear la rama Spec H6. El SHA del cierre, PR, merge y runs se informan en la entrega para evitar referencias circulares al propio commit. No se resetean datos humanos ni se ejecutan fixtures invasivos locales para cerrar.

## Evidencia humana

El usuario reportó satisfactoriamente los **ocho bloques**: maquetación/identidad institucional; procedencia CHG-H5-002 y cierre final; roles/permisos; estados/bloqueos; vigencia/regeneración/obsolescencia; UX/teclado/ancho reducido; extremos/textos extensos/multipágina; seguridad/privacidad visible. [Gate 2](gate-2.md) conserva el reporte original.

La autorización actual acepta expresamente los cuatro ajustes de UX posteriores para el cierre final, **sin repetir pruebas humanas**. No se inventan navegador/versión/SO, roles utilizados, pruebas específicas no desglosadas ni un PASSED de contraste alto real.

## Seis residuales preservados y aceptados

1. **Hosted Edge / PostgREST 14: NO PROBADO DIRECTAMENTE.** Suficiencia técnica hospedada inconclusa.
2. **CPU de Edge: NO MEDIDA.** Tiempo wall-clock no equivale a CPU.
3. **Memoria de Edge: NO MEDIDA.**
4. **Forced-colors real H5: NO VERIFICADO.** No PASSED ni heredado de otro hito.
5. **Bundle >500 kB:** advertencia vigente (682,53 kB en candidato final).
6. **Limpieza física H5: MANUAL.** Expiración lógica de 24 horas no acredita borrado físico automático.

Se mantienen como conocidos/aceptados para continuar el MVP, sin declararlos resueltos. Los relevantes para producción deberán resolverse o aceptarse explícitamente antes de H9/release, conforme a GATE-A01.

## Cierre e integración

**H5 CLOSED / ACEPTADO / listo para integración.** Este commit contiene solo acceptance y planificación. No cambia código, migraciones, dependencias, tests, Edge, UI, RLS/RPC ni Spec aprobado. `git diff --check` y revisión del alcance documental antes de publicar.

Integración autorizada por PR y **merge commit**, sin squash/rebase que pierda candidato/enmiendas/gates. **INTEGRADO** se hace efectivo al incorporar el cierre a main y verificarlo. No se crea una nueva aprobación humana automática.

## Continuación H6 autorizada solo Spec

Después de main integrado y verde, crear `feature/h6-expediente-spec` desde ese main exacto y preparar exclusivamente requirements.md, design.md, tasks.md y test-plan.md de **H6 — Expediente y documentos institucionales**, con referencia funcional local `Expediente Perú Mar Nuevos.docx`. No versionar archivos del usuario ni outputs.

Modelo conceptual autorizado: tipo_documento → ciclo_documento → matricula_documento, sin catalogo_valor documental; todos los activos del Ciclo nacen aplicados, obligatorios no retirables y opcionales retirables por Director/Coordinador con historia. Storage privado persistente como opción inicial, sin S3 ni motor genérico editable. Las decisiones abiertas se elevan a revisión en el Spec, sin Gate 1 automático ni implementación, tablas, migraciones, buckets o Edge H6.
