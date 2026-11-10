# H4 — Pagos: test-plan

Versión 0.2 · 09/11/2026 (America/Lima).

**TODOS LOS TEST: NO EJECUTADOS. 17 OQ RESUELTAS. CONSTRUCCIÓN BLOQUEADA POR GATE 1.**

## Preparación futura y evidencia

[Requirements](requirements.md) registra decisiones, alcance y C-H4-001; [design](design.md) modelo/contratos definitivos para revisión y [tasks](tasks.md) dependencias. No se conservan pruebas de aplicación global o reparto automático como alternativas: solo se comprueba explícitamente su ausencia. Se añaden casos 046–055 para anulación/restricciones nuevas e interacción manual. La frontera C-H4-001 no se cierra por suposición; precisar antes de Gate 1.

Entorno futuro Supabase/PostgreSQL aislado y datos sintéticos, cinco medios autorizados, actores con JWT ordinarios. Admin solo prepara/observa fallos acotados y no demuestra permiso final. No reset ni suites con residuos sobre base humana. Cleanup/restauración incluso con fallo; no confundir eliminar identidades con limpiar negocio. Evidencia segura, sin secretos, fichas, payload financiero o identificadores personales en logs.

Concurrencia con conexiones/transacciones independientes y barrera real, no ejecución serial ni Promise.all sobre misma conexión. Medir filas/aplicaciones/estados/versiones/auditoría/saldo, no solo HTTP. 70+60 sobre100 es obligatorio. SERIALIZABLE/conflicto explícito puede proteger invariante, sin retry oculto o reducción automática.

Commit con respuesta perdida y rollback son distintos. Mantener clave del registro y recuperar resultado; anulación incierta se consulta por id/estado sin idempotency key nueva. Una consulta vacía no demuestra rollback. Revisar privacidad/RLS de proyección y estado ANULADO sin resurrección de registro.

Revisión humana futura debe registrar SHA, roles, pasos, navegador/SO, resultados/limitaciones, teclado/temas/móvil y forced-colors real separado de DOM. No tomar OK de H3 como prueba H4 ni inventar ejecución de Gate 2. Esta fase solo verifica documentos.

## TEST-H4-001 — Documental: decisiones, base y alcance

- Tipo: Documental.
- Trazabilidad: REQ-H4-001 → DES-H4-001 → TASK-H4-001; REQ-H4-020 → DES-H4-020 → TASK-H4-020.
- Escenario y resultado esperado: Revisar base 143ea773e9ff77a7c52944fcc25b620f351c17ef, 17 OQ RESUELTAS con decisión humana, cuatro Markdown, links/IDs/dependencias y C-H4-001. No implementación/H3/PLAN/acceptance/merge. Gate 1 no concedido.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-002 — Matriz financiera positiva

- Tipo: Seguridad/RLS.
- Trazabilidad: REQ-H4-002 → DES-H4-002 → TASK-H4-002.
- Escenario y resultado esperado: JWT ordinario Director y Coordinador: ambos registran/consultan saldo e historial/recuperan; solo Director anula. Multirol respeta capacidades activas; actor y timestamps DB.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-003 — Roles y sesiones denegadas

- Tipo: Seguridad/RLS.
- Trazabilidad: REQ-H4-002 → DES-H4-002 → TASK-H4-002.
- Escenario y resultado esperado: Anónimo, token inválido/expirado, usuario/rol inactivo, solo rol técnico y Admin sin rol financiero: registro/lectura/recuperación/anulación denegados. Metadata, actor o rol forjados no autorizan.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-004 — Bypass directo y RPC concretas

- Tipo: Seguridad/RLS.
- Trazabilidad: REQ-H4-002 → DES-H4-002 → TASK-H4-002; REQ-H4-018 → DES-H4-018 → TASK-H4-018.
- Escenario y resultado esperado: Cliente intenta INSERT/UPDATE/DELETE/TRUNCATE de pago/aplicación y auditoría, EXECUTE anónimo y campos fuera de whitelist. Rechazo DB; dos comandos concretos con owner/search_path/grants seguros, sin SQL dinámico ni endpoint genérico.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-005 — Deuda inicial de cargos activos

