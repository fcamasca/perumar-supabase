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


## 2026-10-28 — Ocupación y señas particulares

Solicitud humana: colocar Ocupación antes de Señas particulares, dejar Señas al final como textarea de tres líneas ampliable verticalmente, y registrar las 15 ocupaciones proporcionadas más OTROS en el catálogo genérico, sin CNO/perfil. Combo con búsqueda insensible a tildes, teclado y selección explícita; OTROS exige detalle en mayúsculas. Se mantienen 500 caracteres para señas y 150 para el detalle de ocupación.

Migración aditiva `20261028200000_h3_occupation_catalog.sql`, sin nuevas tablas/RPC/helpers/policies. Reutiliza guardar_alumno, validate_alumno y enrollment_snapshot. Conserva ocupaciones anteriores y snapshots históricos. Validación local incremental sin reset: hashes de fichas y snapshots previos iguales, contactos conservados, 16 valores activos e inventario de seguridad validado. `tests/sql/h3-occupation.sql` prueba RPC real, etiqueta canónica, OTROS, snapshot con ID/etiqueta/detalle, rechazos de catálogo incorrecto/inactivo, detalle vacío o largo; transacción revertida. Se amplía integración H3 para ejecución limpia en CI; no se ejecuta reset sobre los datos humanos locales. Lint/typecheck/build y 161 pruebas unitarias pasan. No se modifican los cuatro documentos aprobados, ni se aprueba Gate 2.


## 2026-10-28 — Conservar formularios al volver a la pestaña

Causa del reporte humano: cada evento Auth, incluido SIGNED_IN de la misma identidad y TOKEN_REFRESHED, establecía loading y desmontaba ProtectedArea/Outlet, perdiendo el estado local del formulario. SessionProvider conserva el árbol autorizado mientras revalida en segundo plano la misma identidad. Sigue consultando getUser, perfil y roles; cambio de identidad, logout, revocación o error retiran el acceso y descartan resultados tardíos. No se almacenan borradores/PII en storage. No incluye recuperación tras F5 o navegación a otra pantalla.

Pruebas de regresión: misma instancia y contenido del formulario antes/durante/después de SIGNED_IN y TOKEN_REFRESHED; retiro inmediato ante cambio de usuario/logout y bloqueo ante revocación. Lint, typecheck, 165 tests unitarios, build y diff --check satisfactorios. Sin cambios de DB, Spec ni Gates.


## 2026-10-28 — Formalización de CHG-H3-001 respecto a Gate 1

A solicitud humana se registra [la enmienda de Ocupación](approved-occupation-amendment.md) como cambio funcional posterior al Spec aprobado en `551cd00ed2957178400dca8fe9d945cf3f9e8d20`, implementado previamente en `f60936f03386436f1891ffe8de0169e9d1fae3e9`. No se presenta como parte del Gate 1 original. Se vinculan solicitud humana, alcance, OQ-H3-001/REQ-DES-TASK afectados, migración, cobertura técnica y revisión humana pendiente. Los cuatro documentos aprobados permanecen idénticos a la base y conservan sus IDs. Registro de Gate 1 y catálogo enlazan la enmienda. Este cambio es documental; no altera código/DB ni aprueba Gate 2.


## 2026-10-28 — Ficha con formulario de consulta y grilla de alumnos

Solicitudes humanas: consultar Alumno con la misma presentación del registro y secciones como pestañas; reemplazar la lista por grilla de filas compactas con acciones a la derecha; ordenar por fecha de registro descendente.

Fields reutiliza los metadatos y distribución del alta en modo readOnly, con etiquetas de catálogo/geografía, fecha legible, opcionales sin dato y señas en textarea. Ficha abre en Identificación; conserva Resumen, Domicilio, Información adicional, Contactos y Matrículas, con estado activo visible y navegación por flechas/Home/End. Encabezado muestra nombre completo/documento/edad y acción Editar alumno; la edición abre la sección consultada y cancelar regresa a la misma pestaña. Mensajes explícitos para contactos/matrículas vacíos.

Grilla semántica con nombre, documento, fecha/hora de registro en America/Lima y acciones de ver/editar con iconos y tooltips accesibles. Nombre también abre consulta. Editar enlaza directamente al editor; cancelar vuelve a consulta. Creación/edición se muestran para Director/Coordinador según roles existentes; rutas, RLS y RPC conservan autoridad DB. Sin borrar, nuevas acciones funcionales ni grants. Se consulta proyección mínima más created_at; orden DB created_at DESC e id DESC como desempate, aplicado antes de paginar (30 filas) y filtrar. Buscar reinicia a página 1. Responsive conserva nombre/documento/acciones y oculta la columna de fecha en pantallas estrechas; el orden no cambia.

Validación: lint, typecheck, 169 tests unitarios, build y diff --check. Casos nuevos verifican consulta readOnly y valores/ceros/etiquetas, cambio de pestaña y edición/cancelación de sección, acciones por rol, acceso directo al editor, orden DB, búsqueda y paginación. Revisión visual humana en entorno real pendiente. Sin migraciones ni cambios de los cuatro documentos aprobados; Gate 2 pendiente.


## 2026-10-28 — Unificación consulta/edición, resumen y contactos

Solicitudes humanas: Ver/Editar con la misma ficha y navegación por secciones; Resumen con todo el contenido de Revisar; Contactos en grilla con todos sus datos y acciones; la misma grilla durante Nuevo Alumno; aclarar el retorno desde Corregir.

StudentDetail comparte encabezado, seis pestañas, Fields y paneles entre consulta/edición. Cambia readOnly y las acciones de Guardar cambios/Cancelar. Los tres grupos de campos permanecen montados al navegar; Guardar valida toda la ficha y abre/enfoca la primera sección inválida, también desde enlaces de errores. La extensión opcional de InlineForm revela el panel antes del foco y se comprueba con regresión académica. La RPC guardar_alumno conserva expected_updated_at del inicio de edición, contactos vacíos para no reemplazar contactos existentes, conflictos explícitos y ausencia de retries. Cancelar descarta el borrador sin escribir; error conserva borrador y modo edición. Resumen y Revisar usan el mismo StudentReview, con ficha completa, etiquetas legibles, unidades y contactos/estado; consulta omite botones/instrucciones de guardado.

