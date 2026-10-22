# H0 — Requirements

**Spec:** H0-bootstrap · **Versión:** 0.1 · **Fecha:** 2026-10-21
**H0 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**

## 1. Objetivo y autorización actual

Especificar una base técnica mínima y reproducible para desarrollar PERÚ MAR con React, TypeScript, Vite, Supabase y PostgreSQL. H0 debe permitir clonar, configurar, ejecutar y verificar el entorno desde cero, sin funcionalidad del negocio.

Esta ejecución autoriza solamente la preparación documental, Git local, commit base en main, rama del Spec y commit de estos cuatro documentos. No autoriza ejecutar las tareas de construcción aquí descritas.

La aprobación humana del Spec (Gate 1) y la aceptación humana del resultado construido (Gate 2) son independientes. Se aprueba un commit identificable de los cuatro documentos. Ni su existencia, ni el silencio, ni pruebas verdes autorizan construir, aceptar o hacer merge.

## 2. Fuentes y jerarquía

1. [PLAN_MVP.md](../../PLAN_MVP.md), leído completo: H0 y reglas de método, alcance y gates.
2. [Historias_de_Usuario.md](../../requirements/Historias_de_Usuario.md): objetivos web y seguridad como contexto; no introduce historias funcionales en H0.
3. Spec de H0, después de aprobación explícita, dentro de los límites del PLAN.
4. [Evaluación arquitectónica](../../architecture/Informe_Evaluacion_Arquitectonica_PERUMAR.md) y [Alternativas](../../architecture/Informe_Alternativas_Arquitectura_PERUMAR.md): sustento técnico, no autorización de alcance.

El PLAN tiene estado DRAFT y su tabla inicial registra H0 como PENDIENTE DE SPEC. Se conserva esa fuente sin modificarla: describe el punto de partida de main. Estos documentos registran el Spec preparado en su rama, sin declarar aprobado el PLAN ni aceptado H0. Véase OQ-H0-001 antes de construir.

El PLAN incluye patrocinadores/facturación en el MVP (H7), aunque los informes anteriores describan otro recorte. Es una divergencia ya resuelta por la jerarquía explícita; no afecta H0 ni se reabre como pregunta. Las menciones tecnológicas antiguas de las historias tampoco sustituyen la arquitectura candidata del PLAN.

## 3. Alcance de construcción futura

