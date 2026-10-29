# H3 — Registro de construcción

## TASK-H3-001 — Gate 1 humano registrado

Spec exacto aprobado: `551cd00ed2957178400dca8fe9d945cf3f9e8d20`. Working tree limpio y commit existente verificados. Registro documental `55038c6` en rama Spec; rama `feature/h3-enrollment` creada desde el SHA aprobado y registro incorporado por cherry-pick `55a5b95`, siguiendo H2. Los cuatro archivos aprobados se mantienen idénticos al SHA humano.

## Construcción por bloques

TASK-H3-002…018: modelo, comandos, ACL/RLS, auditoría, snapshot/cargos e invariantes concurrentes implementados mediante dos migraciones aditivas de modelo/comandos y una tercera de datos autorizados. H2 permanece sin reescribir; triggers H3 protegen rutas indirectas. Se reutilizan los helpers de autorización, versión, catálogo y timestamps. No API propia ni motor genérico de mutaciones.

Alta Alumno con contactos iniciales opcionales en un único comando y rollback del agregado si falla parentesco; el frontend no coordina esas escrituras.

Primera validación: reset e inventario correctos. El harness detectó que service_role no tiene INSERT a catálogos; se corrigió la preparación sintética usando SQL administrativo local existente, sin ampliar grants. Luego detectó referencia PL/pgSQL ambigua en ON CONFLICT: corregida usando constraint nombrado. Fallo de preparación de opciones para Ciclos adicionales corregido en harness. No se ocultaron errores mediante retries. La preparación de alumnos para la prueba de correlativo se hizo secuencial para evitar conflictos SERIALIZABLE ajenos a esa carrera; la carrera real usa sesiones/transacciones independientes. El reinicio anual se comprobó desplazando el reloj únicamente en la definición local del harness y restaurando exactamente la función, sin parámetro público de fecha.

Validación ampliada: 14 grupos de integración H3 con JWT ordinarios, rollback en matrícula/cargo/auditoría, código y cargos históricos, alumno incompleto preparado controladamente, validaciones y carreras de documento/contactos/configuración/Ciclo/edición. La preparación de legado restaura NOT NULL/trigger en finally. La inyección de fallos solo instala y retira triggers locales desde harness administrativo; no hay endpoint de fallos en producto.

TASK-H3-019: pantallas Alumno/contactos/empresa/tarifas/Ciclo-tarifa/matrícula, Stepper/Tabs, modales propios y estados terminales implementados. Pruebas DOM incluyen foco de primer error, cancelación sin escritura, teclado Tabs y retorno a matrícula conservando Ciclo. La lectura real visual/teclado/SO corresponde a la persona; no se atribuye a Codex.

TASK-H3-020: parte técnica completada; CI existente ampliada con test:enrollment en primera ejecución y después de reset. Pruebas humanas y Gate 2 pendientes; no acceptance, merge o H4.

## Pendiente de catálogos de 22c1fee — resuelto el 23/10/2026

DES-H3-003 impide inventar listas. En 22c1fee se crearon ocho definiciones y solo los valores DNI/CE; las pruebas usaron valores TEST/SINTETICO. Se consultó a la persona y no se declaró cierre técnico mientras no hubiera valores autorizados de SEXO/PARENTESCO.

El 23/10/2026 el usuario suministró los valores de los siete catálogos pendientes y confirmó conservar solo DNI/CE, sin PASAPORTE en H3. [Registro de valores](catalog-values.md): 41 valores, incluyendo F/M y los doce parentescos. Se agregó una tercera migración exclusivamente de datos; migraciones publicadas y los cuatro documentos aprobados intactos. Inventario de objetos no cambia; el total inicial de catalogo_valor pasa de 9 a 50 incluyendo H2 y TIPO_DI.

Se amplió la integración para comparar exactamente códigos/etiquetas/vigencia/pertenencia de las siete listas y ejecutar alta Alumno/contactos y matrícula con valores autorizados (sin depender de valores TEST para esa operación), verificando descripción histórica en snapshot. Los fixtures TEST restantes siguen reservados a pruebas negativas/de concurrencia.

Regresión del 23/10/2026 PASSED: reset/local, seguridad (14 escenarios), académica (11 grupos), H3 (14 grupos, incluida comparación exacta de semillas y matrícula con datos autorizados), lint/types, 148 unitarias, build y build-safety. Se mantienen límites de H0/H1/H2 y advertencia de bundle. CI de 22c1fee completada SUCCESS; CI nueva se reporta sobre SHA final.

## Estado técnico y tareas al 23/10/2026

- TASK-H3-001: COMPLETA, Gate 1 humano registrado desde SHA aprobado.
- TASK-H3-002…018: COMPLETAS TÉCNICAMENTE; evidencia en technical-results y scripts de regresión. Modelo/RPC/RLS/PII/historia/concurrencia y semillas autorizadas comprobados.
- TASK-H3-019: IMPLEMENTACIÓN Y VERIFICACIÓN AUTOMATIZADA COMPLETAS. TEST-H3-040/041/042 humanos pendientes, incluidos teclado/temas/forced-colors SO; no se declaran ejecutados.
- TASK-H3-020: PARTE TÉCNICA COMPLETA; evidencia/guía disponibles. TEST-H3-044 revisión humana de mantenibilidad y TEST-H3-045 Gate 2 pendientes. No se registra acceptance ni integración a main.

**Construcción H3 completada técnicamente. Pendiente de pruebas humanas y Gate 2.**


