Proyecto: Gestión de Matrículas - PERÚ MAR
 

??? Visión de PERÚ MAR
“Consolidarnos como el centro de instrucción acuática líder en América Latina, transformando vidas a través de la formación profesional de comunidades costeras y elevando los estándares de calidad y seguridad en la industria náutica.”
 
?? Objetivos del Proyecto – Sistema de Gestión de Matrículas PERÚ MAR
________________________________________
? Objetivo General
Desarrollar e implementar un sistema digital integral que optimice y centralice los procesos de matrícula, documentación y gestión académica de PERÚ MAR, fortaleciendo la profesionalización de comunidades costeras y elevando los estándares operativos del centro.
________________________________________
?? Objetivos Específicos por Área
?? Área Académica
1.	Digitalizar el proceso de matrícula de alumnos, permitiendo la inscripción ágil, ordenada y trazable en cada ciclo académico.
2.	Gestionar de forma centralizada las carreras, materias, instructores y ciclos académicos, facilitando la planificación y seguimiento académico.
3.	Ofrecer herramientas para la gestión de alumnos, incluyendo historial académico, datos personales, y documentos vinculados.
??? Área Administrativa
4.	Gestionar empresas patrocinadoras y su vinculación con los alumnos que auspician.
5.	Facilitar la creación y uso de plantillas documentarias para generar automáticamente fichas de matrícula, declaraciones juradas, solicitudes, entre otros.
6.	Permitir la inactivación, edición y reactivación de plantillas con control de versiones y registro de motivos.
7.	Registrar y administrar usuarios con múltiples roles y responsabilidades dentro del sistema.
?? Área de Seguridad y Control de Acceso
8.	Integrar el sistema con Keycloak para gestionar autenticación, autorización y control granular de accesos.
9.	Enviar enlaces por correo electrónico para que los usuarios puedan generar o restablecer su contraseña de forma segura.
10.	Permitir el reseteo de contraseña desde la gestión de usuarios, con notificación automática por correo.
?? Área Tecnológica
11.	Usar MinIO para el almacenamiento de archivos, asegurando disponibilidad, organización y trazabilidad.
12.	Asegurar que el sistema sea accesible desde distintos dispositivos mediante un frontend web responsivo.
13.	Implementar un sistema de auditoría para rastrear las acciones realizadas por los usuarios en todo el sistema.

 
?? Alcance del Proyecto: Gestión de Matrículas - PERÚ MAR
1.	Gestión Académica
•	Registro de materias, carreras y ciclos académicos (cursos).
•	Asignación de profesores.
•	Programación de cursos.
•	Registro de alumnos y empresas patrocinadoras.
•	Control de roles: Director Académico y Coordinador Académico.
2.	Proceso de Matrícula
•	Registro de datos del alumno.
•	Subida de documentos (DNI, foto, otros).
•	Generación de ficha de matrícula en PDF.
•	Uso de plantillas para generar otros documentos: solicitudes, declaraciones juradas, carta poder, formatos de la Marina.
•	Generación de certificado al finalizar el curso.
3.	Gestión de Plantillas
•	Crear y actualizar plantillas de documentos oficiales.
•	Selección de plantilla en el proceso de matrícula y generación documental.
4.	Repositorio de Archivos
•	Almacenamiento de documentos mediante MinIO.
•	Subida y descarga de archivos por parte de los usuarios autorizados.
5.	Gestión de Pagos ? (nuevo módulo agregado)
•	Configuración de costos por curso (carrera, trámite con la Marina, refrigerio, actividades externas).
•	Control de pagos individuales (alumnos particulares):
o	Pagos parciales.
o	Registro de medios de pago (efectivo, Yape, Plin).
o	Seguimiento de saldo abonado y pendiente.
•	Control de pagos por patrocinadores:
o	Facturación por curso con datos clave: número, fecha emisión, vencimiento, monto.
o	Registro de uno o varios abonos (depósitos) por factura: fecha, hora, banco, número de operación, monto.
o	Asociación a los alumnos que representa la empresa.
6.	Reportes financieros básicos:
o	Estado de cuenta por alumno y empresa.
o	Exportación en PDF o Excel.
7.	Gestión de Usuarios:
•	Registro de nuevos usuarios y asignación de roles (director académico, coordinador académico).
•	Configuración de roles y permisos para cada tipo de usuario.
•	Generación de credenciales de acceso para los usuarios registrados.
•	Integración con Keycloak para la gestión centralizada de usuarios, autenticación y autorización.
•	Implementación de autenticación segura (incluyendo, si es necesario, autenticación multifactor).
8.	Configuración del Sistema:
•	Configuración de parámetros globales y técnicos del sistema.
•	Gestión de usuarios y permisos del sistema.
•	Administración de configuraciones relacionadas con la infraestructura.
9. Auditoría
•	Registrar todas las acciones del sistema: El sistema debe registrar todas las acciones de los usuarios (crear, editar, eliminar) en un módulo de auditoría.
o	Se debe almacenar fecha y hora, usuario que realizó la acción, tipo de acción, datos modificados y motivo de la modificación.
o	Los registros de auditoría deben ser consultables por el administrador y director académico para realizar un seguimiento de las acciones realizadas en el sistema.
Flujo de Auditoría:
o	Cada acción realizada por un usuario en el sistema será registrada automáticamente en un módulo de auditoría.
o	Los datos guardados incluirán:
?	Fecha y hora de la acción
?	Usuario que realizó la acción
?	Acción realizada (crear, editar, eliminar)
?	Datos modificados (especificar los datos exactos que cambiaron)
?	Motivo de la modificación (si es necesario)
o	El administrador del sistema podrá acceder a estos registros para generar reportes de auditoría.

 

