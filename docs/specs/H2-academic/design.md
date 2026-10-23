# H2 — Base académica: design

**Versión:** 0.3 · **Fecha:** 22/10/2026 (America/Lima)
**H2 SPEC: PENDING HUMAN APPROVAL** · **IMPLEMENTATION: BLOCKED**

Diseño documental 0.3: OQ-H2-001 a 010 y R-H2-001 a 006 resueltas humanamente; Gate 1 del Spec sigue pendiente. [requirements.md](requirements.md) registra decisiones y sustituciones expresas de HU. Base de rama main `32f38ff9ea1bf576bde54735e4a6879f4faf7e35`; revisión anterior publicada `b8c701b303c5610b065c3dfaa9018cc75008405e`. Sin SQL, migraciones ni implementación.

## DES-H2-001 — Recorrido y evolución de seguridad

**REQ:** 001, 007, 008, 010, 014–016.

React → cliente SDK único → Data API de lectura / RPC específica de mutación necesaria → autorización vigente → constraints y operación PostgreSQL → auditoría transaccional. React presenta, Auth identifica, RLS protege acceso, PostgreSQL garantiza invariantes. Sin backend, Edge Functions, Redux, repositorios genéricos ni motor de permisos.

La migración futura evoluciona explícitamente el catálogo H1 (incluida su restricción a dos códigos), semillas, fixtures, consultas y políticas que dependían de ADMIN/OPERADOR. Roles funcionales: DIRECTOR_ACADEMICO, COORDINADOR_ACADEMICO, ADMIN_SISTEMA. No convertir automáticamente asignaciones técnicas existentes en permisos reales ni dar derechos por metadata/nombre. Propuesta para entorno local: retirar fixtures de ensayo H1 de forma controlada y crear fixtures sintéticos funcionales nuevos; un usuario existente que deba conservarse recibe asignación funcional explícita autorizada, nunca inferida de su rol técnico; no se incluyen cuentas reales en fixtures. Los roles técnicos pueden retirarse del catálogo funcional tras la migración sin reescribir historia. Los códigos técnicos no conceden permisos académicos ni de auditoría, aunque aparezcan en una prueba de compatibilidad.

Se conservan app_users, app_roles, app_user_roles, multirol y comprobación de usuario/rol activo; no reemplazar Auth ni crear perfiles paralelos. Reutilizar la propiedad del helper H1 de sujeto auth.uid() y estado vigente, revisando referencias concretas al catálogo. Adaptar /seguridad como consulta de seguridad existente y /seguridad/usuarios como directorio de solo lectura de ADMIN_SISTEMA; Director no obtiene directorio por defecto. Otros usuarios habilitados conservan consulta de seguridad propia, sin directorio global. Multirol solo suma acceso de ADMIN_SISTEMA si está explícitamente asignado y activo. No CRUD de identidad/roles HU17/HU18 en H2. No reescribir migración ni aceptación/evidencia histórica H1. La regresión prueba propiedades de seguridad, no exige mantener los roles técnicos como producto.

## DES-H2-002 — Modelo relacional y catálogos

**REQ:** 002–007, 009. Nombres conceptuales, no DDL. Toda entidad tiene UUID técnico generado/controlado por DB; FK por UUID, nunca nombre/código.

