# H0 — Test Plan

**Spec:** H0-bootstrap · **Versión:** 0.1 · **Fecha:** 2026-10-21
**H0 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**

## 1. Propósito y estado

Definir cómo se demostrará el bootstrap construido, sin ejecutar ahora esas pruebas ni implementar fixtures, scripts o aplicación. Todos los TEST-H0 están **NO EJECUTADOS**. La revisión documental de consistencia y el chequeo de secretos previo a commits no equivalen a ejecutar la suite futura ni a aceptar H0.

Los resultados deben distinguir prueba técnica automatizable, comprobación técnica manual y prueba humana. Ningún pipeline puede completar por sí mismo la aceptación.

## 2. Entorno y evidencia

- Rama futura `feature/h0-bootstrap`, creada desde el commit explícitamente aprobado del Spec.
- Clon o directorio limpio desechable para instalación/reconstrucción; no usar datos reales ni un proyecto remoto Supabase.
- Node/npm/CLI fijados según README/lockfile y runtime compatible; CI con Docker del runner.
- Valores públicos locales y canarios de prueba ficticios; ninguna credencial privilegiada real en pruebas o artefactos.
- Evidencia por test: ID, commit construido, entorno/versiones, fecha, ejecutor, pasos, resultado esperado/obtenido y defectos. No publicar claves ni dumps completos de configuración.
- Capturas solo si ayudan a verificar UI; logs/comandos resumidos para pruebas técnicas. Prueba humana con identidad/confirmación explícita del revisor.

## 3. Pruebas técnicas automatizables

| ID | Preparación y ejecución futura | Resultado esperado | Evidencia |
|---|---|---|---|
| TEST-H0-002 | Comparar runtime local/CI con referencias y lockfile; instalar sin CLI global implícita | Versiones compatibles registradas y una única resolución reproducible | Versiones resumidas, referencias y hash del lockfile |
| TEST-H0-003 | Clon/directorio limpio; instalar únicamente desde manifiesto/lockfile sin archivos personales | Instalación exitosa y lockfile sin cambios inesperados | Salida resumida y estado Git posterior |
| TEST-H0-004 | Ejecutar lint, chequeo TypeScript y build sobre el commit candidato | Todas las verificaciones pasan; salida estática generada sin login/dominio | Códigos de salida y ejecución CI |
| TEST-H0-005 | Montar pantalla neutra y módulo de configuración en prueba aislada, con valores de prueba válidos | Pantalla identificable y cliente único configurado; sin funcionalidad H1 | Resultado de pruebas y alcance de los casos |
| TEST-H0-006 | Iniciar stack local; comprobar salud con salida filtrada y endpoint de diagnóstico local desde el cliente/integración | Servicios necesarios disponibles y conectividad válida; sin crear tablas ni autenticación funcional | Estado reducido y petición con resultado, sin headers/keys |
| TEST-H0-007 | En instancia local desechable, verificar destino y ausencia de link remoto, reconstruir/resetear y repetir comprobación | Entorno recreado; historial de aplicación vacío; sin tablas/RPC/policies propias del negocio | Log filtrado de reset e inventario de objetos de aplicación |
| TEST-H0-008 | Probar variables ausentes, URL inválida/remota en perfil H0 y clave privilegiada canario; luego configuración válida | Errores claros y seguros; no fallback remoto; no imprimir valores; caso válido funciona | Resultados positivos/negativos del módulo de configuración |
| TEST-H0-009 | Verificar reglas ignore con nombres ficticios, revisar archivos versionados y buscar patrones/canarios en bundle y logs | .env/.env.local y claves sensibles ignorados; .env.example permitido y sin valores; cero secretos/canarios privilegiados en bundle/logs | Lista de comprobaciones con valores ocultos; revisión manual complementaria |

TEST-H0-009 incluye revisión técnica manual de diffs y permisos CI porque un detector por patrones no demuestra ausencia absoluta de secretos. No se introducen credenciales reales para comprobar su filtrado. Los datos públicos locales no deben confundirse con una filtración privilegiada, pero tampoco se copian innecesariamente en evidencia.

La prueba de reset no debe continuar si el destino es remoto o no identificable como local desechable. Se prueba ese rechazo mediante configuración simulada/controlada, no intentando resetear un proyecto real.

## 4. Pruebas técnicas manuales

### TEST-H0-001 — Historia y gates

