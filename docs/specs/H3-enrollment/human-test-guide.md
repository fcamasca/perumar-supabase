# H3 — Guía de revisión humana pendiente

No es acceptance ni Gate 2. Usar exclusivamente datos sintéticos, nunca datos personales reales ni credenciales en chat. El reset carga los 41 valores autorizados de los siete catálogos y los dos tipos DI aprobados; ver [valores](catalog-values.md). No requiere ejecutar suites ni sembrar valores TEST para habilitar la UI.

1. Con Node 24.19.0 y npm 10.9.0, usar comandos existentes supabase:start, supabase:reset, test:local bajo guard H0. Sin link remoto ni cambios de firewall.
2. fixtures:human crea actores D/O/A con contraseña introducida de forma oculta por la persona; no solicitar/registrar esa contraseña aquí. Crear alumnos/empresas con datos sintéticos desde la UI y utilizar las listas autorizadas ya disponibles tras reset. test:enrollment es una suite técnica opcional, no una preparación obligatoria de la prueba humana.
3. Arrancar npm run dev en 127.0.0.1:5173; entrar con cada identidad permitida. No se entrega contraseña predefinida.
4. Recorrer Nuevo Alumno por cinco pasos, errores/foco, opcionales/catálogos/geografía, contactos activos e inactivos. Editar ficha existente por pestañas y revisar historial de matrículas.
5. Director mantiene tarifas y configuración por Ciclo; ambos roles operan empresa mínima. Matricular en PROGRAMADO/EN_CURSO con opciones diferentes; revisar cargos servidor, descuento Director, código manual y fotografía histórica.
6. Matricular otro alumno conserva solo Ciclo y limpia datos anteriores; nuevo alumno desde matrícula retorna al flujo. Ediciones patrocinador/opciones no repricing; retiro/reagregado opcional conserva historia y crea UUID nuevo.
7. Cambiar Ciclo por Coordinador conserva cargos viejos INACTIVO/CAMBIO_CICLO y crea nuevos con cero descuento; Director puede aplicar nuevo descuento después. Código/snapshot originales no regenerados.
8. Ciclo con activas bloquea Carrera; solo anuladas permite cambio bajo H2 sin reescribir matrícula histórica. Ciclo terminal bloquea edición ordinaria de matrícula, pero ambos roles pueden anular con motivo; anulada solo consulta.
9. TEST-H3-040/041/042: registrar navegador/SO, teclado, Tabs/foco/modal/errores, cuatro temas/persistencia/identidad, estados sin solo color y forced-colors real separado de emulación. Si no verificable, documentar NO VERIFICADO para decisión, nunca PASSED ficticio.
10. TEST-H3-044: seguir UI→RPC→rol/versiones→constraints/cargos/snapshot→auditoría, inspeccionar inventario y mantenibilidad; no aceptar API oculta ni nuevas capas por rutina. TEST-H3-045 requiere decisión humana independiente sobre candidato exacto, después de validar el candidato técnico y completar la revisión humana.

Al concluir ensayo: retirar fixtures por IDs/proceso controlado o reset local desechable, comprobar test:local y detener supabase:stop. No merge, acceptance o H4 sin autorización correspondiente.


## Comprobación complementaria de ficha y contactos — 28/10/2026

Pendiente de ejecución humana sobre el candidato correspondiente, dentro de TEST-H3-040/041/042:

- Comparar Ver y Editar: mismo encabezado, pestañas y ubicación de campos. Modificar varias secciones mediante clic/flechas y comprobar que el borrador permanece; Cancelar restaura los datos guardados.
- Desde Resumen, Guardar con un obligatorio vacío en otra pestaña: debe abrir esa sección y enfocar el campo. Comprobar también enlaces del resumen de errores. Un conflicto de versión debe conservar el borrador y exigir resolución explícita.
- Comparar Resumen con Revisar del registro: ficha completa, etiquetas de catálogos/geografía, fecha, cm/kg, ocupación/OTROS y todos los contactos con su estado.
- En Contactos comprobar todas las columnas, tooltips/foco de acciones a la derecha, edición validada y Retirar con confirmación sin borrar historia. Inactivos sin acciones de modificación. Con edición de Alumno pendiente, consultar contactos sin modificarlos hasta guardar/cancelar.
- En Nuevo Alumno, agregar varios contactos a la misma grilla, editar uno, cancelar otra edición y quitar uno. Estado Por guardar; no deben persistir hasta Guardar final. Revisar debe reflejar la lista final. Comprobar Aplicar cambios y revisar y la ayuda que aclara conservación sin guardado inmediato.
- Revisar tablas, formularios y diálogos en móvil/escritorio, cuatro temas y forced-colors; comprobar scroll horizontal y que no se oculten datos/acciones de Contactos. No marcar como PASSED sin ensayo real.


