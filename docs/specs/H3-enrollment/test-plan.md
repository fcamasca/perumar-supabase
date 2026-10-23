# H3 — Alumno y Matrícula: test-plan

Versión 0.2 · 22/10/2026 (America/Lima).

**SPEC ELABORADO. PENDIENTE DE REVISIÓN HUMANA Y GATE 1. CONSTRUCCIÓN NO AUTORIZADA.**

**Todos los casos: NO EJECUTADOS.** OQ-H3-001…008 RESUELTAS; casos actualizados con esas decisiones, aún NO EJECUTADOS y construcción bloqueada por Gate 1.

## Preparación y evidencia futura

Automatizadas: validación/cálculos e interacción con herramientas existentes. Integración: Supabase local bajo guards H0, fixtures sintéticos, JWT ordinarios aislados por actor y cleanup por IDs incluso ante fallos. Privilegiado solo prepara/observa, nunca prueba autorización. No datos reales, tokens/contraseñas en logs ni proyecto remoto.

Concurrencia: conexiones/transacciones independientes y barrera reproducible, no dos operaciones seriales ni mismo cliente/transacción; comparar filas/cargos/versiones/auditoría antes/después y estado final. Conflicto explícito válido cuando protege invariante; no ocultarlo con retries. Fallo probado por rechazo y ausencia de efectos, no solo HTTP. Harness de fallos/reloj solo local privado, sin endpoint de producto.

Humanas: revisor registra pasos, actor, SO/navegador, resultado y limitaciones sobre SHA candidato. Codex no se atribuye aprobación. Forced-colors SO no probado en H2 sigue antecedente, no PASSED H3.

## TEST-H3-001 — Documental

- Trazabilidad: REQ-H3-001 → DES-H3-001 → TASK-H3-001.
- Escenario y resultado esperado: Revisar base main/origin y H2 cerrado, seis Markdown únicamente, sin migraciones/React/acceptance. Trazabilidad completa y ningún gate aprobado automáticamente.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-002 — Seguridad/RLS

- Trazabilidad: REQ-H3-002 → DES-H3-002 → TASK-H3-002.
- Escenario y resultado esperado: JWT reales separados Director, Coordinador, Admin Sistema, multirol, sin app_user, sin rol, inactivo, rol inactivo, anónimo, expirado e inválido: matriz exacta de lecturas/escrituras. Ambos roles académicos buscan/crean/editan empresa mínima; solo Director mantiene tarifas/descuentos. Terminal bloquea edición ordinaria matrícula pero permite anular con motivo. Sin efectos denegados.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-003 — Seguridad/RLS

- Trazabilidad: REQ-H3-002 → DES-H3-002 → TASK-H3-002.
- Escenario y resultado esperado: Revocar rol/inactivar usuario y repetir con mismo JWT; metadata/actor/rol falsos no autorizan. Inspeccionar owners/search_path/EXECUTE, composición OR y bypass Data API/funciones alternativas.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-004 — Integración local

- Trazabilidad: REQ-H3-003 → DES-H3-003 → TASK-H3-003.
- Escenario y resultado esperado: Crear ficha completa y solo obligatorios: todos los campos se conservan, opcionales NULL incluido N°/Mz Lt, edad sin columna persistida. DNI texto trim exactamente 8 dígitos acepta 00123456, rechaza 7/9 dígitos, letras y conversión numérica. CE acepta texto alfanumérico trim/uppercase con ceros, rechaza vacío/no alfanumérico/>30, sin checksum inventado. Rechazar vacío requerido, fecha futura, geografía incongruente y catálogo de otra pertenencia.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-005 — Automatizada

- Trazabilidad: REQ-H3-003 → DES-H3-003 → TASK-H3-003.
- Escenario y resultado esperado: Validar cotas exactas/tildes/apóstrofos, email/teléfono y medidas positivas en cm/kg sin rangos clínicos; edad antes/en/después cumpleaños. TIPO_DI/SEXO/ESTADO_CIVIL/GRUPO_SANGUINEO catálogos simples; instrucción/ojos/cabello/parentesco texto, sin mantenimiento genérico. No convertir DI a número.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-006 — Integración local

- Trazabilidad: REQ-H3-004 → DES-H3-004 → TASK-H3-004.
- Escenario y resultado esperado: Duplicado normalizado de tipo_di+numero_di rechazado, mismo número válido en tipos distintos aceptado: DNI 12345678 y CE 12345678 pueden coexistir. Fixture incompleto legible con todos sus datos permite completar; guardar incompleto falla sin pérdida ni duplicación.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-007 — Concurrencia