?? Mapa de Roles y Permisos del Sistema (actualizado)
Funcionalidad / Rol	Director Académico	Coordinador Académico	Administrador de Sistema
Registrar materias	?	?	?
Registrar carreras	?	?	?
Registrar profesores	?	?	?
Registrar ciclos académicos	?	?	?
Registrar matrículas	?	?	?
Configurar costos por ciclo académico	?	?	?
Registrar y consultar pagos (patrocinado y particular)	?	?	?
Generar documentos (fichas, certificados, etc.)	?	?	?
Gestionar plantillas	?	?	?
Consultar estadísticas y reportes	?	?	?
Configurar el sistema (usuarios, seguridad, backup, parámetros técnicos, etc.)	?	?	?
Gestionar usuarios (crear, asignar roles, modificar)	?	?	?
Gestionar auditoría (consultar registros de actividad)	?	?	?

 
?? Historias de Usuario – Backlog Inicial
?? Módulo: Gestión Académica
1.	Como director académico, quiero registrar una nueva materia para que pueda ser asignada a una carrera.
2.	Como director académico, quiero registrar nuevas carreras para organizar los programas académicos.
3.	Como director o coordinador académico, quiero crear y actualizar ciclos académicos para planificar los cursos disponibles.
4.	Como director académico, quiero asignar profesores a un ciclo académico para tener el personal docente organizado.
________________________________________
?? Módulo: Matrícula
5.	Como director o coordinador académico, quiero registrar la matrícula de un alumno en un ciclo académico para formalizar su inscripción.
6.	Como director o coordinador académico, quiero subir documentos como DNI y foto del alumno durante la matrícula para mantener su expediente digital.
7.	Como director o coordinador académico, quiero generar una ficha de matrícula en PDF para entregársela al alumno.
8.	Como director o coordinador académico, quiero seleccionar una plantilla al momento de generar documentos para personalizar el contenido según el caso.
________________________________________
?? Módulo: Gestión de Plantillas
9.	Como director o coordinador académico, quiero crear, editar o eliminar plantillas de documentos para poder usarlas en distintos procesos (ficha, solicitud, certificado, etc.).
10.	Como director o coordinador académico, quiero elegir una plantilla al generar certificados u otros documentos institucionales para mantener estandarización.
________________________________________
?? Módulo: Certificados
11.	Como director o coordinador académico, quiero generar un certificado para un alumno al finalizar un curso para validar su formación.
________________________________________
?? Módulo: Pagos
12.	Como director académico, quiero configurar los costos de un ciclo académico incluyendo componentes opcionales (refrigerio, actividades externas) para calcular el pago correcto.
13.	Como director o coordinador académico, quiero registrar pagos realizados por alumnos particulares para llevar control financiero.
14.	Como director o coordinador académico, quiero registrar las facturas emitidas al patrocinador y asociarlas a uno o más ciclos académicos, para mantener un control preciso sobre los pagos realizados y las deudas pendientes por alumno y ciclo.
15.	Como director o coordinador académico, quiero registrar pagos de patrocinadores que cubren los costos de los alumnos, para llevar un control detallado de los aportes realizados, identificar saldos pendientes y asegurar la trazabilidad entre pagos y facturas.
________________________________________
?? Módulo: Estadísticas y Reportes
16.	Como director o coordinador académico, quiero acceder a reportes y estadísticas del sistema (matrículas, pagos, documentos) para tomar decisiones informadas.
________________________________________
?? Módulo: Gestión de Usuarios
17.	Como director académico o administrador del sistema, quiero configurar los roles y permisos de los usuarios para garantizar que cada usuario solo tenga acceso a las funciones necesarias.
18.	Como director académico o administrador del sistema, quiero registrar y gestionar usuarios en el sistema para permitirles acceso de acuerdo con sus roles y responsabilidades.
19.	Como administrador del sistema, quiero integrar el sistema con Keycloak para gestionar la autenticación y autorización de usuarios.
________________________________________
?? Módulo: Configuración del Sistema
20.	Como coordinador académico, o administrador del sistema, quiero dar mantenimiento a las siguientes maestras: Sexo, Estado Civil, Distrito, Provincia, Departamento, Capitanía, Grado de Instrucción, Color de Ojos, Color de Cabello, Documentos del alumno (DNI, foto, otros), Grupo Sanguíneo, Asociación, Parentesco, Motivos de cancelación o ciclo desierto, Modalidades de carrera, Conceptos de facturación, tipos de costo
21.	Como administrador del sistema, quiero configurar parámetros globales del sistema (como seguridad, backups y configuración técnica) para asegurar el correcto funcionamiento del sistema.
22.	Como administrador del sistema, quiero gestionar las configuraciones relacionadas con el almacenamiento de archivos (como la integración con MinIO) para almacenar y acceder a documentos de manera segura.
________________________________________
?? Módulo: Auditoría 
23.	Como director, coordinador académico, o administrador del sistema, quiero consultar los registros de auditoría de las acciones realizadas por los usuarios para mantener un control y trazabilidad de las actividades dentro del sistema.
 
