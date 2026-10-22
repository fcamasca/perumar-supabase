# H0 — Tasks

**Spec:** H0-bootstrap · **Versión:** 0.1 · **Fecha:** 2026-10-21
**H0 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**

Todas las tareas siguientes son **futuras y NO INICIADAS**. La preparación de Git local, main documental y rama Spec se autorizó por separado; no se marca H0 implementado por ese trabajo. No se ejecutan tareas al generar este documento.

## Orden y condiciones

Gate 1 → TASK-H0-001 → TASK-H0-002 → TASK-H0-003 → TASK-H0-004 → TASK-H0-005 → TASK-H0-006 → TASK-H0-007 → TASK-H0-008 → TASK-H0-009 → Gate 2 → acceptance → merge.

El orden es deliberadamente secuencial para un mantenedor. OQ-H0-002 se resuelve antes de TASK-H0-005; si queda pendiente, se detiene esa tarea y no se considera terminado H0. Toda alteración de alcance/diseño se documenta y requiere decisión humana antes del trabajo afectado.

## TASK-H0-001 — Abrir construcción desde el Spec aprobado

- **Objetivo:** garantizar origen y alcance autorizados antes de construir.
- **Requisitos:** REQ-H0-001, REQ-H0-004, REQ-H0-012, REQ-H0-013.
- **Diseños:** DES-H0-001, DES-H0-003, DES-H0-010.
- **Dependencias:** Gate 1 explícito sobre commit; OQ-H0-001 resuelta.
- **Alcance:** verificar commit/estado, crear `feature/h0-bootstrap` desde el Spec aprobado, comprobar herramientas disponibles y registrar versiones elegidas. No reinicializar Git ni alterar main.
- **Componentes previstos:** metadatos de rama, referencia de runtime Node/npm y prerrequisitos para README; no módulos funcionales.
- **Resultado esperado:** construcción en rama correcta, herramientas compatibles y límites entendidos.
- **Criterio de finalización:** descendencia del commit aprobado verificable; ningún recurso remoto creado durante el cambio de rama; prerrequisitos registrados sin inventar disponibilidad.
- **Prueba asociada:** TEST-H0-001 y TEST-H0-002.
- **Estado:** NO INICIADA.

## TASK-H0-002 — Preparar frontend técnico reproducible

- **Objetivo:** obtener una aplicación React/TypeScript/Vite mínima y verificable.
- **Requisitos:** REQ-H0-003, REQ-H0-004, REQ-H0-009, REQ-H0-012.
- **Diseños:** DES-H0-002, DES-H0-003.
- **Dependencias:** TASK-H0-001.
- **Alcance:** un paquete npm, lockfile, TypeScript estricto, lint, build y pantalla neutra. Incorporar pruebas útiles de montaje/configuración sin estructura funcional anticipada.
- **Componentes previstos:** package/lockfile, configuraciones Vite/TS/lint, index, `src/main.tsx`, `src/App.tsx`, estilos y `tests/`.
- **Resultado esperado:** instalación limpia, pantalla inicial y verificaciones reproducibles.
- **Criterio de finalización:** docs existentes conservados; no segundo .git, no Redux, rutas de negocio ni paquetes preventivos; scripts fallan cuando hay errores reales.
- **Prueba asociada:** TEST-H0-002, TEST-H0-003, TEST-H0-004 y TEST-H0-005.
- **Estado:** NO INICIADA.

## TASK-H0-003 — Establecer Supabase local y disciplina de migraciones

- **Objetivo:** reproducir la plataforma local sin modelo de negocio ni proyecto alojado.
- **Requisitos:** REQ-H0-005, REQ-H0-008, REQ-H0-012.
- **Diseños:** DES-H0-004, DES-H0-006.
- **Dependencias:** TASK-H0-002 y runtime compatible disponible/autorizado.
- **Alcance:** CLI fijada, configuración local, inicio/parada/estado filtrado y reconstrucción desechable; documentar ubicación/versionado de futuras migraciones.
- **Componentes previstos:** dependencia CLI/lockfile, `supabase/config.toml`, `supabase/migrations/README.md`, scripts operativos locales si aportan un punto de entrada claro.
- **Resultado esperado:** stack local disponible y recreable sin login/link remoto.
- **Criterio de finalización:** historial de migraciones propias vacío; sin SQL vacío, tablas dummy, usuarios funcionales, buckets o policies de negocio; reset restringido al destino local.
- **Prueba asociada:** TEST-H0-006, TEST-H0-007 y TEST-H0-013.
- **Estado:** NO INICIADA.

