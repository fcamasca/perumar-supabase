# H3 — Alumno y Matrícula: design

Versión 0.1 · 22/10/2026 (America/Lima).

**SPEC ELABORADO. PENDIENTE DE REVISIÓN HUMANA Y GATE 1. CONSTRUCCIÓN NO AUTORIZADA.**

Cada DES-H3-n corresponde al REQ-H3-n de [requirements](requirements.md). Nombres/contratos propuestos, no SQL ejecutable. OQ pendientes no son decisiones aprobadas. Base y precedencia registradas en requisitos.

## DES-H3-001 — Recorrido proporcional

React → SDK único → lecturas Data API bajo RLS / comando específico → autorización vigente → validación/constraints → transacción de negocio y auditoría. Sin backend adicional ni motor genérico. Solo documentación en esta rama; construcción futura desde SHA exacto aprobado. Gate 1 y Gate 2 separados.

## DES-H3-002 — Matriz y frontera privilegiada

| Actor activo | Alumno/contactos | Empresa mínima | Matrícula | Tarifas/Ciclo-tarifa | PII/snapshot/cargos |
|---|---|---|---|---|---|
| Director | Consultar/crear/editar | Propuesta consultar/crear/editar, OQ-002 | Registrar/editar/anular, descuento | Consultar/mantener | Lectura operativa autorizada |
| Coordinador | Consultar/crear/editar | Misma propuesta, OQ-002 | Registrar/editar/anular, sin descuento | Solo lectura referencial | Lectura operativa autorizada |
| Admin Sistema | Sin permiso implícito | Sin permiso implícito | Sin permiso implícito | Sin permiso implícito | Sin acceso por ese rol |
| Multirol | Unión solo de capacidades activas explícitas | Igual | Director necesario para descuento | Director necesario para mantenimiento | Según roles académicos asignados |
| Sin usuario/rol activo, inactivo, anónimo, JWT inválido/expirado, solo roles técnicos H1 | Denegado | Denegado | Denegado | Denegado | Denegado |

Reutilizar app_users/app_roles/app_user_roles, auth.uid() y comprobación activa H1/H2, no metadata ni rol suministrado. ADMIN_SISTEMA mantiene directorio/auditoría H2; eso no habilita tablas H3. Policies SELECT específicas para tablas expuestas, RLS habilitado y sin grants directos INSERT/UPDATE/DELETE/TRUNCATE. Contadores privados no expuestos. Referencias inactivas históricas legibles, nuevas selecciones solo válidas vigentes.

RPC SECURITY DEFINER solo cuando necesita cerrar invariantes: owner confiable fijo, search_path vacío, referencias calificadas, whitelist, validación por operación/objeto y auth.uid() dentro del cuerpo. El owner puede eludir RLS, por ello RLS sola no protege la RPC. Revocar EXECUTE PUBLIC/anon y limitar authenticated; sin SQL dinámico/actor arbitrario, funciones alternativas ni helpers encadenados. Revisar grants, composición OR y rutas directas. Roles/tokens jamás enviados para decidir autorización.

## DES-H3-003 — Alumno y validaciones

public.alumno UUID, campos de identificación, nacimiento, contacto/domicilio e información adicional descritos íntegramente en REQ-003, created_at/updated_at DB. No columna edad; calcular por fecha de nacimiento a fecha local de consulta America/Lima. Reutilizar departamento/provincia/distrito H2 con jerarquía DB en ambas ubicaciones; nueva selección activa y representación histórica conservada.

TIPO_DI en catalogo/catalogo_valor, DNI y CARNET_EXTRANJERIA; comprobar pertenencia y vigencia, no solo FK genérica. Otras listas y sus seeds pendientes OQ-001, sin crear catálogo dinámico de comportamientos ni mantenimiento completo HU20.

Propuestas de cotas técnicas para Gate 1: apellidos/nombres ≤150 cada campo; domicilio ≤500; N°/Mz Lt ≤100 opcional; textos adicionales ≤150 excepto señas ≤500; celular/fijo ≤30 con +, espacios, paréntesis/guiones; email ≤254 y estructura básica sin verificación remota. Obligatorios trim no vacío; opcionales vacíos→NULL. Nombres admiten tildes, apóstrofos y guiones. DI texto alfanumérico trim/MAYÚSCULAS ≤30 conservando ceros; no longitud legal/checksum inventado. Fecha válida no futura sin edad mínima. Medidas decimales positivas si presentes, unidades OQ-001 y sin cotas clínicas. Listas desconocidas no se rellenan silenciosamente.