ContactGrid compartida: apellidos, nombres, parentesco, celular, dirección, estado y acciones a la derecha. Contactos persistidos activos permiten Editar/Retirar según los roles existentes; inactivos permanecen consultables sin acciones. Retirar exige confirmación y usa retirar_contacto_emergencia, nunca DELETE. Edición/alta del contacto usa diálogo validado y las versiones de contacto/Alumno. Durante cambios pendientes en la ficha del alumno se permite consultar contactos, pero se pide guardar/cancelar antes de modificarlos, evitando mezclar dos escrituras con distinta versión del agregado.

Nuevo Alumno reutiliza esa grilla para varios contactos iniciales, con estado Por guardar y acciones Editar/Quitar que afectan solo memoria. Agregar a la lista/Aplicar cambios validan el diálogo; Cancelar no incorpora sus cambios. Los IDs temporales no salen al servidor: guardar_alumno recibe exclusivamente campos permitidos en contactos, dentro de la misma transacción de alta que ya existía. No se llama guardar_contacto_emergencia antes de crear el alumno; un error final conserva la lista. La ficha sigue siendo registrable sin contactos, y matricular sigue exigiendo contacto activo válido.

Se reemplaza Volver al resumen por Aplicar cambios y revisar. La ayuda indica que conserva lo corregido y vuelve a Revisar, sin guardar aún el alumno; Guardar final conserva su significado. Sin migraciones/RPC/helpers/policies nuevos ni almacenamiento de PII en navegador. Los cuatro documentos aprobados y Gates no cambian.

Validación: lint, typecheck, 177 pruebas unitarias en 12 archivos, build y diff --check satisfactorios. Cobertura: conservación entre pestañas, comparación de ficha Ver/Editar, revisión completa, foco de errores en secciones ocultas, cancelación/conflicto sin retry, datos/acciones de contactos, versiones y confirmación de retiro, varios contactos iniciales con edición/quitado local y payload atómico sin IDs/estado, cancelación de diálogo y conservación tras error. Sin reset ni escrituras sobre los datos humanos locales. Verificación visual humana continúa pendiente para Gate 2.


## 2026-10-29 — Diálogo de contacto fuera de pantalla

Reporte humano al agregar contacto: el diálogo aparecía al final de body, desplazado y cortado. Causa: ContactDialog usaba modal-backdrop, clase sin definición CSS, en lugar de la capa fija dialog-backdrop existente. Se reutiliza esa capa para centrar el diálogo sobre el viewport con scrim y z-index; aplica tanto a contactos iniciales como persistidos. Se amplía el panel a un máximo de 52rem, se elimina la tarjeta duplicada del formulario interior y se distribuyen campos en dos columnas con Dirección a todo el ancho; una columna en móvil. Se conserva max-height/scroll del modal existente para pantallas bajas.

Validación: lint, typecheck, 178 tests unitarios, build y diff --check. Regresión de contacto prueba foco inicial, Tab/Shift+Tab cíclicos, fondo inert, Escape, retorno al botón Agregar contacto y conservación del borrador Alumno, sin escrituras. No hay cambios DB, de permisos ni del Spec aprobado; no se reinicia el entorno local. Revisión visual humana/Gate 2 pendiente.


## 2026-10-29 — Barra de desplazamiento de Ocupación

Reporte humano: el combo se cerraba al hacer clic/arrastrar su scrollbar. Causa: el onBlur del input cerraba incondicionalmente la lista, incluyendo blur del control nativo de scroll. La lista permanece abierta al perder foco hacia ningún control o body/documentElement; no se cancela el gesto nativo de la barra. Se cierra al elegir, hacer pointerdown fuera del contenedor, Tab/Escape o mover foco a otro control. El listener exterior existe solo mientras la lista está abierta y se retira al cerrar/desmontar.

Verificación: lint, typecheck, 180 pruebas unitarias, build y diff --check. Regresión reproduce pointerdown sobre la lista, blur sin destino/body y scroll/move/up antes de seleccionar; comprueba también cierre exterior, Tab, Escape y foco a otro control. Se conservan catálogo, validación de selección y OTROS. Sin cambios DB, Spec o Gates. Ensayo humano con scrollbar nativo pendiente de confirmación visual.


## 2026-10-29 — Ocupación como combo nativo por decisión humana

El usuario informó que el problema de la barra seguía presente y finalmente pidió explícitamente quitar la búsqueda y dejar un combo normal. Se reemplaza OccupationField por select nativo: desaparecen popup/listbox personalizado, filtro, control de apertura/cierre, handlers blur/pointer/teclado y CSS asociados. OTROS primero entre valores del catálogo, selección vacía opcional, detalle obligatorio en mayúsculas hasta 150 si OTROS. Cambiar a otra opción limpia el detalle; una selección histórica inactiva sigue visible y deshabilitada, sin ofrecerla como valor nuevo. Sin cambios DB/RPC/validación servidor ni pérdida de referencias existentes.

CHG-H3-001 registra la decisión posterior que sustituye solo la búsqueda; Spec histórico/Gates intactos. Lint, typecheck, 179 tests unitarios, build y diff --check correctos. Las pruebas de popup personalizado se sustituyen por selección nativa, orden, opcionalidad, UUID/etiqueta, detalle OTROS y vigencia. No se atribuye una prueba visual de la scrollbar nativa a esta ejecución; continúa la revisión humana.


## 2026-10-29 — Empresa patrocinadora alineada con Alumnos

Solicitud humana: misma barra de búsqueda, acciones y grilla que Alumnos. Companies reutiliza los estilos de barra con lupa, acción Nueva empresa a la derecha mediante icono/tooltip, filas compactas y acciones Ver/Editar a la derecha. Grilla: razón social, RUC, fecha/hora de registro en America/Lima, persona de contacto, teléfono, email y acciones. Consulta DB por created_at DESC e id DESC; paginación de 30 y búsqueda por RUC/razón social que reinicia a página 1. En móvil se conserva scroll horizontal de las columnas y el patrón de Alumnos oculta la fecha sin cambiar el orden.

