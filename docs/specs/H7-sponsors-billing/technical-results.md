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
