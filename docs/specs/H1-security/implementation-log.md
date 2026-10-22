# H1 — Evidencia técnica y preparación de revisión humana

> **Cierre posterior — 22/10/2026:** el usuario confirmó TEST-H1-018 y TEST-H1-019 PASSED y aprobó Gate 2 sobre `7c15f6c382c43b08b900f00a793fd590205ab618`. Véase [acceptance.md](acceptance.md). TASK-H1-008 queda completada con esa confirmación y TASK-H1-009 se ejecuta como cierre documental e integración autorizada. Todos los estados pendientes, bloqueos, referencias a main previo y prohibiciones de cierre que aparecen debajo describen la entrega anterior a Gate 2; no son el estado vigente. Los recorridos se conservan como evidencia histórica. H2 no se inicia.

Fecha de construcción: 21/10/2026 (America/Lima). Ejecutor técnico: Codex. **Pruebas humanas TEST-H1-018/019: PENDIENTES.** No es acceptance, no aprueba H1 ni autoriza merge.

## 1. Origen y commits

Rama: `feature/h1-security`. Spec aprobado: `3cf847451690d320f1fce39b2992f8a2e53be925`. La implementación se creó desde ese commit exacto y recibió el registro documental de Gate 1 por cherry-pick; no nació de un main posterior. Main local/remoto permanece en `93399eefe118488d0e2f497ba29a3075098a32bd`. Los cuatro archivos aprobados no fueron modificados; la aceptación histórica H0 y el guard/firewall aprobado se conservan.

| Commit | Contenido |
|---|---|
| 3283305 (Spec) / 902704b (implementación) | Registro humano Gate 1 y PLAN en construcción |
| f628880 | Migración, grants, RLS, helper e inventario H1 |
| d00744f | Auth local, fixtures y protección de destino |
| 5092615 | Sesión verificada, renovación/logout y pruebas de carreras |
| c18f987 | Rutas mínimas y directorio de solo lectura; React Router 7.18.4 fijado |
| ca4ebdb | Matriz real de ataques/roles/estados, expiración y restauración |
| 4757221 | CI H1, limpieza y ensayo temporal de privilegios |
| 49312c475b6f4781583abc2c6d5bc71dc703b338 | Ensayo negativo comprueba primero filas obtenidas por OPERADOR |

La entrega posterior completa README/PLAN y este registro, sin alterar el código probado. El commit documental candidato se presenta en la respuesta final y se obtiene con `git log -1 --format=%H`; debe coincidir con el revisado por la persona.

## 2. Tareas y límites

| Tarea | Estado técnico |
|---|---|
| TASK-H1-001 | Completa: Gate 1, commit/ramas y descendencia comprobados |
| TASK-H1-002 | Completa: migración local real e inventario exacto |
| TASK-H1-003 | Completa: Auth local, fixtures sintéticos y cleanup |
| TASK-H1-004 | Completa: identidad confirmada, restauración, renovación y logout |
| TASK-H1-005 | Completa: login, recurso propio y directorio ADMIN de solo lectura |
| TASK-H1-006 | Completa: positivos/negativos sobre Auth/Data API/PostgreSQL reales |
| TASK-H1-007 | CI y guía preparadas, con reproducción técnica desde clon privado |
| TASK-H1-008 | Evidencia/recorridos preparados; confirmación humana pendiente |
| TASK-H1-009 | BLOQUEADA por Gate 2; no ejecutada |

No hay entidades H2+, backend propio, Edge Functions, Redux, MFA, recuperación por email, administración completa de usuarios ni infraestructura productiva. Los scripts administrativos son únicamente fixtures locales, no endpoints de producto.

Archivos: [migración SQL](../../../supabase/migrations/20261022041000_h1_security.sql), configuración Auth local y guía de migraciones; [SessionProvider](../../../src/security/SessionProvider.tsx), [SecurityRoutes](../../../src/security/SecurityRoutes.tsx), cliente único, App/estilos y pruebas; scripts local-platform, h1-fixtures, test-security y test-expiry; adaptación de check-local e inventario; workflow CI, package/lockfile, README y PLAN. El antiguo script ci-build exclusivo del ensayo H0 fue retirado; sus documentos/runs históricos no se reescribieron. Inventario exacto: `git diff --stat 3cf8474 HEAD`.

