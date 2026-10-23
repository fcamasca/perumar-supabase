# H3 — Alumno y Matrícula: test-plan

Versión 0.1 · 22/10/2026 (America/Lima).

**SPEC ELABORADO. PENDIENTE DE REVISIÓN HUMANA Y GATE 1. CONSTRUCCIÓN NO AUTORIZADA.**

**Todos los casos: NO EJECUTADOS.** Casos dependientes de OQ quedan BLOQUEADOS POR DECISIÓN, nunca PASSED por supuesto.

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
- Escenario y resultado esperado: JWT reales separados Director, Coordinador, Admin Sistema, multirol, sin app_user, sin rol, inactivo, rol inactivo, anónimo, expirado e inválido: matriz exacta de lecturas/escrituras, sin efectos denegados.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-003 — Seguridad/RLS

- Trazabilidad: REQ-H3-002 → DES-H3-002 → TASK-H3-002.
- Escenario y resultado esperado: Revocar rol/inactivar usuario y repetir con mismo JWT; metadata/actor/rol falsos no autorizan. Inspeccionar owners/search_path/EXECUTE, composición OR y bypass Data API/funciones alternativas.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-004 — Integración local

- Trazabilidad: REQ-H3-003 → DES-H3-003 → TASK-H3-003.
- Escenario y resultado esperado: Crear ficha completa y solo obligatorios: todos los campos se conservan, opcionales NULL, edad sin columna persistida. Rechazar vacío requerido, fecha futura, FK geográfica incongruente y catálogo incorrecto.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-005 — Automatizada

- Trazabilidad: REQ-H3-003 → DES-H3-003 → TASK-H3-003.
- Escenario y resultado esperado: Validar cotas, tildes/apóstrofos/ceros DI, email/teléfonos, medidas positivas y edad antes/en/después de cumpleaños. Fronteras exactas de longitud y campos opcionales según OQ resuelta.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-006 — Integración local

- Trazabilidad: REQ-H3-004 → DES-H3-004 → TASK-H3-004.
- Escenario y resultado esperado: Documento duplicado normalizado rechazado; distintos documentos aceptados. Fixture incompleto legible con todos sus datos, permite completar; guardar incompleto falla sin pérdida ni duplicación.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-007 — Concurrencia

- Trazabilidad: REQ-H3-004 → DES-H3-004 → TASK-H3-004.
- Escenario y resultado esperado: Dos altas mismo documento con barrera y conexiones distintas: una gana, otra conflicto; ningún alumno/contacto/evento huérfano.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-008 — Integración local

- Trazabilidad: REQ-H3-005 → DES-H3-005 → TASK-H3-005.
- Escenario y resultado esperado: Alumno sin contactos puede guardarse pero no matricularse. Contacto incompleto falla; dos válidos pertenecen al alumno y habilitan matrícula, no a matrícula.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-009 — Concurrencia

- Trazabilidad: REQ-H3-005 → DES-H3-005 → TASK-H3-005.
- Escenario y resultado esperado: Editar/retirar último contacto versus registrar: snapshot coherente al punto serial; sin contacto válido entonces matrícula rechazada completa.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-010 — Integración local

- Trazabilidad: REQ-H3-006 → DES-H3-006 → TASK-H3-006.
- Escenario y resultado esperado: Matricular y cambiar ficha/contactos después: consulta actual cambia, snapshot conserva bytes/estructura histórica y contactos/etiquetas originales; editar Ciclo/empresa/opciones tampoco lo modifica.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-011 — Seguridad/RLS

- Trazabilidad: REQ-H3-006 → DES-H3-006 → TASK-H3-006.
- Escenario y resultado esperado: Inyectar snapshot por RPC/UPDATE directo falla; listados, auditoría, logs y almacenamiento no incluyen copia de ficha ni secretos; Admin Sistema no lee snapshot.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-012 — Integración local