guardar_alumno recibe whitelist de ficha y contactos iniciales opcionales; UUID/versiones servidor, expected_updated_at obligatorio en edición; devuelve ID/versión y ficha autorizada. Alumno puede guardarse sin contactos fuera de matrícula.

## DES-H3-004 — Unicidad y lectura de legado

Propuesta UNIQUE(tipo_di_id,numero_di_normalizado), alcance OQ-001. Precheck UX no garantiza unicidad. Búsqueda paginada por documento/nombre devuelve proyección mínima, ficha completa al abrir. Índices por documento y filtros justificados, no snapshot en listados.

No filtrar alumnos incompletos ni crear otro al encontrarlos. Guardado aplica validaciones completas. Si aparece legado real al construir, documentar saneamiento controlado antes de endurecer NOT NULL; no flag permanente para eludir validación ni asumir que ya existe legado en esta DB. Fixture incompleto solo por harness local controlado.

## DES-H3-005 — Agregado de contactos

alumno_contacto_emergencia UUID, alumno_id FK, apellido/nombre ≤150, parentesco según OQ-001, celular ≤30 obligatorios y dirección ≤500 opcional, tiempos DB. Uno a muchos. Propuesta activo para retiro lógico OQ-003; no contacto principal inventado.

guardar_contacto_emergencia/retirar_contacto_emergencia reciben versión esperada del agregado Alumno y avanzan su updated_at; alta de contactos iniciales puede incluirse en guardar_alumno. Requisito ≥1 contacto válido solo al registrar matrícula; no extenderlo automáticamente a toda futura edición del alumno. Serialización sobre padre evita snapshot mezclado con retiro concurrente.

## DES-H3-006 — Snapshot explícito

alumno_snapshot construido DB-side en creación: versión de estructura, instante DB, campos relevantes de ficha REQ-003, IDs y etiquetas de geografía/catálogos y contactos activos válidos existentes. Excluir edad, Auth, tokens y datos ajenos. Snapshot no es input del cliente. Se conserva inmutable incluso tras cambiar Ciclo/patrocinador/opciones/código. Protección DB de rutas de actualización y whitelist, no solo UI readonly.

Operación actual consulta alumno_id; consulta histórica usa snapshot explícitamente bajo permiso académico. No copiarlo a JSON auditoría, lista, URL, localStorage o logs. Limpiar PII al cambiar identidad/logout e ignorar respuestas tardías de actor anterior. No afirmar retención legal no definida.

## DES-H3-007 — Empresa mínima

empresa_patrocinadora UUID, RUC texto trim UNIQUE propuesto, razón social ≤200, persona contacto ≤150, teléfono ≤30, email ≤254, tiempos DB. Formato/obligatoriedad/permisos OQ-002; sin lookup SUNAT ni reglas fiscales inferidas. FK nullable empresa_patrocinadora_id en matrícula, no alumno. Sin DELETE usado, facturación, pagos, cuentas ni deuda.

guardar_empresa_patrocinadora con whitelist, autorización y expected_updated_at en edición. Alta/edición independiente previa a matrícula: se selecciona UUID persistido. Una empresa/alumno guardados previamente no se revierten si falla después matrícula; están fuera de esa transacción. No confundir esta independencia con varias escrituras cliente para completar la matrícula.

## DES-H3-008 — Tarifa

tarifa UUID, código trim/MAYÚSCULAS UNIQUE ≤30, nombre ≤150, descripción opcional ≤500, tipo propuesto CARRERA/OTRO (OQ-004), monto_por_defecto numeric(12,2), activo, tiempos DB. ≥0 propuesto, cero OQ-004; rechazar precisión >2 antes de cast para evitar redondeo silencioso, negativos/NaN/infinito/overflow. Soles, sin floats.

guardar_tarifa y cambiar_activo_tarifa: Director, versión esperada y auditoría. Inactivar conserva referencias; propuesta sin DELETE de producto. Default cambia solo catálogo. Ejemplos del usuario son orientativos, no semillas ni asociación automática Carrera.

## DES-H3-009 — Configuración de Ciclo