Actualización humana del 29/10/2026: Ocupación usa combo nativo sin búsqueda personalizada. Ensayar apertura, desplazamiento y selección con ratón/teclado; OTROS primero entre valores, opción vacía permitida y detalle obligatorio solo para OTROS. La búsqueda mencionada en evidencias anteriores queda sustituida por esta instrucción posterior.


Empresa patrocinadora (ajuste de interfaz 29/10/2026): comparar barra/lupa, Nuevo con tooltip y grilla/acciones con Alumnos; comprobar búsqueda por RUC/razón social, orden reciente primero y paginación. Ensayar Ver sin escritura, Editar/Cancelar/Guardar con concurrencia y roles existentes. Desde Matrícula comprobar Elegir empresa, Sin patrocinador y selección automática tras guardar empresa. Revisar scroll horizontal, tooltips y teclado en móvil/escritorio y los temas, sin dar por ejecutada la revisión humana por las pruebas DOM.


## Regresión de interfaz académica estandarizada — 02/11/2026

Ensayo humano pendiente sobre el candidato H3; conserva las decisiones y aceptación históricas de H2:

- Materias/Carreras/Ciclos: comparar barra con lupa, filtros, crear/recargar, iconos/tooltips, grilla y navegación con Alumno/Empresa. Recorrer más de 30 registros, filtrar desde otra página y volver desde una ficha conservando el contexto. Recargar no debe estar disponible mientras se edita.
- Ver oculta la lista y muestra la misma distribución que Editar, con Volver arriba. Consultar como Coordinador Materia/Carrera sin controles de mantenimiento; Director debe conservar inactivación/reactivación con confirmación/motivo y las restricciones académicas.
- Carrera: Datos generales/Materias con ratón y flechas/Home/End. Cambiar campos y selección, filtrar materias y volver sin pérdida; guardar con un obligatorio inválido en otra pestaña debe revelar y enfocar el campo. Verificar carga fallida de asociaciones antes de permitir guardado.
- Ciclo: Datos/Materias/Estado; fechas legibles; origen/historia de materias. Director y Coordinador editan solo estados permitidos; solo Director cambia estado. No ofrecer edición/reapertura a terminales. Con borrador pendiente, conservarlo y pedir guardar/cancelar antes de cambiar una relación o el estado; cancelar debe seguir accesible.
- Regresión de confirmaciones de cambio de Carrera/sigla/estado y retiro/reactivación; verificar conflictos explícitos sin retries ni pérdida del borrador. Ensayar tamaños móvil/escritorio, cuatro temas y forced-colors, especialmente scroll de tablas, tooltips, foco y campos readOnly.


Ajuste posterior del 02/11/2026: Materias/Carreras usan un único cuadro por código o nombre; Ciclos por código de Ciclo o nombre de Carrera (sin promoción). Probar búsquedas parciales por cada alternativa, combinar con estado, limpiar y regresar desde ficha conservando el contexto. Recargar información se elimina de las tres listas para igualarlas a Alumnos/Empresas; se mantienen las actualizaciones automáticas tras guardar o cambiar estado.


Carrera — ajuste autorizado 02/11/2026: comprobar Modalidad/Sigla debajo de Código/Nombre y Descripción al final, al consultar y editar. Crear Carrera con Materias válidas sin seleccionar Modalidad; asignarla y quitarla después; consulta debe mostrar No indicado cuando esté vacía. Sigla y mínimo una Materia activa siguen siendo obligatorios. Véase CHG-H3-002; no reemitir la aprobación histórica del Spec ni marcar Gate 2 por estas pruebas técnicas.


## Recorrido vigente — CHG-H3-003 (02/11/2026)

Este recorrido sustituye las indicaciones anteriores de Código técnico y ubicación/modalidades de Carrera.

