# H2 — Base académica: design

**Versión:** 0.1 · **Fecha:** 22/10/2026 (America/Lima)
**H2 SPEC: PENDING HUMAN APPROVAL** · **IMPLEMENTATION: BLOCKED**

Diseño propuesto, sin SQL, migraciones ni implementación. Precedencia, alcance y decisiones funcionales pendientes: [requirements.md](requirements.md). Base: main `32f38ff9ea1bf576bde54735e4a6879f4faf7e35`, con H0/H1 aceptados y cambio transversal documental integrado. La rama Spec nace de esa referencia exacta.

## DES-H2-001 — Recorrido mínimo y responsabilidades

**REQ:** 001, 007, 008, 010, 015, 016.

React → SDK único existente → Data API/RPC → grants/RLS → constraints/operación PostgreSQL → auditoría en la misma transacción. Auth y sesión H1 se reutilizan; no se duplican perfiles, roles o clientes. La interfaz presenta estados y permisos efectivos sin ser autoridad. Un módulo concreto por pantalla/caso basta; sin repositorio genérico, capa ceremonial, motor de formularios, API adicional ni infraestructura nueva.

Lecturas con proyección explícita y filtros básicos de nombre/código/estado propuestos para localizar registros; no cargar toda la base para filtrar permisos en cliente. Sin realtime, buscador avanzado o motor de reportes. Errores de autenticación/autorización, duplicado, referencia inválida, validación y conflicto se distinguen para diagnóstico, con mensajes seguros para usuario.

## DES-H2-002 — Modelo relacional conceptual

**REQ:** 002–007. Nombres orientativos, sujetos a Gate 1; no DDL ni scripts.

| Entidad | Datos conceptuales | Invariantes y decisiones pendientes |
|---|---|---|
| Materia | ID estable, código, nombre, descripción opcional, activo, fecha de creación/modificación | PK, código único, no vacío, estados válidos; OQ-005/006 |
| Carrera | ID estable, código, nombre, descripción, modalidad, activo, fechas | Modalidad con/sin experiencia; obligatoriedad y normalización OQ-005 |
| Carrera–Materia | Referencia carrera + referencia materia | Clave compuesta única, FK; misma materia reutilizable entre carreras; mínimo/baja OQ-006 |
| Ciclo | ID estable, carrera, nombre, inicio/fin, estado y campos mínimos que apruebe OQ-002 | FK, fechas, estados; superposición OQ-003, correlativo OQ-007, ubicación/desierto OQ-008 |
| Ciclo–Materia, si se aprueba selección propia | Referencia ciclo + referencia materia | Relación única/FK; semántica de copia/cambios OQ-004, sin versionado académico anticipado |
| Evento de auditoría H2 | ID, entidad/registro, acción, actor, instante, antes/después de campos cambiados, motivo si corresponde | Apendice transaccional protegido; OQ-009 |

IDs y tiempos son generados/controlados por DB; propuesta de IDs UUID coherente con H1. No admitir actor, created_at o auditoría confiados al payload. Propuesta: fechas académicas de calendario, auditoría con instante y zona; formato visual local sin alterar el instante. Longitudes/límites se fijan con OQ-005 antes de migrar, compartiendo el contrato UI/DB sin generador de esquemas.

Se propone baja lógica de entidades para preservar referencias; no DELETE de entidades desde navegador. Reactivación, tratamiento de inactivos y bajas de asociaciones requieren OQ-006. No añadir alumnos, matrícula, costos o tablas geográficas para cerrar preguntas pendientes. La auditoría de ciclo en HU3 menciona carreras: se interpreta como probable errata, a confirmar al aprobar OQ-009, no como exención de auditoría de ciclos.

## DES-H2-003 — Constraints, atomicidad y concurrencia

**REQ:** 004–007, 009, 014. La DB rechaza duplicados/referencias inválidas incluso con requests directas y concurrencia. UI valida para ayudar, PostgreSQL decide. No consultas previas como única garantía de unicidad.

Materia y cambios simples de estado pueden usar una única escritura Data API bajo RLS, con auditoría automática; no requieren RPC por ser CRUD. Carrera + conjunto de materias y, si se aprueba, ciclo + selección/correlativo, requieren un comando RPC específico para confirmar todo o nada. No secuencia de guardados independientes coordinada por React. No RPC genérica que reciba tabla, SQL, actor o permiso.

Los comandos validan whitelist de campos, autorización vigente y todas las relaciones, incluidas las reglas aprobadas de estado; sustitución de asociaciones y auditoría se confirman o revierten juntas. Sin propagación retroactiva de materias a ciclos hasta resolver OQ-004. Para correlativo aprobado, asignación serializada en DB por carrera/año, no máximo+1 desde cliente. El mecanismo concreto (contador acotado/bloqueo) se fija después de OQ-007, con prueba concurrente y sin prometer numeración sin huecos.

La exclusión de superposiciones deberá ser constraint o validación transaccional con protección concurrente según el universo de OQ-003. No elegir extensión, índice o función antes de conocer esa regla. Rechazar fecha fin anterior al inicio; igualdad y extremos según decisión humana. El tratamiento de pérdida de cambios entre editores se cierra en OQ-010 antes de aprobar contrato de actualización.

## DES-H2-004 — Matriz de acceso y límites de privilegio

