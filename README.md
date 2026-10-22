# PERÚ MAR Supabase

Base documental de una nueva implementación candidata con React, TypeScript, Supabase y PostgreSQL para una institución y baja concurrencia.

## Estado

PLAN 1.0 y Spec H0 aprobados humanamente el 21/10/2026 (Gate 1). H0 y Gate 2 aprobados humanamente el mismo día sobre `9523e2e0e1b1889dd12ed3902fa3fe23f7c52141`; [aceptación y autorización de integración a main](docs/specs/H0-bootstrap/acceptance.md). H1 no iniciado. La pantalla y el diagnóstico son exclusivamente técnicos.

La jerarquía es: `docs/PLAN_MVP.md`, historias vigentes, Spec aprobado del hito e informes arquitectónicos como sustento técnico. El Spec aprobado se conserva sin cambios de requisitos/diseño/tareas. El registro posterior de aprobación está en el PLAN.

El remoto autorizado `fcamasca/perumar-supabase` se verificó privado y está vinculado como origin. main recibe el bootstrap aceptado mediante la integración autorizada de `feature/h0-bootstrap`; la rama Spec conserva la aprobación original. No existe proyecto Supabase alojado, autenticación funcional ni esquema de negocio.

La evidencia histórica está en [implementation-log.md](docs/specs/H0-bootstrap/implementation-log.md) y las verificaciones finales en [technical-results.md](docs/specs/H0-bootstrap/technical-results.md). La [enmienda CHG-H0-001](docs/specs/H0-bootstrap/approved-isolation-amendment.md) fue aprobada humanamente: Windows puede usar aislamiento efectivo mediante la regla exacta creada administrativamente. No se afirma que Docker tenga binding exclusivo a loopback. **54322/TCP: NO VERIFICADO DE FORMA INDEPENDIENTE**; riesgo residual aceptado para H0 local sin datos reales.

## Prerrequisitos e instalación inicial

Git con acceso legítimo al repositorio privado, Node **24.19.0**, npm **10.9.0** y Docker Desktop con motor Linux activo. CLI Supabase **2.121.0**, SDK **2.118.0** y demás dependencias fijadas en manifiesto/lockfile. No se necesita CLI global, login Supabase ni proyecto remoto. La primera instalación y descarga de imágenes requieren Internet; CI usa Ubuntu 24.04 y Docker del runner.

Antes de arrancar en Windows, revisar la [regla aprobada y su alcance](docs/specs/H0-bootstrap/environment-change-proposal.md) junto con la enmienda. Si los bindings no son loopback, debe existir la regla exacta habilitada y efectiva y todos los perfiles activos. El script solo consulta: no crea ni cambia reglas. La creación es una operación administrativa explícita; no se configura firewall para todos los desarrolladores automáticamente. No reutilizar estos puertos para otros servicios mientras la regla esté activa.

```powershell
git clone --branch feature/h0-bootstrap https://github.com/fcamasca/perumar-supabase.git perumar-h0-review
Set-Location perumar-h0-review
node --version
npm --version
npm ci
```

En este equipo, Node global es 22.12.0. Sin cambiarlo, se puede activar el Node compatible ya disponible solo para esta sesión:

```powershell
$env:Path = 'C:/Users/Rodrigo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin;' + $env:Path
node --version
node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' --version
```

En ese caso sustituir cada `npm <argumentos>` de esta guía por `node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' <argumentos>`, incluido `ci`. El wrapper global npm puede elegir su Node global. En otros equipos se usa la instalación compatible propia; esas rutas personales no son un prerrequisito del proyecto.

## Inicio diario y configuración pública local

```powershell
npm run supabase:start
npm run supabase:status
npm run supabase:env
npm run test:local
npm run dev
```

`supabase:env` se ejecuta solo al preparar el clon: crea `.env.local` con los dos campos documentados en `.env.example`, tomando únicamente URL y clave publicable/anon del stack local. Nunca imprime valores ni sobrescribe un archivo existente. Revisar el ejemplo permite conocer los nombres y placeholders sin copiar credenciales administrativas. No ejecutar `supabase status` sin filtrar ni copiar su salida completa.

