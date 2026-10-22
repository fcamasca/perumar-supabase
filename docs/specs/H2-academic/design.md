# H2 — Base académica: design

**Versión:** 0.2 · **Fecha:** 22/10/2026 (America/Lima)
**H2 SPEC: PENDING HUMAN APPROVAL** · **IMPLEMENTATION: BLOCKED**

Diseño documental revisado con OQ-H2-001 a 010 resueltas humanamente, no Gate 1 aprobado. [requirements.md](requirements.md) contiene decisiones, sustituciones de HU y detalles residuales R-H2-001 a 006. Base de rama: main `32f38ff9ea1bf576bde54735e4a6879f4faf7e35`; Spec previo `a8490c3bf78f1a37a73a1a19bbfcb49cc3079bec`. Sin SQL ni implementación.

## DES-H2-001 — Recorrido y evolución de seguridad

**REQ:** 001, 007, 008, 010, 014–016.

React → cliente SDK único → Data API de lectura / RPC específica de mutación necesaria → autorización vigente → constraints y operación PostgreSQL → auditoría transaccional. React presenta, Auth identifica, RLS protege acceso, PostgreSQL garantiza invariantes. Sin backend, Edge Functions, Redux, repositorios genéricos ni motor de permisos.

La migración futura evoluciona explícitamente el catálogo H1 (incluida su restricción a dos códigos), semillas, fixtures, consultas y políticas que dependían de ADMIN/OPERADOR. Roles funcionales: DIRECTOR_ACADEMICO, COORDINADOR_ACADEMICO, ADMIN_SISTEMA. No convertir automáticamente asignaciones técnicas existentes en permisos reales ni dar derechos por metadata/nombre. Propuesta para entorno local: retirar fixtures de ensayo H1 de forma controlada y crear fixtures sintéticos funcionales nuevos; cualquier asignación a usuario real requiere R-H2-006. Los códigos técnicos no conceden permisos académicos ni de auditoría, aunque aparezcan en una prueba de compatibilidad.

Se conservan app_users, app_roles, app_user_roles, multirol y comprobación de usuario/rol activo; no reemplazar Auth ni crear perfiles paralelos. Reutilizar la propiedad del helper H1 de sujeto auth.uid() y estado vigente, revisando referencias concretas al catálogo. Evolucionar pruebas/rutas de seguridad solo con la decisión expresa sobre su acceso (R-H2-006); no otorgar a ADMIN_SISTEMA directorio de usuarios o administración de identidad por su nombre. No reescribir migración ni aceptación/evidencia histórica H1. La regresión prueba propiedades de seguridad, no exige mantener los roles técnicos como producto.

## DES-H2-002 — Modelo relacional y catálogos

**REQ:** 002–007, 009. Nombres conceptuales, no DDL. Toda entidad tiene UUID técnico generado/controlado por DB; FK por UUID, nunca nombre/código.

| Entidad | Datos / reglas |
|---|---|
| Materia | UUID, código trim/MAYÚSCULAS UNIQUE ≤30, nombre trim/MAYÚSCULAS UNIQUE ≤150, descripción opcional ≤500, active BOOLEAN, created_at y updated_at DB |
| Carrera | Mismas reglas de UUID/código/nombre/descripción/active/tiempos, sigla persistida trim/MAYÚSCULAS editable, modalidad FK a catálogo; R-H2-004 fija límites de sigla |
| Carrera–Materia | UUID técnico para auditoría de la asociación y FK UUID carrera/materia, par UNIQUE; sin duplicados ni huérfanos; versión de agregado controlada en Carrera |
| Ciclo | UUID, carrera UUID, año de creación fijo, correlativo global anual fijo, codigo_ciclo derivado no editable, inicio/fin, promoción, ubicación, estado_codigo, motivo sensible cuando aplica, tiempos DB |
| Ciclo–Materia | UUID propio, FK UUID ciclo/materia, par UNIQUE, procedencia heredada/adicional distinguible; propuesta de marcas de origen para preservar un adicional que también exista en carrera, su semántica final requiere R-H2-003 |
| Departamento / Provincia / Distrito | UUID, identificador oficial de origen, nombre, active; Provincia referencia Departamento y Distrito referencia Provincia |
| Capitanía | UUID, código/nombre de catálogo controlado, active; referencia estable para superposición, no texto libre |
| Modalidad de Carrera / Motivo de Ciclo Desierto | UUID, código/nombre controlado y active; solo catálogos necesarios para H2, sin módulo universal de maestras |
| Evento de auditoría | UUID, entidad, UUID registro afectado, acción, actor UUID auth.uid(), timestamp DB, motivo nullable, old_values JSONB y new_values JSONB |

