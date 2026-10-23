# H3 — Alumno y Matrícula: design

Versión 0.2 · 22/10/2026 (America/Lima).

**SPEC ELABORADO. PENDIENTE DE REVISIÓN HUMANA Y GATE 1. CONSTRUCCIÓN NO AUTORIZADA.**

Cada DES-H3-n corresponde al REQ-H3-n de [requirements](requirements.md). Nombres/contratos propuestos, no SQL ejecutable. OQ-H3-001 a 008 resueltas por decisión humana registrada en requirements; Gate 1 del conjunto sigue pendiente. Base y precedencia registradas en requisitos.

## DES-H3-001 — Recorrido proporcional

React → SDK único → lecturas Data API bajo RLS / comando específico → autorización vigente → validación/constraints → transacción de negocio y auditoría. Sin backend adicional ni motor genérico. Solo documentación en esta rama; construcción futura desde SHA exacto aprobado. Gate 1 y Gate 2 separados.

## DES-H3-002 — Matriz y frontera privilegiada

| Actor activo | Alumno/contactos | Empresa mínima | Matrícula | Tarifas/Ciclo-tarifa | PII/snapshot/cargos |
|---|---|---|---|---|---|
| Director | Consultar/crear/editar | Buscar/crear/editar | Registrar/editar con Ciclo no terminal, anular incluso Ciclo terminal, descuento | Consultar/mantener | Lectura operativa autorizada |
| Coordinador | Consultar/crear/editar | Buscar/crear/editar | Registrar/editar con Ciclo no terminal, anular incluso Ciclo terminal, sin descuento nuevo | Solo lectura referencial | Lectura operativa autorizada |
| Admin Sistema | Sin permiso implícito | Sin permiso implícito | Sin permiso implícito | Sin permiso implícito | Sin acceso por ese rol |
| Multirol | Unión solo de capacidades activas explícitas | Igual | Director necesario para descuento | Director necesario para mantenimiento | Según roles académicos asignados |
| Sin usuario/rol activo, inactivo, anónimo, JWT inválido/expirado, solo roles técnicos H1 | Denegado | Denegado | Denegado | Denegado | Denegado |

Reutilizar app_users/app_roles/app_user_roles, auth.uid() y comprobación activa H1/H2, no metadata ni rol suministrado. ADMIN_SISTEMA mantiene directorio/auditoría H2; eso no habilita tablas H3. Policies SELECT específicas para tablas expuestas, RLS habilitado y sin grants directos INSERT/UPDATE/DELETE/TRUNCATE. Contadores privados no expuestos. Referencias inactivas históricas legibles, nuevas selecciones solo válidas vigentes.

RPC SECURITY DEFINER solo cuando necesita cerrar invariantes: owner confiable fijo, search_path vacío, referencias calificadas, whitelist, validación por operación/objeto y auth.uid() dentro del cuerpo. El owner puede eludir RLS, por ello RLS sola no protege la RPC. Revocar EXECUTE PUBLIC/anon y limitar authenticated; sin SQL dinámico/actor arbitrario, funciones alternativas ni helpers encadenados. Revisar grants, composición OR y rutas directas. Roles/tokens jamás enviados para decidir autorización.

## DES-H3-003 — Alumno y validaciones

public.alumno UUID, campos de identificación, nacimiento, contacto/domicilio e información adicional descritos íntegramente en REQ-003, created_at/updated_at DB. No columna edad; calcular por fecha de nacimiento a fecha local de consulta America/Lima. Reutilizar departamento/provincia/distrito H2 con jerarquía DB en ambas ubicaciones; nueva selección activa y representación histórica conservada.

TIPO_DI en catalogo/catalogo_valor, DNI y CARNET_EXTRANJERIA; comprobar pertenencia y vigencia, no solo FK genérica. SEXO, ESTADO_CIVIL y GRUPO_SANGUINEO también usan catálogo simple; grado de instrucción, ojos, cabello y parentesco son texto simple. Sin motor de comportamiento ni mantenimiento genérico completo HU20. No inventar listas adicionales ni convertir texto en FK por anticipación.

