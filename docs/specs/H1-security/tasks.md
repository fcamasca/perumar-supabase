# H1 — Seguridad base: tasks

**Versión:** 0.1 · **Fecha:** 21/10/2026
**H1 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**

Todas las tareas están **NO INICIADAS**. Se documentan componentes futuros, no se crean en esta ejecución. Solo la rama documental y estos cuatro Markdown están autorizados. La [matriz completa](test-plan.md#7-matriz-completa-req--des--task--test) une requisitos, diseño, tareas y pruebas.

Orden: Gate 1 → 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008 → Gate 2 → 009. Tareas 002–007 pueden incorporar sus pruebas focalizadas desde el primer cambio; 006 completa la matriz real de ataques, no pospone seguridad hasta el final.

## TASK-H1-001 — Abrir construcción autorizada

- **Requisitos:** REQ-H1-001, REQ-H1-015, REQ-H1-016.
- **Diseños:** DES-H1-001, DES-H1-010.
- **Dependencias:** aprobación humana explícita del commit de los cuatro documentos; H0 aceptado.
- **Trabajo futuro:** comprobar rama/árbol/ref aprobado; crear `feature/h1-security` desde ese commit exacto. Verificar versiones/entorno H0 sin instalar/reconfigurar globalmente. Registrar Gate 1 y base de construcción en el lugar autorizado al abrirla; no simular aceptación.
- **Resultado:** origen y alcance verificables; herramientas existentes reutilizadas.
- **Pruebas:** TEST-H1-001, TEST-H1-002.
- **Finalización:** descendencia comprobada, sin cambios no autorizados ni recursos remotos nuevos.
- **Estado:** NO INICIADA.

## TASK-H1-002 — Migración de seguridad, grants y RLS

- **Requisitos:** REQ-H1-005, REQ-H1-006, REQ-H1-007, REQ-H1-008, REQ-H1-009, REQ-H1-013, REQ-H1-015.
- **Diseños:** DES-H1-003, DES-H1-004, DES-H1-005, DES-H1-009.
- **Dependencias:** TASK-H1-001.
- **Trabajo futuro:** crear migración real de app_users, app_roles y app_user_roles, constraints y dos roles iniciales; helper privado mínimo, grants y policies según matriz. Revisar SQL antes de aplicar localmente. Ningún usuario Auth en migración, endpoint privilegiado público, tabla dummy o entidad de negocio. Actualizar inventario técnico H0 al conjunto H1 explícito sin borrar guard ni degradar pruebas.
- **Componentes futuros:** SQL versionado bajo supabase/migrations, inventario/pruebas de estructura y permisos; no DDL durante preparación del Spec.
- **Resultado:** estructura reproducible, tablas protegidas por defecto, sin escrituras del navegador.
- **Pruebas:** TEST-H1-002, TEST-H1-003, TEST-H1-007, TEST-H1-008, TEST-H1-010, TEST-H1-011, TEST-H1-012, TEST-H1-013.
- **Finalización:** revisión de grants/helper/exposición y reset satisfactorios; sin recursión ni SQL de H2.
- **Estado:** NO INICIADA.

## TASK-H1-003 — Auth local y fixtures controlados

- **Requisitos:** REQ-H1-002, REQ-H1-005, REQ-H1-006, REQ-H1-007, REQ-H1-011, REQ-H1-013, REQ-H1-014, REQ-H1-015.
- **Diseños:** DES-H1-002, DES-H1-003, DES-H1-008, DES-H1-009.
- **Dependencias:** TASK-H1-002.
- **Trabajo futuro:** configurar solo Auth local email/contraseña y sin signup público. Crear proceso de fixtures con protección de destino y credencial administrativa solo en memoria; identidades y estados definidos en design; limpieza/restauración por IDs exactos y trazabilidad sin secretos. Probar rechazo de destino remoto antes de cualquier mutación. No gestión de usuarios del producto, proveedores adicionales ni correo remoto.
- **Componentes futuros:** configuración local y script técnico de fixtures/integración dentro del mismo paquete; entradas privadas de ensayo fuera de Git/VITE/logs.
- **Resultado:** actores reproducibles listos para login real/API y uso humano local.
- **Pruebas:** TEST-H1-002, TEST-H1-004, TEST-H1-008, TEST-H1-011, TEST-H1-012, TEST-H1-016.
- **Finalización:** cuentas sintéticas correctas, signup directo denegado y preparación distinguida de accesos RLS ordinarios.
- **Estado:** NO INICIADA.

## TASK-H1-004 — Sesión, login, renovación y logout

- **Requisitos:** REQ-H1-002, REQ-H1-003, REQ-H1-004, REQ-H1-007, REQ-H1-010, REQ-H1-012, REQ-H1-013.
- **Diseños:** DES-H1-002, DES-H1-006, DES-H1-008.
- **Dependencias:** TASK-H1-003.
- **Trabajo futuro:** adaptar cliente único H0, Context/hooks y formulario mínimo; restauración confirmada con Auth, consulta bajo sesión, renovación y estados de acceso; logout de sesión actual, limpieza y errores seguros. Evitar callbacks reentrantes y respuestas tardías que repueblen datos después de logout. Documentar JWT residual; no implementar blacklist ni cookies/backend alternativo.
- **Componentes futuros:** cliente/configuración, proveedor de sesión, formulario y pruebas React/SDK focalizadas.
- **Resultado:** identidad y datos no se mezclan entre sesiones; sesión ausente/expirada falla de forma segura.
- **Pruebas:** TEST-H1-004, TEST-H1-005, TEST-H1-006, TEST-H1-009, TEST-H1-014, TEST-H1-015.
- **Finalización:** casos positivos y errores pasan; ningún token/contraseña en estado mostrado, logs o bundle estático.
- **Estado:** NO INICIADA.

## TASK-H1-005 — Rutas protegidas y lecturas técnicas

- **Requisitos:** REQ-H1-003, REQ-H1-005, REQ-H1-008, REQ-H1-010, REQ-H1-012.
- **Diseños:** DES-H1-006, DES-H1-007, DES-H1-008.
- **Dependencias:** TASK-H1-004.
- **Trabajo futuro:** rutas login/seguridad/directorio de solo lectura, estado sin acceso y logout; enrutador SPA sencillo con versión compatible fijada y reflejada en lockfile. Rol leído desde datos protegidos solo guía UX. Sin motor RBAC paralelo, edición administrativa, menú de negocio ni enlaces de alta/recuperación no implementados.
- **Resultado:** ADMIN ve directorio permitido; OPERADOR solo recurso propio; sin sesión o acceso no se muestran datos previos ni bucles de navegación.
- **Pruebas:** TEST-H1-007, TEST-H1-011, TEST-H1-014, TEST-H1-015, TEST-H1-018.
- **Finalización:** navegación manual/recarga y errores verificables; RLS sigue decidiendo al evadir UI.
- **Estado:** NO INICIADA.

## TASK-H1-006 — Matriz real de autorización y ataques

- **Requisitos:** REQ-H1-005, REQ-H1-006, REQ-H1-007, REQ-H1-008, REQ-H1-009, REQ-H1-011, REQ-H1-012, REQ-H1-013, REQ-H1-014, REQ-H1-015.
- **Diseños:** DES-H1-004, DES-H1-005, DES-H1-008, DES-H1-009.
- **Dependencias:** TASK-H1-005; extiende pruebas empezadas en 002–005.
- **Trabajo futuro:** integración con logins reales y clientes aislados por actor, clave pública/JWT ordinario, peticiones directas Data API y snapshots administrativos separados. Probar ID/rol/metadata manipulados, tablas y operaciones, roles combinados, sin rol/fila, estados inactivos y revocación con el mismo JWT. Revisar aislamiento entre policies, RPC/esquema y helper. No introducir E2E completo ni sustituir RLS por pruebas de botones.
- **Resultado:** positivos/negativos y ausencia de cambios no autorizados demostrados contra PostgreSQL real.
- **Pruebas:** TEST-H1-003, TEST-H1-007, TEST-H1-008, TEST-H1-009, TEST-H1-010, TEST-H1-011, TEST-H1-012, TEST-H1-013, TEST-H1-015, TEST-H1-016.
- **Finalización:** todos los casos críticos tienen evidencia; no service_role en peticiones que pretenden probar autorización.
- **Estado:** NO INICIADA.

## TASK-H1-007 — CI y guía reproducible

- **Requisitos:** REQ-H1-001, REQ-H1-011, REQ-H1-013, REQ-H1-014, REQ-H1-015.
- **Diseños:** DES-H1-001, DES-H1-008, DES-H1-009.
- **Dependencias:** TASK-H1-006.
- **Trabajo futuro:** extender workflow H0 con fixtures/Auth/RLS, reset y repetición, secretos seguros y cleanup ante fallo; fijar cualquier dependencia nueva mínima. Verificar CI positiva y un ensayo negativo de autorización detectado por la suite, retirando solo la alteración temporal. Documentar README, destino local, entrada privada de contraseña humana, límites de logout, diagnóstico y regresión H0. No cambiar la evidencia histórica H0 ni recrear la rama H0 negativa ya eliminada.
- **Resultado:** clon limpio opera H1 con comandos documentados; CI reproduce seguridad sin datos reales ni proyectos remotos.
- **Pruebas:** TEST-H1-001, TEST-H1-002, TEST-H1-015, TEST-H1-016, TEST-H1-017, TEST-H1-018.
- **Finalización:** CI verde del candidato, fallo controlado relevante detectado y logs revisados sin secretos; sin deploy/acceptance/merge automático.
- **Estado:** NO INICIADA.

## TASK-H1-008 — Evidencia técnica y revisión humana de seguridad/mantenibilidad

- **Requisitos:** REQ-H1-001, REQ-H1-009, REQ-H1-014, REQ-H1-015, REQ-H1-016.
- **Diseños:** DES-H1-005, DES-H1-008, DES-H1-009, DES-H1-010.
- **Dependencias:** TASK-H1-007.
- **Trabajo futuro:** ejecutar suite técnica final, recopilar inventario/policies/helper/grants, comandos, commit, resultados y defectos. Preparar recorrido humano y registrar solo resultados confirmados por persona. Presentar evaluación de simplicidad Auth/RLS y riesgos para decisión, no autoaprobar conveniencia.
- **Resultado:** candidato y evidencia listos; hallazgos corregidos dentro del Spec o detenidos ante cambio de diseño/alcance.
- **Pruebas:** TEST-H1-001 a TEST-H1-019; especialmente TEST-H1-018 y TEST-H1-019 humanas.
- **Finalización:** pruebas técnicas satisfactorias y confirmación humana trazable de los recorridos; si faltan, mantener pendiente. No crear acceptance todavía.
- **Estado:** NO INICIADA.

## TASK-H1-009 — Cierre posterior a Gate 2

- **Requisitos:** REQ-H1-001, REQ-H1-016.
- **Diseños:** DES-H1-010.
- **Dependencias:** TASK-H1-008 y aprobación humana final explícita del candidato y su integración.
- **Trabajo futuro:** solo después del Gate 2 generar acceptance con decisiones/evidencias/limitaciones, actualizar estado del PLAN e integrar implementación a main si está autorizado. No integrar la rama Spec por separado ni empezar H2.
- **Resultado:** H1 aceptado de manera independiente de Gate 1 y publicado con trazabilidad.
- **Pruebas:** TEST-H1-001, TEST-H1-020.
- **Finalización:** acceptance posterior a decisión humana, candidato sin cambios técnicos no revisados y refs verificadas.
- **Estado:** NO INICIADA / BLOQUEADA POR GATE 2.

## Registro de hallazgos y detención

Cada tarea de construcción futura registra commit, comandos, resultado, defectos/correcciones y pruebas repetidas. Cambios de diseño/alcance, tecnología principal, exposición remota o complejidad excesiva detienen el trabajo afectado para decisión humana. Las correcciones para cumplir el mismo Spec no conceden autoridad para aceptar el hito. No instalar/reconfigurar el host sin autorización específica.

**H1 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**