Ciclo guarda referencias geográficas coherentes con Departamento → Provincia → Distrito, comprobadas en DB; Capitanía es referencia independiente salvo relación adicional aprobada. No deducir jerarquía Capitanía→Distrito no documentada. Fuente/versionado/cobertura de catálogo y obligatoriedad fina de ubicación se cierran en R-H2-002/005. Cargas iniciales futuras controladas/versionadas del sistema, no creación manual de catálogos por cada usuario. La modalidad conserva los significados con/sin experiencia de HU2. No inventar nombres/valores de Capitanías o motivos en el Spec.

Normalización/unicidad de Materia/Carrera en PostgreSQL incluso para inactivos; códigos/nombres editables sin conflicto, relaciones UUID estables. No prometer equivalencia sin acentos no solicitada. active no se aplica a Ciclo; maestras pueden reactivarse y no se borran físicamente. Materia inactiva sigue relacionada, deja de precargarse, no se elimina de ciclos por cascada. Carrera inactiva no es seleccionable al crear ciclo y conserva referencias existentes. Descripción opcional también en Carrera es decisión humana 005.

## DES-H2-003 — Operaciones compuestas, código, propagación y concurrencia

**REQ:** 002–007, 009, 014. Constraints DB para claves, unicidad normalizada, tipos, longitudes, FK, jerarquía, fechas y estados. No precheck de navegador como garantía.

### Contratos de escritura propuestos

RPC concretas para guardar materia, guardar carrera con selección/sigla, guardar ciclo con materias, cambiar active de maestra con motivo si se inactiva y transición de ciclo. No endpoint genérico ni parámetro tabla/SQL/actor. Las RPC de escritura se justifican por compare-and-update obligatorio, motivo sensible y/o invariantes compuestas con auditoría; consultas/listados siguen Data API bajo RLS. No capa adicional que replique CRUD.

Todos los comandos de edición reciben UUID y expected_updated_at del registro leído, no un timestamp de sustitución. La DB compara atómicamente versión vigente, autoriza actor/operación, valida whitelist, muta y asigna updated_at de servidor que cambia al modificar. Desajuste rechaza toda la operación con mensaje equivalente a «El registro fue modificado por otro usuario. Actualiza la información antes de volver a guardar». Sin última escritura gana, merge automático, reserva de pantalla ni locks pesimistas de edición. El INSERT no exige versión previa.

Carrera y Ciclo son raíces de edición: cualquier cambio de sus asociaciones avanza updated_at del padre; operaciones automáticas que modifican ciclos por propagación/sigla también avanzan su versión. Un formulario abierto antes de esa operación debe entrar en conflicto al guardar, no revertir los cambios automáticos. Comparación real en DB y número de filas afectadas, no check separado en React. Actualización de hijo, padre y auditoría es una única transacción. Inactivaciones/reactivaciones y transiciones también verifican versión.

### Materias heredadas y adicionales