Ver usa el mismo formulario de campos en readOnly, sin escribir; Editar habilita los campos existentes. Creación/edición visibles para Director/Coordinador, con autorización real en RLS/RPC intacta. guardar_empresa_patrocinadora conserva id/expected_updated_at, RUC de 11 dígitos, mayúsculas de texto y email intacto. Conflicto/error mantiene borrador sin retry. Sin DELETE, contratos nuevos ni migraciones. En Matrícula se conserva Elegir empresa, Sin patrocinador y selección de la empresa recién creada/guardada.

Lint, typecheck, 184 tests unitarios, build y diff --check correctos. Cobertura nueva de barra/iconos/grilla, orden, búsqueda/páginas, consulta readOnly, guardado versionado, roles, selección desde matrícula y conflicto sin retry. Se mantienen los cuatro documentos aprobados; verificación visual humana y Gate 2 pendientes.


## 2026-10-29 — Navegación lista/ficha de Empresa patrocinadora

Solicitud humana: al Ver empresa ocultar la grilla y colocar Editar arriba, con comportamiento similar a Alumno. Companies muestra exclusivamente lista o ficha/alta. Ver oculta búsqueda, grilla y paginación; encabezado con razón social/RUC, Editar empresa y Volver a empresas precede al formulario readOnly. Editar directo o desde ficha conserva ese contexto. Cancelar edición retorna a la consulta con datos originales; cancelar alta vuelve a lista. Guardar en mantenimiento retorna a la ficha del resultado DB, conservando la nueva versión; desde Matrícula mantiene selección mediante choose. Búsqueda/página de la lista se conservan al volver.

Lint, typecheck, 185 pruebas unitarias, build y diff --check correctos. Caso nuevo verifica reemplazo de lista, botón Editar anterior a campos, cancelación sin escritura y recuperación de filtro/página; regresión de guardado versionado/selección Matrícula vigente. Sin cambios DB/RPC ni Spec aprobado. Gate 2 y ensayo visual humano pendientes.


## 2026-11-02 — Volver a alumnos desde la ficha

Solicitud humana: botón de retorno al listado en Ficha del alumno, similar a Empresas. En consulta se agrega Volver a alumnos junto a Editar alumno; navega a /alumnos y comparte distribución/espaciado de acciones del encabezado con Empresas. En edición se conserva el flujo Guardar/Cancelar, sin introducir una salida que descarte el borrador desde ese encabezado. Sin cambios DB, permisos ni Spec. Verificación: lint, typecheck, suite EnrollmentPages, build y diff --check. Gate 2 pendiente.


## 2026-11-02 — Estandarización de Materias, Carreras y Ciclos

Autorización humana posterior a la revisión UX: «haz los cambios, debemos estandarizarnos para q no parezcan sistemas distintos». Se alinea H2 con el patrón actual de Alumno/Empresa, manteniendo los contratos y reglas académicas de H2/H3.

Las tres listas usan barra con lupa, búsquedas/filtros existentes, crear/recargar con icono y tooltip, grilla con acciones a la derecha y navegación de 30 resultados. Orden DB created_at DESC e id DESC; filtros reinician a página 1. Abrir Ver/Editar/Crear sustituye el listado; Volver recupera la página/filtros y el foco. Recargar está disponible únicamente en la lista y ya no reinicia un editor abierto. Ver muestra la misma ficha y sus campos en readOnly; Editar arriba respeta los roles y estados existentes. Cancelar retorna a la consulta original o a la lista en alta; Guardar retorna a la ficha leída del resultado DB con su nueva versión.

Materias incorpora consulta completa para ambos roles académicos; Director mantiene creación/edición/inactivación/reactivación y sus motivos/viabilidad/confirmaciones existentes. Carreras separa Datos generales y Materias en pestañas con controles montados, conservando borrador y selección al navegar/filtrar. Consulta muestra modalidad y materias asociadas con estado. Se protege guardado mientras se cargan las asociaciones o si falló su lectura; se conserva mínimo una activa, sigla/manual y confirmaciones de propagación e historia. Errores de campos en otra pestaña abren esa sección y enfocan el control mediante InlineForm existente.

Ciclos usa la misma ficha para consulta/edición, con Datos, Materias y Estado; fechas de consulta y grilla DD/MM/AAAA. Director/Coordinador mantienen edición solo en PROGRAMADO/EN_CURSO; únicamente Director cambia estado, con los mismos destinos/motivos/confirmaciones. Terminales permanecen readOnly sin reabrir ni editar. Se conservan materias heredadas/adicionales, origen, historial y retiro/reactivación explícitos. Si hay cambios locales de datos/adicionales, las operaciones separadas de materias/estado esperan guardar o cancelar para no descartar ese borrador. Cancelar edición continúa disponible en Estado. Concurrencia y expected_updated_at siguen en las RPC concretas existentes, sin retries.

AcademicLayout.tsx contiene solo presentación reutilizada por estas tres pantallas: acciones, campos de búsqueda, paginación, encabezado y pestañas. No agrega un motor CRUD, comandos DB, tablas, RPC, helpers privados, policies, permisos ni dependencias. Los cuatro documentos aprobados H2/H3 y sus Gates permanecen intactos; la aceptación histórica H2 no se reescribe. Ninguna operación/reset sobre los datos humanos locales.

Validación: lint y typecheck correctos; 194 pruebas unitarias/DOM (12 archivos), incluidas regresiones H1/H2/H3; 57 pruebas académicas repetidas tras ajustar cancelación de Estado; build y test:build-safety satisfactorios; diff --check sin errores. Nueve casos nuevos cubren las tres listas/paginación/orden/retorno, consulta por Coordinador, pestañas/borrador/foco de validación, fechas/permisos de Ciclo, bloqueo de operaciones que descartarían cambios y retorno de guardado/versiones de Materia. Las pruebas previas de inactivación, sigla, propagación, razones, estados terminales y confirmaciones siguen verificando sus contratos, adaptando la navegación a las pestañas visibles. Permanece la advertencia conocida del tamaño del bundle. Revisión visual humana y Gate 2 de H3 pendientes; no se atribuye ejecución real de RLS/concurrencia con reset en esta iteración de UI.


## 2026-11-02 — Búsqueda única por código/nombre y eliminación de Recargar

