# H4 — Pagos: test-plan

Versión 0.1 · 09/11/2026 (America/Lima).

**TODOS LOS CASOS: NO EJECUTADOS. SPEC CON OQ ABIERTAS. CONSTRUCCIÓN BLOQUEADA POR GATE 1.**

## Preparación futura y evidencia

Este documento describe pruebas a implementar/ejecutar después de Gate 1. [Requirements](requirements.md) define invariantes y OQ; [design](design.md) contratos/modelos propuestos; [tasks](tasks.md) dependencias. Casos dependientes de una decisión usan exactamente la alternativa aprobada: ahora no se suponen PASSED ni se descartan por conveniencia. Un subcaso de alternativa descartada solo puede constar NO APLICA con referencia a decisión humana.

Entorno: Supabase/PostgreSQL aislado y datos sintéticos, con seed de medios expresamente aprobado. JWT ordinario por actor para permiso/RLS; SQL administrativo solo prepara/observa/injecta fallos controlados en entorno desechable, no prueba autorización. No reset ni suites persistentes sobre base humana. Conservar versiones/IDs técnicos e importes sintéticos para comparar; no tokens, contraseñas, documentos ni snapshot personal en logs/evidencia.

Concurrencia exige conexiones/transacciones independientes, barrera reproducible y fixture de saldo conocido; no peticiones seriales ni una sola conexión con Promise.all. Afirmar invariante por filas/aplicaciones/auditoría/versión y saldo final, no solo HTTP. La prueba 70+60 sobre 100 es obligatoria; conflictos explícitos protegen el saldo y no se esconden con retries.

Fallo de transporte y rollback son casos distintos. Se verifica el commit real para simular pérdida de respuesta, se conserva clave y se demuestra recuperación sin efecto financiero adicional. En rollback se contrastan filas/versión/auditoría antes y después. Cleanup y restauración de controles incluso si falla el escenario; sin endpoint público de fallos.

Humano: registrar candidato exacto, actor, pasos, entradas sintéticas, navegador/SO, resultado y limitaciones. No reutilizar OK de H3 como ensayo de H4 ni marcar forced-colors real si no se probó. Gate 2 es decisión humana independiente posterior.

## Matriz completa

## TEST-H4-001 — Documental: base, límites y cobertura

- Tipo: Documental.
- Trazabilidad: REQ-H4-001 → DES-H4-001 → TASK-H4-001.
- Escenario y resultado esperado: Revisar main base ba81106837de881b2b243e28b862dfd4a315a949, H3 cerrado, cuatro Markdown únicamente, enlaces, IDs y dependencias. Resultado esperado: Spec completo, OQ abiertas y ninguna implementación/aceptación de H4 ni cambio de H3.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-002 — Actores financieros permitidos

- Tipo: Seguridad/RLS.
- Trazabilidad: REQ-H4-002 → DES-H4-002 → TASK-H4-002.
- Escenario y resultado esperado: Con JWT ordinario por cada rol de la matriz aprobada OQ-H4-012, registrar/leer/recuperar solo capacidades y objetos autorizados. Matriz propuesta no equivale a permiso antes de decisión humana.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-003 — Roles y sesiones denegadas

- Tipo: Seguridad/RLS.
- Trazabilidad: REQ-H4-002 → DES-H4-002 → TASK-H4-002.
- Escenario y resultado esperado: Anónimo, token inválido/expirado, usuario o rol inactivo, rol técnico y Admin sin permiso financiero: alta y lectura sensibles rechazadas. Claims/rol/actor en payload no escalan permisos; multirol solo suma capacidades aprobadas.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-004 — Bypass directo y RPC definer

- Tipo: Seguridad/RLS.
- Trazabilidad: REQ-H4-002 → DES-H4-002 → TASK-H4-002; REQ-H4-018 → DES-H4-018 → TASK-H4-018.
- Escenario y resultado esperado: Intentar INSERT/UPDATE/DELETE/TRUNCATE sobre pago/aplicación y alteración de auditoría con cliente. Rechazo efectivo DB sin cambios; grants/owner/search_path/whitelist y policies no permiten bypass ni EXECUTE anon.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-005 — Deuda inicial desde cargos