| Entidad | Datos / reglas |
|---|---|
| Materia | UUID, código trim/MAYÚSCULAS UNIQUE ≤30, nombre trim/MAYÚSCULAS UNIQUE ≤150, descripción opcional ≤500, active BOOLEAN, created_at y updated_at DB |
| Carrera | Mismas reglas de UUID/código/nombre/descripción/active/tiempos, sigla obligatoria trim/MAYÚSCULAS UNIQUE alfanumérica 2–10 editable, modalidad FK UUID a catalogo_valor de MODALIDAD_CARRERA; ≥1 materia ACTIVA al guardar |
| Carrera–Materia | UUID técnico para auditoría de la asociación y FK UUID carrera/materia, par UNIQUE; sin duplicados ni huérfanos; versión de agregado controlada en Carrera |
| Ciclo | UUID, carrera UUID, año de creación fijo, correlativo global anual fijo, codigo_ciclo derivado no editable, inicio/fin, promoción opcional ≤150, Departamento/Provincia/Distrito y Capitanía obligatorios, estado_codigo, motivo sensible, tiempos DB; sin DELETE físico |
| Ciclo–Materia | UUID propio, FK UUID ciclo/materia, par UNIQUE, activo, origen único HEREDADA/ADICIONAL, motivo_inactivacion RETIRO_MANUAL/CAMBIO_CARRERA cuando corresponda, observación opcional útil; sin borrado físico ni doble origen; versión de agregado en Ciclo |
| Departamento / Provincia / Distrito | UUID, identificador oficial de origen, nombre, active; Provincia referencia Departamento y Distrito referencia Provincia |
| Capitanía | UUID, código/nombre de catálogo controlado, active; referencia estable para superposición, no texto libre |
| catalogo | UUID, código UNIQUE, nombre, activo, timestamps; definiciones planas MODALIDAD_CARRERA y MOTIVO_CICLO_DESIERTO en H2 |
| catalogo_valor | UUID, catalogo_id FK UUID, código, nombre, activo, orden cuando necesario, timestamps; unicidad del código dentro de su catálogo; sin tablas específicas de modalidad/motivo |
| Evento de auditoría | UUID, entidad, UUID registro afectado, acción, actor UUID auth.uid(), timestamp DB, motivo nullable, old_values JSONB y new_values JSONB |

Ciclo requiere fechas inicio/fin, Carrera, mínimo una Materia activa al registrarse y ubicación por Departamento/Provincia/Distrito/Capitanía; Capitanía activa al registrar. DB garantiza jerarquía Departamento→Provincia→Distrito. No dirección libre en H2 ni relación inventada Capitanía→Distrito. Fuentes de datos iniciales: UBIGEO oficial INEI y Capitanías oficiales DICAPI; en la construcción se registran fuente y versión/fecha de carga. No se necesita decidir una nueva regla de negocio para elegir formato de importación; no descargar ni cargar datos en esta fase documental.

Listas planas usan solo catalogo/catalogo_valor, sin tablas Modalidad/Motivo independientes ni motor de comportamiento dinámico. Semillas aprobadas MODALIDAD_CARRERA: CON_EXPERIENCIA, SIN_EXPERIENCIA. MOTIVO_CICLO_DESIERTO: FALTA_ALUMNOS (FALTA DE ALUMNOS), FALTA_INSTRUCTOR (FALTA DE INSTRUCTOR), CANCELACION_INSTITUCIONAL (CANCELACIÓN INSTITUCIONAL), CONDICIONES_CLIMATICAS (CONDICIONES CLIMÁTICAS), OTRO (OTRO). Otras listas como SEXO son ejemplos futuros de reutilización, no seeds H2. Propuesta técnica: unicidad código de valor dentro del catálogo y validación DB de pertenencia del UUID recibido al catálogo requerido; un valor activo de otro catálogo no es válido para modalidad/motivo.

DESIERTO requiere referencia a valor activo de MOTIVO_CICLO_DESIERTO, con detalle obligatorio si es OTRO. Mantener referencia histórica incluso tras inactivarlo; no borrar valores históricos. ANULADO e inactivación de Materia/Carrera usan motivo libre obligatorio, sin reutilizar automáticamente el catálogo Desierto. Carga inicial controlada del sistema, no mantenimiento UI genérico ni carga manual obligatoria del usuario.