Cotas técnicas conservadas por decisión humana (OQ-H3-001 resuelta): apellidos/nombres ≤150 cada campo; domicilio ≤500; N°/Mz Lt ≤100 opcional; textos adicionales ≤150 excepto señas ≤500; celular/fijo ≤30 con +, espacios, paréntesis/guiones; email ≤254 y estructura básica sin verificación remota. Obligatorios trim no vacío; opcionales vacíos→NULL. Nombres admiten tildes, apóstrofos y guiones. DNI texto trim exactamente 8 dígitos ASCII, nunca número; CE trim/MAYÚSCULAS alfanumérico de 1 a 30 caracteres, sin checksum ni longitud legal adicional. Conservar ceros. Fecha válida no futura sin edad mínima. Estatura decimal positiva en centímetros y peso decimal positivo en kilogramos si presentes, sin rangos clínicos. Listas no especificadas no se rellenan silenciosamente.

guardar_alumno recibe whitelist de ficha y contactos iniciales opcionales; UUID/versiones servidor, expected_updated_at obligatorio en edición; devuelve ID/versión y ficha autorizada. Alumno puede guardarse sin contactos fuera de matrícula.

## DES-H3-004 — Unicidad y lectura de legado

UNIQUE(tipo_di_id,numero_di_normalizado), no unicidad global solo por número (OQ-H3-001 resuelta). Precheck UX no garantiza unicidad. Búsqueda paginada por documento/nombre devuelve proyección mínima, ficha completa al abrir. Índices por documento y filtros justificados, no snapshot en listados.

No filtrar alumnos incompletos ni crear otro al encontrarlos. Guardado aplica validaciones completas. Si aparece legado real al construir, documentar saneamiento controlado antes de endurecer NOT NULL; no flag permanente para eludir validación ni asumir que ya existe legado en esta DB. Fixture incompleto solo por harness local controlado.

## DES-H3-005 — Agregado de contactos

alumno_contacto_emergencia UUID, alumno_id FK, apellido/nombre ≤150, parentesco texto trim no vacío ≤150, celular ≤30 obligatorios y dirección ≤500 opcional, tiempos DB. Uno a muchos. activo booleano: retiro lógico a INACTIVO, sin DELETE ni contacto principal. Snapshot incluye todos los activos/válidos; excluye inactivos (OQ-H3-003 resuelta).

guardar_contacto_emergencia/retirar_contacto_emergencia reciben versión esperada del agregado Alumno y avanzan su updated_at; alta de contactos iniciales puede incluirse en guardar_alumno. Requisito ≥1 contacto activo y válido solo al registrar matrícula; no extenderlo automáticamente a toda futura edición del alumno. Serialización sobre padre evita snapshot mezclado con retiro concurrente.

## DES-H3-006 — Snapshot explícito

alumno_snapshot construido DB-side en creación: versión de estructura, instante DB, campos relevantes de ficha REQ-003, IDs y etiquetas de geografía/catálogos y contactos activos válidos existentes. Excluir edad, Auth, tokens y datos ajenos. Snapshot no es input del cliente. Se conserva inmutable incluso tras cambiar Ciclo/patrocinador/opciones/código. Protección DB de rutas de actualización y whitelist, no solo UI readonly.

Operación actual consulta alumno_id; consulta histórica usa snapshot explícitamente bajo permiso académico. No copiarlo a JSON auditoría, lista, URL, localStorage o logs. Limpiar PII al cambiar identidad/logout e ignorar respuestas tardías de actor anterior. No afirmar retención legal no definida.

## DES-H3-007 — Empresa mínima

empresa_patrocinadora UUID, RUC texto trim de exactamente 11 dígitos ASCII UNIQUE y razón social trim no vacía ≤200 obligatorios; persona contacto ≤150, teléfono ≤30, email ≤254 opcionales. Nunca convertir RUC a número. Director y Coordinador buscan/crean/editan. Sin SUNAT ni funcionalidades H7. FK nullable empresa_patrocinadora_id en matrícula, no alumno. Sin DELETE usado, facturación, pagos, cuentas ni deuda.

guardar_empresa_patrocinadora con whitelist, autorización y expected_updated_at en edición. Alta/edición independiente previa a matrícula: se selecciona UUID persistido. Una empresa/alumno guardados previamente no se revierten si falla después matrícula; están fuera de esa transacción. No confundir esa independencia con varias escrituras cliente para completar matrícula.

## DES-H3-008 — Tarifa