- Tipo: Integración.
- Trazabilidad: REQ-H4-003 → DES-H4-003 → TASK-H4-003.
- Escenario y resultado esperado: Matrícula con cargos H3 conocidos, sin pagos: proyección concilia base/abonado/pendiente según OQ-H4-017, incluyendo cargos a cero y referencias históricas. No fila deuda ni saldo duplicado, pagos de apertura ficticios o importes del catálogo actual.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-006 — Tarifas e historia económica

- Tipo: Integración.
- Trazabilidad: REQ-H4-003 → DES-H4-003 → TASK-H4-003; REQ-H4-007 → DES-H4-007 → TASK-H4-007.
- Escenario y resultado esperado: Variar default/etiqueta/vigencia de tarifa y configuración de Ciclo: cargos históricos y su deuda no se recalculan. Con inactivos, presentar deuda/saldo conforme a OQ-H4-003/017; nunca ocultar inconsistencia usando máximo con cero.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-007 — Modelo mínimo elegido

- Tipo: Modelo/invariantes.
- Trazabilidad: REQ-H4-004 → DES-H4-004 → TASK-H4-004.
- Escenario y resultado esperado: Tras OQ-H4-001, verificar alternativa global sin tabla aplicación redundante, o aplicación por cargo con FKs/propiedad y UUID estable. Si se incluye corrección, solo modelo expresamente aprobado en OQ-H4-006.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-008 — Aplicaciones y sumas

- Tipo: Modelo/invariantes.
- Trazabilidad: REQ-H4-004 → DES-H4-004 → TASK-H4-004; REQ-H4-005 → DES-H4-005 → TASK-H4-005.
- Escenario y resultado esperado: Si hay cargos: pago parcial aplicado a uno/más destinos válidos, suma exacta; rechazar cargo ajeno, repetido, inexistente, inactivo no elegible, suma distinta y sobreaplicación individual aun con saldo global suficiente. Si global, documentar N/A humano de subcasos por cargo y comprobar vínculo único a matrícula.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-009 — Pago positivo parcial y exacto

- Tipo: Automatizada/DB.
- Trazabilidad: REQ-H4-005 → DES-H4-005 → TASK-H4-005.
- Escenario y resultado esperado: Importes exactos decimales conforme a OQ-H4-014: parcial y saldo exacto aceptados; conciliación correcta sin flotantes. Resultado completo solo cuando pendiente aprobado es cero.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-010 — Importes inválidos y exceso

- Tipo: Automatizada/DB.
- Trazabilidad: REQ-H4-005 → DES-H4-005 → TASK-H4-005.
- Escenario y resultado esperado: Cero, negativos, nulo, NaN, infinitos, sintaxis alterada, overflow, exceso de precisión según regla acordada, pago sobre saldo incluso por unidad mínima: rechazo sin redondeo inadvertido ni efectos.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-011 — Particular y pertenencia

- Tipo: Integración/seguridad.
- Trazabilidad: REQ-H4-006 → DES-H4-006 → TASK-H4-006.
- Escenario y resultado esperado: Elegibilidad según OQ-H4-015: matrícula válida, alumno correcto y patrocinador actual/histórico. Probar matrícula ajena/inexistente y selección de Ciclo distinta a relación real. No se crea alumno, cargo ni pago empresarial al registrar.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-012 — Matrícula ANULADO

- Tipo: Integración.
- Trazabilidad: REQ-H4-006 → DES-H4-006 → TASK-H4-006; REQ-H4-007 → DES-H4-007 → TASK-H4-007.
- Escenario y resultado esperado: Según OQ-H4-004, probar pago nuevo sobre anulada y anulación con pagos previos. Resultado exactamente acordado, sin borrar pagos/aplicaciones/historia ni inventar devolución; consulta histórica se conserva bajo permiso.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-013 — Ciclo cerrado y terminales

- Tipo: Integración.
- Trazabilidad: REQ-H4-006 → DES-H4-006 → TASK-H4-006.
- Escenario y resultado esperado: Tras OQ-H4-005, ensayar PROGRAMADO/EN_CURSO/CERRADO/DESIERTO/ANULADO tanto elegibles como denegados. No trasladar automáticamente restricción académica a cobro. Cambio concurrente de estado nunca evade regla financiera.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-014 — Cargo pagado posteriormente inactivado

- Tipo: Integración.
- Trazabilidad: REQ-H4-007 → DES-H4-007 → TASK-H4-007; REQ-H4-003 → DES-H4-003 → TASK-H4-003.
- Escenario y resultado esperado: Aplicar pago, intentar retirar/reagregar opcional o inactivar cargo. OQ-H4-003/016 gobierna: bloquear o conservar exigibilidad/historia acordada; sin aplicación perdida o mudada al UUID nuevo ni pago contado dos veces.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-015 — Descuento después de pagar

