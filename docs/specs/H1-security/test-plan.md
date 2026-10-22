# H1 — Seguridad base: test plan

**Versión:** 0.1 · **Fecha:** 21/10/2026
**H1 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**

## 1. Estado y evidencia futura

Todas las pruebas TEST-H1 están **NO EJECUTADAS**. La revisión documental actual verifica coherencia del Spec, no ejecuta login, SQL, RLS, fixtures, CI ni pruebas humanas. No se inició el stack para preparar estos documentos.

En construcción, cada evidencia identifica ID, commit, versiones/entorno, actor de fixture y ejecutor, comando o petición, respuesta esperada/obtenida, snapshot no sensible, defectos/correcciones y repetición. Una credencial administrativa solo prepara u observa estado; cada comprobación de autorización debe usar clave pública y token propio del actor, sin privilegios de bypass. Prohibido adjuntar passwords, access/refresh tokens, headers Authorization, claves secret/service_role, URLs SQL o datos reales.

Herramientas: Vitest/React de H0 para unidad/UI, SDK/HTTP contra Auth/Data API local y consultas administrativas de solo lectura para inspección. Sin framework E2E nuevo por defecto ni cuentas remotas. Los códigos 200/401/403 varían según capa: el oráculo verifica filas exactas y ausencia de efectos además del status. No convertir 200 con [] en permiso concedido ni un error de red en denegación RLS demostrada.

## 2. Fixtures y preparación

Stack local protegido por el guard H0, proyecto esperado sin link remoto, migraciones H1 y configuración pública generada con los controles H0. Directorio de prueba desechable, sin datos reales. ADMIN A y ADMIN B permiten revisar visibilidad de filas ajenas; OPERADOR O; usuario M con ambos roles; usuario N con fila pero sin rol; usuario F Auth sin fila; usuario I con fila inactiva y asignación. Todos Auth creados por API administrativa local, no por escritura manual de auth.users. Ningún fixture concede privilegios de aplicación al cliente que lo crea.

Mantener un snapshot esperado por actor que no se derive de roles potencialmente alterados durante el ataque. Clientes aislados por actor y prueba, sin persistencia cruzada de SDK. Ensayos de inactivación/revocación serializados, restauración en finalización por IDs exactos; cleanup igualmente ante fallo. Contraseñas de CI generadas en memoria; para recorrido humano suministro privado local de contraseña conocida por la persona. No publicarlas en comandos o logs. La fase de expiración real usa duración local soportada y registrada según DES-H1-009, no cambia configuración global ni genera firmas propias.

## 3. Pruebas automatizadas de aplicación y plataforma local

### TEST-H1-002 — Reconstrucción, inventario y fixtures

**Pasos:** desde clon limpio instalar lockfile, iniciar stack, aplicar/resetear migraciones, preparar fixtures y comprobar constraints/objetos/grants. Repetir tras reconstrucción. Ensayar ID Auth inexistente, asignación huérfana/duplicada y código de rol fuera del conjunto inicial; deben rechazarse. Intentar usar setup con destino remoto simulado antes de conectarse: debe abortar sin mutación.

**Esperado:** tres tablas de seguridad, helper privado y policies previstas; sin objetos H2–H9. Roles semilla sin contraseñas ni cuentas en migración; fixture sin restos inesperados. Signup directo con clave pública está deshabilitado y no crea identidad. Inventario H0 actualizado a lista H1 explícita; frontend/toolchain/guard/secretos conservados, sin reescribir acceptance H0.

### TEST-H1-003 — Anónimo y credencial inválida

**Pasos:** llamar directamente a las tres tablas sin bearer de usuario, con clave pública sola y con bearer inventado/firma alterada. Intentar lectura e inserción/modificación/borrado con cada variante.

**Esperado:** ningún dato protegido ni efecto; grants/RLS/Auth deniegan según capa. Verificar que un token manipulado con sub de ADMIN no adquiere identidad. Comprobar ausencia de policy/grant PUBLIC/anon que permita el mismo recurso por otra operación.