- Materia: crear y editar por Nombre/Descripción sin código; buscar por Nombre. Comprobar nombres en materias de Carrera/Ciclo y auditoría.
- Carrera: Sigla en primera posición junto a Nombre; segunda fila Modalidad/Con experiencia. Al crear: Presencial y No. Elegir Presencial, Semipresencial o A distancia; cambiar switch con clic y Espacio. Verificar Sí/No guardado y consulta con switch deshabilitado. Modalidad sigue opcional si se limpia explícitamente; revisar que Sigla y mínimo una Materia activa sigan obligatorios.
- Revisar carreras existentes: experiencia previamente indicada se conserva en el flag; modalidad vacía anterior equivale a No; enseñanza inicial Presencial. Los códigos técnicos existentes no aparecen ni se solicitan.
- Alumno: crear dos fichas, ver código A-0000001 o correlativos siguientes en grilla/cabecera/resumen, buscar por A-…, editar datos y comprobar que el código se mantiene sin campo editable. Puede haber saltos por pruebas/errores/rollback. Confirmar snapshots históricos intactos y nuevas matrículas con código de alumno en su fotografía.
- Comparar temas, móvil/escritorio, alineación de segunda fila, foco, teclado y forced-colors del switch y grillas. Estas pruebas humanas y Gate 2 permanecen pendientes.


## UX vigente — Materias del Ciclo (02/11/2026)

Sustituye los antiguos bloques de materias heredadas/disponibles por una tabla única. Verificar Carrera/Adicional y Activa/Retirada; por defecto solo activas, Mostrar retiradas disponible también en consulta. Buscar por nombre/acentos sin desplegar cientos de opciones; máximo ocho coincidencias, sin materias inactivas ni relaciones activas/retiradas ya existentes. Seleccionar y Agregar; comprobar refresco de tabla y versión. En nuevo Ciclo, previsualizar heredadas/adicionales y quitar una adicional pendiente antes de guardar. Retirar una heredada con confirmación: debe seguir en la Carrera y quedar retirada en el Ciclo; luego mostrar retiradas y Reactivar explícitamente, conservando origen. Verificar cancelación, error/conflicto sin retries, borrador de Datos que bloquea comandos separados, consulta de Ciclos terminales, teclado, móvil y temas. Gate 2 permanece pendiente.


## Recorrido anterior — CHG-H3-004, sustituido por CHG-H3-005

Datos de matrícula/Cargos/Resumen reemplazan los cinco pasos anteriores. Navegar con clic y flechas/Home/End conservando selecciones sin escrituras. Buscar alumno por apellido paterno/materno, nombres, documento o combinación de palabras; comprobar coincidencias parciales al escribir (mínimo 2 caracteres/pausa 300ms/máximo 20), sin distinguir mayúsculas/minúsculas, y seleccionar. Abrir ficha completa o crear Alumno y cancelar/guardar, conservando Ciclo. Elegir/quitar patrocinador opcional; cargar y revisar cargos, opcionales y descuento solo Director. Cambiar Ciclo: cargos actualizados, opcionales/descuento/motivo reiniciados y aviso visible. Confirmar desde Resumen: obligatorios inválidos deben revelar pestaña y enfocar campo; una única matrícula/cargos DB atómicos. Conflicto/respuesta incierta conserva borrador sin retry. Tras éxito, verificar Matricular otro alumno en este Ciclo y Ver matrícula. Revisión visual, móvil, temas, teclado/SO y Gate 2 pendientes.


## Recorrido anterior — CHG-H3-005, panel sustituido por CHG-H3-006