| ID | Requisito verificable |
|---|---|
| REQ-H0-001 | Conservar la base documental y la historia Git local existente. Mantener main documental y trabajar desde el commit de Spec aprobado en `feature/h0-bootstrap`, descendiente de `feature/h0-bootstrap-spec`. No reinicializar ni crear otro repositorio anidado |
| REQ-H0-002 | Crear, solo durante construcción aprobada, el remoto GitHub `perumar-supabase` privado en el propietario confirmado. Configurar origin sin credenciales en URL y verificar privacidad antes del primer push |
| REQ-H0-003 | Disponer de una sola aplicación React + TypeScript + Vite con pantalla técnica neutra de arranque, sin dominio ni diseño visual definitivo. El build debe comprobar tipos y producir recursos estáticos |
| REQ-H0-004 | Definir un entorno reproducible: versiones concretas compatibles de Node LTS, gestor npm, CLI Supabase y dependencias registradas; un lockfile; instalación limpia determinista; prerrequisitos Windows y CI documentados |
| REQ-H0-005 | Configurar Supabase local mediante CLI versionada y runtime compatible con Docker. Permitir inicio, estado, parada y reconstrucción local sin proyecto alojado, cuenta remota, datos reales ni enlace a producción |
| REQ-H0-006 | Centralizar configuración del cliente Supabase con URL y clave pública local; validar ausencia y formato sin imprimir valores. Una comprobación técnica debe demostrar conectividad local sin login, tablas ni lecturas de negocio |
| REQ-H0-007 | Mantener secretos fuera de Git, bundle, capturas y logs CI; .gitignore y .env.example seguros. Prohibir secret/service_role, credenciales SQL, PAT y claves privadas en frontend; limitar futuras credenciales al uso necesario |
| REQ-H0-008 | Establecer ubicación y disciplina de migraciones versionadas y reconstrucción de PostgreSQL local. En H0 no crear tablas, funciones, políticas de negocio ni migraciones SQL vacías solo para demostrar la carpeta |
| REQ-H0-009 | Proporcionar verificaciones técnicas acotadas: lint, tipos, build y pruebas de configuración/arranque que detecten fallos reales. No se acepta añadir tests que solo repitan constantes ni pruebas funcionales de H1 |
| REQ-H0-010 | Definir y construir después una CI mínima en GitHub para cambios del proyecto: instalación limpia, lint, tipos, pruebas técnicas y build; comprobar entorno local con servicio disponible en runner. Sin deployment, secretos remotos de Supabase ni permisos de escritura innecesarios |
| REQ-H0-011 | Completar README operativo durante construcción: versiones, instalación, variables, entorno local, verificaciones, reconstrucción, solución de problemas y gates. Una persona debe poder seguirlo desde un clon limpio |
| REQ-H0-012 | Mantener estructura pequeña, un paquete y configuración local separada de cualquier entorno futuro. Declarar exclusiones y resolver cambios de alcance/diseño mediante decisión humana; no usar H0 como vehículo para implementar H1 |
| REQ-H0-013 | Exigir pruebas técnicas y humanas con evidencia del commit construido. Crear acceptance.md únicamente tras aprobación humana final; merge a main solo después. Hasta entonces, H0 no se considera terminado |

## 4. Criterios de aceptación del hito construido

| ID | Evidencia necesaria |
|---|---|
| CA-H0-01 | Clon privado limpio, versiones documentadas y lockfile permiten instalar, iniciar frontend/Supabase local y obtener build correcto sin archivos personales no documentados |
| CA-H0-02 | La persona revisora ve la pantalla neutra, verifica conectividad y provoca un error de configuración entendible sin filtración de valores |
| CA-H0-03 | La reconstrucción de Supabase se ejecuta únicamente contra el entorno local desechable; no existen tablas o datos de negocio ni migraciones artificiales |
| CA-H0-04 | Git ignora configuración sensible y admite .env.example; bundle/logs no contienen canarios de credenciales privilegiadas; remoto verificado privado |
| CA-H0-05 | CI pasa sobre el commit revisado y demuestra detectar una configuración inválida mediante un ensayo controlado de prueba; no tiene deployment ni secretos de producción |
| CA-H0-06 | Revisor humano completa los escenarios humanos, reconoce exclusiones, y aprueba explícitamente el hito y su commit. Solo entonces se genera acceptance.md y se autoriza merge |

## 5. Restricciones y exclusiones

- Una institución, baja concurrencia; un paquete frontend y una configuración Supabase local.
- PostgreSQL como persistencia candidata. No API backend propia, servidores permanentes nuevos, microservicios, microfrontends, WebFlux, DynamoDB, Kubernetes, CQRS, event buses ni multi-tenancy.
- Sin Redux, arquitectura hexagonal completa, factories/adapters/interfaces preventivos ni paquetes múltiples.
- Sin autenticación funcional, usuarios de aplicación, roles, permisos, políticas RLS de negocio, rutas protegidas, materias, carreras, ciclos, alumnos, matrícula, costos, pagos, reportes funcionales, auditoría de negocio, PDFs o Storage de expedientes.
- El stack local puede arrancar componentes internos de Supabase; eso no constituye implementar Auth/Storage de PERÚ MAR ni autoriza configurarlos funcionalmente.
- Sin proyecto Supabase alojado, linking remoto, migraciones remotas, hosting productivo, dominios, SMTP productivo, deployment o importación de datos reales en H0. GitHub privado es el único recurso remoto previsto para la construcción del hito.
- No migrar ni copiar código/configuraciones de las implementaciones anteriores.
- La prueba de PDF corresponde a H5. No evaluar su runtime implementando documentos durante H0.

