# CHG-H3-002 — Modalidad de Carrera opcional

Fecha: 02/11/2026 (America/Lima). Decisor: usuario/revisor humano de esta conversación.

**CAMBIO AUTORIZADO POR SOLICITUD HUMANA, IMPLEMENTADO. GATE 2 H3 PENDIENTE.**

## Autoridad y diferencia con la base

La persona solicitó: «en carreras sube modalidad y siglas debajo de codigo, quita la obligatoriedad de modalidad». La base H2 implementaba `carrera.modalidad_id NOT NULL` y `guardar_carrera` exigía modalidad incluso al crear. La instrucción posterior autoriza convertir ese campo en opcional, además del reordenamiento de interfaz. Es una modificación funcional posterior a la base H2 usada por el Spec H3 aprobado en `551cd00ed2957178400dca8fe9d945cf3f9e8d20`; no se atribuye retrospectivamente al Gate 1 original ni reescribe la aceptación histórica de H2.

## Alcance acotado

- En Datos generales de Carrera: Código/Nombre en la primera fila, Modalidad/Sigla en la siguiente y Descripción al final. Misma disposición al consultar y editar.
- Modalidad es opcional: `NULL`, ausencia del valor en el comando completo o texto vacío/espacios se normalizan a `NULL`. La UI envía `modalidad_id: null` cuando no se selecciona; consulta muestra No indicado.
- Se conserva la FK UUID al catálogo genérico existente. Una modalidad nueva suministrada se valida server-side contra MODALIDAD_CARRERA y vigencia del catálogo/valor. Conservar una referencia histórica inactiva ya asignada mantiene el comportamiento anterior; no permite seleccionar una referencia inactiva para una nueva Carrera.
- Sigla permanece obligatoria, única, en mayúsculas, alfanumérica de 2–10 caracteres. Se conserva mínimo una Materia activa, restricciones de asociaciones, sincronización de Ciclos, códigos históricos, auditoría, autorización solo Director y control de versión/concurrencia existentes.

Complementa REQ-H2-003 y las definiciones de Carrera y catálogo del diseño H2. Se mantienen los documentos aprobados H2/H3, sus IDs, contratos RPC y restantes decisiones. No hay tablas, catálogos, RPC, helpers privados, policies o permisos nuevos.

## Implementación y evidencia

Migración aditiva `20261102010000_h2_optional_career_modality.sql`: elimina exclusivamente NOT NULL de modalidad_id y reemplaza la función existente guardar_carrera con la aceptación opcional y normalización descritas. Conserva firma, SECURITY DEFINER, search_path vacío, configuración serializable y lógica restante. FK y valores previamente asignados permanecen intactos. Inventario exacto actualizado con la nueva versión de migración.

Aplicación local incremental, sin reset. Huellas de Carreras, Ciclos y snapshots de matrículas, cantidades de asociaciones/Materias y auditoría iguales antes/después. Inventario de seguridad comprobado. `tests/sql/h2-optional-career-modality.sql` ejecuta comandos reales con datos sintéticos y rollback: alta sin modalidad, asignación válida, eliminación con NULL/espacios; rechazos por catálogo incorrecto, referencia inactiva nueva, sigla inválida, falta de Materias, versión obsoleta y usuario no autorizado; conservación de referencia histórica inactiva y configuración de aislamiento. Las huellas se compararon de nuevo tras rollback.

198 pruebas unitarias/DOM, lint, typecheck, build y diff --check satisfactorios. El test DOM reemplaza el antiguo caso de Modalidad obligatoria por opcionalidad, disposición, Sigla requerida y payload nulo. La integración académica de entorno limpio también incorpora alta sin modalidad; no se ejecutó un reset sobre los datos humanos locales.

Revisión visual humana y Gate 2 de H3 pendientes. Esta enmienda no constituye aceptación, merge a main ni autorización de H4/EVOL-001/002.

Comprobación adicional posterior a la migración: `npm run test:local` PASÓ; Data API pública sin rutas protegidas e inventario exacto de grants/RLS/helpers/RPC.


Actualización posterior: [CHG-H3-003](approved-career-student-code-amendment.md) sustituye distribución, valores de modalidad y default de alta aquí descritos; conserva opcionalidad explícita. Este texto mantiene el registro histórico de CHG-H3-002.
