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
