# CHG-H3-009 — Terminología visible: Cursos y Asignaturas

Autorización humana: 04/11/2026, confirmación explícita de realizar el cambio solo en frontend. Precisión terminológica posterior a Gate 1; no modifica los cuatro documentos aprobados y no aprueba Gate 2.

## Presentación

Carrera/Carreras se muestra como Curso/Cursos. Materia/Materias se muestra como Asignatura/Asignaturas. Ciclo/Ciclos conserva su nombre. Se aplica a menú, títulos, pestañas, formularios, grillas, búsquedas, botones, ayudas, validaciones, confirmaciones y etiquetas legibles de auditoría. Ejemplos: Nuevo Curso, Asignaturas del Curso, Asignaturas del Ciclo, Descuento del Curso. Tipo de tarifa CARRERA se presenta como Curso, manteniendo su valor técnico.

La denominación Curso identifica al programa MAM completo; Asignatura distingue los componentes de su malla. Asignatura es una decisión de claridad de interfaz y no se presenta como denominación literal obligatoria de DICAPI.

## Límite

Sin cambios SQL, tablas, columnas, relaciones, RPC, helpers, policies, constraints, valores enum, rutas, IDs, registros, resolución/URL DICAPI, importes, permisos ni transacciones. Se mantienen materia/carrera/carrera_materia/ciclo_materia, campos *_id y tipo CARRERA. Los mensajes técnicos de DB se reconocen con sus textos anteriores y se traducen al vocabulario visible; no se reescribe auditoría ni snapshot histórico. Los nombres introducidos por usuarios no se renombran. El detalle técnico puede conservar identificadores internos.

Las pruebas actualizan expectativas visibles y conservan consultas/payloads técnicos, datos sintéticos y mensajes DB de entrada. Revisión humana de menú, navegación, búsquedas, formularios, tarifas, descuentos y auditoría pendiente. Gate 2 pendiente.