?? Definición de Historias de Usuario
?? Módulo: Gestión Académica
Historia de Usuario 1: Registrar una nueva materia
Como director académico, 
quiero registrar una nueva materia 
para que pueda ser asignada a una carrera.
Criterios de aceptación:
•	El director debe poder ingresar el nombre de la materia, una breve descripción y un código único.
•	La materia debe estar disponible para asignarse a cualquier carrera registrada.
•	El sistema debe permitir activar o inactivar materias.
•	Si la materia ya existe, el sistema debe mostrar un mensaje de advertencia y no permitir su creación nuevamente.
•	La materia debe tener una fecha de creación.
•	Toda acción (crear, actualizar, eliminar, activar/desactivar) relacionada con la gestión de materias debe ser registrada en un sistema de auditoría.
Flujo:
1.	El director académico accede a la interfaz de "Gestión de Materias".
2.	El director hace clic en "Registrar nueva materia".
3.	Se abre un formulario con los campos:
o	Nombre de la materia
o	Descripción (opcional)
o	Código único de la materia
4.	El director completa los campos y hace clic en "Guardar".
5.	El sistema valida que el código sea único.
6.	Si el código es único, el sistema guarda la nueva materia en la base de datos y muestra un mensaje de confirmación.
7.	Si el código ya existe, el sistema muestra un mensaje de error indicando que la materia ya está registrada.
________________________________________
Historia de Usuario 2: Registrar nuevas carreras
Como director académico,
quiero registrar nuevas carreras,
para organizar los programas académicos.
Criterios de aceptación:
•	El director debe poder ingresar el nombre de la carrera, una breve descripción, un código único, y la modalidad (con o sin experiencia).
•	El director podrá seleccionar las materias que tiene la carrera.
•	El sistema debe permitir agregar las materias asociadas a la carrera seleccionada.
•	El sistema debe permitir activar o inactivar carreras.
•	Si la carrera ya existe, el sistema debe mostrar un mensaje de advertencia y no permitir su creación nuevamente.
•	Toda acción (crear, actualizar, eliminar, activar/desactivar) relacionada con la gestión de carreras debe ser registrada en un sistema de auditoría.
Flujo:
1.	El director académico accede a la interfaz de "Gestión de Carreras".
2.	El director hace clic en "Registrar nueva carrera".
3.	Se abre un formulario con los campos:
o	Nombre de la carrera
o	Descripción (opcional)
o	Código único de la carrera
o	Modalidad (con experiencia o sin experiencia)
o	Materias asociadas (el director selecciona las materias que tiene la carrera)
4.	El director completa los campos y hace clic en "Guardar".
5.	El sistema valida que el código sea único y que las materias estén disponibles para la carrera.
6.	Si el código es único y las materias están disponibles, el sistema guarda la nueva carrera en la base de datos y muestra un mensaje de confirmación.
7.	Si el código ya existe, el sistema muestra un mensaje de error indicando que la carrera ya está registrada.
________________________________________
Historia de Usuario 3: Crear y actualizar ciclos académicos
Como director académico o coordinador académico,
quiero crear y actualizar ciclos académicos,
para planificar los cursos disponibles.
Criterios de aceptación:
•	Los ciclos académicos pueden incluir información como el nombre, fecha de inicio, fecha de fin, carrera asociada y lista de materias.
•	El ciclo académico debe poderse editar por el director académico o coordinador académico si aún no tiene matrículas asociadas.
•	Si el ciclo tiene matrículas en curso, solo el director académico podrá modificar el ciclo, específicamente:
o	Nombre de la promoción.
o	Fecha de inicio y fecha de fin.
•	Solo el director académico puede declarar un ciclo como desierto, ingresando un motivo para ello.
•	El sistema debe validar las fechas de inicio y fin para evitar superposiciones con otros ciclos.
•	Al seleccionar la carrera, las materias asociadas a la misma se deben pre-cargar.
•	El sistema debe permitir al director académico o coordinador seleccionar otras materias si es necesario.
•	El nombre del ciclo académico (curso) se autogenerará en el formato: año-correlativo (según carrera por año)-código carrera, aunque se puede modificar.
•	Se debe permitir agregar el nombre de la promoción y el lugar donde se dará el curso (departamento, provincia, distrito y capitanía).
•	El sistema debe permitir activar o inactivar ciclos académicos.
•	Toda acción (crear, actualizar, eliminar, activar/desactivar) relacionada con la gestión de carreras debe ser registrada en un sistema de auditoría.
Flujo:
1.	El director académico o coordinador académico accede a la interfaz de "Gestión de Ciclos Académicos".
2.	El director o coordinador hace clic en "Registrar nuevo ciclo académico" o selecciona uno existente para actualizar.
3.	Se abre un formulario con los campos:
o	Nombre del ciclo académico (automáticamente generado con el formato año-correlativo-código carrera, aunque se puede modificar)
o	Fecha de inicio
o	Fecha de fin
o	Carrera asociada
o	Materias pre-cargadas asociadas a la carrera
o	Opción de seleccionar más materias si es necesario
o	Nombre de la promoción
o	Lugar donde se dará el curso (dpto, prov, dist, capitanía)
4.	Si el ciclo académico tiene matrículas asociadas, solo el director académico puede modificar el ciclo, limitándose a cambiar:
o	Nombre de la promoción.
o	Fecha de inicio y fecha de fin.
o	El director también puede declarar el ciclo como desierto, indicando un motivo.
5.	El director o coordinador completa los campos y hace clic en "Guardar".
6.	El sistema valida las fechas para asegurarse de que no haya superposición con otros ciclos.
7.	El ciclo académico se guarda o actualiza en la base de datos y se muestra un mensaje de confirmación.

________________________________________
Historia de Usuario 4: Asignar profesores a un ciclo académico
Como director académico,
quiero asignar profesores a un ciclo académico,
para tener el personal docente organizado.
Criterios de aceptación:
•	El director debe poder asignar uno o más profesores a un ciclo académico.
•	Los profesores solo pueden ser asignados a ciclos académicos para los cuales estén habilitados según su especialidad.
•	El sistema debe mostrar la lista de profesores disponibles para asignar a un ciclo.
•	Toda acción (asignar, eliminar) relacionada con la gestión de profesores debe ser registrada en un sistema de auditoría.
Flujo:
1.	El director académico accede a la interfaz de "Gestión de Ciclos Académicos".
2.	El director selecciona un ciclo académico existente para asignar profesores.
3.	Se muestra una lista de profesores disponibles.
4.	El director selecciona uno o más profesores y hace clic en "Asignar profesores".
5.	El sistema valida que los profesores seleccionados estén habilitados para enseñar las materias del ciclo académico.
6.	El sistema guarda la asignación y muestra un mensaje de confirmación.
 
?? Módulo: Matrícula
Historia de Usuario 5: Registrar matrícula
Como director o coordinador académico,
quiero registrar la matrícula de un alumno en un ciclo académico,
para formalizar su inscripción.
________________________________________
Criterios de aceptación:
•	La matrícula debe iniciar seleccionando primero un ciclo académico activo.
•	El sistema debe permitir buscar al alumno por número de documento (DNI o Carné de extranjería).
•	Si el alumno no existe, debe poder registrarse ingresando sus datos completos.
•	La matrícula debe permitir registrar múltiples alumnos uno tras otro (matrícula masiva).
•	No se debe permitir matricular al mismo alumno más de una vez en el mismo ciclo académico.
•	El sistema debe permitir buscar la empresa patrocinadora por RUC.
•	Si la empresa no existe, debe permitirse su registro completo con contactos.
•	El sistema debe permitir seleccionar los conceptos de facturación configurados para el ciclo académico. Por defecto, todos los conceptos de facturación deben estar seleccionados.
•	Toda acción debe ser registrada para fines de auditoría (se definirá en la HU de auditoría).
________________________________________
Flujo:
1.	El director o coordinador académico accede a la opción "Registrar Matrícula".
2.	Se muestra una lista de ciclos académicos activos.
3.	El usuario selecciona un ciclo académico.
4.	Se habilita la opción para buscar alumnos por número de documento (DNI o Carné de extranjería).
5.	Si el alumno no existe, se despliega un formulario completo para registrar los siguientes datos personales:
•	Tipo de documento, nombres, apellidos, fecha de nacimiento, sexo, estado civil.
•	Lugar de nacimiento (departamento, provincia, distrito).
•	Grado de instrucción, color de ojos, color de cabello, estatura, peso, grupo sanguíneo, señas particulares.
•	Domicilio actual (departamento, provincia, distrito, dirección), teléfono fijo, celular, correo.
•	Asociación (seleccionable).
6.	Se registra al menos un contacto de emergencia:
•	Datos personales y dirección (con opción para copiar dirección del alumno), parentesco, celular.
7.	Se muestra la opción para asociar una empresa patrocinadora:
•	Buscar por RUC.
•	Si no existe, permitir su registro con razón social, nombre comercial, dirección completa y contactos.
8.	El sistema permite seleccionar los conceptos de facturación relacionados con el ciclo académico. Por defecto, todos los conceptos de facturación están seleccionados, pero el director o coordinador puede desmarcar los que no apliquen.
9.	El sistema valida que el alumno no esté ya matriculado en el ciclo seleccionado.
10.	Se guarda la matrícula y se muestra un mensaje de confirmación.
11.	El sistema vuelve a permitir registrar una nueva matrícula en el mismo ciclo (flujo continuo).

