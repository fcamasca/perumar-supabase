# H7 — Acceptance y checklist de cierre

26/11/2026 · **CLOSED / ACEPTADO** por autorización humana expresa. Integración autorizada mediante PR y merge commit, condicionada a CI completa SUCCESS de rama/PR y del SHA integrado. El SHA final y las ejecuciones se identifican en el PR y en el informe de integración; este documento no anticipa un resultado pendiente.

- Spec aprobado: `08d8a7a6e3279ff8f36344247de4c270b44f19f0`.
- Candidato funcional/humano y arquitectura: `44d60b12fa9f932b48e00e4d7720d0a1bb424b89`.
- Corrección técnica de inventario/CI: `accf422561593de13d5a25f645d5212b73935ad7`.
- Consolidación documental independiente H3: `f31f8fa184331089089506a224d3c0c69c47b532`.
- [Gate 2](gate-2.md), [resultados técnicos](technical-results.md), [log](implementation-log.md), [tareas](tasks.md), [arquitectura](../../architecture/Documento%20de%20Arquitectura%20—%20PERÚ%20MAR.md).

## Checklist y trazabilidad

| Tarea | Resultado de cierre |
| --- | --- |
| TASK-H7-001 | COMPLETADA: Gate 1 humano sobre SHA exacto. |
| TASK-H7-002 | COMPLETADA: seis tablas comerciales, tabla técnica OS, restricciones/proyecciones; reconstrucción de las 41 migraciones. |
| TASK-H7-003 | COMPLETADA: OS/factura/workflow, bloqueo por dependientes, sin cascadas ni DELETE; historia conservada. |
| TASK-H7-004 | COMPLETADA: transferencia/aplicaciones, saldo derivado, idempotencia y concurrencia real. |
| TASK-H7-005 | COMPLETADA: patrocinio exclusivo por Ciclo y bloqueo H4, historia y recuperación previas preservadas; RLS/grants/auditoría verificados. |
| TASK-H7-006 | COMPLETADA: UX de empresa/facturación y aviso de responsabilidad del patrocinador en matrícula; aceptación funcional global. |
| TASK-H7-007 | COMPLETADA: tres listados existentes, filtros servidor, paginación estable y CSV completo sin duplicar dinero; aceptación global del candidato posterior a estos cambios. Sin PDF/dashboard nuevo. |
| TASK-H7-008 | COMPLETADA: OpenRUC, fallback manual, domicilio fiscal y referencia tributaria JSONB; persistencia aprobada expresamente por el usuario. |
| TASK-H7-009 | COMPLETADA: PDF OS opcional privado, reserva/confirmación, versiones/historia y recuperación. |
| TASK-H7-010 | COMPLETADA técnicamente con evidencia integral registrada en technical-results; integración exige CI SUCCESS del SHA exacto. |
| TASK-H7-011 | COMPLETADA: Gate 2 humano y acceptance expresamente autorizados; sin repetir revisión humana. |

REQ-H7-001–015 y TEST-H7-001–016 se evalúan según sus enmiendas posteriores, no contra contratos sustituidos: OS incluye internamente todas las matrículas activas; una OS no puede integrar dos facturas no anuladas; numeración se conserva tal como se escribe. La presentación compacta no elimina relaciones históricas de detalle/CSV. TEST-H7-014 tiene aceptación humana global; **forced-colors real NO VERIFICADO**, sin marcar ese subcaso PASSED. La integración hospedada no se infiere de mocks ni de PostgREST local real.

H4 sigue siendo autoridad de cargos/pagos académicos; H6 de expediente; H7 de facturación comercial. Sin deuda combinada ni distribución de factura a alumnos. Estados/saldos derivados no se persisten. CSV Formula Injection, RLS, security_invoker y secretos exclusivamente server-side preservados.

## Riesgos residuales y producción

- Hosted Edge/PostgREST no probado directamente; CPU y memoria no medidas; forced-colors H5/H6/H7/DNI no verificado; bundle principal >500 kB. Las pruebas locales/CI no acreditan esos resultados.
- OpenRUC es dependencia externa, no API oficial SUNAT ni verificación en tiempo real; solo RUC con prefijo 20 y verificador válido. Disponibilidad, condiciones/cuotas y antigüedad del padrón pueden cambiar; manual siempre disponible.
- APIsPERU: autorización de uso y propósito, cuenta/plan/cuota y términos por confirmar antes de producción. `APISPERU_PRODUCTION_AUTHORIZED` permanece deshabilitado por defecto. Token privado Edge, nunca VITE_/Git/logs. [Consolidación H3](../H3-enrollment/implementation-log.md). Eldni: alternativa no seleccionada.
- CSV sin snapshot transaccional, memoria proporcional al volumen; controles de count/IDs no detectan todo cambio concurrente con la misma cardinalidad.
- Compatibilidad PDF conservadora y límites de recursos: no antivirus/CDR. DB/Storage no forman una única transacción; conciliación de cargas nunca confirmadas, huérfanos y limpieza física siguen manuales. Purga definitiva diferida a H9/release.
- Conciliación comercial y avance de etapas del patrocinador son manuales; no se consulta su sistema ni se automatiza desembolso, emisión fiscal o validación SUNAT.
- Dependencias: conservar advertencias del audit de instalación, sin ejecutar actualizaciones forzadas ni atribuir ausencia de vulnerabilidades por CI verde. Revisión/remediación del inventario de dependencias forma parte de preparación de producción.
- Antes de producción: configuración Auth/orígenes HTTPS/secretos privados, revisión de dependencias, backup/restauración y controles operativos hospedados. Esta aceptación no despliega ni habilita producción.

No H8, nuevas funcionalidades o decisiones arquitectónicas en el cierre. Los registros previos de "pendiente/no cerrado" son checkpoints históricos y quedan sustituidos por esta aceptación, sin borrar su evidencia.