tarifa UUID, código trim/MAYÚSCULAS UNIQUE ≤30, nombre ≤150, descripción opcional ≤500, tipo CARRERA/OTRO, monto_por_defecto numeric(12,2), activo, tiempos DB. ≥0, incluido 0.00; rechazar precisión >2 antes de cast para evitar redondeo silencioso, negativos/NaN/infinito/overflow. Soles, sin floats.

guardar_tarifa y cambiar_activo_tarifa: Director, versión esperada y auditoría. Inactivar conserva referencias; propuesta sin DELETE de producto. Default cambia solo catálogo. Ejemplos del usuario son orientativos, no semillas ni asociación automática Carrera.

## DES-H3-009 — Configuración de Ciclo

ciclo_tarifa UUID, ciclo_id/tarifa_id FK, UNIQUE par, importe numeric(12,2), obligatorio, activo, timestamps. Exactamente una tarifa activa CARRERA, marcada obligatoria, para habilitar matrícula; rechazar cero, dos o CARRERA opcional; no exigir tarifas al crear Ciclo H2. Fuente catálogo y relación vigentes al registrar; referencia vieja permanece legible.

guardar_ciclo_tarifas para Director recibe versión esperada de Ciclo y conjunto autorizado; nuevo importe propone default UI y permite override. Cambios avanzan versión padre Ciclo, auditan y no alteran catálogo/cargos. Mantenimiento de ciclo_tarifa solo PROGRAMADO/EN_CURSO; CERRADO/DESIERTO/ANULADO solo consulta, autorizado en servidor. Coordinador solo consulta configuración para matricular.

## DES-H3-010 — Matrícula y cargo

| Entidad conceptual | Datos e invariantes |
|---|---|
| matricula | UUID, alumno_id, ciclo_id, empresa nullable, ACTIVO/ANULADO, código visible y metadatos de generación, alumno_snapshot, tiempos/versión DB, motivo/actor/fecha anulación |
| matricula_cargo | UUID estable, matricula_id, origen ciclo_tarifa_id/tarifa_id, código/nombre/tipo históricos, importe_original, descuento separado, motivo descuento, importe_final derivado/validado; numeric(12,2), activo y motivo de inactivación; no DELETE |
| Contador privado | Clave año+sigla, último correlativo; sin exposición cliente |

Contrato registrar_matricula: alumno_id+expected_alumno_updated_at, ciclo_id+expected_ciclo_updated_at, empresa UUID opcional, IDs ciclo_tarifa opcionales elegidas, descuento/motivo solo cuando autorizado y código manual opcional. No recibe totales, importes de tarifa, snapshot, actor, estado ni correlativo; campos extra rechazados, IDs duplicados/de otro Ciclo/inactivos rechazados. Obligatorios se obtienen siempre DB-side, no dependen de selección cliente.

Fases de una transacción: autorizar → obtener estado/versiones coherentes → validar ficha/contactos/Ciclo/empresa → reobtener tarifas → calcular cargos/descuento → generar código → insertar matrícula/snapshot/cargos → auditoría → retornar ID/código/estado/versión y resumen seguro. Cualquier fallo revierte filas, versiones, contador transaccional y eventos. No escrituras React para completar partes. Código en confirmación previa es sugerencia no reservada; DB determina definitivo.

Cambios posteriores de catálogo/default/Ciclo nunca alteran cargos existentes. H4 recibirá cargos históricos por UUID estable; cada cargo mantiene vigencia e historia, sin replaced_by, árboles de versiones ni event sourcing. Sin pagos ni saldos en H3. Si respuesta de red ambigua, UI consulta por alumno+ciclo y presenta resultado antes de reintentar explícitamente; no retry ciego ni idempotencia financiera anticipada.

## DES-H3-011 — Evolución acotada de comandos H2

Destino PROGRAMADO/EN_CURSO validado dentro de registrar/editar. Consultar existencia de matrícula ACTIVO, no cualquier matrícula, para bloquear cambio Carrera y limitar edición ordinaria de Ciclo a Director/promoción/fechas. Si solo existen matrículas ANULADO, cambio de Carrera permitido con permisos, estado editable, materias y superposición H2; esas matrículas conservan snapshots, cargos y códigos históricos. Esta precisión humana sustituye la interpretación anterior de “cualquier matrícula” para cambio Carrera.

