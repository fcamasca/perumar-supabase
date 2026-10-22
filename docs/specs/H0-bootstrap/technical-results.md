# H0 — Resultados técnicos y recorrido para revisión humana

**Cierre posterior a este informe:** el usuario aprobó H0 y Gate 2 sobre el candidato `9523e2e0e1b1889dd12ed3902fa3fe23f7c52141` el 21/10/2026. Ver [acceptance.md](acceptance.md). Los estados pendientes y el recorrido de este informe se conservan como evidencia de lo presentado antes de la decisión; no se atribuye su ejecución humana a Codex.

Fecha: 21/10/2026, America/Lima. Ejecutor técnico: Codex. Revisión humana de README/pantalla: **PENDIENTE**. Este archivo no es acceptance ni autoriza merge.

## Candidato y commits

Rama `feature/h0-bootstrap`. Código verificado: `94f5467f728c18d66de9a3f5e56d3031f1be4dc2`; la entrega añade solamente README y registros documentales sobre ese código. Identificar el commit documental candidato con `git log -1 --format=%H` y usar ese mismo commit en el recorrido humano. No revisar la rama deliberadamente negativa.

| Referencia | Commit |
|---|---|
| main documental, conservado local/remoto | `df3b9080228eebaeab11800fe11f684df829dae8` |
| Spec final aprobado, ancestro de implementación | `dff3c1c94683e5767c5837203d6910a6f25f43e3` |
| Registro de Gate 1 en rama Spec, antes de construcción | `d646262` |
| Registro documental incorporado a implementación | `ae8df50` |
| Frontend inicial / entorno local inicial | `f175185` / `1e1dd52` |
| Mitigación aprobada y guard | `28c7184` |
| Corrección de red durante reset | `64f623d` |
| Configuración pública, SDK y diagnóstico | `7b98f61` |
| Workflow CI / comprobación completa y ensayo negativo | `0bde518` / `94f5467` |

La rama se creó desde el Spec exacto, no desde main. Los cuatro documentos históricos aprobados se conservaron. La [enmienda autorizada](approved-isolation-amendment.md) registra la única revisión de diseño posterior: aislamiento efectivo con Windows Firewall. No hay acceptance ni merge.

## Tareas y archivos

| Tarea | Resultado |
|---|---|
| TASK-H0-001 | Completa: origen, Gate 1 y herramientas |
| TASK-H0-002 | Completa: frontend técnico mínimo |
| TASK-H0-003 | Completa: guard revisado, inicio/estado/parada/reset y ausencia de dominio |
| TASK-H0-004 | Completa: configuración validada, cliente único, diagnóstico y ejemplos seguros |
| TASK-H0-005 | Completa: owner autorizado, remoto existente privado, ramas publicadas y clon privado comprobado |
| TASK-H0-006 | Completa: CI positiva y fallo controlado comprobados |
| TASK-H0-007 | Guía operativa completada; reproducción técnica desde clon privado realizada; confirmación humana pendiente |
| TASK-H0-008 | Suite técnica y preparación de recorrido completas; TEST-H0-012/014 pendientes de persona |
| TASK-H0-009 | No ejecutada: Gate 2 bloqueado |

Archivos principales: configuraciones package/lockfile/Node/TS/Vite/ESLint, index y src; `src/lib/env.ts`, `src/lib/supabase.ts`; tres archivos de pruebas y setup; `.env.example` y `.gitignore`; `scripts/local-supabase.mjs`, `check-local.mjs`, `check-build-safety.mjs`, `ci-build.mjs`; configuración Supabase y guía de migraciones sin SQL; `.github/workflows/ci.yml`; README, PLAN y registros H0. Inventario exacto mediante `git diff --stat dff3c1c HEAD`. `.env.local`, dist, cachés y dependencias no se publican.

## Entorno y comandos

Windows: Node 24.19.0 existente en el runtime local documentado, npm 10.9.0, CLI Supabase 2.121.0, SDK 2.118.0, Docker Engine 29.7.2. CI: Ubuntu 24.04, Node/npm iguales y Docker del runner; loopback estricto comprobado allí, sin excepción Windows. Versiones exactas en package.json/lockfile; no se cambiaron herramientas globales del equipo del usuario.

SHA256 de package-lock.json: `5A7F0D631FCC1C250853F1A18B2BBB8A043CDD2EDF32B304626F057B60A92E34`.

Los comandos npm siguientes se ejecutaron con el Node compatible. En este equipo se utilizó `node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' <argumentos>` con el PATH de Node 24.19.0 limitado a la sesión, como explica README.