- Tipo: Integración.
- Trazabilidad: REQ-H4-003 → DES-H4-003 → TASK-H4-003.
- Escenario y resultado esperado: Matrícula con cargos activos a cero y positivos, retirados previos sin pago y sin abonos: base suma solo importe_final activo, abonado cero y pendiente igual base. No pago de apertura ficticio, deuda persistida ni cálculo desde tarifas actuales.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-006 — Tarifas e historia económica

- Tipo: Integración.
- Trazabilidad: REQ-H4-003 → DES-H4-003 → TASK-H4-003; REQ-H4-007 → DES-H4-007 → TASK-H4-007.
- Escenario y resultado esperado: Cambiar catálogo/defaults/ciclo_tarifa y etiquetas: no recalcular cargo histórico ni pago/aplicación. Cargo retirado sin pago fuera de base; pago anulado conserva historia y no abona. No truncar saldo inconsistente a cero.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-007 — Modelo por cargo obligatorio

- Tipo: Modelo/invariantes.
- Trazabilidad: REQ-H4-004 → DES-H4-004 → TASK-H4-004.
- Escenario y resultado esperado: pago con una matrícula y pago_aplicacion obligatoria; UUID/origen conservados. No alternativa global, tabla deuda/saldo, aplicación entre matrículas ni estructura de comandos/reversos genérica.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-008 — Aplicaciones manuales y sumas

- Tipo: Modelo/invariantes.
- Trazabilidad: REQ-H4-004 → DES-H4-004 → TASK-H4-004; REQ-H4-005 → DES-H4-005 → TASK-H4-005.
- Escenario y resultado esperado: Aplicar parcial/total a uno/más cargos activos propios; suma exacta al importe de pago. Rechazar cargos duplicados/ajenos/inexistentes/inactivos, cero/negativo, suma diferente y exceso individual aunque el saldo global alcance. No crear aplicaciones a cero o monto sin imputar.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-009 — PEN: parcial y exacto

- Tipo: Automatizada/DB.
- Trazabilidad: REQ-H4-005 → DES-H4-005 → TASK-H4-005.
- Escenario y resultado esperado: Decimal exacto hasta dos decimales y compatible numeric(12,2), pago parcial o saldo exacto; conceptos/saldo concilian. No float ni redondeo. Si seleccionar todos excede cota de una operación, debe corregirse explícitamente sin fraccionamiento automático.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-010 — Importes inválidos y precisión extra

- Tipo: Automatizada/DB.
- Trazabilidad: REQ-H4-005 → DES-H4-005 → TASK-H4-005.
- Escenario y resultado esperado: Cero, negativo, nulo, NaN/infinito, overflow, sintaxis alterada y 100.000 se rechazan antes de conversión; no redondeo automático. Exceso de saldo global o de cargo incluso por S/0.01: sin pagos/aplicaciones/eventos ni avances de versión.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-011 — Pago con y sin patrocinador

- Tipo: Integración/seguridad.
- Trazabilidad: REQ-H4-006 → DES-H4-006 → TASK-H4-006; REQ-H4-007 → DES-H4-007 → TASK-H4-007.
- Escenario y resultado esperado: Ambas matrículas ACTIVO admiten pago particular si Ciclo elegible. No distribuir responsabilidad/deuda alumno/empresa ni crear factura o pago empresarial. Validar matrícula real y pertenencia de cargos; contexto Ciclo cliente no suplanta relación DB.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-012 — Matrícula ANULADO de solo consulta

- Tipo: Integración.
- Trazabilidad: REQ-H4-006 → DES-H4-006 → TASK-H4-006; REQ-H4-007 → DES-H4-007 → TASK-H4-007; REQ-H4-010 → DES-H4-010 → TASK-H4-010.
- Escenario y resultado esperado: Conservar historia y denegar pagos nuevos, anulación de pago incluso Director, descuentos/cargos/opciones/patrocinador y otras mutaciones. H3 permite anular matrícula ACTIVO conforme a sus reglas; si se anula con pagos, no reversarlos y después congelarlos también.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-013 — Ciclos elegibles para cobro

