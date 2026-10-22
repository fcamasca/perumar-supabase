# H2 — Base académica: tasks

**Versión:** 0.3 · **Fecha:** 22/10/2026 (America/Lima)
**H2 SPEC: PENDING HUMAN APPROVAL** · **IMPLEMENTATION: BLOCKED**

Plan de construcción futura. **Todas las tareas están NO INICIADAS**; redactarlas no autoriza ejecutarlas. Fuentes, decisiones y detalles residuales: [requirements.md](requirements.md); diseño: [design.md](design.md); evidencia esperada: [test-plan.md](test-plan.md).

Orden obligatorio: 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010. OQ-H2-001 a 010 están resueltas humanamente; R-H2-001 a 006 también están RESUELTAS POR DECISIÓN HUMANA, incluidas precisiones de catálogos y no DELETE de Ciclos persistidos. Ninguna pregunta funcional bloqueante nueva identificada; Gate 1 del Spec completo sigue pendiente. No empezar una tarea dependiente para rodear el bloqueo.

## TASK-H2-001 — Gate 1, decisiones y base aprobada

- REQ: 001, 008, 016. DES: 001, 009. Pruebas: TEST-H2-001.
- Dependencia: aprobación humana explícita del Spec exacto revisado con las diez decisiones ya aprobadas; verificar que la revisión aprobada contiene los seis cierres residuales y precisiones posteriores sin contradicciones. Esta revisión documental no es Gate 1.
- Trabajo futuro: comprobar rama Spec, commit aprobado, working tree limpio y descendencia de main actualizado. Registrar aprobación; crear `feature/h2-academic` desde el commit exacto aprobado de `feature/h2-academic-spec`, no desde un main posterior. Incorporar el registro documental de aprobación siguiendo el proceso H1.
- Finalización: base y decisiones trazables; ninguna regla funcional inventada. Sin esa evidencia no construir ni instalar dependencias.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H2-002 — Modelo, constraints y migración local H2

- REQ: 001–009. DES: 001–005, 009. Pruebas: TEST-H2-002 a 007, 011, 022 a 025, 028, 029, 030–034.
- Dependencia: 001; decisiones funcionales y seis cierres residuales registrados, fuente/carga inicial y transición explícita de roles definidas; todavía requiere Gate 1.
- Trabajo futuro: crear futuramente modelo aditivo con UUID/FK UUID, códigos/nombres normalizados UNIQUE y límites, active solo en maestras, Ciclo operativo con estado_codigo, Ciclo–Materia con activo/origen único/motivo_inactivacion y relación permanente, sigla UNIQUE alfanumérica 2–10, año America/Lima/correlativo anual sin tope 999, updated_at servidor y auditoría relacional JSONB. Evolucionar catálogo/restricciones de roles H1 a DIRECTOR_ACADEMICO/COORDINADOR_ACADEMICO/ADMIN_SISTEMA sin asignación automática de personas; adaptar consultas de seguridad propias y directorio de solo lectura para ADMIN_SISTEMA, sin gestión HU17/HU18 ni directorio automático a Director. Preparar catalogo/catalogo_valor para MODALIDAD_CARRERA y MOTIVO_CICLO_DESIERTO con semillas humanas aprobadas, geografía de UBIGEO INEI y Capitanías DICAPI en tablas propias, fuente/versión/fecha y jerarquía controladas; no todo HU20 ni motor dinámico. Adaptar reset/inventario; ninguna exposición permisiva ni entidad H3. No ejecutar esta tarea en la fase Spec.
- Finalización: reconstrucción local reproducible; duplicados, huérfanos y estados inválidos rechazados por DB; diff limitado a inventario aprobado.
- Estado: NO INICIADA.

## TASK-H2-003 — RLS, grants y operaciones atómicas con auditoría