- Tipo: Integración/seguridad.
- Trazabilidad: REQ-H4-007 → DES-H4-007 → TASK-H4-007; REQ-H4-005 → DES-H4-005 → TASK-H4-005.
- Escenario y resultado esperado: Solo Director solicita cambios de descuento sobre cargo con pagos. Política OQ-H4-016, con pendiente/aplicaciones invariantes; rechazo si la operación aprobada rompería límites. Coordinador no obtiene nueva facultad de descuento por H4.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-016 — Traslado, patrocinador y anulación

- Tipo: Integración/regresión.
- Trazabilidad: REQ-H4-007 → DES-H4-007 → TASK-H4-007; REQ-H4-006 → DES-H4-006 → TASK-H4-006; REQ-H4-016 → DES-H4-016 → TASK-H4-016.
- Escenario y resultado esperado: Con pagos existentes, ejecutar cada ruta H3 según OQ-H4-004/015/016/017: bloqueo o conservación especificados; código/snapshot/cargos originales no reescritos y no atribución automática de abonos al Ciclo destino. Probar eventual corrección de pago solo si OQ-H4-006 la incluye, sin DELETE ni devoluciones.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-017 — Fechas de operación y registro

- Tipo: Automatizada/DB.
- Trazabilidad: REQ-H4-008 → DES-H4-008 → TASK-H4-008.
- Escenario y resultado esperado: Fechas válidas, inválidas, límites pasado/futuro y fronteras de zona conforme a OQ-H4-007. Timestamp/actor de registro DB inmutables; el día operativo no cambia al releer desde otra zona.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-018 — Concepto de HU13

- Tipo: Automatizada/DB.
- Trazabilidad: REQ-H4-008 → DES-H4-008 → TASK-H4-008; REQ-H4-004 → DES-H4-004 → TASK-H4-004.
- Escenario y resultado esperado: Tras OQ-H4-009, concepto derivado o ingresado según contrato: obligatoriedad/longitud y relación correcta. No crear tarifa/cargo nuevo ni duplicar obligatoriamente texto y referencias sin regla. Reenvío conserva semántica.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-019 — Medio válido e historia

- Tipo: Integración.
- Trazabilidad: REQ-H4-009 → DES-H4-009 → TASK-H4-009.
- Escenario y resultado esperado: Seleccionar cada medio autorizado activo, conservar referencia/etiqueta histórica obtenida DB; renombrar/inactivar después no altera pago. Registro declarativo no hace petición a banco/Yape/Plin.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-020 — Medio inválido y mantenimiento

- Tipo: Seguridad/DB.
- Trazabilidad: REQ-H4-009 → DES-H4-009 → TASK-H4-009; REQ-H4-002 → DES-H4-002 → TASK-H4-002.
- Escenario y resultado esperado: Valor de otro catálogo, UUID inexistente/inactivo o etiqueta forjada: rechazo. Mantenimiento de medios y referencias, solo si aprobado en OQ-H4-008/012, respeta roles; no se invoca un motor genérico ni se carga una lista no autorizada.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-021 — Alta financiera atómica

- Tipo: Integración.
- Trazabilidad: REQ-H4-010 → DES-H4-010 → TASK-H4-010.
- Escenario y resultado esperado: Registrar pago particular elegible mediante una sola llamada de escritura: pago/aplicación/versión/auditoría completos y saldo DB correcto. UUID técnico y resumen en pantalla, sin PDF/comprobante legal.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-022 — Manipulación del cliente

- Tipo: Seguridad/API.
- Trazabilidad: REQ-H4-010 → DES-H4-010 → TASK-H4-010; REQ-H4-005 → DES-H4-005 → TASK-H4-005; REQ-H4-018 → DES-H4-018 → TASK-H4-018.
- Escenario y resultado esperado: Enviar saldo/total/actor/estado/descuento/importe de cargo falsos, campos desconocidos o aplicación manual no permitida. Rechazar campos fuera de la whitelist y valores manipulados; nunca obedecerlos ni sumar montos React como autoridad.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-023 — Clave: formato, ámbito y retención

