# PERÚ MAR Supabase

Base documental de una nueva implementación candidata con React, TypeScript, Supabase y PostgreSQL para una institución y baja concurrencia.

## Estado

H0 está aceptado e integrado en main: [aceptación histórica](docs/specs/H0-bootstrap/acceptance.md). H1 está aceptado e integrado en main tras Gate 2 humano del 22/10/2026 sobre el candidato `7c15f6c382c43b08b900f00a793fd590205ab618`: [aceptación de H1](docs/specs/H1-security/acceptance.md). H2 está EN CONSTRUCCIÓN en feature/h2-academic, bajo [Gate 1](docs/specs/H2-academic/gate-1.md), Spec exacto 5c4f57de6618fb0568c6d8846ed04d9d75a89932. Pruebas humanas y Gate 2 pendientes; no aceptación ni merge H2. [Evidencia y recorrido humano de H1](docs/specs/H1-security/implementation-log.md).

La jerarquía es: `docs/PLAN_MVP.md`, historias vigentes, Spec aprobado del hito e informes arquitectónicos como sustento técnico. El Spec aprobado se conserva sin cambios de requisitos/diseño/tareas. El registro posterior de aprobación está en el PLAN.

El remoto autorizado `fcamasca/perumar-supabase` es privado y está vinculado como origin. main integra H0 y H1 aceptados; la rama `feature/h1-security` conserva la trazabilidad de construcción y cierre. No existe proyecto Supabase alojado, esquema de negocio ni hosting. La rama H2 conserva Auth y tres tablas de seguridad y añade el modelo académico aprobado; no hay entidades de matrícula, pagos o facturación.

La evidencia histórica está en [implementation-log.md](docs/specs/H0-bootstrap/implementation-log.md) y las verificaciones finales en [technical-results.md](docs/specs/H0-bootstrap/technical-results.md). La [enmienda CHG-H0-001](docs/specs/H0-bootstrap/approved-isolation-amendment.md) fue aprobada humanamente: Windows puede usar aislamiento efectivo mediante la regla exacta creada administrativamente. No se afirma que Docker tenga binding exclusivo a loopback. **54322/TCP: NO VERIFICADO DE FORMA INDEPENDIENTE**; riesgo residual aceptado para H0 local sin datos reales.

## Prerrequisitos e instalación inicial

Git con acceso legítimo al repositorio privado, Node **24.19.0**, npm **10.9.0** y Docker Desktop con motor Linux activo. CLI Supabase **2.121.0**, SDK **2.118.0** y demás dependencias fijadas en manifiesto/lockfile. No se necesita CLI global, login Supabase ni proyecto remoto. La primera instalación y descarga de imágenes requieren Internet; CI usa Ubuntu 24.04 y Docker del runner.

Antes de arrancar en Windows, revisar la [regla aprobada y su alcance](docs/specs/H0-bootstrap/environment-change-proposal.md) junto con la enmienda. Si los bindings no son loopback, debe existir la regla exacta habilitada y efectiva y todos los perfiles activos. El script solo consulta: no crea ni cambia reglas. La creación es una operación administrativa explícita; no se configura firewall para todos los desarrolladores automáticamente. No reutilizar estos puertos para otros servicios mientras la regla esté activa.

```powershell
git clone --branch main https://github.com/fcamasca/perumar-supabase.git perumar-supabase
Set-Location perumar-supabase
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
npm run supabase:reset
npm run supabase:env
npm run test:local
npm run dev
```

`supabase:env` se ejecuta solo al preparar el clon: crea `.env.local` con los dos campos documentados en `.env.example`, tomando únicamente URL y clave publicable/anon del stack local. Nunca imprime valores ni sobrescribe un archivo existente. Revisar el ejemplo permite conocer los nombres y placeholders sin copiar credenciales administrativas. No ejecutar `supabase status` sin filtrar ni copiar su salida completa.

El reset de la secuencia anterior corresponde a la preparación inicial del clon/ensayo; no ejecutarlo en cada arranque ni mientras hay fixtures humanos. Solo opera sobre la base local desechable. No usar dos clones simultáneamente contra el mismo project_id ni los mismos puertos.

Abrir `http://127.0.0.1:5173`. **Comprobar conexión local** verifica Data API sin enumerar recursos protegidos antes del login. Las rutas H1 son `/login`, `/seguridad` y `/seguridad/usuarios`; no hay funciones de negocio. Vite y preview escuchan solo en loopback.

## Ensayo humano con identidades sintéticas

En una segunda terminal del mismo clon, con el runtime compatible y el stack activo:

```powershell
npm run fixtures:human
```