Normalización/unicidad de Materia/Carrera en PostgreSQL incluso inactivos; códigos/nombres editables sin conflicto, FK UUID estables. Sin equivalencia sin acentos no solicitada. active solo en maestras, no Ciclo; reactivación permitida y no DELETE de maestras. Carrera debe conservar ≥1 Materia ACTIVA para guardarse: retirar asociación o inactivar Materia que deje alguna Carrera sin activa se rechaza; asociar primero otra activa. Inactivación de Materia conserva referencias y no elimina relaciones de Ciclo; Carrera inactiva no es seleccionable para crear nuevos ciclos. La pérdida posterior de vigencia de una materia no borra la historia de un Ciclo existente ni agrega un requisito no solicitado de sustituir automáticamente sus materias.

## DES-H2-003 — Operaciones compuestas, sincronización y concurrencia

**REQ:** 002–007, 009, 014. Constraints DB para claves, unicidad normalizada, tipos, longitudes, FK, pertenencia de valores a catálogo, jerarquía, fechas y estados; no precheck UI como garantía. Mínimo Carrera/materia y cambios de estado/asociaciones se comprueban transaccionalmente, seguros ante peticiones concurrentes.

### Contratos de escritura y edición optimista

RPC concretas para guardar Materia, Carrera+asociaciones/sigla, Ciclo+materias y transición/active con motivo cuando corresponda. Se justifican por compare-and-update, motivo sensible e invariantes compuestas/auditoría; lectura Data API bajo RLS. Sin endpoint genérico tabla/SQL/actor ni segunda capa de CRUD.

Toda edición recibe UUID y expected_updated_at leído; DB compara atómicamente versión, autoriza, valida, modifica y asigna updated_at servidor que avanza con el cambio. Conflicto rechaza transacción con mensaje de recarga; sin última escritura gana, merge/retry automático o reserva/lock pesimista de pantalla. INSERT no requiere versión previa. Toda mutación de asociación avanza versión padre Carrera/Ciclo; cambios automáticos de sigla/sincronización también avanzan versión de ciclos afectados, invalidando formularios previos. Auditoría y versiones se confirman juntas, no tras un precheck separado en React.

Retirar asociación Carrera–Materia o inactivar Materia solo si cada Carrera afectada conserva ≥1 activa. Carrera/ciclos y sincronización se validan sobre conjunto vigente DB, no lista enviada por navegador. La garantía concurrente de mínimos no se delega al formulario; la implementación técnica puede usar constraints/comprobación transaccional acotada sin introducir un sistema de reservas de edición.

### Materias de Ciclo: origen único, conservación y sincronización aditiva

Nuevo Ciclo precarga solo materias ACTIVAS de Carrera; Director/Coordinador pueden añadir otras activas. Debe registrarse con ≥1 materia activa; inactivas no se precargan ni se agregan manualmente al nuevo ciclo. Guardar un Ciclo existente no debe borrar automáticamente una materia que se inactivó después.

Ciclo–Materia es fila permanente con activo, origen único HEREDADA o ADICIONAL y motivo_inactivacion cuando se retire; UNIQUE del par Ciclo/Materia. Sin marcas de doble origen, duplicados ni reclasificación automática. Retiro manual de heredada conserva fila activo=false, motivo RETIRO_MANUAL; aplicar conservación de fila a cualquier retiro manual de relación. Solo acción explícita posterior autorizada puede reactivarla, auditada; sincronización no la reactiva.

Sincronización Carrera→Ciclo de PROGRAMADO/EN_CURSO: **agregar únicamente relaciones faltantes** de materias activas, sin reclasificar, duplicar ni reactivar filas existentes. Una ADICIONAL que pasa a pertenecer a Carrera sigue ADICIONAL. La retirada de una asociación Carrera–Materia no se convierte por sí sola en retiro destructivo de relaciones existentes del ciclo: esta precisión humana sustituye la idea anterior de reemplazar automáticamente el conjunto heredado. No sincronización bidireccional.

