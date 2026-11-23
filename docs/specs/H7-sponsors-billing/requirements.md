# H7 — Patrocinadores y facturación: requisitos

**SPEC EN REVISIÓN / Gate 1 PENDIENTE / SIN IMPLEMENTACIÓN**. 2026-11-23.
Base exacta: `fd230a7f36716129033f4c9b5a287f78647de111`.
Rama: `feature/h7-sponsors-billing-spec`. Resolver OQ no autoriza construcción.

## Fuentes y precedencia

[PLAN](../../PLAN_MVP.md), [HU14/HU15](../../requirements/Historias_de_Usuario.md), [H3](../H3-enrollment/design.md), [H4](../H4-payments/design.md), [H6](../H6-expediente/design.md), [H6.1](../H6.1-cycle-reports.md), [evaluación](../../architecture/Informe_Evaluacion_Arquitectonica_PERUMAR.md) y [alternativas](../../architecture/Informe_Alternativas_Arquitectura_PERUMAR.md).
Las instrucciones humanas H7 iniciales y la resolución definitiva OQ001..005 sustituyen propuestas anteriores. No reescribir Specs históricas para simular que estas decisiones ya regían.

## Decisiones humanas congeladas

| ID | Estado y contrato definitivo |
| --- | --- |
| OQ-H7-001 | **RESUELTA**. Patrocinio exclusivo: matrícula con patrocinador no admite nuevos pagos particulares H4. Control servidor/RPC y aviso UI. H4 histórico intacto/consultable, sin migración, conversión ni reasignación al cambiar empresa. Sin aplicaciones H7 a cargos, porcentajes ni deuda conjunta H4+H7. |
| OQ-H7-002 | **RESUELTA**. OS asociadas son el detalle comercial de factura, sin líneas independientes. Suma OS sugerida; monto manual distinto exige advertencia/confirmación explícita y se permite. Sin distribución por OS ni validación acumulada. |
| OQ-H7-003 | **RESUELTA**. Solo PDF OS opcional, privado, validado y con historia de reemplazos. Otros archivos financieros de las historias se excluyen por decisión humana. Patrón técnico mínimo separado de H6. |
| OQ-H7-004 | **RESUELTA**. Solo transferencia bancaria. Pago requiere fecha_efectiva date, banco e importe positivo; referencia_operacion/observación opcionales. Facturas solo PENDIENTE_DESEMBOLSO. Fecha no futura ni anterior a emisión de cualquiera de las aplicadas; created_at independiente. |
| OQ-H7-005 | **RESUELTA**. Serie/correlativo manuales separados. OS única por patrocinador+serie+correlativo; factura única global por serie+correlativo. Anulación no libera combinación. Trim/mayúsculas donde corresponde; sin generación fiscal ni afirmación de serie SUNAT. |

No OQ abiertas. El diseño técnico sigue sujeto a Gate 1 humano sobre SHA exacto.

### Decisión humana Gate 1 — anulación y dependencias

Reglas congeladas y obligatorias, trazadas por REQ-H7-008/011, DES-H7-004, TASK-H7-003/004 y TEST-H7-006/012:

1. Una OS no puede anularse mientras esté asociada a alguna factura no anulada.
2. Una factura no puede anularse mientras tenga aplicaciones vigentes de pagos CONFIRMADOS.
3. No existen anulaciones en cascada.
4. Para corregir esos casos, primero debe regularizarse/anularse el objeto dependiente conforme a sus propias reglas; la operación bloqueada no lo modifica automáticamente.
5. Toda la historia se conserva, sin DELETE físico.

Esta decisión congela estas reglas; no constituye aprobación global del Gate 1 ni autorización de construcción.

## Requisitos observables