## 3. Inventario de DB, grants, policies y helper

| Objeto propio | Propósito |
|---|---|
| public.app_users | UUID PK/FK auth.users, active y created_at; sin contraseña/email duplicado |
| public.app_roles | code PK/constraint ADMIN u OPERADOR, active |
| public.app_user_roles | PK compuesta user_id/role_code, dos FK, created_at; varios roles |
| private.has_active_role(role_code text) | Único helper booleano para auth.uid() con usuario y rol activos |

RLS habilitado, sin FORCE RLS que reintroduzca recursión. Claves/relaciones rechazan duplicados, huérfanos y roles no previstos. Migración propia única: `20261022041000`. Dos roles semilla activos; ninguna cuenta Auth en SQL ni contraseña versionada. Al finalizar pruebas se eliminan todas las cuentas del ensayo; buckets y entidades de negocio: cero.

Grants efectivos inspeccionados: PUBLIC/anon sin acceso a las tres tablas; authenticated SELECT, sin INSERT/UPDATE/DELETE/TRUNCATE ni CREATE en public/private. service_role conserva las operaciones necesarias solo para fixtures/observación; nunca demuestra acceso ordinario. authenticated no tiene BYPASSRLS. Ninguna función propia pública o vista alternativa.

| Policy SELECT (todas TO authenticated) | Propósito |
|---|---|
| app_users_self_read | Fila propia y algún rol activo |
| app_users_admin_read | Directorio completo para ADMIN activo |
| app_user_roles_self_read | Asignaciones propias y algún rol activo |
| app_user_roles_admin_read | Asignaciones completas para ADMIN activo |
| app_roles_active_read | Catálogo activo para actor habilitado |
| app_roles_admin_read | Catálogo completo para ADMIN activo |

No policies FOR ALL ni de escritura. La unión OR entre policies se ensayó por tabla; acceso al catálogo no habilita directorio o escrituras. Las denegaciones de lectura pueden ser 200 con []; los grants denegados producen error de permisos, no se evalúa solo status HTTP.

Helper: owner postgres, SECURITY DEFINER, STABLE, search_path vacío, nombres calificados, una sola entrada de código de rol y booleano de salida. Sin subject arbitrario, SQL dinámico, escrituras o helpers encadenados. PUBLIC/anon sin EXECUTE; authenticated solo USAGE privado y EXECUTE del helper. private fuera de schemas expuestos; llamadas RPC públicas/esquema privado denegadas. Verificación real de no recursión y sujeto actual; inspección SQL complementaria parametrizada nunca sustituyó peticiones API con JWT real.

## 4. Matriz de actores y resultados observados

| Actor sintético | Habilitación | Filas app_users / asignaciones / roles esperadas y verificadas |
|---|---|---|
| A, B | ADMIN activo | Directorio de seis app_users, seis asignaciones y dos roles |
| O | OPERADOR activo | Una fila propia, su asignación y dos roles activos; cero filas de otro ID |
| M | Ambos roles | Unión equivalente a ADMIN; si ADMIN inactivo conserva solo lectura propia por OPERADOR |
| N | Auth + app_user sin rol | Cero filas en las tres tablas |
| F | Auth sin app_user | Cero filas en las tres tablas |
| I | app_user inactivo con asignación | Cero filas en las tres tablas |
| Anónimo/token inválido/firma alterada | Sin identidad habilitada | Sin datos ni escrituras |

Ninguno, incluido A/B/M, puede escribir tablas de seguridad desde cliente ordinario ni usar Auth Admin API. Usuarios, roles y membresías son información del ensayo; no representan matriz funcional definitiva. Las identidades usan .invalid y contraseñas efímeras solo en memoria. La revisión humana proporciona su contraseña por entrada oculta, sin enviarla al chat.