| Test | Comando / evidencia y resultado |
|---|---|
| TEST-H0-001 | `git merge-base --is-ancestor dff3c1c HEAD`, grafo y refs: PASÓ; main sin merge y aprobación trazable |
| TEST-H0-002 | Versiones Node/npm, manifiesto/lockfile y CI: PASÓ |
| TEST-H0-003 | Clon HTTPS privado limpio en `.cache/h0-private-clone-20261021`; `npm ci`: 211 paquetes, auditados 212, cero vulnerabilidades informadas; lockfile sin cambios: PASÓ |
| TEST-H0-004 | `npm run lint`, `npm run typecheck`, `npm run build`: salida 0 local/clon/CI; `npm test`: 62 pruebas PASARON en clon y CI |
| TEST-H0-005 | Pruebas React: pantalla neutra, error de configuración y diagnóstico solo al pulsar; cliente base único con persistencia/refresh/detección de sesión desactivados: PASÓ |
| TEST-H0-006 | `npm run supabase:start`, `supabase:status`, `supabase:env`, `test:local`: salida 0, SDK/OpenAPI local válido sin datos ni login: PASÓ |
| TEST-H0-007 | `npm run supabase:reset` seguido de `test:local`: salida 0; inventario SQL sin tablas, funciones, políticas públicas, usuarios ni buckets de aplicación; historial propio ausente; rechazo de flags/destinos remotos probado: PASÓ |
| TEST-H0-008 | Variables ausentes, URL inválida/remota/con credenciales/ruta, clave secret, JWT service_role y otros roles, positivos publicable/anon/loopback: PASÓ |
| TEST-H0-009 | Ignore, revisión de archivos/diffs y patrones sin hallazgos; `test:build-safety` rechaza canario antes de generar artefactos y comprueba que no esté en logs capturados/bundle; política CI de lectura y logs revisados: PASÓ, con límites habituales de detección por patrones |
| TEST-H0-010 | Metadata GitHub `private:true`, owner/nombre exactos, origin sin token, push no forzado y clon privado HTTPS con identidad autorizada: PASÓ |
| TEST-H0-011 | CI positiva y CI negativa del mismo commit; fallo real de build seguro, cleanup ejecutado y sin deployment: PASÓ |
| TEST-H0-012 | Prueba HUMANA de reproducción integral desde README: PENDIENTE |
| TEST-H0-013 | Inventario de archivos/contenido y DB; solo bootstrap y plataforma local, sin SQL propio, objetos de dominio, proyecto alojado, hosting ni deployment: PASÓ |
| TEST-H0-014 | Prueba HUMANA de pantalla, conexión y error: PENDIENTE |
| TEST-H0-015 | Gate 2: BLOQUEADO |

CI verificable, sin depender de capturas de Codex:

- [Primera CI completa: success, 0bde518](https://github.com/fcamasca/perumar-supabase/actions/runs/39707828832).
- [CI del código candidato: success, 94f5467](https://github.com/fcamasca/perumar-supabase/actions/runs/39708077705).
- [Ensayo negativo: failure esperado, 94f5467](https://github.com/fcamasca/perumar-supabase/actions/runs/39708077807). Falló exactamente el build por VITE_SUPABASE_PUBLISHABLE_KEY inválida; sin valor del canario en el error. Se detuvo el stack en cleanup. Rama dedicada de prueba, sin cambiar el candidato normal ni main.

El clon se actualizó de 0bde518 a 94f5467 y repitió las comprobaciones afectadas: 62 pruebas, lint e integración; Git limpio. La instalación limpia, tipos, build y canario ya habían pasado sobre el mismo manifiesto/lockfile y código de frontend; 94f5467 solo amplía filtros del guard, sus pruebas y selección del ensayo CI.

## Defectos y correcciones

- DEF-H0-001: **RESOLVED BY APPROVED MITIGATION**, por decisión humana final sobre CHG-H0-001. Guard admite loopback estricto o regla efectiva exacta y todos los perfiles habilitados; rechaza alteraciones de estado, rango, protocolo, direcciones, programa/servicio/interfaces y filtros de seguridad. Nunca crea ni modifica reglas. Error de aislamiento o de operación protegida intenta detener el stack y devuelve fallo; si no puede confirmar parada lo informa explícitamente.
- **54322/TCP: NO VERIFICADO DE FORMA INDEPENDIENTE.** Riesgo residual aceptado para H0 local sin datos reales; no se presenta como prueba pasada. IPv6 externo tampoco fue ensayado. No se afirma binding exclusivo a loopback en Windows ni aislamiento universal. No se mantiene H0 bloqueado exclusivamente por esa prueba omitida.
- Reset inicial: se omitió `--network-id` y la base recreada quedó fuera de la red que esperaban los servicios; Storage informó ENOTFOUND y la CLI falló. El guard detuvo el stack. Se corrigió el argumento; reset e inventario/integración posteriores PASARON en Windows y CI. No se cambiaron Docker, WSL, daemon ni firewall para corregirlo.
- Se corrigió un uso inicial de `.abortSignal()` no disponible en el retorno de getOpenApiSpec; timeout colocado en fetch del cliente. TypeScript/build e integración posteriores PASARON. El diagnóstico usa [getOpenApiSpec del SDK](https://supabase.com/docs/reference/javascript/getopenapispec), sin tabla artificial.
- Una ejecución concurrente de CI informó contención al guardar caché npm. Verificaciones y job pasaron; no es fallo funcional ni motivo para ocultar errores de pruebas.

OQ-H0-001 y OQ-H0-002 resueltas mediante decisiones humanas ya registradas. No hay open question de alcance/tecnología pendiente. Restan pruebas humanas y decisión Gate 2. La verificación del firewall es puntual al operar el script; cambios administrativos posteriores requieren volver a comprobar el entorno. La guía no convierte H0 en alojamiento ni control de producción.

## TEST-H0-012 — Recorrido humano exacto

Persona revisora: realizar y confirmar; no basta con los logs técnicos anteriores.

1. Anotar nombre/identificador del revisor, fecha y equipo. Clonar el remoto privado en un directorio nuevo usando README; seleccionar `feature/h0-bootstrap`, ejecutar `git log -1 --format=%H` y comprobar que coincide con el candidato presentado. No usar la rama ci-negative. Tener el motor Linux de Docker activo y runtime Node/npm compatible.
2. Seguir README, sin instrucciones privadas: `npm ci`; `npm run supabase:start`; `npm run supabase:status`. El guard debe reconocer loopback estricto o la mitigación aprobada. En el mismo host, parar antes cualquier instancia del mismo proyecto: no operar dos clones concurrentemente contra los mismos contenedores.
3. Revisar nombres/placeholders de `.env.example`; `npm run supabase:env` genera `.env.local` con solo esos dos campos públicos y sin imprimirlos. Confirmar que `git status --short` no muestra ese archivo. No pegar su contenido ni salida CLI completa en evidencia.
4. `npm run test:local`; ejecutar lint, tipos, test, build y test:build-safety según README. Registrar códigos y cualquier paso no documentado que haya sido necesario.
5. `npm run dev`; abrir `http://127.0.0.1:5173`; completar TEST-H0-014 más abajo. Detener Vite con Ctrl+C.
6. `npm run supabase:reset`; `npm run test:local`; `npm run supabase:stop`; `npm run supabase:start`; `npm run test:local`; `npm run supabase:stop`. Confirmar reconstrucción local, parada y claridad de los límites, sin datos reales ni link remoto.
7. Registrar resultado PASÓ/FALLÓ, observaciones, defectos y confirmación explícita. Si hubo intervención ajena al README, registrar defecto antes de aceptar. No ejecutar cambios de firewall implícitos ni tratar la guía como aprobación administrativa para otro equipo.

## TEST-H0-014 — Recorrido humano exacto

1. Con stack y Vite activos del paso 5, comprobar PERÚ MAR, H0/Bootstrap, entorno local y ausencia de login, menú funcional o datos del negocio.
2. Antes de pulsar debe indicar conexión pendiente. Pulsar **Comprobar conexión local**; esperar mensaje de conexión local verificada/Data API disponible. Confirmar que el diagnóstico es explícito, sin sondeo automático ni valores de claves en pantalla.
3. Detener Vite. Mover temporalmente `.env.local` a `.env.local.backup` (ignorado por Git), sin abrir ni compartir claves. Reiniciar Vite y abrir de nuevo: debe aparecer **Falta VITE_SUPABASE_URL**, sin botón de conexión ni valores sensibles. Con ese archivo ausente, `npm run build` debe fallar con error seguro.
4. Detener Vite, restaurar el respaldo a `.env.local`, reiniciar y volver a comprobar conexión. No dejar el candidato configurado negativamente.
5. Confirmar comprensión de entorno local frente a remoto y exclusiones H1. Registrar commit, fecha, pasos, resultado y observaciones. Capturas opcionales sin credenciales. Ni las pruebas React ni el ensayo humano del firewall sustituyen esta confirmación.

## Formato de respuesta humana

```text
Revisor:
Fecha / entorno:
Commit candidato:
TEST-H0-012: PASÓ / FALLÓ
TEST-H0-014: PASÓ / FALLÓ
Pasos efectivamente realizados:
Defectos / observaciones:
Confirmación humana explícita:
```

La decisión de Gate 2 y autorización de merge son posteriores y explícitas. Este archivo no declara las pruebas humanas realizadas ni solicita aceptarlas por adelantado. Hasta esa decisión: no acceptance.md, no merge y no H1.