- REQ: 002–009, 014. DES: 003–005, 008. Pruebas: TEST-H2-006 a 012, 022, 025 a 034.
- Dependencia: 002 y matriz/estrategia privilegiada aprobadas.
- Trabajo futuro: aplicar matriz de roles reales y multirol sin CRUD implícito ADMIN_SISTEMA; comandos acotados que protegen permisos, optimistic concurrency, motivo sensible y auditoría en la misma transacción. Implementar garantías de superposición Carrera+Capitanía+fechas inclusivas, contador anual global, sincronización solo de materias faltantes conservando origen único, filas retiradas inactivas y adicionales/históricos, cambio atómico de sufijo por sigla y matriz cerrada de transiciones manuales Director. Aplicar mínimo ≥1 materia activa en Carrera y al registrar Ciclo; rechazar retiro/inactivación de última activa de Carrera. Limitar superposición a PROGRAMADO/EN_CURSO/CERRADO; liberar con DESIERTO/ANULADO. Prohibir DELETE de todo Ciclo persistido; descarte de formulario nuevo no es operación DB. Validar catálogo/OTRO con detalle y motivos libres solo sensibles. Sin scheduler ni entidades futuras de matrícula/facturación. Bloquear escritura directa que evada comandos; revisar owner/search_path/EXECUTE/RLS y rechazo de roles técnicos. Sin motor de permisos ni administración de identidad.
- Finalización: positivos/negativos con JWT ordinarios, rollback y ausencia de escritura no autorizada; auditoría atómica y no editable por cliente. Ningún comando definer aprobado solo por su nombre.
- Estado: NO INICIADA.

## TASK-H2-004 — Pruebas reales y fixtures locales de datos/seguridad

- REQ: 001–009, 014. DES: 001–005, 008–009. Pruebas: TEST-H2-002 a 013, 022 a 034.
- Dependencia: 003.
- Trabajo futuro: preparar fixtures nuevos con roles funcionales, cada rol, combinaciones y sin habilitación; ensayar roles técnicos sin autoridad funcional, evolución/reset del catálogo y regresión de propiedades H1. Peticiones JWT ordinarias por actor, observación administrativa separada. Cubrir UUID/normalización, carga de maestras, correlativo anual concurrente, superposición, sigla/históricos, relaciones heredadas/adicionales activas/inactivas sin reactivación automática, mínimo materia activa, sincronización/cambio Carrera atómicos, estados/motivos, no DELETE de Ciclo, catalogo/catalogo_valor y OTRO, auditoría JSONB, lectura referencial y directorio ADMIN_SISTEMA, y conflicto por updated_at. Registrar comprobaciones futuras diferidas como no ejecutables en H2, no PASSED ficticio. Limpieza tras fallo y éxito.
- Finalización: no service_role en solicitudes que pretenden probar autorización, sin contraseñas/tokens en logs, cleanup tras éxito y fallo; reglas futuras de matrículas no declaradas probadas.
- Estado: NO INICIADA.

## TASK-H2-005 — Preferencias visuales y tokens semánticos

- REQ: 010–013. DES: 007. Pruebas: TEST-H2-014 a 016, 019.
- Dependencia: 004 y diseño visual aprobado.
- Trabajo futuro: implementar selector simple y CSS compartido para Sistema/Claro/Oscuro/Alto contraste, prioridad del sistema, persistencia local tolerante a fallos y tokens semánticos; medir contrastes de pares/estados. Sin backend, Context/framework innecesario, skins o dependencia nueva.
- Finalización: cuatro preferencias disponibles, fallback Sistema, respuesta en vivo del sistema y forced-colors prioritario. Aprobación humana visual todavía pendiente.
- Estado: NO INICIADA.

## TASK-H2-006 — UI concreta académica y consulta básica de auditoría

- REQ: 002–014. DES: 001–008. Pruebas: TEST-H2-003 a 006, 009, 013 a 016, 018–019, 023 a 034.
- Dependencia: 005.
- Trabajo futuro: pantallas/listas/formularios y auditoría con filtros fecha/actor/entidad/acción; referencias geográficas precargadas y jerarquía. Diferenciar origen único/estado de relación, estado de movimiento y código no editable; mantener legibles referencias históricas inactivas, solo opciones vigentes para nuevas selecciones. Campos/jerarquía obligatorios, promoción opcional ≤150 y sin dirección libre. Advertir inactivación de materia/carrera y ciclos afectados por sigla; pedir motivos solo sensibles; transiciones manuales Director según matriz, DESIERTO con catálogo activo/OTRO+detalle y ANULADO con texto libre. Cancelar/Descartar solo formulario nuevo; nunca Eliminar Ciclo persistido. Conservar versión leída, mostrar conflicto y exigir recarga sin sobrescribir/merge automático. Ejecutar comandos compuestos sin coordinación transaccional en React; teclado/foco/etiquetas y limpieza al cambiar identidad. Sin motor genérico de CRUD ni escrituras coordinadas por navegador.
- Finalización: UI usa permisos efectivos como presentación; negativos directos siguen siendo denegados con UI manipulada. No controles o campos de negocio no aprobados.
- Estado: NO INICIADA.

