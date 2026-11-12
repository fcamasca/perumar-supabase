# H5 — Ficha de matrícula PDF: requirements

Fecha: 12/11/2026 (America/Lima). **DRAFT / Gate 1 PENDIENTE. Construcción NO AUTORIZADA.**
Rama: `feature/h5-enrollment-pdf-spec`. Base exacta de main: `2789c12ca80f1f5b3e9ee3ef33a6e50ecfea52a1`, merge PR #2 de H4. CI main [43274919945](https://github.com/fcamasca/perumar-supabase/actions/runs/43274919945) SUCCESS antes de crear la rama. H4 [CLOSED / ACEPTADO / INTEGRADO](../H4-payments/acceptance.md); funcional aprobado `0091190f0cf353d744d6b2d9a6447916d9c882d6`.

La instrucción humana autoriza solo estos cuatro documentos: requirements.md, design.md, tasks.md y test-plan.md. No se ejecutó spike H5 ni se creó Edge Function, PDF, bucket, Storage, migración, React o dependencia. Los tests H5 están **NO EJECUTADOS**. El alcance es la sección H5 de [PLAN_MVP](../../PLAN_MVP.md), no facturación/patrocinadores H7 ni expediente H6. EVOL-001/002 y backend/colas/Lambda/WebFlux/AWS permanecen fuera.

## Pregunta arquitectónica

**¿Una Supabase Edge Function puede generar la ficha PDF requerida con calidad, seguridad y esfuerzo razonables?** El diseño es una hipótesis a evaluar, no una aprobación anticipada. Que una biblioteca declare compatibilidad Deno no prueba que satisfaga los límites y la calidad exigida en Edge.

## Requisitos

### REQ-H5-001 — Alcance y gates

Evaluar si una Supabase Edge Function puede producir la ficha requerida con calidad, seguridad y esfuerzo razonables. Esta entrega es SOLO SPEC. OQ-H5-001 a OQ-H5-004 RESUELTAS HUMANAMENTE el 12/11/2026; obtener Gate 1 sobre el Spec actualizado antes de cualquier construcción/spike ejecutable. Un resultado negativo o inconcluso va a GATE-A01; nunca autoriza otro backend.

### REQ-H5-002 — Referencia funcional autorizada

Adaptar la ficha institucional existente sin copiar sus datos personales, declaraciones antiguas ni implementación Jasper. Según OQ-H5-002 resuelta, mantener Libro/Folio/Registro visibles y en blanco, espacio para foto y espacios de firma/huellas. No inferir vigencia de textos/resoluciones de la muestra. No agregar Libro, Folio, Registro legal, fotografía, firma capturada o huellas digitales al modelo para rellenar el documento.

### REQ-H5-003 — Procedencia y fecha de los datos

OQ-H5-001 resuelta: datos personales, domicilio, contactos y etiquetas desde alumno_snapshot; Ciclo/Curso/promoción/patrocinador actuales al emitir, identificados como tales. Edad calculada desde fecha_nacimiento del snapshot a la fecha de matrícula (matricula.created_at, día calendario en Lima), nunca a la fecha de emisión ni updated_at. Fecha de emisión real del servidor en America/Lima. No presentar contexto actual como histórico ni almacenar una edad nueva.

### REQ-H5-004 — Lectura controlada del modelo existente

Reutilizar H1–H4 mediante una proyección cerrada, autorizada y consistente de una matrícula; validar UUID y versión esperada. No aceptar datos de ficha, importes, actor, permisos, HTML, paths o URLs desde React. No duplicar información en una tabla PDF salvo necesidad técnica demostrada y sometida a revisión antes de ampliar el diseño.

### REQ-H5-005 — Español y tipografía

Representar tildes, ñ/Ñ, diéresis, signos españoles y nombres compuestos sin sustituciones ni pérdida de caracteres. Usar fuentes con licencia válida y estrategia reproducible de inclusión. Un glifo no soportado debe detectarse; no producir silenciosamente cuadrados o un nombre alterado.

### REQ-H5-006 — Textos extensos