## TASK-H0-004 — Configuración y conexión pública local segura

- **Objetivo:** conectar el frontend al entorno local sin exponer credenciales privilegiadas.
- **Requisitos:** REQ-H0-006, REQ-H0-007, REQ-H0-009.
- **Diseños:** DES-H0-005, DES-H0-010.
- **Dependencias:** TASK-H0-003.
- **Alcance:** módulo de variables, un cliente SDK, diagnóstico explícito de conectividad, .env.example con placeholders y exclusiones ajustadas a archivos reales.
- **Componentes previstos:** `src/lib/env.ts`, `src/lib/supabase.ts`, pantalla técnica, `.env.example`, `.gitignore`, tests de configuración.
- **Resultado esperado:** conexión local comprobable y error seguro cuando la configuración falla.
- **Criterio de finalización:** sin fallback remoto, sin service_role/secret ni credenciales SQL en navegador; ejemplos sin valores reales; ninguna consulta a tablas de negocio.
- **Prueba asociada:** TEST-H0-005, TEST-H0-006, TEST-H0-008 y TEST-H0-009.
- **Estado:** NO INICIADA.

## TASK-H0-005 — Crear remoto privado y vincular Git

- **Objetivo:** permitir clonado privado del proyecto construido.
- **Requisitos:** REQ-H0-001, REQ-H0-002, REQ-H0-007.
- **Diseños:** DES-H0-001, DES-H0-007, DES-H0-010.
- **Dependencias:** TASK-H0-004; OQ-H0-002 resuelta; autenticación existente/autorizada sin revelar tokens.
- **Alcance:** inspeccionar destino, crear remoto privado si no existe, verificar privacidad, configurar origin y publicar historia autorizada. No forzar ni reemplazar un remoto ajeno.
- **Componentes previstos:** repositorio GitHub y configuración origin; ningún deployment ni proyecto Supabase alojado.
- **Resultado esperado:** remoto privado confirmado y accesible al revisor autorizado.
- **Criterio de finalización:** owner/nombre/visibilidad comprobados; URL sin credenciales; main mantiene base hasta aceptación; no merge.
- **Prueba asociada:** TEST-H0-001, TEST-H0-009 y TEST-H0-010.
- **Estado:** NO INICIADA.

## TASK-H0-006 — Construir CI de verificación

- **Objetivo:** ejecutar las mismas verificaciones desde un entorno limpio sin secretos de producción.
- **Requisitos:** REQ-H0-004, REQ-H0-007, REQ-H0-009, REQ-H0-010, REQ-H0-013.
- **Diseños:** DES-H0-003, DES-H0-008, DES-H0-010.
- **Dependencias:** TASK-H0-005.
- **Alcance:** workflow único de frontend e integración local; permisos de lectura; sin deployment, aceptación ni merge automáticos. Registrar evidencia de ejecuciones.
- **Componentes previstos:** `.github/workflows/ci.yml`, scripts/tests ya previstos, referencias de herramientas fijadas.
- **Resultado esperado:** lint, tipos, pruebas, build y reconstrucción local comprobables en CI.
- **Criterio de finalización:** ejecución verde sobre el commit correspondiente y ensayo controlado de fallo detectado por un test; logs revisados sin secretos; recursos locales del runner no se convierten en infraestructura permanente.
- **Prueba asociada:** TEST-H0-002, TEST-H0-003, TEST-H0-004, TEST-H0-006, TEST-H0-007, TEST-H0-009 y TEST-H0-011.
- **Estado:** NO INICIADA.

