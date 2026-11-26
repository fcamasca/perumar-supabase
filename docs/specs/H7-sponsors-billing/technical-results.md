# H7 — Evidencia del núcleo DB

Registro local: 2026-11-23. Spec aprobado `08d8a7a6e3279ff8f36344247de4c270b44f19f0`; base main histórica `fd230a7f36716129033f4c9b5a287f78647de111`. Rama `feature/h7-sponsors-billing-core`, solo TASK-H7-002..005. **H7 NO CERRADO / Gate 2 NO INICIADO**.

## Resultados ejecutados

| Comando | Resultado real |
| --- | --- |
| `npm run lint` | PASSED tras cambios finales de scripts/inventario. |
| `npm run typecheck` | PASSED. |
| `npm test` | 41 archivos, **632/632 PASSED**. No se suman asserts de scripts como casos Vitest. |
| `npm run build` | PASSED; bundle principal 755.00 kB, advertencia >500 kB preservada. |
| `npm run test:build-safety` | PASSED: rechazo de configuración privilegiada antes de artefactos. |
| `npm run test:billing:core` | **186 comprobaciones PASSED**, más regresiones SQL H4 incluidas. Reconstruye todas las migraciones de aplicación y seed desde cero; PostgREST real desechable/JWT ordinarios; base aleatoria sin copiar filas humanas. |
| `npm run test:payments:isolated` | PASSED: regresión H3/H4, pagos parciales, estados, snapshot/cierre y carreras existentes. 70+60/100 y deadlock real conservan 40001/40P01 sin traducción ni retry. |
| `git diff --check` | PASSED. |

Node local24.22.1; npm10.9.0; el proyecto/CI conserva Node24.19.0 fijado. No instalación de nuevas dependencias. Las ejecuciones de CI corresponden al SHA publicado, no se hereda SUCCESS del Spec ni de hitos anteriores; referencia exacta en la entrega del candidato.

## Casos observados

- OS manual18,450 aceptada independientemente de cargos H4; UUIDs repetidos/vacíos e importes inválidos rechazados. Trim/mayúsculas y ceros preservados. Unicidad OS por empresa y factura global, sin liberar anulados.
- OS10,000+5,000 → factura4,500: sin confirmación rechazada, confirmación explícita aceptada. Factura n:m y OS reutilizable, sin distribución ni techo acumulado.
- Workflow adyacente, pagos solo PENDIENTE_DESEMBOLSO, banco/fecha, parciales/completo/multi-factura; estado financiero derivado hasta DESEMBOLSADA; fecha futura/anterior a emisión e importe excesivo rechazados.
- Barrera de lock: dos transacciones SERIALIZABLE efectivamente esperando; **70+60 sobre pendiente100 confirma exactamente una**, pendiente final30 en la última ejecución, perdedora40001 nativo, sin retry. También dos HTTP concurrentes sin sobrepago. Carrera de misma clave genera un solo pago, recuperable explícitamente.
- Fallo inyectado en última aplicación revierte pago/aplicaciones/eventos de éxito. Anulación de pago conserva aplicaciones y libera pendiente; factura/OS no se anulan hasta regularizar dependientes. Sin cascadas ni DELETE físico.
- RPC real PostgREST: versión OS y versión factura obsoletas → **PT409/HTTP409**, sin mutación/auditoría de éxito. Idempotencia canónica conserva resultado aun anulado; contenido cambiado genera conflicto.
- Director/Coordinador positivos; Director exclusivo para anular; Admin solo, anónimo, usuario inactivo, rol desactivado y JWT expirado negativos. Siete RPC verificadas con JWT ordinario, whitelist y DML directo negado. Tabla técnica no revela keys a authenticated.
- H4 nuevo patrocinado rechazado servidor; histórico se recupera por misma clave tras patrocinio, mantiene consulta/anulación y no se convierte en H7. Carrera H3 asignar↔H4 pagar con barrera académica: una decisión confirma y la otra conflicto, sin pagos posteriores a asignación. H3 no incorpora locks comerciales.
- Cobertura OS permanece idéntica tras cambio empresa, traslado de Ciclo y anulación matrícula. Auditoría H7 no copia PII/banco/payload. Base humana no fue reseteada, migrada ni escrita por la suite aislada.

## Inventario del cambio

Migraciones aditivas:

1. `20261123010000_h7_billing_model.sql`.
2. `20261123020000_h7_billing_commands.sql`.
3. `20261123030000_h7_private_payment_eligibility.sql`.

Tablas nuevas (7): orden_servicio, orden_servicio_matricula, factura_patrocinador, factura_orden_servicio, pago_patrocinador, pago_patrocinador_aplicacion, orden_servicio_archivo. La última es únicamente técnica/modelo, sin subida/descarga implementada.

RPC nuevas (7): registrar_orden_servicio, anular_orden_servicio, registrar_factura_patrocinador, avanzar_factura_patrocinador, anular_factura_patrocinador, registrar_pago_patrocinador, anular_pago_patrocinador. RPC modificada: registrar_pago H4, solo elegibilidad de nuevos pagos patrocinados; recuperación previa al nuevo rechazo.

