# H2 — Base académica: test-plan

**Versión:** 0.3 · **Fecha:** 22/10/2026 (America/Lima)
**H2 SPEC: PENDING HUMAN APPROVAL** · **IMPLEMENTATION: BLOCKED**

Plan de pruebas futuro, no evidencia de pruebas ejecutadas. **Todos los TEST están NO EJECUTADOS**. No se levanta stack ni se ejecutan tareas de construcción en esta entrega. Contratos esperados en [requirements.md](requirements.md) y [design.md](design.md); tareas en [tasks.md](tasks.md).

## Preparación y oráculos

Después de Gate 1: entorno local desechable H0/H1, guard vigente, sin datos reales, JWT ordinario por actor de la matriz de roles reales aprobada en OQ-H2-001, sin registro público ni cuentas reales. Preparación/observación administrativa solo para fixtures y comprobación complementaria; nunca sustituye la solicitud cuya autorización se prueba. Crear actores con DIRECTOR_ACADEMICO, COORDINADOR_ACADEMICO, ADMIN_SISTEMA y combinaciones, más sin fila/sin rol/inactivo. ADMIN/OPERADOR son solo pruebas técnicas históricas; no convertir sus asignaciones en roles reales por cuenta propia. Conservar propiedades de la regresión H1 sin reescribir su evidencia.

Cada prueba anota commit exacto, entorno, comando/petición sin secretos, datos sintéticos, resultado esperado/real, defecto, corrección y repetición. Verificar contenido/IDs/filas y ausencia de efectos, no solo HTTP 200. No confundir SELECT vacío por RLS con acceso permitido; no exponer información interna al usuario para facilitar el test.

OQ-H2-001 a 010 están resueltas por decisiones humanas registradas en requirements. No se consideran pendientes ni se solicita aprobarlas otra vez. R-H2-001 a 006 también están RESUELTAS POR DECISIÓN HUMANA, con catálogo simple, no DELETE y matriz de estados cerrados; no hay preguntas funcionales bloqueantes nuevas identificadas. El Spec completo todavía espera Gate 1 y ninguna prueba se declara ejecutada.

## Pruebas técnicas