Cambio de Carrera de un Ciclo editable: inactivar HEREDADAS activas de Carrera anterior con motivo CAMBIO_CARRERA, conservar ADICIONALES, sincronizar activas de nueva Carrera agregando solo pares que aún no existan, no reactivar filas inactivadas ni siquiera si aparecen en nueva Carrera. Sin segunda fila o cambio de origen para un par existente. Cambiar Carrera, relaciones, versiones y auditoría es atómico. Ciclos CERRADO/DESIERTO/ANULADO no se reescriben. Inactivación de Materia no ejecuta sincronización de retiro en Ciclo.

### Correlativo anual, sigla y código

Sigla Carrera obligatoria, trim/MAYÚSCULAS, UNIQUE y alfanumérica 2–10; sugerencia inicial UI opcional, usuario decide y valor queda persistido, no recálculo por nombre. Año DB de creación en America/Lima, no fecha académica ni reloj de navegador. Correlativo global anual concurrente, no por Carrera; año/correlativo inmutables después de crear. Contador interno transaccional por año y unicidad del par año/correlativo; sin MAX+1 en navegador ni promesa gapless o recuperación especial de números consumidos.

Representación mínimo tres dígitos: 1→001, 15→015, 999→999, 1000→1000; sin tope funcional 999. Código AÑO-CORRELATIVO-SIGLA no editable; ejemplo 2026-015-NAV. Cambiar Carrera de ciclo editable deriva sufijo de su Carrera vigente sin cambiar año/correlativo, como consecuencia del formato aprobado; no se añade un código manual alternativo.

Al cambiar sigla de Carrera advertir ciclos afectados; DB recalcula conjunto vigente. Guardar nueva sigla, actualizar solo sufijo de códigos en PROGRAMADO/EN_CURSO, avanzar versiones y auditar, todo atómico. CERRADO/DESIERTO/ANULADO conservan código histórico. Cambiar nombre/código de Carrera no modifica por sí mismo la sigla ni rompe FK UUID.

### Estados, edición y superposición: matriz cerrada

Ciclo se crea PROGRAMADO. Solo DIRECTOR_ACADEMICO cambia estado manualmente; nunca scheduler/cron o cambio por fecha.

| Origen | Destino permitido | Motivo |
|---|---|---|
| PROGRAMADO | EN_CURSO | No motivo obligatorio ordinario |
| EN_CURSO | CERRADO | No motivo obligatorio ordinario |
| PROGRAMADO | DESIERTO | Valor activo del catálogo aprobado; OTRO con detalle |
| EN_CURSO | DESIERTO | Valor activo del catálogo aprobado; OTRO con detalle |
| PROGRAMADO | ANULADO | Texto libre obligatorio; restricciones evolutivas según movimientos futuros |

Todas las demás transiciones, incluida reapertura de CERRADO/DESIERTO/ANULADO y EN_CURSO→ANULADO, se deniegan. Terminales solo consulta. Director/Coordinador editan ordinariamente PROGRAMADO y EN_CURSO durante H2; con matrículas en H3 se restringirá según HU3 a Director y promoción/fechas. Sin cascada de estado a hijos ni destrucción histórica.

Superposición solo para PROGRAMADO/EN_CURSO/CERRADO: mismo UUID Carrera + mismo UUID Capitanía y fechas inclusivas cruzadas → rechazo concurrente. Un extremo compartido cruza; diferente Carrera o Capitanía permite coincidencia. DESIERTO/ANULADO no participan y liberan rango; CERRADO sí conserva restricción histórica. Propuesta de exclusión declarativa PostgreSQL con predicado de esos tres estados, igualdad UUID y rango inclusivo; revisar soporte/operadores en implementación aprobada, no instalar extensiones en esta entrega. Rechazar fin anterior a inicio; un rango de un día es válido bajo el intervalo inclusivo sin duración mínima adicional.

ANULADO solo desde PROGRAMADO, y cuando existan matrículas/facturación se deniega en DB si las tiene; con matrículas comunicar alternativa DESIERTO cuando corresponda. Dependencia evolutiva H3/H4/H7 documentada, no entidades/flags ficticios para declararla probada en H2.

