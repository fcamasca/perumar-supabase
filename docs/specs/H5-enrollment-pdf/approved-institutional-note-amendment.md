# CHG-H5-001 — Nota institucional y retiro de FOTO

12/11/2026, America/Lima. **APROBADO HUMANAMENTE**, posterior a Gate 1, en `feature/h5-enrollment-pdf`. Base anterior exacta: `a303b679877aa4a9bcebcfb0c3564382edddeb15`, CI `43337996757` SUCCESS, 413/413 pruebas. Candidato técnico posterior exacto **`2196348fec188880c8853d1cb80fac3b229eeea4`**; CI [43346943904](https://github.com/fcamasca/perumar-supabase/actions/runs/43346943904) **COMPLETED / SUCCESS**, **415/415 PASSED**. Lint/typecheck/Deno check/build/build-safety, H1–H4, rollback/concurrencia (70 + 60 sobre saldo 100, sin retry), Edge/Storage reales, expiración y reconstrucción con repetición de suites PASSED. `git diff --check` PASSED. No cambió el inventario ni hubo migraciones/datos humanos modificados. Esta consolidación solo modifica documentación; el candidato técnico permanece intacto.

## Hallazgo y autorización

**Bloque 1 humano: NO OK** inicialmente por desviación respecto a la ficha institucional; continúa pendiente de nueva revisión humana. La referencia local `docs/usuario/ficha-perumar.pdf` confirma Nota y dos índices/firma, sin fotografía. Se revisó en paralelo con el nuevo PDF sintético; la comparación contiene PII del original y permanece local, fuera de Git y artefactos CI. No se copia el original como fondo ni se incorporan sus datos personales.

El usuario aprobó expresamente eliminar FOTO, conservar Libro/Folio/Registro vacíos, Índice Izquierdo/Índice Derecho/Firma, incorporar literalmente su Nota y mantener el caso normal en una página A4 legible. Esta enmienda **reemplaza exclusivamente la parte de OQ-H5-002 que reservaba fotografía**, y autoriza el texto institucional suministrado. No se atribuye retroactivamente al Gate 1 aprobado sobre `9804bb07063590e8917fc86d07995c474b84e718`; gate-1.md y los cuatro documentos históricos del Spec permanecen intactos.

## Regla de presentación vigente

- FOTO eliminada: sin caja, rótulo ni reserva. Sin captura de fotos/biometría ni funcionalidad H6.
- Libro/Folio/Registro visibles y vacíos. Dos índices físicos independientes y línea de Firma vacíos, sin nombre/fecha simulando firma realizada.
- Nota debajo de contactos/patrocinador y antes de índices/firma, preservada literalmente. No se interpreta jurídicamente ni se sustituyen palabras.
- Caso normal de un alumno/un contacto/sin patrocinador: una página A4 vertical. Se ajustan filas, espacios, logo y campos en línea; fuente mínima 9 pt, sin encoger ni truncar datos para forzar una página.
- Se retira la fila independiente Matrícula/Alumno/Ciclo bajo el título: sus identificadores quedan discretamente dentro de la celda Curso existente; no sustituyen Libro/Folio/Registro.
- Datos extensos continúan con cabeceras/pies y tablas de contactos completos. Logo y estructura horizontal se conservan.

## Texto humano incorporado sin correcciones

Nota:

1.- El participante manifiesta saber nadar, y sus prácticas las realizará de acuerdo a su disponibilidad.

2.- EL ALUMNO SERA RETIRADO POR LAS SIGUIENTES CAUSALES:

a. Cometer falta grave contra el personal Directivo, Docente, Administrativo y/o el Centro de Estudio, 2 ó más inasistencias, deuda o abandono de documento por mas de QUINCE (15) DIAS.

b. El Alumno que sea retirado ó se retire voluntariamente NO TIENE DERECHO a reclamo ni devolución de dinero alguno, perdiendo su derecho como tal.

c. Asimismo ASUME TODA RESPONSABILIDAD, ante cualquier accidente, siniestro marítimo, enfermedad u otros que le pudiera ocurrir en ó durante el tiempo que dure el Curso, librando de toda culpa y responsabilidad a terceros.

d. EL SUSCRITO DECLARA BAJO JURAMENTO QUE los datos y compromisos adquiridos son verdaderos aceptando las condiciones especficas en la presente Ficha de Matrícula y Reglamento del Centro de Instrucción Acuática CETPRO "PERU MAR", de ser falso me someto a las acciones legales vigentes a que diera luga, de acuerdo al Art. 42° de la Ley 27444.

e. Para mayor veracidad a continuation stamp mis hulas deciares y firm correspondiente.

Observaciones de redacción, sin corregir: «SERA», «mas», «DIAS», «especficas», «luga» y «continuation stamp mis hulas deciares y firm correspondiente». No se buscó ni adoptó una versión externa. El fixture literal y la extracción del PDF comprueban el texto suministrado, incluidos esos términos.

## Controles y procedencia preservados

PII/domicilio/contactos/etiquetas desde alumno_snapshot; edad a matrícula.created_at; Curso/Ciclo/promoción/patrocinador actuales al emitir; emisión real Lima. Sin cambios a lectura, JWT/RLS/roles, contrato Edge, service_role acotado, RPC/auditoría, bucket/Storage privado, retención 24 h, expiración, bloqueo de estados, CORS, errores, límites, compensación, ausencia de URLs firmadas de producto ni H4. No migraciones, tablas, helpers DB, policies, motor documental o infraestructura nueva. El identificador de auditoría h5-1 sigue igual; Producer identifica CHG-H5-001.

## Evidencia técnica y límites de aceptación

Suite local **415/415 PASSED** (413 previas + dos regresiones), lint/typecheck/Deno check/build/build-safety PASSED. QA local mediante pypdf y render Poppler: Nota completa, ausencia FOTO, índices/firma separados del texto/pie, español, blancos y paginación. Comparación técnica lado a lado del caso normal con la referencia y revisión de las cinco páginas extensas. La extracción Poppler/bbox y las suites completas Edge/Storage/H1–H4 PASSED en CI, antes y después de reconstruir el entorno desechable.

Evidencia sintética local: `output/pdf/h5-chg001-normal.pdf` (**1 página**) y `output/pdf/h5-chg001-extensa.pdf` (**5 páginas**, 100 contactos, campos largos y patrocinador). Los PDFs/PNG locales no se versionan. CI publica solo evidencia sintética, nunca la referencia personal.

Diferencias conocidas respecto al modelo: anchos/espaciados adaptativos y texto de Nota en peso normal 9 pt; logo proporcional más pequeño; identificadores dentro de Curso; fecha explícita de matrícula y pie técnico con emisión Lima/página. No se copian resoluciones/leyendas del logo antiguo ni fecha/nombre/documento bajo Firma como si se hubiera firmado. No es una copia píxel a píxel ni aceptación visual humana.

CPU: NOT MEASURED. Memory: NOT MEASURED. Hosted: NOT EXECUTED. Data API hospedada/PostgREST 14 no probados directamente; forced-colors real H5 NO VERIFICADO; bundle >500 kB (678,31 kB); limpieza física de PDFs manual y residual operativo. Métricas de tiempo previas siguen siendo históricas, no mediciones de esta plantilla.

**Gate 2 H5 PENDIENTE. GATE-A01 PENDIENTE / suficiencia hospedada inconclusa.** Bloque 1 requiere nueva decisión humana. Sin acceptance, PR, merge/main ni H6.
