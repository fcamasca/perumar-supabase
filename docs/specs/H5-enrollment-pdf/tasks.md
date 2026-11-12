# H5 — Ficha de matrícula PDF: tasks

**SOLO PLAN / Gate 1 PENDIENTE. Todas las tareas: NO INICIADAS.** [Requisitos y OQ](requirements.md), [diseño candidato](design.md), [tests planificados](test-plan.md).

Dependencias mandan sobre el orden numérico. TASK-H5-001 bloquea toda construcción, incluido el spike. La entrega actual no ejecuta ninguna de estas tareas técnicas ni crea recursos. No se necesita otra autorización para redactar este Spec, pero sí Gate 1 y resolución de las cuatro OQ para construir.

El spike mínimo TASK-H5-005 ocurre antes de Storage/UI e impide invertir en una solución no viable. TASK-H5-018 consolida su medición y evidencia hospedada; falta de acceso/métricas se reporta como limitación, no se simula ni se autoriza producción. Si el prototipo exige otra arquitectura, detener expansión y elevar el resultado a GATE-A01.

## TASK-H5-001 — Registrar Gate 1 y resolver OQ

- Estado: **NO INICIADA**. Dependencias: Ninguna.
- Trazabilidad: REQ-H5-001 → DES-H5-001 → TEST-H5-001, TEST-H5-002.
- Trabajo futuro: Obtener decisión humana sobre el SHA exacto del Spec y OQ-H5-001…004. Fijar contrato antes de programar. Esta autorización actual solo permitió redactar Spec; no cuenta como Gate 1.
- Salida/criterio: Registro de decisiones y baseline; nada construido antes de aprobación.

## TASK-H5-002 — Consolidar referencia aprobada y campos sin fuente

- Estado: **NO INICIADA**. Dependencias: TASK-H5-001.
- Trazabilidad: REQ-H5-002 → DES-H5-002 → TEST-H5-003, TEST-H5-004.
- Trabajo futuro: Revisar plantilla institucional, textos/fechas, marca y espacios impresos; contrastar muestra privada con modelo H1–H4. No copiar PII, importar Jasper ni agregar campos vacíos al negocio.
- Salida/criterio: Plantilla funcional aprobada y matriz de omisiones; OQ-H5-002 resuelta.

## TASK-H5-003 — Fijar procedencia temporal

- Estado: **NO INICIADA**. Dependencias: TASK-H5-001, TASK-H5-002.
- Trazabilidad: REQ-H5-003 → DES-H5-003 → TEST-H5-005, TEST-H5-006.
- Trabajo futuro: Cerrar matriz snapshot/actual/calculado/no aplicable y referencias de edad/fechas. Probar cambios de Alumno/Ciclo/Curso/patrocinador sin fabricar historia inexistente.
- Salida/criterio: Contrato de datos explícito y fixtures válidas mínima/extensa.

## TASK-H5-004 — Lectura autorizada y versión

- Estado: **NO INICIADA**. Dependencias: TASK-H5-003.
- Trazabilidad: REQ-H5-004 → DES-H5-004 → TEST-H5-007, TEST-H5-008.
- Trabajo futuro: Validar IDs/cuerpo y verificar sesión/perfil/roles actuales. Implementar lectura cerrada con JWT/RLS y versión esperada; usar relaciones embebidas existentes antes de justificar una vista/RPC adicional.
- Salida/criterio: Matriz inicial de rechazo y datos coherentes; 409 explícito sin retry.

## TASK-H5-005 — Spike mínimo real y caracteres

- Estado: **NO INICIADA**. Dependencias: TASK-H5-004.
- Trazabilidad: REQ-H5-005 → DES-H5-005 → TEST-H5-009, TEST-H5-010.
- Trabajo futuro: Tras Gate 1, probar un PDF mínimo en Edge Runtime con biblioteca portable/fuente licenciada de versiones fijas y caracteres españoles. No sustituir la prueba por Node. Si no es viable sin expansión, detener y reportar GATE-A01.
- Salida/criterio: Comando/versión y PDF sintético válido con evidencia visual; ninguna suficiencia hospedada supuesta.

## TASK-H5-006 — Textos largos y unidades

- Estado: **NO INICIADA**. Dependencias: TASK-H5-005.
- Trazabilidad: REQ-H5-006 → DES-H5-006 → TEST-H5-011, TEST-H5-012.
- Trabajo futuro: Implementar flujo de texto medido, cortes de palabras continuas y alturas variables. Usar las cotas/unidades H3 y mostrar datos completos, sin texto ejecutable.
- Salida/criterio: Casos máximos sin clipping, pérdida o fuente ilegible.

## TASK-H5-007 — Tablas extensas y contactos