- Trazabilidad: REQ-H3-004 → DES-H3-004 → TASK-H3-004.
- Escenario y resultado esperado: Dos altas mismo tipo+documento normalizado con barrera/conexiones distintas: una gana, otra conflicto; ningún alumno/contacto/evento huérfano. Mismo número en tipos diferentes no colisiona.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-008 — Integración local

- Trazabilidad: REQ-H3-005 → DES-H3-005 → TASK-H3-005.
- Escenario y resultado esperado: Alumno sin contactos puede guardarse pero no matricularse. Contacto incompleto falla; solo inactivos no habilitan matrícula. Dos activos/válidos pertenecen al alumno y habilitan matrícula; retiro lógico conserva fila INACTIVO sin DELETE ni concepto principal.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-009 — Concurrencia

- Trazabilidad: REQ-H3-005 → DES-H3-005 → TASK-H3-005.
- Escenario y resultado esperado: Editar/retirar último contacto versus registrar: snapshot coherente al punto serial; sin contacto válido entonces matrícula rechazada completa.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-010 — Integración local

- Trazabilidad: REQ-H3-006 → DES-H3-006 → TASK-H3-006.
- Escenario y resultado esperado: Matricular con dos contactos activos/válidos y uno INACTIVO: snapshot incluye ambos activos y excluye inactivo. Cambiar ficha/contactos/estado después: actual cambia, snapshot conserva contenido/etiquetas/contactos originales; editar Ciclo/empresa/opciones tampoco lo modifica.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-011 — Seguridad/RLS

- Trazabilidad: REQ-H3-006 → DES-H3-006 → TASK-H3-006.
- Escenario y resultado esperado: Inyectar snapshot por RPC/UPDATE directo falla; listados, auditoría, logs y almacenamiento no incluyen copia de ficha ni secretos; Admin Sistema no lee snapshot.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-012 — Integración local

- Trazabilidad: REQ-H3-007 → DES-H3-007 → TASK-H3-007.
- Escenario y resultado esperado: Director y Coordinador buscan/crean/editan empresa con solo RUC/razón social, contacto/teléfono/email NULL válidos. RUC texto trim 11 dígitos conserva ceros; rechazar 10/12 dígitos, letras, conversión a número y duplicado normalizado. Reutilizar empresa en dos matrículas y tercera sin empresa; FK en matrícula no alumno. UUID inexistente falla, edición obsoleta conflicto, sin SUNAT/H7.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-013 — Integración local

- Trazabilidad: REQ-H3-008 → DES-H3-008 → TASK-H3-008.
- Escenario y resultado esperado: Director crea/edita/inactiva tarifa CARRERA/OTRO, acepta 0.00. Rechaza tipo CAPITANIA/REFRIGERIO como tipos nuevos, código duplicado, negativo, >2 decimales sin redondeo, overflow, NaN/infinito. Default nuevo no cambia relación Ciclo/cargos previos; tarifa usada no se borra.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-014 — Seguridad/RLS

- Trazabilidad: REQ-H3-008 → DES-H3-008 → TASK-H3-008.
- Escenario y resultado esperado: Coordinador lee referencias sin mantener tarifa/estado; Admin Sistema sin permiso académico denegado; petición directa no eleva permisos.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-015 — Integración local

- Trazabilidad: REQ-H3-009 → DES-H3-009 → TASK-H3-009.
- Escenario y resultado esperado: Asociar manualmente default/override 650/700 en dos Ciclos misma Carrera, catálogo intacto y sin automatismo. Para matricular exactamente una tarifa activa CARRERA obligatoria: cero, dos, inactiva o marcada opcional falla. Otras obligatorias incluidas y opcionales por alumno. numeric(12,2) admite 0.00, rechaza negativo/precisión >2 sin redondeo. Director mantiene ciclo_tarifa en PROGRAMADO/EN_CURSO; en CERRADO/DESIERTO/ANULADO cualquier mantenimiento por RPC directa falla sin efectos, solo consulta.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-016 — Concurrencia

- Trazabilidad: REQ-H3-009 → DES-H3-009 → TASK-H3-009.
- Escenario y resultado esperado: Cambiar configuración/tipo/vigencia mientras se registra: conjunto/precio/obligatorias coherentes o conflicto; nunca mezcla de versiones.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-017 — Integración local

- Trazabilidad: REQ-H3-010 → DES-H3-010 → TASK-H3-010.
- Escenario y resultado esperado: Dos alumnos eligen distintas opcionales en mismo Ciclo: obligatorias en ambos y opciones solo elegidas, totales exactos. Modificar tarifa/default/ciclo_tarifa luego no cambia UUID/importes originales/descuentos/finales de cargos históricos, activos o inactivos.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-018 — Seguridad/RLS