Nuevo ciclo precarga automáticamente solo materias ACTIVAS de carrera. Director/Coordinador pueden agregar otras materias; no se obliga a que pertenezcan a la carrera. Heredadas y adicionales se distinguen sin duplicar el par ciclo/materia. Un adicional no desaparece al retirar la materia de Carrera–Materia. Al inactivar materia no se ejecuta propagación que la quite de ciclos existentes; un usuario autorizado puede retirarla si el ciclo permite edición.

Cambios ordinarios de Carrera–Materia propagan solo componentes heredados de ciclos modificables, preservando adicionales; ciclos CERRADO/DESIERTO/ANULADO no se reescriben. Guardar carrera + asociaciones + ciclos afectados + auditoría se confirma o revierte en conjunto. R-H2-001/003 cierra qué ciclos son modificables, retiros explícitos, doble origen y cambio de carrera antes de construir. No implementar una sincronización que reintroduzca silenciosamente materias retiradas por el usuario. Prohibido almacenar una lista de ciclos afectados suministrada por cliente como autoridad: DB calcula conjunto vigente.

### Correlativo y cambio de sigla

Código AÑO-CORRELATIVO-SIGLA_CARRERA; ejemplo 2026-015-NAV, no pauta aprobada de ancho máximo. Año tomado de creación DB en zona que acuerde R-H2-004, no fecha de inicio editable; año y correlativo inmutables. Contador transaccional interno por año para asignación global anual concurrente; UNIQUE del par año/correlativo, sin MAX+1 desde navegador y sin promesa de numeración sin huecos. No contador por carrera. Código no editable desde UI/API; no mantener un nombre manual alternativo como bypass de decisión 007.

Sigla de Carrera es dato persistido, no se recalcula al cambiar nombre. UI puede sugerir valor inicial y usuario editarlo. Antes de confirmar cambio, advertir existencia de ciclos afectados; la DB recalcula el conjunto vigente al ejecutar. Cambiar sigla, sufijo de códigos de ciclos modificables y auditoría de todos los cambios es atómico; año/correlativo permanecen iguales y los códigos terminales intactos. Ejemplo: 2026-015-NAV → 2026-015-NVA. Cambiar código/nombre de Carrera no rompe FK UUID ni cambia por sí solo la sigla. Actualizaciones automáticas no omiten optimistic concurrency del padre ni las versiones de ciclos.

### Superposición y estados

Rechazar dos ciclos de misma carrera UUID y Capitanía UUID con intersección de rangos inclusivos de fechas, incluso al editar fecha/carrera/Capitanía y en peticiones concurrentes. Distinta carrera o Capitanía puede coincidir. En misma carrera/Capitanía, uno termina el día que otro inicia → existe cruce. Propuesta de garantía declarativa de exclusión de PostgreSQL sobre ambos UUID y rango inclusivo; revisar operadores/soporte necesarios al aprobar diseño, sin escribir DDL ni instalar extensión en este paso. No validación check-then-insert sin garantía concurrente. Descartar índices/extensiones adicionales si no necesarios al mecanismo aprobado.

Decisión 003 no excluye estados del control: no añadir por cuenta propia una excepción para DESIERTO/ANULADO; confirmar interpretación residual R-H2-001 antes de construir. Fin anterior a inicio es inválido; igualdad y campos obligatorios finos deben fijarse en revisión, sin inventar duración mínima.

Ciclo se crea PROGRAMADO. Solo Director transiciona manualmente: PROGRAMADO→EN_CURSO, EN_CURSO→CERRADO; DESIERTO y ANULADO requieren motivo. CERRADO/DESIERTO/ANULADO conservan historia y no se utilizan en nuevas operaciones; sin scheduler ni cascada de estado a hijos. No inferir orígenes universales de flechas «→ DESIERTO/ANULADO»; tabla completa y edición ordinaria de EN_CURSO requiere R-H2-001. Propuesta conservadora: terminales inmutables, sin reapertura no autorizada.