- Tipo: Automatizada/integración.
- Trazabilidad: REQ-H4-011 → DES-H4-011 → TASK-H4-011.
- Escenario y resultado esperado: Formato inválido/ausente y ámbito OQ-H4-010: error sin pago. Una clave conservada sigue identificando la operación a través de recarga/período acordado, no caduca/reutiliza por limpiar caché ni se deriva de PII.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-024 — Misma clave y mismo contenido

- Tipo: Integración.
- Trazabilidad: REQ-H4-011 → DES-H4-011 → TASK-H4-011.
- Escenario y resultado esperado: Después de commit, reenviar clave y contenido normalizado equivalente: mismo pago_id, una aplicación efectiva y un evento de alta, sin avance extra de versión. No exigir versión previa como para un nuevo pago; medio luego inactivo no convierte replay en alta.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-025 — Misma clave y contenido distinto

- Tipo: Integración/seguridad.
- Trazabilidad: REQ-H4-011 → DES-H4-011 → TASK-H4-011; REQ-H4-018 → DES-H4-018 → TASK-H4-018.
- Escenario y resultado esperado: Misma clave confirmada con distinto importe/matrícula/medio/fecha/concepto/aplicaciones según contenido OQ-H4-011: ninguna segunda operación ni actualización oculta. Propuesta de conflicto seguro se valida contra decisión humana; ningún dato ajeno divulgado.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-026 — Commit correcto y respuesta perdida

- Tipo: Integración/fallos.
- Trazabilidad: REQ-H4-012 → DES-H4-012 → TASK-H4-012; REQ-H4-011 → DES-H4-011 → TASK-H4-011.
- Escenario y resultado esperado: Interrumpir solo entrega de respuesta después de un commit comprobado. UI indica resultado desconocido y mantiene clave; lectura/reenvío explícitos recuperan mismo UUID y una sola aplicación/auditoría. No compensación ni segundo cobro.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-027 — Fallo antes del commit

- Tipo: Integración/fallos.
- Trazabilidad: REQ-H4-012 → DES-H4-012 → TASK-H4-012; REQ-H4-014 → DES-H4-014 → TASK-H4-014.
- Escenario y resultado esperado: Interrumpir antes de commit con rollback comprobado: cero pagos/aplicaciones/éxitos de auditoría y versión anterior. Resolver con la misma operación/clave según contrato; no confundir con commit perdido ni dejar una clave reservada permanentemente.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-028 — Consulta vacía mientras sigue en curso

- Tipo: Integración/UI.
- Trazabilidad: REQ-H4-012 → DES-H4-012 → TASK-H4-012.
- Escenario y resultado esperado: Consulta por clave sin fila visible mientras la transacción original continúa. No informar fracaso definitivo ni crear pago con otra clave. Resolver tras fin de la transacción, conservando contexto a través de recarga según OQ-H4-010; doble clic no dispara altas nuevas.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-029 — Recuperación con permiso revocado

- Tipo: Seguridad/integración.
- Trazabilidad: REQ-H4-012 → DES-H4-012 → TASK-H4-012; REQ-H4-002 → DES-H4-002 → TASK-H4-002.
- Escenario y resultado esperado: Tras commit ambiguo, retirar rol/cambiar identidad/expirar sesión. Recuperación por clave requiere sesión y acceso vigente, no concede lectura por conocer UUID; respuesta tardía de otro actor se descarta. Restaurar acceso autorizado recupera sin duplicación, según alcance OQ-H4-010/012.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-030 — Obligatoria: 70 y 60 sobre 100

- Tipo: Concurrencia DB/API.
- Trazabilidad: REQ-H4-013 → DES-H4-013 → TASK-H4-013.
- Escenario y resultado esperado: Dos conexiones/transacciones reales con barrera, mismo saldo inicial 100 y claves distintas. Sin fallos inducidos, una operación gana por 70 o 60 y la otra se rechaza por saldo/conflicto; jamás total 130. Pendiente no negativo, una sola ganadora, aplicaciones/auditoría conciliadas. Sin convertir excedente a 30/40 automáticamente ni retry silencioso.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-031 — Misma clave simultánea

- Tipo: Concurrencia DB/API.
- Trazabilidad: REQ-H4-013 → DES-H4-013 → TASK-H4-013; REQ-H4-011 → DES-H4-011 → TASK-H4-011.
- Escenario y resultado esperado: Dos clientes envían misma clave y contenido, coordinados por barrera. UNIQUE/locks aseguran una operación; el otro recupera o recibe conflicto explícito y se resuelve con misma clave. Al final un UUID financiero y un evento de alta, no dos pagos.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-032 — Clave compartida entre destinos

