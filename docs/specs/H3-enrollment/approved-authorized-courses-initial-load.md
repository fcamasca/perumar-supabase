# CHG-H3-010 — Carga inicial de cursos autorizados de PERÚ MAR

Autorización humana: 04/11/2026, cargar los cursos autorizados y sus respectivas asignaturas. Complementa CHG-H3-008 y CHG-H3-009. Gate 2 pendiente; los cuatro documentos aprobados en Gate 1 permanecen intactos.

## Datos y fuentes oficiales

La [RD 072-26 MGP/DICAPI, 05/02/2026, artículo 1](https://www.dicapi.mil.pe/storage/regulatory-framework/00b0694b-1b80-4847-9a77-8e33e8920b54.pdf) autoriza seis cursos en Pisco. Su vigencia es de dos años desde la expedición, según artículo 5.

| Curso | Nombre | Asignaturas | Malla |
| --- | --- | ---: | --- |
| MAM-009 | Marinero de Pesca Calificado | 10 | RD 1052-2024, anexo A p.7 |
| MAM-010 | Marinero de Pesca Artesanal | 7 | RD 1052-2024, anexo A p.8 |
| MAM-037 | Patrón de Bahía | 9 | RD 1052-2024, anexo A p.18 |
| MAM-038 | Marinero de Bahía | 5 | RD 1052-2024, anexo A p.18 |
| MAM-039 | Marinero de Artefacto Naval | 5 | RD 1052-2024, anexo A p.19 |
| MAM-048 | Patrón de Yate / Velero | 8 | RD 855-2021, anexo, tercera categoría |

Fuentes de malla: [RD 1052-2024 del 27/12/2024](https://www.dicapi.mil.pe/storage/regulatory-framework/Zm1HLYB41736522114.pdf), páginas PDF 15, 16, 26 y 27; y [RD 855-2021 del 15/12/2021, publicada en El Peruano el 21/12/2021](https://busquedas.elperuano.pe/dispositivo/NL/2023424-1). MAM-048 no forma parte de la malla 1052-2024 y conserva su propia resolución, fecha y URL.

Se cargan 31 asignaturas distintas y 44 asociaciones en base vacía. Los títulos iguales reutilizan una asignatura; títulos distintos se conservan separados. Son unidades principales, no subtemas ni un programa detallado. Normalización ortográfica de mayúsculas/tildes; no se cargan horas. La malla llama a MAM-039 Marinero de Artefacto Naval o Plataforma Marítima; el Curso conserva el nombre de su autorización. RD 855-2021 tiene una inconsistencia editorial: el encabezado de desarrollo de Patrón repite MAM 047, pero el cuadro general y la autorización lo identifican como MAM-048. Se usa este último código; no se modifica el documento fuente.

Transcripción completa y procedencia por curso: `supabase/reference/dicapi-authorized-curricula.json`. La referencia anterior de pesca queda conservada.

## Aplicación y conservación

Migración incremental `20261104040000_initial_authorized_dicapi_courses.sql`: añade los cuatro cursos restantes. Los dos cursos de pesca y su carga anterior no se reescriben. El archivo se ejecuta también al final del seed configurado para bases nuevas, después de catálogos y cargas previas.

Reutiliza `carrera`, `materia`, `carrera_materia` y modalidad del catálogo existente. Nuevos cursos activos, modalidad Presencial, sin experiencia, siglas MAM037/MAM038/MAM039/MAM048 y código técnico legado nulo. Guarda código DICAPI, resolución/fecha de malla, URL y autorización PERÚ MAR. No crea tablas, columnas, RPC, helpers, policies ni mantenimiento adicional.

La carga es atómica y repetible: rellena datos faltantes, conserva metadata no vacía y asignaturas inactivas, y rechaza cursos ambiguos o códigos incompatibles. No elimina registros, no reactiva, no sincroniza ciclos existentes ni altera matrículas/snapshots/cargos. Suprime únicamente los triggers de auditoría de estas tres tablas dentro de la misma transacción de datos de referencia y los restaura; no genera auditoría funcional ficticia. Un error revierte también esos cambios de triggers.

No se ejecuta reset ni se modifica un proyecto remoto. Esta entrega aplica incrementalmente en Supabase local. La carga en otros entornos se realiza mediante las migraciones del proyecto.