| ID | REQ / DES | Procedimiento futuro y resultado exigido |
|---|---|---|
| TEST-H2-001 | REQ-001/016; DES-001/009 | Verificar Spec exacto y Gate 1, diez decisiones OQ y seis cierres R humanos, descendencia/base y working tree; solo cuatro documentos en esta revisión. Sin Gate 1 no ejecutar tareas; ningún resultado funcional aprobado equivale a aprobación del Spec completo. |
| TEST-H2-002 | REQ-001/007/014; DES-002/009 | Instalación futura desde lockfile, guard, reset e inventario H1 evolucionado+H2: roles reales, UUID, constraints, catalogo/catalogo_valor y maestras propias, RPC, RLS y auditoría. Carga inicial UBIGEO INEI/DICAPI/valores aprobados con fuente/versión/fecha, sin carga manual ni entidad H3. Evidencia H0/H1 intacta. |
| TEST-H2-003 | REQ-002/007; DES-002/003/006 | Materia: crear, consultar, modificar, inactivar con advertencia/motivo y reactivar. Código/nombre obligatorios trim/MAYÚSCULAS, límites 30/150, UNIQUE incluso inactivos, descripción opcional ≤500; versión/tiempo DB. Error conserva formulario y no deja escritura parcial. |
| TEST-H2-004 | REQ-003/004/007; DES-002/003 | Carrera: datos normalizados, nombre/código UNIQUE, sigla obligatoria normalizada alfanumérica UNIQUE 2–10, modalidad FK al catálogo correcto y descripción opcional; ≥1 materia ACTIVA al guardar, sin duplicados/huérfanos. Inactivar con motivo conserva referencias e impide nuevo Ciclo; reactivar. Sigla y sincronización en 026/027, protección de mínimo en 032. |
| TEST-H2-005 | REQ-005/006/007; DES-002/003 | Ciclo: UUID, código/año/correlativo DB, fechas/Carrera/Departamento/Provincia/Distrito/Capitanía activa obligatorias, ≥1 materia activa al registrarse, promoción opcional ≤150 y sin dirección libre. estado_codigo PROGRAMADO inicial, nunca active. Código no editable, FK UUID y carrera inactiva no seleccionable para alta. Lecturas históricas de referencias inactivadas preservadas. |
| TEST-H2-006 | REQ-004/006/007; DES-003 | Concurrencia de duplicados y superposición Carrera+Capitanía+fechas inclusivas: PROGRAMADO/EN_CURSO/CERRADO participan, DESIERTO/ANULADO excluidos. Mismo extremo cruza; diferente Carrera o Capitanía permite coincidencia. CERRADO sigue bloqueando rango; declarar DESIERTO/ANULADO lo libera. Probar edición de fechas/referencias y rollback completo si falla relación/sincronización/auditoría. |
| TEST-H2-007 | REQ-006/007; DES-002/003 | Maestras active BOOLEAN con reactivación, sin eliminación física. Inactivar Materia/Carrera exige motivo y conserva referencias; materia deja de precargarse sin retirarla de ciclos; carrera no seleccionable para nuevo ciclo. Ciclo no usa boolean. Estados inválidos y cascadas destructivas rechazados. |
| TEST-H2-008 | REQ-008/014; DES-004/008 | Matriz real y multirol: Director mantiene Materias/Carreras; Coordinador lectura referencial sin mantenimiento; Director/Coordinador crean/editan PROGRAMADO/EN_CURSO, terminales solo consulta. Solo Director transiciona estados, los tres leen auditoría; ADMIN_SISTEMA sin CRUD académico y directorio de seguridad solo lectura. Sin privilegios de roles técnicos, anónimos/no habilitados/JWT inválido; revocación con mismo JWT efectiva. |
| TEST-H2-009 | REQ-007/008/010; DES-004/006/008 | Manipular UUID de fila/FK, actor, rol en metadata, campos internos/versiones/código generado/estado; añadir desconocidos o alterar rutas/controles. DB mantiene permisos e invariantes, errores seguros y sin efectos. expected_updated_at no permite suplantar actor ni reemplazar updated_at servidor. |
| TEST-H2-010 | REQ-004/008; DES-003/004/008 | Intentar escrituras directas de entidades/puentes/versiones/códigos internos y llamadas RPC/función privada con JWT ordinario. Comandos obligatorios no pueden eludirse; no crear evento arbitrario. Inspeccionar owner/search_path/EXECUTE, grants/RLS y composición OR; negar a roles técnicos y sin privilegio funcional. |
| TEST-H2-011 | REQ-009; DES-005 | Auditoría con UUID evento/registro, entidad, acción, auth.uid(), timestamp DB, motivo nullable, old_values/new_values JSONB pertinentes. Registrar CREATE/UPDATE/asociaciones/estado/inactivar/reactivar/anular/cambio de sigla y sincronización. Ordinario sin motivo; sensibles con motivo, DESIERTO catálogo activo válido y OTRO con detalle, ANULADO/inactivaciones texto libre. Rollback de auditoría revierte negocio; descartar Ciclo nuevo no crea evento persistido. |
| TEST-H2-012 | REQ-008/009; DES-004/005 | Los tres roles funcionales activos consultan/listan auditoría filtrando fecha/actor/entidad/acción; no habilitados y roles técnicos sin permiso. Ni siquiera Admin Sistema puede insertar/editar/eliminar/truncar eventos ni invocar trigger interno. Logs/JSONB sin contraseña/JWT/secretos/payload indiscriminado; sin plataforma analítica nueva. |
| TEST-H2-013 | REQ-008/010/014; DES-006/008 | Regresión de propiedades Auth/RLS/sesión H1 tras evolución de roles: login/logout, persistencia/renovación/expiración, revocación/multirol y cambio multirol→Coordinador con respuestas tardías. Sin fuga de datos/formulario/caché del actor previo; no exigir ADMIN/OPERADOR como catálogo de producto ni cambiar aceptación histórica. |
| TEST-H2-014 | REQ-011/013; DES-007 | Sin preferencia → Sistema; claro/oscuro del SO y cambio en vivo seguidos. Selección explícita de tres paletas propias, persistencia tras recarga; valor corrupto/storage bloqueado → fallback seguro sin bloquear UI. Logout no expone datos ni convierte preferencia en dato de Auth |
| TEST-H2-015 | REQ-011/012; DES-007 | Medir pares reales de texto/fondo por paleta y estado: texto normal ≥4.5:1, grande ≥3:1; controles/indicadores necesarios ≥3:1 cuando aplica WCAG 1.4.11. Registrar valores y criterio, revisar foco no oculto y legibilidad de deshabilitados sin inventar excepción normativa. No declarar AA completa solo por ratios |
| TEST-H2-016 | REQ-010/012; DES-006/007 | Pruebas UI de labels/nombres, encabezados de tabla, errores asociados, estado textual, selección y teclado/foco en listas/formularios/selector. Error/éxito/advertencia/información/foco/seleccionado/deshabilitado en cada paleta; sin depender únicamente del color ni HTML inyectado |
| TEST-H2-017 | REQ-014/016; DES-008/009 | CI positiva del candidato revisado, migración/reset/catálogos/roles reales y suites repetidos; negativo temporal amplía acceso real no permitido de Coordinador/Admin Sistema y la suite lo detecta, se retira alteración/rama. Cleanup ante éxito/fallo, sin secretos ni deploy/acceptance/merge automático. |

