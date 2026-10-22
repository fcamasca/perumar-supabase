# H2 — Base académica: tasks

**Versión:** 0.1 · **Fecha:** 22/10/2026 (America/Lima)
**H2 SPEC: PENDING HUMAN APPROVAL** · **IMPLEMENTATION: BLOCKED**

Plan de construcción futura. **Todas las tareas están NO INICIADAS**; redactarlas no autoriza ejecutarlas. Fuentes y preguntas: [requirements.md](requirements.md); diseño: [design.md](design.md); evidencia esperada: [test-plan.md](test-plan.md).

Orden obligatorio: 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → 009 → 010. Una OQ sin decisión detiene la parte afectada. No empezar una tarea dependiente para rodear el bloqueo.

## TASK-H2-001 — Gate 1, decisiones y base aprobada

- REQ: 001, 016. DES: 001, 009. Pruebas: TEST-H2-001.
- Dependencia: aprobación humana explícita del Spec exacto y cierre de OQ-H2-001 a 010 o recorte expresamente aprobado en el Spec antes del Gate 1.
- Trabajo futuro: comprobar rama Spec, commit aprobado, working tree limpio y descendencia de main actualizado. Registrar aprobación; crear `feature/h2-academic` desde el commit exacto aprobado de `feature/h2-academic-spec`, no desde un main posterior. Incorporar el registro documental de aprobación siguiendo el proceso H1.
- Finalización: base y decisiones trazables; ninguna regla funcional inventada. Sin esa evidencia no construir ni instalar dependencias.
- Estado: NO INICIADA / BLOQUEADA POR GATE 1.

## TASK-H2-002 — Modelo, constraints y migración local H2

- REQ: 002–007, 009. DES: 002, 003, 005. Pruebas: TEST-H2-002 a 007, 011.
- Dependencia: 001; decisiones de códigos, estados, mínimo de ciclo, asociaciones, fechas, correlativo y auditoría cerradas.
- Trabajo futuro: crear únicamente el modelo aprobado en migración aditiva, con constraints y metadatos de servidor. Preparar reset/inventario exacto; conservar migraciones, seguridad y guard H0/H1. No crear entidades H3 ni catálogos diferidos. Mantener tablas no expuestas a operaciones de producto hasta completar controles; ninguna tabla nueva con acceso público permisivo.
- Finalización: reconstrucción local reproducible; duplicados, huérfanos y estados inválidos rechazados por DB; diff limitado a inventario aprobado.
- Estado: NO INICIADA.

## TASK-H2-003 — RLS, grants y operaciones atómicas con auditoría

- REQ: 004, 006–009, 014. DES: 003–005, 008. Pruebas: TEST-H2-006 a 012.
- Dependencia: 002 y matriz/estrategia privilegiada aprobadas.
- Trabajo futuro: aplicar permisos por entidad/operación, negar por defecto, implementar solo comandos compuestos necesarios y auditoría transaccional protegida. Bloquear bypass por escritura directa de asociaciones o campos internos; inspeccionar owner/search_path/EXECUTE y helpers. No añadir administración de identidad ni motor de permisos.
- Finalización: positivos/negativos con JWT ordinarios, rollback y ausencia de escritura no autorizada; auditoría atómica y no editable por cliente. Ningún comando definer aprobado solo por su nombre.
- Estado: NO INICIADA.

## TASK-H2-004 — Pruebas reales y fixtures locales de datos/seguridad

- REQ: 007–009, 014. DES: 003–005, 008–009. Pruebas: TEST-H2-002 a 013.
- Dependencia: 003.
- Trabajo futuro: preparar actores sintéticos basados en H1, fixture técnico separado, pruebas Data API/RPC y observación administrativa complementaria; comprobar concurrencia, auditoría y limpieza. Registrar matriz aprobada completa, IDs exactos y efectos reales. Probar regresión H1 sin reinterpretar su aceptación histórica.
- Finalización: no service_role en solicitudes que pretenden probar autorización, sin contraseñas/tokens en logs, cleanup tras éxito y fallo; reglas futuras de matrículas no declaradas probadas.
- Estado: NO INICIADA.