Revocación: inactivar usuario/rol o retirar asignación cambió las nuevas respuestas con el mismo JWT; después se restauró el estado y reapareció el acceso esperado. user_metadata con ADMIN, incorporada a un JWT renovado real, no elevó a O. Firma/sub/role JWT alterados fueron rechazados. POST/PATCH/DELETE de cada tabla para ADMIN/OPERADOR denegados con 42501 y snapshot sin cambios. RPC/helper y perfil private no dieron acceso alternativo.

## 5. Entorno, comandos y evidencia

Node 24.19.0, npm 10.9.0, CLI Supabase 2.121.0 y SDK 2.118.0 conservados de H0; React Router 7.18.4 (Node >=20) fijado en lockfile. Docker Engine Windows 29.7.2 del entorno existente; CI Ubuntu 24.04 y Docker del runner. No cambios globales del host. SHA256 lockfile: `CDE7211155AE05527860D19A4A4F71640352D371FAC997A3A0817533F0AECD66`.

En Windows se usó el Node compatible existente anteponiendo su carpeta al PATH de la sesión y `node 'C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js' <argumentos>`, según README; no se cambió Node global.

| TEST | Evidencia técnica / resultado |
|---|---|
| TEST-H1-001 | Git, base main, Spec aprobado/descendencia y diff de alcance: comprobados; Gate 2 bloqueado |
| TEST-H1-002 | supabase:start/reset, test:local e inventario; constraints, destinos no reconocidos/link rechazados y clon limpio: PASARON |
| TEST-H1-003 | Clave pública sola, sin sesión, bearer inválido y JWT manipulado contra tablas/operaciones: PASARON |
| TEST-H1-004 | Logins reales por actor, contraseña errónea/email inexistente, signup y identidad anónima bloqueados: PASARON |
| TEST-H1-005 | React/SDK: restauración confirmada, metadata/almacenamiento no confiable, renovación/fallo, cambio de identidad y respuesta tardía; SDK real persistencia en memoria de prueba, refresh y expiración real: PASARON |
| TEST-H1-006 | Logout local/limpieza, fallo remoto seguro y JWT copiado todavía válido antes de exp, rechazado después: PASARON con límite documentado |
| TEST-H1-007 | IDs exactos y joins/filtros directos ADMIN/OPERADOR, sin filtrar desde UI: PASARON |
| TEST-H1-008 | Unión multirol e inactivación de uno u otro: PASARON |
| TEST-H1-009 | Metadata editable con JWT renovado, ID/rol/cuerpo y almacenamiento UI manipulados: PASARON; sin elevación |
| TEST-H1-010 | Escrituras Data API, Auth Admin API, RPC y esquemas alternativos denegados; snapshot inalterado: PASARON |
| TEST-H1-011 | Sin app_user, sin rol y sin provisión automática: PASARON |
| TEST-H1-012 | Inactivo/revocación con mismo JWT y restauración del acceso: PASARON |
| TEST-H1-013 | Catálogo SQL, helper/grants/policies y aislamiento por actor: PASARON; sin 42P17 |
| TEST-H1-014 | Rutas sin sesión, carga, ADMIN, OPERADOR, sin habilitación y error login: pruebas React PASARON |
| TEST-H1-015 | Validación, canarios, error seguro, consultas sin SQL dinámico y build: PASARON; revisión de diffs/logs complementaria |
| TEST-H1-016 | Eventos por actor/operación/estado, observación separada, restauración y limpieza de siete identidades: PASARON |
| TEST-H1-017 | CI positiva completa y ensayo negativo relevante: ver runs debajo; sin deploy/merge/acceptance automático |
| TEST-H1-018 | HUMANA PENDIENTE; no ejecutada por Codex |
| TEST-H1-019 | HUMANA PENDIENTE; no se declara arquitectura aceptada |
| TEST-H1-020 | Gate 2 BLOQUEADO |