Historia de Usuario 6: Subir documentos adjuntos
Como director o coordinador académico,
quiero subir documentos como DNI, foto u otros del alumno durante o después de la matrícula,
para mantener su expediente digital actualizado.
________________________________________
Criterios de aceptación:
• Debe ser posible subir documentos durante o después del proceso de matrícula.
• Cada documento cargado debe indicar su tipo:
 - DNI
 - Foto
 - Otros (en este caso se debe ingresar una descripción).
• Los documentos no son obligatorios durante la matrícula, pero deben poder ser adjuntados posteriormente.
• Los archivos deben almacenarse de forma organizada y vinculados al expediente del alumno.
• Se permiten los formatos: PDF, JPG y PNG.
• El sistema debe validar que el tamaño máximo de archivo no supere los 5MB.
• Cada carga de documento debe registrarse en el sistema de auditoría (ver HU de auditoría más adelante).
________________________________________
Flujo:
1.	Durante o después del registro de matrícula, el usuario accede a la sección "Documentos del alumno".
2.	Hace clic en "Adjuntar nuevo documento".
3.	Selecciona el archivo desde su dispositivo.
4.	Selecciona el tipo de documento (DNI, Foto, Otros).
 - Si elige "Otros", debe ingresar una descripción.
5.	El sistema valida el formato y tamaño del archivo.
6.	Si pasa la validación, el documento se carga y se asocia al alumno.
7.	Se muestra un mensaje de confirmación.
8.	Si no pasa la validación, se muestra un mensaje de error con el motivo.
9.	Todos los documentos quedan disponibles para su consulta y descarga desde el expediente del alumno.

Historia de Usuario 7: Generar ficha de matrícula
Como director o coordinador académico,
quiero generar una ficha de matrícula en PDF,
para entregársela al alumno, consolidando todos los datos registrados en el proceso.
Criterios de aceptación:
• Debe poder generarse la ficha de matrícula una vez completado el registro del alumno en el ciclo académico.
• La ficha debe incluir los datos del alumno, del ciclo académico, de la empresa patrocinadora (si aplica), y un resumen de los documentos cargados.
• Debe tener un formato PDF descargable e imprimible.
• El sistema debe permitir visualizar una vista previa antes de descargar.
• La ficha debe tener un espacio reservado para firmas (del alumno y del responsable).
• El nombre del archivo PDF debe seguir el formato: ficha_matricula_<dni_alumno>_<codigo_ciclo>.pdf.
• Se debe registrar en la auditoría cuándo y quién generó el documento.
________________________________________
Flujo:
1.	El usuario finaliza el registro de matrícula de un alumno.
2.	Accede a la opción "Generar ficha de matrícula".
3.	El sistema reúne la información correspondiente del alumno, el ciclo y la empresa patrocinadora (si hubiera).
4.	Se muestra una vista previa del documento en pantalla.
5.	El usuario revisa la información.
6.	Hace clic en "Descargar PDF".
7.	El sistema genera y descarga el archivo en el formato especificado.
8.	Se muestra un mensaje de confirmación.
9.	La acción queda registrada en el sistema de auditoría.