### TEST-H1-004 — Login válido/inválido y alta pública

**Pasos:** autenticar A y O con credenciales válidas y probar contraseña incorrecta, email inexistente, entrada vacía/formato inválido. Comprobar que tras fallo no queda sesión previa ni perfil de otro actor; errores visibles uniformes. Intentar signup vía SDK/HTTP aun sin botón en UI.

**Esperado:** solo logins válidos producen sesión y lectura permitida; fallos no revelan existencia de email en la UI, contraseña ni errores internos. Signup no crea cuenta. La captura de diagnóstico no incluye credenciales. No interpretar un proveedor que responde distinto como garantía de anti-enumeración global.

### TEST-H1-005 — Restauración, renovación, expiración y carreras

**Pasos:** unidad React/SDK con reloj controlado: recarga en estado inicial, renovación correcta/fallida, getUser fallido, almacenamiento editado, logout mientras está pendiente perfil y respuesta tardía de identidad anterior. Comprobar listeners/cleanup bajo StrictMode. Integración local con token real: renovar con refresh válido y, en fase de expiración corta registrada, esperar exp y probar Data API con el access token expirado sin renovarlo; probar renovación no válida.

**Esperado:** restauración solo después de confirmación Auth y lectura protegida; sin flash de directorio/datos anteriores. Token realmente expirado no autoriza; renovación válida recupera acceso, inválida cierra la experiencia protegida. Una firma alterada no cuenta como prueba de expiración real. Ningún token se imprime ni se fija una política institucional de duración por este ensayo.

### TEST-H1-006 — Logout y límites de revocación

**Pasos:** login, leer recurso, logout scope local y reintentar navegación/recarga; simular fallo de signOut remoto y verificar UI bloqueada/error seguro. Antes del logout capturar solo en memoria un access token real y probarlo después, separando sesión del navegador y token copiado. Comprobar también imposibilidad de renovación de la sesión cerrada según respuesta Auth.

**Esperado:** datos locales desaparecen inmediatamente; no se muestra éxito de cierre remoto si falló. No se promete invalidación instantánea del JWT copiado: puede funcionar hasta exp, caso conocido que debe registrarse y revisarse humanamente. Tras expiración no funciona. No exigir que un logout local cierre otras sesiones como parte de H1. No borrar todo almacenamiento del origen indiscriminadamente.

### TEST-H1-007 — Matriz de lecturas ADMIN/OPERADOR

**Pasos:** A y O llaman a app_users, app_user_roles y app_roles con clientes separados y comparan IDs/códigos recibidos con snapshot esperado; solicitar ID ajeno explícito, sin filtro y con filtros/joins distintos.

**Esperado:** A ve el directorio de seguridad previsto; O solo fila/asignaciones propias y catálogo activo. O no ve filas de A/B/I aunque cambie filtros; A no adquiere escrituras por su nombre de rol. Obtener nombre ADMIN en catálogo no concede acceso al directorio completo. Sin filas de otro actor en estado React o respuesta HTTP.

### TEST-H1-008 — Varios roles y composición

**Pasos:** M con ADMIN+OPERADOR lee según unión. Inactivar OPERADOR y comprobar que M conserva solo capacidades ADMIN; inactivar ADMIN con OPERADOR activo y comprobar que M queda limitado a propias; restaurar estados. Retirar una asignación y repetir sin emitir JWT nuevo.

**Esperado:** unión solo de roles activos/asignados; no privilegios implícitos ni dependencia del orden de roles. Sin asignaciones duplicadas. Restaurar en finalización para no contaminar los siguientes tests.

### TEST-H1-009 — Manipulación desde navegador/metadata

**Pasos:** como O, alterar localStorage/estado React a ADMIN y cambiar IDs/filtros; intentar enviar role/permissions como cuerpo o parámetros. Mediante la API permitida de Auth del propio O, agregar user_metadata con rol ADMIN y repetir la misma lectura de directorio. Alterar sub/role del JWT rompe su firma y se ensaya por separado.