### Casos específicos añadidos por decisiones humanas

| ID | REQ / DES | Procedimiento futuro y resultado exigido |
|---|---|---|
| TEST-H2-022 | REQ-001/008/014; DES-001/004/009 | Evolución explícita de roles/restricción H1 a DIRECTOR_ACADEMICO/COORDINADOR_ACADEMICO/ADMIN_SISTEMA. Ningún mapeo ADMIN→Director/OPERADOR→Coordinador, ni heurísticas de asignación a usuario conservado. Fixtures con roles reales explícitos, sin cuentas reales. Roles técnicos retirables del catálogo funcional, sin permiso H2; multirol, usuario/rol activo y revocación conservados; H0/H1 históricos intactos. Directorio adaptado en 034. |
| TEST-H2-023 | REQ-005/007/014; DES-002/006/009 | Reset carga catalogo/catalogo_valor solo de MODALIDAD_CARRERA/MOTIVO_CICLO_DESIERTO, maestras geográficas propias y Capitanías con fuentes/versiones/fecha autorizadas. No tablas específicas de Modalidad/Motivo ni catálogos futuros HU20. Provincia/Departamento y Distrito/Provincia incoherentes se rechazan en DB; no inventar Capitanía→Distrito. Referencias UUID y valores vigentes disponibles sin carga manual. |
| TEST-H2-024 | REQ-002/003/007; DES-002/003 | UUID DB y FK UUID; editar código/nombre no rompe relaciones. Materia/Carrera trim+MAYÚSCULAS UNIQUE incluso inactivas, límites código 30/nombre 150/descripción opcional 500, vacío/tipos/exceso rechazados. Sigla obligatoria trim/MAYÚSCULAS alfanumérica UNIQUE 2–10: límites 1/2/10/11, caracteres inválidos y duplicado rechazados; no recálculo al renombrar Carrera ni código manual como FK. |
| TEST-H2-025 | REQ-005/006/007; DES-003 | Ciclos concurrentes en distintas carreras/Capitanías comparten contador global anual único. Año por creación PostgreSQL America/Lima: probar límite donde UTC y Lima difieren sin cambiar reloj global del host, no fecha de inicio/browser. Reinicio por año, año/correlativo fijos, código directo denegado y sin MAX+1 cliente. Representaciones 001/015/999/1000; sin tope 999, requisito gapless o recuperación especial de huecos. |
| TEST-H2-026 | REQ-003/006/009; DES-003/005/006 | Sigla normalizada persistida no cambia automáticamente por renombrar Carrera; UI sugiere solo al inicio. Cambiar NAV→NVA advierte afectados: actualiza sufijo de códigos modificables, conserva año/correlativo; CERRADO/DESIERTO/ANULADO retienen código. Actor/antes/después auditados y updated_at afectados avanzan. Fallo inducido en un ciclo o auditoría revierte carrera y todos los códigos; formulario anterior entra en conflicto, no restaura sufijo viejo |
| TEST-H2-027 | REQ-002/004/007/009; DES-002/003/005 | Precargar solo materias ACTIVAS; añadir otras activas sin exigir pertenencia a Carrera. Sincronizar solo faltantes; UNIQUE(ciclo,materia), origen único HEREDADA/ADICIONAL, activo/motivo_inactivacion. Retiro manual conserva fila inactiva RETIRO_MANUAL, no duplicada/reactivada por sincronización; solo acción explícita permite reactivar. Cambio Carrera inactiva heredadas previas CAMBIO_CARRERA, conserva adicionales, agrega solo pares inexistentes y no reactiva ni reclasifica. Adicional que luego pertenece a Carrera sigue ADICIONAL. Terminales intactos; todo atómico/versionado/auditado; casos separados 032/033. |
| TEST-H2-028 | REQ-005/006/008/009; DES-003/004/005/006 | Solo Director: PROGRAMADO→EN_CURSO→CERRADO; PROGRAMADO/EN_CURSO→DESIERTO con catálogo/motivo; solo PROGRAMADO→ANULADO con motivo libre. Negar EN_CURSO→ANULADO, DESIERTO desde terminales y toda transición/reapertura no listada. Director/Coordinador editan PROGRAMADO/EN_CURSO en H2; terminales solo consulta. Sin cambio por fecha/cron/cascada. Matrículas/facturación como restricciones evolutivas no verificables en H2, sin falsos PASSED ni flags simulados. |
| TEST-H2-029 | REQ-002/003/004/007/010/014; DES-003/006 | Dos clientes leen mismo updated_at; primero guarda y avanza versión DB, segundo recibe conflicto y ninguna mutación/evento de éxito. UI indica recargar sin última escritura gana/merge/retry automático. Aplicar a materia, carrera, ciclo, estado y asociaciones vía versión padre; propagación/sigla también invalidan formularios previos. Intento de fijar updated_at desde payload rechazado; sin reservas de pantalla o locks pesimistas de edición |