Vistas nuevas (2), security_invoker: factura_patrocinador_saldo, orden_servicio_resumen. Aplicaciones/beneficiarios consultables por relaciones autorizadas sin duplicar montos por joins. Para deuda vigente, excluir facturas con anulado_at, manteniendo su saldo aritmético como información histórica.

RLS en7 tablas, seis policies SELECT h7_read; tabla técnica sin policy de lectura ni mutación cliente. SELECT de tablas/vistas para authenticated, ningún DML directo. Siete RPC con autorización DB/SECURITY DEFINER/search_path vacío/EXECUTE mínimo. Helpers privados nuevos (3): guard_h7_history, validate_h7_integrity y audit_h7, no invocables por clientes. Guardas de historia, constraints diferidos por raíces, sellos y auditoría; índices únicos/FKs/empresa-fecha y relaciones inversas.

Inventario global esperado de aplicación tras migrar:43 tablas/vistas,35 funciones públicas,24 helpers privados,86 filas de grants revisadas,32 migraciones. Buckets existentes2, **ningún bucket/Edge H7**. Inventario de seguridad existente ampliado sin relajar sus comprobaciones de autoridad/grants.

## Cobertura y límites

TEST-H7-001..012: ejecutados los subcasos de núcleo descritos arriba mediante DB/API/concurrencia y regresiones existentes. Esto no declara ejecutada la parte React de TEST-H7-011, ni toda combinación futura de estados/UX de cada identificador.

**NO EJECUTADOS**: TEST-H7-013 reportes/CSV, TEST-H7-014 UX, TEST-H7-015 SUNAT, TEST-H7-016 PDF/Storage completo. Solo constraints/RLS del modelo técnico y ausencia de bucket verificadas en este bloque; no hay prueba de bytes. No se atribuye ejecución humana H7.

Residuales preservados: Hosted Edge/PostgREST NO PROBADO DIRECTAMENTE; CPU NOT MEASURED; Memory NOT MEASURED; forced-colors NO VERIFICADO; bundle >500kB; limpieza/conciliación manual y purga H9/release; compatibilidad PDF conservadora y exportación sin snapshot/memoria proporcional al volumen en sus módulos existentes. Ninguno convertido en PASSED. Rendimiento/contención del lock por patrocinador no medidos; no benchmark inferido de la suite.

No UX/CSV/reportes/Storage/Edge/SUNAT H7, aceptación, Gate 2 ni merge. Detenerse para revisión del núcleo.

## 2026-11-23 — TASK-H7-006, candidato UX

Base exacta aprobada para esta fase: núcleo `83140cce4204fb0b8e3e61fab1164088d11f26a5`, CI45287905957 SUCCESS. Rama `feature/h7-sponsors-billing-ui`. La evidencia anterior corresponde al núcleo; los resultados de esta sección corresponden a la continuación UX autorizada, no al cierre completo H7.

| Comprobación | Resultado |
| --- | --- |
| Lint y typecheck | PASSED. |
| `npm test` | **663/663 PASSED**,42 archivos.31 casos nuevos en Billing.test.tsx; sin atribuir ejecución humana. |
| `npm run test:payments:isolated` | PASSED: regresión H3/H4, carreras académicas, cierre/snapshot,40001 y40P01 reales sin retry. Base humana sin reset/escrituras. |
| Núcleo H7 y consultas UI reales | **186 comprobaciones originales PASSED**, sin modificar scripts/núcleo. Además siete consultas de relaciones/casts/paginación con PostgREST/JWT real PASSED. Se usó copia temporal ignorada `.cache/h7-ui-api.mjs` del runner intacto con probes exclusivamente de lectura. |
| Build / build-safety | PASSED; se conserva advertencia de bundle principal >500kB. |
| Diff-check / alcance | PASSED; cero cambios en supabase, SQL, RPC, RLS, dependencias o pruebas DB. Los cuatro documentos del Spec aprobado intactos. |

Casos React: entrada Empresa→Facturación, filtros OS de empresa/Ciclo/ACTIVO, una/varias/todas, monto manual/correlativo con ceros, conflicto con borrador conservado y consulta explícita; factura15000→4500 confirmable, edición preservada y sin reparto; transferencia exacta30.03 multi-factura con banco/fecha/referencia/versiones, una llamada por decisión, respuesta incierta/consulta/reenvío explícito de la misma clave; workflow siguiente solamente, separación de estado operativo/financiero/condición anulada; anulación Director con motivo/foco/Escape y bloqueo dependiente, sin cascada, refresco de saldos; ADMIN denegado/Coordinador sin anular; H4 patrocinada sin nuevo formulario e historial conservado aun sin catálogo operativo; matrícula solo lectura con empresa actual e histórica separadas.

Las consultas reales verificaron OS-resumen→Ciclo, factura-saldo con casts y filtros, pago→aplicaciones→factura, matrícula→Ciclo/Alumno, cobertura histórica→OS→facturas, factura→OS y aplicaciones→factura. No se alteró contrato DB para acomodar frontend; no se debilitaron las186 comprobaciones. Las suites H3/H4/H7 permanecen en la CI existente del SHA publicado, cuya referencia exacta se devuelve en la entrega.