ciclo_tarifa UUID, ciclo_id/tarifa_id FK, UNIQUE par, importe numeric(12,2), obligatorio, activo, timestamps. Propuesta exactamente una CARRERA activa obligatoria para habilitar matrícula, OQ-004; no exigir tarifas al crear Ciclo H2. Fuente catálogo y relación vigentes al registrar; referencia vieja permanece legible.

guardar_ciclo_tarifas para Director recibe versión esperada de Ciclo y conjunto autorizado; nuevo importe propone default UI y permite override. Cambios avanzan versión padre Ciclo, auditan y no alteran catálogo/cargos. Estados permitidos del mantenimiento pendientes OQ-004. Coordinador solo consulta configuración para matricular.

## DES-H3-010 — Matrícula y cargo

| Entidad conceptual | Datos e invariantes |
|---|---|
| matricula | UUID, alumno_id, ciclo_id, empresa nullable, ACTIVO/ANULADO, código visible y metadatos de generación, alumno_snapshot, tiempos/versión DB, motivo/actor/fecha anulación |
| matricula_cargo | UUID estable, matricula_id, origen ciclo_tarifa_id/tarifa_id, código/nombre/tipo históricos, importe_original, descuento separado, motivo descuento, importe_final derivado/validado; numeric(12,2) |
| Contador privado | Clave año+sigla, último correlativo; sin exposición cliente |

Contrato registrar_matricula: alumno_id+expected_alumno_updated_at, ciclo_id+expected_ciclo_updated_at, empresa UUID opcional, IDs ciclo_tarifa opcionales elegidas, descuento/motivo solo cuando autorizado y código manual opcional. No recibe totales, importes de tarifa, snapshot, actor, estado ni correlativo; campos extra rechazados, IDs duplicados/de otro Ciclo/inactivos rechazados. Obligatorios se obtienen siempre DB-side, no dependen de selección cliente.

Fases de una transacción: autorizar → obtener estado/versiones coherentes → validar ficha/contactos/Ciclo/empresa → reobtener tarifas → calcular cargos/descuento → generar código → insertar matrícula/snapshot/cargos → auditoría → retornar ID/código/estado/versión y resumen seguro. Cualquier fallo revierte filas, versiones, contador transaccional y eventos. No escrituras React para completar partes. Código en confirmación previa es sugerencia no reservada; DB determina definitivo.

Cambios posteriores de catálogo/default/Ciclo nunca alteran cargos existentes. H4 recibirá cargos históricos por UUID, sin pagos ni saldos en H3. Si respuesta de red ambigua, UI consulta por alumno+ciclo y presenta resultado antes de reintentar explícitamente; no retry ciego ni idempotencia financiera anticipada.

## DES-H3-011 — Evolución acotada de comandos H2

Destino PROGRAMADO/EN_CURSO validado dentro de registrar/editar. Con matrículas, guardar_ciclo solo Director y cambios promoción/fechas, manteniendo superposición H2. cambiar_estado_ciclo no permite ANULADO con matrículas. Conservar restantes transiciones H2 sin cascada a matrículas ni cargos.

Revisar también cambiar_materia_ciclo, guardar_carrera y propagación de sigla/sincronización para no abrir edición indirecta prohibida. OQ-005 decide extensión de bloqueo sobre automatismos y si «con matrículas» incluye anuladas (propuesta sí). Edición de matrícula ACTIVA con Ciclo actual terminal pendiente OQ-005; todo destino nuevo siempre elegible. No borrar historia, inventar flag financiero ni reescribir migraciones/Spec H2. Nueva migración futura con regresiones.

## DES-H3-012 — UNIQUE del par

UNIQUE(alumno_id,ciclo_id) sin predicado de estado, también al cambiar Ciclo; ANULADO no libera. Una matrícula por par y cargos completos de una sola ganadora. Mensaje de duplicado seguro, sin datos personales de otro registro. Nunca count/MAX como garantía concurrente.

## DES-H3-013 — Generación y edición de código

Propuesta año de inscripción DB America/Lima, sigla vigente Carrera al crear; OQ-006. Upsert transaccional sobre contador privado (año,sigla), siguiendo patrón H2 pero independiente de ciclo_correlativo. Mínimo tres dígitos, 1000 permitido; no MAX+1 ni promesa gapless. Persistir año/sigla/correlativo y codigo_generado_original inmutables; codigo_matricula visible UNIQUE normalizado trim/MAYÚSCULAS. Código propuesto manual ≤50 pendiente OQ.