Elegir una contraseña exclusivamente de ensayo de al menos ocho caracteres mediante la entrada oculta. No aparece en pantalla, logs, VITE, archivos ni chat. El comando imprime los emails sintéticos e identificadores A/B (ADMIN), O (OPERADOR), M (ambos), N (sin rol), F (sin app_user), I (inactivo). La persona conoce la contraseña que suministró; no se imprime para recuperarla. Si se equivocó al escribirla, terminar el fixture con Enter y crearlo de nuevo.

Mantener esa terminal abierta durante el recorrido; al terminar, pulsar Enter para limpiar solo esas identidades. Ctrl+C intenta la misma limpieza; si el proceso se mata forzosamente, la guía de recuperación es reset local desechable, sin datos reales. No ejecutar test:security, test:expiry o reset mientras este ensayo humano esté activo. Los fixtures no son alta administrativa del producto y no se envía correo real.

Login A permite directorio de seguridad de solo lectura; O solo sus datos/asignaciones y catálogo activo. N/F/I se autentican pero quedan sin acceso de aplicación. No hay edición de usuarios/roles, signup, MFA ni recuperación. Auth local verifica credenciales; la habilitación real la deciden grants/RLS con el estado vigente en PostgreSQL. Cambiar React, metadata o almacenamiento no concede permisos de DB.