**Pasos:** comprobar main base, commit de Spec aprobado y ancestro de la rama de implementación; comprobar ausencia de merge previo; revisar evidencias de Gate 1 y, al cerrar, Gate 2. Identificar qué commit se aprueba y cuáles son cambios documentales posteriores.

**Esperado:** implementación desciende del Spec aprobado y respeta autorización. En la ejecución actual solo deben existir main documental y rama Spec; no se utiliza este chequeo preliminar para marcar completa la prueba del hito construido.

**Evidencia:** grafo/log de commits y decisiones humanas enlazadas, sin inventar una aprobación.

### TEST-H0-010 — Remoto privado y clonado

**Pasos:** owner confirmado, campo de privacidad en GitHub y URL origin sin tokens; inspeccionar contenido publicado y clonar con identidad autorizada en un directorio limpio.

**Esperado:** remoto privado, nombre correcto y acceso legítimo; sin deployment y sin repositorio ajeno reemplazado. Si el destino no puede comprobarse, no publicar.

**Evidencia:** URL sin credenciales, atributo de visibilidad y resultado de clon. No se ejecuta durante generación del Spec.

### TEST-H0-011 — CI real y detección de fallo

**Pasos:** revisar workflow para asegurar herramientas fijadas, permisos mínimos, ausencia de deployment y secretos remotos. Ejecutar en GitHub sobre el commit candidato. En una revisión/ejecución temporal controlada, demostrar que un caso de configuración deliberadamente incorrecto produce fallo de verificación; retirar el defecto y verificar el candidato final.

**Esperado:** CI pasa cuando corresponde y detecta el fallo; no hay `continue-on-error` indiscriminado ni pasos que declaren éxito siempre. La integración usa solamente Supabase local del runner. Ninguna ejecución hace acceptance o merge.

**Evidencia:** runs/commits de ensayo y del candidato final, y revisión de permisos/logs sin claves.

### TEST-H0-013 — Auditoría de alcance técnico

**Pasos:** inventario del repositorio, objetos propios de DB y recursos remotos creados durante H0; revisar cambios contra el Spec y configuración de CI.

**Esperado:** un paquete, pantalla técnica, configuración/migraciones sin dominio, sin roles/RLS funcionales, tablas dummy, frontend de negocio, PDF o buckets de expediente. Remoto GitHub privado permitido solo durante construcción; proyecto Supabase alojado, hosting y deployment ausentes.

**Evidencia:** diff/inventario resumidos y lista explícita de recursos. No se prueba esta ausencia buscando solo nombres de archivos: revisar también contenido/configuración.

## 5. Pruebas humanas obligatorias

### TEST-H0-012 — Reproducción desde README

**Persona:** revisor humano designado; puede ser el mantenedor, pero debe realizar/confirmar el recorrido.

**Pasos:** partir del clon limpio, seguir README sin instrucciones privadas, preparar variables desde ejemplo, iniciar plataforma y frontend, ejecutar verificaciones, parar y reconstruir únicamente el entorno local.

**Esperado:** instrucciones suficientes, errores/prerrequisitos claros y ejecución reproducible. Si se requiere una intervención no documentada, registrar defecto y corregir guía antes de aceptar.

**Evidencia humana:** fecha, commit, entorno, pasos realizados, observaciones y confirmación del revisor. Un log generado por Codex no cuenta como esa confirmación.

### TEST-H0-014 — Pantalla, conexión y límites comprensibles

**Pasos:** abrir la aplicación, verificar pantalla neutra y conectividad local; provocar configuración faltante de forma controlada; comprobar que el mensaje no expone valores; confirmar que no hay login ni funcionalidad de negocio y que se entiende la diferencia local/remoto.

**Esperado:** arranque comprensible, diagnóstico útil y ausencia de promesas funcionales de H1. Registrar cualquier conexión remota accidental como defecto crítico.

**Evidencia humana:** confirmación del recorrido, resultado y capturas sin credenciales si aportan valor.

### TEST-H0-015 — Aceptación final y autorización de merge

**Prerequisitos:** pruebas técnicas satisfactorias, TEST-H0-012/014 confirmadas por persona y defectos críticos cerrados.

**Pasos:** presentar commit candidato, evidencia y limitaciones; obtener decisión humana explícita sobre H0 y su integración. Solo si es aprobatoria, generar acceptance con autor/fecha/referencias y realizar merge autorizado de implementación a main. No iniciar H1.

**Esperado:** una decisión independiente de Gate 1; aceptación posterior a resultados humanos. Si faltan aprobación o evidencia, mantener hito pendiente sin acceptance ni merge.