- Trazabilidad: REQ-H3-010 → DES-H3-010 → TASK-H3-010.
- Escenario y resultado esperado: Request con importe 1 en lugar de 650, total falso, actor/estado/campos internos, opcional ajena/inactiva/repetida o intento de omitir obligatoria: no acepta importes cliente, rechaza campos/selección inválidos y DB incorpora obligatorias.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-019 — Integración local

- Trazabilidad: REQ-H3-010 → DES-H3-010 → TASK-H3-010.
- Escenario y resultado esperado: Harness privado fuerza fallo tras matrícula, durante cargos y en auditoría: cero matrícula/cargos/eventos exitosos parciales, sin avance confirmado de versiones/contador. Alumno/empresa previamente guardados permanecen.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-020 — Integración local

- Trazabilidad: REQ-H3-011 → DES-H3-011 → TASK-H3-011.
- Escenario y resultado esperado: Aceptar alta/destino PROGRAMADO y EN_CURSO; bloquear alta/destino CERRADO/DESIERTO/ANULADO. Matrícula ACTIVO cuyo Ciclo después es terminal: rechazar edición ordinaria Ciclo/empresa/opciones/código/descuento incluso intento de salir a otro elegible; ambos roles sí pueden anularla con motivo, sin cascada automática.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-021 — Integración local

- Trazabilidad: REQ-H3-011 → DES-H3-011 → TASK-H3-011.
- Escenario y resultado esperado: Ciclo editable con ≥1 matrícula ACTIVO no cambia Carrera (ni por rutas indirectas H2); edición ordinaria limitada a Director/promoción/fechas con superposición vigente. Si solo hay ANULADO, cambio Carrera permitido conforme permisos/estado/materias H2; snapshots/cargos/códigos históricos anulados quedan idénticos. Revisar guardar_ciclo, guardar_carrera/sigla/sincronización y cambiar_materia_ciclo: sin bypass de protección con activas ni regeneración código matrícula. Mantener regla independiente H2 de no ANULAR Ciclo con matrículas.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-022 — Concurrencia

- Trazabilidad: REQ-H3-011 → DES-H3-011 → TASK-H3-011.
- Escenario y resultado esperado: Registro versus cerrar/anular Ciclo/cambiar Carrera y anular última matrícula versus cambiar Carrera: orden serial válido/conflicto. Nunca cambio Carrera con matrícula aún ACTIVO al punto serial; si todas ANULADO, puede cambiar bajo H2 sin reescribir historia. No matrícula nueva en Ciclo ya terminal ni Ciclo anulado con matrícula.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-023 — Integración local

- Trazabilidad: REQ-H3-012 → DES-H3-012 → TASK-H3-012.
- Escenario y resultado esperado: Par duplicado falla, incluso tras anulación; distinto Ciclo admite mismo alumno. Cambio a par ocupado revierte matrícula/cargos.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-024 — Concurrencia

- Trazabilidad: REQ-H3-012 → DES-H3-012 → TASK-H3-012.
- Escenario y resultado esperado: Dos registrar para mismo par, sesiones independientes y barrera: una matrícula con cargos completos, solo eventos de ganadora; otra conflicto explícito.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-025 — Integración local

- Trazabilidad: REQ-H3-013 → DES-H3-013 → TASK-H3-013.
- Escenario y resultado esperado: 2026-MPC-001/002 y 2026-BZ-001 independientes; reinicio siguiente año America/Lima y >999 sin truncar. Reloj solo harness local, nunca parámetro público.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-026 — Concurrencia

- Trazabilidad: REQ-H3-013 → DES-H3-013 → TASK-H3-013.
- Escenario y resultado esperado: N matrículas distintas misma clave producen N códigos únicos; claves independientes no comparten contador. Código manual anticipado colisionando se resuelve en DB sin bucle cliente ni asignación parcial.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-027 — Integración local

- Trazabilidad: REQ-H3-013 → DES-H3-013 → TASK-H3-013.
- Escenario y resultado esperado: Ambos roles editan código solo ACTIVO/Ciclo no terminal; trim/uppercase y UNIQUE, formato completo YYYY-SIGLA-CORRELATIVO, año 4 dígitos, sigla alfanumérica 2–10 y correlativo ≥3 dígitos, >999 sin truncar ni límite arbitrario 50. Rechazar formato roto, duplicado normalizado y edición en matrícula anulada/Ciclo terminal. Código original/año/sigla/correlativo inmutables y cambios manuales auditados. Cambiar Ciclo/Carrera/sigla no regenera código; matrícula anulada 2026-MPC-001 lo conserva aunque Ciclo, solo con anuladas, cambie Carrera.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-028 — Integración local