- Abrir Ciclo: Datos/Materias/Matrículas/Estado. Matrícula ya no aparece en menú; la URL antigua lleva a Ciclos. Comprobar regreso desde detalle y desde el historial del Alumno.
- En Matrículas, ver únicamente la grilla de matriculados con su cantidad, documento/código/estado y Ver matrícula. Filtrar matriculados por apellidos/nombres/documento; conservar página/filtro al cerrar panel y actualizar tras éxito.
- Matricular alumno abre panel con Ciclo fijo. Buscar candidato: lista compacta con Seleccionar, sin segunda grilla. Elegir y revisar cargos/empresa/descuento autorizado. Confirmar una vez; cerrar y comprobar código/registro. Volver a abrir para otro alumno: sin patrocinador/opcionales/descuento/código manual del anterior.
- Cancelar/cerrar/Escape antes de confirmar: sin matrícula parcial y foco de regreso. Durante RPC pendiente, cierre bloqueado. Conflicto/respuesta incierta conserva el borrador y exige revisión sin retry automático.
- Alumno con matrícula previa, incluso anulada, no debe registrarse de nuevo. Dos operadores simultáneos: DB conserva una ganadora o conflicto explícito, sin duplicados.
- Nuevo Alumno y completar ficha deben abrir formulario completo fuera del panel, conservar Ciclo y regresar al borrador al guardar/cancelar. Contactos mantienen su flujo existente.
- Ciclo terminal: consultar historia, sin Matricular. Director/Coordinador habilitados; Admin Sistema sin operación académica. Borrador de Datos del Ciclo bloquea el registro hasta guardar/cancelar.
- Revisar móvil/escritorio, scroll del panel, foco/trampa nativa, teclado, cuatro temas y forced-colors. Las pruebas humanas y Gate 2 permanecen pendientes.


## Recorrido vigente — Buscar y Agregar, CHG-H3-006

Abrir Ciclo/Matrículas/Matricular alumno. Buscar por apellidos/nombres/documento: lista de candidatos y Agregar, sin cargos ni confirmación adicional. Agregar debe registrar una vez con cargos obligatorios y actualizar la grilla; mantener búsqueda abierta para el siguiente. No debe listar ya matriculados, incluso anulados. Si faltan obligatorios/ficha/contactos/tarifas, no crear matrícula parcial ni fila ficticia y permitir revisar/completar ficha. Probar cierre/navegación bloqueados durante RPC y respuesta incierta sin reintentos automáticos. Desde la grilla, Ver matrícula solo consulta y Editar matrícula abre pantalla completa con las opciones individuales autorizadas. Probar roles/terminalidad, edición/anulación/historia existentes y retorno contextual desde alta/ficha/detalle. Revisión visual/teclado/SO y Gate 2 pendientes.


## Tarifas — estándar visual vigente (02/11/2026)

Buscar por código/nombre y combinar estado; revisar orden/paginación, iconos/tooltips a la derecha. Ver abre ficha sin grilla, Editar conserva distribución; cancelar/restaurar y guardar/volver a grilla con filtros. Director crea/edita/confirma activar/inactivar; Coordinador solo consulta. Configuración por Ciclo se traslada a la pestaña Tarifas de la ficha según CHG-H3-007 (sustituye la vista separada anterior): comparar carga, selección, importe y obligatoriedad con configuración DB. Solo Director en PROGRAMADO/EN_CURSO guarda; fallo de carga y terminales bloquean edición. Cambiar valores/defaults no debe recalcular cargos históricos. Probar conflicto sin retry, teclado/temas/móvil y regreso. Gate 2 pendiente.


## Recorrido vigente — Ciclo → Tarifas, CHG-H3-007 (03/11/2026)

Abrir Ciclo: Datos/Materias/Tarifas/Matrículas/Estado. Tarifas muestra asignadas, importes y aplicación. Director busca concepto activo por código/nombre, Agregar toma monto por defecto; ajustar solo el importe del Ciclo y obligatoriedad, Retirar y Cancelar/Guardar. Verificar exclusión de inactivas/ya asignadas, borrador conservado al cambiar pestañas y actualización de versión tras guardar. Coordinador y terminales solo consultan. Falla de carga no debe permitir reemplazar configuración. CARRERA ausente, múltiple u opcional debe indicar la causa y bloquear Matricular con acceso a Revisar tarifas del Ciclo; guardar configuración válida habilita el alta rápida. Borradores pendientes bloquean operaciones separadas hasta guardar/cancelar. Confirmar que cargos históricos/montos del catálogo no se modifican por estos ajustes. Menú Tarifas solo catálogo, sin editor duplicado por Ciclo. Teclado/temas/móvil/SO y Gate 2 pendientes.


## Ficha de matrícula y barra de Ciclo (03/11/2026)

Ver matrícula abre cabecera Volver/Editar y pestañas Resumen/Cargos/Historial. Comparar alumno, patrocinador y total con cargos vigentes; historial debe separar retirados y mostrar los datos originales del alumno con etiquetas del momento de matrícula. Editar conserva distribución y permite comandos específicos; cancelar no envía cambios, descuento solo Director, terminales solo consulta salvo anulación autorizada con motivo. Verificar navegación por teclado, temas y móvil. En Ciclo editado, Cancelar/Guardar Ciclo aparece en todas las pestañas; Tarifas y transición mantienen confirmación propia. Cancelar descarta borradores de Tarifas. Grilla de matriculados de una página no muestra paginación; varias páginas usan Página anterior/Página siguiente. Pruebas humanas y Gate 2 pendientes.