El SDK persiste la sesión y renueva tokens; tras recarga se confirma identidad contra Auth antes de mostrar datos. Logout limpia datos propios y solicita cierre de la sesión actual. Un JWT copiado puede seguir válido hasta expirar; no se promete revocación instantánea ni cierre de otros dispositivos. Tokens en almacenamiento del SDK son accesibles ante XSS: no renderizar HTML arbitrario ni copiar el almacenamiento a la evidencia. Esta es una prueba local, sin política institucional definitiva de sesiones/contraseñas.

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
npm run test:security
npm run test:expiry
npm run supabase:reset
npm run test:local
npm run test:security
```

El reset destruye únicamente la base local desechable y usa la misma red del arranque. Nunca usar con datos reales. Rechaza link remoto o flags adicionales. H2 conserva `20261022041000_h1_security.sql` y añade las migraciones 20261022150000/20261022160000, semillas de referencia e inventario exacto de 15 tablas públicas, 18 policies de lectura y 7 RPC; no se deshabilitó el control de inventario H0 para aceptar cualquier objeto. La CLI puede avisar que ignora `migrations/README.md`. [Disciplina de migraciones](supabase/migrations/README.md).

`test:security` crea siete actores en memoria, prueba login y Data API con clave pública/JWT ordinario por actor y limpia sus identidades al terminar. El privilegio administrativo se usa solo para preparación, cambios de estado del ensayo y observación separada. Los logs contienen IDs sintéticos, casos/resultados y cambios de estado; no contraseñas/tokens. No equivalen a auditoría productiva.

`test:expiry` requiere que no haya usuarios Auth previos: para el proyecto, cambia temporalmente solo jwt_expiry de 3600 a 60, vuelve a iniciar, usa un JWT real y espera exp + 35 segundos de tolerancia técnica. Después retira fixtures, restaura el archivo exacto y reinicia el perfil original. Puede tardar varios minutos; no ejecutar otras pruebas de plataforma en paralelo. Si se interrumpe forzosamente, comprobar que config.toml vuelva a jwt_expiry=3600 antes de reiniciar. No se fabrica una firma ni se cambia configuración global. El valor corto no es una política institucional.

Para parar: Ctrl+C en la terminal de Vite y `npm run supabase:stop`. Conserva volúmenes locales; no para otros proyectos ni Docker Desktop. Para comprobar recreación: parar, volver a iniciar y repetir `test:local`.

## Diagnóstico de problemas

- Docker no responde: comprobar manualmente Engine running y motor Linux; el proyecto no instala ni reconfigura Docker/WSL.
- Guard rechaza aislamiento: revisar regla exacta/política efectiva y perfiles habilitados, o bindings estrictos de loopback. El guard detiene el stack ante un fallo; no desactivarlo. Un cambio administrativo posterior no es monitorizado continuamente.
- `.env.local` ya existe: no se sobrescribe. Si se quiere regenerar, detener Vite y mover ese archivo a un respaldo local ignorado antes de ejecutar `supabase:env` de nuevo; no publicarlo.
- Configuración faltante o inválida: mensaje con el nombre del campo, sin su valor. Corregir solo configuración pública local y reiniciar Vite. Un build inválido debe fallar.
- Puerto ocupado: identificar el proceso; no detener servicios ajenos ni cambiar puertos o reglas silenciosamente.
- Reset falla: el script detiene el stack; revisar salud y red del proyecto antes de repetir. No ocultar el fallo ni usar un destino remoto.
- Login informa proveedor email deshabilitado: en esta CLI `auth.email.enable_signup=true` mantiene habilitado el proveedor; `auth.enable_signup=false` bloquea el registro público. No habilitar signup global para solucionar login. La suite prueba el rechazo directo.
- Auth válido sin fila/rol activo o usuario inactivo: acceso no habilitado es el resultado esperado; no autoasignar ADMIN. Para preparar usuarios usar exclusivamente fixtures locales.
- Fallo de cierre remoto: se retiran datos de UI y se muestra el fallo, sin afirmar revocación inmediata. Reintentar con el servicio local disponible.

## CI y revisión humana

Un workflow con permisos `contents: read` ejecuta instalación, lint, tipos, pruebas, Auth/RLS real, build seguro, expiración y reset con repetición; siempre intenta detener el stack. Acciones fijadas por SHA y sin deployment ni secretos remotos de Supabase. El ensayo negativo temporal introduce ADMIN indebidamente al fixture O y debe fallar en la matriz de filas, limpiar identidades y detener el stack. Se elimina su rama después de conservar runs/commits; no es un candidato alternativo. No hay rama negativa permanente. El mecanismo de fallo de build H0 se retiró del workflow actual; la evidencia histórica permanece en sus documentos/runs.

Los recorridos humanos TEST-H1-018 y TEST-H1-019 se conservan en [implementation-log.md](docs/specs/H1-security/implementation-log.md). El usuario confirmó ambos como PASSED y aprobó Gate 2 el 22/10/2026: [registro de aceptación](docs/specs/H1-security/acceptance.md). Codex registra esa decisión; no se atribuye la ejecución ni aprobación humana. H2 permanece NO INICIADO.

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

Los scripts operativos son exclusivamente locales. El guard acepta loopback estricto o la mitigación exacta aprobada y rechaza cualquier otra situación. La reconstrucción local no sustituye backups/restauración productivos de H9. Las limitaciones aceptadas de red no autorizan datos reales, alojamiento LAN/Internet ni funciones de H2 o posteriores.

## Revisión del candidato H2 (Gate 2 pendiente)

Para revisar H2, clonar explícitamente `feature/h2-academic` en otra carpeta y comprobar su SHA contra el candidato presentado. No ejecutar dos clones del mismo project_id a la vez. El clon normal desde main anterior no contiene H2. Seguir los mismos requisitos y guard locales de esta guía.

Orden técnico: `npm ci`, `npm run supabase:start`, `npm run supabase:reset`, `npm run supabase:env` (solo si .env.local no existe), `npm run test:local`, `npm run test:security`, `npm run test:academic`, `npm run build`, `npm run test:build-safety`. `test:expiry` cambia temporalmente solo jwt_expiry local, restaura archivo exacto y reinicia stack; no ejecutarlo con fixtures humanos abiertos. No ejecutar suites técnicas concurrentemente sobre la misma base.

`test:academic` usa peticiones ordinarias por actor para permisos/invariantes; SQL administrativo solo para inspección, preparación controlada de contador y fallo temporal de auditoría con restauración en finally. Fixtures de negocio se retiran reconstruyendo la base local con `supabase:reset` después de la suite, no mediante un DELETE de producto de Ciclos permanentes. Identidades efímeras se eliminan por UUID en finally; no cuentas reales.

Rutas: `/academico/materias`, `/academico/carreras`, `/academico/ciclos`, `/academico/auditoria`. Director mantiene Materias/Carreras y transiciona Ciclos; Coordinador tiene lectura referencial y opera PROGRAMADO/EN_CURSO; Admin Sistema solo auditoría y directorio de seguridad de lectura, sin CRUD académico. Los roles se asignan explícitamente: no equivalencias ADMIN/OPERADOR. No gestión HU17/HU18.

Ensayo humano: `npm run dev` en una terminal y `npm run fixtures:human` en otra; la persona introduce contraseña con entrada oculta. A/B Admin Sistema, O Coordinador, D Director, M Admin Sistema+Coordinador, N sin rol, F sin fila e I inactivo. Enter al terminar elimina identidades. Detener Vite y ejecutar reset, test:local y supabase:stop. No enviar contraseña, JWT ni claves al chat. Ver el [recorrido/evidencia H2](docs/specs/H2-academic/implementation-log.md).

Los cuatro modos visuales usan preferencia local del navegador, Sistema predeterminado y prioridad de forced-colors del SO; no se guardan en Auth/DB. Las medidas automáticas de contraste no constituyen conformidad WCAG completa ni prueba humana.

Fuentes de referencia y hashes: [sources.json](supabase/reference/sources.json). Snapshot oficial INEI 2022: 25 departamentos, 196 provincias y 1891 distritos (no se afirma vigencia exhaustiva a 2026); DICAPI snapshot 22/10/2026: 19 Capitanías. Atribución INEI/Plataforma Nacional de Datos Abiertos, licencia de datos ODbL indicada en el dataset. Referencias públicas transformadas, no datos de usuarios. Reset no requiere red para obtener catálogos; carga inicial versionada sin todo HU20.
