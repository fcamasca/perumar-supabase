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