Solicitud humana: que el cuadro busque tanto código como nombre; en Ciclos confirmó «Solo nombre de Carrera» como campo adicional al código del Ciclo. Materias y Carreras tienen un solo input, con OR por código/nombre, coincidencia parcial sin distinguir mayúsculas y filtro de estado aplicado por separado. Se eliminan los dos inputs anteriores y su combinación AND. La paginación y el orden se conservan; escribir reinicia a página 1 y limpiar elimina el filtro de texto.

Ciclos usa código de Ciclo OR nombre de Carrera. Se resuelven IDs de Carrera desde las referencias leídas antes de consultar la página de Ciclos y se filtran en DB junto al código; no se filtra únicamente la página ya recibida. No se incluyen promoción ni código de Carrera. El placeholder lo indica explícitamente. Los operandos de .or se citan para que comas/comillas/paréntesis del texto no se conviertan en operadores. Sin nuevas RPC, migraciones, permisos ni cambios de contratos.

El usuario señaló que Recargar información no existe en Alumno/Empresas. Se elimina de las tres listas académicas, incluido el icono sin uso. Se conservan las actualizaciones automáticas tras las operaciones existentes; no se descarta un borrador por una acción de recarga manual.

Verificación: lint, typecheck, 198 pruebas unitarias/DOM, build y diff --check. Casos nuevos comprueban un solo cuadro, OR por ambos campos, estado independiente, limpieza, texto con puntuación y búsqueda de Ciclos por nombre de Carrera excluyendo promoción/código de Carrera. Las tres listas verifican ausencia de Recargar y conservación de paginación/retorno. Spec aprobado y Gate 2 intactos; sin reset/escrituras sobre datos humanos locales.


## 2026-11-02 — Modalidad opcional y orden de Carrera

Por solicitud humana se suben Modalidad/Sigla debajo de Código/Nombre y se deja Descripción al final. Modalidad deja de ser obligatoria en React y PostgreSQL; Sigla, catálogo, autorizaciones, asociaciones, mínimos y concurrencia mantienen sus reglas. [CHG-H3-002](approved-career-modality-amendment.md) registra la diferencia funcional posterior a la base aprobada.

Migración aditiva `20261102010000_h2_optional_career_modality.sql` aplicada localmente sin reset; Carreras, Ciclos, snapshots, asociaciones y auditoría existentes conservados. Inventario exacto de seguridad validado. Regresión SQL de RPC reales con datos sintéticos/rollback satisface opcionalidad y valida catálogo/activos, legado, mínimo de Materias, Sigla, permisos y versiones, sin cambios persistentes. 198 tests unitarios, lint/typecheck/build/diff --check correctos; integración de entorno limpio actualizada sin ejecutarla sobre datos humanos. Gate 2 y revisión visual pendientes.

Comprobación adicional posterior a la migración: `npm run test:local` PASÓ; Data API pública sin rutas protegidas e inventario exacto de grants/RLS/helpers/RPC.


## Actualización 02/11/2026 — CHG-H3-003

[Experiencia, modalidad y códigos de operación](approved-career-student-code-amendment.md), por solicitud y aclaración humanas posteriores al Gate 1. Carrera separa experiencia Sí/No (default No) de enseñanza (default Presencial); conserva CON/SIN antiguos como valores inactivos y convierte su significado al flag. Sigla/Nombre arriba, Modalidad/Experiencia en segunda fila. Materia/Carrera conservan codigo técnico nullable fuera de UI y comandos. Alumno incorpora código DB automático e inmutable A-0000001 con secuencia global, sin garantía gapless. Los snapshots históricos no se reescriben.

Migración 20261102020000 aplicada incrementalmente sin reset: huellas y mapeo previo/posterior verificados. Tres regresiones SQL reales con rollback y ocho transacciones concurrentes con códigos únicos pasaron, sin retries ni cambios a registros existentes. Inventario: 22 tablas públicas / 17 RPC / 16 helpers / 25 policies SELECT, más una secuencia privada sin acceso directo de producto. Los documentos aprobados H2/H3 se preservan. Gate 2 permanece pendiente.

Validación CHG-H3-003: lint, typecheck, 199 tests en 12 archivos, build, test:local, test:build-safety y git diff --check PASARON. Bundle 609.70 kB con advertencia conocida >500 kB. Los harness completos test:academic/test:enrollment fueron adaptados al contrato actual e incluyen la nueva regresión DB; su ejecución con reset se reserva a CI aislada, sin reset de datos humanos locales. CI del nuevo commit: pendiente de publicación/verificación. Pruebas humanas y Gate 2 pendientes.


Ajuste visual 02/11/2026: se elimina el padding heredado de checkboxes en Con experiencia para alinear su etiqueta/control con Modalidad. Carrera reduce márgenes, separaciones y padding del panel; Descripción de Materia/Carrera inicia en dos líneas con altura compacta y conserva redimensionado vertical y límite 500. Sin cambios funcionales ni DB.


Ajuste UX 02/11/2026: altas/ediciones guardadas correctamente de Materia, Carrera, Ciclo, Alumno y Empresa retornan a su grilla, recargando los datos. Errores/conflictos conservan el formulario. Los editores de Alumno/Empresa embebidos en matrícula conservan sus callbacks de selección. Carrera ordena Nombre/Sigla en la primera fila por nueva indicación humana. Sin cambios DB, permisos o reglas funcionales.


Ajuste visual 02/11/2026: selector Materias de Carrera con filas compactas, nombre y estado en la misma línea cuando hay espacio, menor padding y altura mínima 2.5rem. Conserva selección por checkbox/fila, resaltado, buscador y wrap en espacios estrechos. Sin cambios funcionales.


Ajuste visual 02/11/2026: Datos del Ciclo ordena Carrera/Nombre de promoción en primera fila e Inicio/Fin en segunda, seguido de Ubicación. Se elimina el subtítulo redundante Datos principales y la ayuda repetitiva de longitud para Promoción; conserva límite 150. Panel, separaciones y footer compactos; campos de fecha alineados al ancho de su columna, con una columna en móvil. Mismo orden en consulta/edición y reglas/validaciones intactas.


Ajuste visual 02/11/2026: Estado del Ciclo integra título/estado actual en una cabecera compacta y elimina la tarjeta de formulario anidada y subtítulo repetido. Selector/motivo comparten grilla; detalle inicia con dos líneas ampliables. Márgenes/padding reducidos; conserva advertencia de irreversibilidad, confirmación, autorización Director, validación, bloqueo por borrador pendiente y Cancelar edición accesible. Sin cambios DB.