TEST-H7-014: **cobertura técnica parcial**, teclado/foco y DOM; pendiente revisión humana real de recorrido, ancho reducido y temas. TEST-H7-013 reportes/CSV, TEST-H7-015 SUNAT y TEST-H7-016 Storage/PDF completo: **NO EJECUTADOS / NO IMPLEMENTADOS EN ESTA FASE**. Sin screenshots producidos. No declarar pruebas humanas PASSED.

Revisar humanamente: OS y cobertura histórica; diferencia de factura y fechas de etapas; transferencias/reemplazo de saldos, conflicto/recuperación; errores de anulación y permisos; matrícula patrocinada/historia; teclado/ancho reducido/temas. La limitación original de recuperación al perder el borrador tras remontar se corrige en el ajuste focalizado siguiente. No se ofrece “limpiar y volver a cobrar” a ciegas.

Residuales anteriores íntegros: hosted no probado directamente; CPU/memoria no medidas; forced-colors real NO VERIFICADO; bundle >500kB; limpieza/conciliación manual, purga H9/release y demás límites documentados. Ninguno pasa a PASSED por estas pruebas. **Gate 2 H7 pendiente; no acceptance, no merge, sin iniciar TASK-H7-007/008/009.**

## Fix focalizado posterior a 9c8ab2b — recuperación tras remount

Solución mínima equivalente: consulta sin resultado → revisión/reconstrucción humana de los datos originales → confirmación explícita → RPC con la MISMA idempotency_key. Funciona también para referencias antiguas que solo conservaban la clave. No se crea otra clave, no hay reenvío automático y se mantiene la referencia tras errores de un intento anteriormente incierto, incluidos conflictos idempotentes y40001 de reenvío. El servidor aprobado sigue siendo autoridad para recuperar/rechazar contenido y garantizar unicidad.

Validaciones de esta corrección exclusivamente:

- `vitest run tests/Billing.test.tsx tests/EnrollmentPayments.test.tsx tests/PaymentAccess.test.tsx tests/payments.test.ts tests/conflictErrors.test.ts --maxWorkers=1`: **109/109 PASSED**, cinco archivos. Tres nuevos casos integrados, Billing pasa de31 a34. No se atribuye ejecución a toda la suite del repositorio.
- Una primera pasada paralela registró un fallo de foco en un caso preexistente de tabs; se repitieron los mismos cinco archivos con un worker. No se cambió ese caso ni se relajaron aserciones.
- Lint, typecheck, build y diff-check: PASSED. Advertencia de bundle >500kB preservada (principal792.23kB).
- SQL/RPC/RLS, migraciones y tests DB: sin cambios. **No se ejecutaron de nuevo las186 comprobaciones DB ni la regresión completa H1–H6.**

El commit utiliza `[skip ci]` para impedir que el workflow de push dispare las suites DB excluidas por instrucción humana. No se atribuye CI completa SUCCESS a este fix; los resultados son los chequeos focalizados locales anteriores. Sin pruebas humanas/capturas ni Gate 2; demás residuales permanecen.

## Enmienda MVP — empresa patrocinadora única por Ciclo

Base `a0c4abfe88f21879672f491bf96f9347f21685af`. Regla humana nueva trazada en implementation-log; los resultados anteriores no se atribuyen automáticamente al nuevo contrato.

Validación focalizada DB: `node scripts/test-cycle-sponsor.mjs` — PASSED. Clona únicamente esquema y referencias locales a una base desechable; crea actores/alumnos/empresas sintéticos y reconstruye solo las cinco definiciones previas afectadas para probar la actualización. No copia alumnos humanos ni resetea el stack; no reconstruye ni ejecuta toda la suite H1–H6. Pruebas SQL de RPC/guards con actor funcional sintético; no equivale a una ejecución hospedada/JWT completa.

Cobertura: guardar Ciclo con/sin empresa; nueva matrícula heredada y NULL; traslado con cambio/retirada de empresa; cambio y retirada en Ciclo sincronizan; input legado contradictorio no es autoridad; guard rechaza contradicción; pago H4 nuevo bloqueado con patrocinador y permitido sin él; recuperación de pago histórico intacta; OS solo admite empresa del Ciclo y conserva historia tras cambiar patrocinio. Añade sincronización de referencia en matrícula anulada sin alterar historia, rollback completo de Ciclo/matrículas/auditoría por fallo de sincronización y rechazo atómico del backfill ambiguo. Los problemas iniciales del arnés aislado se corrigieron antes de la pasada final satisfactoria.

El backfill y el nuevo contrato se probaron en base desechable. Preflight local: ninguna ambigüedad multiempresa; un Ciclo con empresa y dos matrículas activas NULL que se normalizarán cuando se aplique la migración. No se modificaron los datos del entorno habitual.

Los fixtures de preparación de patrocinio del runner core H7 y de SQL H4/H5 se actualizan al nuevo mando por Ciclo para una futura ejecución integral. No se ejecutaron las 186 comprobaciones core, carreras 70+60, suites PDF/Expediente ni regresión completa H1–H6. No se les atribuye PASSED en este checkpoint.