## TASK-H2-007 — CI, reproducción y ensayo negativo relevante

- REQ: 001, 014, 016. DES: 008–009. Pruebas: TEST-H2-001, 002, 008–017, 022 a 034.
- Dependencia: 006.
- Trabajo futuro: ampliar CI existente con inventario, datos/roles/auditoría/rollback y regresión, reset y repetición; documentar clon desde candidato, comandos y diagnóstico. Realizar alteración temporal controlada de autorización que una petición ordinaria detecte; retirar solo esa alteración y su rama temporal, conservar evidencia y comprobar cleanup. Sin despliegue ni merge automáticos.
- Finalización: CI positiva del candidato, CI negativa esperada por acceso indebido real, reproducción desde clon limpio, sin cambios globales del host. Guard no deshabilitado para hacer pasar pruebas.
- Estado: NO INICIADA.

## TASK-H2-008 — Evidencia técnica y recorridos humanos

- REQ: 010–016. DES: 001–009. Pruebas: TEST-H2-001 a 017 y 022 a 034; preparar TEST-H2-018 a 020.
- Dependencia: 007.
- Trabajo futuro: ejecutar suite técnica, registrar commit/comando/resultado/defecto/corrección/repetición; presentar inventario de roles/catálogos/tablas/policies/RPC/trigger/grants y controles de propagación/concurrencia, y comparación razonada de simplicidad. Preparar recorridos humanos exactos y evidencia visual sin secretos. Registrar solo resultados confirmados por una persona; limitaciones del entorno explícitas.
- Finalización: candidato técnico listo y evidencia revisable, sin autoatribuir pruebas humanas ni aceptación. Detenerse para revisión.
- Estado: NO INICIADA.

## TASK-H2-009 — Revisión humana funcional, visual y arquitectónica

- REQ: 010–013, 015–016. DES: 006–009. Pruebas: TEST-H2-018, 019, 020.
- Dependencia: 008.
- Responsabilidad humana: recorrer CRUD/roles/auditoría, cuatro modos y forced-colors cuando sea posible; evaluar mantenibilidad y decidir corrección o conformidad. Codex prepara soporte y registra confirmaciones; no aprueba ni ejecuta en nombre de la persona.
- Finalización: resultados humanos por commit y limitaciones, correcciones técnicas repetidas si corresponden. Cambio de diseño/alcance/nueva tecnología detiene trabajo afectado para decisión; no cambiar arquitectura automáticamente.
- Estado: NO INICIADA / REQUIERE PERSONA.

## TASK-H2-010 — Cierre exclusivamente posterior a Gate 2

- REQ: 016. DES: 009. Pruebas: TEST-H2-021.
- Dependencia: 009 y aprobación humana final explícita del candidato y de su integración.
- Trabajo futuro: crear acceptance, actualizar PLAN y realizar integración trazable solo si se autoriza. No integrar rama Spec por separado ni iniciar H3.
- Finalización: SHA de aceptación e integración, working tree limpio y decisión humana trazable.
- Estado: NO INICIADA / BLOQUEADA POR GATE 2.

## Matriz explícita REQ → DES → TASK → TEST

Los números de cada columna tienen prefijo completo REQ-H2-, DES-H2-, TASK-H2- o TEST-H2-, respectivamente. Rangos inclusivos. Esta trazabilidad no significa ejecución ni aprobación de Gate 1.