## UX — Materias del Ciclo, 02/11/2026

Por solicitud humana, una sola tabla Materia/Origen/Estado/Acción sustituye los bloques Carrera y disponibles. HEREDADA se presenta Carrera; ADICIONAL, Adicional. Activas por defecto y checkbox Mostrar retiradas para historial, sin borrar relaciones. Retirar/Reactivar son botones de texto y mantienen confirmación; retirar una de Carrera aclara que continúa perteneciendo a la Carrera y se retira únicamente del Ciclo.

Agregar materia adicional busca por nombre sin listar el catálogo completo, muestra hasta ocho coincidencias y permite precisar el término. Excluye inactivas y cualquier relación del Ciclo, incluidas retiradas; estas se reactivan explícitamente desde su fila. Al crear, tabla única de previsualización y adicionales pendientes con Quitar antes del guardado atómico. En un Ciclo existente, Agregar usa guardar_ciclo existente con versión optimista y adicionales seleccionadas; Retirar/Reactivar usa cambiar_materia_ciclo. No hay RPC, tablas ni cambios SQL. Borradores de Datos pendientes bloquean comandos separados; errores/conflictos preservan selección y no reintentan. Carga fallida de relaciones bloquea búsqueda/modificaciones. Permisos/terminalidad/invariantes H2/H3 siguen DB-side.

Validación UX Materias del Ciclo: 205 pruebas en 12 archivos, lint, typecheck, build y git diff --check satisfactorios. Casos nuevos cubren tabla única, filtro de historial, búsqueda acotada/exclusiones, agregar con versión, alta con adicionales pendientes, conflicto sin retries, fallo de carga y terminales sin mutaciones. Recorrido visual humano y Gate 2 pendientes.


Ajuste visual 02/11/2026: tabla Materias del Ciclo con padding vertical de celdas .55rem y cabecera .65rem, contenido centrado verticalmente y botones sin margen extra. Densidad moderada, conservando legibilidad/acciones y sin afectar otras grillas ni reglas.


[CHG-H3-004 — Matrícula con pestañas y búsqueda de Alumno](approved-enrollment-tabs-amendment.md), autorizada humanamente el 02/11/2026: Datos de matrícula/Cargos/Resumen sustituyen el Stepper; búsqueda reactiva por ambos apellidos, nombres y documento, conservando código de Alumno. Misma transacción DB y reglas funcionales; sin SQL nuevo. Es posterior al Gate 1 original y no modifica los cuatro documentos aprobados. Gate 2 pendiente.

Validación CHG-H3-004: 212 pruebas en 12 archivos, lint, typecheck, build y diff --check satisfactorios. Consulta real de solo lectura a Data API local con Coordinador autenticado sintético: filtros por palabras y puntuación entrecomillada aceptados; fixtures de identidad retirados y sin modificar alumnos. El harness test:enrollment incorpora búsqueda combinada de apellido/documento y puntuación para CI aislada; no se ejecutó su batería completa ni reset sobre la DB humana. Sin cambios en documentos aprobados.


## UX vigente — CHG-H3-005 (02/11/2026)

[Registro de matrícula dentro de Ciclo](approved-cycle-enrollment-amendment.md), autorizado humanamente después del Gate 1: Datos/Materias/Matrículas/Estado, una grilla de matriculados y panel lateral de búsqueda/lista de candidatos, cargos y confirmación individual. Sustituye navegación de CHG-H3-004, conserva búsqueda y transacción DB. Se retira Matrícula del menú y la ruta antigua redirige a Ciclos; detalle/historial permanecen con regreso contextual. Nuevo/editar Alumno conserva formulario completo fuera del panel. Sin SQL ni cambios en Spec aprobado. Gate 2 pendiente.

Validación CHG-H3-005: lint, typecheck, 226 pruebas en 13 archivos, build y git diff --check satisfactorios. Prueba real de solo lectura con Coordinador sintético: join matrícula/alumno, filtro de Ciclo, conteo exacto, paginación y búsqueda relacionada aceptados por Data API; identidades retiradas, sin modificar alumnos/matrículas ni reset. Inventario de seguridad exacto verificado, sin objetos DB nuevos. El harness test:enrollment incorpora consulta relacionada real para CI aislada; no se ejecutó su batería completa sobre la DB humana. Bundle conserva advertencia conocida >500 kB. CI del nuevo commit pendiente de publicación/verificación; revisión visual/teclado/SO y Gate 2 pendientes.


[CHG-H3-006 — Buscar y Agregar; edición individual](approved-quick-add-amendment.md), precisión humana del 02/11/2026: el buscador solo lista candidatos con Agregar; registra inmediatamente mediante la RPC existente con cargos obligatorios, sin patrocinador/opcionales/descuento/código manual. Solo éxito DB actualiza grilla; Editar matrícula abre pantalla completa para datos individuales. Error obligatorio impide registro parcial; historia/constraints intactos. Sustituye panel de CHG-H3-005, sin modificar Spec aprobado ni autorizar Gate 2.

Validación CHG-H3-006: 231 pruebas en 13 archivos, lint, typecheck, build y diff --check satisfactorios. Casos cubren Agregar sin confirmación, payload mínimo/solo obligatorios, actualización de grilla y búsqueda continua, exclusión de anuladas, fallo obligatorio sin fila ficticia, cierre/navegación bloqueados durante RPC, conflictos y respuestas inciertas sin retry, Ver frente a Editar individual con versión. El harness test:enrollment añade alta rápida con cargos obligatorios y descuento cero para CI aislada; no se ejecutó su batería completa ni reset sobre la DB humana. Sin migraciones ni cambios a documentos aprobados. CI del nuevo commit pendiente de publicación; pruebas humanas y Gate 2 pendientes.


## Estandarización UX — Tarifas (02/11/2026)

Por observación humana, Tarifas sustituye listado de viñetas/formulario mezclado por barra con lupa, búsqueda Código/Nombre, estado, nueva tarifa con icono/tooltip, grilla compacta con acciones Ver/Editar/Activar-Inactivar y paginación 30 por registro descendente. Ver oculta la grilla y abre ficha readonly con Volver/Editar; misma distribución en edición, montos numéricos y descripción compacta. Guardar regresa a grilla actualizada conservando filtros; error/conflicto conserva formulario sin retry. Activación confirma sin recalcular cargos históricos.