- Estado: **NO INICIADA**. Dependencias: TASK-H5-006.
- Trazabilidad: REQ-H5-007 → DES-H5-007 → TEST-H5-013, TEST-H5-014.
- Trabajo futuro: Representar todos los contactos aplicables con orden estable, filas variables y encabezado repetido; no introducir contacto principal ni tablas de pagos/asignaturas no requeridas.
- Salida/criterio: Evidencia de una tabla pequeña y otra de 100 contactos sintéticos.

## TASK-H5-008 — Secciones y saltos de página

- Estado: **NO INICIADA**. Dependencias: TASK-H5-007.
- Trazabilidad: REQ-H5-008 → DES-H5-008 → TEST-H5-015, TEST-H5-016.
- Trabajo futuro: Reservar cabecera/pie, controlar saltos por bloque/fila y numeración X de Y. Manejar límites con error explícito, no truncamiento.
- Salida/criterio: PDF de varias páginas legible y parseable; títulos/filas continuadas correctamente.

## TASK-H5-009 — Formato institucional aprobado

- Estado: **NO INICIADA**. Dependencias: TASK-H5-002, TASK-H5-008.
- Trazabilidad: REQ-H5-009 → DES-H5-009 → TEST-H5-017, TEST-H5-018.
- Trabajo futuro: Aplicar plantilla y recursos locales aprobados; separar fecha de inscripción/emisión y espacios sin datos. No dar vigencia legal a la referencia ni rellenar firma/huellas/foto.
- Salida/criterio: Comparación visual de versiones mínima y extensa contra la adaptación aprobada.

## TASK-H5-010 — UX contextual de generación/descarga

- Estado: **NO INICIADA**. Dependencias: TASK-H5-009, TASK-H5-013, TASK-H5-015.
- Trazabilidad: REQ-H5-010 → DES-H5-010 → TEST-H5-019, TEST-H5-020.
- Trabajo futuro: Integrar únicamente la acción Ficha PDF de matrícula con estados, foco y mensajes claros. Respetar OQ-H5-004 y conservar contexto; sin editor documental ni permisos en React.
- Salida/criterio: Recorrido accesible y errores seguros, sin cambios financieros.

## TASK-H5-011 — Storage privado y rutas

- Estado: **NO INICIADA**. Dependencias: TASK-H5-009.
- Trazabilidad: REQ-H5-011 → DES-H5-011 → TEST-H5-021, TEST-H5-022.
- Trabajo futuro: Crear solo el bucket privado necesario y controlar acceso directo con mínimo privilegio; path servidor y metadata mínima. Verificar inventario actual antes de crear policies/helpers.
- Salida/criterio: Objetos privados sin PII en nombres/metadata; acceso directo cliente denegado.

## TASK-H5-012 — Matriz de autorización completa

- Estado: **NO INICIADA**. Dependencias: TASK-H5-004, TASK-H5-011.
- Trazabilidad: REQ-H5-012 → DES-H5-012 → TEST-H5-023, TEST-H5-024.
- Trabajo futuro: Probar Director/Coordinador, Admin sin rol, anónimo, perfil inactivo y roles revocados. Cruzar matrícula/artefacto y confirmar el alcance real de RLS, sin ownership de Alumno inventado.
- Salida/criterio: Resultados por actor/operación; secreto únicamente servidor y fuente de negocio siempre con RLS.

## TASK-H5-013 — Descarga autenticada y expiración

- Estado: **NO INICIADA**. Dependencias: TASK-H5-012, TASK-H5-014, TASK-H5-016.
- Trazabilidad: REQ-H5-013 → DES-H5-013 → TEST-H5-025, TEST-H5-026.
- Trabajo futuro: Entregar bytes con autorización por petición, no-store, filename genérico y Blob temporal en React. No endpoint público ni URLs firmadas de producto. Ensayar URL firmada expirada solo como fixture de seguridad de Storage.
- Salida/criterio: Rechazo de token/objeto expirados, copia cruzada y acceso revocado; sin secretos en URL/logs.

## TASK-H5-014 — Repetición y retención aprobada

- Estado: **NO INICIADA**. Dependencias: TASK-H5-011.
- Trazabilidad: REQ-H5-014 → DES-H5-014 → TEST-H5-027, TEST-H5-028.
- Trabajo futuro: Aplicar OQ-H5-003; nueva generación con UUID distinto y sin overwrite de negocio. Establecer expiración/limpieza acotada de derivados con Storage API y documentar costo operativo, sin expediente genérico.
- Salida/criterio: Dos generaciones seguras, descarga expirada rechazada y limpieza sin tocar H1–H4.

## TASK-H5-015 — Errores y presupuesto

- Estado: **NO INICIADA**. Dependencias: TASK-H5-005, TASK-H5-011.
- Trazabilidad: REQ-H5-015 → DES-H5-015 → TEST-H5-029, TEST-H5-030.
- Trabajo futuro: Validar mínimos y límites; probar render fallido, dependencia caída, tamaño excesivo y timeout real. No afirmar éxito si no hay PDF completo ni reintentar silenciosamente.
- Salida/criterio: Categorías de error seguras; entradas conservadas; presupuestos medidos o limitación declarada.

