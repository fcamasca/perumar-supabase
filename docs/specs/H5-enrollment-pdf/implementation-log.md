# H5 — Registro de construcción

## Autorización y base (12/11/2026)

Gate 1 aprobado humanamente sobre `9804bb07063590e8917fc86d07995c474b84e718`; [registro](gate-1.md). Rama `feature/h5-enrollment-pdf` creada desde ese SHA; registro documental incorporado mediante cherry-pick `0ce58c3`. Los cuatro documentos del Spec permanecen inalterados. No existe aprobación de Gate 2, cierre, acceptance, merge ni inicio H6.

## Bloque inicial: procedencia y viabilidad

TASK-H5-002/003/004: referencia visual externa al repositorio, sin copiar su PII. Proyección cerrada desde snapshot para datos personales, domicilio, contactos y etiquetas. Edad a `matricula.created_at` en Lima; emisión real en Lima. Curso/Ciclo/promoción/patrocinador vigentes. Código Alumno ausente en snapshot antiguo = Sin dato. Libro/Folio/Registro y espacios de foto/firma/huellas quedan vacíos.

Lectura JWT/RLS con relaciones embebidas existentes; sin nueva vista de lectura, tabla de negocio ni fallback privilegiado. Versionado explícito preserva microsegundos. Función de auditoría no altera `updated_at` ni datos de matrícula.

TASK-H5-005: spike ejecutado en **Supabase Edge Runtime 1.77.4 / Deno 2.1.4**, CLI 2.121.0, con verificación JWT del gateway activa. `pdf-lib@1.17.1`, JavaScript portable, licencia MIT; fuentes estándar PDF Helvetica/Helvetica-Bold (WinAnsi, sin archivo tipográfico externo ni dependencia nativa). Glifos españoles extraídos y renderizados correctamente. Glifos no representables producen 422 explícito. El harness sintético temporal fue retirado; nunca forma parte de la función de producto ni se despliega como bypass.

Primer PDF sintético: HTTP 200, application/pdf, 5.060 bytes, dos páginas A4. Render observado en Edge: 149,15 ms. Este dato es tiempo transcurrido de render, **no CPU**. Render visual independiente con Poppler y extracción con pypdf. No equivale a prueba hospedada ni a dictamen GATE-A01.

El CLI `functions serve` necesitó `--network-id perumar-h0-local` para coincidir con la red aislada H0. No se desactivó JWT ni se cambió firewall. Se habilitó Edge en config. Migración local H5 aplicada con `migration up --local`, sin reset humano.

## Implementación posterior al spike

TASK-H5-006…009: texto medido, tokens continuos y saltos explícitos, fuente mínima 9 pt, márgenes 36 pt, A4, tablas con encabezados repetidos y numeración. Límites cerrados: 100 contactos, 20 páginas, PDF 2 MiB, body 4 KiB; error explícito en vez de truncar. Textos tratados literalmente, sin HTML ni recursos remotos.

TASK-H5-011/012/014/016/013: bucket privado `fichas-matricula`, UUID/UUID.pdf de servidor, sin permisos/policies Storage de cliente. Un único comando concreto `registrar_evento_ficha_pdf`, solo service_role, actor activo académico comprobado en DB, eventos/metadata cerrados. Auditoría mínima sirve como manifiesto técnico del artefacto, leído bajo RLS del usuario. Expiración exacta 24 h y revalidación actual en cada descarga. Generaciones explícitas nuevas, sin overwrite; fallo tras upload compensa vía Storage API. Huérfano por compensación fallida permanece privado y sujeto a limpieza acotada.

TASK-H5-015/010: endpoint único generar/descargar con whitelist de entrada, CORS explícito, errores seguros, no-store, attachment genérico; acción contextual sin edición del documento y sin autoridad financiera/permisos en React. Blob temporal, liberación de URL local, foco en error y busy guard. Sin URLs firmadas de producto ni retries. Un conflicto exige recargar y decidir nuevamente.

TASK-H5-017…020: pruebas adversariales/fallos, matriz Edge/Storage y medición en CI desechable; regresión y resultados se consolidan en [technical-results.md](technical-results.md). No atribuir a casos humanos pruebas no ejecutadas. Suficiencia hospedada/CPU/memoria y veredicto humano GATE-A01 pendientes; sin infraestructura alternativa automática.

## Operación temporal

`npm run pdf:cleanup -- [offset]` usa solo Storage API sobre PDFs derivados locales con más de 24 h desde creación de objeto. Máximo 20 carpetas × 100 objetos por invocación. Tras eliminar, reiniciar offset 0; sin eliminaciones, continuar el offset reportado. Cubre también huérfanos sin auditoría. La descarga expira por el manifiesto a las 24 h aunque aún no se haya realizado esta limpieza conservadora. No cron/colas ni SQL DELETE de storage.objects. Despliegue y operación hospedada no ejecutados ni supuestos.