## 6. Seguridad y reproducibilidad aplicables

Las claves publicables o anon locales no son credenciales privilegiadas, pero se suministran por configuración local y no se incrustan en código. Una variable con prefijo VITE es visible al navegador: el prefijo no protege secretos.

H0 aplica mínimo privilegio a repositorio/pipeline, protección de secretos, control de dependencias y errores seguros. Login, autorización de recursos, SQL Injection sobre consultas del negocio, XSS de contenido enriquecido, CSRF de sesión, auditoría funcional y recuperación de datos reales serán tratados por los hitos correspondientes. No se afirma que estén resueltos en H0.

La reconstrucción local verifica reproducibilidad, no sustituye backups/restauración de producción de H9. No se asignan SLA, RPO/RTO o concurrencia numérica inexistentes.

Relación con OWASP Secure SDLC: requisitos y diseño con límites explícitos; construcción reproducible y dependencias controladas; despliegue seguro limitado aquí a CI sin secretos; verificación de configuración y revisión humana. [OWASP SAMM](https://owaspsamm.org/model/). Se usa como criterio, sin añadir plataforma de seguridad.

## 7. Dependencias y decisiones rutinarias

- Gate 1 registrado por una persona después de revisar los cuatro documentos; cierre de OQ aplicables al trabajo que se autoriza.
- Identidad Git existente y acceso autorizado al propietario GitHub elegido; nunca solicitar tokens en documentos/chat.
- Durante construcción se verificará disponibilidad de Node y runtime Docker compatible en Windows. No se asume instalado ni se instala ahora. Si requiere cambios del sistema, se registra el prerrequisito y se sigue el procedimiento de permisos del entorno.
- Versiones exactas se eligen de releases estables compatibles al construir y quedan fijadas. No necesitan una pregunta de negocio.
- Se propone npm para evitar gestores adicionales, TypeScript estricto y herramientas del template oficial React-TS de Vite. Si la verificación descubre incompatibilidad, se corrige dentro del diseño; cambiar arquitectura/herramientas principales exige decisión humana.

## 8. OPEN QUESTIONS

| ID | Contexto e impacto | Opciones | Recomendación y momento |
|---|---|---|---|
| OQ-H0-001 | El PLAN está en DRAFT y condiciona la preparación de hitos a aprobación. La instrucción actual permite preparar el Spec, no acredita aprobación del PLAN ni Gate 1 | Ratificar explícitamente la base H0 del PLAN al aprobar este Spec; o ajustar antes PLAN/Spec | Ratificar alcance H0 y método de dos gates en Gate 1. No iniciar construcción sin resolverlo; no hace falta definir H1–H9 |
| OQ-H0-002 | No se conoce el propietario GitHub autorizado del remoto privado. La identidad de commits no demuestra titularidad ni acceso a una organización | Cuenta personal confirmada; organización confirmada | Confirmar owner y mantener nombre/privacidad previstos. Bloquea TASK-H0-005 y la finalización de H0, no las tareas locales posteriores al Gate 1 si la aprobación las autoriza expresamente |

No se abren preguntas sobre roles funcionales, moneda, costos, matrículas, PDFs, retención de expedientes o proveedores de producción: no son necesarias para construir H0. La disponibilidad de Docker es una comprobación técnica futura, no una decisión arquitectónica que se presuponga fallida.

## 9. Estado

Los requisitos son propuesta revisable. La selección previa de Supabase y el commit de este Spec no son autorización de construcción. Trazabilidad completa en [test-plan.md](test-plan.md#7-matriz-de-trazabilidad).

**H0 SPEC: PENDING HUMAN APPROVAL**
**IMPLEMENTATION: BLOCKED**
