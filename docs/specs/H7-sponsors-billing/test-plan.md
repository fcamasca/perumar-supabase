# H7 — Plan de pruebas

**SPEC EN REVISIÓN / Gate 1 PENDIENTE / TEST-H7 TODOS NO EJECUTADOS**.
Base `fd230a7f36716129033f4c9b5a287f78647de111`; 2026-11-23.
OQ-H7-001..005 RESUELTAS: los oráculos reflejan decisiones definitivas.

## Trazabilidad

| Fuente | REQ-H7 | DES-H7 | TASK-H7 | TEST-H7 |
| --- | --- | --- | --- | --- |
| H3/OS | 001–003 | 001–003 | 002–003,006 | 001–003 |
| HU14 ajustada, factura/OS/numeración | 004–006 | 002–004 | 002–003,006 | 004–006 |
| HU15 ajustada, transferencia/aplicaciones | 007–008 | 002,004–006 | 004–005 | 007–008,010–012 |
| Enmienda H4 patrocinio exclusivo | 009 | 001,005 | 005–006 | 009,011–012,014 |
| Consulta matrícula | 010 | 003,007 | 006–007 | 003,013–014 |
| Roles/seguridad | 011–012 | 005–006 | 003–005,009 | 010–012,016 |
| Reportes HU14/HU15 ajustados | 013 | 003,007 | 007 | 013–014 |
| RUC opcional | 014 | 008 | 008 | 015 |
| PDF OS | 015 | 008 | 002,009 | 010–012,014,016 |

Rangos inclusivos; [diferencias históricas resueltas](requirements.md). No atribuir cobertura a prestaciones retiradas humanamente.

## Casos y resultados exigidos