- Trazabilidad: REQ-H3-007 → DES-H3-007 → TASK-H3-007.
- Escenario y resultado esperado: Crear empresa mínima y reutilizarla en dos matrículas; tercera sin empresa. FK está en matrícula, no alumno. RUC duplicado/empresa inexistente falla; edición obsoleta conflicto.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-013 — Integración local

- Trazabilidad: REQ-H3-008 → DES-H3-008 → TASK-H3-008.
- Escenario y resultado esperado: Director crea/edita/inactiva tarifa. Código duplicado, negativo, precisión excesiva, overflow, NaN/infinito fallan. Default nuevo no cambia relación Ciclo ni cargos antiguos; tarifa usada no se borra.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-014 — Seguridad/RLS

- Trazabilidad: REQ-H3-008 → DES-H3-008 → TASK-H3-008.
- Escenario y resultado esperado: Coordinador lee referencias sin mantener tarifa/estado; Admin Sistema sin permiso académico denegado; petición directa no eleva permisos.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-015 — Integración local

- Trazabilidad: REQ-H3-009 → DES-H3-009 → TASK-H3-009.
- Escenario y resultado esperado: Asociar manualmente default y override 650/700 en dos Ciclos misma Carrera: catálogo intacto y sin asociación automática. Carrera obligatoria no removible, sin configuración válida no matricula.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-016 — Concurrencia

- Trazabilidad: REQ-H3-009 → DES-H3-009 → TASK-H3-009.
- Escenario y resultado esperado: Cambiar configuración/tipo/vigencia mientras se registra: conjunto/precio/obligatorias coherentes o conflicto; nunca mezcla de versiones.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-017 — Integración local

- Trazabilidad: REQ-H3-010 → DES-H3-010 → TASK-H3-010.
- Escenario y resultado esperado: Dos alumnos eligen distintas opcionales en mismo Ciclo: obligatorias en ambos y opciones solo elegidas. Totales/cargos exactos. Cambiar tarifa/default/precio Ciclo después conserva matrículas previas.
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
- Escenario y resultado esperado: Aceptar Ciclo PROGRAMADO y EN_CURSO; bloquear CERRADO/DESIERTO/ANULADO en alta y cambio, incluso API directa.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-021 — Integración local

- Trazabilidad: REQ-H3-011 → DES-H3-011 → TASK-H3-011.
- Escenario y resultado esperado: Ciclo con matrícula: solo Director promoción/fechas; mantiene restricción superposición. Rechazar Coordinador, Carrera/ubicación/materias y ANULADO, incluidas rutas indirectas H2 conforme OQ-005. Sin cascada a matrícula.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-022 — Concurrencia

- Trazabilidad: REQ-H3-011 → DES-H3-011 → TASK-H3-011.
- Escenario y resultado esperado: Registro versus cerrar/anular Ciclo/cambiar Carrera: orden serial válido o conflicto; nunca matrícula nueva en Ciclo ya terminal ni Ciclo anulado con matrícula.
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
- Escenario y resultado esperado: Código manual único autorizado aceptado; duplicado normalizado rechazado. Original/año/sigla/correlativo permanecen trazables en edición y cambio Ciclo/sigla según OQ-006; anulada no editable.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-028 — Integración local

- Trazabilidad: REQ-H3-014 → DES-H3-014 → TASK-H3-014.
- Escenario y resultado esperado: Director descuento cero/parcial/total Carrera: original intacto y final exacto. Negativo, >original, motivo vacío si >0, porcentaje y descuento otro concepto rechazados.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-029 — Seguridad/RLS

- Trazabilidad: REQ-H3-014 → DES-H3-014 → TASK-H3-014.
- Escenario y resultado esperado: Coordinador intenta aplicar, alterar o quitar descuento por request o cambio indirecto de Ciclo: denegado conforme OQ-007; nunca borrado silencioso. Multirol Director activo habilita por ese rol.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-030 — Integración local

