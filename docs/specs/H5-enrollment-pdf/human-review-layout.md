# H5 — Corrección visual durante revisión humana de Gate 2

## Hallazgo humano

**Bloque 1 H5: NO OK — defecto de maquetación/identidad institucional.** Reportado sobre candidato `8c0bfb355c9162aebcee3fab2d368a40aaf5cc0f`, CI `43327651731` SUCCESS y 406 pruebas PASSED. El resultado técnico anterior no constituía aceptación visual: la ficha se había convertido en un reporte vertical de dos páginas, alejado del modelo.

Referencia obligatoria revisada visualmente antes de modificar el renderer: `docs/usuario/ficha-perumar.pdf`, SHA-256 `B9B4FB2D6D8CA5F875D4040B3A5C42FA63AD2A4E80FC3D488C6AB2617655FD98`. Es material local suministrado por el usuario, con PII de muestra; no se incorpora su contenido al código, fixtures, artefactos sintéticos ni commit. Tampoco se usa como fondo.

El usuario indicó posteriormente los logos en `docs/usuario/logo`. Se seleccionó `perumar-logo-1254x1254.png`, SHA-256 `FC36296977E9375ADE52893D706D353C06061ACD97977C2420570D455F273008`, por su presentación vertical institucional. Se empaquetó una copia proporcional de 480 × 480 píxeles, sin redibujar, recortar ni cambiar el diseño, dentro de `brand.ts`. Recurso local embebido; ninguna descarga de imagen/fuente en runtime ni dependencia de rasterización en producción. Los originales suministrados y otros documentos personales permanecen fuera del commit.

## Corrección exclusivamente visual

- Logo superior izquierdo y grilla Curso / Libro / Folio / Registro / Fecha de matrícula, seguida por Promoción / Patrocinador. Libro/Folio/Registro continúan visibles y vacíos; Registro no contiene código de matrícula.
- Título central FICHA DE MATRÍCULA y texto autorizado CURSO MODELO DE LA AUTORIDAD MARÍTIMA. Sin resoluciones ni bloque legal/Nota de la muestra.
- Grupos tabulares horizontales de identificación, documentos/edad/sexo/teléfonos, rasgos/instrucción/ocupación, nacimiento, señas y domicilio/email. Apellido paterno/materno separados y geografía desglosada usando los mismos datos históricos ya presentes en el snapshot.
- Una tabla horizontal de contactos de emergencia, conservando todos los del snapshot en su orden original; cabeceras repetidas cuando continúan. Patrocinador actual en tabla horizontal; celdas vacías cuando no existe, sin una sección vertical de Sin dato.
- Espacios impresos vacíos de FOTO, FIRMA, Índice Izquierdo e Índice Derecho. Ninguna captura/almacenamiento biométrico, fecha de firma ni valores inventados.
- Fuente mínima 9 pt, ancho medido, encabezados y filas que crecen. Datos extensos continúan; no encoger ni truncar para forzar una página. Logo/cabecera y pie se conservan en páginas adicionales.

La fecha de cabecera es matrícula (`created_at`, calendario Lima); la emisión real del servidor en Lima queda identificada en el pie. Edad a fecha de matrícula. PII, domicilio, contactos y etiquetas siguen siendo del snapshot; Curso/Ciclo/promoción/patrocinador actuales al emitir. No consulta de Alumno vigente como fallback.

El identificador técnico `h5-1` de auditoría se conserva; el Producer del PDF identifica `institucional-2` para distinguir la revisión visual sin cambiar contratos de auditoría. No se modificaron lectura/autorización/RLS, RPC, migraciones, retención, Storage, CORS, estados, secretos, flujo de descarga, límites 100 contactos / 20 páginas / 2 MiB / 4 KiB ni H4. No backend, HTML-to-PDF, navegador, Jasper, servicio externo, tablas o motor documental adicionales.

## Evidencia de la corrección

Suite local **413/413 PASSED**: las 406 anteriores permanecen, más siete pruebas de estructura institucional. Lint, tsc, Deno check, build y build-safety PASSED. Pruebas nuevas inspeccionan el PDF real: celdas vacías, títulos, agrupaciones, imagen embebida, patrocinador, fuente mínima, márgenes, numeración y conservación completa de textos/contactos. No se rebajan controles de seguridad existentes.

Caso normal sintético de un contacto y sin patrocinador: **1 página A4**, 230.456 bytes en la primera revisión técnica local. Caso de 100 contactos cortos: **5 páginas**, 243.602 bytes. Ambos se extrajeron con pypdf y se renderizaron con Poppler; se inspeccionaron primera, intermedia y última página. La prueba independiente `scripts/test-pdf-layout.mjs` genera además un escenario ampliado de 100 contactos, textos largos y patrocinador para inspección con pdftotext/bbox y render en CI. Poppler pdftotext no está instalado en este Windows; la extracción local usa pypdf y la prueba completa de bbox se ejecuta en CI con poppler-utils.

Evidencia local: `output/pdf/h5-ficha-normal.pdf`, `output/pdf/h5-ficha-extensa.pdf` y páginas PNG en `.cache/h5-layout-review/`. Evidencia reproducible de CI: `.cache/h5-results/layout-normal.pdf`, `layout-extensive.pdf`, sus PNG y `layout-results.json`, junto al flujo real Edge/Storage existente. Solo datos sintéticos; no copia de PII de referencia. La CI del nuevo candidato debe terminar SUCCESS antes de publicar el resultado definitivo.

## Diferencias y estado humano

Es una **aproximación técnica**, no una copia exacta ni aprobación visual. Se mantienen márgenes de 36 pt/fuente mínima 9 pt y pie con emisión/numeración. La tabla superior explicita Fecha de matrícula; códigos de matrícula/alumno/Ciclo conservan una línea contextual adicional. Señas/email usan filas tabulares de ancho completo. Foto es una adición humana H5 respecto a la referencia; Nota/resoluciones/fecha de firma se omiten expresamente. Los casos extensos usan cabecera compacta de continuación y no se fuerzan a una página.

**El Bloque 1 inicial permanece registrado NO OK. La corrección técnica queda pendiente de nueva revisión/aceptación humana.** Los demás bloques humanos no se dan por ejecutados ni aprobados. Gate 1 y OQ-H5-001…004 permanecen intactos; cuatro documentos del Spec sin cambios.

Gate 2 H5 PENDIENTE. GATE-A01 PENDIENTE; suficiencia hospedada INCONCLUSA. CPU/Memory NOT MEASURED; Hosted NOT EXECUTED; hosted/PostgREST 14 no probados directamente. Forced-colors real H5 NO VERIFICADO. Bundle >500 kB y limpieza manual de PDFs siguen como residuales. El logo incrementa el tamaño del PDF: las cifras/costos anteriores de 20 KiB quedan como evidencia histórica, no como tamaño del nuevo layout. No acceptance, PR, merge, cierre formal ni H6.
