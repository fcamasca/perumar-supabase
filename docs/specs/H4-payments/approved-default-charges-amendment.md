# CHG-H4-002 — Todas las tarifas activas incluidas al matricular

10/11/2026, America/Lima. Enmienda funcional posterior a Gate 1 autorizada expresamente por el usuario sobre `62371055bc677450b23ecd85e683c4ac0af8c0df`, en `feature/h4-payments`.

Solicitud: «es opcional pero se incluye a los cargos, el obligatorio quiere decir que no se puede retirar, las opcionales las puede retirar por alumno».

## Regla vigente

- Al crear una matrícula se generan DB-side todos los cargos de las tarifas activas del Ciclo cuyo catálogo Tarifa esté activo, tanto obligatorias como opcionales. Una selección opcional vacía no los excluye en el alta.
- Obligatoria significa que el cargo no se puede retirar individualmente. Opcional significa que puede retirarse para esa matrícula desde Editar matrícula → Cargos; el retiro conserva historia y no modifica las tarifas del Ciclo ni otros alumnos.
- En edición del mismo Ciclo, `opcionales` sigue siendo la selección explícita de cargos opcionales que se conservan/incluyen; `[]` los retira y omitir el argumento conserva los cargos. Se mantienen validación de pertenencia/vigencia, versión y permisos existentes.
- Cambiar de Ciclo genera todos los cargos activos del destino, sin trasladar descuento; conserva los cargos anteriores como historia y el código histórico. Después se pueden retirar los opcionales del alumno.
- H4 conserva íntegramente sus protecciones: no retirar cargos con aplicaciones de pago vigentes; tras anularlas se permite conforme a las demás reglas. No se altera saldo derivado, aplicaciones, idempotencia, auditoría, locks ni autorización.
- Pagos cobra cargos vigentes de matrícula, nunca configura tarifas ni incorpora cobros silenciosamente.

## Migración y compatibilidad

`20261110010000_default_all_enrollment_charges.sql` sustituye únicamente `private.apply_enrollment_charges`, sin nuevas tablas/RPC/helpers/policies ni backfill. No modifica datos humanos ni agrega cargos retroactivos a matrículas existentes. Para una matrícula ya registrada, el operador debe incluir el opcional expresamente en Cargos.

La interfaz de alta y de cambio de Ciclo explica la inclusión inicial y el retiro posterior. La edición individual conserva la grilla y sus controles. Se reemplaza la interpretación anterior de «alta solo con obligatorios» documentada en H3 y en CHG-H4-001; los documentos históricos aprobados no se reescriben.

## Trazabilidad y validación

Gate 1 H3: `551cd00ed2957178400dca8fe9d945cf3f9e8d20`. Gate 1 H4: `15f5e80492c4ba95a70f9fe56e068f7ba946510d`. Esta enmienda registra la nueva decisión humana sin reabrir ni falsear los estados históricos de esos Spec.

Regresión: alta por RPC con selección vacía incluye obligatorio/opcional; ambos aparecen en saldo/cargos de pago; retiro individual conserva obligatorio e historia; cambio de Ciclo con selección vacía incluye todos los del destino; configuración posterior no modifica cargos existentes; se mantienen los ensayos H4 de retiro con pago vigente, rollback y concurrencia. Resultados exactos en technical-results.md y entrega del candidato.

Gate 2 PENDIENTE. No acceptance, merge ni H5.
