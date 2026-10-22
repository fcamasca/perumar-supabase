# H2 — Base académica: tasks

**Versión:** 0.2 · **Fecha:** 22/10/2026 (America/Lima)
**H2 SPEC: PENDING HUMAN APPROVAL** · **IMPLEMENTATION: BLOCKED**

Plan de construcción futura. **Todas las tareas están NO INICIADAS**; redactarlas no autoriza ejecutarlas. Fuentes, decisiones y detalles residuales: [requirements.md](requirements.md); diseño: [design.md](design.md); evidencia esperada: [test-plan.md](test-plan.md).

Orden obligatorio: 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010. OQ-H2-001 a 010 están resueltas humanamente; los detalles residuales R-H2-001 a 006 detienen su parte afectada hasta decisión explícita. No empezar una tarea dependiente para rodear el bloqueo.

## TASK-H2-001 — Gate 1, decisiones y base aprobada

- REQ: 001, 008, 016. DES: 001, 009. Pruebas: TEST-H2-001.
- Dependencia: aprobación humana explícita del Spec exacto revisado con las diez decisiones ya aprobadas; resolver/delimitar expresamente R-H2-001 a 006 antes de construir las partes afectadas. Esta revisión documental no es Gate 1.
- Trabajo futuro: comprobar rama Spec, commit aprobado, working tree limpio y descendencia de main actualizado. Registrar aprobación; crear `feature/h2-academic` desde el commit exacto aprobado de `feature/h2-academic-spec`, no desde un main posterior. Incorporar el registro documental de aprobación siguiendo el proceso H1.
- Finalización: base y decisiones trazables; ninguna regla funcional inventada. Sin esa evidencia no construir ni instalar dependencias.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H2-002 — Modelo, constraints y migración local H2

- REQ: 001–009. DES: 001–005, 009. Pruebas: TEST-H2-002 a 007, 011, 022 a 025, 028, 029.
- Dependencia: 001; decisiones funcionales registradas y detalles residuales aplicables cerrados, incluida fuente autorizada de catálogos y tratamiento de roles.
- Trabajo futuro: crear futuramente modelo aditivo con UUID/FK UUID, códigos/nombres normalizados UNIQUE y límites, active solo en maestras, Ciclo operativo con estado_codigo, origen de materias, sigla/correlativo anual, updated_at servidor y auditoría relacional JSONB. Evolucionar catálogo/restricciones de roles H1 a DIRECTOR_ACADEMICO/COORDINADOR_ACADEMICO/ADMIN_SISTEMA sin asignación automática de personas. Preparar carga inicial geográfica/capitanías/modalidades/motivos con fuente controlada y jerarquía; no todo HU20. Adaptar reset/inventario; ninguna exposición permisiva ni entidad H3. No ejecutar esta tarea en la fase Spec.
- Finalización: reconstrucción local reproducible; duplicados, huérfanos y estados inválidos rechazados por DB; diff limitado a inventario aprobado.
- Estado: NO INICIADA.

## TASK-H2-003 — RLS, grants y operaciones atómicas con auditoría

- REQ: 002–009, 014. DES: 003–005, 008. Pruebas: TEST-H2-006 a 012, 022, 025 a 029.
- Dependencia: 002 y matriz/estrategia privilegiada aprobadas.
- Trabajo futuro: aplicar matriz de roles reales y multirol sin CRUD implícito ADMIN_SISTEMA; comandos acotados que protegen permisos, optimistic concurrency, motivo sensible y auditoría en la misma transacción. Implementar garantías de superposición Carrera+Capitanía+fechas inclusivas, contador anual global, propagación de materias heredadas conservando adicionales/históricos, cambio atómico de sufijo por sigla y transiciones manuales Director. Sin scheduler ni entidades futuras de matrícula/facturación. Bloquear escritura directa que evada comandos; revisar owner/search_path/EXECUTE/RLS y rechazo de roles técnicos. Sin motor de permisos ni administración de identidad.
- Finalización: positivos/negativos con JWT ordinarios, rollback y ausencia de escritura no autorizada; auditoría atómica y no editable por cliente. Ningún comando definer aprobado solo por su nombre.
- Estado: NO INICIADA.

## TASK-H2-004 — Pruebas reales y fixtures locales de datos/seguridad

- REQ: 001–009, 014. DES: 001–005, 008–009. Pruebas: TEST-H2-002 a 013, 022 a 029.
- Dependencia: 003.
- Trabajo futuro: preparar fixtures nuevos con roles funcionales, cada rol, combinaciones y sin habilitación; ensayar roles técnicos sin autoridad funcional, evolución/reset del catálogo y regresión de propiedades H1. Peticiones JWT ordinarias por actor, observación administrativa separada. Cubrir UUID/normalización, carga de maestras, correlativo anual concurrente, superposición, sigla/históricos, materias heredadas/adicionales/inactivas, estado/motivos, auditoría JSONB y conflicto por updated_at. Registrar comprobaciones futuras diferidas como no ejecutables en H2, no PASSED ficticio. Limpieza tras fallo y éxito.
- Finalización: no service_role en solicitudes que pretenden probar autorización, sin contraseñas/tokens en logs, cleanup tras éxito y fallo; reglas futuras de matrículas no declaradas probadas.
- Estado: NO INICIADA.

## TASK-H2-005 — Preferencias visuales y tokens semánticos