CI completa diferida por instrucción humana; publicación `[skip ci]`. Build no repetido: sin dependencias nuevas, cambios de imports ni assets; validación frontend por tests afectados y typecheck. Residuales previos permanecen: hosted Edge/PostgREST no probado directamente; CPU/memoria no medidas; forced-colors real NO VERIFICADO; bundle >500kB; limpieza/conciliación manual y purga H9/release. Gate 2 H7 PENDIENTE, sin acceptance/merge, PDF OS, reportes o SUNAT.

Validaciones frontend del checkpoint:

- `vitest run tests/AcademicPages.test.tsx tests/EnrollmentPages.test.tsx tests/Billing.test.tsx --maxWorkers=1`: **180/180 PASSED**, tres archivos directamente afectados. Incluye guardado de empresa/NULL en Ciclo, fallo de carga del selector sin guardar un NULL silencioso, patrocinio heredado de solo lectura y filtro de Ciclos de OS.
- `npm run lint`: PASSED.
- `npm run typecheck`: PASSED.
- `node --check scripts/test-cycle-sponsor.mjs` y `node --check scripts/test-billing-core.mjs`: PASSED; el último es solo sintaxis, no ejecución de sus comprobaciones DB.
- `git diff --check`: PASSED.

## 2026-11-24 — OS del Ciclo completo / saldo por cubrir

- `node scripts/test-cycle-order.mjs`: PASSED. Base desechable, solo esquema/referencias y fixtures sintéticos. Comprueba total/cobertura/saldo, 30% de cobertura, límite de nueva OS y rollback de rechazo, roster automático, rechazo de selección cliente, empresa correspondiente, correlativo de 10 dígitos y equivalencia de referencias antiguas, saldo cero, liberación al anular, cobertura de OS de patrocinador anterior, conservación de historia y no ampliación automática del roster histórico. Comprueba que los pagos H4 no se mezclan con cobertura y que la vista usa security_invoker. No es una ejecución hospedada ni una validación integral JWT/RLS.
- `vitest run tests/Billing.test.tsx --maxWorkers=1`: **37/37 PASSED**. Incluye filtro empresa/saldo, detalles de Ciclo, ausencia de búsqueda/checks, subtotal referencial, contexto sin selección cliente, protección de doble envío, exceso de monto, conflicto sin retry, estado vacío y segunda página referencial.
- Migración `20261123050000_h7_cycle_order_coverage.sql` aplicada al entorno local. No se borraron datos de prueba.
- Revisión visual automatizada NO EJECUTADA: ambos mecanismos disponibles devolvieron fallo de inicialización «failed to write kernel assets». No se atribuye aprobación visual/humana al formulario.
- No se ejecutaron suite completa, 186 core, concurrencia 70+60, regresión H1–H6 ni suites PDF/Expediente. Fixtures core ajustados sin atribuirles PASSED.

CI completa diferida; commit [skip ci]. Residuales anteriores preservados: hosted Edge/PostgREST no probado directamente, CPU/memoria no medidas, forced-colors NO VERIFICADO, bundle >500kB, limpieza/conciliación manual y purga H9/release. Gate 2 H7 PENDIENTE; sin acceptance/merge.

Comprobaciones de cierre de este checkpoint: lint PASSED; typecheck PASSED (incluido en build); build PASSED, chunk principal 797.17kB (advertencia >500kB preservada); diff-check PASSED. Un primer build detectó una opción inválida de Testing Library en el test nuevo; se corrigió sin modificar lógica productiva y el build posterior pasó. Los 37 tests focalizados ya habían pasado; no se atribuye ejecución a la suite completa.

## 2026-11-25 — PDF privado/versionado de OS (checkpoint intermedio)

Base `b770cadb9baed2be96e41222471eacbc95e0a6a2`. Contrato acotado: os-pdf.md. Resultados anteriores no se atribuyen automáticamente a este bloque.