### Ciclo no guardado versus registro permanente

Cancelar/Descartar formulario de ciclo nuevo aún no guardado solo descarta estado UI: no persistencia, DELETE ni auditoría. Una vez guardado, **Ciclo = registro histórico permanente**, incluso PROGRAMADO; sin DELETE desde aplicación por Data API ni RPC. Creación errónea se trata con ANULADO si satisface reglas y permisos; todos los terminales conservan fila y asociaciones históricas. No botón Eliminar para el registro persistido.

## DES-H2-004 — Permisos reales, grants y frontera de comandos

**REQ:** 001, 008, 014. H1 ADMIN/OPERADOR son históricos; ninguna policy H2 los admite como roles de producto. Estado de usuario/rol y asignaciones vigentes con auth.uid(), no metadata/JWT de permisos del navegador.

| Rol activo | Materias | Carreras y asociaciones | Ciclos | Auditoría |
|---|---|---|---|---|
| DIRECTOR_ACADEMICO | Consultar/crear/modificar/activar/inactivar | Consultar/crear/modificar/activar/inactivar y gestionar materias/sigla | Consultar, crear, editar ordinario y transiciones manuales expresas | Consultar/listar y filtros |
| COORDINADOR_ACADEMICO | Lectura referencial para Ciclos, sin crear/editar/activar/inactivar | Lectura referencial para Ciclos, sin crear/editar/activar/inactivar/asociar | Consultar/crear/editar ordinario en PROGRAMADO/EN_CURSO; sin transición manual de estado; terminales consulta | Consultar/listar y filtros |
| ADMIN_SISTEMA | Sin CRUD académico implícito | Sin CRUD académico implícito | Sin CRUD académico implícito | Consultar/listar y filtros |
| Multirol | Unión solo de capacidades funcionales activas asignadas | Igual | Igual, rol Director necesario para estados | Según rol activo |
| Anónimo, JWT inválido/vencido, usuario inactivo/sin fila/sin rol activo | Denegado | Denegado | Denegado | Denegado |
| Solo roles técnicos ADMIN/OPERADOR | Sin permiso funcional | Sin permiso funcional | Sin permiso funcional | Sin permiso funcional |

Nadie puede modificar auditoría ni asignar roles desde cliente. Coordinador tiene lectura referencial de Carreras, Materias, geografía, Capitanías y catálogos de Ciclo: opciones activas para nuevas operaciones y referencias inactivas para representar historia. No mantenimiento por ese permiso. Director necesita las mismas referencias para operar Ciclo; no se agrega mantenimiento UI genérico de catálogos. ADMIN_SISTEMA conserva directorio de seguridad H1 de solo lectura, pero no CRUD académico. No FOR ALL permisivo ni permiso transversal «authenticated escribe». Policies SELECT de dominio y auditoría concretas por capacidades; grants mínimos, RLS habilitado en cada tabla expuesta. Datos de ubicación y motivos no se usan para inferir permisos.

Para comandos que deben cerrar bypass, propuesta de RPC SECURITY DEFINER acotadas: propietario confiable fijo, search_path vacío, referencias calificadas, auth.uid() y autorización vigente por operación, whitelist de campos, sin SQL dinámico ni actor arbitrario. Revocar EXECUTE por defecto a PUBLIC/anon y limitar a authenticated; autorización dentro del cuerpo, no solo grant de ejecución. Retirar grants de escritura directa al navegador para tablas gestionadas por comando, asociaciones, versiones/códigos internos y auditoría. Lectura sigue RLS. Justificación explícita: el owner puede eludir RLS, por lo que cada comando debe comprobar autorización y todo ID/estado dentro de la misma operación; los nombres o parámetros no son garantía. Privilegios no se heredan implícitamente del helper H1.

