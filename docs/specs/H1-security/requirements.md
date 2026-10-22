# H1 — Seguridad base: requirements

**Versión:** 0.1 · **Fecha:** 21/10/2026 · **Naturaleza:** propuesta documental.

**H1 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**

## 1. Propósito, base y autorización

Validar si Supabase Auth + PostgreSQL/RLS permite mantener autenticación y autorización claras, seguras y sencillas para una institución. Este Spec define construcción futura; no implementa seguridad ni declara superado el Gate del hito.

Base comprobada: `main` local/remoto en `93399eefe118488d0e2f497ba29a3075098a32bd`, working tree limpio y H0 integrado/aceptado. Rama documental creada desde esa base: `feature/h1-security-spec`. No crear `feature/h1-security` antes de aprobación humana explícita del commit de estos cuatro documentos. No acceptance ni merge durante esta preparación.

Fuentes revisadas, por precedencia:

1. [PLAN_MVP.md](../../PLAN_MVP.md), leído completo: alcance H1, roles mínimos, límites, seguridad, criterios Well-Architected y dos gates.
2. [Historias_de_Usuario.md](../../requirements/Historias_de_Usuario.md): objetivos de seguridad, alcance de usuarios/auditoría, HU17 y HU18 completas. Respaldan mínimo privilegio, varios roles por usuario, inactivación y trazabilidad. Keycloak/MinIO y nombres funcionales históricos no sustituyen al PLAN.
3. [Aceptación H0](../H0-bootstrap/acceptance.md), base React/TS/SDK, configuración local, scripts y CI aceptados. Se reutilizan; el guard/firewall y el riesgo residual de 54322 no se reabren.
4. [Informe de alternativas](../../architecture/Informe_Alternativas_Arquitectura_PERUMAR.md), solo como contexto de ubicación de reglas en RLS y de simplicidad; no autoriza backend adicional ni importar código histórico.

El PLAN sigue registrando H1 NO INICIADO: preparar su Spec no equivale a iniciar construcción. Se crean únicamente estos cuatro Markdown, sin cambiar PLAN ni H0.

## 2. Recorte verificable y decisiones propuestas

ADMIN y OPERADOR son roles de validación, no equivalentes definitivos a director/coordinador ni una matriz para H2–H9. La propuesta usa login email/contraseña con cuentas sintéticas preaprovisionadas localmente; sin alta pública ni pantallas de administración de identidades. Se usa la propia información mínima de seguridad como recurso protegido: lectura propia para ambos roles y directorio de seguridad de solo lectura para ADMIN. No se crean tablas de negocio ni recursos ficticios ajenos a seguridad para demostrar RLS.

Estas son decisiones de diseño para revisión en Gate 1, no requisitos funcionales adicionales atribuidos a las HU. El CRUD completo de usuarios/roles, invitaciones, recuperación por correo, notificaciones, permisos configurables y MFA de las historias amplias no se declara completado en H1. Su ubicación futura requiere planificación humana, sin asignarlos automáticamente a otro hito.

## 3. Requisitos

| ID | Requisito verificable de construcción futura |
|---|---|
| REQ-H1-001 | Conservar H0 y su historia; construir solo después de Gate 1, en rama de implementación descendiente del commit Spec aprobado; sin merge/acceptance hasta Gate 2 |
| REQ-H1-002 | Login email/contraseña mediante Supabase Auth local para cuentas de ensayo existentes; éxito establece sesión; fallo no establece sesión y muestra mensaje genérico sin confirmar existencia de cuenta. Alta pública no disponible desde UI ni habilitada en Auth local |
| REQ-H1-003 | Restaurar sesión tras recargar usando el SDK, confirmar usuario con Auth antes de mostrar datos y manejar carga, renovación, expiración y fallo sin mostrar datos protegidos transitoriamente ni mantener identidad anterior |
| REQ-H1-004 | Logout explícito de la sesión actual: limpiar estado/datos de aplicación, volver a login y solicitar cierre al SDK. Documentar fallo remoto y la vigencia residual del access token ya emitido; no prometer revocación inmediata de JWT copiado |
| REQ-H1-005 | Representar usuario de aplicación mínimo vinculado de forma única a auth.users; distinguir identidad autenticada de habilitación de aplicación. Usuario Auth sin fila, inactivo o sin rol activo no accede a recursos de aplicación |
| REQ-H1-006 | Representar ADMIN/OPERADOR y relación muchos-a-muchos única; habilitación efectiva exige usuario activo, rol activo y asignación existente. Retirar asignación/inactivar usuario o rol revoca sus permisos en nuevas solicitudes tras commit sin depender de renovar JWT |
| REQ-H1-007 | Obtener identidad confiable de Auth/JWT validado por la plataforma y auth.uid() en PostgreSQL; nunca autorizar por ID, rol, permisos, user_metadata, localStorage o cuerpo enviados por React |
| REQ-H1-008 | Aplicar grants mínimos y RLS a cada tabla de seguridad expuesta. Ambos roles leen sus datos de seguridad; solo ADMIN activo lee el directorio de seguridad completo. Ningún cliente, incluido ADMIN, puede escribir usuarios/roles/asignaciones durante H1. Sin rol, sin usuario de aplicación o anónimo: denegación por defecto |
| REQ-H1-009 | Policies pequeñas, específicas por operación y comprobables; helper mínimo no recursivo para rol vigente, si lo requiere el diseño, con privilegios acotados y sin función privilegiada expuesta por Data API. Probar ausencia de rutas alternativas por RPC, esquema, vista o grants |
| REQ-H1-010 | React gestiona sesión y rutas /login, /seguridad y /seguridad/usuarios, sin motor de permisos paralelo. Ruta manual o botón oculto no evita ni sustituye la autorización de DB; ante denegación no mostrar datos previos |
| REQ-H1-011 | Aprovisionar fixtures sintéticos exclusivamente en stack local verificado y desechable mediante proceso administrativo de prueba separado del navegador. Sin autoasignación de ADMIN, alta administrativa en UI ni credenciales privilegiadas en pruebas de acceso ordinario |
| REQ-H1-012 | Validar entradas y tratar errores sin imprimir contraseña/token/SQL/filas denegadas. Renderizado React de texto, sin HTML arbitrario. No concatenar SQL con entradas; predicados y consultas estáticas/parametrizadas. Analizar CSRF según transporte real del diseño |
| REQ-H1-013 | Solo URL y clave pública en frontend. Contraseñas, access/refresh tokens, service_role/secret y SQL fuera de Git, bundles, logs, capturas y artefactos de CI. Aprovisionamiento local obtiene privilegios solo en proceso técnico, nunca como variable VITE |
| REQ-H1-014 | Trazabilidad suficiente del ensayo de seguridad: commit, actor sintético/ejecutor, operación, resultado, cambios de asignación/estado y restauración de fixtures; aprovechar diagnóstico Auth disponible sin volcar secretos. No presentar evidencia de prueba como auditoría productiva completa |
| REQ-H1-015 | Migraciones reales versionadas para seguridad, reconstrucción reproducible y CI local con pruebas RLS por identidades reales de ensayo; preservar herramientas y controles de H0 adaptando solo sus supuestos de esquema vacío a inventario H1 explícito |
| REQ-H1-016 | Ejecutar pruebas positivas/negativas, revisión técnica de policies y pruebas humanas independientes. Evaluar claridad/mantenimiento y detener expansión si la solución básica requiere reglas enredadas. Registrar limitaciones y decisión humana sin autoaprobar H1 |