**Evidencia humana:** decisión, commit aceptado y referencia de acceptance/merge posterior. Una casilla marcada por Codex, un pipeline verde o ausencia de comentarios no son evidencia suficiente.

## 6. Cobertura de criterios críticos y fallos

| Criterio de requirements | Pruebas que lo demuestran |
|---|---|
| CA-H0-01 Reproducción limpia | TEST-H0-002, TEST-H0-003, TEST-H0-004, TEST-H0-006, TEST-H0-012 |
| CA-H0-02 Pantalla y error seguro | TEST-H0-005, TEST-H0-008, TEST-H0-014 |
| CA-H0-03 Reconstrucción local sin dominio | TEST-H0-007, TEST-H0-013 |
| CA-H0-04 Privacidad y secretos | TEST-H0-009, TEST-H0-010, TEST-H0-011 |
| CA-H0-05 CI útil sin deployment | TEST-H0-004, TEST-H0-006, TEST-H0-007, TEST-H0-008, TEST-H0-011 |
| CA-H0-06 Aceptación humana independiente | TEST-H0-001, TEST-H0-012, TEST-H0-014, TEST-H0-015 |

Un fallo se documenta con problema, causa, evidencia, clasificación, opciones y recomendación. Corregir dentro del Spec y repetir comprobaciones afectadas. Si exige diseño/alcance diferente, detener el trabajo afectado y esperar decisión humana; no agregar otra plataforma o adelantar H1 para hacer pasar H0.

## 7. Matriz de trazabilidad

Los IDs se refieren a las definiciones de [requirements](requirements.md), [design](design.md) y [tasks](tasks.md). Todas las tareas implican pruebas y todo diseño con implementación tiene tarea. Las pruebas de aceptación futura no se consideran ejecutadas durante revisión documental.

| Requirement | Design | Task | Test |
|---|---|---|---|
| REQ-H0-001 | DES-H0-001, DES-H0-007 | TASK-H0-001, TASK-H0-005, TASK-H0-009 | TEST-H0-001, TEST-H0-010, TEST-H0-015 |
| REQ-H0-002 | DES-H0-007 | TASK-H0-005 | TEST-H0-010 |
| REQ-H0-003 | DES-H0-002 | TASK-H0-002 | TEST-H0-004, TEST-H0-005, TEST-H0-014 |
| REQ-H0-004 | DES-H0-003, DES-H0-008 | TASK-H0-001, TASK-H0-002, TASK-H0-006 | TEST-H0-002, TEST-H0-003, TEST-H0-004, TEST-H0-011 |
| REQ-H0-005 | DES-H0-004 | TASK-H0-003 | TEST-H0-006, TEST-H0-007 |
| REQ-H0-006 | DES-H0-005 | TASK-H0-004 | TEST-H0-006, TEST-H0-008 |
| REQ-H0-007 | DES-H0-005, DES-H0-007, DES-H0-010 | TASK-H0-004, TASK-H0-005, TASK-H0-006, TASK-H0-008 | TEST-H0-008, TEST-H0-009, TEST-H0-010, TEST-H0-011 |
| REQ-H0-008 | DES-H0-006 | TASK-H0-003 | TEST-H0-007, TEST-H0-013 |
| REQ-H0-009 | DES-H0-003, DES-H0-008 | TASK-H0-002, TASK-H0-004, TASK-H0-006, TASK-H0-008 | TEST-H0-004, TEST-H0-005, TEST-H0-008, TEST-H0-011 |
| REQ-H0-010 | DES-H0-008 | TASK-H0-006 | TEST-H0-011 |
| REQ-H0-011 | DES-H0-009 | TASK-H0-007, TASK-H0-008 | TEST-H0-012, TEST-H0-014 |
| REQ-H0-012 | DES-H0-002, DES-H0-004, DES-H0-010 | TASK-H0-001, TASK-H0-002, TASK-H0-003, TASK-H0-007, TASK-H0-008 | TEST-H0-001, TEST-H0-013 |
| REQ-H0-013 | DES-H0-001, DES-H0-009 | TASK-H0-001, TASK-H0-007, TASK-H0-008, TASK-H0-009 | TEST-H0-001, TEST-H0-012, TEST-H0-014, TEST-H0-015 |

## 8. Gate pendiente

No existe todavía aprobación del Spec, rama de implementación, ejecución técnica de H0, prueba humana ni acceptance. Las revisiones documentales realizadas al preparar el commit verifican este Spec, no el comportamiento de una aplicación inexistente.

**H0 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**