Historia de Usuario 8: Generar documentos
Como director o coordinador académico,
quiero seleccionar una plantilla al momento de generar documentos,
para personalizar el contenido según el caso y generar los documentos individual o masivamente según sea necesario.
Criterios de aceptación:
• El sistema debe permitir al usuario seleccionar una plantilla antes de generar el documento.
• El usuario puede elegir entre varias plantillas predefinidas, según el tipo de documento (por ejemplo, ficha de matrícula).
• La plantilla seleccionada debe reflejarse en el documento generado (por ejemplo, ficha de matrícula, constancia, etc.).
• El sistema debe permitir cambiar de plantilla antes de la generación del documento si el usuario lo desea.
• El director o coordinador académico debe poder generar documentos de forma individual (para un alumno específico) o de manera masiva (para todos los matriculados en un ciclo académico).
• El sistema debe permitir al usuario seleccionar el ciclo académico al que pertenecen los alumnos para la generación masiva de documentos.
• Al generar documentos de forma individual, el usuario debe seleccionar el alumno específico para el que se generará el documento.
• El sistema debe generar y mostrar una vista previa del documento con la plantilla seleccionada antes de la descarga.
• El documento generado debe estar personalizado con los datos del alumno, del ciclo académico y otros datos pertinentes (según la plantilla).
• Los documentos generados con la plantilla seleccionada deben ser descargables en formato PDF.
• El sistema debe permitir la descarga de los documentos de forma individual o como un archivo comprimido en caso de ser generados masivamente.
• Se debe registrar en la auditoría la acción de selección de plantilla y generación de documentos, indicando quién lo hizo y cuándo.
________________________________________
Flujo:
1.	El usuario accede a la opción para generar documentos (por ejemplo, ficha de matrícula).
2.	Si el usuario desea generar un documento individual:
1.	El sistema le solicita seleccionar un ciclo académico en el que está matriculado el alumno.
2.	El sistema muestra la lista de alumnos matriculados en el ciclo académico seleccionado.
3.	El usuario selecciona el alumno específico para el cual quiere generar el documento.
3.	Si el usuario desea generar los documentos de forma masiva:
1.	El sistema le solicita seleccionar el ciclo académico para el que se generarán los documentos.
2.	El sistema muestra todos los alumnos matriculados en el ciclo académico seleccionado.
4.	El sistema muestra una lista de plantillas disponibles para el documento a generar (por ejemplo, ficha de matrícula).
5.	El usuario selecciona la plantilla deseada.
6.	El sistema genera una vista previa del documento con la plantilla seleccionada.
7.	El usuario revisa la vista previa y confirma si está conforme con el documento.
8.	El usuario puede hacer clic en "Generar documento(s)" para:
o	Generar el documento individualmente para un alumno.
o	Generar los documentos de forma masiva para todos los alumnos seleccionados.
9.	El sistema genera el documento(s) en formato PDF y lo pone a disposición para su descarga.
o	En el caso de generación masiva, el sistema genera un archivo comprimido (ZIP) con todos los documentos.
10.	El sistema muestra un mensaje de confirmación y la opción de descargar los documentos.
11.	La acción queda registrada en la auditoría, indicando quién generó los documentos y cuándo.

 
?? Módulo: Gestión de Plantillas
Historia de Usuario 9: Gestionar plantillas de documentos (crear, editar, inactivar)
Como director o coordinador académico,
quiero gestionar plantillas de documentos (crear, editar, inactivar),
para poder usarlas en distintos procesos (ficha de matrícula, solicitud, declaración jurada, carta poder, etc.), asegurando la coherencia y estandarización de los documentos generados.
Criterios de Aceptación:
•	El sistema debe permitir al director o coordinador académico crear plantillas de documentos con formato enriquecido (negritas, tabulaciones, tablas, etc.).
•	Cada plantilla debe tener un nombre único para facilitar su identificación.
•	Las plantillas deben ser clasificadas por tipo (por ejemplo, ficha de matrícula, solicitud, declaración jurada, carta poder, etc.).
•	Las plantillas pueden contener variables dinámicas (por ejemplo, {{nombre_alumno}}, {{dni_alumno}}, {{ciclo_academico}}) que se reemplazarán con los datos correspondientes cuando se generen los documentos.
•	El director o coordinador académico debe poder editar las plantillas creadas, modificando el contenido, formato o las variables.
•	El director académico debe ser el único usuario con privilegios para inactivar plantillas. Al inactivar una plantilla, el sistema solicitará que el director indique un motivo para la inactivación.
•	Las plantillas inactivadas no podrán ser utilizadas para generar documentos, pero seguirán registradas en el sistema y podrán ser reactivadas por el director si fuera necesario.
•	El sistema debe permitir previsualizar una plantilla antes de guardarla o editarla.
________________________________________
Flujo:
1.	Crear una nueva plantilla:
o	El director o coordinador académico accede a la opción para crear una nueva plantilla.
o	El sistema muestra un editor de plantillas donde el usuario puede definir el formato del documento (tabulaciones, negritas, tablas, etc.) y agregar variables dinámicas.
o	El usuario asigna un nombre a la plantilla y selecciona el tipo de documento (ficha de matrícula, solicitud, etc.).
o	El sistema guarda la plantilla con el nombre y tipo especificado.
2.	Editar una plantilla existente:
o	El director o coordinador académico accede a la opción para editar una plantilla ya existente.
o	El sistema muestra el contenido de la plantilla seleccionada y permite realizar cambios en el formato o las variables dinámicas.
o	El usuario guarda los cambios realizados en la plantilla.
3.	Inactivar una plantilla (solo director):
o	El director accede a la opción para inactivar una plantilla existente.
o	El sistema solicita que el director indique un motivo para la inactivación de la plantilla.
o	El director confirma la inactivación, y la plantilla queda marcada como inactiva en el sistema.
o	Las plantillas inactivadas no podrán ser utilizadas para generar nuevos documentos.
4.	Reactivar una plantilla (solo director):
o	El director puede reactivar una plantilla previamente inactivada.
o	El sistema permite al director editar la plantilla antes de reactivarla, si lo desea.
o	El director confirma la reactivación y la plantilla vuelve a estar disponible para su uso.
5.	Previsualización de la plantilla:
o	El sistema debe permitir al usuario previsualizar cómo quedará la plantilla con las variables dinámicas antes de guardarla o editarla.
 
?? Módulo: Certificados
Historia de Usuario 11: Generar un certificado de estudios
Como director o coordinador académico,
quiero generar un certificado,
para un alumno al finalizar un curso para validar su formación.
________________________________________
Criterios de aceptación:
•	El sistema debe permitir generar un certificado una vez que un alumno haya completado un curso exitosamente.
•	El certificado debe incluir datos clave como el nombre del alumno, el curso finalizado, la fecha de finalización, y los detalles del curso (como duración y nota final).
•	El formato del certificado debe ser en PDF, descargable e imprimible.
•	El sistema debe ofrecer una vista previa del certificado antes de la generación final.
•	El certificado debe tener un espacio para firmas del director o responsable académico.
•	El sistema debe permitir la personalización de plantillas para los certificados.
•	El sistema debe guardar la información de la generación del certificado en un registro de auditoría, incluyendo quién lo generó y cuándo.
•	Se debe permitir la generación masiva de certificados para todos los alumnos de un curso.
________________________________________
Flujo:
1.	El usuario accede al módulo de gestión de certificados.
2.	El sistema muestra los cursos disponibles que han finalizado.
3.	El usuario selecciona el curso para el que desea generar certificados.
4.	El sistema muestra la lista de alumnos que han completado el curso seleccionado.
5.	El usuario selecciona uno o más alumnos para generar sus certificados.
6.	El sistema presenta una opción para elegir la plantilla de certificado.
7.	El usuario selecciona la plantilla deseada.
8.	El sistema genera una vista previa del certificado para cada alumno.
9.	El usuario revisa la vista previa y confirma si está conforme.
10.	El usuario hace clic en "Generar certificado(s)" para:
•	Generar el certificado individualmente para un alumno.
•	Generar los certificados de manera masiva para todos los alumnos seleccionados.
11.	El sistema genera el documento(s) en formato PDF y lo pone a disposición para su descarga.
o	En caso de generación masiva, el sistema genera un archivo comprimido (ZIP) con todos los certificados.
12.	El sistema muestra un mensaje de confirmación y la opción de descargar los documentos.
13.	La acción queda registrada en la auditoría, indicando quién generó los certificados y cuándo.

 
?? Módulo: Pagos
Historia de Usuario 12: Configurar costos de un ciclo académico
Como director académico, 
quiero configurar los costos de un ciclo académico, incluyendo costos obligatorios y opcionales,
para calcular el pago correcto.
________________________________________
Criterios de aceptación:
•	El director debe poder configurar los costos asociados a un ciclo académico.
•	Los costos deben incluir, al menos, los siguientes conceptos:
o	Carrera
o	Trámite con la marina
o	Refrigerio
o	Actividades externas
o	Otros costos adicionales que puedan ser configurados.
•	El director debe poder indicar si un costo es obligatorio u opcional para los estudiantes al momento de realizar la matrícula.
•	El director debe poder inactivar un costo previamente configurado, pero no podrá eliminarlo.
•	Al momento de registrar la matrícula, el sistema debe calcular automáticamente el pago total de acuerdo con los costos obligatorios y opcionales configurados para el ciclo académico.
•	El sistema debe permitir que los costos configurados en el ciclo académico puedan reflejarse correctamente en el proceso de matrícula y pago.
________________________________________
Flujo:
1.	El director accede a la opción "Configurar costos del ciclo académico".
2.	Se muestra una lista de conceptos de costos (carrera, trámite con la marina, refrigerio, actividades externas, y otros).
3.	El director puede seleccionar si un costo es obligatorio u opcional para el ciclo académico.
4.	El director guarda la configuración de costos, asegurándose de que los costos reflejados en el ciclo académico sean correctos.
5.	Al registrar la matrícula, el sistema calcula el pago total del ciclo académico según los costos seleccionados por el director.
6.	Si un costo es opcional, el sistema le da al director la opción de decidir si incluirlo o no al momento de matricular a los alumnos.