No extender esa excepción a otras restricciones H2: cambiar_estado_ciclo sigue sin permitir ANULADO cuando existen matrículas, según regla H2 vigente; la decisión de permitir Carrera con solo anuladas no autoriza ANULAR ese Ciclo. Conservar otras transiciones H2 sin cascada a matrículas/cargos. El caso de matrícula ACTIVO en Ciclo ANULADO se trata defensivamente como terminal, sin crear vía que produzca ese estado en contra de las restricciones actuales.

Revisar guardar_ciclo, cambiar_materia_ciclo, guardar_carrera y propagación de sigla/sincronización: ninguna vía indirecta puede cambiar Carrera del Ciclo con matrícula activa ni reescribir historia de matrículas. La propagación H2 permitida sobre código de Ciclo nunca regenera código matrícula; cualquier sincronización debe respetar límites de edición del Ciclo con activas. No bloquear cambio Carrera solo por presencia de anuladas. Nueva migración futura, sin reescribir Spec/migraciones H2; registrar la precisión de H3 en regresión.

Si Ciclo actual pasa a CERRADO/DESIERTO/ANULADO y matrícula sigue ACTIVO, bloquear cambios ordinarios de Ciclo, empresa, opciones, código y descuento, incluso cambiarla a destino elegible. Ambos roles pueden ANULAR matrícula con motivo en ese estado. Validar actual y destino dentro de transacción; sin cascada automática.

## DES-H3-012 — UNIQUE del par

UNIQUE(alumno_id,ciclo_id) sin predicado de estado, también al cambiar Ciclo; ANULADO no libera. Una matrícula por par y cargos completos de una sola ganadora. Mensaje de duplicado seguro, sin datos personales de otro registro. Nunca count/MAX como garantía concurrente.

## DES-H3-013 — Generación y edición de código

Año DB de inscripción America/Lima y sigla vigente Carrera al crear; contador privado por (año,sigla), upsert transaccional independiente de ciclo_correlativo H2. Formato automático AÑO-SIGLA-CORRELATIVO, mínimo tres dígitos, 1000 permitido; no MAX+1 ni gapless. Persistir año/sigla/correlativo y codigo_generado_original inmutables, más codigo_matricula visible UNIQUE trim/MAYÚSCULAS.

Ambos roles académicos pueden editar código solo con matrícula ACTIVO y Ciclo actual PROGRAMADO/EN_CURSO. Manual valida formato completo YYYY-SIGLA-CORRELATIVO: año cuatro dígitos, sigla alfanumérica de 2–10 como patrón H2 y correlativo de al menos tres dígitos, sin truncar al superar 999 ni tope arbitrario 50. No inferir obligación de igualar segmentos manuales a Carrera/Ciclo actuales: los metadatos originales preservan origen; el formato y unicidad no autorizan modificar esos metadatos.

Contador se consume aun con override. Si sugerido colisiona con manual ya usado, avanzar en contador dentro de transacción; UNIQUE y resolución DB de colisiones concurrentes, sin bucle cliente/retry de formulario. Cambio manual audita original, anterior/nuevo, actor y operación. Nunca regenerar automáticamente por cambio posterior de Ciclo, Carrera o sigla, sea matrícula activa o anulada. Una anulada puede conservar 2026-MPC-001 tras cambio Carrera de su Ciclo. UUID sigue identidad técnica.

## DES-H3-014 — Descuento y edición por Coordinador

Solo Director aplica descuento a CARRERA, soles numeric(12,2), 0≤descuento≤original, motivo trim no vacío si >0. No porcentajes ni descuento a otras tarifas. Director confirma al registrar/editar; servidor recalcula final sin modificar original. Coordinador en alta omite descuento o cero; positivo denegado. En edición dentro del mismo Ciclo no altera/quita descuento vigente: omite campos descuento/motivo y servidor conserva.

Cambio Ciclo es operación distinta: inactiva todos los cargos vigentes anteriores con CAMBIO_CICLO, sin alterar su original/descuento/motivo/final; crea cargos destino con UUID nuevos y descuento=0, nunca traslada el anterior. Director y Coordinador pueden ejecutar cambio desde Ciclo actual no terminal a destino elegible. El nuevo CARRERA inicia cero incluso si ejecuta Director; si se desea descuento, solo Director puede aplicarlo nuevamente sobre ese nuevo cargo mediante edición autorizada posterior.

