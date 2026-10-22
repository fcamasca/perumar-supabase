# H2 — Base académica: test-plan

**Versión:** 0.1 · **Fecha:** 22/10/2026 (America/Lima)
**H2 SPEC: PENDING HUMAN APPROVAL** · **IMPLEMENTATION: BLOCKED**

Plan de pruebas futuro, no evidencia de pruebas ejecutadas. **Todos los TEST están NO EJECUTADOS**. No se levanta stack ni se ejecutan tareas de construcción en esta entrega. Contratos esperados en [requirements.md](requirements.md) y [design.md](design.md); tareas en [tasks.md](tasks.md).

## Preparación y oráculos

Después de Gate 1: entorno local desechable H0/H1, guard vigente, sin datos reales, JWT ordinario por actor de la matriz aprobada OQ-H2-001, sin registro público ni cuentas reales. Preparación/observación administrativa solo para fixtures y comprobación complementaria; nunca sustituye la solicitud cuya autorización se prueba. Roles de ensayo H1 A/B/O/M/N/F/I se pueden reutilizar, sin inventar equivalencia académica.

Cada prueba anota commit exacto, entorno, comando/petición sin secretos, datos sintéticos, resultado esperado/real, defecto, corrección y repetición. Verificar contenido/IDs/filas y ausencia de efectos, no solo HTTP 200. No confundir SELECT vacío por RLS con acceso permitido; no exponer información interna al usuario para facilitar el test.

Las OQ afectan los resultados concretos: no marcar una prueba PASSED hasta que tenga regla aprobada. Permisos y campos pendientes deben cerrarse antes de Gate 1 o diferirse expresamente; ningún comportamiento por defecto de plataforma resuelve una OQ.

## Pruebas técnicas

| ID | REQ / DES | Procedimiento futuro y resultado exigido |
|---|---|---|
| TEST-H2-001 | REQ-001/016; DES-001/009 | Verificar commit Spec aprobado, Gate 1, descendencia/base, working tree y diff de alcance; implementación nace del commit exacto y no toca H0/H1 históricos |
| TEST-H2-002 | REQ-001/007/014; DES-002/009 | Instalar desde lockfile, iniciar local con guard, reset desde cero, inspeccionar inventario exacto de objetos/grants/RLS/migraciones H1+H2; repetir reset y suite; ningún schema H3 ni infraestructura nueva |
| TEST-H2-003 | REQ-002/007; DES-002/003/006 | Crear, consultar, modificar e inactivar materia; descripción opcional, timestamp servidor; campos vacíos/tipos incorrectos/código duplicado rechazados; normalización y reactivación según OQ-005/006; mostrar errores sin perder formulario |
| TEST-H2-004 | REQ-003/004/007; DES-002/003 | Carrera con modalidad válida y materias; modificar selección, consultar e inactivar; código duplicado/modalidad inválida/referencia huérfana/relación duplicada rechazados por DB. Materia reutilizada entre carreras sin duplicarla; mínimo de selección y estados según decisiones |
| TEST-H2-005 | REQ-005/006/007; DES-002/003 | Ciclo mínimo aprobado: alta/modificación/consulta/estado, FK y fechas inválidas, carrera/materias no permitidas; precarga y cambio de carrera según OQ-004. Si se incluyen correlativo/promoción/ubicación/desierto, probarlos con sus contratos aprobados; no declarar probadas reglas con matrículas inexistentes |
| TEST-H2-006 | REQ-004/006/007; DES-003 | Enviar concurrentemente duplicados de código y asociación, fechas superpuestas según OQ-003 y correlativos si aplican. Solo resultados válidos, sin duplicado ni colisión. Forzar fallo intermedio al guardar carrera/ciclo+materias: rollback de entidad, relaciones y auditoría. Ediciones simultáneas según OQ-010 |
| TEST-H2-007 | REQ-006/007; DES-002/003 | Transiciones válidas/ilegales de estado, materia/carrera referenciada inactiva y modificaciones de asociaciones según OQ-006/008; no borrar referencias históricas ni propagar cambios al ciclo contra OQ-004. Verificar contra DB y API directa |
| TEST-H2-008 | REQ-008/014; DES-004/008 | Matriz completa por entidad/operación para ADMIN, OPERADOR, ambos, anónimo, JWT inválido/vencido, sin app_user, sin rol e inactivo. Verificar filas permitidas, denegación de escrituras y ningún efecto no autorizado; repetir tras revocar/inactivar con mismo JWT |
| TEST-H2-009 | REQ-007/008/010; DES-004/006/008 | Cambiar ID de fila, FK y actor en payload; añadir campos desconocidos/internos, metadatos ADMIN o manipular ruta/control deshabilitado/estado local. Acceso sigue dependiendo de DB; distinguir ID ajeno prohibido de inexistente sin fuga innecesaria |
| TEST-H2-010 | REQ-004/008; DES-003/004/008 | Escribir directamente tablas académicas y puente con JWT ordinario, llamar RPC sin permiso, esquema privado o función interna. Escritura simple solo si aprobada; ninguna vía evita regla compuesta, estado, permisos o auditoría. Inspeccionar owner/search_path/EXECUTE y composición OR; sin bypass por helper |
| TEST-H2-011 | REQ-009; DES-005 | Alta, edición, estado y cambios de relaciones: evento con actor auth.uid, instante DB, acción, entidad/ID y cambios correctos, motivo cuando se aprobó. Payload con actor/fecha falsos no suplanta identidad; forzar fallo de auditoría revierte negocio; rollback sin evento de éxito |
| TEST-H2-012 | REQ-008/009; DES-004/005 | Intentar leer auditoría sin permiso y crear/editar/eliminar/truncar eventos desde cliente, incluido ADMIN. Operaciones denegadas salvo lectura explícitamente aprobada; RPC interna no invocable. Logs/eventos sin credenciales, JWT ni información no necesaria |
| TEST-H2-013 | REQ-008/010/014; DES-006/008 | Regresión H1 Auth/RLS/sesión/rutas: logout, expiración/renovación, M→O y respuestas tardías durante consultas/guardado. Sin flash ni fuga de datos/caché de identidad anterior; fallo seguro y sin perder el control de acceso |
| TEST-H2-014 | REQ-011/013; DES-007 | Sin preferencia → Sistema; claro/oscuro del SO y cambio en vivo seguidos. Selección explícita de tres paletas propias, persistencia tras recarga; valor corrupto/storage bloqueado → fallback seguro sin bloquear UI. Logout no expone datos ni convierte preferencia en dato de Auth |
| TEST-H2-015 | REQ-011/012; DES-007 | Medir pares reales de texto/fondo por paleta y estado: texto normal ≥4.5:1, grande ≥3:1; controles/indicadores necesarios ≥3:1 cuando aplica WCAG 1.4.11. Registrar valores y criterio, revisar foco no oculto y legibilidad de deshabilitados sin inventar excepción normativa. No declarar AA completa solo por ratios |
| TEST-H2-016 | REQ-010/012; DES-006/007 | Pruebas UI de labels/nombres, encabezados de tabla, errores asociados, estado textual, selección y teclado/foco en listas/formularios/selector. Error/éxito/advertencia/información/foco/seleccionado/deshabilitado en cada paleta; sin depender únicamente del color ni HTML inyectado |
| TEST-H2-017 | REQ-014/016; DES-008/009 | CI positiva completa; ensayo negativo temporal produce acceso indebido real detectado por suite, se retira alteración y rama y se repite positiva. Cleanup tanto ante éxito como fallo; revisión de logs/build sin secretos; sin deploy/acceptance/merge automático |