## TASK-H0-007 — Completar guía reproducible y límites

- **Objetivo:** que una persona pueda operar el bootstrap desde cero siguiendo el repositorio.
- **Requisitos:** REQ-H0-011, REQ-H0-012, REQ-H0-013.
- **Diseños:** DES-H0-002, DES-H0-009, DES-H0-010.
- **Dependencias:** TASK-H0-006.
- **Alcance:** actualizar README con instrucciones verificadas, versiones, variables, diagnóstico seguro, reset local, troubleshooting y gates; preservar la jerarquía de fuentes.
- **Componentes previstos:** `README.md` y referencias a guía de migraciones/Spec; sin manuales redundantes.
- **Resultado esperado:** guía suficiente para el revisor, sin pasos privados implícitos.
- **Criterio de finalización:** clon limpio reproducido desde README y limitaciones explícitas; no presentar H1 como implementado ni H0 como aceptado.
- **Prueba asociada:** TEST-H0-012 y TEST-H0-013.
- **Estado:** NO INICIADA.

## TASK-H0-008 — Verificación técnica y revisión humana

- **Objetivo:** recopilar evidencia real del resultado y defectos antes de solicitar aceptación.
- **Requisitos:** REQ-H0-009, REQ-H0-011, REQ-H0-012, REQ-H0-013.
- **Diseños:** DES-H0-008, DES-H0-009, DES-H0-010.
- **Dependencias:** TASK-H0-007.
- **Alcance:** ejecutar suite completa, revisar secretos/exclusiones, realizar pruebas humanas de README y pantalla; corregir defectos dentro del Spec y repetir comprobaciones afectadas.
- **Componentes previstos:** código/configuración aprobados si hay defectos, evidencia adjunta de pruebas sin secretos. No crear acceptance anticipada.
- **Resultado esperado:** commit candidato y resultados técnicos/humanos identificables; defectos críticos cerrados.
- **Criterio de finalización:** TEST-H0-001 a TEST-H0-014 con evidencia prevista disponible y resultados satisfactorios; si hay cambio de diseño/alcance, detener hasta decisión humana.
- **Prueba asociada:** TEST-H0-001 a TEST-H0-014, especialmente TEST-H0-012, TEST-H0-013 y TEST-H0-014.
- **Estado:** NO INICIADA.

## TASK-H0-009 — Registrar aceptación y cerrar H0

- **Objetivo:** distinguir un resultado técnicamente válido de un hito aceptado.
- **Requisitos:** REQ-H0-001, REQ-H0-013.
- **Diseños:** DES-H0-001, DES-H0-009.
- **Dependencias:** TASK-H0-008; aprobación humana final explícita del commit candidato y autorización de integración (Gate 2).
- **Alcance:** solo después de Gate 2, generar acceptance con referencias a pruebas/decisión, actualizar estado del PLAN y efectuar la integración autorizada a main. No comenzar H1.
- **Componentes previstos:** futuro `docs/specs/H0-bootstrap/acceptance.md`, estado del PLAN y metadatos de merge.
- **Resultado esperado:** main contiene resultado aceptado y evidencia trazable.
- **Criterio de finalización:** acceptance posterior a pruebas y decisión humana, sin cambios técnicos no revisados entre candidato y aceptación; main no se actualiza por CI ni por silencio.
- **Prueba asociada:** TEST-H0-001 y TEST-H0-015.
- **Estado:** NO INICIADA.

## Evidencia y detención

Cada tarea terminada se acompaña de commit y resultado de su prueba, no de una afirmación de éxito sin evidencia. Hallazgos: problema, causa, clasificación (corrección/diseño/alcance/evolución), opciones y recomendación. Cambios de diseño/alcance requieren decisión humana. Las correcciones necesarias para cumplir el mismo Spec no implican autoaprobar el hito.

Las pruebas humanas las realiza o confirma una persona; Codex prepara el recorrido y evidencia técnica, pero no se atribuye esa revisión. La matriz completa está en [test-plan.md](test-plan.md#7-matriz-de-trazabilidad).

**H0 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**