### Casos añadidos por cierres R y precisiones posteriores

| ID | REQ / DES | Procedimiento futuro y resultado exigido |
|---|---|---|
| TEST-H2-030 | REQ-005/006/008/009/010; DES-003/004/005/006 | Ciclo nuevo sin guardar: Cancelar/Descartar no inserta, no elimina en DB ni genera evento de auditoría. Ciclo persistido en cualquier estado, incluso PROGRAMADO: DELETE directo/RPC denegado, sin pérdida de fila/relaciones. Registro erróneo se ANULA solo desde PROGRAMADO, Director y motivo; terminales nunca borrables. UI no llama eliminación al descarte de formulario |
| TEST-H2-031 | REQ-003/005/007/008/009/010; DES-002/003/004/005/006 | catalogo/catalogo_valor: código de catálogo único, pertenencia y unicidad de valor por catálogo. Semillas Modalidad CON_EXPERIENCIA/SIN_EXPERIENCIA y cinco motivos exactos de requirements. DESIERTO exige valor activo de MOTIVO_CICLO_DESIERTO; UUID de otro catálogo o inactivo denegado; OTRO sin detalle rechazado y con detalle aceptado. Inactivar valor después conserva referencia y lectura histórica, no lo ofrece para nuevas operaciones. ANULADO/inactivar Materia/Carrera requieren texto libre, no ese catálogo. Sin CRUD genérico de catálogos |
| TEST-H2-032 | REQ-002/003/004/005/007/014; DES-002/003 | Carrera sin ≥1 Materia ACTIVA no se guarda; inactivas no cuentan. Retirar asociación/inactivar última activa de cualquier Carrera falla con rollback y sin auditoría de éxito; añadir otra activa antes permite operación. Probar carreras múltiples y peticiones concurrentes que juntas dejarían cero activas. Ciclo nuevo sin ≥1 materia activa o con materia inactiva agregada manualmente se rechaza. Inactivación posterior no elimina relaciones históricas de Ciclo |
| TEST-H2-033 | REQ-004/007/009/014; DES-002/003/005 | Retirar heredada conserva UUID/fila activo=false y RETIRO_MANUAL, sincronizaciones repetidas no crean ni reactivan. Cambio Carrera marca HEREDADAS activas previas CAMBIO_CARRERA, preserva ADICIONALES y solo inserta nuevas faltantes. Par existente inactivo, incluso si vuelve a nueva Carrera, permanece inactivo; adicional existente no se reclasifica cuando Carrera la incorpora. Sin doble origen/segunda fila. Acción explícita autorizada sí reactiva con auditoría y optimistic concurrency. Fallo parcial revierte cambio de Carrera y todas las relaciones/versiones/eventos |
| TEST-H2-034 | REQ-001/008/010/014; DES-001/004/006/009 | Coordinador lee Carreras/Materias/geografía/Capitanías/catálogos necesarios con opciones activas para nuevas selecciones y referencias históricas inactivas legibles. No crea/edita/activa/inactiva maestras, carreras ni catálogos. /seguridad conserva consulta propia y /seguridad/usuarios solo directorio de lectura para ADMIN_SISTEMA activo; Director/Coordinador sin ese rol no acceden al directorio. Multirol añade solo capacidades explícitas; sin CRUD de usuarios/roles HU17/HU18 ni mapeo de roles técnicos |

