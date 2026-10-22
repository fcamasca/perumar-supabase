# H2 — Base académica: test-plan

**Versión:** 0.2 · **Fecha:** 22/10/2026 (America/Lima)
**H2 SPEC: PENDING HUMAN APPROVAL** · **IMPLEMENTATION: BLOCKED**

Plan de pruebas futuro, no evidencia de pruebas ejecutadas. **Todos los TEST están NO EJECUTADOS**. No se levanta stack ni se ejecutan tareas de construcción en esta entrega. Contratos esperados en [requirements.md](requirements.md) y [design.md](design.md); tareas en [tasks.md](tasks.md).

## Preparación y oráculos

Después de Gate 1: entorno local desechable H0/H1, guard vigente, sin datos reales, JWT ordinario por actor de la matriz de roles reales aprobada en OQ-H2-001, sin registro público ni cuentas reales. Preparación/observación administrativa solo para fixtures y comprobación complementaria; nunca sustituye la solicitud cuya autorización se prueba. Crear actores con DIRECTOR_ACADEMICO, COORDINADOR_ACADEMICO, ADMIN_SISTEMA y combinaciones, más sin fila/sin rol/inactivo. ADMIN/OPERADOR son solo pruebas técnicas históricas; no convertir sus asignaciones en roles reales por cuenta propia. Conservar propiedades de la regresión H1 sin reescribir su evidencia.

Cada prueba anota commit exacto, entorno, comando/petición sin secretos, datos sintéticos, resultado esperado/real, defecto, corrección y repetición. Verificar contenido/IDs/filas y ausencia de efectos, no solo HTTP 200. No confundir SELECT vacío por RLS con acceso permitido; no exponer información interna al usuario para facilitar el test.

OQ-H2-001 a 010 están resueltas por decisiones humanas registradas en requirements. No se consideran pendientes ni se solicita aprobarlas otra vez. Los detalles residuales R-H2-001 a 006 se resuelven/delimitan expresamente para los casos afectados antes de construir; no suplirlos con defaults de plataforma. El Spec completo todavía espera Gate 1 y ninguna prueba se declara ejecutada.

## Pruebas técnicas