Historia de Usuario 13: Registrar pagos realizados por alumnos particulares
Como director o coordinador académico, 
quiero registrar pagos realizados por alumnos particulares y asignarlos a un ciclo académico específico, 
para llevar control financiero, incluyendo pagos parciales y el seguimiento de saldo pendiente.
________________________________________
Criterios de aceptación:
•	El sistema debe permitir registrar pagos parciales de la deuda total del alumno para un ciclo académico específico.
•	El director o coordinador debe poder seleccionar el ciclo académico (curso) al cual se va a asignar el pago.
•	El sistema debe permitir ingresar el monto del pago, la fecha, y el concepto del pago (ejemplo: matrícula, actividades externas, etc.).
•	El sistema debe permitir seleccionar el medio de pago utilizado (efectivo, Yape, Plin, transferencia bancaria, tarjeta, etc.).
•	El sistema debe mostrar el saldo pendiente de pago del alumno para el ciclo académico seleccionado y permitir un seguimiento del saldo abonado y el saldo pendiente a medida que se registran los pagos parciales.
•	El sistema debe validar que el pago registrado no sea mayor que el saldo pendiente del alumno para el ciclo académico seleccionado.
•	El sistema debe generar un informe de pagos realizado por cada alumno, mostrando los pagos parciales y el saldo pendiente para cada ciclo académico.
•	El sistema debe actualizar el historial de pagos del alumno con cada pago registrado para el ciclo académico correspondiente.
•	Al finalizar el pago total de la deuda del ciclo académico, el sistema debe mostrar un mensaje indicando que el pago ha sido completado para ese ciclo.
________________________________________
Flujo:
1.	El director o coordinador accede a la opción "Registrar Pago".
2.	El sistema solicita la búsqueda del alumno por su número de documento.
3.	El sistema muestra los ciclos académicos (cursos) en los cuales el alumno está matriculado y el saldo pendiente de pago para cada ciclo.
4.	El director o coordinador selecciona el ciclo académico (curso) correspondiente.
5.	El sistema permite registrar los detalles del pago:
o	Monto del pago (parcial o total).
o	Fecha del pago.
o	Concepto del pago.
o	Medio de pago (efectivo, Yape, Plin, etc.).
6.	El sistema valida que el pago no sea mayor que el saldo pendiente para el ciclo académico seleccionado.
7.	El sistema actualiza el saldo abonado y el saldo pendiente del alumno para el ciclo académico seleccionado.
8.	El sistema genera un comprobante de pago correspondiente para el ciclo académico seleccionado.
9.	El sistema actualiza el historial de pagos del alumno y muestra un resumen del saldo pendiente y abonado por ciclo académico.
10.	El director o coordinador puede generar un informe detallado de pagos por alumno y ciclo académico.

Historia de Usuario 14: Registrar facturas emitidas al patrocinador
Como director o coordinador académico,
quiero registrar las facturas emitidas al patrocinador y asociarlas a uno o más ciclos académicos,
para mantener un control preciso sobre los pagos realizados y las deudas pendientes por alumno y ciclo.
________________________________________
Criterios de aceptación:
•	El sistema debe permitir registrar una factura emitida a un patrocinador por los costos de los alumnos patrocinados.
•	El sistema debe permitir asociar la factura a uno o más ciclos académicos donde el patrocinador tiene alumnos patrocinados.
•	El proceso debe ser el siguiente:
1.	Selección del patrocinador (por RUC o nombre).
2.	Selección de uno o más ciclos académicos a los que estará asociada la factura.
3.	Ingreso manual del número de factura.
4.	Ingreso manual de conceptos de facturación: matrícula, refrigerio, actividades, etc. Se deben permitir varias líneas de conceptos con sus respectivos montos.
5.	Monto total: Se ingresa el monto total de la factura (puede cubrir parcial o totalmente la deuda total del patrocinador).
6.	Fecha de emisión y vencimiento.
7.	Adjuntar archivo de la factura (PDF u otros formatos).
8.	El sistema debe calcular y mostrar la deuda total real del patrocinador en los ciclos seleccionados, para comparación.
9.	El sistema debe generar un informe de facturas, mostrando:
?	Número de factura
?	Patrocinador
?	Ciclos cubiertos
?	Conceptos
?	Monto total facturado
?	Monto de la deuda real en los ciclos seleccionados
?	Saldos pendientes y pagos realizados.
________________________________________
Flujo:
1.	El director o coordinador accede a la opción "Registrar Factura de Patrocinador".
2.	El sistema solicita la búsqueda del patrocinador por RUC o nombre.
3.	El usuario selecciona el patrocinador.
4.	El sistema muestra los ciclos académicos donde el patrocinador tiene alumnos patrocinados.
5.	El usuario selecciona uno o más ciclos académicos a los que aplicará la factura.
6.	El usuario ingresa el número de factura manualmente.
7.	El usuario ingresa los conceptos de facturación (líneas con descripción y monto).
8.	Se ingresa el monto total de la factura.
9.	Se ingresan las fechas de emisión y vencimiento.
10.	Se adjunta el archivo de la factura si es necesario.
11.	El sistema muestra la deuda real total del patrocinador en los ciclos seleccionados.
12.	El usuario confirma el registro de la factura.
13.	El sistema registra la factura y la muestra en la lista general e informes.