- Trazabilidad: REQ-H3-014 → DES-H3-014 → TASK-H3-014.
- Escenario y resultado esperado: Director descuento cero/parcial/total Carrera: original intacto y final exacto. Negativo, >original, motivo vacío si >0, porcentaje y descuento otro concepto rechazados.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-029 — Seguridad/RLS

- Trazabilidad: REQ-H3-014 → DES-H3-014 → TASK-H3-014.
- Escenario y resultado esperado: Coordinador intenta aplicar/alterar/quitar descuento vigente dentro del mismo Ciclo: denegado, sin borrado silencioso. Sí puede cambiar de Ciclo elegible: anteriores INACTIVO/CAMBIO_CICLO con descuento íntegro y nuevos cargos servidor con cero. Request de cambio con descuento nuevo, conservación manual del anterior, importes/totales falsos o descuento en cargo ajeno se rechaza; nunca traslada ni copia. Director+Coordinador activos habilita descuento solo por Director en operación posterior.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-030 — Integración local

- Trazabilidad: REQ-H3-015 → DES-H3-015 → TASK-H3-015.
- Escenario y resultado esperado: Cambio patrocinador conserva exactamente UUID/vigencia/importes/descuento de todos los cargos. Retirar opcional mismo Ciclo inactiva fila sin DELETE, conserva importe y motivo; reagregar crea UUID distinto con precio vigente ciclo_tarifa. Retenidos sin repricing aunque catálogo/default/ciclo_tarifa cambie. Cambio Ciclo por Director y Coordinador: todos los vigentes anteriores INACTIVO/CAMBIO_CICLO, originales/descuento/motivo/final intactos; nuevos UUID desde obligatorias/opcionales destino, importes servidor y CARRERA descuento=0. No traslado ni reutilización UUID. Director puede después aplicar nuevo descuento al nuevo CARRERA sin alterar cargo viejo. Snapshot/código conservados, sin replaced_by/árboles/event sourcing.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-031 — Integración local

- Trazabilidad: REQ-H3-015 → DES-H3-015 → TASK-H3-015.
- Escenario y resultado esperado: Destino inválido/terminal, par ocupado o fallo tras inactivar anteriores/durante alta de nuevos cargos/auditoría: matrícula y todos los cargos/vigencias/motivos/UUID/versiones/eventos revierten por completo, originales históricos intactos. Fallo al reagregar opcional no pierde cargo anterior ni crea alta parcial.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-032 — Concurrencia

- Trazabilidad: REQ-H3-015 → DES-H3-015 → TASK-H3-015.
- Escenario y resultado esperado: Dos ediciones misma versión (cambio Ciclo/opciones/empresa): una gana y otra conflicto; no mezcla de conjuntos viejos/nuevos ni inactivaciones parciales. Cambio Ciclo ganador conserva descuentos viejos y nuevos en cero, sin retry con versión nueva.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-033 — Integración local

- Trazabilidad: REQ-H3-016 → DES-H3-016 → TASK-H3-016.
- Escenario y resultado esperado: Ambos roles anulan con motivo incluso matrícula ACTIVO en Ciclo terminal; blanco/nulo falla. Conserva cargos/importes/snapshot/par/código, registra actor/instante/motivo, sin cascada previa. Repetir no duplica éxito; reactivar/editar/cambiar código/DELETE de ANULADO rechazados.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-034 — Concurrencia

- Trazabilidad: REQ-H3-016 → DES-H3-016 → TASK-H3-016.
- Escenario y resultado esperado: Editar versus anular misma versión: una gana, otra conflicto. Si Ciclo se vuelve terminal concurrentemente, ninguna edición ordinaria confirma en orden serial prohibido; anular con motivo sigue permitido para ambos roles.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-035 — Integración local

- Trazabilidad: REQ-H3-017 → DES-H3-017 → TASK-H3-017.
- Escenario y resultado esperado: Cada operación relevante genera evento entidad/UUID/acción/actor/fecha/diferencias/motivo; descuento incluye original/descuento/motivo. Cambio Ciclo: origen/destino, cargos inactivados CAMBIO_CICLO, nuevos UUID/cargos y actor explícitos, atómicos. Retiro/reagregado opcional deja motivo/identidades distinguibles sin DELETE. Fallo auditoría revierte negocio, rechazo no deja éxito.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-036 — Seguridad/RLS

