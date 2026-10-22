# PERÚ MAR Supabase

Base documental de una nueva implementación candidata con React, TypeScript, Supabase y PostgreSQL para una institución y baja concurrencia.

## Estado

PLAN 1.0 y Spec H0 aprobados humanamente el 21/10/2026 (Gate 1). H0 está EN CONSTRUCCIÓN en `feature/h0-bootstrap` y bloqueado en TASK-H0-003 por aislamiento de red de Docker Desktop. El frontend técnico ya existe; Supabase local fue detenido al comprobar publicación fuera de loopback.

La jerarquía es: `docs/PLAN_MVP.md`, historias vigentes, Spec aprobado del hito e informes arquitectónicos como sustento técnico. El Spec aprobado se conserva sin cambios de requisitos/diseño/tareas. El registro posterior de aprobación está en el PLAN.

El remoto autorizado `fcamasca/perumar-supabase` existe y se verificó privado, pero aún no se vinculó ni recibió pushes: TASK-H0-005 depende de completar el entorno local y la configuración. No existe proyecto Supabase alojado, autenticación funcional ni esquema de negocio.

La evidencia, las tareas pendientes y las limitaciones están en [implementation-log.md](docs/specs/H0-bootstrap/implementation-log.md). El [cambio propuesto de aislamiento](docs/specs/H0-bootstrap/environment-change-proposal.md) es solo una propuesta; no se aplicó.

## Verificación técnica disponible del frontend

Runtime fijado: Node 24.19.0 y npm 10.9.0. Un paquete y un lockfile. Con esas versiones activas, ejecutar `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` y `npm run dev`. El frontend de desarrollo escucha únicamente en `http://127.0.0.1:5173` y no requiere .env mientras TASK-H0-004 siga pendiente.

En este equipo, Node global es 22.12.0; las verificaciones se ejecutaron con Node 24.19.0 ya disponible en `C:/Users/Rodrigo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe` y npm CLI 10.9.0 de `C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js`. No se modificó la instalación global. Para reproducir aquí sin cambiarla, anteponer la carpeta de ese Node al PATH de la sesión e invocar ese ejecutable con la ruta de npm CLI y los argumentos indicados.

La pantalla muestra explícitamente conexión Supabase pendiente: no representa una integración completa. El README operativo integral y la CI siguen pendientes según sus dependencias. No ejecutar pruebas humanas completas de H0 ni considerar aceptado el hito con este resultado parcial.

## Spec-Driven Development

PLAN → requirements → design → tasks → test-plan → aprobación humana del Spec → rama de implementación → construcción → pruebas técnicas → pruebas humanas → aprobación humana final → acceptance → merge a main.

El Gate 1 autoriza construir exclusivamente el hito revisado. El Gate 2 autoriza aceptarlo y llevarlo a main. Ningún documento ni pipeline sustituye estas decisiones humanas.

Para cada hito se crea `feature/<hito>-spec` desde main. Solo después del Gate 1 se crea `feature/<hito>` desde el commit exacto del Spec aprobado, nunca directamente desde main. `acceptance.md` se genera únicamente después de construcción, pruebas técnicas, pruebas humanas y aceptación explícita.

## Fuentes

- [PLAN MVP](docs/PLAN_MVP.md): orden y alcance de los hitos.
- [Historias de usuario](docs/requirements/Historias_de_Usuario.md): fuente funcional.
- [Evaluación arquitectónica](docs/architecture/Informe_Evaluacion_Arquitectonica_PERUMAR.md).
- [Alternativas arquitectónicas](docs/architecture/Informe_Alternativas_Arquitectura_PERUMAR.md).

La historia de usuario aportada como `Historias_de_Usuario_export.md` se normalizó de Windows-1252 a UTF-8 y se renombró a `Historias_de_Usuario.md`, sin reinterpretar ni corregir sus requisitos. Los informes son contexto; sus referencias antiguas no sustituyen al PLAN vigente. No se incorporan scripts, configuraciones ni código de implementaciones anteriores.

Los scripts `supabase:start`, `supabase:status`, `supabase:stop` y `supabase:reset` son exclusivamente locales. El arranque comprueba las publicaciones y se detiene si no son loopback. No reactivar el stack ni eludir esta protección hasta decidir el hallazgo de entorno. La reconstrucción local y las comprobaciones completas de conectividad están pendientes; no sustituyen backups/restauración productivos de H9.
