# PERÚ MAR Supabase

Base documental de una nueva implementación candidata con React, TypeScript, Supabase y PostgreSQL para una institución y baja concurrencia.

## Estado

Preparación documental autorizada. No existe todavía aplicación, proyecto Supabase ni repositorio GitHub. No se ha aprobado la construcción de H0.

La jerarquía es: `docs/PLAN_MVP.md`, historias vigentes, Spec aprobado del hito e informes arquitectónicos como sustento técnico. El PLAN conserva su estado DRAFT; preparar un Spec no constituye su aprobación.

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

Los comandos de instalación, ejecución, migraciones y CI se definirán en el Spec de H0 y se documentarán de forma ejecutable durante su construcción aprobada. Esta base no anticipa esas tareas.