**REQ:** 008, 014. Reutilizar comprobación de usuario/rol activo H1, metadata sin autoridad, sin motores de permisos ni nuevas jerarquías. H1 ADMIN solo tenía lecturas de seguridad, no permisos CRUD académicos implícitos.

| Actor | Lectura/escritura académica | Auditoría | Estado |
|---|---|---|---|
| Anónimo, JWT inválido/vencido sin renovación | Denegada | Denegada | Definido |
| Auth sin app_user, inactivo, sin rol activo | Denegada | Denegada | Definido |
| ADMIN activo | Pendiente OQ-001 por entidad y operación | Pendiente OQ-009 | No inferir director |
| OPERADOR activo | Pendiente OQ-001 por entidad y operación | Pendiente OQ-009 | No inferir coordinador |
| Ambos roles | Unión de capacidades explícitamente aprobadas, sin ampliar permisos por otras policies | Según matriz aprobada | Conservar principio H1 |

Antes de Gate 1 completar matriz de consultar/alta/editar/estado/asociar por recurso y lectura de auditoría, incluidas reglas de desierto si entra en H2. Grants explícitos y policies por operación; INSERT/UPDATE incluyen comprobación de fila final además de acceso a fila previa. Ninguna policy FOR ALL amplia ni tablas de dominio públicas. Probar composición OR y FK sin filtración innecesaria.

Regla de asociación compuesta: bloquear escrituras directas a tablas de relación si permiten saltarse el comando atómico. Propuesta de RPC con privilegios de invocador cuando RLS/grants basten. Si para impedir bypass es necesario un comando SECURITY DEFINER, tratarlo como frontera privilegiada de diseño: propietario confiable fijo, search_path vacío, nombres calificados, parámetros cerrados, auth.uid() y autorización vigente explícita, EXECUTE solo al rol necesario, nada de SQL dinámico, sin confiar en RLS del owner. No ampliar silenciosamente los privilegios del helper H1. El patrón debe quedar resuelto al cerrar OQ-001/004/006, revisado en Gate 1; si exige otro diseño, detener la tarea afectada.

## DES-H2-005 — Auditoría básica que no puede omitir el cliente

**REQ:** 009, 014. Propuesta: registro H2 append-only mediante trigger de tablas académicas y asociaciones, cubriendo escrituras permitidas directas y vía RPC en la misma transacción. Fallo de auditoría revierte el cambio; rollback no deja un evento de éxito. No endpoint de React para crear eventos después del guardado.

Actor desde auth.uid(), tiempo DB, acción y entidad/PK, cambios de campos de negocio antes/después; no registrar contraseña, token, secretos ni payload completo indiscriminado. Preparación administrativa de fixtures separada, identificada como técnica y sin atribuirla a usuario humano; actor nulo no se acepta para escrituras de producto. Browser no puede insertar/editar/borrar/truncar eventos. El mecanismo interno privilegiado solo escribe auditoría acotada y no se expone por RPC. Revisar owner, grants y search_path.

Sin CDC, cola, base adicional ni módulo de auditoría completo. Lectura básica protegida para verificar trazabilidad según OQ-009; sin exportación/reporte general. No definir retención legal, motivos universales o historial académico completo sin fuente. Si se exige motivo, su transporte y vinculación al cambio deben formar parte del mismo comando, sin confiar en un campo de actor editable ni dejar una segunda llamada opcional.

## DES-H2-006 — UI concreta y estados

**REQ:** 002–006, 010, 012. Propuesta: rutas bajo `/academico` para materias, carreras y ciclos, reutilizando protección H1. Listado y formulario por entidad; carrera permite selección de materias; ciclo muestra precarga/edición solo según OQ-004. Sin framework configurable.

Etiquetas, instrucciones y errores asociados a campos; tablas con encabezados y estado visible; botones con nombre accesible; operación de guardar refleja cargando/éxito/error sin perder datos ingresados ante fallo. Cambios de estado requieren confirmación comprensible y preservación de foco. Navegación y selección por teclado; no usar el color de fila como único estado. No dibujar acciones sin permiso como control de seguridad: además deben ser rechazadas por API/DB.

En cambio de identidad/logout, cancelar o ignorar respuestas tardías y vaciar datos/formularios de la identidad anterior mediante el patrón validado en H1. No conservar caché académica compartida que exponga datos entre actores. Preferencia visual no contiene datos académicos ni de identidad y se conserva localmente según DES-007.

## DES-H2-007 — Temas sin infraestructura adicional

**REQ:** 011–013. Preferencia única validada: system/light/dark/high-contrast. Propuesta: selector accesible compartido en el marco de aplicación, estado local React y atributo en raíz; CSS variables semánticas compartidas. No nuevo Context global, dependencia o framework si un estado en la raíz y CSS resuelven el caso. El cambio transversal es aprobado, esta implementación concreta espera Gate 1.

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

**REQ:** 001, 014–016. Migraciones futuras aditivas propias H2; nunca reescribir H1 aceptado. Adaptar inventario técnico de tres tablas H1 al inventario exacto aprobado H2 conservando checks de seguridad. Reset desde cero, fixtures sintéticos por actor y cleanup exacto; mismos scripts/guard local, sin tocar firewall/Docker/WSL ni levantar entorno durante esta fase documental. CI ampliada solo después de Gate 1, sin deploy/acceptance/merge automático.

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