| REQ | DES | TASK | TEST |
|---|---|---|---|
| 001 | 001, 009 | 001, 002, 004, 007 | 001, 002, 013, 017, 022, 034 |
| 002 | 002, 003, 005, 006 | 002, 003, 004, 006 | 003, 007, 011, 018, 024, 027, 029, 032 |
| 003 | 002, 003, 005, 006 | 002, 003, 004, 006 | 004, 007, 011, 018, 024, 026, 029, 031, 032 |
| 004 | 002, 003, 004, 005 | 002, 003, 004, 006 | 004, 005, 006, 010, 011, 027, 029, 032, 033 |
| 005 | 002, 003, 006 | 002, 003, 004, 006 | 005, 006, 018, 023, 025, 028, 030, 031, 032 |
| 006 | 003, 005, 006 | 002, 003, 004, 006 | 005, 006, 007, 025, 026, 028, 030 |
| 007 | 001, 002, 003, 008 | 002, 003, 004, 006 | 003–007, 009, 023–029, 031, 032, 033 |
| 008 | 001, 004, 008 | 001, 003, 004, 006, 007 | 008–010, 012, 013, 017, 018, 022, 028, 030, 031, 034 |
| 009 | 002, 003, 005 | 002, 003, 004, 006 | 011, 012, 018, 026–029, 030, 031, 033 |
| 010 | 001, 006, 007 | 005, 006, 008, 009 | 009, 013, 016, 018, 019, 029, 030, 031, 034 |
| 011 | 007 | 005, 006, 008, 009 | 014, 015, 019 |
| 012 | 006, 007 | 005, 006, 008, 009 | 015, 016, 019 |
| 013 | 007 | 005, 006, 008, 009 | 014, 019 |
| 014 | 001, 003–005, 008, 009 | 002–008 | 002–017, 022–029, 030–034 |
| 015 | 001, 009 | 008, 009 | 020 |
| 016 | 001, 009 | 001, 007–010 | 001, 017–021 |

Todas las decisiones OQ-H2-001 a 010 se trazan al registro de requirements. Cobertura específica: roles/directorio 008/022/034; ciclo/estados 005/028; superposición 006; materias y origen único 027/032/033; UUID/normalización 024; inactivación 007/032; sigla/correlativo 025/026; maestras/catálogos 023/031; auditoría 011/012; optimistic concurrency 029; descarte/no DELETE 030. R-H2-001 a 006 están resueltas, no son dependencias abiertas.

### Trazabilidad de los seis cierres residuales

Prefijos numéricos como en la matriz anterior. Todas las decisiones tienen estado RESUELTA POR DECISIÓN HUMANA en requirements, no son preguntas pendientes.

| Decisión | REQ | DES | TASK | TEST |
|---|---|---|---|---|
| R-H2-001 | 005, 006, 008 | 003, 004, 006 | 002, 003, 004, 006 | 005, 006, 008, 028 |
| R-H2-002 | 003, 005, 007, 009 | 002, 003, 005, 009 | 002, 003, 004, 006 | 023, 031 |
| R-H2-003 | 002, 003, 004, 007 | 002, 003 | 002, 003, 004, 006 | 007, 027, 032, 033 |
| R-H2-004 | 003, 006, 007 | 002, 003 | 002, 003, 004, 006 | 024, 025, 026 |
| R-H2-005 | 005, 007, 008, 010 | 002, 004, 006 | 002, 003, 004, 006 | 005, 023, 034 |
| R-H2-006 | 001, 008, 014 | 001, 004, 009 | 002, 003, 004, 006, 007 | 008, 013, 022, 034 |

Precisiones adicionales: conservación/Cancelación de formulario y no DELETE → REQ-005/010, DES-003/006, TASK-003/006, TEST-030; catálogos simples y datos iniciales → REQ-003/005/007/009, DES-002/005/009, TASK-002/003/004/006, TEST-023/031.

## Registro y detención

Cada tarea futura debe registrar commits, comandos, resultados, defectos, correcciones dentro del Spec y pruebas repetidas. Ninguna tarea autoriza cambiar alcance, diseño o tecnología sin decisión humana. No instalar ni reconfigurar el host, firewall, Docker o WSL bajo este Spec. Mantener límites y riesgos aceptados H0/H1.

**H2 SPEC: PENDING HUMAN APPROVAL**
**H2 IMPLEMENTATION: BLOCKED — NOT STARTED**