- Tipo: Integración.
- Trazabilidad: REQ-H4-006 → DES-H4-006 → TASK-H4-006.
- Escenario y resultado esperado: Registrar sobre PROGRAMADO/EN_CURSO/CERRADO y rechazar DESIERTO/ANULADO. CERRADO conserva pendiente y admite cobro; no reabre edición académica H3. Validar estado DB bajo lock, no por UI.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-014 — Retiro de cargo parcialmente o totalmente pagado

- Tipo: Integración.
- Trazabilidad: REQ-H4-007 → DES-H4-007 → TASK-H4-007; REQ-H4-003 → DES-H4-003 → TASK-H4-003.
- Escenario y resultado esperado: Con al menos una aplicación vigente de pago CONFIRMADO, retirar/inactivar cargo se rechaza, incluso parcial; no mover aplicación ni sustituir UUID al reagregar. Cargo sin pagos conserva H3. Tras anular todos los pagos, frontera exacta C-H4-001 requiere precisión humana antes de fijar resultado; no elegirla tácitamente.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-015 — Descuento con aplicaciones vigentes

- Tipo: Integración/seguridad.
- Trazabilidad: REQ-H4-007 → DES-H4-007 → TASK-H4-007; REQ-H4-005 → DES-H4-005 → TASK-H4-005.
- Escenario y resultado esperado: Director puede variar descuento respetando original y nuevo final ≥ aplicado vigente. Igualdad aceptada y por debajo rechazo; Coordinador no adquiere permiso de descuento. Pagos/cargos históricos no se recalculan por tarifa actual.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-016 — Traslado con pagos registrados

- Tipo: Integración/regresión.
- Trazabilidad: REQ-H4-007 → DES-H4-007 → TASK-H4-007; REQ-H4-006 → DES-H4-006 → TASK-H4-006; REQ-H4-016 → DES-H4-016 → TASK-H4-016.
- Escenario y resultado esperado: Con al menos una fila pago, CONFIRMADO o ANULADO, cambiar Ciclo de matrícula se rechaza; no transferir/reasignar aplicaciones ni duplicar abonos. Sin filas pago, H3 mantiene reglas de traslado, UUID nuevos y descuento cero.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-017 — Único timestamp de pago DB

- Tipo: Automatizada/DB.
- Trazabilidad: REQ-H4-008 → DES-H4-008 → TASK-H4-008.
- Escenario y resultado esperado: Formulario sin fecha manual; RPC rechaza fecha_operacion/created_at/actor forjados. Registro timestamp PostgreSQL inmutable, presentación America/Lima sin cambio del instante. Anulación guarda timestamp propio y no reescribe el de pago.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-018 — Concepto derivado y observaciones

- Tipo: Automatizada/DB.
- Trazabilidad: REQ-H4-008 → DES-H4-008 → TASK-H4-008; REQ-H4-004 → DES-H4-004 → TASK-H4-004.
- Escenario y resultado esperado: Conceptos vienen de cargos seleccionados vía aplicaciones, sin input concepto libre ni cargo creado por notas. Observaciones opcionales ≤500, trim/vacío→NULL, texto plano escapado y caso conservado; no condicionan reparto, estado o importe. Confirmado no editable.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-019 — Cinco medios e historia

- Tipo: Integración.
- Trazabilidad: REQ-H4-009 → DES-H4-009 → TASK-H4-009.
- Escenario y resultado esperado: Seed MEDIO_PAGO con Efectivo/Yape/Plin/Transferencia bancaria/Tarjeta en catálogo genérico. Pago conserva ID/código/etiqueta DB; cambios/inactivaciones posteriores no reescriben pago ni bloquean recuperación. No llamadas a proveedores.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-020 — Medio inválido y sin mantenimiento H4

- Tipo: Seguridad/DB.
- Trazabilidad: REQ-H4-009 → DES-H4-009 → TASK-H4-009; REQ-H4-002 → DES-H4-002 → TASK-H4-002.
- Escenario y resultado esperado: UUID de otro catálogo/inexistente/inactivo y etiqueta histórica forjada: rechazo al alta. No mantenimiento específico de medios, nuevos valores no autorizados ni referencias/adjuntos bancarios exigidos. Lectura histórica no requiere que medio siga activo.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-021 — Registro atómico por una llamada

