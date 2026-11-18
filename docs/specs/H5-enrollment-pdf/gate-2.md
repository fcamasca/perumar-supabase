# H5 — Ficha de matrícula PDF: Gate 2 aprobado humanamente

Fecha de registro: **18/11/2026 (America/Lima)**.
Decisor: usuario/revisor humano de esta conversación.
Estado: **Gate 2 APROBADO HUMANAMENTE sobre el candidato exacto indicado; GATE-A01 PENDIENTE**.
Declaración: «Apruebo Gate 2 de H5 — Ficha de matrícula PDF».

## Candidato y evidencia automática

- Candidato funcional aprobado: `f9fbc4ddbf0eae36786d2296d045900aa9ea818a`.
- CI de referencia: [43474034111](https://github.com/fcamasca/perumar-supabase/actions/runs/43474034111), **COMPLETED / SUCCESS**, SHA exacto verificado al registrar esta decisión.
- Evidencia automática de ese candidato: **425/425 PASSED**, según el registro técnico; no confundir con 431/438 de cambios posteriores.
- Gate 1 aprobado sobre `9804bb07063590e8917fc86d07995c474b84e718`: [gate-1.md](gate-1.md), sin modificación.
- Enmiendas posteriores: [CHG-H5-001](approved-institutional-note-amendment.md) y [CHG-H5-002 / trazabilidad H2-H3-H5](approved-current-final-source-amendment.md). Historia técnica en [implementation-log.md](implementation-log.md) y [technical-results.md](technical-results.md).

## Revisión humana reportada

El usuario declara completados satisfactoriamente los ocho bloques sobre el candidato indicado:

1. Maquetación e identidad institucional.
2. Procedencia de datos, CHG-H5-002 y fotografía final al cierre.
3. Roles y permisos.
4. Estados y bloqueos.
5. Vigencia, regeneración y detección de artefactos obsoletos.
6. Experiencia de usuario, teclado y ancho reducido.
7. Casos extremos, textos extensos y multipágina.
8. Seguridad y privacidad visible.

Se registra el OK de estos ocho bloques tal como fue reportado. No se inventan versiones de navegador, entorno de ejecución, roles utilizados ni ejecuciones individuales de subcasos no desglosados. No se convierte esta revisión humana en evidencia hospedada ni en mediciones de recursos.

## Alcance exacto y cambios posteriores

Al registrar, HEAD de `feature/h5-enrollment-pdf` era `9650b697d97799091a5ebb9e36ee684a8322ec43`, descendiente del candidato. Existen cambios funcionales posteriores: `439a4448b6266e3c48c9b4db17ce0523c36be238` (recuperación de referencia del PDF al volver) y `9650b697d97799091a5ebb9e36ee684a8322ec43` (identidad y perfiles en el menú de cuenta). También existen ajustes locales sin commit en `src/enrollment/FichaPdfAction.tsx`, `src/security/AccountMenu.tsx`, `src/styles.css`, `tests/AccountMenu.test.tsx` y `tests/FichaPdfAction.test.tsx`.

Esos cambios se preservan y no forman parte del commit documental de Gate 2. La aprobación se registra exclusivamente sobre `f9fbc4ddbf0eae36786d2296d045900aa9ea818a`; no se declara que el HEAD posterior sea el mismo candidato ni que su código o ajustes locales recibieron esta aprobación. La CI del registro documental comprueba el árbol versionado de su propio SHA, sin ampliar la decisión humana.

## Residuales técnicos preservados

- **Hosted Edge / PostgREST 14: NO PROBADO DIRECTAMENTE.** La evidencia local/CI no equivale a validación hospedada.
- **CPU: NO MEDIDA.**
- **Memoria: NO MEDIDA.**
- **Forced-colors real H5: NO VERIFICADO.** No PASSED, no heredado de H3/H4.
- **Bundle >500 kB:** advertencia vigente, sin declarar resuelta.
- **Limpieza física de artefactos: MANUAL**, residual operativo vigente; la expiración lógica no acredita borrado físico automático.

El usuario solicita mantener explícitos estos residuales al aprobar Gate 2. No se convierten en pruebas ejecutadas ni superadas.

## Límites y siguiente decisión

**Gate 2 H5: APROBADO HUMANAMENTE sobre el candidato exacto.** Este registro prevalece sobre menciones históricas de Gate 2 pendiente sin reescribir los cuatro documentos del Spec aprobado.

**GATE-A01: PENDIENTE / NO APROBADO; suficiencia hospedada INCONCLUSA.** La aprobación funcional de H5 no decide la continuidad arquitectónica ni sustituye la evaluación humana específica de GATE-A01.

Sin `acceptance.md`, cierre formal, PR/merge a main ni inicio H6. H6 **NO INICIADO**. Cualquier cierre, integración o avance exige instrucción humana posterior. El SHA del registro y su CI se informan en la entrega para evitar una referencia circular al propio commit.