Restricciones evolutivas: si existen matrículas se deniega ANULADO y se comunica alternativa DESIERTO cuando corresponda; con facturación también se deniega ANULADO. Implementar comprobación DB efectiva en hitos donde existan esos movimientos, antes de habilitarlos; H2 no crea tablas futuras ni acepta flags cliente «sin matrículas». Condición HU3 con matrículas: solo Director puede editar promoción/fechas, a aplicar cuando H3 exista, no simular prueba ahora.

## DES-H2-004 — Permisos reales, grants y frontera de comandos

**REQ:** 001, 008, 014. H1 ADMIN/OPERADOR son históricos; ninguna policy H2 los admite como roles de producto. Estado de usuario/rol y asignaciones vigentes con auth.uid(), no metadata/JWT de permisos del navegador.

| Rol activo | Materias | Carreras y asociaciones | Ciclos | Auditoría |
|---|---|---|---|---|
| DIRECTOR_ACADEMICO | Consultar/crear/modificar/activar/inactivar | Consultar/crear/modificar/activar/inactivar y gestionar materias/sigla | Consultar, crear, editar ordinario y transiciones manuales expresas | Consultar/listar y filtros |
| COORDINADOR_ACADEMICO | Sin mantenimiento; lectura mínima para seleccionar ciclo es propuesta R-H2-005 | Sin mantenimiento; consulta referencial mínima propuesta R-H2-005 | Consultar/crear/editar ordinario en ciclos modificables; sin transición manual de estado | Consultar/listar y filtros |
| ADMIN_SISTEMA | Sin CRUD académico implícito | Sin CRUD académico implícito | Sin CRUD académico implícito | Consultar/listar y filtros |
| Multirol | Unión solo de capacidades funcionales activas asignadas | Igual | Igual, rol Director necesario para estados | Según rol activo |
| Anónimo, JWT inválido/vencido, usuario inactivo/sin fila/sin rol activo | Denegado | Denegado | Denegado | Denegado |
| Solo roles técnicos ADMIN/OPERADOR | Sin permiso funcional | Sin permiso funcional | Sin permiso funcional | Sin permiso funcional |

Nadie puede modificar auditoría ni asignar roles desde cliente. Catálogos iniciales sin mantenimiento UI implícito; lectura necesaria debe aprobarse explícitamente. No FOR ALL permisivo ni permiso transversal «authenticated escribe». Policies SELECT de dominio y auditoría concretas por capacidades; grants mínimos, RLS habilitado en cada tabla expuesta. Datos de ubicación y motivos no se usan para inferir permisos.

Para comandos que deben cerrar bypass, propuesta de RPC SECURITY DEFINER acotadas: propietario confiable fijo, search_path vacío, referencias calificadas, auth.uid() y autorización vigente por operación, whitelist de campos, sin SQL dinámico ni actor arbitrario. Revocar EXECUTE por defecto a PUBLIC/anon y limitar a authenticated; autorización dentro del cuerpo, no solo grant de ejecución. Retirar grants de escritura directa al navegador para tablas gestionadas por comando, asociaciones, versiones/códigos internos y auditoría. Lectura sigue RLS. Justificación explícita: el owner puede eludir RLS, por lo que cada comando debe comprobar autorización y todo ID/estado dentro de la misma operación; los nombres o parámetros no son garantía. Privilegios no se heredan implícitamente del helper H1.

Probar llamada directa de toda RPC, composición OR de policies, grants, funciones privadas/alternativas, inactivación/revocación con el mismo JWT y metadata manipulada. Ningún comando expuesto para cambiar catálogo de roles o hacer CRUD genérico. Si revisar el patrón exige ampliar alcance o tecnología, detener tarea afectada.

## DES-H2-005 — Auditoría PostgreSQL relacional append-only