**Esperado:** la metadata editable o el estado falso de UI no amplía datos. Token con firma rota rechazado por plataforma. Las tres tablas y helper no confían en esos valores; solo auth.uid() verificado y relaciones vigentes. Restaurar metadata de prueba; no usar token administrativo para simular este ataque.

### TEST-H1-010 — Escrituras y acceso directo evadiendo UI

**Pasos:** con tokens A y O enviar POST/PATCH/DELETE a cada tabla vía Data API, incluyendo autoasignar ADMIN, activar usuario, cambiar rol, escribir identidad ajena y borrarse. Capturar inventario antes/después con observador privilegiado separado. Intentar RPC/helper como endpoint y acceso a esquema privado; comprobar que no existen vistas o rutas alternativas expuestas.

**Esperado:** toda escritura de navegador denegada, también para A; estado intacto. Esquema/helper no expuestos por REST y sin endpoint equivalente de escritura. No basta que la UI no tenga botón. No enviar DELETE masivo al entorno compartido: fixture/local verificados y filtros por IDs exactos.

### TEST-H1-011 — Auth sin habilitación de aplicación

**Pasos:** login válido de N y F; llamar directamente a las tres tablas y abrir ruta propia/ADMIN. Comparar con login válido de O para distinguir denegación de caída del servicio.

**Esperado:** identidad Auth válida no implica permiso; N y F no obtienen filas protegidas, ni error interno por fila ausente ni redirección infinita. UI comunica acceso no habilitado con opción logout. Ninguna inserción automática de app_user o ADMIN para arreglar el caso negativo.

### TEST-H1-012 — Estados inactivos y revocación con JWT vigente

**Pasos:** I con usuario inactivo, O con OPERADOR inactivo y O sin su asignación deben perder acceso. Para cada cambio iniciar con lectura positiva, conservar el JWT en memoria, efectuar cambio en proceso de fixture privilegiado, confirmar commit y repetir nueva solicitud con ese mismo JWT. React debe vaciar recursos al recibir denegación y no seguir usando datos antiguos al reentrar.

**Esperado:** cero filas protegidas salvo que otro rol activo permita explícitamente el recurso. Rehabilitar/restaurar demuestra que la prueba mide autorización y no red caída. No invalidar token artificialmente para hacer pasar el caso: se prueba DB vigente, no renovación de claims. No se promete cancelación de solicitudes en curso ni borrado de datos ya vistos por una persona.

### TEST-H1-013 — Aislamiento entre policies, grants y helper

**Pasos:** inspección automatizada de catálogo SQL: RLS habilitado, grants por rol/operación, condiciones de cada policy, schemas expuestos, helper único/owner/search_path y ausencia de escrituras/SQL dinámico. Probar lecturas cruzadas de cada tabla y combinaciones de policies; un permiso de catálogo o lectura propia no debe habilitar directorio ni escrituras. Comprobar helper con identidad nula, rol desconocido e intento de parámetros de otro sujeto/SQL; inspección y llamadas parametrizadas en sesión técnica controlada complementan la frontera API real.

**Esperado:** no recursión 42P17 ni dependencia circular entre policies; solo booleano fijado al actor, sin subject arbitrario; ningún EXECUTE a PUBLIC/anon, CREATE de cliente o helper privilegiado expuesto. Función no cambia propietario ni search_path por entrada del cliente. Un rol de prueba no hereda BYPASSRLS. Seguridad definer no se usa como bypass general.

### TEST-H1-014 — Rutas y estados de UI

**Pasos:** montaje React con estados sin sesión/cargando/restaurado/sin acceso/error; navegación a las tres rutas, URL ADMIN escrita manualmente por O, recarga, ruta desconocida y logout con consulta pendiente. Comparar botones visibles con el resultado independiente TEST-H1-007/010.

