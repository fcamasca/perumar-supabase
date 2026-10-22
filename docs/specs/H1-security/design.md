# H1 — Seguridad base: design

**Versión:** 0.1 · **Fecha:** 21/10/2026 · **H1 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**

Diseño propuesto, sin código, DDL, migraciones, fixtures ni workflow implementados. Precedencia y recorte funcional en [requirements.md](requirements.md). Gate 1 debe aprobar este diseño y sus límites antes de crear la rama de implementación.

## DES-H1-001 — Reutilización y alcance

**REQ:** 001, 015. Un paquete React/TypeScript/Vite, cliente SDK único, PostgreSQL/Auth locales, scripts de destino y guard H0, lockfile y CI existentes. No backend CRUD ni nuevo proveedor. Construcción futura en `feature/h1-security` desde el commit exacto aprobado de `feature/h1-security-spec`, no desde otro main posterior por conveniencia.

La construcción deberá modificar explícitamente las opciones de Auth desactivadas en H0, crear migraciones de seguridad y adaptar inventario/diagnóstico H0 que exige cero tablas/rutas. No eliminar controles ni hacer pasar H1 con la aserción antigua deshabilitada: sustituirla por inventario exacto H1. Documentación/aceptación histórica H0 no se reescribe. El diagnóstico público no debe enumerar tablas protegidas antes del login; el test técnico autenticado sí verifica el inventario autorizado.

## DES-H1-002 — Auth local y aprovisionamiento separado

**REQ:** 002, 007, 011, 013. Login por email/contraseña de cuentas sintéticas existentes, usando signInWithPassword del SDK. Supabase Auth verifica credenciales; no se guarda hash ni contraseña en tablas de aplicación. Configurar explícitamente el Auth local para login por contraseña y sin registro público. No incluir signup en UI ni permitir signup directo por API. Las cuentas se crean mediante Auth Admin API en proceso local de pruebas con email sintético confirmado, no insertando manualmente auth.users.

El proceso de fixtures verifica destino loopback y proyecto local esperado, ausencia de link remoto y guard aprobado antes de usar privilegios. Toma la credencial administrativa local de salida CLI capturada en memoria y nunca la imprime, guarda en VITE ni entrega al navegador. Sus escrituras a las tablas de seguridad están fuera del tráfico de aplicación y se identifican como preparación/restauración, no prueba de autorización de usuario.

En CI, contraseñas efímeras generadas en memoria; en ensayo humano, contraseña de fixture suministrada por la persona mediante entrada local no visible o variable de proceso privada. No enviar contraseñas por chat, fijarlas en ejemplos o imprimirlas para facilitar el login. El revisor conoce la contraseña que suministró. Usar identidades .invalid sin datos reales, registro seguro de IDs/roles y limpieza por IDs exactos de los fixtures. Las migraciones crean estructura y roles iniciales; no cuentas Auth ni contraseñas.