- `node scripts/test-order-files.mjs`: PASSED. Una sola base Docker desechable, esquema/ACL y referencias, fixtures sintéticos; eliminada al terminar. Reserva/carga de metadatos/confirmación/replay consistente, replay inconsistente, iniciador y OS cruzada, límites, guard inmutable, sustitución con base, aborto sin perder anterior, historia tras anular y anulación entre reserva y confirmación. Prueba RLS real con SET ROLE authenticated para Director y ADMIN solo, grants por columna, ausencia de DML directo/service-only RPC. No copia datos humanos ni modifica la base habitual durante pruebas.
- `vitest run tests/OrderFileOperations.test.ts tests/OrderFileHttp.test.ts tests/OrderDocuments.test.tsx tests/Billing.test.tsx --maxWorkers=1`: **73/73 PASSED**, cuatro archivos directamente afectados. Bytes PDF válidos; MIME inválido, >5 MiB, estructura inválida, >20 páginas y contenido activo; no reserva/Storage al fallar validación; preservación anterior ante fallo y confirmación con respuesta perdida; integridad de bytes/hash; roles actuales, sesión, recurso, CORS, campos forjados; denegación antes de cliente privilegiado; reautorización tras I/O; carga multipart acotada; UI carga única, errores, consulta explícita, visor e historial con OS anulada.
- Los tests HTTP/operaciones usan clientes Auth/Storage/RPC simulados y bytes PDF reales. NO equivalen a una carga/descarga de punta a punta en Edge Runtime + Auth + Storage real. La prueba DB verifica protocolo, metadatos y permisos reales de PostgreSQL; no entrega bytes Storage ni sustituye la prueba humana del visor. Ese recorrido real queda pendiente de revisión humana; no se marca PASSED ni hosted.
- `eslint .`: PASSED. `tsc --noEmit`: PASSED. Deno 2.1.4 check de ambas entradas nuevas con --node-modules-dir=none --frozen y configuración/lockfile heredados de H6: PASSED. `git diff --check` y revisión staged: PASSED.
- Migración `20261125040000_h7_order_private_files.sql` aplicada en local habitual después de validar SQL aislado. Sin reset ni modificaciones financieras/OS/facturas/pagos existentes.

No se ejecutaron CI completa, suite H1–H7, 186 core, regresión financiera/Expediente H6 ni carreras masivas ajenas. Revisión funcional humana anterior reportada satisfactoria por el usuario; revisión humana de PDF OS nuevo PENDIENTE. Build no repetido (sin nuevas dependencias); no se atribuye medida nueva de bundle.

Residuales preservados: Hosted Edge/PostgREST no probado directamente; CPU/memoria NO MEDIDAS; forced-colors NO VERIFICADO; bundle >500kB; compatibilidad PDF conservadora (no antivirus/CDR); conciliación/limpieza manual de archivos nunca confirmados y purga documental diferida a H9/release. Reserva incierta/expirada no se limpia automáticamente. Logs sin PII/secreto; no URL de Storage al navegador. Gate 2 H7 PENDIENTE; no acceptance, reportes/CSV/RUC/SUNAT ni merge. Publicación [skip ci].

### Ajuste de compresión PDF — 25/11/2026

Decisión humana posterior: suavizar compatibilidad de PDFs habituales. El archivo original local (no incorporado a Git) pasó validateFile con 468469 bytes, una página y sin modificar sus bytes. Se añadió preflight acotado ObjStm/XRef antes de la expansión interna del parser; filtros/contadores/presupuestos cerrados. Los controles de contenido activo, cifrado, páginas/tamaño e integridad continúan.

Validación focalizada: OrderFileOperations + OrderFileHttp **25/25 PASSED**; prueba específica "parses safe PDF" de ExpedienteFiles **1 PASSED, 35 omitidas intencionalmente** (no regresión completa H6). Incluye estructura comprimida normal y rechazo de exceso de expansión, contador de objetos/referencias y acción activa comprimida. Tipos frontend/Edge, lint de archivos afectados y diff-check verificados. Sin SQL/migraciones nuevas, CI completa ni nueva prueba humana. Se mantienen los residuales anteriores.

Segundo ajuste focalizado: PDF de tres páginas y 239079 bytes aportado por el usuario; rechazo reproducido por acción URI HTTPS. Original ahora aceptado sin transformación. OrderFileOperations/OrderFileHttp/OrderDocuments: **36/36 PASSED**; casos http/https/mailto permitidos, javascript/file/data y credenciales en URL rechazados. Tipos frontend y Edge comprobados. Lint corregido para expresar el bloqueo de controles mediante códigos de carácter. Sin migraciones/DB/regresión completa ni subida de documentos personales.

## 2026-11-25 — TASK-H7-008 OpenRUC (etapa inicial, anterior al modelo híbrido)

- Revisión de condiciones/contrato público y autorización humana trazadas en openruc.md. HTTP GET real aislado al RUC público20100047218:200/application-json, source SUNAT/as_of2026-11-25, ocho campos presentes; _more observado y no consumido. Sin API key ni cuenta. No se infieren SLA, cuotas o acreditación SUNAT.
- vitest run tests/RucEdge.test.ts tests/CompanyRucLookup.test.tsx tests/EnrollmentPages.test.tsx --maxWorkers=1: **93/93 PASSED**. Entrada cerrada/RUC/verificador/prefijo, JWT/roles/perfil activo, reautorización, límites/JSON/esquema/fecha/RUC coincidente, redirect:error y origen fijo, 404/429/5xx/5s sin retry; proyección excluye _more. UI autocompleta nombre editable, conserva contactos y escritura manual, no persiste referencias ni llama RPC al consultar; mantiene texto editado durante espera y descarta resultado con RUC cambiado; doble consulta bloqueada; ADMIN sin acción.
- SDK/Auth y upstream en tests son simulados. La consulta real directa al proveedor se reporta por separado. No se afirma PASSED para Auth/Edge hospedado ni recorrido humano real. No se ejecuta suite financiera/DB completa, H1–H7 ni CI integral.
- Lint de componentes/Edge/tests afectados y tsc --noEmit PASSED. Deno2.1.4 check --frozen de consultar-ruc con lockfile existente PASSED. Diff-check PASSED.
- Sin nuevas migraciones/columnas/tablas, nuevas dependencias, credenciales proveedor, cambios financieros ni documento de arquitectura. No hay migración pendiente para este bloque; reiniciar runtime local para reconocer la entrada nueva.

