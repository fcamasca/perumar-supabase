# CHG-H3-001 — Enmienda autorizada de Ocupación posterior a Gate 1

Fecha de solicitud e implementación: 28/10/2026 (America/Lima). Formalización documental: 28/10/2026. Decisor: usuario/revisor humano de esta conversación.

**CHG-H3-001: CAMBIO AUTORIZADO POR SOLICITUD HUMANA, IMPLEMENTADO; PRUEBAS HUMANAS Y GATE 2 PENDIENTES.**

## Base y autoridad

El [registro de Gate 1](gate-1.md) aprueba exclusivamente el Spec del SHA `551cd00ed2957178400dca8fe9d945cf3f9e8d20`. Esa base contemplaba ocupación opcional, pero no incluía OCUPACION entre los ocho catálogos acordados ni el selector con OTROS. Por tanto, convertir Ocupación a referencia de catálogo constituye una enmienda funcional posterior; no se atribuye retrospectivamente al Gate 1 original.

Autorización posterior: el usuario pidió usar la tabla de catálogos para «solo el campo ocupación», «sin el codigo cno», que «empiece con OTROS» y permita escribir al seleccionarlo, además de buscar escribiendo en el combo. Proporcionó quince ocupaciones y después solicitó expresamente documentar esta enmienda respecto a Gate 1. La solicitud autoriza este cambio acotado; no constituye aceptación del candidato ni aprobación de Gate 2.

El cambio fue implementado y publicado en `f60936f03386436f1891ffe8de0169e9d1fae3e9` sobre `feature/h3-enrollment` antes de esta formalización. Este registro explicita esa secuencia y su diferencia con la base aprobada.

## Decisión y alcance

- Reutilizar exclusivamente `catalogo/catalogo_valor` para el catálogo OCUPACION, sin tablas ni motor/mantenimiento adicional.
- Valores autorizados, en orden inicial: OTROS, PESCADOR, VENDEDOR, CHOFER, ALBAÑIL, MECÁNICO, COCINERO, MOZO, VIGILANTE, PANADERO, CARPINTERO, AGRICULTOR, TÉCNICO, LIMPIADOR, GASFITERO, ELECTRICISTA. OTROS es la primera opción, sin selección automática: Ocupación sigue siendo opcional.
- Guardar únicamente la ocupación; los códigos CNO y descripciones/perfiles NSE de la tabla humana quedan excluidos. Los códigos internos de `catalogo_valor` son identificadores técnicos del catálogo, no códigos CNO.
- Selector con búsqueda por escritura, insensible a tildes, selección explícita y operación por teclado. Elegir OTROS exige un detalle no vacío, trim y mayúsculas, máximo 150 caracteres. Una ocupación de lista usa el nombre canónico obtenido en DB.
- `alumno.ocupacion_id` es FK UUID opcional a `catalogo_valor`. La columna existente `alumno.ocupacion` conserva el nombre canónico seleccionado o el detalle de OTROS. Servidor valida pertenencia a OCUPACION y vigencia de catálogo y valor; la FK por sí sola no basta.
- Las ocupaciones previas de texto permanecen intactas, con ID nulo, hasta edición explícita. Se permite conservar ese texto legado sin cambios; no introducir o modificar texto libre sin seleccionar catálogo/OTROS.
- La RPC existente `guardar_alumno` mantiene autorización, operación transaccional y control de versión. `private.validate_alumno` aplica las reglas de ocupación. `private.enrollment_snapshot` incorpora ID y etiqueta del catálogo y el detalle de la ficha al momento de matrícula, obtenidos en DB. Los snapshots ya guardados permanecen inmutables y no se rellenan retroactivamente.

Presentación asociada en el mismo cambio: Ocupación antes de Señas particulares; Señas al final, textarea de tres líneas ampliable verticalmente, manteniendo su máximo de 500 caracteres. Esto no altera obligatoriedad ni otras validaciones de la ficha.

## Trazabilidad complementaria

| Referencia histórica | Complemento de esta enmienda |
| --- | --- |
| OQ-H3-001; REQ/DES/TASK-H3-003 | Añade OCUPACION al uso del catálogo genérico para Alumno y concreta selección/OTROS/legado. No reabre las demás decisiones cerradas. |
| REQ/DES/TASK-H3-006 | Incluye referencia, etiqueta y detalle histórico de ocupación en el snapshot DB-side y su protección PII existente. |
| REQ/DES/TASK-H3-019 | Selector con búsqueda y detalle condicional; distribución y textarea descritos arriba. |
| REQ/DES/TASK-H3-020 | Evidencia técnica y comprobaciones humanas antes de Gate 2. |
| TEST-H3-004/005; TEST-H3-010/011; pruebas humanas UI existentes | Complementar con selección estándar/OTROS, rechazo de UUID incorrecto/inactivo, límites, legado y snapshot histórico. |

Este documento complementa el Spec histórico sin reescribir `requirements.md`, `design.md`, `tasks.md` ni `test-plan.md`. Se mantienen sus 20 REQ / 20 DES / 20 TASK / 45 TEST y sus IDs; los casos adicionales se registran como cobertura complementaria. Para Ocupación rige esta decisión posterior y acotada; el resto continúa bajo la base aprobada.

## Implementación y evidencia

- Migración aditiva: `supabase/migrations/20261028200000_h3_occupation_catalog.sql`. Agrega una columna y 16 valores al catálogo genérico; reemplaza las tres funciones existentes citadas. Sin nuevas tablas, RPC, helpers o policies. Inventario conservado: 22 tablas públicas, 17 RPC públicas, 16 helpers privados y 25 policies.
- Fuente de datos: `supabase/reference/h3-catalog-values.json` y [registro de valores](catalog-values.md). El total inicial del sistema pasa a 11 catálogos y 66 valores, incluyendo H2.
- En el commit de implementación: lint, typecheck, 161 pruebas unitarias y build satisfactorios; `git diff --check` sin errores. Cobertura DOM de búsqueda, teclado, selección, OTROS y textarea.
- Migración aplicada incrementalmente en el entorno local sin reset: hashes de fichas y snapshots anteriores iguales; contactos conservados; 16 valores activos e inventario de seguridad comprobados.
- `tests/sql/h3-occupation.sql`: RPC real, normalización canónica, detalle OTROS, snapshot con ID/etiqueta/detalle; rechazo de catálogo incorrecto, valor inactivo, detalle vacío o mayor de 150. Ejecutado con alumno sintético y rollback completo.
- `scripts/test-enrollment.mjs` y regresión académica actualizados para ejecución en entorno limpio/CI. No se atribuye a esta enmienda una ejecución completa con reset ni un resultado de CI no verificado.

Pendiente de comprobación humana: búsqueda y selección con ratón/teclado, OTROS y corrección desde resumen, textarea ampliable en los temas/tamaños usados y visualización de ficha/legado. Verificar el comportamiento acordado dentro de las pruebas humanas H3; la automatización no reemplaza esa revisión.

## Límites de la decisión

Se conserva React + Supabase/PostgreSQL + RLS + constraints + RPC concretas. Se mantienen autorización DB, auditoría sin copia genérica de PII, concurrencia optimista, conflictos explícitos y ausencia de retries silenciosos. No se amplían permisos ni decisiones de matrícula/cargos, no se modifica H4+, y EVOL-001/002 continúan excluidas.

Esta enmienda no reemite ni amplía retrospectivamente la aprobación original de Gate 1, no crea `acceptance.md`, no aprueba Gate 2 y no autoriza merge a main. La entrega H3 continúa pendiente de pruebas humanas y Gate 2, incluyendo esta enmienda.