Probar llamada directa de toda RPC, composición OR de policies, grants, funciones privadas/alternativas, inactivación/revocación con el mismo JWT y metadata manipulada. Ningún comando expuesto para cambiar catálogo de roles o hacer CRUD genérico. Si revisar el patrón exige ampliar alcance o tecnología, detener tarea afectada.

## DES-H2-005 — Auditoría PostgreSQL relacional append-only

**REQ:** 009, 014. Evento UUID con entidad, UUID afectado, acción, actor de auth.uid(), timestamp DB, motivo nullable y old_values/new_values JSONB de campos de negocio pertinentes. JSONB es contenido flexible dentro de tabla PostgreSQL, no adopción documental/NoSQL ni payload completo. CREATE registra nuevo estado; UPDATE antes/después; asociaciones, estados, inactivación/reactivación, ANULADO y cambios automáticos de sigla/heredadas dejan eventos identificables. Asociación tiene UUID estable para cumplir UUID afectado.

Propuesta de triggers internos de tablas/relaciones para captar cambios directos internos y RPC, nunca callback posterior de React. Mutación y auditoría en misma transacción: si falla auditoría, todo revierte; rollback no deja evento de éxito. Operación compuesta puede producir eventos por registro realmente cambiado, sin plataforma genérica de correlación. Actor del comando actual también atribuye cambios propagados; DB no acepta actor/fecha del cuerpo. Carga administrativa de catálogo/fixtures separada e identificada como técnica, no inventar humano ni normalizar auth.uid() nulo para tráfico de producto.

Motivo NO requerido para actualización ordinaria ni activación. Obligatorio para DESIERTO, ANULADO, inactivar Materia y Carrera. No añadir otra acción sensible por cuenta propia; cualquier ampliación debe quedar expresamente aprobada. Comando transporta motivo acotado y validado por el servidor, vinculándolo a sus eventos en la misma transacción; el trigger obtiene contexto interno confiable del comando, no de un evento arbitrario enviado por navegador. DESIERTO valida UUID de catalogo_valor activo y perteneciente a MOTIVO_CICLO_DESIERTO, y detalle si código OTRO; conservar referencia histórica aunque se inactive. Auditoría registra referencia/código significativo y detalle pertinente. ANULADO e inactivaciones conservan motivo libre obligatorio, sin usar automáticamente ese catálogo.

Sin INSERT/UPDATE/DELETE/TRUNCATE para cliente en auditoría ni RPC pública para fabricarla. Trigger privilegiado mínimo con owner/search_path/grants revisados, sin EXECUTE público. Lectura RLS para Director, Coordinador y Admin Sistema, solo habilitados; listado básico con filtros fecha/actor/entidad/acción, sin reportes avanzados ni exportador analítico. Excluir contraseñas, JWT, secretos y payload indiscriminado. No prometer retención legal no definida ni introducir CDC, cola, NoSQL, DynamoDB o MongoDB.

## DES-H2-006 — UI, advertencias y conflicto de edición

**REQ:** 002–010, 012. Pantallas concretas bajo `/academico` y consulta básica de auditoría; un formulario/listado por caso, sin motores genéricos. Materias/Carreras muestran active; Ciclo muestra estado_codigo y código generado no editable. Campos de Materia/Carrera y sigla anticipan normalización sin ser autoridad. Ciclo usa referencias iniciales con jerarquía geográfica obligatoria y Capitanía activa; promoción opcional ≤150, sin dirección libre. Materias muestran origen único y estado de asociación; retiro conserva fila inactiva y sincronización no revive lo retirado. Selectores de nuevas operaciones solo activos; referencias históricas inactivas siguen legibles sin convertirse en mantenimiento.

