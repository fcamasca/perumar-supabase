# CHG-H3-004 — Matrícula con pestañas y búsqueda de Alumno

Fecha: 02/11/2026 (America/Lima). Decisor: usuario/revisor humano de esta conversación.

**CAMBIO UX AUTORIZADO POR SOLICITUD HUMANA, IMPLEMENTADO. GATE 2 PENDIENTE.**

## Autoridad y diferencia con el Spec

La persona propuso sustituir Siguiente/Anterior de Matrícula por navegación como Ciclo, pidió análisis y después autorizó: «ok haz el cambio», ampliando la búsqueda de alumnos a apellidos, nombres y número de documento, «sensitivo». Se comunicó la interpretación de búsqueda reactiva mientras escribe, sin distinguir mayúsculas/minúsculas.

Sustituye exclusivamente el Stepper de Registrar Matrícula descrito en REQ-H3-019/DES-H3-019 del Spec aprobado en `551cd00ed2957178400dca8fe9d945cf3f9e8d20`. No modifica retrospectivamente los cuatro documentos aprobados ni atribuye esta decisión al Gate 1 original. Nuevo Alumno conserva su Stepper y el retorno al mismo flujo de matrícula al guardar/cancelar.

## Navegación y presentación

Tres pestañas reutilizan AcademicTabs con clic y flechas/Home/End: Datos de matrícula (Ciclo, Alumno, patrocinador opcional), Cargos y Resumen. Sin Anterior/Siguiente. Cabecera compacta mantiene Ciclo/Alumno visibles; cambiar de pestaña conserva datos y no ejecuta comandos.

Patrocinador muestra Sin patrocinador o la empresa seleccionada y abre el selector existente al solicitarlo; sus formularios permanecen fuera del formulario de matrícula para evitar forms anidados. Elegir/crear empresa retorna al borrador de matrícula. Alta/edición de Alumno desde Matrícula carga la ficha completa y conserva el Ciclo.

Cargos indica que falta Ciclo, carga/error/configuración vacía y distingue tarifas obligatorias/opcionales. Descuento solo Director. Cambiar Ciclo limpia inmediatamente los cargos anteriores, opcionales, descuento y motivo y vuelve a consultar su configuración, avisando el reinicio; conserva alumno y patrocinador.

Solo Resumen ofrece Confirmar matrícula. Validación revela pestaña/campo faltante incluso si está oculta; ausencia de alumno o cargos válidos impide enviar el comando. Importes visibles son referencia, sin reserva de código ni autoridad económica en React.

## Búsqueda de Alumno

- En matrícula: consulta automática con pausa de 300 ms, mínimo dos caracteres y máximo veinte coincidencias. Incluye apellido_paterno, apellido_materno, nombres, numero_di y codigo_alumno; este último conserva el alcance de CHG-H3-003.
- Cada palabra puede coincidir parcialmente en cualquiera de esos campos; todas las palabras deben coincidir en el mismo alumno. ILIKE no distingue mayúsculas/minúsculas; no se promete equivalencia de tildes. Operandos entrecomillados para que comas/comillas/paréntesis no se conviertan en sintaxis de filtros.
- Las respuestas de búsquedas anteriores se descartan; limpiar texto elimina resultados, sin quitar al alumno ya elegido. No se precarga la tabla completa para buscar ni se muestran valores técnicos.
- Resultados mínimos: ID/código, apellidos/nombres, documento y versión. Seleccionar consulta la ficha completa por ID antes de usarla para editar/confirmar, manteniendo versión optimista y sin vaciar campos no incluidos en la búsqueda.
- La grilla principal Alumnos reutiliza la misma búsqueda por palabras/campos e ILIKE y conserva paginación/orden por registro. En esa grilla se mantiene su actualización al escribir sin mínimo de dos caracteres.

## Reglas conservadas y validación

Confirmar usa únicamente registrar_matricula con referencias/versiones, patrocinador, código manual opcional, opcionales seleccionadas y descuento/motivo solo Director. PostgreSQL sigue validando permisos, estado, ficha/contactos, tarifas, importes, descuento, código, snapshot, duplicados y atomicidad. Ninguna pestaña crea matrícula/cargos parciales. Conflictos/respuesta incierta conservan el borrador y no reintentan silenciosamente. La pantalla de éxito conserva Matricular otro alumno en este Ciclo y Ver matrícula, revalidando Ciclo para el siguiente alumno.

Sin migraciones, tablas, RPC, helpers DB, policies, grants, dependencias, arquitectura nueva ni H4+/EVOL-001/002. Pruebas automatizadas cubren Tabs, búsqueda por palabras, debounce/respuestas obsoletas, carga completa al seleccionar, persistencia entre pestañas, confirmación única, reinicio al cambiar Ciclo, validación oculta y conflictos sin retry. Evidencia de ejecución en implementation-log. Pruebas humanas/teclado/temas/SO y Gate 2 permanecen pendientes.