Revisión humana de OpenRUC PENDIENTE. Se mantienen hosted Edge/PostgREST no probados directamente, CPU/memoria no medidas, forced-colors NO VERIFICADO, bundle >500kB, compatibilidad PDF/conciliación manual/purga H9 y demás residuales anteriores. OpenRUC añade disponibilidad/condiciones/cuotas no garantizadas y antigüedad de padrón visible; no son PASSED. Gate2 H7 PENDIENTE, sin acceptance/cierre/merge.

## 2026-11-25 — TASK-H7-008 ampliado: datos tributarios híbridos

La autorización humana posterior amplía la etapa inicial efímera: ahora se conservan domicilio_fiscal operativo y datos_tributarios JSONB opcionales en empresa_patrocinadora. Los resultados anteriores sin SQL describen la etapa inicial, no el estado actual. Spec/contrato en openruc.md y migración 20261125050000_h7_company_tax_reference.sql.

Resultados ejecutados:

- `node scripts/test-company-tax.mjs`: **52/52 comprobaciones PASSED** en base PostgreSQL temporal aislada; reconstrucción de migraciones, empresa creada antes de la nueva migración queda compatible con NULL, RPC bajo rol authenticated Director/Coordinador, persistencia de referencia original independiente de nombre/domicilio operativos, clientes anteriores omitiendo campos, rechazo de claves extra/_more/RUC distinto/tipos/fechas/tamaños inválidos, control de versión, ADMIN denegado y sin filas por RLS, DML directo rechazado, auditoría sin valores y cambio de RUC invalida referencia. Solo esquema de plataforma copiado; sin datos humanos; base temporal eliminada al finalizar. No equivale a prueba de PostgREST hospedado ni regresión financiera completa.
- `vitest run tests/CompanyRucLookup.test.tsx tests/RucEdge.test.ts tests/EnrollmentPages.test.tsx --maxWorkers=1`: **104/104 PASSED**. Incluye recuperación de referencia guardada en consulta/edición sin red externa automática; persistencia solo Guardar, correcciones manuales conservan JSONB original, fallo explícito conserva referencia previa, cambio RUC invalida, cancelar restaura, edición durante I/O protegida, metadatos de proveedor/hora y lista cerrada, controles Edge previos y regresión de matrícula/empresas. SDK/Auth/upstream simulados, sin nueva consulta real ni afirmación E2E hospedada.
- Lint de archivos afectados y script DB, `tsc --noEmit`, `vite build` y Deno2.1.4 `check --frozen` de consultar-ruc: **PASSED**. El primer intento Deno en sandbox no pudo resolver el registro; se repitió con acceso autorizado y lockfile congelado, sin cambiar dependencias. Build conserva warning >500 kB (chunk principal ~825.42 kB), residual vigente.
- Diff-check y coherencia de REQ-H7-014 / DES-H7-008 / TASK-H7-008 / TEST-H7-015 revisados. La primera ejecución detectó una referencia React retirada y el validador genérico escalar del RPC rechazando JSONB; se corrigieron y las ejecuciones finales anteriores pasaron. No se cuenta ningún fallo inicial como PASSED.

Operación local: la migración **aún no se aplica al entorno habitual**, solo al aislado de pruebas. Antes de probar: `node node_modules/supabase/dist/supabase.js migration up --local --network-id perumar-h0-local`; reiniciar `functions serve --network-id perumar-h0-local` para el retorno con proveedor/consultado_at, y recargar Vite. No requiere credenciales OpenRUC nuevas ni reset/borrado de empresas.

Pendientes humanos específicos:

1. Nueva empresa: consulta real, indicador de espera, razón social/domicilio editables y referencia compacta; modificar ambos, Guardar y volver a abrir tras recargar para confirmar separación operativo/original.
2. Empresa anterior y registro totalmente manual sin consultar: guardar con referencia nula; consulta/edición posterior sin llamada externa automática.
3. Empresa con referencia: nueva consulta explícita exitosa reemplaza solo al guardar; consulta fallida mantiene datos previos; cancelar descarta cambios; cambiar RUC elimina referencia anterior.
4. Recorrido real Auth + Edge + RPC local con Director/Coordinador y revisión de foco, ancho reducido y preferencias visuales. No se marca nueva validación humana ni forced-colors por pruebas simuladas.

Sin nuevas tablas, índices JSONB, historial, cambios de facturación, dependencias o documento de arquitectura. Ajustes PDF locales preexistentes preservados. Sin commit/push, CI integral, cierre, acceptance ni merge H7. Gate 2 sigue PENDIENTE. Residuales heredados (Hosted Edge/PostgREST, CPU/memoria, forced-colors, bundle, compatibilidad PDF/limpieza/conciliación/purga) y disponibilidad/antigüedad/condiciones de OpenRUC preservados sin convertirlos en PASSED.