| ID | Contrato | Origen |
| --- | --- | --- |
| REQ-H7-001 | Reutilizar empresa_patrocinadora y matricula.empresa_patrocinadora_id. Gestión Patrocinador → Facturación, sin segunda asignación patrocinador-matrícula. | H3 |
| REQ-H7-002 | OS de un patrocinador y un Ciclo con selección una/varias/todas las matrículas elegibles propias. Monto positivo manual independiente de tarifas/cargos/cantidad. Serie, correlativo, fecha y observación opcional. | Instrucción, OQ005 |
| REQ-H7-003 | Cobertura histórica inmutable de IDs matrícula/Ciclo/patrocinador OS. H3 posterior no la reescribe. OS solo VIGENTE/ANULADA; indicadores facturados derivados. | Instrucción |
| REQ-H7-004 | Factura de un patrocinador con una/varias OS vigentes propias, varios Ciclos posibles; OS en varias facturas. Suma OS solo sugerencia. Diferencia confirmable, sin cuotas fijas, distribución ni techo acumulado. | HU14 ajustada, OQ002 |
| REQ-H7-005 | Factura con serie/correlativo separados, monto manual positivo, emisión/vencimiento y observación opcional. OS son el detalle comercial. Unicidad global incluso anuladas. | OQ002/005 |
| REQ-H7-006 | Workflow manual EMITIDA → REGISTRADA_PATROCINADOR → APROBADA → PENDIENTE_DESEMBOLSO y fechas externas. Anulación separada. Financiero derivado SIN_DESEMBOLSO/PARCIAL/DESEMBOLSADA; sin persistir saldo ni cambiar workflow al pagar. | Instrucción, OQ004 |
| REQ-H7-007 | Transferencia de un patrocinador, fecha_efectiva date/banco obligatorios, referencia_operacion/observación opcionales. Una/varias facturas propias en PENDIENTE_DESEMBOLSO. Fecha no futura ni anterior a emisión de cualquiera; total = suma aplicaciones, sin crédito sin aplicar. | HU15 ajustada, OQ004 |
| REQ-H7-008 | Parciales/múltiples, saldo factura = importe − aplicaciones de pagos vigentes. Sin sobrepago concurrente, idempotencia permanente, rollback íntegro y anulación con historia. Conflictos visibles sin retry. | HU15, patrón H4 |
| REQ-H7-009 | Enmienda explícita registrar_pago H4: negar nuevos pagos si patrocinador no es NULL bajo locks/relectura servidor. UI deriva a Facturación; histórico, recuperación idempotente y anulación H4 conservados. Sin distribución H7 a cargos ni deuda combinada. | OQ001 |
| REQ-H7-010 | Matrícula solo consulta empresa actual y cobertura histórica OS/facturas/pagos con enlaces. Totales compartidos rotulados como documento completo, no asignación al alumno. | Instrucción |
| REQ-H7-011 | Director/Coordinador consultan/registran/avanzan. Solo DIRECTOR_ACADEMICO anula OS/factura/pago con motivo. ADMIN solo/anónimo/rol inactivo/expirado denegados servidor. | HU14/HU15, decisión humana |
| REQ-H7-012 | RLS/RPC acotadas/whitelist, numeric(12,2), locks deterministas, auditoría atómica sin PII, PT409 lógico y compatibilidad 40001/40P01 reales. Proyecciones security_invoker donde corresponde. | Seguridad vigente |
| REQ-H7-013 | Reportes paginados/CSV de empresa, serie/correlativo, OS, facturas, Ciclos, beneficiarios, importes/abonado/pendiente factura, banco/fecha/referencia transferencia. Deduplicados, sin deuda por alumno ni prorrateo. | HU14/HU15 ajustadas |
| REQ-H7-014 | RUC opcional/no bloqueante con servicio autorizado, confirmación humana y fallback manual. Secretos servidor; no scraping ni dependencia crítica. | Instrucción |
| REQ-H7-015 | PDF OS opcional al registrar o después; privado, validación real, consulta/historia de reemplazos, key servidor sin PII. Límite técnico propuesto 5 MiB/20páginas, patrón mínimo separado de H6. Fallo no destruye versión previa ni OS ya creada. | OQ003 |

## Invariantes y cambio H3/H4