- Tipo: Concurrencia/seguridad.
- Trazabilidad: REQ-H4-013 → DES-H4-013 → TASK-H4-013; REQ-H4-011 → DES-H4-011 → TASK-H4-011; REQ-H4-002 → DES-H4-002 → TASK-H4-002.
- Escenario y resultado esperado: Dos matrículas distintas y misma clave según ámbito aprobado: probar colisión/recuperación sin bloquear o mutar la matrícula ajena ni filtrar pago. No usar el lock de una matrícula como sustituto de unicidad de clave.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-033 — Pago frente a mutaciones económicas

- Tipo: Concurrencia/regresión.
- Trazabilidad: REQ-H4-013 → DES-H4-013 → TASK-H4-013; REQ-H4-007 → DES-H4-007 → TASK-H4-007.
- Escenario y resultado esperado: Barrera entre pago y descuento/retiro/reagregado/traslado/patrocinador/anulación y estado de Ciclo. Orden global de locks y relectura de IDs/versión evitan saldos basados en cargos viejos, sobrepago y pérdida de historia. Serialización explícita aceptable, no deadlock sistemático ni retry oculto.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-034 — Fallas por etapa

- Tipo: Integración/rollback.
- Trazabilidad: REQ-H4-014 → DES-H4-014 → TASK-H4-014; REQ-H4-010 → DES-H4-010 → TASK-H4-010.
- Escenario y resultado esperado: Fallo controlado al persistir pago, aplicación intermedia, constraint final y antes de commit: rollback de filas, versión y reservas de clave. Estado íntegro tras cada rechazo; sin endpoint de inyección ni alteración de base humana.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-035 — Auditoría fallida

- Tipo: Integración/rollback.
- Trazabilidad: REQ-H4-014 → DES-H4-014 → TASK-H4-014; REQ-H4-015 → DES-H4-015 → TASK-H4-015.
- Escenario y resultado esperado: Forzar fallo local aislado al escribir auditoría: ni pago ni aplicaciones ni avance de versión persisten. Restablecer control de prueba incluso si el caso falla y verificar que las guards/grants originales siguen activos.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-036 — Auditoría mínima y reenvíos

- Tipo: Seguridad/auditoría.
- Trazabilidad: REQ-H4-015 → DES-H4-015 → TASK-H4-015.
- Escenario y resultado esperado: Verificar actor/fecha DB, evento, referencias y campos económicos solo según OQ-H4-013. Sin ficha/contactos/snapshot/credenciales/payload completo. Replay no crea segunda alta; lectores de auditoría H2 no reciben detalle financiero no autorizado.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-037 — Saldo e historial autorizados

- Tipo: Integración/seguridad.
- Trazabilidad: REQ-H4-016 → DES-H4-016 → TASK-H4-016; REQ-H4-002 → DES-H4-002 → TASK-H4-002.
- Escenario y resultado esperado: Lectura agregada consistente, historial con más de una página y suma total que no dependa de la página visible. Probar filtros/orden estable y rol sin permiso; vista/proyección no evade RLS por owner. Si RLS oculta pagos del perímetro al actor, el resumen se deniega, no presenta un saldo falso calculado con pagos parciales.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-038 — Replay después de otros cambios

- Tipo: Integración.
- Trazabilidad: REQ-H4-016 → DES-H4-016 → TASK-H4-016; REQ-H4-012 → DES-H4-012 → TASK-H4-012; REQ-H4-011 → DES-H4-011 → TASK-H4-011.
- Escenario y resultado esperado: Tras confirmar pago y registrar otros pagos/cambiar etiqueta de medio o estados permitidos, recuperar el primero: datos originales iguales, saldo actual puede ser distinto y se identifica como actual. Filtrar por Ciclo respeta OQ-H4-017, sin duplicar abonos ni ocultarlos.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-039 — Flujo de pantalla de pago

- Tipo: Automatizada/UI.
- Trazabilidad: REQ-H4-017 → DES-H4-017 → TASK-H4-017; REQ-H4-010 → DES-H4-010 → TASK-H4-010.
- Escenario y resultado esperado: Desde alumno/matrícula/Ciclo correctos, ver resumen/historial y registrar parcial/total; Cancelar no escribe, error conserva datos y confirmación usa resultado DB. Concepto/aplicaciones según alternativa aprobada, sin nueva pantalla genérica de deuda.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-040 — Teclado, temas y privacidad UI