Historia de Usuario 15: Registrar pagos de patrocinadores
Como director o coordinador académico,
quiero registrar pagos de patrocinadores que cubren los costos de los alumnos,
para llevar un control detallado de los aportes realizados, identificar saldos pendientes y asegurar la trazabilidad entre pagos y facturas.
________________________________________
Criterios de aceptación:
•	El sistema debe permitir registrar pagos realizados por patrocinadores para cubrir el costo de una o más facturas emitidas.
•	El proceso debe seguir este flujo:
1.	Selección del patrocinador.
2.	Visualización de todas las facturas emitidas al patrocinador.
3.	Selección de una o más facturas a ser cubiertas por el pago.
4.	El sistema debe mostrar:
?	Monto total de cada factura
?	Monto ya pagado
?	Saldo pendiente
?	Ciclos académicos asociados a la factura
?	Número de alumnos patrocinados por ciclo
5.	El sistema debe permitir:
?	Ingresar el monto total del pago
?	Distribuir el monto entre las facturas seleccionadas
?	Seleccionar el medio de pago
?	Ingresar la fecha del pago
?	Adjuntar opcionalmente un comprobante de pago
?	Agregar observaciones
6.	El sistema debe validar que el monto no supere el total pendiente de las facturas seleccionadas.
7.	El sistema debe permitir registrar pagos parciales por factura.
8.	El sistema debe actualizar automáticamente el saldo pendiente de cada factura.
9.	Un pago puede ser marcado como completo solo si cubre el total pendiente de las facturas seleccionadas.
10.	El sistema debe generar un informe de pagos de patrocinadores, mostrando:
?	Patrocinador
?	Facturas pagadas
?	Ciclos académicos cubiertos
?	Número de alumnos beneficiados
?	Monto del pago
?	Medio de pago
?	Fecha
?	Comprobante (si hay)
?	Saldos pendientes (si los hubiera)
________________________________________
Flujo:
1.	El director o coordinador accede a la opción "Registrar Pago de Patrocinador".
2.	Busca y selecciona al patrocinador por nombre o RUC.
3.	El sistema lista todas las facturas emitidas al patrocinador, con sus montos, pagos previos y saldos.
4.	Selecciona una o más facturas a pagar.
5.	El sistema muestra los ciclos académicos y alumnos patrocinados involucrados en esas facturas.
6.	Ingresa el monto del pago y lo distribuye entre las facturas seleccionadas.
7.	Selecciona el medio de pago, fecha y adjunta el comprobante (opcional).
8.	El sistema valida el monto e impacta los saldos de cada factura.
9.	Se guarda el registro del pago, marcando si es parcial o completo.
10.	Se puede generar un informe de pagos del patrocinador con todos los datos.
 
?? Módulo: Estadísticas y Reportes*
 
?? Módulo: Gestión de Usuarios
Historia de Usuario 17: Configurar roles y permisos
Como director académico o administrador del sistema,
quiero configurar los roles y permisos de los usuarios,
para garantizar que cada usuario solo tenga acceso a las funciones necesarias.
Criterios de Aceptación:
•	El sistema debe permitir crear nuevos roles con nombres únicos.
•	Los roles creados deben poder asignarles permisos específicos de acceso a funciones y módulos del sistema (por ejemplo, acceso a gestión de matrículas, gestión de plantillas, etc.).
•	El sistema debe permitir editar los permisos de los roles existentes en cualquier momento.
•	El director académico o administrador debe poder inactivar roles (solo director académico o administrador), asegurando que los usuarios asignados a ese rol pierdan los permisos relacionados.
•	El sistema debe mantener un historial de todos los cambios en los roles y permisos para auditoría.
•	El sistema debe mostrar una lista de todos los roles y sus permisos asociados para facilitar la gestión y revisión.
Flujo:
1.	Crear un nuevo rol:
o	El director académico o administrador accede a la opción "Gestionar roles".
o	El sistema muestra una opción para crear un nuevo rol.
o	El usuario asigna un nombre único al nuevo rol.
o	Se seleccionan los permisos que el rol tendrá para acceder a funciones y módulos específicos del sistema.
o	El sistema guarda el nuevo rol con los permisos configurados.
2.	Editar un rol existente:
o	El director académico o administrador selecciona un rol existente para editarlo.
o	El sistema muestra los permisos actuales asignados al rol.
o	El usuario puede agregar o eliminar permisos según lo requiera.
o	El sistema guarda los cambios realizados al rol.
3.	Inactivar un rol:
o	El director académico o administrador selecciona un rol para inactivarlo.
o	El sistema solicita que el director indique el motivo de la inactivación.
o	El rol es marcado como inactivo y los usuarios asignados a este rol pierden el acceso a las funciones correspondientes.
o	El sistema mantiene un registro de la inactivación para auditoría.