## TASK-H2-005 — Preferencias visuales y tokens semánticos

- REQ: 011–013. DES: 007. Pruebas: TEST-H2-014 a 016, 019.
- Dependencia: 004 y diseño visual aprobado.
- Trabajo futuro: implementar selector simple y CSS compartido para Sistema/Claro/Oscuro/Alto contraste, prioridad del sistema, persistencia local tolerante a fallos y tokens semánticos; medir contrastes de pares/estados. Sin backend, Context/framework innecesario, skins o dependencia nueva.
- Finalización: cuatro preferencias disponibles, fallback Sistema, respuesta en vivo del sistema y forced-colors prioritario. Aprobación humana visual todavía pendiente.
- Estado: NO INICIADA.

## TASK-H2-006 — UI concreta de materias, carreras y ciclo mínimo

- REQ: 002–006, 008, 010–013. DES: 001, 006–008. Pruebas: TEST-H2-003 a 006, 009, 013 a 016, 018–019.
- Dependencia: 005.
- Trabajo futuro: pantallas/listas/formularios del alcance aprobado; seleccionar relaciones y ejecutar un solo comando en cambios compuestos; feedback seguro de validación/estado, teclado/foco/etiquetas, limpieza de datos al cambiar identidad. Sin motor genérico de CRUD ni escrituras coordinadas por navegador.
- Finalización: UI usa permisos efectivos como presentación; negativos directos siguen siendo denegados con UI manipulada. No controles o campos de negocio no aprobados.
- Estado: NO INICIADA.

## TASK-H2-007 — CI, reproducción y ensayo negativo relevante

- REQ: 001, 014, 016. DES: 008–009. Pruebas: TEST-H2-001, 002, 008–017.
- Dependencia: 006.
- Trabajo futuro: ampliar CI existente con inventario, datos/roles/auditoría/rollback y regresión, reset y repetición; documentar clon desde candidato, comandos y diagnóstico. Realizar alteración temporal controlada de autorización que una petición ordinaria detecte; retirar solo esa alteración y su rama temporal, conservar evidencia y comprobar cleanup. Sin despliegue ni merge automáticos.
- Finalización: CI positiva del candidato, CI negativa esperada por acceso indebido real, reproducción desde clon limpio, sin cambios globales del host. Guard no deshabilitado para hacer pasar pruebas.
- Estado: NO INICIADA.

## TASK-H2-008 — Evidencia técnica y recorridos humanos

- REQ: 014–016. DES: 001–009. Pruebas: TEST-H2-001 a 017; preparar TEST-H2-018 a 020.
- Dependencia: 007.
- Trabajo futuro: ejecutar suite técnica, registrar commit/comando/resultado/defecto/corrección/repetición; presentar inventario de tablas/policies/RPC/trigger/grants y comparación razonada de simplicidad. Preparar recorridos humanos exactos y evidencia visual sin secretos. Registrar solo resultados confirmados por una persona; limitaciones del entorno explícitas.
- Finalización: candidato técnico listo y evidencia revisable, sin autoatribuir pruebas humanas ni aceptación. Detenerse para revisión.
- Estado: NO INICIADA.

## TASK-H2-009 — Revisión humana funcional, visual y arquitectónica

- REQ: 012, 015–016. DES: 006–009. Pruebas: TEST-H2-018, 019, 020.
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

## Registro y detención

Cada tarea futura debe registrar commits, comandos, resultados, defectos, correcciones dentro del Spec y pruebas repetidas. Ninguna tarea autoriza cambiar alcance, diseño o tecnología sin decisión humana. No instalar ni reconfigurar el host, firewall, Docker o WSL bajo este Spec. Mantener límites y riesgos aceptados H0/H1.

**H2 SPEC: PENDING HUMAN APPROVAL**
**H2 IMPLEMENTATION: BLOCKED — NOT STARTED**