### Ejecución técnica y seguridad del entorno

Reutilizar los comandos actuales `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:build-safety`, `npm run supabase:start`, `npm run supabase:reset`, `npm run test:local`, `npm run test:security`, `npm run test:expiry` y `npm run supabase:stop`, ampliando suites/inventario conforme al Spec aprobado y roles funcionales reales, sin borrar la evidencia técnica histórica H1. No se inventan comandos de H2 que todavía no existen. Documentar durante construcción los comandos finales reales y sus SHA; preservar las pruebas H1 y sus límites de JWT.

Fixtures solo locales, identidad .invalid, contraseña efímera/entrada humana oculta, secretos privilegiados en memoria fuera de VITE. No pruebas en paralelo sobre el mismo project_id con fixtures humanos. Cleanup por IDs exactos tras cada suite y verificación final; si falla, registrar y detener antes de aceptación. Mantener guard y mitigación H0; no administrar firewall desde scripts ni presentar 54322/TCP como probado independientemente.

## TEST-H2-018 — Recorrido humano funcional y de permisos

**REQ:** 002–010, 014, 016. **DES:** 001–006/008/009. **Responsable:** persona; Codex prepara y registra confirmación. NO EJECUTADO.

1. Registrar persona/fecha/entorno/commit candidato y decisiones humanas registradas y detalles residuales acordados. Seguir README de clon e instalación, iniciar local con guard, reset y verificaciones técnicas sin fixtures humanos simultáneos. Confirmar destino local y ausencia de datos reales.
2. Crear fixtures humanos mediante procedimiento documentado en construcción; contraseña elegida localmente con entrada oculta. Abrir UI e iniciar sesión como actor autorizado de la matriz, usando roles reales, sin asumir ADMIN=director ni OPERADOR=coordinador.
3. Como Director crear/editar materia y carrera con código/nombre normalizados, modalidad y sigla; comprobar unicidad, advertencia y motivo de inactivación, reactivación y referencias preservadas. Guardar selección de materias sin parcialidad. Cambiar sigla con advertencia y revisar ciclos afectados/históricos. Abrir dos formularios y comprobar conflicto de versión sin sobrescritura.
4. Como Director/Coordinador crear/editar PROGRAMADO/EN_CURSO con geografía obligatoria ya cargada y Capitanía activa, código generado, ≥1 materia activa y promoción opcional ≤150. Comprobar retiro manual conserva fila y que sincronización solo agrega faltantes sin reactivar/reclasificar; cambio Carrera conserva adicionales e inactiva heredadas previas. Verificar superposición Carrera+Capitanía+fechas inclusivas, correlativo anual, preservación de adicionales e inactivación sin pérdida histórica. Director realiza matriz cerrada manual: DESIERTO desde PROGRAMADO/EN_CURSO con catálogo activo y OTRO+detalle, ANULADO solo PROGRAMADO con texto libre. Coordinador no transiciona, terminales no editables/reabiertos; DESIERTO/ANULADO liberan rango y CERRADO lo conserva. Cancelar nuevo formulario no persiste/audita, ningún Ciclo guardado se elimina. No crear matrículas/facturas para simular H3+; sus restricciones quedan diferidas explícitamente.
5. Como Coordinador comprobar lectura referencial activa/histórica sin mantenimiento Materias/Carreras/catálogos. Como Admin Sistema comprobar ausencia de CRUD académico, directorio de seguridad solo lectura y consulta de auditoría de los tres roles; Director sin ADMIN_SISTEMA no obtiene directorio automáticamente. Con actor no habilitado confirmar denegación y ausencia de datos/acciones indebidas. Revisar evidencia técnica de solicitudes directas; la ausencia de botón no constituye prueba de RLS. Cambiar identidad y hacer logout/restauración sin datos anteriores.
6. En listado básico de auditoría filtrar por fecha/actor/entidad/acción; reconstruir quién cambió qué y cuándo, motivo sensible y antes/después sin secretos. Verificar que modificación ordinaria no exige motivo; navegador no permite fabricar/editar eventos. Sin reporting avanzado.
7. Eliminar fixtures humanos; ejecutar reset, test:local y seguridad según guía final; parar UI/stack y registrar resultados y working tree. Codex no convierte esta guía en evidencia ejecutada.