Tarifas por Ciclo se abre en vista propia con Volver, selector y tabla de selección/importe/obligatoria. Mantiene autorización solo Director y estados permitidos; consulta para Coordinador y terminales. Configuración no cargada/error bloquea guardar, evitando reemplazo vacío. Usa exactamente guardar_tarifa, cambiar_activo_tarifa y guardar_ciclo_tarifas existentes con versiones; sin cambios SQL, permisos, reglas económicas, snapshot/historia ni Spec aprobado. Se comparte el formateador de errores existente entre pantallas, sin dependencias ni helper DB nuevo. Gate 2 pendiente.

Validación de estandarización Tarifas: 241 pruebas en 14 archivos, lint, typecheck, build y diff --check satisfactorios. Casos específicos de grilla/búsqueda, consulta/edición separadas, alta y regreso a grilla, conflicto sin retry, importes negativos, permisos de Coordinador/Director, confirmación de activación, configuración por Ciclo con versión y bloqueo por terminalidad/fallo de carga. Sin reset, SQL nuevo ni cambios de Spec. Revisión visual humana y Gate 2 pendientes.


Corrección UX 03/11/2026: el guardado de Tarifa con código duplicado (23505) identifica el código concreto, aclara que también se reserva si la tarifa está inactiva y permite cambiarlo o editar la existente. Marca/focaliza Código tarifa con error asociado, conserva los demás valores y limpia el error al corregir el código. No expone SQL ni mensajes ajenos de RUC/Alumno. La unicidad sigue en DB; sin cambios de reglas/migraciones ni retries.


[CHG-H3-007 — Tarifas dentro de Ciclo](approved-cycle-tariffs-amendment.md), autorización humana 03/11/2026: ficha Datos/Materias/Tarifas/Matrículas/Estado, grilla de conceptos asignados y agregar desde catálogo con monto inicial, importe propio/obligatoriedad/retiro antes de guardar. Solo Director modifica, Coordinador/terminales consultan. Se elimina editor duplicado del menú Tarifas; catálogo permanece allí. Avisos precisos de CARRERA obligatoria y configuración pendiente antes de matricular. Versiones y borradores coordinados entre pestañas; cargos históricos intactos. Sin cambios SQL/Spec aprobado. Gate 2 pendiente.

Validación CHG-H3-007: 253 pruebas en 15 archivos, lint, typecheck, build y git diff --check satisfactorios. Casos cubren agregar/default del catálogo, importe local/obligatoriedad, exclusiones, retiro/cancelación y payload completo con versión, conflicto sin retry, roles/terminales, fallo de carga, condición CARRERA para matrícula, borrador entre pestañas y versión actualizada para guardar Datos después. Sin reset ni migraciones. Suite DB completa reservada a CI aislada; RPC/reglas económicas existentes no modificadas. CI del nuevo commit pendiente de publicación/verificación; revisión humana y Gate 2 pendientes.


Ajuste UX 03/11/2026: en edición de Ciclo, una barra común Cancelar/Guardar Ciclo permanece visible en Datos/Materias/Tarifas/Matrículas/Estado. Guardar se vincula al formulario de Datos para conservar validación/foco y RPC única; Tarifas y transición de Estado conservan sus comandos específicos. Cancelar descarta también borrador de Tarifas. Paginación de matriculados se oculta si hay una sola página y se etiqueta Página anterior/Página siguiente para distinguirla de un Stepper. Sin cambios DB/Spec.


Estandarización UX 03/11/2026: Ficha de matrícula adopta cabecera compartida Volver/Editar, contexto Alumno/Ciclo y pestañas Resumen, Cargos e Historial. Resumen presenta patrocinador/total vigente; Cargos separa conceptos vigentes y comandos concretos de edición; Historial muestra cargos retirados y snapshot mediante campos legibles y etiquetas históricas, sin JSON técnico. Anulación permanece separada y exige motivo; terminalidad y descuento solo Director conservan reglas existentes. Un fallo de carga de conceptos bloquea guardar opciones incompletas. Sin RPC, tablas, migraciones ni cambios al Spec aprobado.

Validación de ambos ajustes UX: lint, typecheck, 256 pruebas en 15 archivos, build y git diff --check satisfactorios. Pruebas cubren barra común/guardado desde otra pestaña, paginación de una página, consulta/edición con versión y separación cargos vigentes/históricos. Build conserva aviso de bundle mayor a 500 kB. Sin reset ni ejecución de migraciones sobre datos humanos. Revisión visual humana y Gate 2 pendientes.


Ajuste UX 03/11/2026: el formulario de descuento en edición individual de matrícula se abre explícitamente desde Cargos, solo para Director. La acción indica Aplicar descuento o Modificar descuento según el cargo CARRERA vigente y precarga el importe actual; exige nuevo motivo cuando corresponde. Cancelar descuento descarta el borrador sin RPC; Aplicar usa editar_matricula con versión y cierra únicamente tras éxito. Grilla conserva descuento/total visibles. Sin cambios DB ni reglas de autorización/montos.

Validación del ajuste de descuento: lint, typecheck, 258 pruebas en 15 archivos, build y git diff --check correctos. Pruebas específicas: apertura/cancelación sin escritura, importe vigente, guardado con versión y acción ausente para Coordinador. Revisión humana y Gate 2 pendientes.


Ajuste UX 03/11/2026: búsqueda para agregar matrículas presenta tabla Alumno (APELLIDOS, NOMBRES), DI y acción Agregar. Se traducen validaciones DB conocidas de ficha incompleta, contacto activo/válido, tarifa Carrera obligatoria, Ciclo elegible, opcionales y geografía en mensajes concretos; errores desconocidos conservan mensaje seguro sin exponer SQL. No se cambia la autoridad DB ni se reintenta automáticamente. Sin migraciones ni modificación del Spec aprobado.

Validación: lint, typecheck, 263 pruebas en 16 archivos, build y git diff --check correctos. Una primera ejecución tuvo un timeout de una prueba previa de carga de Tarifas; la repetición completa pasó. Tabla del buscador sin ancho mínimo global, DI compacto y acción Agregar con ancho propio/texto sin salto. Revisión visual humana y Gate 2 pendientes.