Descuento en ficha de matrícula: Director abre Editar/Cargos y pulsa Aplicar descuento (o Modificar descuento si ya existe). El formulario permanece oculto hasta esa acción; comprobar importe precargado, motivo, Cancelar sin guardado y Aplicar con actualización de grilla. Un error conserva formulario/datos sin retry. Coordinador no dispone de esa acción.


Agregar alumnos: resultados muestran Alumno con formato APELLIDO PATERNO APELLIDO MATERNO, NOMBRES y DI. Probar rechazo por contacto ausente/inactivo y por tarifa Carrera obligatoria ausente: cada caso debe indicar la causa, conservar resultados y no crear matrícula parcial.

Contactos desde Completar ficha de matrícula: abrir Contactos y Agregar sin tener que salir del modo edición si no hay cambios pendientes. Guardar contacto debe actualizar grilla; después editar/guardar alumno sin conflicto por la versión del propio contacto. Si se cambió un dato del alumno sin guardar, Contactos informa el bloqueo y conserva borrador. Conflictos externos siguen explícitos.


Cargos individuales: Editar/Cargos muestra una sola grilla con todas las tarifas inicialmente seleccionadas como propuesta. Desmarcar opcionales actualiza subtotal/descuento/total; obligatorias no se desmarcan. Verificar que nada se escribe antes de Guardar cargos y que tras guardar se muestra la selección persistida. Conservar importes históricos aunque la tarifa del Ciclo cambie. Cambiar Ciclo abre explícitamente selector, reinicia descuento al confirmar y conserva código/historia. Director guarda cargos pendientes antes de aplicar descuento. Probar teclado, móvil y temas.


Ubicación vigente del traslado: desde Ciclo/Matrículas, acción Cambiar Ciclo de una matrícula activa (sustituye la ubicación previa en Cargos). Elegir otro Ciclo elegible y confirmar: conserva código/historial, reinicia descuento y crea obligatorios del destino. Revisar grilla origen/destino y completar opcionales después desde Cargos. Cancelar sin escritura, conflicto conserva selección sin retry, cierre bloqueado durante operación y respuesta incierta obliga a consultar. Anuladas/terminales/roles no autorizados sin acción; borrador del Ciclo bloquea apertura.

Descuento: acción al extremo derecho de la fila Guardar cargos. Abre modal centrado; verificar importe/motivo, Cancelar/Escape sin escritura y foco de regreso. Durante guardado no cerrar; error/conflicto se muestra dentro y conserva datos. Solo éxito cierra y actualiza cargos.

Validación descuento: con Carrera S/130 y otros cargos S/22, el máximo permitido es S/130. Ingresar S/1200 debe señalar ese límite en el modal, focalizar importe y conservar motivo, sin enviar RPC. Corregir a S/130 permite aplicar sujeto a validación DB. Un rechazo DB del límite debe explicarlo sin mensaje genérico ni SQL.


## Información DICAPI — CHG-H3-008 (04/11/2026)

Carreras: buscar MAM-009/MAM-010, comprobar nombres y 10/7 materias con el Anexo A de RD 1052-2024. Ver pestaña Información DICAPI readonly; Director edita, Coordinador consulta. Campos opcionales, Cancelar descarta borrador y Guardar vuelve a grilla. Probar código inválido, fecha/longitudes, conflicto entre operadores, limpieza explícita y auditoría con etiquetas legibles. Resolución de malla y autorización son distintas; observaciones explican modificaciones sin ejecutar cambios. Revisar teclado/móvil/temas. La carga no modifica materias de Ciclos existentes ni historia. Gate 2 pendiente.

URL de resolución de malla: MAM-009/MAM-010 tienen el PDF oficial con Anexo A; Abrir resolución de malla abre otra pestaña. Editar conserva mayúsculas/minúsculas del enlace. HTTPS obligatorio si se informa; vacío permitido; javascript/otros esquemas se rechazan y no se convierten en enlace. Guardar/Cancelar/consulta y auditoría mantienen el flujo de Carrera.
