# H3 — Alumno y Matrícula: aceptación y cierre

Fecha de registro: **09/11/2026 (America/Lima)**.
Decisor: usuario/revisor humano de esta conversación.
Estado: **CLOSED / ACEPTADO; Gate 2 APROBADO HUMANAMENTE**.
Decisión humana explícita: **«se aprueba cerremos esto»**, confirmada en la instrucción de cierre formal sobre el candidato exacto siguiente.

## Candidato, Gate 1 y trazabilidad

- Rama: `feature/h3-enrollment`.
- Candidato aceptado exacto: `42dcd1507a28121e9d8d588c2dff22cb263cd19d`.
- Gate 1: `551cd00ed2957178400dca8fe9d945cf3f9e8d20`; [registro](gate-1.md).
- Último commit con código: `6f6ab0d6cf8dc9fce4a5f84356a9acc96d9afcb1`, con CI SUCCESS confirmada por el usuario. Los cambios entre ese commit y el candidato son exclusivamente documentales.
- Main previo: `bcbff1438d572de959535a7ffccab435ffc8e47e`.
- Al comenzar este cierre, HEAD local/remoto coincide exactamente con el candidato; no apareció código nuevo. Gate 1 es ancestro del candidato. Los cuatro documentos aprobados (`requirements.md`, `design.md`, `tasks.md`, `test-plan.md`) permanecen intactos, incluidos sus estados históricos.

Enmiendas autorizadas posteriores a Gate 1, aceptadas como parte del paquete de H3:

| Enmienda | Trazabilidad |
| --- | --- |
| CHG-H3-001 | [Ocupación mediante catálogo y OTROS](approved-occupation-amendment.md); la precisión posterior mantiene combo nativo |
| CHG-H3-002 | [Modalidad de Carrera opcional](approved-career-modality-amendment.md) |
| CHG-H3-003 | [Modalidad/experiencia, códigos técnicos legados y código automático de Alumno](approved-career-student-code-amendment.md) |
| CHG-H3-004 | [Pestañas y búsqueda de Alumno en Matrícula](approved-enrollment-tabs-amendment.md), con evolución posterior |
| CHG-H3-005 | [Matrícula dentro de Ciclo](approved-cycle-enrollment-amendment.md), con evolución posterior |
| CHG-H3-006 | [Buscar/Agregar y edición individual de matrícula](approved-quick-add-amendment.md), cargos/descuento/traslado según precisiones registradas |
| CHG-H3-007 | [Tarifas dentro de Ciclo](approved-cycle-tariffs-amendment.md) |
| CHG-H3-008 | [Metadata DICAPI, URL de malla y carga inicial de pesca](approved-career-dicapi-amendment.md) |
| CHG-H3-009 | [Terminología visible Cursos/Asignaturas](approved-ui-terminology-amendment.md) |
| CHG-H3-010 | [Seis cursos autorizados y sus asignaturas](approved-authorized-courses-initial-load.md) |
| CHG-H3-011 | [Confirmación exclusiva del Director para asignaturas con matrículas activas](approved-director-cycle-subjects-amendment.md) |

Las precisiones UX, correcciones y validaciones se conservan en [implementation-log.md](implementation-log.md) y [technical-results.md](technical-results.md). Este registro posterior de aceptación prevalece sobre menciones anteriores de Gate 2 pendiente, sin reescribir evidencia histórica.

## CI exacta del candidato: condición previa verificada