Errores de login visibles: genéricos, sin revelar existencia de email, token o respuesta interna. No afirmar que el UI elimina todos los canales de enumeración del proveedor. Recuperación, invitaciones, correo productivo y alta de personal no forman parte de este ensayo. [Supabase: password-based Auth](https://supabase.com/docs/guides/auth/passwords).

## DES-H1-003 — Modelo mínimo de seguridad

**REQ:** 005, 006, 007, 015. Tres tablas de seguridad reales, sin tabla dummy:

| Tabla propuesta | Datos/constraints | Finalidad |
|---|---|---|
| public.app_users | id UUID PK y FK a auth.users.id; active no nulo; created_at del servidor | Habilitación de aplicación separada de identidad Auth; no duplicar email/contraseña |
| public.app_roles | code único/PK, inicialmente ADMIN u OPERADOR; active no nulo | Catálogo mínimo de roles de prueba, sin permisos genéricos ni jerarquía |
| public.app_user_roles | user_id FK app_users, role_code FK app_roles; PK compuesta; created_at del servidor | Varios roles por usuario, sin duplicados ni asignaciones huérfanas |

No columna is_admin en perfil ni permisos paralelos en JSON/JWT. Una asignación se revoca eliminando esa relación; no añadir otro estado de asignación mientras no sea necesario. La inactivación de usuario o rol no borra la relación. IDs/constraints/timestamps los protege DB; en H1 el navegador no tiene escrituras a estas tablas. Al eliminar un fixture Auth, limpiar solo sus relaciones/usuario por referencia controlada; el orden/cascada exacto debe quedar en la migración y prueba de reconstrucción.

Roles combinados: unión de capacidades de roles activos. ADMIN no es superusuario PostgreSQL ni equivalente a service_role. No hay permisos de administración de identidad implícitos por llamarse ADMIN. Inactivar OPERADOR no quita una asignación ADMIN todavía válida del mismo usuario. No se define la matriz definitiva ni se mapean director/coordinador de las HU a estos códigos.

## DES-H1-004 — Matriz de lecturas, grants y RLS

**REQ:** 005, 006, 007, 008, 009. Identidad de fila: auth.uid() bajo peticiones cuyo JWT verifica la plataforma. Ninguna policy toma user_id/role del cuerpo o de user_metadata como identidad. Se evalúa estado vigente en tablas, no roles precargados en el JWT. Leer metadata del cliente jamás añade permisos.

| Actor de petición | app_users | app_user_roles | app_roles | INSERT/UPDATE/DELETE de las tres tablas |
|---|---|---|---|---|
| Anónimo, token inválido o vencido sin renovación | Sin acceso | Sin acceso | Sin acceso | Denegado |
| Auth válido sin fila, inactivo o sin ningún rol activo | Sin filas autorizadas | Sin filas autorizadas | Sin filas autorizadas | Denegado |
| OPERADOR activo | Solo su fila | Solo sus asignaciones | Solo roles activos del catálogo | Denegado |
| ADMIN activo | Todas las filas de seguridad, incluidas inactivas | Todas las asignaciones | Todo el catálogo, incluidos roles inactivos | Denegado |
| ADMIN + OPERADOR activos | Unión; equivalente a ADMIN en estas lecturas | Unión | Unión | Denegado |

La exposición del nombre de los dos roles activos al OPERADOR no le concede ninguno de ellos. No se incluyen nombres personales/emails innecesarios en el directorio. Las asignaciones que ve un OPERADOR pueden incluir un rol inactivo: no es una capacidad; la consulta del catálogo y la comprobación efectiva determinan que ese rol no habilita nada. Si no conserva ningún rol activo, queda sin filas en las tres tablas.

Grants: revocar a PUBLIC/anon acceso a las tablas; authenticated recibe SELECT explícito, sin escrituras, TRUNCATE ni permisos de crear objetos. Rol administrativo de fixture conserva solo lo necesario para preparar el ensayo; no se usa para comprobar accesos. RLS habilitado en cada tabla expuesta y sin policies de escritura. Los defaults de H0 no son garantía suficiente: la migración define grants explícitos. Verificar también secuencias, vistas, RPC y schemas accesibles; no crear vistas o RPC para eludir RLS.

Policies SELECT separadas por propósito: lectura propia condicionada a rol efectivo y lectura global ADMIN. Roles: catálogo activo para actor habilitado y catálogo completo para ADMIN. Todas dirigidas a authenticated, sin policy pública permisiva. La composición OR de policies permisivas se prueba por tabla para evitar que una regla global expanda la lectura propia. No policies FOR ALL. Revocar grants de escritura es defensa adicional a RLS, no excusa para dejar una policy amplia.

Denegación SELECT puede ser HTTP 200 con array vacío por filtrado RLS; escritura/grant denegado puede ser error de permisos, y JWT inválido error Auth. Las pruebas verifican contenido y ausencia de efectos, no solo status HTTP. Estado aplicado tras commit a nuevas solicitudes con el mismo token; no se promete cancelar una consulta ya en curso.

## DES-H1-005 — Un helper privado, sin recursión

**REQ:** 007, 008, 009, 013. Se propone una sola función interna privada de comprobación de rol activo, por ejemplo private.has_active_role(role_code). Retorna booleano para el usuario actual de auth.uid(), unido a app_users activo, asignación existente y app_roles activo. Un código inexistente o identidad nula no concede acceso. No recibe el ID del sujeto como argumento; no usa SQL dinámico, escrituras, llamadas externas ni metadata del cliente.

La lectura de estas mismas tablas desde policies requiere evitar recursión. Helper SECURITY DEFINER, propietario de migración confiable postgres del entorno Supabase local, search_path vacío, nombres totalmente calificados, cuerpo mínimo de lectura, sin owner controlable por cliente. Es una frontera privilegiada explícita: el propietario puede saltar RLS, por lo que el cuerpo debe fijar siempre al actor auth.uid() y no devolver filas. No añadir FORCE RLS que reintroduzca recursión sin revisar el mecanismo.

Esquema private fuera de schemas expuestos por Data API; sin CREATE para PUBLIC/anon/authenticated. Revocar EXECUTE por defecto a PUBLIC/anon; dar a authenticated únicamente USAGE del esquema y EXECUTE del helper necesario para evaluar policies. No existe endpoint RPC público que ejecute como ese owner. Los parámetros son códigos, nunca fragmentos SQL. Pruebas inspeccionan owner, search_path, volatilidad de lectura, grants y exposición, y demuestran que no se autoriza a otro sujeto ni hay 42P17.

La política conserva solo la condición de fila y llamada al helper; no se replica el join de seguridad en cada policy. No agregar una jerarquía de helpers o un motor de permisos. Esta decisión y sus riesgos son propios del Spec; la documentación oficial explica la semántica de funciones privilegiadas y las limitaciones de metadata editable. [Supabase: RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## DES-H1-006 — Sesión React y logout

**REQ:** 002, 003, 004, 007, 010, 012, 013. Mantener un cliente SDK. Durante construcción cambiar las opciones de H0 a persistSession/autoRefreshToken habilitados; mantener detectSessionInUrl desactivado porque no hay flujo de enlaces/OAuth. Usar almacenamiento por defecto del SDK para esta SPA local, sin repositorio de tokens propio ni cookies de sesión de backend.

Un proveedor de sesión React con Context/hooks; estados: inicializando, sin sesión, identidad Auth válida cargando acceso, autorizado, autenticado sin acceso y error recuperable. Al restaurar, getSession sirve para recuperar estado del SDK; getUser confirma identidad contra Auth antes de presentar datos protegidos. Leer perfiles/roles bajo ese mismo token; RLS es la autoridad. Un almacenamiento editado o un JWT inventado no se convierte en usuario válido por parsearlo en React.

Suscribir eventos del SDK y liberar suscripción. Callback de evento ligero; cargas asíncronas fuera del callback, descartando respuestas obsoletas por cambio de sesión/logout. No esperar llamadas Auth reentrantes dentro del callback. Durante renovación/cambio/error, no pintar datos de la identidad anterior. SDK renueva con refresh token; si no puede, quitar datos y volver a login. Sin eventos/listeners duplicados por StrictMode.

Logout de sesión actual mediante scope local explícito: limpiar estado y caches propios de la SPA inmediatamente y solicitar signOut al SDK. Esperar resultado para mostrar éxito; si hay fallo, mensaje seguro y estado bloqueado, sin fingir revocación. Comprobar eliminación del almacenamiento de esa sesión según API SDK; no borrar indiscriminadamente todo localStorage ni datos ajenos. Otra pestaña/dispositivo no se declara cerrada por esta operación local.

Un access token copiado antes de logout puede seguir válido hasta su expiración. No se agrega blacklist/sesiones SQL para prometer revocación instantánea; se registra esa limitación para Gate 1 y la prueba correspondiente. Cambiar habilitación/roles sí niega nuevas lecturas de aplicación porque RLS consulta DB vigente. XSS podría leer tokens en almacenamiento del navegador: no es un secreto protegido por el prefijo VITE ni un problema resuelto por el SDK. [Supabase: sesiones](https://supabase.com/docs/guides/auth/sessions), [signOut](https://supabase.com/docs/reference/javascript/auth-signout).

## DES-H1-007 — Rutas y pantalla técnica

**REQ:** 003, 005, 008, 010, 012. Pantallas mínimas de seguridad:

| Ruta propuesta | Experiencia |
|---|---|
| /login | Email/contraseña, validación básica, sin signup ni mensajes de existencia de cuenta |
| /seguridad | Sesión/habilitación, información propia permitida, roles vigentes visibles y logout |
| /seguridad/usuarios | Directorio de seguridad de solo lectura para ADMIN; sin edición ni gestión de credenciales |

Sin sesión: redirigir a login; sesión válida sin acceso: pantalla de acceso no habilitado y logout, sin bucle de redirecciones. OPERADOR en ruta ADMIN: mensaje de acceso no autorizado y enlace a ruta propia. Ruta desconocida: pantalla neutra sin datos. La restricción UX no es un status HTTP del servidor ni una policy adicional. Navegación con un enrutador SPA convencional (React Router, versión compatible fijada al construir), sin crear router artesanal, paquetes múltiples ni framework de autorización.

React deriva la visibilidad de la sesión y las filas de seguridad que puede leer. Solo comprobación mínima de rol para navegación; no copia listas de permisos de negocio o implementa una segunda matriz. Consulta a DB directa con filtros manipulados continúa protegida. No usar el resultado cacheado de React para permitir writes o conceder permisos. Tras una denegación vaciar el recurso previo y mostrar error seguro; al reentrar/recargar, volver a consultar acceso. La UI no asegura detectar una revocación remota sin nueva petición: la DB sí la aplica a la siguiente solicitud.

## DES-H1-008 — Seguridad proporcional y trazabilidad

**REQ:** 002, 004, 011, 012, 013, 014. Validaciones de formato email y presencia de contraseña en React ayudan a UX; Auth valida credenciales. SQL estático y valores parametrizados; sin campos de SQL ni plantillas ejecutables. Texto renderizado por React, sin dangerouslySetInnerHTML, scripts de contenido o HTML de logs. No añadir sanitizador/editor enriquecido sin esa necesidad.

La SPA presenta token explícito del SDK en peticiones, sin cookie de sesión de aplicación enviada automáticamente: no añadir token CSRF por rutina. Si cambia a cookies, otro origen alojado o flujo de enlaces, revisar CSRF, CORS, redirects y transporte antes del cambio. Mantener loopback H0; nada de SMTP remoto ni hosting. No afirmar que este entorno HTTP local equivale a HTTPS productivo.

Trazabilidad del hito, no módulo de auditoría general: migración/commit identifican cambios estructurales; preparación y cambios de fixtures registran ID de prueba, actor sintético y ejecutor técnico, operación, estado anterior/posterior no sensible, resultado y restauración. Logs Auth disponibles se consultan filtrados cuando ayuden al diagnóstico; no prometer que registran toda denegación de RLS. Un intento rechazado se documenta mediante respuesta y snapshot de DB inalterado. Evidencia protegida sin passwords, tokens, cabeceras Authorization, URLs SQL, SQL de error ni emails reales.

No hay edición administrativa de seguridad en el producto H1, por lo que no se incorpora una tabla/producto de auditoría completa para simular ese futuro flujo. Los registros de fixture no son evidencia inmutable de producción. Si durante construcción se propone exponer mutaciones administrativas, requiere revisión de alcance y auditoría de esa operación antes de implementarla.

Controles de Secure SDLC: requisitos negativos y amenazas explícitas; revisión de grants/policies/helper antes de aplicar; builds reproducibles, secretos fuera de artefactos; pruebas por actor; evidencia/revisión humana y corrección trazable. [OWASP SAMM](https://owaspsamm.org/model/). No se añaden WAF, SIEM, Vault o servicios de observabilidad nuevos.

## DES-H1-009 — Fixtures, migraciones y CI

**REQ:** 001, 005, 006, 007, 008, 009, 011, 013, 014, 015. Migraciones versionadas crean las tres tablas, constraints, roles iniciales, helper y grants/policies; no modificar una migración ya aplicada ni introducir SQL de H2. Mismo reset local y red H0. Prueba automatizada verifica un inventario permitido exacto en vez de aceptar cualquier objeto por tener RLS.

Actores sintéticos: ADMIN, OPERADOR, ambos roles, usuario Auth con app_user sin rol, usuario Auth sin app_user, app_user inactivo. Inactivación de OPERADOR y retirada de asignación se ensayan con fixture/restauración controlada, sin inutilizar un ADMIN que se usa como referencia. Ejecutar cambios de estado en serie para evitar interferencia; guardar IDs exactos y restaurar/limpiar también ante fallo. No cambiar configuración global de Auth ni firewall para acelerar las pruebas.

Cada prueba de autorización usa cliente aislado con clave pública y access token real de ese actor, sin credencial service_role ni cliente compartido que retenga sesión de ADMIN. Peticiones directas a Data API, fuera de React, verifican filas y efectos. Comparar inventario con conexión privilegiada solo para preparar/observar; jamás interpretar su éxito como prueba RLS. No SET ROLE o JWT simulado como única prueba de la frontera; inspección SQL complementa login/API real.

Extender CI H0, permisos de lectura, herramientas fijadas, Supabase/Docker del runner, sin proyecto remoto. Preparar fixtures → pruebas Auth/RLS → frontend/build/secretos → reset → repetir matriz relevante → limpieza en finalización. Retirar el mecanismo reservado de CI negativa H0 si afecta la nueva suite solo con ajuste trazable; conservar enlaces de evidencia histórica. No introducir E2E nuevo por defecto: Vitest/React para UI y SDK/HTTP local para integración; el navegador real se revisa humanamente.

Para probar expiración real sin fabricar JWT firmados, el perfil de integración puede fijar una duración corta soportada por Auth local. Durante construcción se documentará su valor exacto y se esperará el exp de un token real; no confundir un token con firma alterada con un token válido expirado. Esta configuración es solo del proyecto local desechable y se restaura al terminar el ensayo, sin cambiar cuentas/proyectos remotos ni servicios globales. La prueba unitaria con reloj controlado complementa ese caso, no lo sustituye.

## DES-H1-010 — Gates, riesgos y criterios Well-Architected

**REQ:** 001, 009, 014, 015, 016. Gate 1 aprueba estos cuatro documentos y sus decisiones; construir únicamente después. Gate final H1 requiere pruebas técnicas, recorrido humano y revisión de mantenibilidad Auth/RLS. Presentar inventario de policies, grants, helper y recorrido de un permiso; pedir decisión antes de expandir si hay recursión, duplicación, helpers encadenados, reglas imposibles de explicar o depuración dependiente de privilegios administrativos.

No se fija un umbral arbitrario de líneas/policies como garantía de simplicidad. La revisión debe poder predecir y probar el caso permitido/denegado y la revocación leyendo una regla de propósito claro y un helper único. Una CI verde no decide conveniencia arquitectónica. Resultado humano: aprobar, solicitar corrección/revisión acotada o detener expansión; nunca incorporar API adicional automáticamente. Gate final H1 no sustituye GATE-A01 posterior a H5.

| Criterio usado por el PLAN | Aplicación H1 | Evidencia futura |
|---|---|---|
| Seguridad | Identidad validada, mínimo privilegio, denegación por defecto, secretos y pruebas de bypass | Matriz RLS/negativos, revisión helper y logs |
| Fiabilidad | Renovación/fallo sin datos previos, reset determinista y fixtures restaurables | Sesión expirada, logout fallido, reconstrucción |
| Eficiencia de rendimiento | Un cliente, consultas pequeñas y helper sin lógica remota; no medir escalabilidad SaaS | Sin recursión, revisión del recorrido y consultas locales |
| Optimización de costos | Auth/DB locales existentes, una CI, sin backend ni infraestructura nuevos | Inventario de recursos y dependencias |
| Excelencia operativa | Migraciones, comandos claros, trazabilidad y gates humanos | Clon reproducible y evidencia por commit |

Son criterios de diseño, no una certificación ni obligación de desplegar en AWS. [AWS Well-Architected](https://docs.aws.amazon.com/wellarchitected/latest/framework/the-pillars-of-the-framework.html). El PLAN usa estos cinco pilares; no se añade un sexto como requisito nuevo.

Riesgos registrados: helper con privilegios exige revisión cuidadosa; policies permisivas se combinan por OR; JWT residual tras logout; tokens legibles ante XSS; degradación de privilegios no elimina mágicamente datos ya vistos en pantalla; fixtures administrativos no representan alta productiva. Las medidas y pruebas se trazan en test-plan. Si un riesgo exige cambiar diseño, detener el trabajo afectado para decisión humana.

**H1 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**