## TEST-H2-019 — Recorrido humano visual y accesibilidad

**REQ:** 010–013. **DES:** 006–007. **Responsable:** persona. NO EJECUTADO.

1. Registrar navegador/SO/viewport y candidato. Sin preferencia local, seleccionar Sistema y cambiar claro/oscuro en el SO: comprobar seguimiento. Probar las preferencias explícitas Claro, Oscuro y Alto contraste y su persistencia tras recarga.
2. En cada modo recorrer materias, carrera, selección de materias y ciclo: tabla, formulario, error de validación, confirmación y estados éxito/error/advertencia/información. Verificar legibilidad, bordes, foco, selección y deshabilitados; información con texto o significado accesible adicional al color.
3. Navegar solo con teclado incluyendo selector visual; verificar foco visible/no oculto y orden comprensible, campos con etiqueta/errores asociados. Revisar mediciones de contraste de TEST-H2-015 sobre los elementos realmente vistos.
4. Cuando el entorno lo permita activar alto contraste/forced-colors real del SO, manteniendo seleccionada cada paleta propia, y comprobar que el sistema prevalece. Verificar controles/foco/bordes/tablas; desactivar y comprobar restauración de preferencia. No competir con colores del sistema. Emulación técnica no sustituye esta prueba humana real.
5. Si el entorno no permite paso 4, registrar **NO VERIFICADO**, motivo y entorno; presentar limitación a decisión humana, sin declarar PASSED global ni aceptar riesgo automáticamente. Registrar defectos/capturas sin secretos y repetir tras correcciones.

## TEST-H2-020 — Gate arquitectónico humano de H2

**REQ:** 015. **DES:** 001–009. **Responsable:** persona. NO EJECUTADO.

Con inventario de roles reales/catálogos/tablas/constraints/policies/RPC/trigger, diffs y evidencia por actor, seguir alta simple, carrera+materias con propagación, cambio de sigla, rechazo directo, conflicto de versión, rollback y evento de auditoría. Revisar simplicidad de sincronización aditiva sin doble origen, protección de mínimos y límites evolutivos sin incorporar entidades H3+. La persona debe poder explicar:

- ¿El CRUD resultó sencillo de desarrollar y modificar?
- ¿RLS es comprensible y sus grants y funciones privilegiadas están acotados?
- ¿Las constraints están localizadas y la lógica en la capa correcta?
- ¿Se puede encontrar por qué una operación se permitió o rechazó sin perseguir demasiadas capas?
- ¿El código/configuración resulta menor que en una API CRUD propia razonable? Comparación cualitativa con responsabilidades concretas, sin construir esa API ni inventar métricas de ahorro.
- ¿Temas y accesibilidad se resolvieron sin complejidad innecesaria?

Resultado humano: conforme, corrección acotada o revisión de diseño. No equivale a GATE-A01 de H5 ni permite ampliar alcance. Si requiere backend/nueva tecnología o cambio de diseño, detener trabajo afectado y pedir decisión; CI verde no aprueba arquitectura.

## TEST-H2-021 — Gate 2 y trazabilidad de cierre

**REQ:** 016. **DES:** 009. NO EJECUTADO / BLOQUEADO.

Exigir confirmación humana explícita de candidato, TEST-H2-018/019/020, resultados técnicos, riesgos y autorización de integración. Solo después ejecutar TASK-H2-010: acceptance y PLAN, commit documental y merge trazable si autorizado, verificar main limpio y SHA. Sin aprobación: no acceptance, no merge, no H3.

## Registro previsto

Para cada TEST: ID, SHA, comando o recorrido, ejecutor técnico/persona, fecha/entorno, esperado/real, PASSED/FAILED/NO VERIFICADO, defectos y correcciones/repeticiones, riesgo residual y decisión humana si corresponde. Capturas y logs sin secretos. Ningún caso de este plan tiene resultado efectivo todavía.

**H2 SPEC: PENDING HUMAN APPROVAL**
**TECHNICAL TESTS: NOT RUN**
**HUMAN TESTS: NOT RUN**
**H2 IMPLEMENTATION: BLOCKED — NOT STARTED**
**ACCEPTANCE / MERGE TO MAIN: BLOCKED**