- REQ: 010–013. DES: 007. Pruebas: TEST-H2-014 a 016, 019.
- Dependencia: 004 y diseño visual aprobado.
- Trabajo futuro: implementar selector simple y CSS compartido para Sistema/Claro/Oscuro/Alto contraste, prioridad del sistema, persistencia local tolerante a fallos y tokens semánticos; medir contrastes de pares/estados. Sin backend, Context/framework innecesario, skins o dependencia nueva.
- Finalización: cuatro preferencias disponibles, fallback Sistema, respuesta en vivo del sistema y forced-colors prioritario. Aprobación humana visual todavía pendiente.
- Estado: NO INICIADA.

## TASK-H2-006 — UI concreta académica y consulta básica de auditoría

- REQ: 002–014. DES: 001–008. Pruebas: TEST-H2-003 a 006, 009, 013 a 016, 018–019, 023 a 029.
- Dependencia: 005.
- Trabajo futuro: pantallas/listas/formularios y auditoría con filtros fecha/actor/entidad/acción; referencias geográficas precargadas y jerarquía. Diferenciar heredadas/adicionales, estado de movimiento y código de ciclo no editable. Advertir inactivación de materia/carrera y ciclos afectados por sigla; pedir motivos solo sensibles; transiciones manuales Director. Conservar versión leída, mostrar conflicto y exigir recarga sin sobrescribir/merge automático. Ejecutar comandos compuestos sin coordinación transaccional en React; teclado/foco/etiquetas y limpieza al cambiar identidad. Sin motor genérico de CRUD ni escrituras coordinadas por navegador.
- Finalización: UI usa permisos efectivos como presentación; negativos directos siguen siendo denegados con UI manipulada. No controles o campos de negocio no aprobados.
- Estado: NO INICIADA.

## TASK-H2-007 — CI, reproducción y ensayo negativo relevante

- REQ: 001, 014, 016. DES: 008–009. Pruebas: TEST-H2-001, 002, 008–017, 022 a 029.
- Dependencia: 006.
- Trabajo futuro: ampliar CI existente con inventario, datos/roles/auditoría/rollback y regresión, reset y repetición; documentar clon desde candidato, comandos y diagnóstico. Realizar alteración temporal controlada de autorización que una petición ordinaria detecte; retirar solo esa alteración y su rama temporal, conservar evidencia y comprobar cleanup. Sin despliegue ni merge automáticos.
- Finalización: CI positiva del candidato, CI negativa esperada por acceso indebido real, reproducción desde clon limpio, sin cambios globales del host. Guard no deshabilitado para hacer pasar pruebas.
- Estado: NO INICIADA.

## TASK-H2-008 — Evidencia técnica y recorridos humanos

- REQ: 010–016. DES: 001–009. Pruebas: TEST-H2-001 a 017 y 022 a 029; preparar TEST-H2-018 a 020.
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
| 001 | 001, 009 | 001, 002, 004, 007 | 001, 002, 013, 017, 022 |
| 002 | 002, 003, 005, 006 | 002, 003, 004, 006 | 003, 007, 011, 018, 024, 027, 029 |
| 003 | 002, 003, 005, 006 | 002, 003, 004, 006 | 004, 007, 011, 018, 024, 026, 029 |
| 004 | 002, 003, 004, 005 | 002, 003, 004, 006 | 004, 005, 006, 010, 011, 027, 029 |
| 005 | 002, 003, 006 | 002, 003, 004, 006 | 005, 006, 018, 023, 025, 028 |
| 006 | 003, 005, 006 | 002, 003, 004, 006 | 005, 006, 007, 025, 026, 028 |
| 007 | 001, 002, 003, 008 | 002, 003, 004, 006 | 003–007, 009, 023–029 |
| 008 | 001, 004, 008 | 001, 003, 004, 006, 007 | 008–010, 012, 013, 017, 018, 022, 028 |
| 009 | 002, 003, 005 | 002, 003, 004, 006 | 011, 012, 018, 026–029 |
| 010 | 001, 006, 007 | 005, 006, 008, 009 | 009, 013, 016, 018, 019, 029 |
| 011 | 007 | 005, 006, 008, 009 | 014, 015, 019 |
| 012 | 006, 007 | 005, 006, 008, 009 | 015, 016, 019 |
| 013 | 007 | 005, 006, 008, 009 | 014, 019 |
| 014 | 001, 003–005, 008, 009 | 002–008 | 002–017, 022–029 |
| 015 | 001, 009 | 008, 009 | 020 |
| 016 | 001, 009 | 001, 007–010 | 001, 017–021 |

Todas las decisiones OQ-H2-001 a 010 se trazan al registro de requirements. Cobertura específica: roles 008/022; ciclo 005/028; superposición 006; materias 027; UUID/normalización 024; inactivación 007/027; sigla/correlativo 025/026; estados/maestras 023/028; auditoría 011/012; optimistic concurrency 029. Los detalles R-H2-001 a 006 deben cerrarse/delimitarse antes de los casos afectados, sin reabrir las decisiones ya aprobadas.

## Registro y detención

Cada tarea futura debe registrar commits, comandos, resultados, defectos, correcciones dentro del Spec y pruebas repetidas. Ninguna tarea autoriza cambiar alcance, diseño o tecnología sin decisión humana. No instalar ni reconfigurar el host, firewall, Docker o WSL bajo este Spec. Mantener límites y riesgos aceptados H0/H1.

**H2 SPEC: PENDING HUMAN APPROVAL**
**H2 IMPLEMENTATION: BLOCKED — NOT STARTED**