- Tipo: Integración.
- Trazabilidad: REQ-H4-010 → DES-H4-010 → TASK-H4-010.
- Escenario y resultado esperado: Una RPC crea pago CONFIRMADO, una o más aplicaciones, versión y evento mínimo; saldo final DB. Pago parcial/total devuelve identidad y estado, no un comprobante fiscal/PDF. Si falla un paso, no hay resultado parcial.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-022 — Manipulación del cliente

- Tipo: Seguridad/API.
- Trazabilidad: REQ-H4-010 → DES-H4-010 → TASK-H4-010; REQ-H4-005 → DES-H4-005 → TASK-H4-005; REQ-H4-018 → DES-H4-018 → TASK-H4-018.
- Escenario y resultado esperado: Forjar saldo/total previo/estado/actor/descuento/precios, campos desconocidos o asignación ajena. Whitelist y validación backend rechazan; importe solicitado debe igualar suma validada DB y no exceder pendientes. UI nunca coordina insert de cada entidad.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-023 — UUID idempotente permanente

- Tipo: Automatizada/integración.
- Trazabilidad: REQ-H4-011 → DES-H4-011 → TASK-H4-011.
- Escenario y resultado esperado: UUID opaco frontend oculto/no editable, UNIQUE global y ligado para siempre al pago; sin TTL/reutilización/PII/datos de negocio ni tabla de comandos. Validar formato/ausencia y recuperación tras recarga con solo identidad mínima aislada por usuario.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-024 — Misma clave y contenido equivalente

- Tipo: Integración.
- Trazabilidad: REQ-H4-011 → DES-H4-011 → TASK-H4-011.
- Escenario y resultado esperado: Reenviar mismo contenido normalizado: mismo pago_id y datos originales, sin nueva aplicación/evento/avance de versión. Orden de aplicaciones y 10/10.0/10.00 equivalentes; versión de transporte y actor/timestamp DB no cambian identidad. Recuperar pago ANULADO sin recrearlo.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-025 — Misma clave y contenido distinto

- Tipo: Integración/seguridad.
- Trazabilidad: REQ-H4-011 → DES-H4-011 → TASK-H4-011; REQ-H4-018 → DES-H4-018 → TASK-H4-018.
- Escenario y resultado esperado: Cambiar matrícula/importe/medio/notas normalizadas o aplicaciones: conflicto y rechazo sin mutación, sin actualizar original ni emitir otra clave. No aceptar un hash cliente ni divulgar datos no autorizados.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-026 — Commit de registro con respuesta perdida

- Tipo: Integración/fallos.
- Trazabilidad: REQ-H4-012 → DES-H4-012 → TASK-H4-012; REQ-H4-011 → DES-H4-011 → TASK-H4-011.
- Escenario y resultado esperado: Perder solo respuesta después de commit comprobado: UI resultado desconocido conserva UUID; lectura/reenvío explícito recupera misma fila y una sola imputación/evento. Nunca otra alta automática ni compensación.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-027 — Fallo antes del commit de registro

- Tipo: Integración/fallos.
- Trazabilidad: REQ-H4-012 → DES-H4-012 → TASK-H4-012; REQ-H4-014 → DES-H4-014 → TASK-H4-014.
- Escenario y resultado esperado: Rollback comprobado deja cero pagos/aplicaciones/eventos y versiones previas, sin reserva persistida de clave. Resolver mismo intento explícitamente sin confundirlo con commit perdido. No reutilizar UUID ya ligado a otro pago.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-028 — Lectura vacía y recarga durante envío

- Tipo: Integración/UI.
- Trazabilidad: REQ-H4-012 → DES-H4-012 → TASK-H4-012.
- Escenario y resultado esperado: Transacción original en curso y lectura por clave sin fila visible: no afirmar rollback ni crear otra clave automáticamente. Tras recarga restaurar solo identidad opaca/contexto mínimo, consultar DB antes de alta. Sin guardar aplicaciones/notas/importes/ficha/credenciales en sessionStorage o URL.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-029 — Recuperación y cambio de permiso/sesión