**Esperado:** sin sesión → login; A autorizado → directorio; O → mensaje sin directorio; N/F/I → acceso no habilitado; sin flash ni datos residuales, callbacks repetidos ni bucles. El test no se presenta como demostración RLS por sí solo. Cambiar roles solo en React no constituye autorización real.

### TEST-H1-015 — Entradas, errores y secretos

**Pasos:** casos inválidos de email/clave/URL y clave privilegiada canario; texto parecido a HTML/script y payload parecido a SQL en parámetros admitidos; capturar mensajes, bundle estático, diffs y logs filtrados. Revisar variables, ignore y permisos de CI. Provocar denegación de DB, caída Auth/API y fallo de logout, sin usar datos reales.

**Esperado:** error claro sin contraseña/token/SQL ni filas ajenas; contenido no ejecuta HTML; consultas no concatenan SQL; sin canarios privilegiados en bundle/logs. Ejemplos sin secretos, credenciales administrativas solo en proceso de fixtures. No confundir almacenamiento runtime de la sesión del SDK con secreto incrustado en bundle. Revisar manualmente diffs: patrones automáticos no prueban ausencia absoluta de secretos.

### TEST-H1-016 — Trazabilidad y limpieza de fixtures

**Pasos:** crear, cambiar asignación/estado, simular fallo de prueba y restaurar/limpiar; verificar registro de commit, actor sintético, ejecutor, operación, estado no sensible y resultado. Comprobar destino rechazado antes de mutación y observación privilegiada separada del cliente ordinario. Consultar diagnóstico Auth solo filtrado si está disponible.

**Esperado:** se puede explicar qué cambio causó una denegación y qué se restauró; no restos de usuario/rol inesperado ni logs con credenciales. No borrar actores ajenos, modificar migraciones aplicadas ni fingir auditoría de producción. Se documenta que una denegación RLS no tiene garantizado un evento en logs Auth.

## 4. Pruebas técnicas manuales

### TEST-H1-001 — Origen, autorizaciones y alcance

Comprobar main base, commit aprobado del Spec, rama de implementación descendiente, aceptación H0 conservada, gates humanos y ausencia de H2/API nueva/infraestructura remota. Durante preparación actual solo se comprueban documentos/branch; no se declara ejecutada la prueba del futuro hito. Al cierre identificar candidato y cambios documentales posteriores, sin aceptación de Codex.

### TEST-H1-017 — CI real y fallo relevante detectado

Revisar workflow/acciones/versiones/permisos/cleanup y logs. Ejecutar CI del candidato con Auth/Data API local y fixtures efímeros, lint, tipos, pruebas, build, controles de secretos y reset con repetición. En ensayo temporal controlado introducir una asignación ADMIN inesperada al fixture que la matriz considera OPERADOR y demostrar que el test de visibilidad falla; no recalcular el resultado esperado desde ese estado alterado. Retirar asignación, comprobar restauración y repetir candidato limpio. No publicar una policy insegura ni aceptar la rama de ensayo como candidato.

Esperado: CI pasa con configuración correcta y detecta la ampliación no prevista; siempre intenta limpieza. Registrar commits/runs y explicación del fallo. Sin continue-on-error para controles críticos ni deployment/acceptance/merge automatizados. El ensayo H0 sigue como referencia histórica, no reemplaza el caso negativo de autorización H1.

## 5. Pruebas humanas

### TEST-H1-018 — Recorrido reproducible de sesión y acceso

Persona revisora designada: registrar identidad/fecha/commit/entorno y seguir README futuro desde clon limpio, incluidas credenciales sintéticas suministradas privadamente. Verificar login válido/inválido, recarga/restauración, recurso propio O, directorio A, ruta ADMIN manual con O, sin rol, usuario inactivo, logout y recarga. Revisar prueba API directa producida por suite, sin copiar tokens a chat ni atribuir la prueba a ocultamiento de botones. Confirmar mensajes comprensibles y límites de logout/JWT residual. Anotar pasos no documentados como defectos, restaurar fixtures y detener stack.