- Trazabilidad: REQ-H3-017 → DES-H3-017 → TASK-H3-017.
- Escenario y resultado esperado: Audit H2 visible a roles autorizados sin ficha/contactos/RUC/email/snapshot/JWT/secretos. Negar INSERT/UPDATE/DELETE/TRUNCATE y fabricación de contexto/eventos mediante funciones alternativas.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-037 — Concurrencia

- Trazabilidad: REQ-H3-018 → DES-H3-018 → TASK-H3-018.
- Escenario y resultado esperado: Carreras con barrera y conexiones independientes de alumno/contactos/tarifas/par/código/edición/anulación y Carrera Ciclo con activas/solo anuladas: verificar estado final/versiones/historia y ausencia de efectos perdedores. Cambio Ciclo por Coordinador versus cambios precios/configuración/descuento: nuevos cargos siempre servidor/cero, anteriores intactos, sin mezcla/retry. Inspeccionar aislamiento efectivo.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-038 — Integración local

- Trazabilidad: REQ-H3-018 → DES-H3-018 → TASK-H3-018.
- Escenario y resultado esperado: Versión omitida/obsoleta falla; versión servidor avanza y recarga explícita permite nueva decisión. 40001/deadlock no produce retry oculto ni éxito aparente.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-039 — Automatizada

- Trazabilidad: REQ-H3-019 → DES-H3-019 → TASK-H3-019.
- Escenario y resultado esperado: Interacciones Stepper/Tabs: bloquea avance ante obligatorios inválidos, foco primer error, alta alumno retorna a matrícula, conserva Ciclo y limpia datos del alumno anterior. Estados de sesión descartan respuestas tardías/PII previa.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-040 — Humana

- Trazabilidad: REQ-H3-019 → DES-H3-019 → TASK-H3-019.
- Escenario y resultado esperado: Recorrer ficha completa/incompleta, contactos, empresa y matrícula repetida con ambos roles. Historial y confirmación otro alumno/ver matrícula correctos. Ciclo terminal deja anulación motivada disponible pero no edición ordinaria. Cambiar Ciclo con descuento previo comunica cargos anteriores históricos/nuevos en cero; Coordinador no recibe controles de descuento nuevo.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-041 — Humana

- Trazabilidad: REQ-H3-019 → DES-H3-019 → TASK-H3-019.
- Escenario y resultado esperado: Teclado completo, nombres/semántica accesibles Stepper/Tabs, foco/restauración modal y primer error, errores inline, estados sin solo color y ausencia de alert/confirm/prompt. Ficha completa fuera de modal.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-042 — Humana

- Trazabilidad: REQ-H3-019 → DES-H3-019 → TASK-H3-019.
- Escenario y resultado esperado: Sistema/Claro/Oscuro/Alto contraste, persistencia y regresión identidad H2. Forced-colors real SO con prioridad sobre paletas; registrar SO/navegador. Emulación solo complementa, si no disponible NO VERIFICADO para decisión humana.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-043 — Integración local

- Trazabilidad: REQ-H3-020 → DES-H3-020 → TASK-H3-020.
- Escenario y resultado esperado: Reset desde cero, inventario aprobado, suites H1/H2/H3, build/secretos y cleanup por IDs aun con fallo. CI registra SHA/resultado; nunca concede gate.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-044 — Humana

- Trazabilidad: REQ-H3-020 → DES-H3-020 → TASK-H3-020.
- Escenario y resultado esperado: Seguir UI→RPC→permisos/constraints→cargos/snapshot→auditoría; revisar inventario RPC/helpers/policies y costo de mantenimiento. Complejidad excesiva se registra para decisión sin añadir backend automáticamente.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-045 — Gate 2

- Trazabilidad: REQ-H3-020 → DES-H3-020 → TASK-H3-020.
- Escenario y resultado esperado: Presentar candidato exacto, evidencia técnica/humana futura, las ocho decisiones OQ resueltas y riesgos/limitaciones; requiere Gate 2 humano explícito tras construcción autorizada por Gate 1. Sin decisión no acceptance/merge ni inicio H4.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## Cierre futuro

CI de esta rama documental ejecuta suites existentes H2; no prueba implementación H3 ni aprueba Gate 1; las ocho decisiones están cerradas documentalmente. Tras construcción autorizada, ejecución técnica y humana alimentan Gate 2; CI verde no autoriza aceptación o merge. No crear acceptance en este Spec.

**H3 NO está autorizado para construcción. Pendiente de revisión humana y Gate 1.**