- Tipo: Automatizada/UI.
- Trazabilidad: REQ-H4-017 → DES-H4-017 → TASK-H4-017; REQ-H4-018 → DES-H4-018 → TASK-H4-018.
- Escenario y resultado esperado: Navegar formulario/grilla/diálogo con teclado, foco/primer error/restauración, móvil/escritorio y cuatro temas; importes legibles y estados con texto. Sin payload/PII en URL/localStorage/logs. Forced-colors real requiere ensayo humano separado, no se infiere de DOM.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-041 — Errores y borrador obsoleto

- Tipo: Automatizada/integración.
- Trazabilidad: REQ-H4-018 → DES-H4-018 → TASK-H4-018; REQ-H4-012 → DES-H4-012 → TASK-H4-012.
- Escenario y resultado esperado: Exceso, permiso, estado, versión/40001/40P01, conflicto de clave y transporte ambiguo muestran causas seguras; no SQL ni saldos ajenos. Conservar borrador/clave apropiados, acción explícita y sin refrescar versión/reenviar automáticamente.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-042 — Integración aislada y regresión H1–H3

- Tipo: Integración/CI futura.
- Trazabilidad: REQ-H4-019 → DES-H4-019 → TASK-H4-019; REQ-H4-002 → DES-H4-002 → TASK-H4-002; REQ-H4-007 → DES-H4-007 → TASK-H4-007; REQ-H4-020 → DES-H4-020 → TASK-H4-020.
- Escenario y resultado esperado: Con futura construcción autorizada, base desechable desde cero: inventario/grants/RLS, migraciones, suites H1/H2/H3/H4, lint/typecheck/unit/build/build-safety y cleanup incluidos fallos. No ejecutar ahora ni dejar fixtures financieros sobre base humana.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-043 — Recorrido humano financiero y accesibilidad

- Tipo: Humana futura.
- Trazabilidad: REQ-H4-019 → DES-H4-019 → TASK-H4-019; REQ-H4-017 → DES-H4-017 → TASK-H4-017.
- Escenario y resultado esperado: Revisor usa datos sintéticos y roles aprobados: parcial/total, cargos/historia/medios, dos sesiones, cancelación, commit ambiguo y recuperación, exclusiones. Registrar SHA, pasos, navegador/SO, teclado/móvil/temas y forced-colors real. Si no ensayado: NO VERIFICADO y decisión residual, nunca PASSED inventado.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-044 — Revisión humana arquitectónica

- Tipo: Humana futura.
- Trazabilidad: REQ-H4-020 → DES-H4-020 → TASK-H4-020; REQ-H4-013 → DES-H4-013 → TASK-H4-013; REQ-H4-015 → DES-H4-015 → TASK-H4-015.
- Escenario y resultado esperado: Seguir UI→RPC→autorización→locks→saldo/aplicación→auditoría y recuperación. Revisar modelo elegido/inventario/mantenimiento/seguridad/costos y reglas H3 coordinadas. Detectar API oculta/overengineering; no introducir capas automáticamente. Evidencia separada, no aprobación del agente.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## TEST-H4-045 — Gate 2 futuro

- Tipo: Gate 2 futuro.
- Trazabilidad: REQ-H4-020 → DES-H4-020 → TASK-H4-020.
- Escenario y resultado esperado: Presentar candidato exacto desde Spec con Gate 1/OQ resueltas, CI SUCCESS, pruebas técnicas/humanas y riesgos. Requiere decisión explícita independiente. Sin aceptación humana no acceptance, merge de construcción ni H5+.
- Evidencia futura: actor/candidato y resultado seguro; cuando aplica, IDs/versiones, filas de pago/aplicación, saldo/auditoría antes y después y ausencia de efectos del intento rechazado.
- Estado: NO EJECUTADO.

## Cierre futuro

No basta CI verde o una pantalla con total correcto. Tras construcción autorizada deben existir integridad monetaria, idempotencia, recuperación de respuesta perdida, pruebas concurrentes y revisión humana documentadas. TEST-H4-044/045 no se marcan ejecutados por el agente. El presente Spec no crea acceptance, no implementa operaciones y no inicia H5+.

**PENDIENTE DE DECISIONES HUMANAS Y GATE 1.**