Esperado: recorrido completo confirmado por persona y sin recursos funcionales de H2. Codex prepara pasos/evidencia pero no firma la realización humana. Esta confirmación es distinta de la revisión de políticas y del Gate final.

### TEST-H1-019 — Revisión humana de mantenibilidad Auth/RLS

Con inventario del candidato, la persona explica un acceso permitido, uno denegado y una revocación: login → identidad verificada → app_user/asignación/estado → helper → policy → filas. Revisar todas las policies/grants/helper, propósito de cada una y qué cambiaría para un caso adicional de seguridad sin implementarlo. Comparar con matriz, resultados API y esfuerzo registrado al construir. Buscar recursión, duplicación de joins/reglas, privilegios excesivos, motor React paralelo o complejidad difícil de depurar.

Esperado: evaluación explícita de si Auth+RLS sigue siendo claro y mantenible. Resultado posible: conforme, corrección acotada o revisión de diseño antes de continuar. No inventar un umbral de rendimiento/líneas ni declarar conveniente la arquitectura solo por tests verdes. Esta revisión no autoriza automáticamente H2 ni reemplaza GATE-A01 tras H5.

### TEST-H1-020 — Gate 2 y cierre humano

Prerequisitos: suite técnica satisfactoria, TEST-H1-018/019 confirmados por persona y defectos críticos cerrados. Presentar commit y evidencia final, limitaciones y decisión de mantenibilidad; obtener aprobación humana explícita del resultado y su integración. Solo entonces TASK-H1-009 crea acceptance, actualiza PLAN y ejecuta merge autorizado. Si cambia código después de la revisión, repetir comprobaciones afectadas y confirmar el nuevo candidato. Sin esa decisión mantener aceptación y merge bloqueados; no empezar H2.

## 6. Cobertura de criterios y reglas críticas

| Criterio / regla | Positivo | Negativo / límite |
|---|---|---|
| CA-H1-01 sesión | 004, 005, 018 | 004 credenciales, 005 expiración/carrera, 006 fallo/logout |
| CA-H1-02 identidad y matriz | 007, 008 | 003, 009, 010, 011, 012 |
| CA-H1-03 grants/helper sin bypass | 007, 013 | 009 manipulación, 010 writes/RPC, 013 OR/recursión |
| CA-H1-04 reproducción y secretos | 002, 016, 017 | 002 destino/constraints, 015 canarios, 017 asignación indebida |
| CA-H1-05 simplicidad | 019 | 013 recursión/bypass, 019 revisión no conforme bloquea expansión |
| CA-H1-06 decisión humana | 018, 019, 020 | 001/020 ausencia de Gate 1 o Gate 2 bloquea trabajo correspondiente |

Los números de esta tabla corresponden a TEST-H1. Toda prueba fallida registra causa/evidencia y clasificación: corrección, diseño, alcance o evolución. Corregir dentro del mismo Spec y repetir; cambio de diseño/tecnología/alcance se detiene para revisión humana. No suavizar una policy o usar service_role para conseguir un resultado verde.

## 7. Matriz completa REQ → DES → TASK → TEST

