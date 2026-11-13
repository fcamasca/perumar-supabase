# H5 — Corrección visual durante revisión humana de Gate 2

**Registro histórico de la corrección anterior.** La decisión humana posterior [CHG-H5-001](approved-institutional-note-amendment.md) elimina FOTO e incorpora la Nota literal. Las referencias siguientes a FOTO y ausencia de Nota describen la revisión anterior, no la plantilla vigente. Bloque 1 sigue pendiente de nueva revisión humana.

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

Caso normal sintético de un contacto y sin patrocinador: **1 página A4**, aproximadamente 230.455 bytes. Caso ampliado de **100 contactos, datos personales/dirección/señas largos y patrocinador: 5 páginas**, 244.824 bytes. Ambos se extrajeron con pypdf y se renderizaron con Poppler; se inspeccionaron primera, intermedia y última página, incluido patrocinador y espacios impresos. La prueba independiente `scripts/test-pdf-layout.mjs` confirmó esos mismos escenarios con pdftotext/bbox y render en CI. Poppler pdftotext no está instalado en este Windows; la extracción local usa pypdf y la prueba completa de bbox se ejecutó en CI con poppler-utils. Fuentes de 9 pt o superiores y valores completos, incluida dirección continua de 470 caracteres, confirmados por inspección del PDF y extracción independiente.

Evidencia local: `output/pdf/h5-ficha-normal.pdf`, `output/pdf/h5-ficha-extensa.pdf` y páginas PNG en `.cache/h5-layout-review/`. Evidencia reproducible de CI: `.cache/h5-results/layout-normal.pdf`, `layout-extensive.pdf`, sus PNG y `layout-results.json`, junto al flujo real Edge/Storage existente. Solo datos sintéticos; no copia de PII de referencia.

Código/pruebas de la corrección: `ded34ebafb1d77933f467147aeda8ee06f06a964`. CI [43336489960](https://github.com/fcamasca/perumar-supabase/actions/runs/43336489960) **COMPLETED / SUCCESS**, 413/413 pruebas. Incluye matriz Auth/RLS/Storage, invariantes H1–H4, 70 + 60 sobre saldo 100 sin retry/sobrepago, fallos/compensación/timeout, expiración JWT real, QA de layout y reconstrucción con repetición de suites. Artefacto sintético `13998540421`, ZIP SHA-256 `9d3add929d1d6339020ec7cd861b1fe52dd26236ddff2bec67b412a712e8b532`, retención tres días. Antes y después de reconstruir: normal 1 página, extenso 5, aceptación humana PENDIENTE.

La CI inicial `43336152166` pasó el flujo real Edge/Storage, pero falló una aserción nueva que contaba también la X de EXTENSA (471 en vez de 470). Se corrigió únicamente ese chequeo para comprobar el valor continuo completo sin mezclar etiquetas; ningún límite/control anterior se redujo ni existía pérdida del dato.

Medición del flujo real Edge local del nuevo layout (escenario API de 100 contactos, 243.713 bytes): 20 muestras por pasada. Primera: first invocation 320,78 ms, first warm 234,44 ms, p95 465,40 ms, max 529,65 ms. Tras reconstrucción: first invocation 311,31 ms, first warm 189,58 ms, p95 482,93 ms, max 484,08 ms. **CPU: NOT MEASURED / Memory: NOT MEASURED / Hosted: NOT EXECUTED**. No equivalen a CPU, memoria pico ni cold-start hospedado. Con el caso normal nuevo, el supuesto anterior de 10.000 copias/mes representa unos 2,30 GB de salida y 76,8 MB temporales/día si la limpieza es diaria; no incluye tráfico interno/cuotas compartidas ni constituye factura. La operación de limpieza permanece manual.

## Diferencias y estado humano

Es una **aproximación técnica**, no una copia exacta ni aprobación visual. Se mantienen márgenes de 36 pt/fuente mínima 9 pt y pie con emisión/numeración. La tabla superior explicita Fecha de matrícula; códigos de matrícula/alumno/Ciclo conservan una línea contextual adicional. Señas/email usan filas tabulares de ancho completo. Foto es una adición humana H5 respecto a la referencia; Nota/resoluciones/fecha de firma se omiten expresamente. Los casos extensos usan cabecera compacta de continuación y no se fuerzan a una página.

**El Bloque 1 inicial permanece registrado NO OK. La corrección técnica queda pendiente de nueva revisión/aceptación humana.** Los demás bloques humanos no se dan por ejecutados ni aprobados. Gate 1 y OQ-H5-001…004 permanecen intactos; cuatro documentos del Spec sin cambios.

Gate 2 H5 PENDIENTE. GATE-A01 PENDIENTE; suficiencia hospedada INCONCLUSA. CPU/Memory NOT MEASURED; Hosted NOT EXECUTED; hosted/PostgREST 14 no probados directamente. Forced-colors real H5 NO VERIFICADO. Bundle >500 kB y limpieza manual de PDFs siguen como residuales. El logo incrementa el tamaño del PDF: las cifras/costos anteriores de 20 KiB quedan como evidencia histórica, no como tamaño del nuevo layout. No acceptance, PR, merge, cierre formal ni H6.