- Seis tablas negocio + una técnica para versiones PDF OS. Sin tablas de reparto, estados financieros ni saldos persistidos.
- PEN y montos positivos exactos con hasta dos decimales; sin NaN/infinito/overflow/redondeo silencioso. React solo preview exacta en centavos.
- Selecciones no vacías, IDs distintos, misma empresa; historia sin eliminación física. Correlativo textual numérico conserva ceros: OS01/000123, F001/000456.
- H4 anteriormente permitía pagar particularmente con patrocinador: REQ009 cambia ese contrato mediante futura migración aditiva/RPC y UI, no solo botones. H4 conserva importes/fórmulas y pagos anteriores.
- H3 puede asignar/cambiar empresa con pagos previos según sus reglas vigentes. Carrera H3↔H4: Ciclo → Alumno → Matrícula y relectura patrocinador tras lock. Pago confirmado antes de asignación es histórico; si asignación gana, nuevo pago se rechaza.
- Recuperación de una clave H4 ya confirmada no es nuevo pago. Histórico y anulación controlada siguen disponibles. Al volver patrocinador a NULL, evaluar elegibilidad H4 normal; nunca convertir pagos H7.
- Saldos H4 siguen como datos de ese modelo, no deuda cobrable al alumno patrocinado ni deuda empresarial. Facturas son pendiente comercial H7; no sumar ambos.
- Facturas distintas se suman una vez aunque tengan varias OS; beneficiarios deduplicados por matrícula/Ciclo histórico. No atribuir dinero por alumno/Ciclo.
- H6 sigue autoritativo para expediente. Factura H7 es registro interno, no CPE SUNAT.

## Diferencias deliberadas con fuentes anteriores

| Fuente | Ajuste humano H7 |
| --- | --- |
| H4 admitía nuevo pago particular con empresa asignada. | REQ009 lo bloquea servidor y UI, preservando historia/idempotencia/anulación. Cambio acotado trazable desde H7 sin reescribir Spec H4 aprobado. |
| HU14 incluía detalle comercial independiente y archivos adicionales. | OS son el detalle; solo PDF OS como archivo financiero. Prestaciones históricas retiradas no se declaran cubiertas. |
| HU14 pedía deuda real por Ciclo comparada con cargos. | No hay reparto ni conciliación con H4. Reportar pendiente de facturas con Ciclos relacionados, no importe empresarial por alumno/Ciclo. |
| HU15/requisito general admitían formas de abono y hora efectiva. | Transferencia fija, banco obligatorio, fecha efectiva date sin hora; created_at mantiene instante técnico. Reporte puede rotular Transferencia bancaria sin campo mutable. |
| Instrucción inicial reservaba Edge a SUNAT. | Decisión posterior de PDF OS justifica dos Edge específicas de bytes con patrón H6, sin endpoints genéricos ni reutilización de entidades académicas. Diseño acotado aún sujeto a Gate 1. |

Diferencias resueltas por esta instrucción, no contradicciones abiertas ni autorización de implementación.

## Exclusiones, SUNAT y residuales

EVOL-H7-001: emisión CPE, numeración fiscal automática, XML/CDR, consultas fiscales, notas de crédito/débito. Sin ERP, contabilidad, pasarela/conciliación bancaria, reparto monetario a alumnos, dashboard, renderer PDF nuevo, backend separado, AWS, jobs/colas ni motor genérico de archivos/workflow.

SUNAT, revisión oficial 2026-11-23: [consulta pública RUC](https://www.gob.pe/institucion/sunat/pages/565-consultar-el-estado-del-ruc); [manual consulta integrada](https://cpe.sunat.gob.pe/sites/default/files/inline-files/Manual-de-Consulta-Integrada-de-Comprobante-de-Pago-por-ServicioWEB_v2.pdf) documenta validación CPE, no demuestra autocompletado de empresas por RUC. Experimento condicionado a acceso autorizado, sin declaración de integración ejecutada.

Residuales preservados: Hosted Edge/PostgREST no probado directamente; CPU/memoria no medidas; forced-colors no verificado; bundle >500 kB; limpieza/conciliación manual y purga H9/release; PDF conservador; exportación sin snapshot y memoria proporcional al volumen. Validación estructural PDF no equivale a antivirus/CDR. No convertirlos en PASSED.

[Diseño](design.md), [tareas](tasks.md), [pruebas](test-plan.md). **Gate 1 pendiente; no construir.**