- Tipo: Seguridad/integración.
- Trazabilidad: REQ-H4-012 → DES-H4-012 → TASK-H4-012; REQ-H4-002 → DES-H4-002 → TASK-H4-002.
- Escenario y resultado esperado: Revocar rol, expirar token o cambiar identidad tras commit ambiguo: denegar lectura/acción sin sesión vigente y descartar respuesta tardía. Con acceso financiero autorizado, Director/Coordinador recuperan la operación, no solo su creador; clave no es credencial.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-030 — Obligatoria: 70+60 sobre saldo 100

- Tipo: Concurrencia DB/API.
- Trazabilidad: REQ-H4-013 → DES-H4-013 → TASK-H4-013.
- Escenario y resultado esperado: Dos conexiones/transacciones independientes con barrera y claves diferentes: gana 70 o 60 y la otra operación se rechaza por saldo/conflicto; nunca 130 ni pendiente negativo. Verificar pago/aplicaciones/auditoría/versión finales. No reducir 60 a 30 ni retry silencioso.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-031 — Misma clave concurrente

- Tipo: Concurrencia DB/API.
- Trazabilidad: REQ-H4-013 → DES-H4-013 → TASK-H4-013; REQ-H4-011 → DES-H4-011 → TASK-H4-011.
- Escenario y resultado esperado: Dos clientes registran misma clave/contenido con barrera: una sola fila pago y aplicaciones/alta; segundo recupera o recibe conflicto protector resuelto conscientemente con misma clave. Ningún duplicado por espera/serialización.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-032 — Clave global y destinos distintos

- Tipo: Concurrencia/seguridad.
- Trazabilidad: REQ-H4-013 → DES-H4-013 → TASK-H4-013; REQ-H4-011 → DES-H4-011 → TASK-H4-011; REQ-H4-002 → DES-H4-002 → TASK-H4-002.
- Escenario y resultado esperado: Misma UUID global en solicitudes de distintas matrículas/contenidos: UNIQUE y comparación rechazan segunda operación, sin mutar destino ajeno ni duplicar. Solo datos financieros permitidos al actor; no confiar en lock de una matrícula para garantizar unicidad global.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-033 — Pago frente a mutaciones H3

- Tipo: Concurrencia/regresión.
- Trazabilidad: REQ-H4-013 → DES-H4-013 → TASK-H4-013; REQ-H4-007 → DES-H4-007 → TASK-H4-007.
- Escenario y resultado esperado: Barrera pago vs descuento/retiro/traslado/patrocinador/anulación de matrícula y transición de Ciclo. Locks compatibles y relectura evitan sobrepago/estado prohibido o cargo pagado inactivo; conflicto explícito válido, no deadlock sistemático/retry escondido.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-034 — Rollback por etapa de ambas RPC

- Tipo: Integración/rollback.
- Trazabilidad: REQ-H4-014 → DES-H4-014 → TASK-H4-014; REQ-H4-010 → DES-H4-010 → TASK-H4-010.
- Escenario y resultado esperado: Fallo al crear pago/aplicación, validar suma/propiedad, actualizar estado de anulación/versiones o antes de commit: revertir todo el intento. Sin endpoint de fallos, efecto parcial ni alteración de base humana.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-035 — Auditoría falla en registrar o anular

- Tipo: Integración/rollback.
- Trazabilidad: REQ-H4-014 → DES-H4-014 → TASK-H4-014; REQ-H4-015 → DES-H4-015 → TASK-H4-015.
- Escenario y resultado esperado: Inyección aislada de fallo del evento: registro no deja pago/aplicaciones; anulación deja pago CONFIRMADO y abonado intactos. Versiones/controles restaurados incluso si el caso falla; no éxito huérfano ni auditoría asíncrona.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-036 — Dos eventos financieros mínimos

- Tipo: Seguridad/auditoría.
- Trazabilidad: REQ-H4-015 → DES-H4-015 → TASK-H4-015.
- Escenario y resultado esperado: PAGO_REGISTRADO/PAGO_ANULADO con pago_id/matricula_id/usuario/timestamp DB y motivo de anulación. Ausencia de importe/medio/notas/aplicaciones/ficha/payload financiero; Admin conserva solo auditoría mínima y no acceso a tablas financieras. Replay no duplica alta.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-037 — Saldo/historial y RLS coherentes