Respetar las longitudes del modelo: apellidos/nombres hasta 150, domicilio y señas hasta 500, dirección de contacto hasta 500, entre otras. Ajustar líneas y altura de filas sin cortar datos ni reducir arbitrariamente la letra hasta hacerla ilegible. Texto continuo y saltos de línea deben ser seguros.

### REQ-H5-007 — Tablas y multiplicidad

Representar tablas legibles, especialmente todos los contactos históricos aplicables, sin elegir silenciosamente uno principal. Repetir encabezados al continuar una tabla y preservar el orden estable. No añadir asignaturas ni cargos/pagos solo para fabricar una tabla: la referencia no los exige.

### REQ-H5-008 — Secciones y paginación

Soportar identificación, datos adicionales/domicilio, contactos y patrocinador cuando aplique, más elementos institucionales aprobados. Documento A4 vertical con varias páginas cuando haga falta; sin solapamientos, recortes, encabezados huérfanos ni pies invadidos. Incluir numeración y fecha de emisión diferenciada de inscripción/firma.

### REQ-H5-009 — Identidad institucional

Usar marca PERÚ MAR y la plantilla de referencia con los espacios definidos en OQ-H5-002 resuelta; conservar legibilidad, bordes, márgenes y jerarquía coherentes. No asumir vigentes resoluciones/textos de la muestra ni sustituir una resolución institucional por un dato del Curso. Mantener foto, firmas y huellas como espacios impresos vacíos, sin captura, almacenamiento de imagen personal, biometría ni firma digital H5. Libro/Folio/Registro permanecen visibles sin valores inventados.

### REQ-H5-010 — Experiencia de generación y estados

Acceso contextual desde la matrícula, generación explícita y descarga con estado ocupado, éxito o error seguro, sin perder contexto ni alterar la matrícula. OQ-H5-004 resuelta: generar y descargar solo con matrícula ACTIVA (estado DB ACTIVO) y Ciclo PROGRAMADO, EN_CURSO o CERRADO. Bloquear matrícula ANULADA (estado DB ANULADO) y Ciclo DESIERTO/ANULADO, incluso si el PDF se generó antes. Revalidar estado actual del servidor antes de entregar bytes; no basta el estado del artefacto o de React.

### REQ-H5-011 — Storage privado y propietario lógico

Cubrir almacenamiento privado Y descarga autorizada, no solo descarga directa sin persistencia. Propietario lógico: Matrícula, no el usuario creador del objeto Storage. Bucket privado, nombres opacos y metadata técnica mínima; ninguna URL pública o nombre con DI/apellidos. No construir expediente ni catálogo documental H6.

### REQ-H5-012 — Autenticación y autorización

Reutilizar perfiles activos y roles DIRECTOR_ACADEMICO/COORDINADOR_ACADEMICO bajo RLS vigente; Admin sin rol académico, anónimo y usuario inactivo no acceden. Autorizar cada generación/descarga. El modelo no relaciona auth.users con propiedad de Alumno: no inventar una regla de dueño o tenant; probar IDs de otra matrícula conforme a permisos reales.

### REQ-H5-013 — Descarga, secretos y expiración

Propuesta: descargar mediante Edge autenticada en cada petición, con respuesta privada no cacheable; no emitir URLs firmadas de producto ni poner tokens en URLs. Revalidar rol y acceso antes de entregar bytes. Contemplar y ensayar URLs firmadas expiradas como propiedad de seguridad de Storage en fixtures controladas, sin convertirlas en una funcionalidad adicional.

### REQ-H5-014 — Repetición, regeneración y retención

Dos generaciones explícitas producen artefactos distintos sin sobreescribir ni modificar datos de negocio. No crear historial documental/versionador genérico; conservar versión técnica de plantilla y procedencia por artefacto. OQ-H5-003 resuelta: PDF privado temporal por 24 horas desde generación (tiempo servidor); después expira y requiere regeneración explícita si hace falta. Rechazar descarga desde el instante de expiración aunque el objeto siga físicamente pendiente de limpieza. Limpieza acotada por Storage API, sin borrar historia H1–H4. Almacenamiento permanente de fotos/documentos queda para H6.