Precisión humana: resultados incluyen Tipo DI obtenido de catalogo_valor mediante la FK existente y número con ancho de unos 20 caracteres en escritorio; panel ampliado, adaptación móvil y botón Agregar sin partir texto. Sin cambios DB.


Corrección UX 03/11/2026: Contactos ya no se bloquea únicamente por abrir Editar alumno (incluido retorno desde matrícula). Permite alta/edición/retiro cuando la ficha no tiene cambios pendientes. Si hay borrador real, explica que debe guardarse/cancelarse antes de la operación independiente. Tras guardar/retirar contacto recarga ficha y versión del alumno antes de seguir editando, evitando conflicto por la propia actualización del contacto. RPC y conflictos DB permanecen intactos; sin cambios SQL.

Validación: lint, typecheck, 53 pruebas de EnrollmentPages (incluido alta de contacto en modo edición y guardado posterior con versión actualizada), build y diff --check correctos. Revisión humana y Gate 2 pendientes.


UX Cargos 03/11/2026: precisión humana registrada en CHG-H3-006. Tabla única compacta con tarifas seleccionables y totales; vista previa respeta importes/descuentos históricos vigentes y suma solo seleccionadas, sin escribir hasta Guardar cargos. Traslado se abre mediante Cambiar Ciclo, con selector y reinicio de descuento existente. Descuento se bloquea ante cambios pendientes de cargos. Sin SQL/migraciones ni modificaciones de Spec aprobado.

Validación Cargos: lint, typecheck, 265 pruebas en 16 archivos, build y git diff --check correctos. Incluye grilla única, selección/obligatorias, totales al desmarcar, importe histórico conservado, payload/versiones de guardado y traslado explícito. Sin reset ni migraciones. Revisión visual humana y Gate 2 pendientes.


UX 03/11/2026: traslado de matrícula como acción Cambiar Ciclo en grilla, con diálogo específico y RPC editar_matricula existente. Se elimina selector/consulta de destinos de la ficha Cargos, que guarda únicamente conceptos del Ciclo actual. Versiones, terminalidad, historia y reinicio de descuento conservados. Diálogo bloquea cierre durante transacción, recarga grilla tras éxito y trata respuesta incierta sin retry. Sin SQL, nuevas tablas/RPC ni cambio del Spec aprobado; precisión registrada en CHG-H3-006.

Validación traslado: lint, typecheck, 268 pruebas en 16 archivos, build y diff --check correctos. Casos nuevos: diálogo desde grilla, exclusión Ciclo actual, confirmación con versiones sin descuento/código enviados, actualización de origen, conflicto sin retry, ausencia para anuladas y bloqueo por borrador. Pruebas humanas y Gate 2 pendientes.


UX 03/11/2026: Aplicar/Modificar descuento abre modal centrado reutilizando el diálogo existente, con importe vigente, motivo y Cancelar/Aplicar. Botón en misma fila que Guardar cargos, al extremo derecho de la tabla. Conserva rol Director y bloqueo por cargos pendientes; Escape/cancelación bloqueados durante RPC, error visible dentro del modal y conflicto conserva borrador sin retry. Sin SQL ni cambios funcionales del Spec.

Validación modal: lint, typecheck, 55 pruebas de EnrollmentPages, build y git diff --check correctos. Incluye apertura/cancelación, payload con versión, bloqueo de cierre durante RPC, conflicto visible con borrador conservado y restauración de foco. Revisión visual humana y Gate 2 pendientes.


Corrección de validación 03/11/2026: modal de descuento muestra máximo según importe original del cargo Carrera vigente (no total con otros conceptos) y marca/focaliza importe excesivo con mensaje específico antes de RPC. Permite exactamente el límite. Constraint DB existente permanece autoridad; rechazo conocido de ese constraint se traduce sin SQL ni detalles de fila. Se mantiene motivo/rol/versiones. Sin migraciones ni cambio de reglas del Spec.

Validación límite descuento: lint, typecheck, 271 pruebas en 16 archivos, build y git diff --check correctos. Casos: exceso sin RPC, importe máximo aceptado, límite solo Carrera y traducción de constraint DB sin SQL. Revisión humana y Gate 2 pendientes.


Corrección harness CI 03/11/2026: TEST-H3-010-011 construía actualización de Alumno desde fila completa y reenviaba codigo_alumno, rechazado correctamente por assert_fields de guardar_alumno con 22023. Se excluye ese campo automático igual que id/fechas técnicas y se comprueba que el código devuelto no cambie tras editar nombres. Se revisó la otra reconstrucción de payload (ficha incompleta), que ya lo excluía. Sin cambios a ci.yml, RPC, migraciones, permisos ni reglas; sin reset de DB humana. Sintaxis Node, lint y git diff --check correctos. Reejecución DB/API completa pendiente de CI aislada.


Corrección prueba asíncrona CI 03/11/2026: CycleTariffs comprobaba onReadyChange inmediatamente después de encontrar la tabla, antes de que el efecto posterior al render notificara true. Se espera explícitamente el callback con waitFor; sin sleeps, ampliación de timeout ni retries de suite. Caso adicional con promesas controladas comprueba null hasta completar catálogo y asignaciones, y true solo después. Sin cambio al componente, contratos, DB ni ci.yml.

Validación: lint, typecheck, 272 pruebas en 16 archivos y git diff --check correctos. CI aislada pendiente de nueva ejecución; sin reset ni operaciones sobre datos humanos.


## CHG-H3-008 — Información DICAPI y carga de pesca (04/11/2026)

[Enmienda autorizada](approved-career-dicapi-amendment.md): cinco columnas opcionales exclusivamente en Carrera, pestaña Información DICAPI en consulta/edición y búsqueda por código oficial. Se extiende guardar_carrera existente con tipos/allowlist, constraints, conservación de campos omitidos y limpieza explícita; permisos/versiones/sincronización H2/auditoría existentes. No se introduce JSONB normativo, tablas, RPC, helpers ni policies.