Advertir al inactivar materia que dejará de cargarse para nuevos ciclos y no se quitará de existentes; inactivar carrera explica indisponibilidad para nuevos ciclos y preservación de referencias. Pedir motivo en ambas, DESIERTO y ANULADO; no pedirlo para toda edición. Antes de cambiar sigla advertir ciclos afectados y mostrar límites terminales; la DB recalcula afectados, UI no decide alcance. Estados manuales solo para Director según matriz, sin cambios por fecha. Terminales solo consulta; en Ciclo nuevo sin guardar Cancelar/Descartar no genera evento persistido, y en Ciclo guardado nunca existe Eliminar: error de registro se trata con ANULADO cuando corresponda.

Al editar, conservar updated_at leído y enviar como versión esperada. Conflicto no reintenta con versión nueva automáticamente ni fusiona: informa «El registro fue modificado por otro usuario. Actualiza la información antes de volver a guardar»; usuario recarga y decide. No reservar pantalla ni crear locks de usuario. Errores/confirmaciones comprensibles, labels/errores asociados, tablas con encabezados, foco visible/restaurado, selección por teclado y estado legible más allá del color.

Conservar patrón H1 contra respuestas tardías: vaciar datos y formularios en cambio de identidad/logout, ignorar resultados de actor previo. Los escenarios de cambio multirol→Coordinador prueban la propiedad histórica M→O sin conservar OPERADOR como producto. Preferencia visual no guarda identidad, roles ni datos académicos.

## DES-H2-007 — Temas sin infraestructura adicional

**REQ:** 010–013. Preferencia única validada: system/light/dark/high-contrast. Propuesta: selector accesible compartido en el marco de aplicación, estado local React y atributo en raíz; CSS variables semánticas compartidas. No nuevo Context global, dependencia o framework si un estado en la raíz y CSS resuelven el caso. El cambio transversal es aprobado, esta implementación concreta espera Gate 1.

Sistema por defecto sin preferencia guardada. En Sistema, seguir cambios en vivo de `prefers-color-scheme`; reconocer preferencias de contraste disponibles sin convertirlas en permisos o datos del perfil. Claro/Oscuro/Alto contraste son paletas propias explícitas. `forced-colors: active` o equivalente soportado por el entorno siempre prevalece, incluso con selección explícita: usar colores del sistema y controles semánticos, conservar bordes/foco; no desactivar globalmente con forced-color-adjust: none. La preferencia elegida se recuerda, sin impedir la prioridad temporal del sistema.

Persistencia propuesta: una clave local de navegador para esta preferencia, sin identidad ni sincronización. Valor ausente/inválido → Sistema; almacenamiento inaccesible → preferencia en memoria, sin bloquear UI. Reinicio restaura selección válida; logout limpia datos de sesión, no necesita borrar preferencia visual del dispositivo. Documentar que se comparte por navegador, no entre dispositivos.

Tokens compartidos: fondo, superficies normal/elevada, textos principal/secundario/deshabilitado, bordes normal/fuerte, primario y su texto, foco, éxito, advertencia, error e información. Una paleta cambia valores, componentes consumen significado. Medir pares reales de texto/fondo y estados, no solo colores sueltos. Propuesta de verificación: normal ≥4.5:1, grande ≥3:1; componentes/indicadores necesarios ≥3:1 conforme a excepciones de WCAG. No exigir ratio normativo inexistente a controles inactivos, aunque la legibilidad de deshabilitados sigue siendo requisito de producto.

Pruebas automáticas de resolución/persistencia y medición documentada, más revisión humana de los cuatro modos, teclado, foco no oculto, tablas, formularios, selección y errores. Forced-colors real cuando el entorno lo permita; emulación solo complementa y no se declara prueba humana del SO. Si no se dispone, registrar no verificado y pedir decisión, sin afirmar conformidad completa por una captura o una suite verde.

Referencias técnicas primarias de apoyo, sin agregar reglas de negocio: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [contraste de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum), [forced-colors](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/forced-colors), [preferencia de esquema](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-color-scheme).

## DES-H2-008 — Seguridad aplicable