| ID | Escenario/oráculo |
| --- | --- |
| TEST-H7-001 | Inventario seis tablas negocio + una técnica OS, maestro único, sin segunda empresa actual ni distribución monetaria. Sin saldos/estado financiero persistidos. Serie/correlativo separados, no numerador fiscal. OQ RESUELTAS, Gate 1 aún necesita aprobación. |
| TEST-H7-002 | OS una/varias/todas; vacío/duplicado/ajeno/mezcla Ciclos-empresa/estado inválido rechazados. S/18,450 manual permitido cualquiera suma cargos. UUID/monto/fecha/serie-correlativo validados; OS01/000123 conserva ceros y normaliza trim/mayúsculas. |
| TEST-H7-003 | Cambiar patrocinador/trasladar/anular matrícula no reescribe cobertura OS. Carrera con H3 espera y revalida: éxito coherente o PT409 sin omisión. Actual/histórico distinguibles. |
| TEST-H7-004 | OS10,000+5,000 propone15,000 y factura4,500 con advertencia/confirmación aceptada; sin confirmar no mutación. OS en varias facturas y acumulado diferente permitido, sin dinero por relación. Empresa ajena/OS anulada/versionada/duplicados rechazados. |
| TEST-H7-005 | OS misma empresa+serie+correlativo duplicada rechazada aun anulada; otra empresa permitida. Factura F001/000456 única global aun otra empresa/anulada. Carrera duplicado solo una alta. OS son detalle completo, sin filas comerciales independientes; emisión/vencimiento y monto validados. |
| TEST-H7-006 | Workflow cuatro etapas/fechas; salto/retroceso inválidos rechazados. Pago mantiene PENDIENTE_DESEMBOLSO; anular cambia financiero solamente. Solo Director anula con motivo. Decisión humana Gate 1: OS con alguna factura no anulada y factura con aplicaciones vigentes de pagos CONFIRMADOS bloqueadas, sin modificar dependientes. Primero regularizar/anular el dependiente por sus propias reglas; después reevaluar la operación original. Sin cascadas ni DELETE físico, historia íntegra. |
| TEST-H7-007 | Transferencia parcial/completa/multi-factura, varias por factura; total=suma. Banco/fecha obligatorios, referencia opcional. Rechazar cero/negativo/NaN/infinito/>2decimales/overflow, empresa ajena, factura anulada u otra etapa. Fecha futura o anterior a emisión de cualquiera rechazada; hoy Lima y pasada válida, created_at independiente. Sin selector mutable de forma de abono. |
| TEST-H7-008 | Concurrencia DB/PostgREST real:70+60 sobre100, no más de uno confirma, nunca sobrepago. Multi-factura orden inverso cliente/disjuntos/contra anulación-workflow. 40001/40P01 reales visibles sin retry; no reemplazar estas pruebas por mocks. |
| TEST-H7-009 | RPC H4 nueva patrocinada rechazada aun UI antigua, cero mutación/auditoría éxito. Pago anterior asignación intacto/consultable; cambio empresa no reasigna. Clave histórica recupera resultado sin nuevo dinero, clave nueva rechazada. Anulación H4 histórica normal; quitar empresa reevalúa elegibilidad. Carrera H3 asignar↔H4 pagar: solo pago confirmado primero puede quedar histórico; verificar relectura bajo locks. Sin aplicaciones H7 a cargos/deuda conjunta. |
| TEST-H7-010 | JWT ordinario Director/Coordinador por acción, Director exclusivo anulación; ADMIN solo/anónimo/rol inactivo-expirado denegados. DML/mass assignment/actor/SQL/estado financiero rechazados. Vistas invoker/descarga PDF sin bypass por join o UUID. |
| TEST-H7-011 | RPC real expected_updated_at obsoleto → PT409/HTTP409, sin mutación/auditoría éxito. Idempotencia misma clave/contenido recupera; cambiar banco/fecha/referencia/aplicaciones entra en conflicto, carrera no duplica. Respuesta perdida consulta explícita, una llamada mutación por decisión React, borrador conservado y compatibilidad40001/40P01. |
| TEST-H7-012 | Fallo última aplicación/constraint/auditoría rollback íntegro. Anulación conserva aplicaciones/recalcula pendiente y no duplica al repetir. Verificar secuencia explícita: anular pagos dependientes por sus reglas libera bloqueo de factura; anular facturas dependientes por sus reglas libera bloqueo OS; ninguna operación actúa en cascada ni hace DELETE físico y toda la historia permanece. Auditoría sin PII/snapshots/secretos. Locks H3/H4/H7 sin inversión, reconstrucción/regresión aisladas sin reset humano no autorizado. |
| TEST-H7-013 | Joins varias OS/matrículas no multiplican dinero. Alumno dos Ciclos = una persona global/dos matrículas; sin prorrateo. Reporte serie-correlativo/OS/empresa/Ciclos/beneficiarios/banco/fecha/referencia/total-abonado-pendiente. CSV filtrado multipágina BOM/ñ/tildes/comillas/saltos y fórmulas tras blancos/control neutralizadas; fallo sin parcial. |
| TEST-H7-014 | UX central y matrícula consulta, aviso bloqueo H4 sin ocultar historia. Serie/correlativo y banco/fecha separados; diferencia confirmable. PDF opcional al guardar/después, fallo no anula OS, historia/preview/descarga. Teclado/foco/ancho reducido/temas/errores/borradores; Excel real y forced-colors solo si realmente ejecutados. |
| TEST-H7-015 | OpenRUC autorizado por enmienda humana 25/11/2026, distinto de CPE/SUNAT directo. JWT/Director-Coordinador activos, ADMIN solo/anónimo/inactivo denegados antes de upstream y rol revalidado después. RUC 11 dígitos/verificador/prefijo20; otros prefijos solo manual. Destino HTTPS fijo sin redirecciones, timeout total5s, JSON/tamaño32KiB/esquema/RUC/source/as_of válidos; _more no se sigue ni devuelve. 404/429/5xx/red/timeout/malformed mantienen borrador y Guardar manual. Razón social/domicilio editables, contactos intactos; referencia original de diez campos preservada frente a correcciones manuales. Persistencia solo al guardar; lectura/edición sin consulta automática; fallo conserva referencia previa; cambio RUC invalida; cancelación descarta borrador. DB: campos NULL para empresas anteriores, compatibilidad RPC omitidos, rechazo RUC distinto/extras/tipos/fechas inválidos, control de versión, RLS/roles/DML y auditoría sin valores. Respuesta tardía no pisa RUC/nombre/domicilio modificado; sin doble envío ni guardado automático. Proveedor real y mocks se reportan separados; no atribuir hosted PASSED por mock. |
| TEST-H7-016 | PDF OS opcional real concordante/verificable, límites5MiB/20páginas frontera-exceso, vacío/corrupto/cifrado/activo/no verificable rechazados. Reserva-upload-confirmación con fallos antes/después Storage/respuesta perdida/reemplazo concurrente/anulación durante carga: previa confirmada preservada y no pérdida silenciosa. PREPARADO/ABORTADO no descargables; historia confirmada autorizada aun OS anulada, nueva carga anulada rechazada. Sin acceso directo/key cliente/URL pública ni mezcla H6. Huérfano conciliable manualmente sin jobs. |