Contador avanza incluso con override. Si sugerido colisiona con manual previamente usado, avanzar dentro de la misma fila contador hasta libre; inserción protegida por UNIQUE y resolución transaccional de colisión concurrente, sin bucle cliente ni retry de formulario. Formato, roles/momento de edición y estabilidad ante cambio Ciclo/sigla OQ-006; propuesta ambos roles solo ACTIVO y código estable. Auditar original, anterior/nuevo, actor y operación; mantener trazabilidad aun si visible cambia. Cambiar sigla/código Ciclo H2 no debe reescribir códigos matrícula por accidente.

## DES-H3-014 — Descuento y edición por Coordinador

Solo CARRERA, soles numeric(12,2), 0≤descuento≤original, motivo trim no vacío si >0. No porcentajes ni descuento a otras tarifas. Director confirma al registrar/editar; servidor recalcula final sin modificar original. Coordinador en alta omite descuento o cero; positivo denegado. En edición no puede alterar/quitar descuento previo: omite campo y servidor conserva, nunca lo pone cero implícitamente. Cambio Ciclo con descuento previo OQ-007; no ajuste automático que eluda permiso. Auditoría económica necesaria, sin PII ajena. EVOL-001 no participa.

## DES-H3-015 — Edición atómica

editar_matricula recibe ID+expected_updated_at y whitelist. alumno_id/snapshot no editables. Solo ACTIVO. Cambiar solo empresa/código no recalcula cargos. Cambio Ciclo lee tarifas destino, valida par/estado/selecciones y descuento y sustituye conjunto aplicado atómicamente. Cambio solo opciones: propuesta conserva importes de cargos retenidos/obligatorios históricos, nuevas opciones a precio vigente servidor, retiro conservado como revisión no vigente. OQ-008 decide versionado/continuidad UUID sin DELETE para H4. Nunca repricing global por editar patrocinador o por cambio posterior de catálogo. Auditar diferencias. Sin restricciones de pagos aún inexistentes.

## DES-H3-016 — Anulación concreta

anular_matricula(ID,expected_updated_at,motivo) solo ACTIVO→ANULADO, ambos roles. Motivo trim obligatorio ≤500 propuesto, actor/fecha DB. Repetir no crea doble evento exitoso. Estado terminal bloquea edición completa/código y reactivación en DB. Conservar cargos/snapshot y par UNIQUE, sin reversos financieros ni borrar historia. Modal breve accesible y readonly posterior.

## DES-H3-017 — Auditoría mínima

Reutilizar public.auditoria y patrón transaccional H2, sin servicio/event bus. Actor auth.uid(), timestamp DB, entidad/UUID/acción/motivo, old_values/new_values pertinentes. Alumno/contactos/empresa: IDs y nombres de campos cambiados, no valores PII. Matrícula/cargos: referencias, códigos y valores económicos necesarios; descuento registra original/descuento/motivo/actor/operación. No alumno_snapshot ni JSON de ficha.

No aplicar indiscriminadamente trigger H2 to_jsonb a tablas PII. Proyecciones explícitas, también en edición para impedir snapshot dentro de old/new. Motivos operativos sin datos personales; UI lo indica, logs no los replican. Mantener lectura auditoría H2 para Director/Coordinador/Admin Sistema, precisamente por ello minimización. Sin grants de mutación ni endpoint para fabricar evento/contexto. Si auditoría falla revierte negocio/versión; rechazo no deja evento exitoso. Fixtures administrativos identificados aparte sin inventar actor humano.

## DES-H3-018 — Consistencia concurrente

Expected_updated_at obligatorio en edición; compare-and-update atómico y versión DB que avance. Cambios de contactos avanzan Alumno; cambios de configuración avanzan Ciclo. Reutilizar frontera SERIALIZABLE adoptada H2 y verificar que efectivamente cubre RPC H3; conflictos/40001 no se reintentan silenciosamente.

Propuesta de orden común para bloqueos breves: Ciclos por UUID ordenado → Alumno → Matrícula → contador al generar; validar contra todas las rutas H2 antes de fijar SQL. Ninguna reserva de pantalla. UNIQUE y upsert DB garantizan claves. Cambios de tipo/vigencia de catálogo/tarifa también deben participar mediante bloqueo compatible o dependencia SERIALIZABLE demostrada, no solo cambio ciclo_tarifa. Evitar snapshot mixto entre contactos/ficha/precios, carrera/sigla y estado. Carrera de anulación/cambio Ciclo contra registro debe producir orden serial válido o conflicto explícito. No prometer ausencia de abortos ni agregar mecanismo genérico de retries.