### REQ-H5-015 — Errores y límites

Validar tamaño de petición, contenido mínimo y presupuesto de recursos. Distinguir ID inválido, no autorizado/no encontrado, contexto cambiado, archivo ausente/expirado, generación fallida, timeout y Storage/auditoría no disponibles. Sin stack, SQL, secretos o ficha en errores. Sin reintentos silenciosos ni PDF parcial presentado como éxito.

### REQ-H5-016 — Auditoría y privacidad

Usar auditoria existente para eventos mínimos de generación y descarga iniciada; actor procede de autenticación verificada. No copiar alumno_snapshot, nombres, DI, contactos, notas, PDF o URLs a auditoría/logs. Justificar un único comando específico si el inventario actual no permite registrar estos eventos sin falsear una actualización de Matrícula.

### REQ-H5-017 — Secure SDLC y contenido no confiable

Incluir revisión de amenazas, autenticación/autorización, manipulación de IDs, inyección, XSS/HTML-to-PDF, SSRF, traversal, secretos y dependencias. Contenido de ficha se trata como texto; no se acepta HTML/plantilla ni recursos externos proporcionados por usuario. No basta esconder botones en React.

### REQ-H5-018 — Prueba real de Edge Function

Tras Gate 1, ejecutar una prueba local reproducible en Edge Runtime y documentar versiones/comando/fixture. No sustituirla por generar desde Node o el navegador. Verificar restricciones hospedadas antes de afirmar aptitud hospedada; sin ensayo autorizado o métricas suficientes, reportar limitación/resultado inconcluso, no PASSED inventado.

### REQ-H5-019 — Fiabilidad y regresión

Ensayar fallos entre lectura, render, upload, auditoría y respuesta, además de dos peticiones concurrentes. DB y Storage no son una transacción ACID conjunta: definir compensación y artefactos privados huérfanos. Mantener intactos pagos, saldos, cargos, snapshots y permisos H1–H4; no resetear ni contaminar datos humanos.

### REQ-H5-020 — Evaluación de suficiencia y GATE-A01

Entregar evidencia visual, seguridad, latencia/CPU/memoria/tamaño, costo estimado con supuestos y esfuerzo/mantenibilidad reales. Evaluar Seguridad, Fiabilidad, Rendimiento, Costos y Excelencia operacional usando AWS Well-Architected como referencia, sin servicios AWS. Concluir suficiente/no suficiente/inconcluso con limitaciones; la continuidad de arquitectura corresponde a decisión humana GATE-A01.

## Decisiones humanas — cuatro OQ RESUELTAS

Fecha: **12/11/2026 (America/Lima)**. Decisor: usuario de esta conversación. Esta resolución **NO es Gate 1** y no autoriza construcción. Se conserva la identidad de las OQ para trazar las decisiones.

| ID | Tipo | Decisión humana vinculante | Estado / afecta |
| --- | --- | --- | --- |
| OQ-H5-001 | Negocio | Datos personales, domicilio, contactos y etiquetas desde alumno_snapshot. Ciclo/Curso/promoción/patrocinador actuales al emitir. Edad calculada a la fecha de matrícula; emisión real en Lima. Fecha de matrícula = matricula.created_at, no updated_at ni fecha del snapshot. | RESUELTA HUMANAMENTE; REQ-H5-003, REQ-H5-004 |
| OQ-H5-002 | Negocio / UX | Libro/Folio/Registro visibles pero en blanco; mantener espacio para foto y espacios de firma/huellas. No inventar valores ni crear campos de negocio para rellenarlos. No captura de fotos/firmas/huellas en H5. | RESUELTA HUMANAMENTE; REQ-H5-002, REQ-H5-005 a REQ-H5-009 |
| OQ-H5-003 | Negocio / privacidad | PDF privado temporal de 24 horas; después expira y se regenera si hace falta. Retención permanente de fotos/documentos queda para H6. La expiración se controla del lado servidor y no depende de haber completado aún la limpieza física. | RESUELTA HUMANAMENTE; REQ-H5-011, REQ-H5-013, REQ-H5-014 |
| OQ-H5-004 | Negocio | Generación/descarga solo con matrícula ACTIVA y Ciclo PROGRAMADO, EN_CURSO o CERRADO. Bloquear matrícula ANULADA y Ciclo DESIERTO/ANULADO. Si se anula después de generar, bloquear también la descarga del PDF existente, aunque no haya expirado. | RESUELTA HUMANAMENTE; REQ-H5-010, REQ-H5-012, REQ-H5-019 |

