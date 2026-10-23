# H3 — Registro de construcción

## TASK-H3-001 — Gate 1 humano registrado

Spec exacto aprobado: `551cd00ed2957178400dca8fe9d945cf3f9e8d20`. Working tree limpio y commit existente verificados. Registro documental `55038c6` en rama Spec; rama `feature/h3-enrollment` creada desde el SHA aprobado y registro incorporado por cherry-pick `55a5b95`, siguiendo H2. Los cuatro archivos aprobados se mantienen idénticos al SHA humano.

## Construcción por bloques

TASK-H3-002…018: modelo, comandos, ACL/RLS, auditoría, snapshot/cargos e invariantes concurrentes implementados mediante dos migraciones aditivas. H2 permanece sin reescribir; triggers H3 protegen rutas indirectas. Se reutilizan los helpers de autorización, versión, catálogo y timestamps. No API propia ni motor genérico de mutaciones.

Alta Alumno con contactos iniciales opcionales en un único comando y rollback del agregado si falla parentesco; el frontend no coordina esas escrituras.

Primera validación: reset e inventario correctos. El harness detectó que service_role no tiene INSERT a catálogos; se corrigió la preparación sintética usando SQL administrativo local existente, sin ampliar grants. Luego detectó referencia PL/pgSQL ambigua en ON CONFLICT: corregida usando constraint nombrado. Fallo de preparación de opciones para Ciclos adicionales corregido en harness. No se ocultaron errores mediante retries. La preparación de alumnos para la prueba de correlativo se hizo secuencial para evitar conflictos SERIALIZABLE ajenos a esa carrera; la carrera real usa sesiones/transacciones independientes. El reinicio anual se comprobó desplazando el reloj únicamente en la definición local del harness y restaurando exactamente la función, sin parámetro público de fecha.

Validación ampliada: 14 grupos de integración H3 con JWT ordinarios, rollback en matrícula/cargo/auditoría, código y cargos históricos, alumno incompleto preparado controladamente, validaciones y carreras de documento/contactos/configuración/Ciclo/edición. La preparación de legado restaura NOT NULL/trigger en finally. La inyección de fallos solo instala y retira triggers locales desde harness administrativo; no hay endpoint de fallos en producto.

TASK-H3-019: pantallas Alumno/contactos/empresa/tarifas/Ciclo-tarifa/matrícula, Stepper/Tabs, modales propios y estados terminales implementados. Pruebas DOM incluyen foco de primer error, cancelación sin escritura, teclado Tabs y retorno a matrícula conservando Ciclo. La lectura real visual/teclado/SO corresponde a la persona; no se atribuye a Codex.

TASK-H3-020: CI existente ampliada con test:enrollment en primera ejecución y después de reset; verificación y evidencia en curso. Pruebas humanas y Gate 2 pendientes; no acceptance, merge o H4.

## Dato de negocio pendiente, sin inventar listas

DES-H3-003 prohíbe rellenar silenciosamente listas no especificadas. El Spec define ocho catálogos pero solo enumera valores de TIPO_DI. Se crean las ocho definiciones y únicamente DNI/CARNET_EXTRANJERIA como valores de negocio; no se inventan valores de SEXO/ESTADO_CIVIL/GRUPO_SANGUINEO/GRADO_INSTRUCCION/COLOR_OJOS/COLOR_CABELLO/PARENTESCO. Se solicitó al usuario su contenido inicial mientras se continuó trabajo independiente. Las pruebas preparan valores etiquetados TEST/SINTETICO, nunca los convierten en datos de negocio de una migración.

Sin valores autorizados de SEXO y PARENTESCO, un reset limpio no permite altas operativas desde UI. Este pendiente de datos se comunica explícitamente y evita declarar cierre técnico completo o candidato final listo para pruebas exclusivamente humanas. No se modifica el Spec ni se aprueba un gate para resolverlo.