Migraciones 20261104010000_career_dicapi_metadata y 20261104020000_initial_dicapi_fishing_courses. Carga inicial: MAM-009/MAM-010, 16 materias distintas y 17 asociaciones (10/7), resolución de malla 1052-2024, fecha 27/12/2024 y autorización PERÚ MAR 072-26; sin horas por materia. Fuente oficial y transcripción en reference/dicapi-fishing-curricula.json. Reutiliza coincidencias exactas y completa faltantes, sin borrar/reactivar ni sobrescribir campos no vacíos. Nuevas siglas MAM009/MAM010, Presencial, sin experiencia. En base vacía, la misma carga se ejecuta tras seed.sql para disponer de referencias; en existente se ejecuta como migración incremental. Sin motor de mantenimiento. Las asociaciones de Ciclos previos se conservan.

Aplicación local incremental sin reset: 2 cursos, 10/7 asociaciones y 16 materias creadas; segunda ejecución sin cambios (huella de carreras/materias/asociaciones idéntica). Huellas de Alumno, Matrícula, Ciclo, ciclo_materia, cargos y auditoría intactas. Auditoría técnica de carga suspendida solo para tres triggers bajo lock/transacción y restaurada; auditoría de producto verificada mediante RPC con actor sintético.

Validación: lint, typecheck, 274 pruebas en 16 archivos, build y git diff --check satisfactorios. SQL real con rollback: normalización/lectura de cinco campos, auditoría, conservación con clientes anteriores, limpieza NULL, rechazo de formato/longitud/fecha/campos desconocidos, rechazo a Coordinador y conflicto sin retry. Inventario de seguridad verificado: 22 tablas/17 RPC/16 helpers/25 SELECT policies; 12 migraciones. Harness CI verifica materias oficiales y repite carga en rollback. No se ejecutó reset ni batería destructiva DB/API sobre la base humana. CI del commit pendiente de publicación; revisión visual humana y Gate 2 pendientes. Build conserva advertencia de bundle mayor a 500 kB.


Precisión humana CHG-H3-008 (04/11/2026): se agrega URL de resolución de malla opcional con enlace Abrir resolución de malla. Migración 20261104030000 aplicada incrementalmente y completados los dos enlaces oficiales; sin reset. Ruta con mayúsculas preservada, HTTPS validado en frontend/DB, enlaces con noopener/noreferrer, vacío/omisión compatibles. SQL real/rollback verifica URL preservada, rechazo de esquemas peligrosos y exceso de longitud, limpieza y permisos existentes. Carga de enlaces repetida sin cambios. Inventario sin nuevos objetos salvo una columna, 13 migraciones.

Validación URL: lint, typecheck, 74 pruebas AcademicPages, build y diff --check satisfactorios; SQL real de URL/rollback, enlace inicial idempotente y seguridad exacta verificados. Revisión humana y Gate 2 pendientes.


CHG-H3-009 (04/11/2026): Curso/Asignatura en vocabulario visible de frontend, incluidas referencias de Ciclos, tarifas/descuento y auditoría legible. Solo presentación; comparación AST de consultas from/rpc/select/eq/in/order/range/or/ilike y rutas path/to confirma contratos sin cambios. Datos de fixtures, códigos CARRERA y mensajes DB reconocidos se mantienen. Sin migraciones ni operaciones DB en este ajuste; documentación vigente enlaza la precisión, fuentes aprobadas congeladas intactas.

Validación CHG-H3-009: lint y typecheck correctos; 275/275 pruebas unitarias/UI correctas. Verificación AST: llamadas Supabase y rutas sin cambios. Sin modificaciones en migraciones ni en los cuatro documentos aprobados.
Build correcto; persiste aviso conocido de bundle superior a 500 kB. git diff --check correcto.

CHG-H3-010 (04/11/2026): se amplía la carga inicial a los seis Cursos autorizados por RD 072-26. Nueva migración 20261104040000 añade MAM-037/038/039/048 con 9/5/5/8 asignaturas. Mallas 1052-2024 y 855-2021 por curso, con URL oficial; transcripción en dicapi-authorized-curricula.json. Total base vacía: 31 asignaturas/44 asociaciones. Sin objetos nuevos; 14 migraciones. Aplicación local incremental, sin reset.

Validación CHG-H3-010: lint, typecheck y git diff --check correctos. Migración probada primero con rollback (conteos 10/7/9/5/5/8), aplicada localmente sin reset; 11 grupos académicos DB/API correctos, metadata DICAPI/permisos/rollback, carga repetida sin duplicados ni cambios de datos, preservación de personalizaciones/asignaturas inactivas/ciclos/auditoría y 8 transacciones concurrentes de código Alumno correctas. Conteo de usuarios de prueba ajustado al total real para permitir regresión en base local con usuarios humanos. No se ejecutó reset de base vacía local; bootstrap completo queda cubierto por CI. No hay cambios en frontend ni arquitectura. Pruebas humanas y Gate 2 pendientes.

Corrección de residuos de pruebas (04/11/2026): test:academic dejó fixtures de negocio en la base humana; su finally solo retiraba usuarios. El usuario autorizó limpiar los residuos reportados. Se verificaron por UUID de actor CREATE, auditoría y tags exactos 186F60A6/5161C478, sin cambios humanos posteriores ni matrícula/tarifa ni referencias compartidas externas. Copia local ignorada en .cache/academic-fixtures-186F60A6-5161C478-backup.json. Limpieza administrativa excepcional de datos exclusivamente sintéticos: 10 cursos, 20 asignaturas, 12 ciclos y relaciones, sin reset ni reinicio. No elimina historia funcional humana ni auditoría; no altera correlativos ni los seis cursos oficiales. Backup cotejado antes de aplicar; transacción con locks y comprobación de igualdad de datos no afectados. No se convierte esta reparación puntual en comando de producto ni migración general.

Prevención: test:academic exige CI=true y GITHUB_ACTIONS=true antes de crear fixtures. Tres pruebas de proceso comprueban rechazo sin variables o con solo una de ellas, sin fixture-create. La suite completa sigue destinada al workflow desechable existente; no se volvió a ejecutar sobre la base humana. README actualizado con el límite y verificación local con rollback.
Validación final: 3/3 pruebas de protección, lint, typecheck y git diff --check correctos. Cero residuos por los dos tags; los seis Cursos oficiales mantienen 10/7/9/5/5/8 asignaturas; cero triggers de auditoría deshabilitados.