| ID | REQ / DES | Procedimiento futuro y resultado exigido |
|---|---|---|
| TEST-H2-001 | REQ-001/016; DES-001/009 | Verificar Spec exacto, Gate 1 y registro de diez decisiones humanas, cierre/delimitación de detalles residuales, descendencia/base y working tree; solo cuatro documentos en esta revisión. Sin Gate 1 no ejecutar tareas. |
| TEST-H2-002 | REQ-001/007/014; DES-002/009 | Instalación futura desde lockfile, guard, reset y exacto inventario H1 evolucionado+H2: roles reales, UUID, constraints, catálogos, RPC, RLS y auditoría. Repetir desde cero sin cargar catálogos manualmente; ninguna entidad H3 ni cambio de evidencia histórica. |
| TEST-H2-003 | REQ-002/007; DES-002/003/006 | Materia: crear, consultar, modificar, inactivar con advertencia/motivo y reactivar. Código/nombre obligatorios trim/MAYÚSCULAS, límites 30/150, UNIQUE incluso inactivos, descripción opcional ≤500; versión/tiempo DB. Error conserva formulario y no deja escritura parcial. |
| TEST-H2-004 | REQ-003/004/007; DES-002/003 | Carrera: datos normalizados, nombre/código UNIQUE, descripción opcional, sigla persistida y modalidad de catálogo; guardar materias reutilizables sin duplicados/huérfanos. Inactivar con motivo conserva relaciones e impide crear nuevos ciclos; reactivar. Casos sigla/propagación específicos en 026/027. |
| TEST-H2-005 | REQ-005/006/007; DES-002/003 | Ciclo completo: UUID, código/año/correlativo DB, fechas, carrera, materias, promoción, geografía/Capitanía y estado_codigo PROGRAMADO inicial. Rechazar active como sustituto de estado, FK por código/nombre y carrera inactiva al alta. Catálogos, normalización, estados y concurrencia en casos específicos. |
| TEST-H2-006 | REQ-004/006/007; DES-003 | Dos solicitudes simultáneas: duplicados y superposición misma Carrera+Capitanía con fechas inclusivas deben rechazarse; distinta Capitanía/carrera permiten coincidencia. Probar extremo compartido, rangos sin cruce y cambio de fecha/carrera/Capitanía. Forzar fallo intermedio de carrera/ciclo+materias y propagaciones: ningún cambio parcial ni evento de éxito. Tratamiento de terminales según R-H2-001, sin excepción inventada. |
| TEST-H2-007 | REQ-006/007; DES-002/003 | Maestras active BOOLEAN con reactivación, sin eliminación física. Inactivar Materia/Carrera exige motivo y conserva referencias; materia deja de precargarse sin retirarla de ciclos; carrera no seleccionable para nuevo ciclo. Ciclo no usa boolean. Estados inválidos y cascadas destructivas rechazados. |
| TEST-H2-008 | REQ-008/014; DES-004/008 | Matriz por entidad/operación de Director, Coordinador, Admin Sistema y combinaciones: solo Director mantiene Materias/Carreras, Director/Coordinador operaciones ordinarias Ciclo, solo Director estados, los tres leen auditoría; Admin Sistema no CRUD académico implícito. Anónimos, JWT inválido/vencido, sin fila/rol/inactivos y roles técnicos sin permiso. Revocar con mismo JWT y verificar efectos/filas reales. |
| TEST-H2-009 | REQ-007/008/010; DES-004/006/008 | Manipular UUID de fila/FK, actor, rol en metadata, campos internos/versiones/código generado/estado; añadir desconocidos o alterar rutas/controles. DB mantiene permisos e invariantes, errores seguros y sin efectos. expected_updated_at no permite suplantar actor ni reemplazar updated_at servidor. |
| TEST-H2-010 | REQ-004/008; DES-003/004/008 | Intentar escrituras directas de entidades/puentes/versiones/códigos internos y llamadas RPC/función privada con JWT ordinario. Comandos obligatorios no pueden eludirse; no crear evento arbitrario. Inspeccionar owner/search_path/EXECUTE, grants/RLS y composición OR; negar a roles técnicos y sin privilegio funcional. |
| TEST-H2-011 | REQ-009; DES-005 | Auditoría relacional: UUID evento/registro, entidad, acción, auth.uid(), timestamp DB, motivo nullable, old_values/new_values JSONB de campos pertinentes. CREATE/UPDATE, asociación, estado, inactivar/reactivar/anular y propagaciones con actor correcto. Ordinario sin motivo permitido; DESIERTO/ANULADO/inactivar Materia/Carrera sin motivo rechazados. Payload con actor/fecha falso no suplanta; fallo auditoría revierte negocio, rollback sin éxito. |
| TEST-H2-012 | REQ-008/009; DES-004/005 | Los tres roles funcionales activos consultan/listan auditoría filtrando fecha/actor/entidad/acción; no habilitados y roles técnicos sin permiso. Ni siquiera Admin Sistema puede insertar/editar/eliminar/truncar eventos ni invocar trigger interno. Logs/JSONB sin contraseña/JWT/secretos/payload indiscriminado; sin plataforma analítica nueva. |
| TEST-H2-013 | REQ-008/010/014; DES-006/008 | Regresión de propiedades Auth/RLS/sesión H1 tras evolución de roles: login/logout, persistencia/renovación/expiración, revocación/multirol y cambio multirol→Coordinador con respuestas tardías. Sin fuga de datos/formulario/caché del actor previo; no exigir ADMIN/OPERADOR como catálogo de producto ni cambiar aceptación histórica. |
| TEST-H2-014 | REQ-011/013; DES-007 | Sin preferencia → Sistema; claro/oscuro del SO y cambio en vivo seguidos. Selección explícita de tres paletas propias, persistencia tras recarga; valor corrupto/storage bloqueado → fallback seguro sin bloquear UI. Logout no expone datos ni convierte preferencia en dato de Auth |
| TEST-H2-015 | REQ-011/012; DES-007 | Medir pares reales de texto/fondo por paleta y estado: texto normal ≥4.5:1, grande ≥3:1; controles/indicadores necesarios ≥3:1 cuando aplica WCAG 1.4.11. Registrar valores y criterio, revisar foco no oculto y legibilidad de deshabilitados sin inventar excepción normativa. No declarar AA completa solo por ratios |
| TEST-H2-016 | REQ-010/012; DES-006/007 | Pruebas UI de labels/nombres, encabezados de tabla, errores asociados, estado textual, selección y teclado/foco en listas/formularios/selector. Error/éxito/advertencia/información/foco/seleccionado/deshabilitado en cada paleta; sin depender únicamente del color ni HTML inyectado |
| TEST-H2-017 | REQ-014/016; DES-008/009 | CI positiva del candidato revisado, migración/reset/catálogos/roles reales y suites repetidos; negativo temporal amplía acceso real no permitido de Coordinador/Admin Sistema y la suite lo detecta, se retira alteración/rama. Cleanup ante éxito/fallo, sin secretos ni deploy/acceptance/merge automático. |

