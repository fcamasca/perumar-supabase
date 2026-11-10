# H4 — Pagos: requirements

Versión 0.3 · 09/11/2026 (America/Lima).

**SPEC ACTUALIZADO CON DECISIONES HUMANAS. 17 OQ RESUELTAS. GATE 1 PENDIENTE. CONSTRUCCIÓN NO AUTORIZADA.**

## Base y precedencia

Rama `feature/h4-payments-spec` desde `main` exacto `ba81106837de881b2b243e28b862dfd4a315a949`. Working tree limpio al iniciar; main/origin coincidentes, cierre H3 presente y sin rama, carpeta ni historia H4 previa al preparar este Spec. H3 CLOSED / ACEPTADO / INTEGRADO: [acceptance](../H3-enrollment/acceptance.md), candidato aceptado `42dcd1507a28121e9d8d588c2dff22cb263cd19d`, último código `6f6ab0d6cf8dc9fce4a5f84356a9acc96d9afcb1`. El cierre de H3 no aprobó H4: esta instrucción autoriza exclusivamente estos cuatro documentos.

Precedencia: instrucción humana actual y [PLAN_MVP, H4 — Pagos](../../PLAN_MVP.md#h4--pagos) delimitan el hito. [HU13](../../requirements/Historias_de_Usuario.md) es fuente funcional amplia; HU14/HU15 no se incorporan. Las propuestas del [Informe de alternativas, Caso 3 — Pago particular](../../architecture/Informe_Alternativas_Arquitectura_PERUMAR.md#caso-3-pago-particular) orientan el diseño, no resuelven decisiones de negocio. El [Informe de evaluación](../../architecture/Informe_Evaluacion_Arquitectonica_PERUMAR.md) exige integridad, mínimos componentes y reconoce vacíos de correcciones, moneda/redondeo y permisos.

H3 se interpreta con [requirements](../H3-enrollment/requirements.md), [design](../H3-enrollment/design.md), cierre y enmiendas vigentes, no con estados históricos previos a gates. En particular: [edición individual/cargos](../H3-enrollment/approved-quick-add-amendment.md), [tarifas por Ciclo](../H3-enrollment/approved-cycle-tariffs-amendment.md), [código Alumno y experiencia/modalidad](../H3-enrollment/approved-career-student-code-amendment.md), [terminología](../H3-enrollment/approved-ui-terminology-amendment.md), [carga inicial](../H3-enrollment/approved-authorized-courses-initial-load.md) y [confirmación Director en asignaturas](../H3-enrollment/approved-director-cycle-subjects-amendment.md). Las demás enmiendas se conservan por la trazabilidad del acceptance. No se modifica H3 durante este trabajo.

## Decisiones humanas y precedencia vigente

Actualización autorizada el 09/11/2026 sobre el Spec base `143ea773e9ff77a7c52944fcc25b620f351c17ef`. La instrucción actual resuelve OQ-H4-001…017 y prevalece sobre las alternativas y dudas de la versión 0.1 y sobre los puntos amplios de HU13 que quedan recortados. Resolver OQ no equivale a aprobar Gate 1 del conjunto. Esta entrega sigue siendo exclusivamente los cuatro Markdown; no modifica H3 ni implementa H4.

| Fuente amplia | Regla vigente de H4 |
| --- | --- |
| HU13: fecha de pago capturada | No existe fecha de operación manual: solo timestamp DB de registro inmutable |
| HU13: concepto ingresado | No campo concepto: se deriva de cargos seleccionados y pago_aplicacion |
| HU13: medios abiertos «etc.» | Solo semilla autorizada Efectivo/Yape/Plin/Transferencia bancaria/Tarjeta, catálogo genérico |
| HU13: alumno particular | Pago particular permitido con o sin patrocinador en matrícula; no asigna responsabilidades ni implementa HU14/HU15 |
| HU13: informe/comprobante | Historial y resumen operativo en pantalla; sin documento fiscal/PDF, adjuntos ni informes/exportación amplios |
| PLAN: deuda y consistencia | Cargos activos menos aplicaciones de pagos CONFIRMADO; saldo derivado, no tabla deuda ni saldo persistido |

## REQ-H4-001 — Gobernanza y alcance

H4 registra pagos particulares, parciales o completos, de una matrícula existente con imputación manual a cargos, consulta de deuda/saldo/historial, medios declarativos, anulación concreta, idempotencia, concurrencia y auditoría mínima. Arquitectura React + Supabase/PostgreSQL + RLS + constraints + RPC concretas; sin infraestructura adicional.

**Criterios de aceptación:** Solo se modifican cuatro Markdown en esta fase. Sin código, SQL ejecutable, migraciones, tests ejecutables, cambios H3, acceptance, merge a main ni H5.

## REQ-H4-002 — Permisos financieros

Director y Coordinador activos registran pagos, consultan saldo/historial y recuperan la operación idempotente. Solo Director anula pagos. Admin Sistema no tiene permiso financiero por defecto; multirol suma capacidades explícitas activas. Identidad/rol/objeto se validan DB-side y no dependen de React o metadata cliente.

**Criterios de aceptación:** RLS/grants mínimos y RPC con autorización explícita; negar mutación directa y accesos anónimo/inactivo/rol no permitido. Coordinador no anula ni falsificando payload/rol. Auditoría técnica mínima mantiene la visibilidad H2 sin abrir tablas financieras al Admin.

## REQ-H4-003 — Deuda y saldo derivados

Base exigible = suma de importe_final de cargos activos de la matrícula. Abonado = suma de aplicaciones sobre esos cargos de pagos CONFIRMADO/no anulados. Pendiente = base − abonado. No tabla deuda ni saldo monetario materializado independiente. No usar tarifas actuales para recalcular cargos históricos.

**Criterios de aceptación:** Totales DB exactos y consistentes, pendiente nunca negativo; no truncar inconsistencias a cero. Retirados sin pagos no integran deuda, pagos ANULADO no integran abonado. Por cargo se cumple la misma ecuación y la suma concilia con matrícula.

## REQ-H4-004 — Aplicaciones explícitas por cargo

Cada pago pertenece a una sola matrícula y se aplica a uno o más matricula_cargo de esa misma matrícula mediante pago_aplicacion. Suma exacta de aplicaciones = importe total del pago. Aplicaciones positivas y no duplicadas por cargo, con propiedad/pendiente comprobados server-side.

**Criterios de aceptación:** No aplicación global sin detalle, monto sin imputar, cargo ajeno ni aplicación superior a pendiente individual. Se conserva UUID de cargo y aplicaciones históricas sin DELETE ni reasignación automática.

## REQ-H4-005 — Moneda e importes

PEN — Soles; importes positivos, máximo dos decimales, numeric compatible con numeric(12,2) de H3. Frontend restringe a dos decimales y backend vuelve a validar antes de conversión. Mayor precisión, cero/negativo, NaN/infinito, overflow y excedente sobre saldo se rechazan; no redondeo automático.

**Criterios de aceptación:** Pago parcial o exacto permitido según saldo DB; importe y total de aplicaciones iguales. Transporte decimal exacto y cálculos DB, nunca float como autoridad. Si aparece impedimento técnico de numeric(12,2), reportar antes de cambiarlo.

## REQ-H4-006 — Estados y elegibilidad

Matrícula ACTIVO permite pagos nuevos con Ciclo PROGRAMADO, EN_CURSO o CERRADO. DESIERTO/ANULADO no permiten registrar pagos. Matrícula ANULADO (ANULADA en UI) es inmutable y solo consulta: no nuevo pago, anulación de pago, edición de cargos/descuento/opciones ni otra mutación.

**Criterios de aceptación:** CERRADO no elimina deuda ni prohíbe cobro H4. Ciclo con cualquier pago registrado no puede pasar a DESIERTO ni ANULADO; conservar también la restricción H3 de no anular Ciclo con matrículas. Conservar historia/pagos/cargos/auditoría y no crear cascadas.

## REQ-H4-007 — Compatibilidad económica con H3

Cargo con aplicación vigente no puede retirarse/inactivarse, sea parcial o total; no transferir aplicaciones ni sustituir UUID. Descuento, solo Director, permitido si nuevo importe_final ≥ aplicado vigente del cargo. Una matrícula con al menos un pago registrado no puede cambiar de Ciclo. Agregar/cambiar/quitar patrocinador sigue permitido bajo elegibilidad H3 y no altera pagos.

**Criterios de aceptación:** Validar todas las rutas server-side bajo protocolo común. En este Spec, «pago registrado» para bloquear traslado y estado de Ciclo incluye filas ANULADO: la fila histórica existe, no se elimina. Nuevas restricciones no amplían permisos H3. Si no queda ninguna aplicación vigente, incluido después de anular todos los pagos del cargo, puede retirarse conforme a H3, siempre que matrícula/estado/rol permitan esa operación; se conserva historia y aplicaciones. Precisión C-H4-001 RESUELTA.

## REQ-H4-008 — Timestamp, observaciones y concepto derivado

Fecha/hora de pago = timestamp de registro PostgreSQL inmutable. No fecha de operación pasada/futura introducida por usuario ni campo libre concepto. Concepto se deriva de los cargos de pago_aplicacion. Observaciones opcionales, texto plano ≤500 caracteres, trim y vacío→NULL, preservando mayúsculas/minúsculas; informativas, sin controlar negocio ni crear cargos/tarifas.

**Criterios de aceptación:** Rechazar campos de fecha/actor/estado o concepto libre forjados. Notas con escape seguro, sin interpretar HTML ni exigir contenido especial. No editable después de confirmar; una corrección anula pago y registra uno nuevo.

## REQ-H4-009 — Medios de pago

Usar catalogo/catalogo_valor existentes, categoría técnica propuesta MEDIO_PAGO. Semilla exacta: Efectivo, Yape, Plin, Transferencia bancaria y Tarjeta. No mantenimiento específico H4; mantenimiento genérico queda para otro alcance. No integración con proveedores, adjuntos ni comprobación bancaria.

**Criterios de aceptación:** Validar en DB catálogo correcto y valor activo. Pago conserva ID y representación histórica de código/etiqueta resueltos DB, no enviada como autoridad por cliente; cambios/inactivaciones posteriores no reescriben pagos ni impiden recuperación histórica.

## REQ-H4-010 — Registro y anulación transaccionales

registrar_pago registra pago, aplicaciones, versión y auditoría en una transacción DB; React no coordina escrituras ni decide saldo/montos/estados. Pago confirmado no se edita ni se elimina; solo puede anularse por Director con motivo obligatorio, actor y timestamp DB. Comando anular_pago separado, concreto, sin motor genérico de reversos.

**Criterios de aceptación:** Anular conserva fila/aplicaciones visibles y estado ANULADO; aplicaciones dejan de contar en abonado y saldo se recalcula. Si matrícula ANULADO, no anular pago. Para corregir: anular y nuevo pago con nueva clave. Sin devolución bancaria ni nota de crédito. Motivo trim no vacío ≤500 caracteres.

## REQ-H4-011 — Idempotencia exclusiva del registro

Frontend genera UUID opaco, no visible/editable, por intento de pago; UNIQUE global DB, asociado permanentemente al pago, sin TTL/reutilización ni tabla de comandos, sin PII o datos de negocio dentro de la clave. Misma operación reutiliza clave. Mismo contenido semántico normalizado recupera el mismo pago; distinto contenido implica conflicto/rechazo sin mutación.

**Criterios de aceptación:** No segundo pago, cambio del anterior ni segunda alta de auditoría por replay. Comparación DB tipada: matrícula, importe, medio, observaciones normalizadas y aplicaciones por cargo; no timestamp/actor DB o versión de transporte. No mezclar idempotency key de registro con anulación.

## REQ-H4-012 — Recuperación de respuesta ambigua

Tras pérdida de respuesta del commit se recupera por la misma clave con permiso actual, sin nuevo cobro ni retry silencioso. Guardar localmente solo identidad opaca de operación y contexto mínimo aislado por usuario; no payload financiero/PII. Un pago ya ANULADO se recupera como el mismo pago con estado actual, nunca se recrea.

**Criterios de aceptación:** Distinguir confirmado/rechazo cierto/desconocido. Una lectura vacía puede significar transacción en curso: no declarar rollback ni emitir otra clave automáticamente. Reenvío consciente usa mismo UUID y contenido; no requiere que la versión antigua sirva para un alta nueva.

## REQ-H4-013 — Concurrencia y versiones

Bloquear fila estable Matrícula con orden compatible Ciclo(s)→Alumno→Matrícula→cargos/pagos; revalidar contexto bajo locks. Todos los escritores de deuda, pago/anulación, descuento, retiro, traslado, patrocinador y estados de matrícula/Ciclo relevantes deben coordinarse. Mantener SERIALIZABLE y optimistic concurrency H3 con conflictos explícitos.

**Criterios de aceptación:** Saldo 100, pagos concurrentes 70 y 60 nunca registran 130: gana uno o hay conflicto protector, sin reducir importe automáticamente ni retries ocultos. Probar anulación frente a cobro/descuento/cierre/anulación de matrícula, y misma clave en conexiones independientes.

## REQ-H4-014 — Rollback y unicidad de efecto

Registro y anulación son transacciones completas con auditoría. Fallo en cualquier validación, aplicación, versión o evento revierte efectos del intento. No clave exitosa huérfana ni auditoría de éxito aislada. Anular ya ANULADO no vuelve a liberar saldo; estado/versiones lo protegen sin clave adicional de comandos.

**Criterios de aceptación:** Inyectar fallos solo en CI/base desechable o rollback comprobado. Comparar filas/estado/versión/auditoría antes y después. Distinguir rollback real de commit con respuesta perdida y recuperar anulación incierta consultando el pago, sin duplicar evento.

## REQ-H4-015 — Auditoría financiera mínima

Eventos pago registrado y pago anulado: pago_id, matricula_id, usuario, timestamp DB y motivo de anulación cuando corresponda. Reutilizar auditoria y proyección explícita, sin duplicar importe, medio, observaciones, aplicaciones, ficha/snapshot del alumno ni payload financiero completo. Detalle económico permanece en tablas financieras con sus permisos.

**Criterios de aceptación:** Evento atómico con operación; actor/fecha confiables; no secretos/PII ni clave de operación en logs de rutina. Un replay de registro o anulación repetida no crea un segundo evento de efecto financiero. No trigger genérico de copia completa.

## REQ-H4-016 — Saldo e historial

Resumen DB por matrícula y cargos activos: base/abonado/pendiente; historial de pagos y aplicaciones incluye CONFIRMADO/ANULADO sin borrar, con timestamp de registro y datos de anulación pertinentes. Conceptos de cargos/medio históricos legibles. Orden estable y paginación, sin sumar solo página visible ni mezclar snapshots.

**Criterios de aceptación:** Total pagado y saldo concilian con aplicaciones vigentes; pagos anulados dejan de abonar pero siguen visibles. Patrocinador no altera historia. Si no se autoriza todo el perímetro financiero, denegar resumen completo en vez de presentar saldo falso con pagos ocultos por RLS.

## REQ-H4-017 — UI de imputación manual y accesibilidad

Mostrar cargos pendientes de matrícula con checks e importe aplicado por cargo: marcar propone saldo completo; reducir permite parcial; importe >0 selecciona; desmarcar pone cero; Seleccionar todos propone saldo pendiente de todos, luego editable. Total a pagar suma aplicaciones. No FIFO, proporcionalidad, obligatorio primero ni reparto backend automático.

**Criterios de aceptación:** Solo importes positivos de cargos seleccionados se envían; backend valida suma, propiedad y pendientes. Timestamp no editable; medio, observaciones opcionales, resumen e historial estándar. Director anula con diálogo/motivo. Teclado/foco/temas/móvil/forced-colors, mensajes y borrador coherentes; error no implica otro cobro.

## REQ-H4-018 — Errores seguros y sesión

Distinguir validación/precisión, exceso global/por cargo, estado/permiso, versión/serialización, conflicto idempotente, pago ya anulado y respuesta desconocida. Rechazar inputs fuera de whitelist; no SQL dinámico ni datos ajenos. Descarta respuestas tardías de otra identidad y no usa React como autoridad.

**Criterios de aceptación:** Conservar borrador/clave cuando corresponda; no renovar versión y reenviar automáticamente. Anulación incierta se consulta por UUID con autorización, no usa nueva clave de pago. Errores/auditoría/logs no duplican finanzas o PII innecesarias.

## REQ-H4-019 — Validación progresiva futura

Tras Gate 1, probar por bloques modelo/decimal/roles, registro e imputación, idempotencia, anulación/rollback, rutas H3 afectadas/concurrencia, consulta/UI y regresión H1–H3. JWT ordinario prueba autorización; admin solo prepara/observa casos aislados. No suites persistentes sobre base humana.

**Criterios de aceptación:** Casos nuevos de decisiones humanas quedan cubiertos antes de candidato, incluido 70+60 y respuesta ambigua; lint/types/unit/build/security/integración. En esta fase solo verificaciones documentales; todos los TEST NO EJECUTADOS y tareas técnicas NO INICIADAS.

## REQ-H4-020 — Gates y mantenibilidad

Las 17 OQ resueltas se registran con decisión humana, sin inferir Gate 1. Someter los cuatro documentos exactos y cualquier contradicción pendiente a revisión; no construir antes de aprobación explícita. Gate 2 futuro requiere candidato/CI/evidencia/inventario/residuales y decisión independiente.

**Criterios de aceptación:** No acceptance ni merge de construcción ahora; no H5. Justificar cada RPC/helper/policy por requisito y prueba; detener expansión ante API oculta, ledger genérico, infraestructura o abstracciones preventivas.

## OQ-H4-001…017 — RESUELTAS por decisión humana del 09/11/2026

El estado de todas estas OQ es **RESUELTA**. Las dudas/alternativas de 0.1 quedan sustituidas; no se implementa aplicación global ni distribución automática. Esta resolución no concede Gate 1.

| OQ | Estado | Decisión humana vigente | REQ-H4 principales |
| --- | --- | --- | --- |
| OQ-H4-001 | RESUELTA | Un pago, una matrícula, una o más aplicaciones a cargos propios; pago_aplicacion obligatoria y suma exacta. Sin deuda/saldo persistidos. | 003, 004, 010 |
| OQ-H4-002 | RESUELTA | Imputación manual: check propone pendiente completo, parcial editable, >0 selecciona, desmarcar cero, seleccionar todos y total suma. Sin reparto automático. | 004, 017 |
| OQ-H4-003 | RESUELTA | Cargo con al menos una aplicación vigente no se retira/inactiva; parcial o total. Sin traslado de aplicación/UUID. Sin aplicaciones vigentes sigue H3, también tras anular todos sus pagos. Precisión C-H4-001 RESUELTA. | 007 |
| OQ-H4-004 | RESUELTA | Matrícula ANULADO inmutable/consulta: sin pagos nuevos, anulación de pagos, cambios de cargos/descuento/opciones ni otra mutación; conserva toda historia. | 006, 007, 010 |
| OQ-H4-005 | RESUELTA | Cobrar con PROGRAMADO/EN_CURSO/CERRADO, no DESIERTO/ANULADO. Ciclo con pagos registrados no pasa a DESIERTO/ANULADO. | 006, 013 |
| OQ-H4-006 | RESUELTA | Pago no editable ni DELETE; Director puede anular con motivo/actor/timestamp DB. Estado ANULADO y aplicaciones no abonan; corrección por anular y nuevo pago. Matrícula ANULADO bloquea anulación. | 010, 014 |
| OQ-H4-007 | RESUELTA | Solo timestamp DB de registro inmutable; sin fecha de operación manual. Observaciones/notas opcionales libres informativas; cota técnica 500 caracteres conforme al patrón existente. | 008 |
| OQ-H4-008 | RESUELTA | catalogo/catalogo_valor: Efectivo, Yape, Plin, Transferencia bancaria, Tarjeta. Sin mantenimiento específico ni integración externa; representación histórica de medio. | 009 |
| OQ-H4-009 | RESUELTA | Sin concepto libre independiente: se deriva de cargos seleccionados a través de pago_aplicacion. Notas no crean conceptos/cargos/tarifas. | 008, 017 |
| OQ-H4-010 | RESUELTA | UUID opaco por intento generado frontend, oculto/no editable, UNIQUE DB permanente, sin TTL/reutilización/PII/datos de negocio ni tabla de comandos; mismo intento reutiliza clave. | 011, 012 |
| OQ-H4-011 | RESUELTA | Misma clave/contenido normalizado recupera exactamente el mismo pago; distinto contenido conflicto/rechazo sin mutación. Comparación server-side. | 011 |
| OQ-H4-012 | RESUELTA | Director registra/consulta/recupera/anula; Coordinador registra/consulta/recupera, no anula; Admin sin permiso financiero por defecto. | 002 |
| OQ-H4-013 | RESUELTA | Solo evento, pago_id, matricula_id, usuario, timestamp DB y motivo de anulación. No duplicar importe/medio/notas/aplicaciones/ficha/payload. | 015 |
| OQ-H4-014 | RESUELTA | PEN, máximo dos decimales, backend y frontend validan; rechazar precisión extra sin redondear; numeric compatible con numeric(12,2) H3. | 005 |
| OQ-H4-015 | RESUELTA | Se admite pago particular con o sin empresa patrocinadora. No se determina responsabilidad económica ni se reparte deuda empresa/alumno; HU14/15 excluidas. | 006, 007 |
| OQ-H4-016 | RESUELTA | Descuento final ≥ aplicado vigente; matrícula con pago registrado no cambia Ciclo; patrocinador puede agregarse/cambiarse/quitarse sin reasignar pagos, bajo demás reglas H3; cargo pagado no se retira y ANULADO es inmutable. | 007, 013 |
| OQ-H4-017 | RESUELTA | Base = finales de cargos activos; abonado = aplicaciones de pagos vigentes sobre esos cargos; pendiente = base − abonado, nunca negativo ni truncado a cero. Pagos anulados no abonan; no traslado a otro Ciclo. | 003, 016 |

## Precisión de consistencia C-H4-001 — RESUELTA humanamente

Decisión humana del 09/11/2026: **«Sí, si no quedan aplicaciones vigentes»**. El bloqueo de retiro/inactivación depende de aplicaciones de pagos CONFIRMADO vigentes, no de que alguna vez se haya registrado un pago. Tras anular todos los pagos que abonaban el cargo, si aplicado vigente = 0, puede retirarse conforme a las demás reglas H3. Una aplicación vigente restante, parcial o total, mantiene el bloqueo.

Retirar no elimina pago/aplicaciones ni sus UUID históricos. El cargo pasa a inactivo y sale de la base exigible; al no tener aplicaciones vigentes, no se pierde abonado ni se reasigna a otro cargo. Matrícula ANULADO y demás bloqueos H3 siguen aplicando: esta precisión no autoriza mutaciones sobre ellos.

Es distinto del bloqueo de traslado de matrícula y transición de Ciclo: esos controles siguen basándose en **pagos registrados**, incluidos ANULADO, y no se levantan por esta precisión. Las 17 OQ y C-H4-001 están RESUELTAS; Gate 1 del Spec aún no está aprobado.

## Lecturas literales e implicaciones conservadas

«Pago registrado» en las restricciones de traslado de matrícula y transición de Ciclo se refiere a existencia histórica de fila pago, incluido ANULADO; la anulación no borra ese registro. Es distinto de «aplicación vigente», que abona únicamente con pago CONFIRMADO.

No se añadió prohibición de anular matrícula ACTIVO con pagos: se conservan permisos/reglas H3 de esa transición. Una vez ANULADO, H4 congela también pagos: no nuevas altas ni anulaciones de pago; saldo/historia se consultan sin reverso automático. Registrar esta consecuencia no concede permiso de editar una anulada ni elimina deuda por cambiar estado.

## Exclusiones y trazabilidad

Fuera de H4: HU14/HU15, facturas/pagos de patrocinadores, distribución entre facturas o entre matrículas; SUNAT/facturación electrónica; comprobantes/PDF/H5, adjuntos/Storage; informes/exportaciones amplias; caja/bancos/conciliación/cuentas contables; pasarela/integraciones; devoluciones/notas de crédito; notificaciones, workflow de descuentos, EVOL-001/002 y H5+. Sin ledger, tabla deuda, saldo materializado, event sourcing, CQRS, outbox, colas, Edge Functions, API adicional ni motor genérico de reversos.

REQ-H4-n → DES-H4-n → TASK-H4-n; pruebas/dependencias en [tasks](tasks.md) y [test-plan](test-plan.md); diseño en [design](design.md). Solo documentación: sin evidencia técnica H4 ejecutada.

**17 OQ Y C-H4-001 RESUELTAS HUMANAMENTE. REVISIÓN/GATE 1 PENDIENTES. CONSTRUCCIÓN NO AUTORIZADA.**