- Trazabilidad: REQ-H3-015 → DES-H3-015 → TASK-H3-015.
- Escenario y resultado esperado: Cambiar patrocinador deja cargos intactos; editar opcionales conserva retenidos y toma nuevos importes vigentes; cambio Ciclo recalcula destino/descuento conforme decisión. Snapshot intacto y revisiones históricas conservadas según OQ-008.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-031 — Integración local

- Trazabilidad: REQ-H3-015 → DES-H3-015 → TASK-H3-015.
- Escenario y resultado esperado: Destino inválido, par ocupado o fallo durante recálculo: matrícula, cargos, códigos/versiones y auditoría revierten por completo.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-032 — Concurrencia

- Trazabilidad: REQ-H3-015 → DES-H3-015 → TASK-H3-015.
- Escenario y resultado esperado: Dos ediciones misma versión: una gana y otra conflicto; no mezcla de empresa/Ciclo/opciones/cargos ni retry con versión nueva.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-033 — Integración local

- Trazabilidad: REQ-H3-016 → DES-H3-016 → TASK-H3-016.
- Escenario y resultado esperado: Ambos roles anulan con motivo; blanco/nulo falla. Conserva cargos/snapshot/par, registra actor/instante/motivo. Repetir no duplica éxito; reactivar/editar/cambiar código/DELETE anulada rechazados.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-034 — Concurrencia

- Trazabilidad: REQ-H3-016 → DES-H3-016 → TASK-H3-016.
- Escenario y resultado esperado: Editar versus anular misma versión: una gana, otra conflicto. Ningún cambio confirma después de terminalidad con versión obsoleta.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-035 — Integración local

- Trazabilidad: REQ-H3-017 → DES-H3-017 → TASK-H3-017.
- Escenario y resultado esperado: Cada operación relevante genera evento de entidad/UUID/acción/actor/fecha/diferencias/motivo esperado; descuento incluye original/descuento/motivo. Fallo auditoría revierte negocio; rechazo no deja éxito.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-036 — Seguridad/RLS

- Trazabilidad: REQ-H3-017 → DES-H3-017 → TASK-H3-017.
- Escenario y resultado esperado: Audit H2 visible a roles autorizados sin ficha/contactos/RUC/email/snapshot/JWT/secretos. Negar INSERT/UPDATE/DELETE/TRUNCATE y fabricación de contexto/eventos mediante funciones alternativas.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## TEST-H3-037 — Concurrencia

- Trazabilidad: REQ-H3-018 → DES-H3-018 → TASK-H3-018.
- Escenario y resultado esperado: Repetir carreras alumno/contactos/Ciclo/tarifas/par/código/edición/anulación con barreras y comprobar estado final, versiones, ausencia de efectos perdedores y aislamiento efectivo. Incluir inactivación de tarifa/tipo contra creación.
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
- Escenario y resultado esperado: Recorrer ficha completa/incompleta, contactos, empresa y matrícula repetida con ambos roles. Pestaña Matrículas muestra historial, confirmación ofrece otro alumno/ver matrícula, anulada consulta y permisos visibles correctos.
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
- Escenario y resultado esperado: Presentar candidato exacto, evidencia técnica/humana, OQ cerradas y riesgos/limitaciones; requiere decisión humana explícita. Sin ella no acceptance/merge ni inicio H4.
- Evidencia: entradas sintéticas/actor, respuesta segura y estado antes/después con aserciones; para UI resultado del recorrido/foco.
- Estado: NO EJECUTADO.

## Cierre futuro

CI de esta rama documental ejecuta suites existentes H2; no prueba implementación H3 ni resuelve decisiones pendientes. Tras construcción autorizada, ejecución técnica y humana alimentan Gate 2; CI verde no autoriza aceptación o merge. No crear acceptance en este Spec.

**H3 NO está autorizado para construcción. Pendiente de revisión humana y Gate 1.**
