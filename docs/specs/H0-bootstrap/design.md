# H0 — Design

**Spec:** H0-bootstrap · **Versión:** 0.1 · **Fecha:** 2026-10-21
**H0 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**

Este documento describe construcción futura. No contiene código de aplicación, DDL, workflow ejecutable ni comandos ejecutados de bootstrap técnico. La base Git documental ya preparada es un antecedente autorizado separado del resultado de H0.

## DES-H0-001 — Git y dos gates

**Satisface:** REQ-H0-001, REQ-H0-013.

Base documental en main. Spec en `feature/h0-bootstrap-spec`, con sus cuatro archivos y commit identificable. Después de Gate 1, la rama `feature/h0-bootstrap` se crea desde ese commit exacto del Spec, nunca directamente desde main. Si el Spec cambia materialmente después de aprobado, se detiene el trabajo afectado y se solicita revisión humana del cambio; no se presume aprobación del nuevo HEAD.

Una aprobación debe identificar persona, fecha, commit/revisión, alcance y condiciones, en evidencia accesible. No se escribe una aceptación ficticia para obtener ese registro. Las tareas comienzan pendientes y no se marcan aprobadas por Codex.

En implementación se construye y prueba. Después se ejecutan pruebas humanas. Gate 2 es aprobación humana explícita de resultado y commit; únicamente entonces aparece `docs/specs/H0-bootstrap/acceptance.md`, que referencia evidencia técnica/humana y autorización. Su incorporación documental posterior no debe ocultar cambios de implementación no revisados.

Después de Gate 2 se integra la rama de implementación a main; la rama de Spec no se integra por separado ni antes. Se conserva trazabilidad de descendencia y commit aprobado. Igual convención en H1 y demás hitos: rama Spec desde main, implementación desde el Spec aprobado, aceptación y merge final. El PLAN mantiene orden/estado; cualquier actualización durante construcción se hace expresamente, sin declarar aprobados hitos futuros.

## DES-H0-002 — Un frontend y estructura pequeña

**Satisface:** REQ-H0-003, REQ-H0-012.

Un solo paquete npm en la raíz, React + TypeScript estricto y Vite. Pantalla neutra que identifica el proyecto y su estado técnico; sin menús funcionales, login, rutas protegidas ni datos del dominio. El estado de conexión es una comprobación explícita de diagnóstico local, no una función de negocio ni una llamada recurrente automática.

Estructura prevista, no creada en esta ejecución:

| Ruta futura | Responsabilidad |
|---|---|
| `package.json`, lockfile npm y archivo de versión Node | Scripts, dependencias y reproducción |
| `index.html`, configuraciones Vite/TypeScript/lint | Arranque y verificaciones |
| `src/main.tsx`, `src/App.tsx`, estilos mínimos | Montaje y pantalla neutra |
| `src/lib/env.ts` | Lectura/validación de configuración pública |
| `src/lib/supabase.ts` | Un cliente SDK, sin wrappers por entidad |
| `tests/` | Configuración, montaje y prueba técnica local |
| `supabase/config.toml` | Configuración CLI local versionada |
| `supabase/migrations/README.md` | Convención de migraciones; sin SQL ficticio |
| `README.md`, `.env.example`, `.gitignore` | Operación, variables y exclusión de secretos |
| `.github/workflows/ci.yml` | Verificación sin deployment |
| `docs/` | PLAN, fuentes y Specs; estructura existente conservada |

No se generan carpetas vacías por cada futuro dominio. Los módulos funcionales aparecerán en su hito, sin capas de dominio/aplicación/infraestructura impuestas a este bootstrap. No Redux, SSR, microfrontends, múltiples paquetes ni sistema de diseño.

## DES-H0-003 — Herramientas y versiones reproducibles

**Satisface:** REQ-H0-004, REQ-H0-009.

Durante construcción se seleccionará una versión Node LTS soportada por Vite/CLI, se registrará la versión npm correspondiente y se fijarán dependencias y CLI en el único lockfile. CI y entorno limpio utilizarán esa referencia; no depender de un CLI global de versión desconocida ni de resolver `latest` en cada ejecución.

La inicialización técnica se hace dentro del repositorio existente sin sobrescribir docs, README documental o .gitignore. Cualquier generador que quiera reemplazarlos debe usarse de forma controlada, incorporando solo la estructura técnica necesaria. No se inicializa otro Git.

Se usan lint y TypeScript del stack base. Las pruebas acotadas pueden usar Vitest y utilidades de montaje React, al compartir toolchain; se agregan solo al construir la prueba de configuración/pantalla. No se agrega un framework E2E completo en H0 ni se fija una versión numérica sin verificar compatibilidad.

El README documentará qué pasos son instalación inicial y cuáles son ejecución diaria. Descargar imágenes/dependencias es un prerrequisito de acceso a red, no prueba de que exista un proyecto remoto.