**REQ:** 007–009, 014. Controles OWASP aplicables: autenticación existente, acceso por objeto y operación en DB, validación cerrada de tipos/campos/tamaños/estados, mínimos privilegios y secretos fuera del frontend. Consultas SDK/SQL parametrizadas, sin interpolación de SQL ni nombres de tabla desde cliente. Texto de usuario renderizado como texto escapado por React, sin HTML arbitrario. Salidas con proyección explícita y errores sin detalle interno/secretos; validar también respuesta antes de usarla.

El SDK usa bearer JWT; no se introduce sesión de aplicación autenticada mediante cookies ambientales, por lo que no se añade un token CSRF ceremonial. Revisar de nuevo si cambia ese mecanismo; no desactivar validación de origen ni otros controles de plataforma. XSS sigue siendo riesgo porque el SDK accede a tokens. Service role solo en fixtures/observación local protegidos, jamás en navegador ni en peticiones que prueban autorización. Inactivación de usuario/rol debe negar nuevas solicitudes incluso con el mismo JWT vigente. Conservar riesgo residual JWT aceptado en H1.

Negativos desde Data API/RPC con JWT ordinario, IDs ajenos/inexistentes, payload con actor/estado/campos internos, acceso a auditoría, tablas puente y funciones. Diferenciar respuesta filtrada de error; verificar filas reales y ausencia de efectos. No crear un servidor o herramienta de seguridad adicional por checklist.

## DES-H2-009 — Operación, evidencia y pilares

**REQ:** 001, 014–016. Migraciones futuras aditivas propias H2, incluida evolución del catálogo de roles; nunca reescribir H1 aceptado. Carga inicial de catalogo/catalogo_valor de H2 y maestras propias, con UBIGEO oficial INEI, DICAPI, modalidades HU2 y motivos humanos aprobados, fuente/versión/fecha controladas, sin exigir carga manual del usuario ni ejecutar cargas en esta entrega. Adaptar inventario técnico de tres tablas H1 al inventario exacto aprobado H2 conservando checks de seguridad. Reset desde cero, fixtures sintéticos por actor y cleanup exacto; mismos scripts/guard local, sin tocar firewall/Docker/WSL ni levantar entorno durante esta fase documental. Adaptar suites, inventario y fixtures al catálogo funcional sin alterar evidencia histórica ni perder las propiedades H1 de identidad, multirol, revocación, sesión y denegación por defecto. CI ampliada solo después de Gate 1, sin deploy/acceptance/merge automático.

| Pilar del PLAN | Aplicación concreta | Evidencia futura |
|---|---|---|
| Seguridad | Auth/RLS, grants, restricciones de RPC y auditoría no manipulable | Matriz de accesos, bypass y revisión de privilegios |
| Fiabilidad | Constraints y transacciones de asociaciones/auditoría; reglas concurrentes | Rollback, duplicados simultáneos, reset reproducible |
| Eficiencia de rendimiento | Consultas proyectadas e índices de claves/FK/filtros justificados; sin capa remota nueva | Inspeccionar consultas representativas y número de llamadas; sin SLA inventado |
| Optimización de costos | Plataforma local y dependencias existentes; sin recursos/servicios adicionales | Inventario y comparación de código/configuración con API CRUD razonable |
| Excelencia operativa | Comandos documentados, errores diagnosticables, migraciones y trazabilidad por commit | Clon/reset, CI positiva/negativa, recorrido humano |

Son criterios concretos de diseño, no certificación ni motivo para desplegar en AWS. Gate humano H2 evalúa simplicidad real, sin construir una segunda API para compararla: inventario cualitativo de responsabilidades, archivos/configuración y recorrido de diagnóstico. Si RLS o auditoría exige demasiadas capas, registrar hallazgo y pedir decisión; no agregar backend automáticamente.

**H2 SPEC: PENDING HUMAN APPROVAL**
**H2 IMPLEMENTATION: BLOCKED — NOT STARTED**