- Tipo: Integración/seguridad.
- Trazabilidad: REQ-H4-016 → DES-H4-016 → TASK-H4-016; REQ-H4-002 → DES-H4-002 → TASK-H4-002.
- Escenario y resultado esperado: Base/abonado/pendiente DB en snapshot consistente, historial con varias páginas/orden estable y estados. No sumar página visible ni mezclar peticiones. Si falta autorización de cualquier componente financiero, denegar resumen completo, no calcular con pagos ocultos.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-038 — Recuperación tras anulación y otros pagos

- Tipo: Integración.
- Trazabilidad: REQ-H4-016 → DES-H4-016 → TASK-H4-016; REQ-H4-012 → DES-H4-012 → TASK-H4-012; REQ-H4-011 → DES-H4-011 → TASK-H4-011.
- Escenario y resultado esperado: Luego de otros pagos/inactivación de medio/anulación del original, misma clave/contenido devuelve el mismo UUID, timestamp/importe/medio/notas/aplicaciones originales y estado actual ANULADO si aplica. Saldo actual puede diferir; no saldo histórico persistido ni resurrección del pago.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-039 — Pantalla contextual de pago

- Tipo: Automatizada/UI.
- Trazabilidad: REQ-H4-017 → DES-H4-017 → TASK-H4-017; REQ-H4-010 → DES-H4-010 → TASK-H4-010.
- Escenario y resultado esperado: Desde matrícula, resumen e historial, grilla de cargos pendientes, medio y notas; sin fecha/concepto libre. Cancelar sin envío no escribe; confirmado no Editar. Solo Director tiene acción Anular con motivo; anulada matrícula sin mutaciones. Sin módulo deuda, PDF o paso de patrocinador.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-040 — Accesibilidad y privacidad UI

- Tipo: Automatizada/UI.
- Trazabilidad: REQ-H4-017 → DES-H4-017 → TASK-H4-017; REQ-H4-018 → DES-H4-018 → TASK-H4-018.
- Escenario y resultado esperado: Teclado, foco/primer error/restauración/modal, móvil/escritorio y Sistema/Claro/Oscuro/Alto contraste. Estados con texto y dinero legible. Sin PII/payload en logs/URL/localStorage. Forced-colors real necesita ensayo humano, no se infiere de DOM o de aceptación H3.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-041 — Errores y versión obsoleta

- Tipo: Automatizada/integración.
- Trazabilidad: REQ-H4-018 → DES-H4-018 → TASK-H4-018; REQ-H4-012 → DES-H4-012 → TASK-H4-012.
- Escenario y resultado esperado: Precisión/exceso global/individual, permiso/estado, 40001/40P01, clave distinta, ya anulado y transporte ambiguo se distinguen con mensajes seguros. Conservar borrador/clave pertinentes sin renovar versión/reintentar a escondidas ni revelar SQL/datos ajenos.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-042 — Integración aislada y regresión H1–H3

- Tipo: Integración/CI futura.
- Trazabilidad: REQ-H4-019 → DES-H4-019 → TASK-H4-019; REQ-H4-002 → DES-H4-002 → TASK-H4-002; REQ-H4-007 → DES-H4-007 → TASK-H4-007; REQ-H4-020 → DES-H4-020 → TASK-H4-020.
- Escenario y resultado esperado: Futura base desechable desde cero: seed de cinco medios, inventario/grants/RLS, dos RPC, regresión H3 con nuevas restricciones, H4, lint/typecheck/unit/build/build-safety y cleanup incluso fallos. No ejecutar ahora ni dejar fixtures en base humana.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-043 — Revisión humana financiera

- Tipo: Humana futura.
- Trazabilidad: REQ-H4-019 → DES-H4-019 → TASK-H4-019; REQ-H4-017 → DES-H4-017 → TASK-H4-017.
- Escenario y resultado esperado: Revisor prueba imputación manual/parcial/Seleccionar todos, con/sin patrocinador, CERRADO, recuperación, Director anula y Coordinador no, límites H3 y dos sesiones. Registrar SHA/pasos/actor/navegador/SO/temas/teclado/móvil/forced-colors real; si falta ensayo, NO VERIFICADO y decisión residual explícita.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-044 — Revisión arquitectónica humana