### Casos específicos añadidos por decisiones humanas

| ID | REQ / DES | Procedimiento futuro y resultado exigido |
|---|---|---|
| TEST-H2-022 | REQ-001/008/014; DES-001/004/009 | Migrar futuramente catálogo restringido H1 a tres roles reales, semillas/fixtures/consultas/policies coherentes; sin mapeo implícito de asignaciones a usuarios reales. ADMIN/OPERADOR aislados no obtienen permisos funcionales. Multirol unión de capacidades activas; inactivar un rol conserva capacidades de otro válido. Sin escritura de roles desde navegador ni CRUD académico por Admin Sistema; comparar evidencia H0/H1 intacta |
| TEST-H2-023 | REQ-005/007/014; DES-002/006/009 | Reset carga maestras autorizadas con fuente/versión controladas: Departamento/Provincia/Distrito/Capitanía, modalidades y motivos necesarios. FK UUID y jerarquía Provincia→Departamento/Distrito→Provincia; payload geográfico incoherente denegado por DB. Catálogos disponibles sin carga manual, sin datos inventados ni mantenimiento UI de todo HU20 |
| TEST-H2-024 | REQ-002/003/007; DES-002/003 | UUID DB y todas las FK UUID: editar código/nombre no rompe referencias. Código/nombre trim+MAYÚSCULAS persistidos y comparados en DB; espacios/vacíos, longitudes límite y excedidas 30/150/500, tipos inválidos, nombre duplicado y código duplicado incluso inactivo. Requests simultáneas normalizadas no crean duplicados; descripción opcional. No exigir unicidad/longitud de sigla hasta decisión R-H2-004 |
| TEST-H2-025 | REQ-005/006/007; DES-003 | Crear ciclos concurrentes de carreras/Capitanías distintas en mismo año: correlativo global anual único, no por carrera. Cambio de año reinicia contador según zona acordada, año por creación no fecha académica. Año/correlativo fijos pese a edición; código directo denegado, sin MAX+1 cliente. Ejemplo 2026-015-NAV; relleno y huecos según contrato R-H2-004, sin prueba de viaje de fecha global del host |
| TEST-H2-026 | REQ-003/006/009; DES-003/005/006 | Sigla normalizada persistida no cambia automáticamente por renombrar Carrera; UI sugiere solo al inicio. Cambiar NAV→NVA advierte afectados: actualiza sufijo de códigos modificables, conserva año/correlativo; CERRADO/DESIERTO/ANULADO retienen código. Actor/antes/después auditados y updated_at afectados avanzan. Fallo inducido en un ciclo o auditoría revierte carrera y todos los códigos; formulario anterior entra en conflicto, no restaura sufijo viejo |
| TEST-H2-027 | REQ-002/004/007/009; DES-002/003/005 | Carrera precarga solo materias ACTIVAS; Director/Coordinador añaden otras. Retirar/agregar asociación propaga heredadas solo a modificables, preserva adicionales y terminales. Inactivar materia NO la retira de existentes, con advertencia/motivo; retiro manual en editable permitido. Dobles orígenes, cambio de carrera y retiro explícito según R-H2-003; sin resolverlos por default. Fallo parcial revierte agregado/ciclos/auditoría; cambios automáticos avanzan versión |
| TEST-H2-028 | REQ-005/006/008/009; DES-003/004/005/006 | PROGRAMADO inicial; Director ejecuta PROGRAMADO→EN_CURSO y EN_CURSO→CERRADO. Hacia DESIERTO/ANULADO solo orígenes aprobados en R-H2-001 y motivo obligatorio; Coordinador/Admin Sistema no transicionan. Sin scheduler/cambio por fecha/cascada a hijos/reapertura no aprobada. ANULADO terminal. Restricciones matrícula/facturación se inspeccionan como dependencia evolutiva documentada: NO verificables en H2 sin entidades futuras, no marcarlas PASSED ni simular con flags del navegador |
| TEST-H2-029 | REQ-002/003/004/007/010/014; DES-003/006 | Dos clientes leen mismo updated_at; primero guarda y avanza versión DB, segundo recibe conflicto y ninguna mutación/evento de éxito. UI indica recargar sin última escritura gana/merge/retry automático. Aplicar a materia, carrera, ciclo, estado y asociaciones vía versión padre; propagación/sigla también invalidan formularios previos. Intento de fijar updated_at desde payload rechazado; sin reservas de pantalla o locks pesimistas de edición |