## Ejecución futura

Solo tras Gate 1: fixtures aislados, barreras concurrentes y JWT ordinario. Lint/typecheck/suite vigente más H7, build/build-safety/diff-check; DB/API/rollback/reconstrucción pertinentes según scripts futuros. Actualizar caso H4 que antes admitía pago nuevo patrocinado, manteniendo historia/idempotencia/anulación/concurrencia.

Registrar comandos/cantidades/resultados y SHA/CI exactos. No tests ejecutables ahora ni aprobación humana H6.2 heredada. Gate 2 futuro verifica OS/facturas/transferencias/PDF privado/bloqueo H4/reportes/recuperación; acceptance/merge requieren autorización posterior.

Preservar residuales [requisitos](requirements.md), sin inferir hosted/CPU/memoria/forced-colors. PDF conservador y conciliación manual no prometen antivirus ni atomicidad DB+Storage.


## Revisión funcional pendiente — TASK-H7-007, 25/11/2026

1. Empresa→Facturación: comprobar los mismos tres listados, acciones de alta/detalle y filtros por referencia/serie-correlativo, estado, fechas y código completo de Ciclo. Cambio de filtro vuelve a primera página y no presenta datos de otro filtro.
2. Comparar OS, factura (importe/abonado/pendiente) y transferencia (importe/aplicaciones) con sus detalles. Varias OS/beneficiarios no multiplican importes. Una persona en dos matrículas/Ciclos se cuenta una vez como persona y dos como matrículas. Revisar el desplegable de identificación histórica de beneficiarios.
3. Exportar CSV en las tres pestañas; comprobar que respeta filtros e incluye todas las páginas, conserva ñ/tildes/comillas y abre correctamente en Excel. Totales monetarios excluyen anulados; conteos únicos abarcan todos los resultados filtrados, conforme al rótulo.
4. Director/Coordinador autorizados, ADMIN solo denegado; error de consulta/exportación no deja descargar parcial. Revisar teclado, foco, ancho reducido y temas. Forced-colors real continúa NO VERIFICADO salvo prueba explícita posterior.

No marcar estos casos humanos PASSED por las pruebas automatizadas. La confirmación funcional previa de OpenRUC/DNI no aprueba automáticamente los reportes nuevos. Sin cierre/merge H7 ni inicio H8.


## Estado definitivo autorizado — 26/11/2026

H7 CLOSED / ACEPTADO. TASK-H7-001–011 completadas conforme al [checklist de acceptance](acceptance.md). [Gate 2 humano](gate-2.md) aprobado sobre el candidato 44d60b1; autorización de integración condicionada a CI exacta SUCCESS. Los encabezados y pendientes anteriores describen checkpoints históricos; no reabren Gate 1 ni contradicen esta decisión posterior. Forced-colors real NO VERIFICADO y residuales preservados. H8 no iniciado.
