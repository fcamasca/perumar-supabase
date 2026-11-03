# CHG-H3-003 — Experiencia, modalidad y códigos de operación

Fecha: 02/11/2026 (America/Lima). Decisor: usuario/revisor humano de esta conversación.

**CAMBIO AUTORIZADO POR SOLICITUD HUMANA, IMPLEMENTADO. GATE 2 H3 PENDIENTE.**

## Autoridad y relación con Gate 1

Solicitud humana: separar «Con experiencia» como flag S/N, usar modalidades Presencial/Semipresencial/A distancia, reordenar Carrera, conservar códigos técnicos legados de Materia/Carrera nullable y fuera de operación/UI, y asignar a Alumno un código automático e inmutable A-0000001 con secuencia global segura ante concurrencia, sin requisito gapless. Aclaración humana: «el nuevo campo por defecto sin experiencia, modalidad por defecto presencial».

Decisión posterior al Spec H3 aprobado sobre `551cd00ed2957178400dca8fe9d945cf3f9e8d20`. Complementa los requisitos de ficha/catálogos/snapshot y modifica las definiciones operativas de Materia/Carrera heredadas de H2. No se reescriben los cuatro documentos aprobados H3, la aceptación H2 ni sus IDs. Esta enmienda sustituye la distribución y el default de modalidad descritos en CHG-H3-002; conserva su opcionalidad explícita.

## Carrera

- `con_experiencia boolean NOT NULL DEFAULT false`: Sí/No en la UI mediante checkbox nativo con presentación switch, nombre accesible, foco y teclado. El RPC admite exclusivamente booleanos JSON; rechaza texto S/N, nulo y objetos. Al crear, omisión equivale a No; al editar, omisión conserva el flag existente.
- Modalidad utiliza exclusivamente `catalogo/catalogo_valor`, catálogo existente `MODALIDAD_CARRERA`: PRESENCIAL → Presencial, SEMIPRESENCIAL → Semipresencial, A_DISTANCIA → A distancia. Sin catálogo paralelo, motor, tabla o mantenimiento nuevo.
- Alta UI preselecciona Presencial. El comando también usa Presencial si se omite `modalidad_id`; NULL o vacío explícitos siguen permitidos por CHG-H3-002. Nuevas asignaciones validan server-side catálogo correcto/activo, valor activo y uno de los tres códigos de enseñanza. Se conserva una referencia de enseñanza inactiva ya asignada, sin habilitar nuevas asignaciones a ella, como en H2/CHG-H3-002.
- Conversión de datos existentes: CON_EXPERIENCIA → Sí, SIN_EXPERIENCIA o modalidad vacía → No. Todas las Carreras existentes reciben Presencial según la aclaración humana. Los dos valores antiguos se conservan con sus IDs, inactivos; no se renombran ni reutilizan sus IDs.
- Primera fila Sigla/Nombre; segunda fila Modalidad/Con experiencia alineados; Descripción al final. Consulta y edición comparten distribución. Sigla conserva obligatoriedad, unicidad, formato y sugerencia editable.
- Autorización solo Director, mínimo una Materia activa, versiones optimistas, sincronización de Ciclos y reglas históricas de códigos de Ciclo/matrícula permanecen.

## Materia y Carrera: código técnico legado

`codigo` conserva valores, constraints de formato/unicidad y referencias históricas; ahora admite NULL. Las altas de producto dejan NULL. Los comandos concretos `guardar_materia`/`guardar_carrera` no aceptan codigo en su allowlist y no lo sobrescriben al editar. No hay renumeración, borrado de valores existentes ni nuevo código automático para estas entidades.

Fuera de formularios, grillas, búsquedas, selectores y presentación de auditoría. Auditoría histórica en DB permanece íntegra. Identificación visible: Nombre de Materia; Sigla y Nombre de Carrera. Búsqueda Materia por Nombre, Carrera por Sigla o Nombre. Ciclo conserva código propio y búsqueda por código de Ciclo o nombre de Carrera.

## Alumno: código visible automático

- `codigo_alumno text NOT NULL UNIQUE`, generado exclusivamente en DB mediante `private.alumno_codigo_seq` (bigint, no cycle), empezando en 1 globalmente, sin reinicio anual. Formato A- más número con al menos siete dígitos: A-0000001; por encima de 9999999 crece sin truncarse ni repetir identificadores.
- Se reutiliza el trigger existente `private.validate_alumno`: INSERT asigna un solo nextval; UPDATE rechaza cambiar o vaciar el código. No se agrega RPC/helper/policy. `guardar_alumno` sigue rechazando código suministrado por el cliente. React solo presenta el valor devuelto por DB.
- La secuencia no concede USAGE/SELECT/UPDATE a PUBLIC, anon o authenticated. Los roles de producto conservan acceso de lectura por RLS y escritura solo mediante RPC concretas existentes.
- Backfill de alumnos existentes en orden created_at,id. Conserva PII, versiones, contactos, auditoría y matrículas. Los snapshots existentes no se regeneran. Nuevos snapshots DB-side incluyen el código automáticamente dentro de alumno y conservan su inmutabilidad.
- Visible en grilla, cabecera de ficha, Resumen/Revisar y selección de alumno en matrícula; antes del alta se indica Se asignará al guardar. Nunca editable. El buscador admite A-… además de documento/apellido.
- Nextval es seguro entre transacciones concurrentes y no transaccional: rollback/error puede consumir números. No se prometen secuencia gapless ni correspondencia entre número y orden de commit. No hay retries silenciosos.

## Migración y validación

Migración aditiva `20261102020000_career_flags_student_code.sql`. Conserva firmas, grants, SECURITY DEFINER, search_path vacío y configuración serializable de RPC existentes. Inventario: 22 tablas públicas, 17 RPC, 16 helpers privados, 25 policies SELECT; se agrega únicamente una secuencia privada.

Backfill controlado bajo bloqueo transaccional de tablas: pausa solo triggers nombrados de auditoría/timestamp y validación de Alumno durante la transformación, restaurándolos antes de completar. No usa actor ficticio, no registra PII en auditoría y no deshabilita constraints/FK ni políticas del producto. La aplicación local fue incremental, sin reset ni retirar datos humanos; huellas verifican preservación de registros, códigos legados, versiones, ciclos, snapshots y auditoría, y la conversión de experiencia se comprueba contra el estado previo.

`tests/sql/career-student-amendment.sql`: default de Carrera, flag válido/rechazo de tipos inválidos, rechazo de códigos legados en comandos, preservación al editar, conflictos de versión, código automático/único/inmutable y no suministrable por cliente, snapshot nuevo y permisos de secuencia. Repite regresiones de modalidad opcional y ocupación. Todo con datos sintéticos y rollback.

`tests/sql/student-code-concurrency.sql`: ocho sesiones PostgreSQL simultáneas en SERIALIZABLE, ocho códigos únicos; rollback y comparación de huellas, sin retries. Ejecutable seguro con Director local existente mediante `node scripts/test-career-student-amendment.mjs`; incluido en test:academic durante la vida de sus fixtures CI.

Lint, typecheck y 199 pruebas unitarias/DOM pasaron. Build e integración local se registran en implementation-log y resultado final. La batería completa con reset se reserva a CI aislada; no se reseteó la DB humana. Recorrido visual/teclado/SO y Gate 2 pendientes.

Sin API adicional, dependencias nuevas, H4+, EVOL-001/002, acceptance ni merge a main.