## 4. Responsabilidades y criterios de aceptación

| Componente | Autoridad / obligación | No debe asumir |
|---|---|---|
| Supabase Auth | Verificar credenciales, emitir/renovar sesión, identificar usuario Auth | Decidir permisos funcionales por metadata editable |
| PostgreSQL/grants/RLS | Decidir filas/operaciones usando auth.uid() y tablas vigentes | Confiar en rol/ID del cuerpo o autorización de React |
| React + SDK | Formularios, estado de sesión, navegación y mensajes; pedir datos permitidos | Conceder acceso real, escribir roles o manejar claves administrativas |
| Proceso local de fixtures | Preparar/restaurar identidades/estados de ensayo con privilegio explícito | Convertirse en API administrativa, modelo de producción o prueba de RLS con bypass |

CA-H1-01: login válido/inválido, restauración, expiración y logout reproducibles, sin fuga de estado.

CA-H1-02: con clave pública y JWT de cada actor, Data API permite exactamente la matriz de design; la manipulación del navegador no amplía resultados. Anónimo, sin rol y estados inactivos quedan cubiertos.

CA-H1-03: ninguna escritura directa de seguridad autorizada al navegador; no recursión ni bypass mediante función/vista; cambios de rol/estado afectan la siguiente solicitud con el mismo JWT.

CA-H1-04: clon/reset/CI reproducen inventario de seguridad conocido y fixtures sintéticos; sin objetos H2–H9, recursos remotos nuevos ni secretos publicados.

CA-H1-05: una persona puede explicar login → identidad → fila → policy → resultado y añadir/revisar un caso de autorización sin editar un motor paralelo. Revisar cada policy, helper y permiso, no solo contar pruebas verdes.

CA-H1-06: pruebas humanas de sesión/rutas y revisión de mantenibilidad confirmadas por persona; aprobación explícita del candidato y autorización de integración antes de acceptance/merge.

## 5. Exclusiones y límites

Sin Materias, Carreras, Ciclos, Alumnos, Matrícula, Pagos, Expedientes, PDF, Facturación ni reportes. El directorio técnico de identidades no es un reporte funcional. Sin API propia, funciones Edge, proveedores adicionales, Redux, tenants, servicios permanentes nuevos ni infraestructura productiva. No se introduce auditoría general de negocio, panel de administración completo, recuperación/notificaciones por email, MFA ni política institucional definitiva de contraseñas/sesiones.

H1 sigue siendo local y sin datos reales. La aceptación H0 se conserva como antecedente; sus pruebas de esquema vacío deberán evolucionar explícitamente durante construcción, no desactivarse para ocultar objetos nuevos. No reconfigurar automáticamente firewall, Docker, WSL ni daemon.

## 6. Open questions

**Ninguna bloqueante para preparar este Spec.** Las decisiones propuestas (email/contraseña local, fixtures, lecturas mínimas, persistencia SDK y límites de logout) se revisan al aprobarlo. No se necesita definir permisos funcionales futuros ni volver a preguntar por ADMIN/OPERADOR. Si la revisión no acepta esos límites, se modifica el Spec antes de construir; no se agrega infraestructura para evitarlos.

Trazabilidad completa en [test-plan.md](test-plan.md#7-matriz-completa-req--des--task--test). Todas las tareas y pruebas de aplicación están NO INICIADAS/NO EJECUTADAS.

**H1 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**