Abrir `http://127.0.0.1:5173`. Pulsar **Comprobar conexión local**: debe informar Data API disponible. No hay sondeo automático, login, tablas, formularios ni funciones de negocio. El diagnóstico usa OpenAPI del SDK sobre el esquema público vacío, sin consultas a entidades. Vite y preview escuchan solo en loopback.

Los campos son `VITE_SUPABASE_URL` (API HTTP de loopback, puerto 54321) y `VITE_SUPABASE_PUBLISHABLE_KEY` (publicable o anon legacy local). **Todo VITE_* es visible al navegador.** Nunca usar secret/service_role, SQL, PAT ni claves privadas. `.env.local` está ignorado por Git; los placeholders del ejemplo no constituyen configuración válida. El build rechaza configuración faltante/remota/privilegiada antes de generar artefactos; no hay fallback remoto.

## Verificación técnica y reconstrucción

En otra terminal del mismo clon con el runtime compatible:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:build-safety
npm run test:local
npm run supabase:reset
npm run test:local
```

El reset destruye únicamente la base local desechable de este proyecto y usa la misma red del arranque. Nunca usar con datos reales. Rechaza link remoto o flags adicionales. H0 no tiene SQL propio; la CLI puede avisar que ignora `migrations/README.md`. El historial de aplicación puede no existir todavía: no se crea una tabla vacía para simularlo. [Disciplina de migraciones](supabase/migrations/README.md).

Para parar: Ctrl+C en la terminal de Vite y `npm run supabase:stop`. Conserva volúmenes locales; no para otros proyectos ni Docker Desktop. Para comprobar recreación: parar, volver a iniciar y repetir `test:local`.

## Diagnóstico de problemas

- Docker no responde: comprobar manualmente Engine running y motor Linux; el proyecto no instala ni reconfigura Docker/WSL.
- Guard rechaza aislamiento: revisar regla exacta/política efectiva y perfiles habilitados, o bindings estrictos de loopback. El guard detiene el stack ante un fallo; no desactivarlo. Un cambio administrativo posterior no es monitorizado continuamente.
- `.env.local` ya existe: no se sobrescribe. Si se quiere regenerar, detener Vite y mover ese archivo a un respaldo local ignorado antes de ejecutar `supabase:env` de nuevo; no publicarlo.
- Configuración faltante o inválida: mensaje con el nombre del campo, sin su valor. Corregir solo configuración pública local y reiniciar Vite. Un build inválido debe fallar.
- Puerto ocupado: identificar el proceso; no detener servicios ajenos ni cambiar puertos o reglas silenciosamente.
- Reset falla: el script detiene el stack; revisar salud y red del proyecto antes de repetir. No ocultar el fallo ni usar un destino remoto.

## CI y revisión humana

Un workflow con permisos `contents: read` ejecuta instalación, lint, tipos, pruebas, integración local, build seguro y reset; siempre intenta detener el stack. Acciones fijadas por SHA y sin deployment ni secretos de producción. La rama `feature/h0-bootstrap-ci-negative` es un ensayo deliberado: su build debe fallar por configuración inválida. La rama candidata normal debe pasar. No usar el ensayo fallido como commit a aceptar. El dispatch opcional depende de la disponibilidad del workflow en la rama predeterminada; en H0 se usó la rama de ensayo sin modificar main.

Los recorridos humanos TEST-H0-012 y TEST-H0-014 están en [technical-results.md](docs/specs/H0-bootstrap/technical-results.md), que conserva la evidencia presentada antes del Gate 2. La aprobación humana global posterior del resultado se registra en [acceptance.md](docs/specs/H0-bootstrap/acceptance.md); Codex no se atribuye ejecución ni aprobación humana.

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

Los scripts operativos son exclusivamente locales. El guard acepta loopback estricto o la mitigación exacta aprobada y rechaza cualquier otra situación. La reconstrucción local no sustituye backups/restauración productivos de H9. Las limitaciones aceptadas de red no autorizan datos reales, alojamiento LAN/Internet ni funciones de H1.