### Ajuste UX y publicación autorizada

Datos tributarios al final del formulario en details/summary nativo, cerrado por defecto; consulta en curso y errores fuera del contenido colapsado. Regresión final CompanyRucLookup + EnrollmentPages: **74/74 PASSED**; lint, tsc y diff-check correctos. Persistencia/seguridad sin nuevos cambios por este ajuste UX. El usuario autoriza commit y push de los cambios pendientes en feature/h7-sponsors-billing-ui; se excluye arquitectura untracked y archivos personales/output. No se autoriza cierre H7 ni merge. Los resultados previos de DB/Edge/PDF conservan su alcance y no se presentan como una regresión integral nueva.


## TASK-H7-007 — resultado técnico final, 25/11/2026

- `vitest run --maxWorkers=1`: **825/825 PASSED, 50 archivos**. Incluye regresión existente y 25 nuevos casos focalizados de reportes; `BillingReports.test.tsx` + `Billing.test.tsx`: 74/74. Se conservan sin editar las pruebas/producto de DNI H3. No se suman comprobaciones SQL como casos Vitest.
- `node scripts/test-billing-reports.mjs`: **41/41 PASSED**, reconstrucción de todas las migraciones + seed en base desechable. PostgREST local real/JWT ordinarios, Director/Coordinador, ADMIN solo/anónimo/inactivo denegados; sin grants DML y vista no actualizable, security_invoker. Una factura con dos OS no multiplica 50.00/abonado15.00/pendiente35.00; pago15.00 conserva una aplicación pese a dos OS; beneficiario deduplicado, alumno en dos Ciclos=una persona/dos matrículas; cambios de nombre/patrocinador no alteran identidad inicial/pertenencia histórica. 501 documentos reales, páginas500+1 sin duplicados, filtros servidor por estado/fecha/Ciclo/empresa. Sin filas humanas ni reset del stack.
- Exportador probado con 501 filas y totales exactos en centavos, scope/tipo, count cambiante, ID repetido, error de página, rechazo final de acceso, cancelación/unmount y ningún archivo parcial. Fórmulas tras blancos/control, BOM/ñ/tildes/comillas/saltos preservados/neutralizados; saldos y aplicaciones inconsistentes rechazados.
- ESLint completo, TypeScript, sintaxis runner, build y git diff --check: PASSED. Bundle >500 kB permanece como advertencia. No dependencias nuevas.
- Migración `20261125060000_h7_read_reports.sql` aplicada incrementalmente en local, solo vista/revoke/grant/comment; no tablas, RPC, cambios de estado o escritura de datos de negocio. Pruebas de casos financieros aquí verifican consultas, no sustituyen la batería core186 de comandos/concurrencia ni una ejecución hospedada.
- Workflow existente incorpora `npm run test:billing:reports` en ambos pases. CI remota del nuevo candidato: NO EJECUTADA en esta entrega local. No se hereda SUCCESS de candidatos anteriores.

Revisión humana TASK-H7-007/Excel PENDIENTE. Hosted Edge/PostgREST no probado directamente; CPU/memoria no medidas; forced-colors real NO VERIFICADO; bundle >500 kB; CSV sin snapshot transaccional y memoria proporcional al volumen; OpenRUC externo/RUC20/fallback manual; limpieza/conciliación manual y purga H9/release y demás residuales preservados. H7 sigue abierto; sin acceptance/Gate 2/merge ni H8.


## Publicación consolidada para revisión — 26/11/2026

Candidato incorpora TASK-H7-007 y los ajustes humanos posteriores: columnas compactas en OS/facturas/pagos, Estado de factura unificado derivado y Ocultar anuladas inicial (con filtros iguales en CSV), numeración OS sin relleno automático (migración0700), tabla de PDF OS con acciones por iconos/tooltips y visor/historial conservados, icono PDF compartido con reportes y acción de ficha, y aviso simple de responsabilidad del patrocinador en matrícula sin consultar documentos comerciales. No cambia la integración DNI de H3 ni sus commits; el documento de arquitectura del usuario no se incorpora.

Validación final del conjunto: 218/218 PASSED en BillingReports, Billing, OrderDocuments, FichaPdfAction, CycleReports y EnrollmentPages; ESLint del proyecto, TypeScript, build y diff-check correctos. Es una regresión focalizada final, no una nueva ejecución de las 825 pruebas históricas del primer bloque. Se preservan la evidencia DB/API/JWT aislada 41/41 de reportes y la prueba SQL focalizada de ciclo/OS que confirmó preservación de 1/0002, duplicado equivalente, roles, historia y cobertura. Migraciones0600/0700 aplicadas incrementalmente en desarrollo; registros anteriores no reformateados. Bundle >500 kB permanece como advertencia.

Publicación sin skip ci; la CI remota del commit debe evaluarse por su propio SHA y no se declara SUCCESS anticipado. H7 permanece abierto, revisión humana de reportes y Excel pendiente; sin Gate2/acceptance, PR/merge ni H8. Los residuales de hosted, CPU, memoria, forced-colors, exportación sin snapshot y memoria proporcional, dependencia OpenRUC/RUC20 y conciliación/limpieza manual permanecen.