- Tipo: Humana futura.
- Trazabilidad: REQ-H4-020 → DES-H4-020 → TASK-H4-020; REQ-H4-013 → DES-H4-013 → TASK-H4-013; REQ-H4-015 → DES-H4-015 → TASK-H4-015.
- Escenario y resultado esperado: Recorrer UI→roles/RLS→locks→cargo/aplicación/pago→auditoría y recuperación; anulación concreta separada sin ledger/reversos/infraestructura preventiva. Inventario/mantenibilidad/costos proporcionales y permiso financiero sin exposición innecesaria. Evidencia independiente, no aprobada por agente.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-045 — Gate 2 futuro

- Tipo: Gate 2 futuro.
- Trazabilidad: REQ-H4-020 → DES-H4-020 → TASK-H4-020.
- Escenario y resultado esperado: Candidato exacto desde Gate 1 humano, CI SUCCESS y evidencia técnica/humana sin inventar casos, riesgos y cierre autorizados por persona. Sin aceptación no acceptance/merge de construcción/H5. Generar este Spec no concede Gate 1 ni Gate 2.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-046 — Director anula pago confirmado

- Tipo: Integración.
- Trazabilidad: REQ-H4-010 → DES-H4-010 → TASK-H4-010; REQ-H4-014 → DES-H4-014 → TASK-H4-014; REQ-H4-015 → DES-H4-015 → TASK-H4-015; REQ-H4-016 → DES-H4-016 → TASK-H4-016.
- Escenario y resultado esperado: Director/matrícula ACTIVO: motivo obligatorio, estado ANULADO, anulado_por/anulado_at DB y versión; pago/aplicaciones/importe/notas/created_at originales intactos. Abonado disminuye exactamente lo anulado y saldo se recupera; un evento mínimo, sin DELETE.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-047 — Anulación denegada por rol o matrícula

- Tipo: Seguridad/DB.
- Trazabilidad: REQ-H4-002 → DES-H4-002 → TASK-H4-002; REQ-H4-006 → DES-H4-006 → TASK-H4-006; REQ-H4-010 → DES-H4-010 → TASK-H4-010.
- Escenario y resultado esperado: Coordinador intenta anular, aun forjando Director, o Director intenta anular pago de matrícula ANULADO: rechazo sin mutaciones/auditoría de éxito. Motivo vacío/excesivo/actor o timestamp forjados también rechazados.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-048 — Anulación única, concurrente y respuesta perdida

- Tipo: Concurrencia/integración.
- Trazabilidad: REQ-H4-010 → DES-H4-010 → TASK-H4-010; REQ-H4-014 → DES-H4-014 → TASK-H4-014; REQ-H4-012 → DES-H4-012 → TASK-H4-012.
- Escenario y resultado esperado: Dos solicitudes de anular mismo pago/versión: una transición/evento, segunda conflicto/ya ANULADO sin nueva liberación. Si se pierde respuesta tras commit, consultar por pago_id/estado/datos DB; no clave nueva ni tabla de comandos.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-049 — Ciclo no pasa a DESIERTO/ANULADO con pagos

- Tipo: Integración/regresión.
- Trazabilidad: REQ-H4-006 → DES-H4-006 → TASK-H4-006; REQ-H4-007 → DES-H4-007 → TASK-H4-007; REQ-H4-013 → DES-H4-013 → TASK-H4-013.
- Escenario y resultado esperado: Intentar ambos estados sobre Ciclo con pago CONFIRMADO o solo pagos ANULADO: rechazo. Preservar además regla H3 que impide anular Ciclo con matrículas aun sin pago. Borrador/UI no son autoridad; disputa concurrente con registrar nunca deja pago en Ciclo prohibido.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-050 — Traslado sigue bloqueado tras anular todos