| Requisito | Diseño | Tarea | Prueba |
|---|---|---|---|
| REQ-H1-001 | DES-H1-001, DES-H1-009, DES-H1-010 | TASK-H1-001, TASK-H1-007, TASK-H1-008, TASK-H1-009 | TEST-H1-001, TEST-H1-020 |
| REQ-H1-002 | DES-H1-002, DES-H1-006, DES-H1-008 | TASK-H1-003, TASK-H1-004 | TEST-H1-004, TEST-H1-005, TEST-H1-015 |
| REQ-H1-003 | DES-H1-006, DES-H1-007 | TASK-H1-004, TASK-H1-005 | TEST-H1-005, TEST-H1-014, TEST-H1-018 |
| REQ-H1-004 | DES-H1-006, DES-H1-008 | TASK-H1-004 | TEST-H1-006, TEST-H1-015, TEST-H1-018 |
| REQ-H1-005 | DES-H1-003, DES-H1-004, DES-H1-007, DES-H1-009 | TASK-H1-002, TASK-H1-003, TASK-H1-005, TASK-H1-006 | TEST-H1-002, TEST-H1-007, TEST-H1-011, TEST-H1-012 |
| REQ-H1-006 | DES-H1-003, DES-H1-004, DES-H1-009 | TASK-H1-002, TASK-H1-003, TASK-H1-006 | TEST-H1-002, TEST-H1-008, TEST-H1-012 |
| REQ-H1-007 | DES-H1-002, DES-H1-003, DES-H1-004, DES-H1-005, DES-H1-006, DES-H1-009 | TASK-H1-002, TASK-H1-003, TASK-H1-004, TASK-H1-006 | TEST-H1-003, TEST-H1-009, TEST-H1-010, TEST-H1-013 |
| REQ-H1-008 | DES-H1-004, DES-H1-005, DES-H1-007, DES-H1-009 | TASK-H1-002, TASK-H1-005, TASK-H1-006 | TEST-H1-003, TEST-H1-007, TEST-H1-008, TEST-H1-010, TEST-H1-011, TEST-H1-012, TEST-H1-013 |
| REQ-H1-009 | DES-H1-004, DES-H1-005, DES-H1-009, DES-H1-010 | TASK-H1-002, TASK-H1-006, TASK-H1-008 | TEST-H1-010, TEST-H1-013, TEST-H1-019 |
| REQ-H1-010 | DES-H1-006, DES-H1-007 | TASK-H1-004, TASK-H1-005 | TEST-H1-005, TEST-H1-014, TEST-H1-018 |
| REQ-H1-011 | DES-H1-002, DES-H1-008, DES-H1-009 | TASK-H1-003, TASK-H1-006, TASK-H1-007 | TEST-H1-002, TEST-H1-004, TEST-H1-016, TEST-H1-017 |
| REQ-H1-012 | DES-H1-006, DES-H1-007, DES-H1-008 | TASK-H1-004, TASK-H1-005, TASK-H1-006 | TEST-H1-004, TEST-H1-006, TEST-H1-014, TEST-H1-015 |
| REQ-H1-013 | DES-H1-002, DES-H1-005, DES-H1-006, DES-H1-008, DES-H1-009 | TASK-H1-002, TASK-H1-003, TASK-H1-004, TASK-H1-006, TASK-H1-007 | TEST-H1-009, TEST-H1-013, TEST-H1-015, TEST-H1-016, TEST-H1-017 |
| REQ-H1-014 | DES-H1-008, DES-H1-009, DES-H1-010 | TASK-H1-003, TASK-H1-006, TASK-H1-007, TASK-H1-008 | TEST-H1-016, TEST-H1-017, TEST-H1-018, TEST-H1-019 |
| REQ-H1-015 | DES-H1-001, DES-H1-003, DES-H1-009, DES-H1-010 | TASK-H1-001, TASK-H1-002, TASK-H1-003, TASK-H1-006, TASK-H1-007, TASK-H1-008 | TEST-H1-001, TEST-H1-002, TEST-H1-017, TEST-H1-018 |
| REQ-H1-016 | DES-H1-010 | TASK-H1-001, TASK-H1-008, TASK-H1-009 | TEST-H1-001, TEST-H1-017, TEST-H1-018, TEST-H1-019, TEST-H1-020 |

Esta matriz es la referencia completa; las tareas incluyen sus enlaces concretos y dependencias. Ningún requisito carece de diseño, cada DES tiene tarea, cada TASK tiene prueba y las fronteras críticas incluyen casos negativos. Revisión documental de esta cobertura no demuestra que esas pruebas futuras hayan pasado.

**H1 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**