### Ejecución técnica y seguridad del entorno

Reutilizar los comandos actuales `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:build-safety`, `npm run supabase:start`, `npm run supabase:reset`, `npm run test:local`, `npm run test:security`, `npm run test:expiry` y `npm run supabase:stop`, ampliando suites/inventario conforme al Spec aprobado. No se inventan comandos de H2 que todavía no existen. Documentar durante construcción los comandos finales reales y sus SHA; preservar las pruebas H1 y sus límites de JWT.

Fixtures solo locales, identidad .invalid, contraseña efímera/entrada humana oculta, secretos privilegiados en memoria fuera de VITE. No pruebas en paralelo sobre el mismo project_id con fixtures humanos. Cleanup por IDs exactos tras cada suite y verificación final; si falla, registrar y detener antes de aceptación. Mantener guard y mitigación H0; no administrar firewall desde scripts ni presentar 54322/TCP como probado independientemente.

## TEST-H2-018 — Recorrido humano funcional y de permisos

**REQ:** 002–010, 014, 016. **DES:** 001–006/008/009. **Responsable:** persona; Codex prepara y registra confirmación. NO EJECUTADO.

1. Registrar persona/fecha/entorno/commit candidato y decisiones OQ aplicadas. Seguir README de clon e instalación, iniciar local con guard, reset y verificaciones técnicas sin fixtures humanos simultáneos. Confirmar destino local y ausencia de datos reales.
2. Crear fixtures humanos mediante procedimiento documentado en construcción; contraseña elegida localmente con entrada oculta. Abrir UI e iniciar sesión como actor autorizado de la matriz, sin asumir ADMIN=director.
3. Dar de alta materia, comprobar consulta/modificación/estado, duplicado y error de campo; crear carrera con modalidad y materias y consultar relaciones. Provocar error de selección: ningún guardado parcial. Verificar etiquetas de estado y mensajes entendibles.
4. Crear/editar ciclo mínimo según contrato aprobado; comprobar fechas, carrera, precarga/selección y estado. Ejercitar correlativo/superposición/desierto solo si incluidos, contra casos aprobados. No crear matrículas ni catálogos diferidos para simular funcionalidades H3.
5. Con actor sin permiso, confirmar denegación y ausencia de datos/acciones indebidas. Revisar evidencia técnica de solicitudes directas; la ausencia de botón no constituye prueba de RLS. Cambiar identidad y hacer logout/restauración sin datos anteriores.
6. Consultar evidencia de auditoría mediante acceso aprobado: persona puede reconstruir quién cambió qué y cuándo; si no se aprueba UI de auditoría, usar recorrido técnico documentado sin añadir plataforma general.
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

Con inventario de tablas/constraints/policies/RPC/trigger, diffs y evidencia por actor, seguir un alta simple, guardado de carrera+materias, rechazo directo, rollback y evento de auditoría. La persona debe poder explicar:

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