[GitHub Actions run 42682734012](https://github.com/fcamasca/perumar-supabase/actions/runs/42682734012): SHA `42dcd1507a28121e9d8d588c2dff22cb263cd19d`, rama `feature/h3-enrollment`, **COMPLETED / SUCCESS**. Verificado mediante metadatos del run y job `verify`: todos sus pasos COMPLETED / SUCCESS.

Incluye instalación limpia, lint/types/unit, plataforma aislada, integración local, matriz Auth/RLS, invariantes académicas/rollback, matrícula/cargos/concurrencia, build, rechazo de configuración privilegiada, expiración/restauración de sesión y reconstrucción/repetición. No se ejecuta reset ni se repiten suites con fixtures sobre la base de pruebas humanas para este cierre. CI no concede Gate 2: la decisión es humana e independiente.

## Evidencia técnica vigente aceptada

| Comprobación | Resultado registrado |
| --- | --- |
| Unitarias/UI | **283/283**, 17 archivos |
| Lint / typecheck / build / diff-check | PASSED |
| Invariantes DB y autorización | PASSED: reglas académicas y H3, RLS/grants/roles, catálogos activos/correctos, validación server-side |
| Matrícula y cargos | Transacción DB, importes/descuentos, historia/snapshot inmutable, duplicados y estados validados |
| Rollback | PASSED: operaciones fallidas y pruebas transaccionales sin residuos; preservación de datos e historia |
| Concurrencia | Conflictos explícitos y SERIALIZABLE sin retries silenciosos; ocho transacciones independientes de código Alumno con códigos únicos y rollback |
| Inventario | 22 tablas públicas, 17 RPC públicas, 16 helpers privados, 25 policies SELECT; 15 migraciones |
| Carga inicial | Seis Cursos, 31 Asignaturas distintas y 44 asociaciones; repetición/preservación verificadas |
| Regresión y bootstrap aislados | SUCCESS en la CI exacta del candidato, incluidos H1/H2/H3 y reconstrucción/repetición |

Se conserva la advertencia conocida de bundle mayor a 500 kB. No se agregan capas, backend, helpers/policies innecesarios ni funcionalidades H4+. Los detalles, permisos y pruebas están en los registros enlazados; este cierre no altera el inventario.

## Revisión humana y decisión Gate 2

[Resultados humanos](human-test-results.md): nueve bloques reportados **OK por el usuario**: Cursos/Asignaturas, Alumno/contactos, Empresas, Ciclos/tarifas, Matrícula, descuentos, traslado/anulación, dos sesiones e interfaz/accesibilidad. Entorno declarado: **Chrome / Windows 11 Pro**; versión exacta de Chrome y compilación de Windows no informadas.

**forced-colors / contraste alto real de Windows: NO VERIFICADO. Riesgo residual aceptado explícitamente por el usuario**, inicialmente «no, pero lo apruebo» y reconfirmado en el cierre de Gate 2. No se marca PASSED ese subcaso ni se afirma ejecución manual o emulada.

Los subcasos humanos específicos de CHG-H3-011 (Director confirma/cancela y Coordinador bloqueado con matrículas activas) no quedaron desglosados individualmente. Existe cobertura técnica documentada; Gate 2 acepta el paquete de evidencia con esta limitación. No se inventan ejecuciones humanas separadas.

**TEST-H3-044** no se registra como ejecución humana separada: no existe evidencia explícita de tal recorrido individual. En su decisión Gate 2, el usuario acepta la arquitectura/mantenibilidad documentada como suficiente para el cierre: React + Supabase/PostgreSQL + RLS + constraints + RPC concretas, inventario acotado, autoridad DB y trazabilidad existentes.

**TEST-H3-045: Gate 2 APROBADO HUMANAMENTE** sobre el candidato exacto indicado. La instrucción actual confirma expresamente ese SHA y acepta las nueve declaraciones humanas y los límites de evidencia anteriores. Codex registra esa decisión; no se atribuye pruebas ni aprobación humana.

## Residuales y límites

Además de forced-colors real NO VERIFICADO y la granularidad de evidencia humana señalada, se conservan los límites históricos documentados H0/H1/H2 y la advertencia del bundle. No se amplía alcance para resolverlos durante el cierre. EVOL-001 y EVOL-002 siguen fuera de alcance.

La limpieza autorizada de residuos sintéticos quedó registrada en el log; `test:academic` permanece reservado a GitHub Actions con base desechable. No se realiza nueva limpieza, reset ni operación sobre datos para este cierre.

## Cierre e integración autorizados

El commit de cierre modifica únicamente este acceptance y `docs/PLAN_MVP.md`. No modifica código, migraciones, dependencias, UI, RLS, RPC ni los cuatro documentos aprobados. Se ejecuta `git diff --check` y se comprueba el inventario de archivos del commit.

La integración está autorizada por el usuario, pero solo se ejecutará después de que la CI del commit documental termine SUCCESS. Se usa PR y merge commit trazable, sin squash ni rebase que pierda candidato/enmiendas. En la rama de cierre, integración es una acción autorizada pendiente; **INTEGRADO** en el PLAN se hace efectivo al incorporar este registro a `main`. Los SHA del commit documental y del merge se entregan al finalizar para evitar referencias circulares en este archivo.

**H3: CLOSED / ACEPTADO. H4: NO INICIADO.** H4 requiere una instrucción humana posterior; este cierre no autoriza preparar su Spec ni construirlo automáticamente.
