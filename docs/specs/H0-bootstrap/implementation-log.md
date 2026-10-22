# H0 — Registro de implementación y evidencia parcial

**Registro histórico de la fase bloqueada.** Estado vigente, tareas completadas y recorrido humano: [technical-results.md](technical-results.md). La aprobación final de CHG-H0-001 está en [approved-isolation-amendment.md](approved-isolation-amendment.md); los estados parciales siguientes se conservan como historia, no como estado actual.

Fecha: 21/10/2026. Ejecutor técnico: Codex. No contiene aprobación de pruebas humanas.

```text
H0 IMPLEMENTATION: BLOCKED (PARTIAL)
TECHNICAL TESTS: PARTIAL — FRONTEND PASSED; LOCAL ISOLATION FAILED
HUMAN TESTS: PENDING
ACCEPTANCE: BLOCKED
MERGE TO MAIN: BLOCKED
```

## Historia y autorización

PLAN y Spec H0 aprobados humanamente el 21/10/2026. El texto histórico de los cuatro archivos del Spec se conserva: sus estados previos no sustituyen la aprobación posterior registrada en PLAN.

| Referencia | Commit / resultado |
|---|---|
| main documental, sin merge de implementación | `df3b908` |
| Spec final aprobado | `dff3c1c94683e5767c5837203d6910a6f25f43e3` |
| Aprobación documental en feature/h0-bootstrap-spec, antes de construcción | `d646262` |
| Rama de implementación | `feature/h0-bootstrap`, creada desde `dff3c1c` |
| Registro de aprobación aplicado a implementación | `ae8df50` (cherry-pick del registro documental) |
| Frontend técnico | `f175185` |
| Configuración local y protección de publicaciones | `1e1dd52b885b3b9b0cbde77201ff61432aa19b80` |

`git merge-base --is-ancestor dff3c1c HEAD` pasó. La comparación de requirements.md, design.md, tasks.md y test-plan.md contra ese commit no presenta cambios. El commit de documentación de este registro es posterior al código probado; se identifica con `git log -1` y no constituye un candidato completo a aceptación H0.

## Tareas

| Tarea | Estado y límite |
|---|---|
| TASK-H0-001 | Completada: rama, descendencia y herramientas verificadas |
| TASK-H0-002 | Completada: pantalla técnica React/TypeScript/Vite, sin negocio |
| TASK-H0-003 | Parcial, bloqueada: configuración y scripts; aislamiento fallido, reset pendiente |
| TASK-H0-004 | No iniciada, depende de 003: variables, cliente y diagnóstico |
| TASK-H0-005 | No iniciada, depende de 004: origin/push pendientes |
| TASK-H0-006 | No iniciada: CI pendiente |
| TASK-H0-007 | Pendiente: README integral; el actual informa solo el estado parcial |
| TASK-H0-008 | Parcial: evidencia técnica disponible, suite integral y recorrido humano no habilitados |
| TASK-H0-009 | Bloqueada por Gate 2; no acceptance ni merge |