- Tipo: Integración/regresión.
- Trazabilidad: REQ-H4-007 → DES-H4-007 → TASK-H4-007; REQ-H4-016 → DES-H4-016 → TASK-H4-016.
- Escenario y resultado esperado: Matrícula con única fila pago ANULADO conserva bloqueo de cambio de Ciclo. No limpiar clave/historia, no copiar pagos a destino; sin filas pago se conservan cambios H3 autorizados. Se distingue pago registrado de aplicación vigente.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-051 — Patrocinador mutable sin reasignación

- Tipo: Integración/regresión.
- Trazabilidad: REQ-H4-007 → DES-H4-007 → TASK-H4-007; REQ-H4-006 → DES-H4-006 → TASK-H4-006.
- Escenario y resultado esperado: Con pagos en matrícula ACTIVO y Ciclo editable H3, Director/Coordinador agregan/cambian/quitan empresa con versiones. Pago/aplicaciones/cargos/saldo no se reasignan ni se crea cuenta empresarial. En matrícula ANULADO/otros bloqueos H3, denegar.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-052 — Descuento exacto a lo abonado

- Tipo: Integración/concurrencia.
- Trazabilidad: REQ-H4-007 → DES-H4-007 → TASK-H4-007; REQ-H4-005 → DES-H4-005 → TASK-H4-005; REQ-H4-013 → DES-H4-013 → TASK-H4-013.
- Escenario y resultado esperado: Cargo original 100, aplicado vigente 60: nuevo descuento 40/final60 permitido; descuento40.01/final59.99 rechazado. Tras anular un pago, límite se recalcula de aplicaciones vigentes bajo lock; carrera con nuevo pago no usa un total leído antes.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-053 — Checks, parcial y Seleccionar todos

- Tipo: Automatizada/UI.
- Trazabilidad: REQ-H4-017 → DES-H4-017 → TASK-H4-017; REQ-H4-004 → DES-H4-004 → TASK-H4-004; REQ-H4-005 → DES-H4-005 → TASK-H4-005.
- Escenario y resultado esperado: Marcar propone saldo completo; reducir importe mantiene selección; >0 selecciona; desmarcar pone cero/no fila. Seleccionar todos propone saldo de cada cargo pendiente y permite reducir individualmente. Total suma exacta y backend revalida; sin FIFO/proporcionalidad ni reparto por prioridad.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-054 — Notas y ausencia de fecha/concepto manual

- Tipo: Automatizada/DB.
- Trazabilidad: REQ-H4-008 → DES-H4-008 → TASK-H4-008; REQ-H4-011 → DES-H4-011 → TASK-H4-011; REQ-H4-018 → DES-H4-018 → TASK-H4-018.
- Escenario y resultado esperado: Notas nulas/vacías/500 válidas y 501 rechazadas, trim/caso/escape seguro. No campos fecha_operacion/concepto ni controlador de reglas en notas. Notas distintas con misma clave son contenido diferente; timestamp/actor generados no participan en igualdad.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## TEST-H4-055 — Anular frente a pagar/descontar/congelar

- Tipo: Concurrencia DB/API.
- Trazabilidad: REQ-H4-013 → DES-H4-013 → TASK-H4-013; REQ-H4-007 → DES-H4-007 → TASK-H4-007; REQ-H4-010 → DES-H4-010 → TASK-H4-010; REQ-H4-014 → DES-H4-014 → TASK-H4-014.
- Escenario y resultado esperado: Dos conexiones con barrera: anulación de pago contra nuevo abono, cambio de descuento o anulación de matrícula. Locks y versiones producen estado consistente, sin saldo negativo/doble liberación ni anulación de pago posterior a congelar matrícula. Si matrícula se anula primero, no modificar pago.
- Evidencia futura: candidato/actor y resultado seguro; cuando aplica, filas/versiones/estado/aplicaciones/saldo/auditoría antes y después y ausencia de efectos del rechazo.
- Estado: NO EJECUTADO.

## Cierre futuro

Ningún TEST está ejecutado en esta revisión documental. La evidencia financiera/seguridad/rollback/idempotencia/concurrencia y humana se produce tras Gate 1. TEST-H4-044/045 requieren revisión/decisión humana independientes. No se crea acceptance ni se construye H4/H5.

**SOLICITAR REVISIÓN Y GATE 1; NO ASUMIR APROBACIÓN.**
