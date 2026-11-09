# H4 — Pagos: requirements

Versión 0.1 · 09/11/2026 (America/Lima).

**SPEC ELABORADO. OQ ABIERTAS. PENDIENTE DE REVISIÓN HUMANA Y GATE 1. CONSTRUCCIÓN NO AUTORIZADA.**

## Base y precedencia

Rama `feature/h4-payments-spec` desde `main` exacto `ba81106837de881b2b243e28b862dfd4a315a949`. Working tree limpio al iniciar; main/origin coincidentes, cierre H3 presente y sin rama, carpeta ni historia H4 previa al preparar este Spec. H3 CLOSED / ACEPTADO / INTEGRADO: [acceptance](../H3-enrollment/acceptance.md), candidato aceptado `42dcd1507a28121e9d8d588c2dff22cb263cd19d`, último código `6f6ab0d6cf8dc9fce4a5f84356a9acc96d9afcb1`. El cierre de H3 no aprobó H4: esta instrucción autoriza exclusivamente estos cuatro documentos.

Precedencia: instrucción humana actual y [PLAN_MVP, H4 — Pagos](../../PLAN_MVP.md#h4--pagos) delimitan el hito. [HU13](../../requirements/Historias_de_Usuario.md) es fuente funcional amplia; HU14/HU15 no se incorporan. Las propuestas del [Informe de alternativas, Caso 3 — Pago particular](../../architecture/Informe_Alternativas_Arquitectura_PERUMAR.md#caso-3-pago-particular) orientan el diseño, no resuelven decisiones de negocio. El [Informe de evaluación](../../architecture/Informe_Evaluacion_Arquitectonica_PERUMAR.md) exige integridad, mínimos componentes y reconoce vacíos de correcciones, moneda/redondeo y permisos.

H3 se interpreta con [requirements](../H3-enrollment/requirements.md), [design](../H3-enrollment/design.md), cierre y enmiendas vigentes, no con estados históricos previos a gates. En particular: [edición individual/cargos](../H3-enrollment/approved-quick-add-amendment.md), [tarifas por Ciclo](../H3-enrollment/approved-cycle-tariffs-amendment.md), [código Alumno y experiencia/modalidad](../H3-enrollment/approved-career-student-code-amendment.md), [terminología](../H3-enrollment/approved-ui-terminology-amendment.md), [carga inicial](../H3-enrollment/approved-authorized-courses-initial-load.md) y [confirmación Director en asignaturas](../H3-enrollment/approved-director-cycle-subjects-amendment.md). Las demás enmiendas se conservan por la trazabilidad del acceptance. No se modifica H3 durante este trabajo.

## Cruce funcional y límites de HU13

| Fuente | Incluido en H4 | Límite o pendiente |
| --- | --- | --- |
| HU13: alumno y ciclo, parcial/total, abonado/pendiente e historial | Operación sobre matrícula UUID existente, consulta e historial en pantalla | No deuda global del alumno entre varios ciclos ni pago distribuido entre matrículas |
| HU13: monto, fecha, concepto y medio | Datos de pago necesarios, validados en servidor | Semántica de fecha/concepto y catálogo exacto requieren OQ |
| HU13: efectivo, Yape, Plin, transferencia, tarjeta, etc. | Registro declarativo de medio | Son ejemplos, no seed cerrado ni integración de cobro; OQ-H4-008 |
| HU13: informe de pagos/resumen | Historial y resumen operativo en pantalla | Informe detallado/exportaciones diferidos a hito autorizado; no generador de reportes |
| HU13: comprobante en paso 8 | Confirmación en pantalla del registro y su identificador técnico | No recibo fiscal, comprobante documental, PDF, numeración legal ni Storage; H5 u otro hito autorizado |
| PLAN: saldo 100 y concurrentes 70+60 | Invariante y prueba obligatoria | Bloquear excedentes en DB, no confiar en total/validación React |
| H3: cargos UUID históricos y descuentos | Origen económico existente, sin repricing | Política ante nuevas mutaciones después del pago requiere decisiones humanas |

Los únicos resultados de esta fase son requirements/design/tasks/test-plan. Todos los contratos/modelos de diseño son **propuestos**, no aprobados ni implementados. Los invariantes impuestos por PLAN no se dejan opcionales. Una OQ afecta la solución concreta, nunca autoriza sobrepago o duplicación.

## REQ-H4-001 — Gobernanza y alcance

H4 se limita a cargos existentes como origen de deuda de una matrícula, pago particular, parcialidad, aplicación, saldo/historial, medios, idempotencia, concurrencia y auditoría. React + Supabase/PostgreSQL + RLS + constraints + RPC concretas; sin infraestructura nueva.

**Criterios de aceptación:** El cambio de Spec contiene solo los cuatro Markdown de H4; las exclusiones permanecen fuera y no se aprueba ninguna OQ ni Gate 1 automáticamente.
## REQ-H4-002 — Permisos server-side

HU13 identifica Director y Coordinador como actores del registro; la matriz amplia tiene marcas ambiguas. No heredar por analogía todos los permisos de H3 ni conceder acceso financiero implícito a ADMIN_SISTEMA. La matriz exacta registrar/consultar/recuperar/mantener medios/corregir queda en OQ-H4-012. Reutilizar identidad y roles activos H1, mínimo privilegio, RLS y grants de solo lectura autorizada; mutación financiera exclusivamente por comando.

**Criterios de aceptación:** JWT/rol/sujeto/estado se validan DB-side; rol cliente, metadata y ocultamiento UI no autorizan. Se prueban roles positivos y negativos de la matriz humana aprobada, también lectura por clave.
## REQ-H4-003 — Origen y proyección de deuda

La deuda deriva de importes finales históricos de matricula_cargo y pagos/aplicaciones confirmados según perímetro aprobado. No se toma monto_por_defecto ni precios actuales de tarifa/ciclo_tarifa para recalcular cargos. Sin tabla deuda ni saldo materializado independiente por defecto. Qué cargos integran la deuda, incluidos inactivos, requiere OQ-H4-003/017.

**Criterios de aceptación:** Una lectura consistente presenta base exigible, abonado y pendiente; se demuestra la ecuación acordada y que tarifas posteriores no alteran cargos previos. Saldo pendiente no negativo; una contradicción no se oculta truncando a cero.
## REQ-H4-004 — Aplicación e integridad relacional

Un pago se refiere a una sola matrícula existente. Aplicación global a matrícula o imputación a uno/más cargos, y orden manual/automático, siguen abiertos (OQ-H4-001/002). Si se aprueba imputación por cargo, cada aplicación referencia UUID de pago y cargo de la misma matrícula; suma de aplicaciones igual a pago y ninguna excede pendiente del cargo.

**Criterios de aceptación:** Tras cerrar OQ, la opción elegida tiene integridad DB y comprobaciones de suma/propiedad. No hay pagos sin aplicación efectiva, montos sin imputar ni relaciones con otra matrícula; no se implementan ambas alternativas innecesariamente.
## REQ-H4-005 — Importes exactos

Pago estrictamente mayor que cero y menor o igual al pendiente autorizado por DB. Usar numeric y transporte decimal exacto, nunca float ni Number JavaScript como autoridad monetaria. Rechazar NaN, infinitos, negativos, cero, overflow y entradas no válidas. Escala/límite/moneda y regla de precisión se aprueban en OQ-H4-014, teniendo como antecedente cargos H3 en soles numeric(12,2).

**Criterios de aceptación:** Pago parcial y exacto hasta saldo permitido; exceso incluso mínimo rechazado sin escrituras. No redondeo implícito no aprobado ni conversión monetaria; pruebas de límites y decimales definidas por la política acordada.
## REQ-H4-006 — Elegibilidad y estados

Pagar una matrícula existente de alumno particular, sin crear alumno, matrícula ni cargo desde el pago. El criterio exacto de particular frente a patrocinador actual/histórico es OQ-H4-015. Matrícula ANULADO y Ciclo CERRADO/DESIERTO/ANULADO requieren OQ-H4-004/005: H3 restringe edición académica, pero eso no demuestra por sí solo la política de cobro.

**Criterios de aceptación:** DB verifica matrícula, pertenencia, estado de Ciclo y condición de particular bajo el mismo protocolo concurrente. Ningún estado pendiente se habilita por conveniencia técnica.
## REQ-H4-007 — Compatibilidad financiera con mutaciones H3

Antes de construir H4 se resuelve la interacción con descuento, retiro/reagregado opcional, traslado de Ciclo, patrocinador y anulación de matrícula (OQ-H4-003/004/016). Sin DELETE de historia ni migración silenciosa de aplicaciones entre cargos nuevos. No habilitar disminución de base por debajo de lo abonado ni perder pagos al ocultar cargos inactivos.

**Criterios de aceptación:** La política acordada se verifica para cada ruta H3 relevante, también concurrente con pagar. Si requiere restringir H3, documentarlo para revisión en este Spec; este trabajo no modifica H3 ni asume aprobación de esas restricciones.
## REQ-H4-008 — Fecha y concepto

HU13 requiere fecha y concepto. Separar timestamp de registro/actor, generados por DB, de fecha de operación financiera según OQ-H4-007. Concepto como referencia a cargo(s), descripción u otra semántica mínima queda en OQ-H4-009; no crea un concepto tarifario ni un nuevo cargo.

**Criterios de aceptación:** Se valida fecha real y concepto conforme a decisión explícita, con longitudes y límites fijados antes de Gate 1. Datos de operación no cambian en un reenvío equivalente ni sustituyen fecha/actor de auditoría.
## REQ-H4-009 — Medios de pago

Registrar declarativamente el medio requerido por HU13, sin integración Yape/Plin/bancos ni validación de cobro externo. Reutilizar preferentemente catalogo/catalogo_valor de H3, sin motor de mantenimiento. Semilla exacta, vigencia y responsables de mantenimiento: OQ-H4-008.

**Criterios de aceptación:** Nueva selección debe pertenecer al catálogo correcto y estar activa; FK genérica sola no basta. Un cambio posterior de etiqueta/vigencia no reescribe la identificación histórica del medio del pago confirmado.
## REQ-H4-010 — Registro transaccional

Una sola RPC de escritura financiera concreta registra pago, aplicación elegida, avance de versión cuando corresponda y auditoría, en una transacción. Servidor recalcula pendiente desde datos confiables y valida todo antes de commit. React no encadena inserciones de pago/aplicación/auditoría ni recibe autoridad para saldos, estados o actor.

**Criterios de aceptación:** O se confirman todos los efectos una vez, o no queda ninguno. El registro devuelve UUID y datos financieros autorizados suficientes para comprobar resultado; confirmación en pantalla de pago parcial/completo se basa en proyección servidor.
## REQ-H4-011 — Identidad idempotente

El pago debe resistir duplicados por reenvío. Evaluar una idempotency key UNIQUE persistida junto al pago, sin registro genérico adicional. Emisor/formato/unicidad/alcance/duración de la clave: OQ-H4-010. Misma clave y contenido equivalente recupera la misma operación; contenido distinto jamás se interpreta silenciosamente como un nuevo pago. Respuesta/normalización de conflicto: OQ-H4-011.

**Criterios de aceptación:** Pruebas de mismo contenido, diferente contenido y simultaneidad demuestran un único efecto financiero y una sola auditoría de alta. No regenerar automáticamente la clave al perder la respuesta.
## REQ-H4-012 — Respuesta ambigua y recuperación

Una respuesta perdida tras commit debe recuperarse sin riesgo de nuevo cobro. Consultar resultado por identidad de operación bajo autorización actual y reenvío explícito de la misma operación cuando corresponda; no retries financieros silenciosos. Persistencia/recuperación de clave tras recarga/cambio de sesión se cierra con OQ-H4-010/011.

**Criterios de aceptación:** Distinguir confirmado, rechazado con certeza y resultado desconocido. Ausencia temporal en una consulta no equivale a rollback: conservar clave y no ofrecer crear otro pago hasta resolver o reconocer explícitamente la incertidumbre.
## REQ-H4-013 — Concurrencia y locks

Disciplinar todas las escrituras que alteran deuda/cobros con un bloqueo estable sobre matrícula y orden compatible H3, además de unicidad e aislamiento elegido. Recalcular saldo dentro de la transacción protegida, no desde caché o un precheck. SERIALIZABLE heredado se conserva como diseño recomendado; conflictos son explícitos.

**Criterios de aceptación:** Dos pagos 70 y 60 sobre saldo 100 nunca producen 130; se acepta solo lo que cabe o se rechaza por saldo/serialización. Probar conexiones separadas, misma clave y choque con descuento/traslado/retiro/anulación, sin deadlocks evitables ni retry oculto.
## REQ-H4-014 — Rollback completo

Fallo en pago, aplicación, validación diferida o auditoría revierte los efectos del intento, incluidas versiones/cualquier reserva transaccional de clave. Un fallo confirmado no deja dinero aplicado ni un éxito de auditoría. No hay llamadas externas dentro de la transacción.

**Criterios de aceptación:** Inyectar fallos controlados solo en entorno desechable de prueba; comparar estado antes/después. Un intento revertido con la misma clave puede resolverse conforme al protocolo de recuperación sin duplicar éxitos.
## REQ-H4-015 — Auditoría atómica y minimización

Reutilizar public.auditoria con proyección explícita de pago/aplicación; actor y timestamp DB, evento, referencias y contexto suficientes para rastrear una operación. Campos económicos y lectores exactos requieren OQ-H4-013 por la visibilidad previa de auditoría H2. No trigger genérico que copie alumno_snapshot, ficha, contactos, secretos o payload completo.

**Criterios de aceptación:** Auditoría y pago comparten commit/rollback; reenvío no genera segunda alta financiera. Revisar que cada rol vea solo información autorizada y que errores/logs no dupliquen datos personales ni información financiera innecesaria.
## REQ-H4-016 — Consulta e historial

Consultar matrícula, ciclos asociados, cargos según perímetro, pagos y aplicaciones necesarias, total abonado y pendiente; historial paginado y orden estable por registro DB e ID. Separar fecha de operación de fecha de registro. No eliminar pagos/historia ni suprimir un pago porque el cargo cambió de estado.

**Criterios de aceptación:** Una lectura DB consistente no mezcla agregados de instantes distintos. Estado completo se muestra al cumplir la ecuación aprobada, no por bandera mutable cliente. Solo historial operativo en pantalla; no informes amplios ni exportación.
## REQ-H4-017 — UX coherente y accesibilidad

Reutilizar ficha de matrícula/Ciclo y estándar de grilla/búsqueda/acciones existente, sin duplicar módulos de deuda. Propuesta: sección Pagos en ficha individual con resumen e historial y acción Registrar pago breve. Ubicación final/formulario condicionado a OQ de aplicación. Mantener borrador al fallar, bloqueo de doble clic, foco/errores inline/teclado y temas H2.

**Criterios de aceptación:** Operador identifica alumno/matrícula/Ciclo y saldo de referencia antes de confirmar. Medio declarativo no afirma cobro automático. Confirmación/mensajes no exponen SQL y permiten resolver resultado desconocido con la misma clave. Ensayo humano móvil/escritorio, cuatro temas y forced-colors real independiente.
## REQ-H4-018 — Errores, versión y frontera de seguridad

Errores seguros distinguibles para validación, exceso de saldo, autorización, versión/serialización, clave reutilizada con contenido distinto y resultado desconocido. No exponer saldo o existencia ajenos al rol autorizado. Conservar optimistic concurrency H3 y resolver su interacción con replay idempotente (DES-H4-011/013).

**Criterios de aceptación:** En nuevas operaciones un borrador obsoleto no se acepta automáticamente. Recuperación de una operación ya confirmada no se convierte en otra escritura ni se invalida únicamente por la versión que ella misma avanzó. No secretos/PII en URL, almacenamiento persistente del borrador o logs.
## REQ-H4-019 — Pruebas progresivas y regresión

Construcción futura prueba por bloques modelo/validación, roles, comando/rollback, idempotencia, concurrencia y UI; integra H1/H2/H3 vigentes y sus enmiendas. No correr suites con fixtures persistidos sobre la base de pruebas humanas; usar CI/base desechable o transacciones verificadas de rollback.

**Criterios de aceptación:** Antes de candidato técnico: lint/typecheck/unit/build, local integration, RLS/security, invariantes, respuestas ambiguas y 70+60 demostrados. En esta fase solo se comprueban documentos; todos los TEST permanecen NO EJECUTADOS.
## REQ-H4-020 — Gates, evidencia y mantenibilidad

Gate 1 requiere decisiones humanas sobre todas las OQ bloqueantes y aceptación del Spec exacto. Gate 2 futuro requiere candidato/CI exactos, evidencia técnica y humana sin ejecuciones inventadas, inventario y residual explícito. Revisar costo de entender UI→RPC→permisos→locks→aplicación→auditoría.

**Criterios de aceptación:** No acceptance ni construcción ahora. No solución si deriva a API oculta, ledger genérico, nuevos servicios o capas no previstas: detener expansión y reportar. H5+ no se inicia por terminar H4.
## OQ bloqueantes para revisión humana

**OQ-H4-001 a OQ-H4-017: ABIERTAS / SIN DECISIÓN HUMANA.** Las recomendaciones son propuestas para discutir, no decisiones cerradas. Gate 1 no se asume ni se recomienda aprobar con política financiera incompleta. Resolverlas en una revisión documental consistente de los cuatro archivos antes de construir; puede reducirse el modelo al elegir una alternativa.

| OQ | Pregunta y fundamento | REQ-H4 afectados |
| --- | --- | --- |
| OQ-H4-001 — Unidad de aplicación | ¿El pago se aplica globalmente a la matrícula o a uno/más matricula_cargo? Elegir una sola alternativa; HU13 habla de deuda por Ciclo y concepto, sin resolver granularidad. | 004, 010, 016 |
| OQ-H4-002 — Distribución entre cargos | Si se elige cargo: ¿imputación manual o automática? Si automática, ¿qué prioridad, desempate, tratamiento de parcial y cargos a cero? No asumir FIFO, obligatorio primero ni proporcional. Si global, declarar esta OQ no aplicable humanamente. | 004, 010 |
| OQ-H4-003 — Cargos inactivos con aplicaciones | ¿Una obligación aplicada sigue exigible al inactivar el cargo por retiro/traslado? ¿Se bloquea la inactivación, conserva deuda histórica u otra política sin devolución/reasignación silenciosa? Decidir también inactivos previos a H4 sin pagos. | 003, 007, 016 |
| OQ-H4-004 — Matrícula ANULADO | ¿Se admiten pagos sobre matrícula anulada? ¿Se permite anular una matrícula con pagos? ¿Cómo se presenta el saldo/historia? H3 permite anulación sin reglas financieras; no inventar reversos. | 006, 007 |
| OQ-H4-005 — Estado del Ciclo | ¿Se cobra con Ciclo CERRADO? Precisar PROGRAMADO/EN_CURSO y otros terminales DESIERTO/ANULADO, sin confundir cierre académico con obligación financiera. | 006 |
| OQ-H4-006 — Corrección/anulación de pago confirmado | ¿Se incluye una corrección/anulación en H4 o queda fuera y el pago confirmado es solo consulta? Si se incluye, fijar permisos, motivo, estados, efecto en aplicaciones/saldo/idempotencia y auditoría; sin devoluciones/notas de crédito ni borrado. No crear otra RPC/flujo sin esa decisión. | 004, 010, 014, 015, 016 |
| OQ-H4-007 — Fecha de operación | ¿Fecha del pago es día de operación o timestamp? ¿Qué fechas pasadas/futuras se admiten, zona y límites? Registro DB y actor siempre son independientes; propuesta de negocio local America/Lima requiere confirmación para operación. | 008, 011 |
| OQ-H4-008 — Medios de pago | ¿Lista inicial exacta? HU13 enumera ejemplos abiertos. ¿Quién puede crear/activar/inactivar y desde qué mantenimiento existente? ¿Solo semilla versionada o una operación mínima autorizada? ¿Es necesario número de operación/referencia y con qué reglas? No integra proveedores ni adjuntos. | 009, 002 |
| OQ-H4-009 — Concepto de HU13 | ¿Se deriva de cargo(s), se elige referencia existente o es descripción? ¿Obligatorio, longitud y contenido? Evitar nueva tarifa o cargo libre y doble captura si la aplicación ya define el concepto. | 004, 008 |
| OQ-H4-010 — Clave idempotente y continuidad | ¿UUID opaco generado por cliente y UNIQUE global, o ámbito diferente? ¿Duración/retención, quién puede recuperar y cómo se conserva tras recarga/cambio de sesión/dispositivo? Propuesta: clave estable ligada al pago, sin caducidad/reutilización automática, no credencial. | 011, 012, 002 |
| OQ-H4-011 — Misma clave con contenido diferente | ¿Se rechaza como conflicto de idempotencia? Es la recomendación segura; definir contenido semántico/normalización, campos de transporte excluidos, respuesta y operación original recuperable sin filtraciones. Nunca permitir dos pagos para la misma identidad. | 011, 012, 018 |
| OQ-H4-012 — Permisos financieros exactos | HU13 propone Director/Coordinador para registrar. Confirmar registrar, saldo/historial, recuperar por clave, medios y eventual corrección para cada rol; multirol y acceso del Admin solo a auditoría mínima si corresponde. La matriz original tiene signos ambiguos. | 002, 009, 015, 016 |
| OQ-H4-013 — Contenido financiero de auditoría | ¿Qué importes, aplicaciones, concepto, medio y referencia se guardan en auditoría y quién los consulta, considerando lectores H2 incluidos administradores? Propuesta mínima: actor/fecha/evento/UUID y contexto; detalle financiero en pago/aplicaciones bajo permisos. No PII ni copias de fichas. | 015, 002 |
| OQ-H4-014 — Moneda, escala y cotas | ¿Confirmar soles, escala de dos decimales y cota compatible con numeric(12,2) de cargos H3? ¿Rechazar exceso de precisión sin redondeo? No introducir divisas/conversión; si la decisión excede H4, revisar alcance antes de Gate 1. | 005, 008 |
| OQ-H4-015 — Definición de alumno particular | ¿Exigir empresa_patrocinadora_id nulo en matrícula al pagar? ¿Puede un alumno pagar personalmente una matrícula patrocinada? ¿Qué pasa si se cambia patrocinador después? H4 no implementa pagos/facturas de empresas ni distribución de responsabilidades. | 006, 007 |
| OQ-H4-016 — Mutaciones H3 después del pago | Para descuento nuevo/aumentado/reducido, opciones, traslado, patrocinador y anulación: ¿qué se permite con pagos previos y con qué límites? Recomendada revisión bajo mismo lock; ninguna elección puede volver negativo el pendiente ni borrar/trasladar aplicaciones tácitamente. | 007, 013 |
| OQ-H4-017 — Perímetro de deuda y saldos históricos | ¿La base inicial incluye solo cargos activos o también obligaciones históricas? Tras traslado, ¿seguimiento por matrícula, por Ciclo original de cargo u otro recorte? ¿Qué significa abonado y completo en cada vista? Evitar contar el mismo pago en origen/destino o borrar deuda al filtrar. | 003, 004, 007, 016 |

## Exclusiones expresas

HU14/HU15, facturas/pagos de patrocinadores y distribución entre facturas; SUNAT/facturación electrónica; comprobantes/PDF/H5; adjuntos/Storage; informes amplios, Excel/exportaciones; caja/bancos/conciliación, cuentas contables, pasarela o integración con proveedores; devoluciones/notas de crédito; deuda por varias matrículas; multiinstitución; notificaciones, descuentos por workflow; EVOL-001/002 y H5+. No event sourcing, ledger genérico, CQRS, colas, Lambda, Edge Functions, backend adicional ni microservicios. Corrección de pago no se incorpora por defecto: OQ-H4-006 decide su mínimo o diferimiento sin habilitar exclusiones.

## Trazabilidad

Cada REQ-H4-n corresponde a DES-H4-n y TASK-H4-n; los TEST asociados y dependencias están en [tasks](tasks.md) y [test-plan](test-plan.md). [Design](design.md) separa invariantes fijos de propuestas sujetas a OQ. Ninguna cota, estado o permiso pendiente se completa por suposición en construcción.

**H4: SOLO SPEC. PENDIENTE DE OQ, REVISIÓN HUMANA Y GATE 1. NO AUTORIZADO PARA CONSTRUCCIÓN.**