### Ejecución técnica y seguridad del entorno

Reutilizar los comandos actuales `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:build-safety`, `npm run supabase:start`, `npm run supabase:reset`, `npm run test:local`, `npm run test:security`, `npm run test:expiry` y `npm run supabase:stop`, ampliando suites/inventario conforme al Spec aprobado y roles funcionales reales, sin borrar la evidencia técnica histórica H1. No se inventan comandos de H2 que todavía no existen. Documentar durante construcción los comandos finales reales y sus SHA; preservar las pruebas H1 y sus límites de JWT.

Fixtures solo locales, identidad .invalid, contraseña efímera/entrada humana oculta, secretos privilegiados en memoria fuera de VITE. No pruebas en paralelo sobre el mismo project_id con fixtures humanos. Cleanup por IDs exactos tras cada suite y verificación final; si falla, registrar y detener antes de aceptación. Mantener guard y mitigación H0; no administrar firewall desde scripts ni presentar 54322/TCP como probado independientemente.

## TEST-H2-018 — Recorrido humano funcional y de permisos

**REQ:** 002–010, 014, 016. **DES:** 001–006/008/009. **Responsable:** persona; Codex prepara y registra confirmación. NO EJECUTADO.

1. Registrar persona/fecha/entorno/commit candidato y decisiones humanas registradas y detalles residuales acordados. Seguir README de clon e instalación, iniciar local con guard, reset y verificaciones técnicas sin fixtures humanos simultáneos. Confirmar destino local y ausencia de datos reales.
2. Crear fixtures humanos mediante procedimiento documentado en construcción; contraseña elegida localmente con entrada oculta. Abrir UI e iniciar sesión como actor autorizado de la matriz, usando roles reales, sin asumir ADMIN=director ni OPERADOR=coordinador.
3. Como Director crear/editar materia y carrera con código/nombre normalizados, modalidad y sigla; comprobar unicidad, advertencia y motivo de inactivación, reactivación y referencias preservadas. Guardar selección de materias sin parcialidad. Cambiar sigla con advertencia y revisar ciclos afectados/históricos. Abrir dos formularios y comprobar conflicto de versión sin sobrescritura.
4. Como Director/Coordinador crear/editar ciclo con catálogos ya disponibles y geografía jerárquica, código generado no editable, materias heredadas/adicionales, promoción y estado. Verificar superposición Carrera+Capitanía+fechas inclusivas, correlativo anual, preservación de adicionales e inactivación sin pérdida histórica. Director realiza transiciones manuales y DESIERTO/ANULADO con motivo; Coordinador no. No crear matrículas/facturas para simular H3+; sus restricciones quedan diferidas explícitamente.
5. Como Coordinador comprobar ausencia de mantenimiento Materias/Carreras y como Admin Sistema ausencia de CRUD académico, manteniendo consulta de auditoría de los tres roles. Con actor no habilitado confirmar denegación y ausencia de datos/acciones indebidas. Revisar evidencia técnica de solicitudes directas; la ausencia de botón no constituye prueba de RLS. Cambiar identidad y hacer logout/restauración sin datos anteriores.
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

Con inventario de roles reales/catálogos/tablas/constraints/policies/RPC/trigger, diffs y evidencia por actor, seguir alta simple, carrera+materias con propagación, cambio de sigla, rechazo directo, conflicto de versión, rollback y evento de auditoría. Revisar costo de propagación y límites evolutivos sin incorporar entidades H3+. La persona debe poder explicar:

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