Comandos: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` (**77 pruebas, seis archivos**), `npm run build`, `npm run test:build-safety`, `npm run test:local`, `npm run test:security` (**14 escenarios/grupos reales**), `npm run test:expiry`, reset y repetición. Salida 0 para comprobaciones positivas ejecutadas. Clon HTTPS privado limpio `.cache/h1-private-clone-20261021`: 215 paquetes instalados, 216 auditados y cero vulnerabilidades informadas; tipos/build/77 pruebas/integración/seguridad pasaron sin modificar lockfile ni archivos versionados. Esto es reproducción técnica, no TEST-H1-018 humano.

- [CI completa exitosa, 4757221](https://github.com/fcamasca/perumar-supabase/actions/runs/39723110540).
- [CI positiva del código actualizado, 49312c4](https://github.com/fcamasca/perumar-supabase/actions/runs/39723487530): SUCCESS, incluidas expiración/restauración, reset y repetición de matriz.
- [CI negativa esperada, 49312c4](https://github.com/fcamasca/perumar-supabase/actions/runs/39723487260): inyección temporal de ADMIN a O; falló TEST-H1-007 porque la petición ordinaria recibió directorio ampliado. Cleanup de fixtures y parada ejecutados. Rama temporal eliminada tras conservar run/commit; sin rama negativa permanente ni cambio de main.

Expiración real: se cambió temporalmente solo jwt_expiry local de 3600 a 60, se emitió/renovó token por Auth y se observó acceso residual tras logout. Después de exp + 35 segundos de tolerancia técnica, API rechazó el token emitido originalmente. No se modificó su firma para simular expiración. Finalmente se limpiaron fixtures y se restauró el archivo/configuración original exacta; CI comprueba diff vacío del config. Es una duración de ensayo, no una política institucional de sesiones.

## 6. Correcciones, riesgos y preguntas pendientes

- CLI fijada: auth.email.enable_signup=false deshabilitó proveedor email (email_provider_disabled). Se corrigió a true para habilitar login, conservando auth.enable_signup=false. Pruebas directas de signup y signInAnonymously rechazadas. Corrección de configuración dentro del Spec, sin proveedor/infraestructura nueva.
- La primera CI negativa detectó la asignación adicional por conteo de relaciones. Se fortaleció el orden del oráculo para fallar primero por las filas reales indebidas de O; el run actualizado lo confirmó explícitamente.
- Controles H0 de esquema vacío se sustituyeron por inventario H1 exacto; no se eliminaron seguridad/build/guard ni se reescribió H0 aceptado. El guard no se modificó y el firewall no se administra desde scripts.
- Riesgos conocidos del diseño aprobado: helper con owner privilegiado requiere revisión humana; unión OR de policies; tokens del SDK accesibles ante XSS; JWT residual tras logout; lectura de datos ya vistos no se revoca retroactivamente; los logs de fixture no son auditoría productiva. No hay API administrativa de producto en H1.
- CHG-H0-001 sigue aceptado; **54322/TCP: NO VERIFICADO DE FORMA INDEPENDIENTE**, riesgo residual previo conservado. H1 no declara nueva prueba externa ni cambia la mitigación.
- No hay preguntas abiertas bloqueantes de tecnología/alcance. Quedan TEST-H1-018/019 y la decisión humana de Gate 2. Si esa revisión exige cambio de diseño, se detiene el trabajo afectado antes de implementarlo.

## 7. TEST-H1-018 — Pasos humanos exactos

**No realizados por Codex.** Persona revisora: registrar nombre/identificador, fecha, entorno y commit candidato presentado. No aceptar automáticamente la rama por estar verde.

1. Clonar rama feature/h1-security en directorio nuevo según README y verificar `git log -1 --format=%H` contra candidato. Preparar Node/npm compatibles, Docker Linux activo y guard/mitigación H0. Detener otras instancias/clones del mismo project_id antes de empezar.
2. Seguir README: `npm ci`; `npm run supabase:start`; `npm run supabase:status`; reset local inicial; `npm run supabase:env`; `npm run test:local`. Confirmar que .env.local no aparece en Git. Ejecutar verificaciones técnicas documentadas antes de crear fixtures humanos; no correrlas concurrentemente con esos fixtures.
3. Terminal A: `npm run dev`. Terminal B: `npm run fixtures:human`; elegir la contraseña en entrada oculta, sin compartirla, y conservar abiertos ambos procesos. Anotar únicamente alias/emails sintéticos. El comando imprime A/B/O/M/N/F/I; la contraseña es la que introdujo la persona.
4. Abrir `http://127.0.0.1:5173/login`. Credencial incorrecta: mensaje genérico y sin acceso. Credencial A correcta: entrar a /seguridad, verificar ID/rol y luego /seguridad/usuarios de solo lectura. No botones de creación/edición/eliminación de usuarios ni dominios de negocio.
5. Recargar navegador: esperar confirmación de sesión sin flash de datos previos; comprobar acceso restaurado. Cerrar sesión y recargar: volver a login, sin directorio anterior. No interpretar logout como invalidación instantánea de un JWT copiado.
6. Entrar como O. Ver su ID/OPERADOR; escribir manualmente /seguridad/usuarios: mensaje no autorizado, sin directorio completo. La suite API adjunta demuestra la frontera DB; no editar tokens manualmente ni enviarlos al chat para repetirla.
7. Logout y probar N, F e I con contraseña conocida de fixture: login Auth válido, pero acceso no habilitado y salida disponible. Probar M como unión de roles y luego volver a O; no ver datos de la identidad anterior durante el cambio. Registrar mensajes/observaciones y cualquier intervención no documentada.
8. En terminal B pulsar Enter para eliminar fixtures. En terminal A Ctrl+C. `npm run supabase:reset`; `npm run test:local`; `npm run test:security`; `npm run supabase:stop`. Registrar resultados y confirmar limpieza, destino local y ausencia de secretos. No generar acceptance ni hacer merge.