**REQ:** 009, 014. Evento UUID con entidad, UUID afectado, acción, actor de auth.uid(), timestamp DB, motivo nullable y old_values/new_values JSONB de campos de negocio pertinentes. JSONB es contenido flexible dentro de tabla PostgreSQL, no adopción documental/NoSQL ni payload completo. CREATE registra nuevo estado; UPDATE antes/después; asociaciones, estados, inactivación/reactivación, ANULADO y cambios automáticos de sigla/heredadas dejan eventos identificables. Asociación tiene UUID estable para cumplir UUID afectado.

Propuesta de triggers internos de tablas/relaciones para captar cambios directos internos y RPC, nunca callback posterior de React. Mutación y auditoría en misma transacción: si falla auditoría, todo revierte; rollback no deja evento de éxito. Operación compuesta puede producir eventos por registro realmente cambiado, sin plataforma genérica de correlación. Actor del comando actual también atribuye cambios propagados; DB no acepta actor/fecha del cuerpo. Carga administrativa de catálogo/fixtures separada e identificada como técnica, no inventar humano ni normalizar auth.uid() nulo para tráfico de producto.

Motivo NO requerido para actualización ordinaria ni activación. Obligatorio para DESIERTO, ANULADO, inactivar Materia y Carrera. No añadir otra acción sensible por cuenta propia; cualquier ampliación debe quedar expresamente aprobada. Comando transporta motivo acotado y validado por el servidor, vinculándolo a sus eventos en la misma transacción; el trigger obtiene contexto interno confiable del comando, no de un evento arbitrario enviado por navegador. Resolver catálogo de motivos DESIERTO vs texto en R-H2-002, preservando obligatoriedad del motivo en ambos casos.

Sin INSERT/UPDATE/DELETE/TRUNCATE para cliente en auditoría ni RPC pública para fabricarla. Trigger privilegiado mínimo con owner/search_path/grants revisados, sin EXECUTE público. Lectura RLS para Director, Coordinador y Admin Sistema, solo habilitados; listado básico con filtros fecha/actor/entidad/acción, sin reportes avanzados ni exportador analítico. Excluir contraseñas, JWT, secretos y payload indiscriminado. No prometer retención legal no definida ni introducir CDC, cola, NoSQL, DynamoDB o MongoDB.

## DES-H2-006 — UI, advertencias y conflicto de edición

**REQ:** 002–010, 012. Pantallas concretas bajo `/academico` y consulta básica de auditoría; un formulario/listado por caso, sin motores genéricos. Materias/Carreras muestran active; Ciclo muestra estado_codigo y código generado no editable. Campos de Materia/Carrera y sigla anticipan normalización sin ser autoridad. Ciclo usa selectores de catálogos iniciales, jerarquía geográfica y materias heredadas/adicionales con significado textual.

Advertir al inactivar materia que dejará de cargarse para nuevos ciclos y no se quitará de existentes; inactivar carrera explica indisponibilidad para nuevos ciclos y preservación de referencias. Pedir motivo en ambas, DESIERTO y ANULADO; no pedirlo para toda edición. Antes de cambiar sigla advertir ciclos afectados y mostrar límites terminales; la DB recalcula afectados, UI no decide alcance. Estados manuales solo para Director y sin cambios por fecha.

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

**REQ:** 001, 014–016. Migraciones futuras aditivas propias H2, incluida evolución del catálogo de roles; nunca reescribir H1 aceptado. Carga inicial de catálogos con fuente/versionado controlados, sin exigir carga manual del usuario y sin ejecutar cargas en esta entrega. Adaptar inventario técnico de tres tablas H1 al inventario exacto aprobado H2 conservando checks de seguridad. Reset desde cero, fixtures sintéticos por actor y cleanup exacto; mismos scripts/guard local, sin tocar firewall/Docker/WSL ni levantar entorno durante esta fase documental. Adaptar suites, inventario y fixtures al catálogo funcional sin alterar evidencia histórica ni perder las propiedades H1 de identidad, multirol, revocación, sesión y denegación por defecto. CI ampliada solo después de Gate 1, sin deploy/acceptance/merge automático.

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