No se infiere certificación de vigencia legal de las declaraciones/resoluciones de la muestra ni se añaden textos o datos de negocio no suministrados. La referencia visual se adapta conservando expresamente los espacios solicitados; una foto en blanco no significa funcionalidad de foto implementada. No quedan OQ de negocio abiertas en esta versión. Biblioteca, métricas y compatibilidad Runtime se evaluarán en el spike autorizado tras Gate 1; la suficiencia de Edge y GATE-A01 siguen sin resolverse de antemano.

## Trazabilidad completa

| REQ | DES | TASK | TEST planificados |
| --- | --- | --- | --- |
| REQ-H5-001 | DES-H5-001 | TASK-H5-001 | TEST-H5-001, TEST-H5-002 |
| REQ-H5-002 | DES-H5-002 | TASK-H5-002 | TEST-H5-003, TEST-H5-004 |
| REQ-H5-003 | DES-H5-003 | TASK-H5-003 | TEST-H5-005, TEST-H5-006 |
| REQ-H5-004 | DES-H5-004 | TASK-H5-004 | TEST-H5-007, TEST-H5-008 |
| REQ-H5-005 | DES-H5-005 | TASK-H5-005 | TEST-H5-009, TEST-H5-010 |
| REQ-H5-006 | DES-H5-006 | TASK-H5-006 | TEST-H5-011, TEST-H5-012 |
| REQ-H5-007 | DES-H5-007 | TASK-H5-007 | TEST-H5-013, TEST-H5-014 |
| REQ-H5-008 | DES-H5-008 | TASK-H5-008 | TEST-H5-015, TEST-H5-016 |
| REQ-H5-009 | DES-H5-009 | TASK-H5-009 | TEST-H5-017, TEST-H5-018 |
| REQ-H5-010 | DES-H5-010 | TASK-H5-010 | TEST-H5-019, TEST-H5-020 |
| REQ-H5-011 | DES-H5-011 | TASK-H5-011 | TEST-H5-021, TEST-H5-022 |
| REQ-H5-012 | DES-H5-012 | TASK-H5-012 | TEST-H5-023, TEST-H5-024 |
| REQ-H5-013 | DES-H5-013 | TASK-H5-013 | TEST-H5-025, TEST-H5-026 |
| REQ-H5-014 | DES-H5-014 | TASK-H5-014 | TEST-H5-027, TEST-H5-028 |
| REQ-H5-015 | DES-H5-015 | TASK-H5-015 | TEST-H5-029, TEST-H5-030 |
| REQ-H5-016 | DES-H5-016 | TASK-H5-016 | TEST-H5-031, TEST-H5-032 |
| REQ-H5-017 | DES-H5-017 | TASK-H5-017 | TEST-H5-033, TEST-H5-034 |
| REQ-H5-018 | DES-H5-018 | TASK-H5-018 | TEST-H5-035, TEST-H5-036 |
| REQ-H5-019 | DES-H5-019 | TASK-H5-019 | TEST-H5-037, TEST-H5-038 |
| REQ-H5-020 | DES-H5-020 | TASK-H5-020 | TEST-H5-039, TEST-H5-040 |

Inventario del Spec: **20 REQ / 20 DES / 20 TASK / 40 TEST / 4 OQ resueltas humanamente**. Ningún test H5 ejecutado. Gate 1 sigue PENDIENTE; Codex no aprueba gates.