Archivos de construcción: `.gitignore`, `.nvmrc`, `package.json`, `package-lock.json`, `index.html`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`, pruebas en `tests/`, `scripts/local-supabase.mjs`, `supabase/.gitignore`, `supabase/config.toml`, `supabase/migrations/README.md`. Consultar `git show --stat f175185` y `git show --stat 1e1dd52` para el inventario exacto. Documentación posterior: README, PLAN, este registro y la propuesta de entorno.

## Entorno y comandos técnicos

Código probado: `1e1dd52`. Windows, Node 24.19.0, npm 10.9.0, Supabase CLI local 2.121.0, Docker Engine 29.7.2. No se cambió Node global 22.12.0. Se usó el runtime ya disponible con PATH limitado a la sesión:

```powershell
Set-Location 'D:\FRANKZ\aplicaciones\PERUMAR\perumar-supabase'
$env:Path = 'C:/Users/Rodrigo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin;' + $env:Path
node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' ci
node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' run lint
node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' run typecheck
node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' test
node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' run build
```

También se verificó un clon local limpio en `.cache/h0-clean-20261021-verified`, creado con `git clone --no-hardlinks`. Allí `npm ci --offline --cache D:/FRANKZ/aplicaciones/PERUMAR/perumar-supabase/.cache/npm` instaló 202 paquetes, auditó 203, informó cero vulnerabilidades y mantuvo limpio Git después de lint, tipos, nueve pruebas y build. Este clon LOCAL no demuestra TEST-H0-010 de GitHub.

| Test | Resultado registrado el 21/10/2026 |
|---|---|
| 001 | Descendencia y Gate 1 comprobados; Gate 2 pendiente |
| 002 | Runtime y lockfile locales coherentes, versiones exactas; comparación CI pendiente |
| 003 | PASÓ instalación en clon local limpio, sin modificación del lockfile |
| 004 | Lint, TypeScript y build: salida 0 en trabajo y clon; CI pendiente |
| 005 | PARCIAL: dos pruebas de pantalla pasan; módulo de configuración pendiente |
| 006 | PARCIAL/FALLO: servicios arrancaron y respondieron, pero publicación no-loopback; cliente pendiente |
| 007 | PENDIENTE: no se ejecutó reset tras el hallazgo de aislamiento |
| 008 | PENDIENTE: configuración de aplicación no implementada |
| 009 | PARCIAL: revisión de patrones y reglas ignore sin hallazgos; faltan canarios/configuración y permisos CI |
| 010 | PARCIAL: metadata del remoto privado comprobada; sin origin, push ni clon remoto |
| 011 | PENDIENTE: no existe workflow ni runs |
| 012 | HUMANA PENDIENTE, recorrido integral no habilitado |
| 013 | PARCIAL: inventario sin SQL/negocio/hosting/acceptance; falta reconstrucción e inventario completo DB |
| 014 | HUMANA PENDIENTE, conexión y errores de configuración aún no implementados |
| 015 | BLOQUEADA: no hay candidato completo ni aceptación |

Las nueve pruebas automatizadas pasan: dos de pantalla y siete de protecciones del script local. Se comprobó además HTTP 200 y título de la pantalla mediante Vite en `127.0.0.1:5173`; se detuvo el proceso después. Esa comprobación técnica no es TEST-H0-014 humano. Revisión de ignore para `.env`, `.env.local`, claves, tokens y caché correcta; `.env.example` permitido por regla, todavía no creado.

## Defectos, correcciones y bloqueo

- Se corrigieron incompatibilidades de runtime/dependencias usando el Node ya disponible y versiones fijadas compatibles. No se instaló ni reemplazó un runtime global.
- Se corrigió la ruta de entrada de Supabase CLI para la versión fijada y el entorno Node de las pruebas del script. Lint, tipos, nueve pruebas y build pasaron después de esas correcciones.
- Algunas ejecuciones iniciales no pudieron acceder a red, Docker o sockets por restricciones del entorno de ejecución. Se repitieron con permisos para la comprobación concreta; no se interpretan como defectos funcionales resueltos por cambiar el producto.
- **DEF-H0-001 abierto:** Docker publicó 54321–54324 en `0.0.0.0` y `::` pese a la opción de red loopback. Petición a una dirección propia no-loopback obtuvo respuesta HTTP. No se probó desde otro equipo ni se acredita exposición a Internet. No había datos de negocio.
- Se detuvo exclusivamente el stack del proyecto. Se incorporó protección que rechaza publicaciones globales y detiene el stack; las pruebas incluyen el estado observado. No se reinició el stack para repetir una exposición conocida. No se modificaron firewall, WSL ni configuración global de Docker.

El usuario eligió preparar un cambio concreto sin aplicarlo. [CHG-H0-001](environment-change-proposal.md) propone una regla acotada de firewall para ensayo, documenta reversión, límites y revisión del criterio de aislamiento. No demuestra aún una solución ni autoriza cambiar el guard. Cualquier ajuste del diseño requiere decisión humana.

## Open questions y recursos

- **OQ-H0-002 resuelta:** owner autorizado explícitamente `fcamasca`; URL `https://github.com/fcamasca/perumar-supabase.git`. Metadata comprobada mediante identidad local autorizada: repositorio existente, privado y sin refs. No se creó, vinculó ni publicó nada. El conector no tenía acceso a ese repositorio; la comprobación se realizó con la credencial local sin imprimirla.
- **CHG-H0-001 pendiente:** revisión humana del cambio de entorno y del criterio de aislamiento. Es la dependencia que impide continuar TASK-H0-003 y las siguientes.
- Sin proyecto Supabase alojado, despliegue, esquema propio de negocio ni autenticación funcional. Los volúmenes/imágenes locales se conservaron; no equivalen a un entorno validado.

## Recorrido humano pendiente

**No ejecutar todavía TEST-H0-012/014 como aceptación completa:** faltan tareas 003–007 y evidencia técnica integral. Esta secuencia identifica lo que deberá realizar una persona cuando exista candidato completo; no atribuye ejecución ni aprobación.

1. Registrar identidad del revisor, fecha, commit candidato y versiones. Confirmar cierre de DEF-H0-001 y evidencia técnica integral antes de comenzar.
2. TEST-H0-012: clonar el remoto privado en un directorio limpio y seguir exclusivamente el README completo del candidato; instalar desde lockfile, preparar variables desde el ejemplo, iniciar plataforma y frontend, ejecutar verificaciones, parar y reconstruir solo el entorno local. Registrar cada intervención no documentada como defecto. Las instrucciones de variables y reset aún no están habilitadas en este estado parcial.
3. TEST-H0-014: abrir la URL local del candidato; verificar pantalla neutra y diagnóstico de conexión local. Provocar configuración faltante según la guía del candidato, comprobar error comprensible sin valores sensibles y restaurarla. Confirmar ausencia de login y negocio y que se entiende local frente a remoto. La conexión y este caso negativo están pendientes de implementación.
4. Registrar pasos efectivamente realizados, resultados, defectos y confirmación explícita de la persona; capturas solo sin credenciales. Codex puede preparar evidencia, pero no firmar esa confirmación.
5. Presentar resultados para Gate 2. Hasta decisión humana posterior: sin `acceptance.md`, sin merge y sin H1.

Para una inspección opcional y **parcial** de la pantalla existente, después de activar el runtime anterior ejecutar `node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' run dev`, abrir `http://127.0.0.1:5173` y detener con Ctrl+C. Debe mostrar PERÚ MAR / Bootstrap y conexión Supabase pendiente. No iniciar Supabase ni confundir esta inspección con los dos tests humanos integrales.