## DES-H3-019 — Experiencia concreta

Rutas propuestas /alumnos, /alumnos/nuevo, /alumnos/:id, /matriculas/nueva, /matriculas/:id, /tarifas bajo autorización existente. Implementar pasos/pestañas exactos REQ-019; Identificación incluye nacimiento, Domicilio reúne contacto/dirección. Nuevo alumno desde matrícula vuelve al mismo Ciclo/flujo al guardar; cancelar no crea matrícula parcial. Ficha existente completa en pantalla, no modal. Resumen y matrícula muestran ficha vigente y acceso histórico explícito.

Confirmación usa cargos servidor, no precio autoritativo React. Al «otro alumno» conserva Ciclo y recarga estado/tarifas; limpia alumno, empresa, opciones, descuento y código de operación anterior. Botón bloqueado durante petición evita doble envío UX, UNIQUE sigue protegiendo DB.

Reutilizar identidad, tokens y selector/persistencia de Sistema/Claro/Oscuro/Alto contraste H2. Forced-colors SO prevalece; no forced-color-adjust:none global. Labels y errores asociados, primer error enfocado incluso al validar paso, aria-current en Stepper, Tabs semánticas con teclado, encabezados tablas, foco modal/restauración, estados textuales y contraste según criterios H2. Sin window.alert/confirm/prompt. Estados carga/vacío/error/conflicto y sesión sin PII de identidad anterior.

## DES-H3-020 — Operación, pilares y riesgos

Futuro: migraciones aditivas, reset/inventario reproducibles, fixtures sintéticos bajo guards H0 y CI existente ampliada después de Gate 1. JWT reales ordinarios por actor; credencial administrativa solo preparación/observación/cleanup, jamás navegador o petición que pruebe autorización. Sin cambios firewall/Docker/WSL ni proyecto remoto para este Spec.

| Decisiones | Well-Architected aplicado | OWASP Secure SDLC / evidencia |
|---|---|---|
| 002–007, 014, 017 | Security: mínimo privilegio y minimización | Broken Access Control, pertenencia de IDs, RLS/grants/owner, secretos fuera de logs y outputs seguros; bypass directo |
| 005, 009–018 | Reliability: atomicidad, constraints, snapshots/versiones | Validación servidor y parameter tampering; rollback y carreras con estado final |
| 004, 009–013, 018 | Performance Efficiency: índices DI/par/código/FK, proyección/paginación, transacción breve | Revisar planes representativos y contención, sin SLA/caché de permisos inventados |
| 001, 010, 019 | Cost Optimization: plataforma/componentes existentes | Sin backend/librerías/servicios preventivos |
| 001, 017–020 | Operational Excellence: evidencia por commit, migraciones y gates | Revisión previa de amenazas/contratos, negativos, cleanup y decisión humana |

SQL/SDK parametrizados, texto React escapado sin HTML arbitrario; errores seguros de campo/permisos/versión/duplicado/estado/precio cambiado, no SQL/payload de otro alumno. Bearer JWT existente: mantener controles H1/H2 y revisar CSRF si cambia a cookies/origen distinto, sin mecanismo ceremonial nuevo. Estos criterios no afirman certificación ni obligan desplegar AWS.

Riesgos para decisión: crecimiento desde 7 RPC/11 helpers H2 a API oculta; mantener comandos de propósito claro e inventario revisable, helpers solo con necesidad concreta compartida. Restricciones H2 indirectas pueden romper regresión. Trigger genérico podría copiar PII. Versionado de cargos debe cerrarse antes de H4. Consistencia concurrente no se demuestra con SELECT previo. Forced-colors SO no fue verificado humanamente en H2 y su riesgo aceptado no equivale a prueba H3.

Gate 2 revisará recorrido completo y costo/mantenibilidad sin umbral arbitrario de líneas. Si exige demasiadas capas, registrar riesgo y pedir decisión antes de expandir; no añadir una API automáticamente.

**H3 NO está autorizado para construcción. Pendiente de revisión humana y Gate 1.**