Contrato de cambio Ciclo no recibe descuento de origen/destino: rechazar campos que intenten conservar/copiar/modificarlo manualmente. No aceptar de Coordinador nuevo descuento ni importes/totales cliente. Servidor obtiene nuevo conjunto y precios. Esta regla no concede al Coordinador edición del descuento histórico: conserva el cargo anterior íntegro. Auditoría explícita de ambos Ciclos/cargos/inactivación/actor. EVOL-001 fuera de alcance.

## DES-H3-015 — Edición atómica

editar_matricula recibe ID+expected_updated_at y whitelist. alumno_id/snapshot no editables. Solo matrícula ACTIVO cuyo Ciclo actual sea PROGRAMADO/EN_CURSO; terminal bloquea toda edición ordinaria, incluida salida a otro Ciclo. Cambio patrocinador/código no recalcula cargos.

Cambio de Ciclo: validar destino elegible/par/versiones, leer tarifas activas destino (exactamente una CARRERA obligatoria y demás obligatorias/opcionales seleccionadas), inactivar todos los cargos vigentes anteriores con motivo CAMBIO_CICLO y conservar importes/descuento/motivo/final; crear cargos destino con UUID nuevos, precios servidor y descuento cero. No reutilizar UUID/origen anterior, trasladar descuento ni aceptar descuento en payload de cambio. Director puede aplicar posteriormente descuento nuevo al nuevo cargo por operación autorizada. Cambios de referencias, cargos, versiones y auditoría en una transacción, sin alterar snapshot/código histórico.

Opciones en mismo Ciclo: retirar inactiva cargo con motivo de cambio y conserva importes; agregar/reagregar crea UUID nuevo con importe vigente ciclo_tarifa; cargos retenidos conservan original/descuento/final sin repricing. Nunca DELETE ni reactivación del UUID retirado. Mantener unicidad de aplicación vigente por matrícula/origen, sin UNIQUE histórico global que impida reagregar; no replaced_by, árboles ni event sourcing. Cambios posteriores de catálogo/default/ciclo_tarifa tampoco recalculan cargos existentes. No reglas sobre pagos aún inexistentes. Auditar inactivación/alta y referencias económicas mínimas.

## DES-H3-016 — Anulación concreta

anular_matricula(ID,expected_updated_at,motivo) solo ACTIVO→ANULADO, ambos roles, incluso si su Ciclo actual es terminal. Motivo trim obligatorio ≤500 propuesto, actor/fecha DB. Repetir no crea doble evento exitoso. Estado terminal bloquea edición completa/código y reactivación en DB. Conservar cargos/snapshot y par UNIQUE, sin reversos financieros ni borrar historia. Modal breve accesible y readonly posterior.

## DES-H3-017 — Auditoría mínima

Reutilizar public.auditoria y patrón transaccional H2, sin servicio/event bus. Actor auth.uid(), timestamp DB, entidad/UUID/acción/motivo, old_values/new_values pertinentes. Alumno/contactos/empresa: IDs y nombres de campos cambiados, no valores PII. Matrícula/cargos: referencias, códigos y valores económicos necesarios; descuento registra original/descuento/motivo/actor/operación. No alumno_snapshot ni JSON de ficha. Cambio Ciclo registra explícitamente Ciclo anterior/nuevo, cargos inactivados con CAMBIO_CICLO, nuevos UUID/cargos y actor, todo atómico; retiro opcional registra motivo sin DELETE.

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

Riesgos para decisión: crecimiento desde 7 RPC/11 helpers H2 a API oculta; mantener comandos de propósito claro e inventario revisable, helpers solo con necesidad concreta compartida. Restricciones H2 indirectas pueden romper regresión. Trigger genérico podría copiar PII. Historia/vigencia simple de cargos definida en OQ-H3-008; H4 deberá revisar futuras restricciones financieras sin cambiar historia. Consistencia concurrente no se demuestra con SELECT previo. Forced-colors SO no fue verificado humanamente en H2 y su riesgo aceptado no equivale a prueba H3.

Gate 2 revisará recorrido completo y costo/mantenibilidad sin umbral arbitrario de líneas. Si exige demasiadas capas, registrar riesgo y pedir decisión antes de expandir; no añadir una API automáticamente.

**H3 NO está autorizado para construcción. Pendiente de revisión humana y Gate 1.**
