# H5 — Registro de construcción

## CHG-H5-001 — corrección humana aprobada posterior a Gate 1

Base `a303b679877aa4a9bcebcfb0c3564382edddeb15` (CI `43337996757` SUCCESS). [Enmienda aprobada](approved-institutional-note-amendment.md): FOTO eliminada, Nota literal incorporada, Libro/Folio/Registro vacíos, dos índices y Firma; normal 1 página A4 a 9 pt mínimo, extenso 5 páginas/100 contactos. Solo renderer, tests afectados y evidencia documental. **415/415 pruebas locales PASSED**, lint/typecheck/Deno check/build/build-safety PASSED; Candidato técnico posterior exacto **`2196348fec188880c8853d1cb80fac3b229eeea4`**; CI [43346943904](https://github.com/fcamasca/perumar-supabase/actions/runs/43346943904) **COMPLETED / SUCCESS**, **415/415 PASSED**. Lint/typecheck/Deno check/build/build-safety, H1–H4, rollback/concurrencia (70 + 60 sobre saldo 100, sin retry), Edge/Storage reales, expiración y reconstrucción con repetición de suites PASSED. `git diff --check` PASSED. No cambió el inventario ni hubo migraciones/datos humanos modificados. Esta consolidación solo modifica documentación; el candidato técnico permanece intacto.

Bloque 1 humano continúa NO OK / pendiente de nueva revisión; no se declara aceptación visual. Gate 1 y los cuatro documentos aprobados no cambian. Los apartados siguientes conservan historia anterior (incluidas referencias entonces válidas a FOTO/ausencia de Nota), sustituida únicamente en presentación por CHG-H5-001. Gate 2/GATE-A01 pendientes, hosted inconcluso; sin acceptance/PR/merge/H6. Residuales preservados en la enmienda.

## Revisión humana posterior al candidato documental

Bloque 1 reportado **NO OK** sobre `8c0bfb355c9162aebcee3fab2d368a40aaf5cc0f` por desviación visual respecto a la ficha institucional. Se aplica corrección limitada al renderer y al recurso de marca proporcionado por el usuario; [hallazgo, adaptación y evidencia](human-review-layout.md). Las 406 pruebas anteriores se conservan y se agregan siete (413/413 locales). Ningún cambio a decisiones aprobadas, seguridad, procedencia, contratos Edge/RPC, migraciones, límites, auditoría o retención. Nueva aceptación visual humana pendiente; no Gate 2/GATE-A01/acceptance/merge/H6.

Corrección de código/pruebas `ded34ebafb1d77933f467147aeda8ee06f06a964`: CI [43336489960](https://github.com/fcamasca/perumar-supabase/actions/runs/43336489960) COMPLETED / SUCCESS, **413/413**. La evidencia independiente confirmó normal 1 página y extenso 5; se repitieron integración, seguridad, H4, fallos y QA tras reconstrucción desechable. Esta consolidación posterior solo modifica evidencia documental. El Bloque 1 no se convierte automáticamente en OK humano.

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

## Consolidación técnica

El módulo reutilizable del spike incluía flujo básico de texto/paginación; se refinó tras la evidencia Edge con cortes por palabra, encabezado unido a primera fila y QA extensa. Storage/UI se incorporaron después de la prueba Edge real. No se añadieron campos de negocio ni arquitectura alternativa.

406 pruebas locales PASSED; tsc, lint, build, build-safety, Deno 2.1.4 check y lockfile congelado. El inventario efectivo coincide con el máximo justificado. CI integral `43303520498` sobre `62d399980e8062b3d5ab05a89c151a532669521a` terminó SUCCESS, incluida expiración JWT H5 y reconstrucción desechable. Candidato técnico de código/pruebas/lock: `35d4b17a9fa63c011c5de9d44a72a78215b60980`, CI [43304950382](https://github.com/fcamasca/perumar-supabase/actions/runs/43304950382) **COMPLETED / SUCCESS**, incluidas las dos pasadas reales de fallo/compensación/timeout y reconstrucción completa. Esta consolidación posterior modifica solo documentación; no se reabre el Spec ni se aprueba Gate 2/GATE-A01.

El fallo inicial de CI fue un fixture que intentaba UPDATE general de auditoría mediante service_role. Se preservaron grants restrictivos y se acotó la inyección a SQL estático sobre el evento sintético de CI. Posteriormente se añadieron fallos reales de MIME en Storage, auditoría tras upload y Storage pausado para probar el deadline, además de casos unitarios de compensación fallida. Ningún comando de caos ni suite API con fixtures persistidos se ejecutó sobre la base humana.

Revisión de dependencias: pdf-lib y standard-fonts MIT; npm audit no reportó avisos para los cinco paquetes añadidos por pdf-lib. Se conservaron diez avisos moderados de la cadena de herramientas ESLint/minimatch preexistente; no se ejecutó audit fix ni se actualizaron dependencias fuera de alcance.

## Operación temporal

`npm run pdf:cleanup -- [offset]` usa solo Storage API sobre PDFs derivados locales con más de 24 h desde creación de objeto. Máximo 20 carpetas × 100 objetos por invocación. Tras eliminar, reiniciar offset 0; sin eliminaciones, continuar el offset reportado. Cubre también huérfanos sin auditoría. La descarga expira por el manifiesto a las 24 h aunque aún no se haya realizado esta limpieza conservadora. No cron/colas ni SQL DELETE de storage.objects. Despliegue y operación hospedada no ejecutados ni supuestos.