Historia de Usuario 18: Registrar y gestionar usuarios en el sistema
Como director académico o administrador del sistema,
quiero registrar y gestionar usuarios en el sistema,
para permitirles acceso de acuerdo con sus roles y responsabilidades, y asegurar que un usuario pueda tener más de un rol si es necesario.
Criterios de Aceptación:
•	El sistema debe permitir al director académico o administrador crear nuevos usuarios con información básica (nombre, correo electrónico, etc.).
•	El sistema debe permitir asignar más de un rol a un usuario durante su registro o edición (por ejemplo, un usuario puede ser tanto director académico como coordinador académico).
•	El sistema debe permitir editar la información de los usuarios registrados (por ejemplo, cambiar nombre, correo, asignar o quitar roles).
•	El sistema debe permitir resetear la contraseña de los usuarios editados, enviando un correo con un enlace para que el usuario pueda generar una nueva contraseña.
•	El sistema debe permitir inactivar usuarios cuando sea necesario (solo por parte del director académico o administrador), asegurando que los usuarios inactivos ya no puedan acceder al sistema.
•	El sistema debe permitir reactivar usuarios previamente inactivos.
•	El sistema debe enviar un correo electrónico al usuario cuando su cuenta sea creada, con un enlace para generar su contraseña en su primer acceso.
•	El sistema debe enviar una notificación por correo electrónico al usuario cuando su cuenta sea modificada, inactivada o reactivada.
•	El sistema debe mostrar una lista de usuarios registrados con la información básica (nombre, rol, estado).
•	El sistema debe permitir la búsqueda y filtrado de usuarios por nombre, correo electrónico o rol.
Flujo:
1.	Registrar un nuevo usuario:
o	El director académico o administrador accede a la opción "Gestionar usuarios".
o	El sistema muestra una opción para crear un nuevo usuario.
o	El usuario ingresa la información básica del nuevo usuario (nombre, correo electrónico, etc.).
o	El administrador puede asignar uno o más roles al usuario durante su creación (por ejemplo, un usuario puede tener roles de "director académico" y "coordinador académico").
o	El sistema crea el usuario y envía un correo electrónico al usuario con un enlace para generar su contraseña en el primer acceso. Este enlace permitirá que el usuario configure su contraseña y acceda al sistema por primera vez.
2.	Editar un usuario existente:
o	El director académico o administrador selecciona un usuario de la lista de usuarios registrados.
o	El sistema muestra la información del usuario seleccionada.
o	El administrador puede modificar la información (nombre, correo).
o	El administrador puede añadir o quitar roles del usuario (asignando múltiples roles si es necesario).
o	Si se realiza una modificación de usuario y se necesita resetear la contraseña, el administrador tiene la opción de "Resetear contraseña".
o	Si el administrador selecciona "Resetear contraseña", el sistema enviará un correo electrónico al usuario con un enlace para resetear su contraseña.
o	El sistema guarda los cambios realizados y envía una notificación al usuario sobre la modificación.
3.	Inactivar un usuario:
o	El director académico o administrador selecciona un usuario para inactivarlo.
o	El sistema solicita la confirmación de inactivación.
o	El usuario es inactivado, y el sistema envía una notificación al usuario informándole que su cuenta ha sido inactivada.
4.	Reactivar un usuario:
o	El director académico o administrador selecciona un usuario previamente inactivado.
o	El sistema solicita la confirmación de reactivación.
o	El usuario es reactivado, y el sistema envía una notificación al usuario informándole que su cuenta ha sido reactivada.
5.	Visualización y gestión de usuarios:
o	El director académico o administrador puede ver una lista de todos los usuarios registrados.
o	El sistema permite buscar y filtrar usuarios por nombre, correo electrónico y rol.
o	El sistema muestra el estado de cada usuario (activo o inactivo).
o	El sistema debe mostrar todos los roles asignados a cada usuario en la lista.

 

?? Módulo: Configuración del Sistema*
Historia de Usuario 20: Configurar maestras
Como coordinador académico o administrador del sistema,
quiero dar mantenimiento a las siguientes maestras:
•	Sexo
•	Estado Civil
•	Distrito
•	Provincia
•	Departamento
•	Capitanía
•	Grado de Instrucción
•	Color de Ojos
•	Color de Cabello
•	Documentos del alumno (DNI, foto, otros)
•	Grupo Sanguíneo
•	Asociación
•	Parentesco
•	Motivos de cancelación o ciclo desierto
•	Modalidades de carrera
•	Conceptos de facturación
•	Tipos de costo
para asegurar que el sistema maneje información estandarizada, actualizada y adaptable a las necesidades institucionales.
________________________________________
Criterios de Aceptación
1.	El sistema debe permitir crear, editar, inactivar y listar los valores de cada una de las maestras mencionadas.
2.	Solo usuarios con rol de coordinador académico o administrador del sistema podrán acceder a esta funcionalidad.
3.	Cada registro en las maestras debe contar con un estado (activo/inactivo) y una fecha de última modificación.
4.	Para las maestras Distrito, Provincia y Departamento, el sistema debe respetar la jerarquía geográfica oficial del país.
5.	Para “Documentos del alumno”, el sistema debe permitir definir si es obligatorio u opcional y el tipo de archivo permitido.
6.	Para “Conceptos de facturación” y “Tipos de costo”, el sistema debe permitir asociarlos posteriormente a procesos de matrícula o facturación.
7.	El sistema debe contar con filtros y búsqueda por nombre, estado y tipo en cada pantalla de mantenimiento.
8.	Las maestras deben estar agrupadas y organizadas por categorías para facilitar su gestión.
9.	Las maestras modificadas deben reflejarse en tiempo real en los módulos que las utilizan (matrícula, alumnos, facturación, etc.).
________________________________________
Flujo:
1.	El usuario accede al módulo “Configuración del Sistema”.
2.	Selecciona la maestra que desea administrar.
3.	Visualiza el listado actual con opción de búsqueda y filtros.
4.	Puede realizar las siguientes acciones:
o	Crear un nuevo registro (nombre, estado, parámetros adicionales según el tipo).
o	Editar un registro existente.
o	Inactivar un registro (debe quedar oculto del uso operativo pero visible en la administración).
5.	Los cambios se guardan y se reflejan inmediatamente en el sistema.

Historia de Usuario 22: Configurar almacenamiento de archivos
Como administrador del sistema,
quiero gestionar las configuraciones relacionadas con el almacenamiento de archivos (como la integración con MinIO),
para almacenar y acceder a documentos de manera segura, eficiente y centralizada.
________________________________________
Criterios de Aceptación
1.	El sistema debe permitir configurar parámetros clave para el servicio de almacenamiento MinIO, tales como:
o	Endpoint (URL del servicio)
o	Access Key y Secret Key
o	Nombre del bucket por defecto
o	Carpeta raíz o prefijo de archivos
2.	La información de acceso (credenciales) debe almacenarse cifrada y no debe ser visible en texto plano.
3.	El sistema debe permitir realizar una prueba de conexión con MinIO para validar que los parámetros ingresados son correctos.
4.	Debe poderse cargar un archivo de prueba desde esta configuración para confirmar el funcionamiento del almacenamiento.
5.	El sistema debe permitir habilitar o deshabilitar el almacenamiento de archivos mediante MinIO.
6.	Las configuraciones realizadas deben aplicarse en tiempo real sin requerir reinicio del sistema.
7.	Todos los módulos que suban o consulten archivos deben utilizar esta configuración como fuente central.
________________________________________
Flujo
1.	El administrador accede al módulo “Configuración del Sistema”.
2.	Selecciona la sección “Almacenamiento de Archivos”.
3.	Ingresa los datos de configuración (endpoint, claves, bucket, etc.).
4.	Ejecuta una prueba de conexión para validar los datos.
5.	Si la conexión es exitosa, puede guardar la configuración.
6.	El sistema registra la configuración de forma segura y la aplica a todos los módulos relevantes.

 
?? Módulo: Auditoría *