## Cierre autorizado y validación integral — 26/11/2026

Candidato funcional aprobado humanamente: `44d60b12fa9f932b48e00e4d7720d0a1bb424b89`; Spec Gate1 `08d8a7a6e3279ff8f36344247de4c270b44f19f0`. El usuario autoriza cerrar e integrar H7, DNI H3 y arquitectura con ocho diagramas, sin repetir pruebas humanas, desplegar ni iniciar H8. [Gate2](gate-2.md) y [acceptance/checklist](acceptance.md) sustituyen los pendientes globales de checkpoints anteriores, sin borrar su historia.

Correcciones técnicas de cierre:

- `accf422561593de13d5a25f645d5212b73935ad7`: inventario exacto actualizado a 45 relaciones públicas (35 tablas/10 vistas), 39 funciones públicas, 41 migraciones y tres buckets privados. Conserva RLS, security_invoker, ausencia de DML directo/CREATE/bypass/execute público, propietarios/search_path y restricciones de comandos serializables. Añade contrato de bucket h7-os, cuatro RPC reservadas a service_role y lectura por columnas de metadatos: object_key/hash no accesibles al cliente. Fixture sintético de metadatos sin filas, secretos ni cuerpos de funciones; ocho pruebas negativas impiden exposiciones, junto al caso positivo y las dos guardas de destino.
- Regresión del núcleo financiero ajustada al contrato vigente: una OS por factura no anulada, rechazo de reutilización, fixtures distintos para pagos concurrentes y bucket OS privado. No se cambia SQL/producto para conseguir verde.
- `64ee409afd91d44f3bb5e6e076fa60e20f94ba55`: conserva las 72 referencias académicas activas y exige adicionalmente BANCO / 21 bancos activos; el catálogo total es 13. El runner PDF OS aplica el protocolo solo si no existe en su clon aislado, sin eludir sus pruebas de ACL/RLS/roles/historia.
- Workflow añade el typecheck Deno congelado de OS/RUC/DNI y las baterías existentes de patrocinio, cobertura OS, disponibilidad, datos tributarios y archivos OS en ambos pases. No se elimina ningún control anterior, ni se usa skip ci.

Resultados locales efectivamente ejecutados en esta ejecución:

| Comprobación | Resultado |
| --- | --- |
| Suite Vitest completa, 50 archivos | **839/839 PASSED** |
| Núcleo H7, reconstrucción de todas las migraciones, JWT ordinario/PostgREST, rollback y barreras concurrentes, regresión H4 | **192/192 PASSED** |
| Reportes, 501 documentos/paginación/filtros/RLS/dinero/historia | **41/41 PASSED** |
| Referencia tributaria, compatibilidad/RPC/RLS/auditoría/versiones | **52/52 PASSED** |
| Patrocinio por Ciclo | **PASSED**, 12 escenarios más invariantes/rollback/backfill ambiguo |
| Cobertura OS y roster completo, historia/anulación/roles/numeración | **PASSED** |
| OS facturada: exclusión/rollback/anulación y reutilización/historia/concurrencia | **PASSED** |
| Archivos OS: protocolo/roles/RLS/grants/versiones/fallos/anulación/historia/OS ajena | **PASSED** |
| Inventario real local y tests focalizados | **PASSED**,11/11 pruebas |
| ESLint completo, tsc, Deno congelado OS/RUC/DNI, build y diff-check | **PASSED** |
| Ocho diagramas Mermaid | **8/8 sintaxis válida**, no se atribuye renderizado visual |

Las bases DB adicionales son temporales y aisladas, con esquemas y referencias/sintéticos; no se reseteó ni copió el conjunto humano local. El workflow de GitHub sí reconstruye su propio stack efímero y repite las regresiones H1–H7, incluido Edge/Storage reales H5/H6, expiración, build-safety y reconstrucción final.

Fallos iniciales conservados como evidencia: CI45856759852 del candidato humano falló por inventario antiguo; CI45858934026 pasó 839/839 y la nueva comprobación del inventario, pero falló al esperar 12 catálogos en H2 (13 reales). No se declaran SUCCESS ni se ocultan. La siguiente CI se evalúa por su SHA exacto y es condición de integración. Los fallos locales iniciales de fixture de facturas/protocolo OS se corrigieron y se repitieron satisfactoriamente.

La aprobación humana es global del candidato; OpenRUC con persistencia y consulta DNI tienen confirmación funcional explícita. No se fabrican subresultados humanos ni nuevas pruebas de Excel/forced-colors. DNI se consolida por separado en H3, sin reabrirlo; Eldni concluye no seleccionado.

Riesgos y configuración pendientes en acceptance: hosted no probado, CPU/memoria no medidas, forced-colors NO VERIFICADO, bundle principal 837.77 kB, CSV sin snapshot/memoria proporcional, OpenRUC externo/RUC20, autorización APIsPERU previa a producción, PDF conservador, conciliación/limpieza manual y purga H9/release. Ninguno se convierte en PASSED.