## Ajuste de distribución solicitado el 28/10/2026

El usuario observó que cada campo de Nuevo Alumno ocupaba una línea completa. Se añadió distribución responsive al contenedor form-grid: nombres en tres columnas; documento/fecha/sexo y catálogos de identificación en campos compactos; domicilio y textos extensos con mayor espacio. Dos columnas en anchos intermedios y una en móvil, conservando orden DOM/teclado, etiquetas, errores inline y colores semánticos existentes. El componente de campos compartido aplica la distribución también a domicilio, información adicional, contactos y empresa. Se corrigió además la numeración duplicada de los pasos (marcador de lista y número explícito).

Verificación: typecheck y build; revisión visual humana de esta distribución pendiente. Gate 2 permanece pendiente.


## Ingreso en mayúsculas solicitado el 28/10/2026

El usuario solicitó texto en mayúsculas al ingresar datos en los formularios. Se normaliza el valor de los controles de texto antes de actualizar el estado React, tanto al escribir como al pegar, en formularios académicos/H3 y motivos de los diálogos. El payload guarda el texto convertido; no es una transformación CSS de apariencia. Se conserva la posición de edición. Email, contraseña, fechas, importes y UUID de selectores conservan sus valores originales.

Verificación: typecheck/lint satisfactorios y 151 pruebas PASSED (12 archivos), incluidas edición con tildes/cursor, excepciones de controles no textuales y guardado real del request de empresa con razón social MAYÚSCULA/email intacto. Build verificado. Gate 2 sigue pendiente; Spec aprobado intacto.


## Ajustes de documentos y presentación solicitados el 28/10/2026

- Documento según tipo: DNI solo 8 dígitos, CE 1–30 caracteres alfanuméricos en mayúsculas, RUC solo 11 dígitos; controles siguen siendo texto para conservar ceros iniciales. Se filtra escritura/pegado, se muestran límites asociados al campo y se habilita teclado numérico donde corresponde. Cambiar tipo DI limpia el número para evitar interpretar un CE como DNI. Una corrección por pegado retira el error inline cuando ya es válida. Las validaciones servidor previamente aprobadas se mantienen.
- SEXO: etiquetas FEMENINO/MASCULINO con códigos F/M e IDs estables, mediante migración aditiva 20261028190000. Referencia versionada de etiquetas y lista exacta de migraciones actualizadas. Se aplicó con migration up --local tras comprobar el guard existente: comparación anterior/posterior confirmó IDs, hash de snapshots y cantidades de alumnos/contactos/matrículas iguales, sin reset ni stop del stack humano.
- Cancelar/Anterior/Siguiente usan la barra form-actions existente, con gap y flex-wrap, tanto en alta de Alumno como en matrícula.
- Nuevo Alumno muestra icono vectorial persona+ y texto en los accesos y título; icono decorativo aria-hidden, sin dependencia ni cambio del nombre accesible.

Verificación final: lint/types/build y 154 pruebas PASSED (12 archivos), incluyendo caracteres/longitudes por tipo, ceros iniciales, pegado, cambio de tipo, error de RUC incompleto/corregido y etiquetas de sexo con IDs intactos. Inventario real tras migración comprobado; cuatro documentos aprobados preservados. Revisión humana visual/Gate 2 pendientes, sin acceptance ni merge.


## Barra de búsqueda de Alumnos solicitada el 28/10/2026

Se reemplazó la etiqueta aislada por una barra identificada como búsqueda: rótulo Buscar alumnos, lupa decorativa e indicación Documento o apellido paterno. La acción de nuevo alumno se ubica al extremo derecho de la misma barra, solo con icono; tooltip asociado como nombre accesible, visible por hover/foco y descartable con Escape. Se reutiliza el icono persona+ existente. La consulta y paginación conservan su comportamiento.

Verificación: prueba del buscador con nombre accesible, filtro por documento, destino del enlace de alta sin texto interior y tooltip descartable; 14 pruebas del módulo H3 satisfactorias, typecheck/lint/build y diff --check. Sin cambios DB ni Spec aprobado; Gate 2 permanece pendiente.


## Resumen Revisar de Alumno solicitado el 28/10/2026

Se sustituyó el resumen mínimo por identificación del alumno/documento y cuatro secciones de revisión: identificación, domicilio, información adicional y contactos. Se muestran etiquetas de catálogos/ubicaciones en vez de UUID, fecha dd/mm/aaaa, edad derivada, unidades de medidas y opcionales no indicados. Las secciones tienen Corregir; Volver al resumen valida la sección modificada y conserva los demás datos antes de Guardar. Se informa ausencia de contacto activo sin impedir guardar Alumno, conforme a la regla independiente de matrícula.

En edición de alumno existente se consultan sus contactos de solo lectura bajo RLS; se conserva su gestión en la pestaña Contactos y no se agregan al payload de edición. La revisión no guarda ni modifica datos; Guardar conserva el comando previo y su control de versión. Diseño responsive con pares etiqueta/valor y acciones accesibles por sección, usando tokens H2.

Verificación: 158 pruebas PASSED (12 archivos), incluyendo revisión con descripciones y geografía legibles, corrección sin pérdida/escrituras, validación antes de volver al resumen, guardado del payload corregido y contactos existentes de solo lectura; lint/typecheck/build y diff --check satisfactorios. Sin cambios SQL/Spec aprobado; Gate 2 pendiente.