## 8. TEST-H1-019 — Material y recorrido de mantenibilidad

Revisar junto a una persona: SQL de la migración, inventario de la sección 3, matriz de actores de sección 4, resultados API de sección 5, SessionProvider/SecurityRoutes y los riesgos de sección 6. La persona debe poder explicar:

```text
login Auth → JWT validado por plataforma → auth.uid()
  → app_users activo + app_user_roles + app_roles activo
  → helper privado booleano → grants/policy de lectura → filas permitidas
React: sesión/navegación/mensajes, sin autoridad para ampliar esas filas.
```

1. Explicar O leyendo su fila y O intentando leer la de A: mismo cliente/token ordinario, distinto filtro, misma frontera RLS. Identificar exactamente qué condición filtra la segunda petición.
2. Explicar A leyendo directorio y por qué no puede escribir ni administrar Auth. Revisar grants además de policies.
3. Explicar retirada de OPERADOR/inactivación con el mismo JWT y la unión de M cuando un rol está inactivo. No depender de metadata ni de renovar claims de roles.
4. Revisar por qué el helper necesita owner privilegiado, qué limita sus entradas/salida, cómo se evita recursión y por qué no está expuesto por RPC. Inspeccionar owner/search_path/EXECUTE, no confiar solo en el nombre.
5. Revisar la prueba negativa temporal: asignación inesperada amplió filas de O y CI lo detectó. No añadir policies para hacer pasar un caso que la matriz niega.
6. Evaluar si el recorrido, seis policies y un helper resultan comprensibles, probables y mantenibles por una persona. Considerar un caso futuro de seguridad solo conceptualmente, sin implementarlo ni asignar permisos H2. Registrar conforme, corrección acotada o necesidad de revisión de diseño. CI verde no decide conveniencia arquitectónica.

Formato de confirmación futura:

```text
Revisor / fecha / entorno:
Commit candidato:
TEST-H1-018: PASÓ / FALLÓ (pasos efectivamente realizados y observaciones)
TEST-H1-019: CONFORME / CORRECCIÓN / REVISIÓN DE DISEÑO (razones)
Defectos y límites reconocidos:
Decisión humana explícita posterior sobre Gate 2:
```

Sin esa confirmación y decisión final no crear acceptance.md, no aprobar H1, no merge a main ni iniciar H2. Gate 1 y aceptación H0 no sustituyen este cierre humano.

```text
H1 IMPLEMENTATION: COMPLETE
TECHNICAL TESTS: PASSED
HUMAN TESTS: PENDING
GATE 2: BLOCKED
ACCEPTANCE: BLOCKED
MERGE TO MAIN: BLOCKED
```
