# CHG-H3-008 — Información DICAPI y carga inicial de pesca

Autorización humana: 04/11/2026, solicitud explícita de implementar el resumen de impacto y la carga de Carreras/Materias. Enmienda posterior a Gate 1 (551cd00ed2957178400dca8fe9d945cf3f9e8d20); conserva los cuatro documentos aprobados y no aprueba Gate 2.

## Carrera

Cinco columnas opcionales, sin JSONB ni tablas nuevas:
- codigo_curso_dicapi: texto hasta 30, mayúsculas, segmentos alfanuméricos separados por guion (ejemplo MAM-009). Independiente del codigo técnico legado y sin unicidad, para admitir variantes.
- resolucion_malla_curricular: texto hasta 150.
- fecha_resolucion_malla: fecha entre 1900-01-01 y 9999-12-31.
- resolucion_autorizacion_centro: texto hasta 150, independiente de la resolución de malla.
- observaciones_normativas: texto hasta 2000, para modificaciones y precisiones documentadas.

Guardar Carrera usa guardar_carrera existente: autorización solo Director, tipos JSON y allowlist estrictos, normalización/constraints DB, mínimo una Materia activa y optimistic concurrency vigentes. Omitir campos nuevos al editar conserva valores; NULL/vacío explícitos los limpian. Auditoría existente registra los cambios sin nuevo trigger/helper/policy. Información DICAPI tiene pestaña propia en la misma ficha readonly/edición y búsqueda de Carrera por Sigla/Nombre/Código DICAPI. Números de resolución y notas no son reglas ejecutables ni alteran automáticamente una malla.

## Carga inicial autorizada

Fuente directa: [RD 1052-2024 MGP/DICAPI y Anexo A](https://www.dicapi.mil.pe/storage/regulatory-framework/Zm1HLYB41736522114.pdf), páginas del anexo 7-8 (PDF 15-16). [Autorización PERÚ MAR RD 072-26, 05/02/2026](https://www.dicapi.mil.pe/storage/regulatory-framework/00b0694b-1b80-4847-9a77-8e33e8920b54.pdf). Denominaciones transcritas en supabase/reference/dicapi-fishing-curricula.json.

MAM-009 Marinero de Pesca Calificado: 10 materias. MAM-010 Marinero de Pesca Artesanal: 7 materias. Se crean 16 materias distintas en base vacía, compartiendo exactamente Prevención de la Contaminación. No se unifican materias con nombres distintos. No se cargan horas por materia debido a inconsistencias aritméticas del anexo. Resolución de malla 1052-2024 MGP/DICAPI, fecha 2024-12-27; autorización 072-26 MGP/DICAPI; notas vacías. Nuevas Carreras: siglas MAM009/MAM010, Presencial, sin experiencia y activas.

Reutiliza Carreras por código DICAPI o nombre exacto; ambigüedad/incompatibilidad detiene toda la transacción. Reutiliza Materias por nombre exacto. Completa solo metadatos vacíos y asociaciones ausentes; conserva nombre, sigla, modalidad, experiencia, notas, resoluciones existentes y estados; nunca reactiva ni elimina. En base existente la migración carga incrementalmente. En reset aislado espera referencias de seed.sql y se ejecuta también después de esa semilla; SQL idempotente común, sin motor de mantenimiento. Triggers de auditoría de tres tablas se suspenden solo bajo lock/transacción para carga técnica sin actor ficticio, y se restauran; constraints y versiones permanecen. Operaciones de producto conservan auditoría normal.

Los campos solo se almacenan en Carrera. La carga no invoca sync_missing: no altera Ciclos existentes, matrículas, cargos o snapshots. Guardar Carrera desde el producto conserva la sincronización H2 preexistente. No se agrega versionado normativo/motor, nuevo backend ni funciones H4+.

## Validación

Pruebas UI y SQL con rollback: metadatos opcionales, formatos/longitudes/fecha, conservación por clientes anteriores, limpieza explícita, permisos, auditoría y conflicto. Carga real repetida sin cambios y huellas de historia intactas. Inventario sin nuevas tablas/RPC/helpers/policies; dos migraciones nuevas. Revisión visual/humana y Gate 2 pendientes.