## TASK-H5-016 — Auditoría mínima

- Estado: **NO INICIADA**. Dependencias: TASK-H5-011, TASK-H5-012.
- Trazabilidad: REQ-H5-016 → DES-H5-016 → TEST-H5-031, TEST-H5-032.
- Trabajo futuro: Justificar y acotar el único comando audit propuesto si hace falta; no mutar matrícula para disparar un trigger. Actor real, eventos cerrados, sin PII/URLs. Validar compensación si falla registro después de upload.
- Salida/criterio: Eventos verificables y sin posibilidad de falsificación cliente; no promesa de transacción DB+Storage.

## TASK-H5-017 — Revisión Secure SDLC y adversarial

- Estado: **NO INICIADA**. Dependencias: TASK-H5-010, TASK-H5-012, TASK-H5-013, TASK-H5-015, TASK-H5-016.
- Trazabilidad: REQ-H5-017 → DES-H5-017 → TEST-H5-033, TEST-H5-034.
- Trabajo futuro: Ensayar IDs manipulados, traversal/encoding, HTML/script, SSRF, recursos remotos, secretos, límites y dependencias. Revisar auth y logs de plataforma accesibles; no marcar verificado lo no observable.
- Salida/criterio: Matriz de amenazas/evidencia y residuales; sin acceso externo desde contenido de ficha.

## TASK-H5-018 — Medición Edge y aptitud hospedada

- Estado: **NO INICIADA**. Dependencias: TASK-H5-009, TASK-H5-013, TASK-H5-015, TASK-H5-016, TASK-H5-017.
- Trazabilidad: REQ-H5-018 → DES-H5-018 → TEST-H5-035, TEST-H5-036.
- Trabajo futuro: Consolidar prueba Edge reproducible, frío/caliente y medidas de CPU/memoria/tamaño/tiempo. Ensayo hospedado solo con entorno autorizado; si falta evidencia, informar inconcluso en vez de asumir que local equivale a hosted.
- Salida/criterio: Datos medidos con versiones y límites vigentes; sin infraestructura alternativa automática.

## TASK-H5-019 — Fiabilidad y regresión H1–H4

- Estado: **NO INICIADA**. Dependencias: TASK-H5-010, TASK-H5-014, TASK-H5-015, TASK-H5-016, TASK-H5-018.
- Trazabilidad: REQ-H5-019 → DES-H5-019 → TEST-H5-037, TEST-H5-038.
- Trabajo futuro: Inyectar fallos en fronteras y dos sesiones; probar compensación/huérfanos privados. Repetir controles de seguridad/regresión y fingerprints de fuentes financieras/snapshot en entorno desechable.
- Salida/criterio: Sin mutaciones de negocio, filtraciones ni éxito parcial; base humana sin reset.

## TASK-H5-020 — Informe, mantenibilidad y GATE-A01

- Estado: **NO INICIADA**. Dependencias: TASK-H5-017, TASK-H5-018, TASK-H5-019.
- Trazabilidad: REQ-H5-020 → DES-H5-020 → TEST-H5-039, TEST-H5-040.
- Trabajo futuro: Publicar evidencia técnica/humana real, costo aproximado con supuestos/tarifa y esfuerzo de mantenimiento. Concluir suficiente/no suficiente/inconcluso. Solicitar Gate 2 H5 y decisión humana GATE-A01; no aprobarlos ni cambiar arquitectura.
- Salida/criterio: Candidato e informe revisables, inventario final, limitaciones explícitas; sin AWS/colas/backend añadidos para forzar un sí.

## Controles progresivos futuros

Por bloque tras Gate 1: lint/typecheck/unit donde aplique, contrato y permisos antes de UI, prueba Edge real antes de dar por válida una librería, parseo y render visual de cada cambio de maquetación, Storage/seguridad, errores/compensación y regresión. El resultado de baseline H4 no demuestra H5. No escribir pruebas que solo repitan una implementación ni dejar seguridad/visualización para el final.

No crear helpers/RPC/policies sin requisito y prueba concretos. El inventario candidato de DES-H5-020 es un máximo inicial justificable, no un permiso para ampliar una API oculta. Sin snapshots duplicados, motor de documentos, tareas de facturación, colas o servicios AWS. La limpieza se limita a artefactos derivados autorizados, nunca DELETE de historia funcional.

## Entrega actual

Solo requirements.md, design.md, tasks.md y test-plan.md. Revisión documental y trazabilidad del Spec no cuentan como ejecución de TEST-H5 ni como cumplimiento de TASK-H5-001. Detenerse para OQ/Gate 1; no generar PDF de demostración en esta ejecución.