## DES-H0-004 — Supabase local y ciclo de vida

**Satisface:** REQ-H0-005, REQ-H0-012.

Supabase CLI como dependencia de desarrollo, configuración local versionada y runtime compatible con API Docker en Windows. Docker corresponde a desarrollo local; no introduce Kubernetes, un clúster productivo ni un servidor permanente nuevo. No instalar ni reconfigurar el sistema sin necesidad y permisos adecuados.

La construcción documentará inicio, consulta de estado filtrada, parada y reset local. Los endpoints de PostgreSQL, API y consola se usarán solo localmente; restringir exposición al equipo de desarrollo. No publicar el stack a la LAN/Internet como alojamiento del producto.

H0 no crea proyecto Supabase alojado, no hace login/link remoto y no requiere tokens remotos. La pila local puede incluir Auth y Storage internos, pero no se crean cuentas funcionales, roles de aplicación, buckets de expedientes ni políticas de negocio.

La CLI puede emitir valores sensibles al mostrar estado. La verificación debe resumir servicios/endpoints necesarios sin volcar credenciales administrativas a logs compartidos. El diagnóstico de servicio local no imprime el estado completo por comodidad.

La documentación oficial requiere CLI y runtime compatible para el flujo local; las alternativas de runtime se evalúan solo si el entorno lo exige, sin cambiar silenciosamente el diseño aprobado. [Supabase: desarrollo local](https://supabase.com/docs/guides/local-development), [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

## DES-H0-005 — Configuración pública y cliente base

**Satisface:** REQ-H0-006, REQ-H0-007.

Un módulo lee `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Si la pila local seleccionada solo entrega anon legacy, se documenta su uso como clave pública equivalente en esa variable, sin mezclarla con service_role. El SDK se crea una vez a partir de configuración validada.

`.env.example` contiene nombres y placeholders, nunca valores reales, secretos, IDs personales ni endpoints de producción. `.env.local` contiene únicamente la configuración de la ejecución local. El perfil de H0 admite endpoints de loopback; una URL remota requiere configuración explícita de un hito posterior, no una conmutación automática si falla localhost.

Una variable ausente, una URL inválida o una clave claramente privilegiada provoca error de configuración seguro. El mensaje indica el nombre del campo, no su valor. El control estático y las pruebas de canarios complementan la validación; no se pretende identificar cualquier secreto arbitrario solo por su formato.

La comprobación de conectividad del test técnico consulta un endpoint de diagnóstico/Data API local sin datos de aplicación y valida la respuesta prevista para la versión elegida. No crea una tabla healthcheck ni obtiene privilegios administrativos para que el test pase. Si el endpoint cambia, se documenta una alternativa igualmente acotada y sin dominio.

El navegador solo recibe la clave pública. Las claves secret/service_role omiten controles RLS y no pertenecen al bundle. [Supabase: API keys](https://supabase.com/docs/guides/getting-started/api-keys). La exposición de variables VITE se documenta de forma explícita; no se confunde configuración pública con secreto.

## DES-H0-006 — Migraciones sin modelo prematuro

**Satisface:** REQ-H0-008.

Se versionan configuración y una guía breve de migraciones bajo `supabase/migrations/`. Las futuras modificaciones reales tendrán orden/versiones de CLI y revisión; no se editará una migración aplicada para disfrazar un cambio posterior. No se crea una migración vacía, una tabla dummy ni un modelo completo durante H0.

La prueba de reconstrucción utiliza una base local desechable con historial de aplicación vacío. Debe completar la recreación de la plataforma sin tablas propias del negocio. Esto valida la ruta local que usarán migraciones futuras, sin afirmar que ya se probó un esquema funcional.

Antes de reset se verifica destino local y ausencia de vínculo remoto. El procedimiento destructivo está limitado al proyecto local desechable; no se admiten credenciales o URL remotas en esa comprobación. Backup/recuperación de producción se especificará en H9, no se simula mediante este reset.

## DES-H0-007 — GitHub privado y credenciales mínimas

**Satisface:** REQ-H0-002, REQ-H0-007.

Después de Gate 1 y de confirmar OQ-H0-002, crear `owner/perumar-supabase` privado y comprobar el campo de visibilidad mediante API/CLI o UI. Si existe otro repositorio con ese nombre, inspeccionar y detener la creación hasta confirmar destino; no sobrescribirlo ni apropiarse de él.

Configurar origin con SSH o HTTPS mediante autenticación segura del entorno, nunca token embebido en URL ni guardado en archivos. No se inventa owner a partir del nombre/email Git. Publicar solamente la base, Spec y construcción autorizados en un remoto ya comprobado privado. Un push a la rama de implementación no autoriza merge.

No se modifica globalmente la identidad Git ni se exigen credenciales más amplias que las del repositorio. No se abre un remoto público temporal ni se introduce deployment. La creación remota no se realiza en la ejecución que prepara este Spec.

## DES-H0-008 — CI mínima y pruebas técnicas

**Satisface:** REQ-H0-004, REQ-H0-009, REQ-H0-010.

Un workflow de validación en PR y pushes a ramas de trabajo. Un job de frontend ejecuta instalación de lockfile, lint, tipos, pruebas acotadas y build. Un job de integración local utiliza CLI fijada y Docker del runner para iniciar la pila, comprobar conectividad y reset local. Puede hacerse secuencialmente en un solo job si reduce complejidad; deben quedar identificadas ambas comprobaciones.

La CI no se conecta a proyectos Supabase remotos ni requiere PAT de aplicación, credenciales SQL alojadas o deployment tokens. Utiliza credenciales públicas locales efímeras solo para la integración. No se vuelcan salidas completas que incluyan claves administrativas. El token de GitHub del job se limita a lectura del contenido; no se añade `pull_request_target` para ejecutar código no confiable con privilegios.

Se fijan versiones/revisiones de acciones y herramientas; se registran de forma mantenible, sin autoactualizaciones no revisadas. El coste de minutos privados e imágenes es un límite operativo a verificar, no un motivo para añadir runners propios.

No se marca éxito ocultando fallos o usando pasos que siempre pasan. Un ensayo controlado del test de configuración debe detectar una entrada inválida. Se conserva evidencia resumida del commit y comandos/resultados, sin secretos. Ninguna CI hace merge ni genera acceptance automáticamente.

## DES-H0-009 — README y verificación humana

**Satisface:** REQ-H0-011, REQ-H0-013.

El README inicial documental se amplía durante construcción, preservando fuentes y gates. Debe guiar a una persona en un clon limpio por prerrequisitos, instalación, creación del archivo local a partir del ejemplo, inicio de Supabase/frontend, diagnóstico, pruebas, build, parada y reconstrucción.

La persona revisora verifica pantalla, conectividad, error seguro, privacidad del remoto, ausencia de dominio y comprensión del procedimiento. Su resultado identifica commit, entorno, fecha, defectos y decisión. Una captura aislada o «build OK» no sustituye ese recorrido.

La futura acceptance referencia la evidencia y aprobación final; no se crea en Spec ni al terminar tests técnicos. Si cambia código después de pruebas humanas, repetir las comprobaciones afectadas y confirmar aceptación del resultado revisado.

## DES-H0-010 — Seguridad proporcional y límites

**Satisface:** REQ-H0-007, REQ-H0-012.

| Riesgo | Control H0 | Impacto de desarrollo |
|---|---|---|
| Publicar configuración sensible | .gitignore y ejemplo sin valores; inspección de diff y secretos | Revisión corta antes de commits |
| Clave privilegiada en navegador | Lista explícita de variables públicas; validación y prueba con canarios | Un módulo de configuración y tests focalizados |
| Credenciales en logs | Filtrar estado CLI y no imprimir env ni tokens | Diagnóstico resumido, sin stack de observabilidad adicional |
| Dependencias no reproducibles | Versiones registradas, lockfile e instalación limpia | Un único gestor y verificación CI |
| Confundir local y remoto | Perfil H0 local; sin link ni proyecto remoto; verificación de destino antes de reset | Menos configuraciones y recursos que mantener |
| Exponer código por error | Remoto privado comprobado antes de push | Una comprobación administrativa |
| Aceptar automáticamente | Dos decisiones humanas y evidencia de commits | Estados explícitos; sin bots de aceptación/merge |

La configuración inicial .gitignore se conserva y se amplía si aparecen archivos generados concretos. Debe ignorar .env y variantes sensibles, claves privadas, credenciales, tokens, logs, dependencias, builds y temporales; permitir .env.example. No confiar solo en el nombre del archivo: un secreto dentro de un Markdown exige revisión igualmente.

OWASP Secure SDLC se aplica mediante requisitos explícitos, secure build, gestión de secretos y verificación. [OWASP SAMM](https://owaspsamm.org/model/). No se añaden WAF, SIEM, Vault independiente, RLS funcional, auditoría financiera ni controles de sesión de H1 a este hito.

## OPEN QUESTIONS y límites de decisión

OQ-H0-001 y OQ-H0-002 se mantienen únicamente en [requirements.md](requirements.md#8-open-questions) para no divergir. El dueño remoto se resuelve antes de esa tarea, no se inventa. Selección de versión compatible, puertos locales y detalles de scripts son decisiones rutinarias de construcción dentro del Spec, registradas en README/lockfile; no justifican una pregunta sobre hitos posteriores.

Un cambio de stack, componente remoto o alcance activa revisión humana; no se intenta superar una limitación incorporando otra plataforma automáticamente.

**H0 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**
