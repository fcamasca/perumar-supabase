# H4 — Pagos: design

Versión 0.1 · 09/11/2026 (America/Lima).

**DISEÑO PROPUESTO. OQ ABIERTAS. PENDIENTE DE GATE 1. SIN IMPLEMENTACIÓN.**

Base, precedencia y preguntas completas en [requirements](requirements.md). Cada DES-H4-n desarrolla REQ-H4-n; implementación futura TASK-H4-n, pruebas en [test-plan](test-plan.md). Nombres/campos/contratos son propuestas legibles, no SQL, migraciones ni código ejecutable. No se consideran aprobados los resultados de las OQ por aparecer una recomendación aquí.

## DES-H4-001 — Recorrido y frontera

React → SDK existente → lecturas bajo RLS / una RPC financiera concreta → PostgreSQL y auditoría en la misma transacción. Una institución y pocos usuarios concurrentes. Sin API adicional, Edge Function, pasarela, bus, servicio de deuda ni motor de comandos. La confirmación en pantalla no equivale a un comprobante documental. Los límites HU13 frente a PLAN están en requisitos; HU14/HU15 y H5+ excluidos.

## DES-H4-002 — Matriz por cerrar y mínimo privilegio

| Capacidad | Respaldo de fuentes / propuesta | Estado antes de Gate 1 |
| --- | --- | --- |
| Registrar pago particular | HU13 identifica Director y Coordinador | Confirmar alcance y estados en OQ-H4-012/004/005/015 |
| Consultar saldo/historial/aplicaciones | Necesario para HU13 y recuperación segura | Lectores exactos OQ-H4-012 |
| Consultar resultado por clave | Mismo acceso a matrícula/pago; clave no es credencial | Alcance entre usuarios/sesiones OQ-H4-010/012 |
| Mantener medios | No definido por HU13 | OQ-H4-008/012; sin permiso implícito |
| Corregir/anular pago confirmado | No definido por PLAN | OQ-H4-006/012; no implementar por defecto |
| Admin Sistema y roles técnicos | No reciben permiso financiero por gestionar identidades | Sin permiso implícito; alcance de auditoría OQ-H4-013 |

Aplicar identidad auth.uid() y roles activos app_users/app_roles/app_user_roles; no aceptar actor, rol ni claims personalizados como autoridad. Multirol solo suma capacidades expresamente aprobadas. Revalidar acceso incluso en replay; revocación, usuario inactivo o sesión expirada no obtienen resultado financiero por conocer una clave.

RLS en cada tabla nueva: SELECT solo de actores/objetos aprobados. Sin INSERT/UPDATE/DELETE/TRUNCATE cliente, sin grants públicos o anon de escritura/EXECUTE financiero. La RPC definer requiere owner confiable, search_path vacío, nombres calificados, whitelist y validación de rol/objeto/estado en su cuerpo; el owner que elude RLS no elimina esas obligaciones. Las lecturas agregadas no pueden eludir RLS por owner de una vista. Reutilizar helpers H1/H3 sin framework de autorización nuevo.

## DES-H4-003 — Deuda derivada, no entidad persistida

Modelo recomendado: la deuda es una proyección, no una fila financiera autónoma ni campo saldo editable. Sea B(M) la suma de importes_finales de los cargos exigibles de matrícula M conforme a OQ-H4-003/017; A(M) la suma de pagos/aplicaciones efectivos confirmados en ese mismo perímetro conforme a OQ-H4-001/006. Pendiente(M) = B(M) − A(M). Si hay cargos, también se comprueba pendiente por cargo, y la suma concilia con matrícula.

No determinar todavía B solo con activo=true: H3 conserva cargos inactivos por traslado/retiro y esos cargos pueden tener aplicaciones futuras. Tampoco restar todos los abonos a cualquier filtro de cargos sin concordancia de perímetro. Gate 1 debe fijar qué continúa siendo exigible. Proyección histórica por Ciclo requiere distinguir origen del cargo frente a ciclo_id actual de matrícula, que H3 permite cambiar.

Obtener importes de matricula_cargo, con original/descuento/final históricos, nunca recalcular usando tarifas actuales. Una tarifa o su inactivación no anula un cargo existente. Un resultado negativo es inconsistencia a rechazar/diagnosticar; no usar una presentación que lo fuerce a cero ni una bandera PAGADO mantenida separadamente.

Para saldo cero derivado se comunica deuda completada, pero la elegibilidad de registrar otro pago es siempre no: importe debe ser >0 y no exceder cero. Saldos anteriores al nuevo módulo se calculan desde cargos existentes; no inventar pagos de apertura, saldos iniciales manuales ni cobros históricos inexistentes.

## DES-H4-004 — Modelo mínimo y alternativas excluyentes

Base existente: matrícula UUID estable con alumno_id, ciclo_id mutable conforme a H3, patrocinador opcional, ACTIVO/ANULADO, snapshot/código histórico y updated_at. matricula_cargo tiene UUID estable, vínculo a matrícula y ciclo_tarifa de origen, tipo técnico CARRERA/OTRO, importes numeric(12,2), descuento/motivo, activo y motivo_inactivacion. Retirar/reagregar no reutiliza UUID. No introducir columnas H4 ahora.

Entidad propuesta **pago**:

| Campo conceptual | Propósito / condición |
| --- | --- |
| id UUID DB | Identidad del registro, no número de comprobante legal |
| matricula_id FK | Una sola matrícula por operación; autorizarla en DB |
| idempotency_key UNIQUE | Identidad de comando; formato/ámbito/retención OQ-H4-010 |
| importe numeric | Importe exacto positivo; escala/cota OQ-H4-014 |
| medio_pago_id FK catálogo | Validar catálogo y activo; etiqueta/código histórico mínimo obtenido DB |
| fecha_operacion | Tipo/semántica/validación OQ-H4-007; distinta de registrado_at |
| concepto o referencias de concepto | Solo lo aprobado en OQ-H4-009; no duplicar innecesariamente cargo y texto |
| registrado_at / registrado_por | DB / sujeto autenticado, inmutables en la operación confirmada |
| contenido semántico verificable | Campos anteriores y aplicaciones si corresponde, para igualdad idempotente; no payload arbitrario ni copia PII |
| estado de pago, solo si necesario | Depende de OQ-H4-006; no enum/campos de cancelación vacíos para una función no aprobada |

**Alternativa A — aplicación global**, sujeta a OQ-H4-001: pago.matricula_id e importe representan la aplicación al total de esa matrícula. No hace falta una segunda tabla que repita el mismo par/importe ni fingir imputación por cargo. Las reglas de cambio de cargos/traslado deben permitir una ecuación global coherente.

**Alternativa B — imputación por cargo**, sujeta a OQ-H4-001/002: añadir **pago_aplicacion** con id o clave compuesta mínima, pago_id FK, matricula_cargo_id FK e importe numeric positivo. UNIQUE del par pago/cargo, mismo propietario matrícula y suma de aplicaciones igual a importe del pago, comprobadas en transacción/constraint al finalizar; FKs separadas sin comprobación de propiedad no bastan. Ningún pendiente individual se excede aunque el global alcance. Sin filas de importe cero ni aplicaciones huérfanas; cargo inactivo sujeto a OQ-H4-003. La tabla se omite si no es necesaria.

No tabla deuda, cuenta corriente, ledger genérico, reserva permanente de clave separada, outbox ni saldo materializado. Índices mínimos: clave idempotente, historial por matrícula/registro/ID, FKs de aplicación si existe; no índices especulativos. Propuesta de una proyección de saldo de solo lectura, sin persistencia. OQ-H4-006 puede requerir una corrección mínima, pero no se diseña/implementa un motor de reversos por anticipación.

## DES-H4-005 — Dinero y validación

Transportar importes como texto decimal canónico; validar sintaxis y precisión antes de convertir al numeric acordado, sin redondeo inadvertido. Numeric de PostgreSQL es la autoridad. La UI puede dar ayuda visual, pero el total no depende de float ni acumulación Number. Soles y escala dos son la propuesta por continuidad de H3, pendientes OQ-H4-014; no expandir a divisas para resolverla.

No recibir saldo, total previo, descuento, estado, actor, precio de tarifa ni importes de cargo para obedecerlos. Si se elige aplicación manual, sus importes son una solicitud: servidor comprueba suma, matrícula, vigencia/perímetro y pendientes individuales. En automática, cliente no propone importes de aplicación y el servidor ejecuta únicamente el orden aprobado; no coexisten modos sin necesidad humana.

## DES-H4-006 — Elegibilidad sin inferir política desde H3

Validar matrícula existente y su alumno/ciclo bajo autorización. El ciclo_id enviado como contexto, si se permite, no sustituye la relación real; rechazar si difiere. Particular no equivale automáticamente a alumno sin empresa en todas sus matrículas: patrocinador H3 pertenece a matrícula, no al alumno. OQ-H4-015 fija el criterio de cobro.

OQ-H4-004/005 fijan estados de matrícula y Ciclo admitidos para un pago nuevo. El hecho de que H3 bloquee editar un Ciclo terminal no demuestra que una deuda dejase de cobrarse. Tampoco ANULADO autoriza devolución o borrado. Solo ANULADO/ACTIVO de H3, no estados ficticios ACTIVA de presentación. Un replay de pago confirmado con permiso vigente recupera ese pago sin tratarlo como nuevo cobro sobre un estado que luego cambió.

## DES-H4-007 — Frontera con ediciones H3

| Operación vigente H3 | Riesgo al haber pagos | Decisión y comprobación H4 necesarias |
| --- | --- | --- |
| Cambiar descuento del cargo CARRERA, solo Director | Reducir importe final por debajo de lo aplicado | OQ-H4-016: permitir/restringir y límite bajo lock; no nuevo permiso de descuento |
| Retirar opcional / reagregar con UUID nuevo | Pago deja de figurar si el saldo filtra activos; aplicación pierde destino lógico | OQ-H4-003/016: conservar relación y exigibilidad o bloquear; sin mover aplicaciones al UUID nuevo |
| Cambiar Ciclo de matrícula | Inactiva cargos viejos, crea nuevos sin descuento, ciclo_id cambia | OQ-H4-003/016/017: no atribuir automáticamente pagos viejos al destino ni duplicarlos en vistas |
| Cambiar patrocinador | Cambia clasificación particular y eventual responsabilidad | OQ-H4-015/016; no crear cuentas de patrocinador o reparto de facturas |
| Anular matrícula | Ocultar deuda/pagos o permitir nuevas operaciones incoherentes | OQ-H4-004; no cascada/reverso implícito |
| Tarifas/defaults/ciclo_tarifa | Intentación de recalcular cargos ya cobrados | Prohibido por H3; no repricing ni cambio de pago |
| Asignaturas del Ciclo con matrícula activa | CHG-H3-011 autoriza Director confirmado, pero no toca cargos | Conservar alcance académico, no convertir cambio de asignaturas en ajuste monetario |

H3 indica expresamente revisar cambios libres antes de H4. En construcción solo se podrán acotar rutas H3 necesarias para la política H4 aprobada, conservando contrato/historia o documentando cambio concreto en este Spec antes de Gate 1. Ningún writer económico puede continuar fuera del protocolo compartido de matrícula. No se altera H3 por este Spec.

## DES-H4-008 — Fecha, concepto y datos mínimos

registrado_at es timestamp de DB con zona y registrado_por procede de sesión verificada. Fecha de operación debe conservar el significado humano acordado en OQ-H4-007, sin convertir día local en día anterior por zona ni usarla para ordenar la auditoría como si fuera registro. Fechas/horas suministradas no se consideran prueba bancaria.

Concepto es OQ-H4-009. Si se deriva de cargos, mostrar sus nombres históricos y UUID correspondientes; si se autoriza texto, longitud/obligatoriedad/normalización quedan registradas antes de construir y sin PII en motivos. No nuevo catálogo genérico ni cargo monetario creado al teclear un concepto.

## DES-H4-009 — Medios declarativos

Preferencia técnica: una definición MEDIO_PAGO en catalogo y valores en catalogo_valor existentes; nombre técnico final y seed sujetos a OQ-H4-008. Validar pertenencia y vigencia server-side, no solo referencia FK. Guardar referencia y etiqueta/código histórico mínimo resuelto DB, para que renombrar o inactivar medio no reescriba pagos anteriores. Una referencia bancaria, si la persona la considera imprescindible, requiere necesidad/longitud/visibilidad y regla explícita; no es una clave idempotente ni garantiza unicidad universal.

No mantenimiento genérico de catálogos. Si no hay mantenimiento existente aplicable, OQ debe elegir carga versionada o una acción mínima futura y autorizarla; no añadirla escondida. La acción de registro de pago sigue siendo un solo comando, sin llamada a proveedor ni carga de comprobante.

## DES-H4-010 — Contrato propuesto de registro

**registrar_pago(p)**, nombre propuesto; una RPC de escritura para el alta. Whitelist conceptual: matricula_id, idempotency_key, importe, medio_pago_id, fecha_operacion y concepto según decisiones; aplicaciones solicitadas solo si se elige imputación manual; expected_matricula_updated_at como versión de borrador propuesta para concordar con H3. No acepta alumno_snapshot, rol, actor, estado, saldo ni descuentos. La forma definitiva se cierra junto con OQ; no se escribe una firma SQL.

Secuencia propuesta: autenticar/autorizar → validar estructura/clave y matrícula solicitada → seguir locks de DES-H4-013 → buscar operación existente por clave bajo autorización → si existe, comprobar contenido y recuperar sin mutación → si nueva, comprobar versión/estado/particular/medio/fechas e importes → recalcular pendiente coherente → validar/derivar aplicaciones → persistir pago y aplicaciones, avanzar versión del agregado según diseño aprobado y auditar → confirmar → devolver proyección autorizada.

Respuesta propuesta: pago_id, matrícula, importe, fecha de operación, medio histórico, aplicaciones cuando existan, registrado_at y resultado confirmado/recuperado. Resumen derivado coherente y nueva versión de referencia para seguir operando. El saldo actual devuelto al recuperar puede diferir del saldo al crear si hubo otros pagos; el pago recuperado es el mismo, no se inventa saldo histórico persistido para igualar toda respuesta.

Revocar EXECUTE PUBLIC/anon; acceso authenticated no equivale a permiso financiero. Si OQ-H4-006 aprueba corrección, documentar su comando y necesidad antes de implementar; no sobrecargar registrar_pago con modos genéricos editar/revertir/ejecutar.

## DES-H4-011 — Identidad e igualdad idempotentes

Propuesta recomendada para OQ-H4-010: UUID opaco generado al preparar una operación, UNIQUE global y ligado al pago durante toda su conservación, sin TTL ni reutilización por limpiar una caché. No derivarlo de documento, fecha/monto ni timestamp. No es secreto de autorización. Alternativas de ámbito/duración deben demostrar recuperación de commit perdido y ausencia de reutilización peligrosa antes de aprobarse.

El contenido semántico se obtiene de campos tipados del pago y aplicaciones; comparar en servidor tras normalización acordada: representación decimal equivalente, fecha conforme a OQ-H4-007, IDs y conjunto/orden significativo de aplicaciones. No aceptar un hash del cliente como prueba de igualdad. Una huella auxiliar DB solo se justifica si reduce complejidad, no reemplaza la comparación ni requiere tabla propia. Actor generado/registrado_at y expected_updated_at son metadatos de ejecución, no automáticamente parte del contenido semántico: cerrar reglas en OQ-H4-011/010.

Misma clave de pago ya confirmado y contenido equivalente: devolver misma identidad/pago, sin nueva aplicación, avance de versión ni alta de auditoría. Misma clave con contenido distinto: recomendación conflicto seguro sin mutación; OQ-H4-011 confirma contrato exacto. No aceptar el contenido distinto como actualización ni generar otra clave automáticamente. Si corresponde a matrícula fuera del permiso actual, respuesta opaca sin divulgar operación ajena.

Comprobar replay antes de exigir vigencia de referencias o versión para una escritura nueva: inactivar el medio, pagar después o avanzar updated_at no debe duplicar un pago confirmado ni impedir recuperar sus datos históricos si el actor sigue autorizado. Una clave cuyo intento se revirtió no tiene pago confirmado: el protocolo debe permitir resolver el intento sin guardar reservas eternas o eventos de éxito falsos.

## DES-H4-012 — Respuesta perdida y consultas de resultado

Estados de UX, no estados financieros persistidos inventados: listo/borrador, enviando, confirmado, rechazado inequívoco, resultado desconocido. Bloquear doble clic durante envío. Ante timeout/desconexión no afirmar fracaso ni ofrecer un pago distinto con nueva clave. Conservar la identidad de esa operación y datos mínimos en memoria; continuidad tras recarga/salida/dispositivo depende de OQ-H4-010 y no se deja sin resolver al aprobar Gate 1.

Recuperación propuesta mediante lectura exacta de pago por clave con RLS, con detalle de aplicaciones si procede; no otra RPC de escritura ni bypass administrativo. Si confirmado, mostrar mismo UUID e importes originales y recargar saldo actual. Si no aparece, podría estar en curso/rollback/sin acceso; UI no infiere certeza a partir de una lectura vacía. La acción explícita de resolver/reenvío usa la misma clave y contenido, una nueva transacción y los mismos permisos, no un retry silencioso. Si hay conflicto de contenido o permiso, no cobrar ni divulgar registro ajeno.

No almacenar ficha, documento, snapshot, credenciales ni payload financiero completo en localStorage/URL/logs para resolver continuidad. Si se necesita persistir una clave opaca o referencia mínima en sesión local, OQ-H4-010 define aislamiento por usuario, limpieza y recuperación sin filtrar datos entre identidades; no afirmar que ya está resuelto por usar un UUID. La necesidad de recuperar después de recargar es bloqueante si la estrategia elegida pierde la única clave del pago ambiguo.

## DES-H4-013 — Protocolo explícito de locks y versiones

H3 implementado bloquea Ciclos en orden UUID, después Alumno y Matrícula en editar_matricula; registrar_matricula bloquea Ciclo y Alumno antes de crear la fila, y anular_matricula coordina la matrícula existente. No invertir ese orden introduciendo un pago que bloquee matrícula y luego espere un Ciclo retenido por edición.

Propuesta conservadora para la operación financiera: leer IDs de referencia sin considerarlos definitivos; si la política requiere comprobar/bloquear ciclo, tomar Ciclo(s) por UUID ascendente → Alumno → Matrícula estable → cargos por UUID ascendente si se necesitan → filas de pago/aplicación existentes. Releer la matrícula bajo lock y comprobar que alumno/Ciclo/versión coinciden con el contexto observado; si cambiaron, conflicto explícito y salida sin escrituras. En una misma operación no se pagan varias matrículas.

La fila estable que serializa deuda/cobro es Matrícula; no una fila saldo ausente al primer pago ni solo un cargo particular. El prefijo de locks conserva la disciplina H3 y protege estados/referencias cuando haga falta; si se propone omitir alguno por rendimiento, demostrar compatibilidad de todas las rutas antes de Gate 1, no adquirirlo después en orden inverso. Las operaciones que pueden cambiar exigibilidad o aplicaciones usan el mismo protocolo. Tarifas que no alteran cargos históricos no recalculan deuda ni necesitan una cadena de locks financiera adicional.

Mantener SERIALIZABLE como continuidad H2/H3. Una transacción que esperó un lock bajo snapshot anterior puede recibir serialización y debe abortar; no continuar con un saldo viejo. La unicidad de clave cierra carrera entre operaciones iguales; no sustituye el lock de matrícula para claves diferentes. Choque de misma clave y distinto destinatario/importe no crea dos pagos ni filtra información; abortar conflicto conforme a OQ.

Nueva operación valida versión de borrador y vuelve a calcular saldo con lock. Propuesta: avanzar updated_at de matrícula al registrar pago, para que un editor H3 abierto antes del cobro no pase inadvertido; esa versión no almacena saldo ni hace de fuente monetaria. Replay confirmado se atiende antes de rechazar por la versión que el pago mismo avanzó. No refrescar versiones y reintentar automáticamente. 40001/40P01 requieren explicación y acción consciente; clave del intento incierto se mantiene.

Caso obligatorio: saldo 100, dos conexiones/barrera, pagos 70 y 60 con claves diferentes. Estado final válido: un pago cabe y el otro recibe exceso/conflicto; abonado ≤100 y pendiente ≥0. No se aprueban 130 ni pago parcial automático del excedente (por ejemplo convertir 60 a 30 sin consentimiento). Registrar cuál ganó y las filas/auditorías finales, no solo estados HTTP.

## DES-H4-014 — Atomicidad y fallos

Pago, aplicación, avance de versión y auditoría comparten commit. Falla al insertar una aplicación, violar suma/propiedad o escribir auditoría revierte también el pago; no queda clave exitosa huérfana ni un historial de éxito. Las reservas transaccionales de UNIQUE terminan con la transacción, no con un estado perpetuo en otro sistema. No simular éxito porque la UI bloqueó el botón.

Probar fallos controlados en entorno aislado antes de persistir, entre pago/aplicación, antes de auditoría y antes de commit; luego contrastar el caso de commit real con respuesta perdida, que sí deja una operación completa recuperable. Nunca inyectar fallos en RPC pública ni alterar seguridad de base humana. No concurrencia probada con dos promesas en una misma conexión serializada.

## DES-H4-015 — Auditoría con sensibilidad explícita

Reutilizar public.auditoria append-only con evento concreto de pago confirmado, UUID del pago/matrícula y actor/fecha DB. Proyección explícita por operación; no copiar to_jsonb completo de pago o alumno. Importe, concepto, medio, referencia bancaria y aplicaciones en auditoría son OQ-H4-013: detalle consultable de pago bajo autorización no obliga a replicarlo a todos los lectores de auditoría H2. El rol Admin Sistema no obtiene automáticamente acceso a las tablas financieras por ver un evento mínimo.

Motivos sin datos personales; clave idempotente/payload completo no se replican en logs de red o diagnósticos. Replay confirmado no produce otro evento de registro. Si se aprueba una corrección, evento/relación al original y efecto financiero se definen en la enmienda/OQ; no borrar eventos. Fallo de auditoría aborta operación, no manejo asíncrono.

## DES-H4-016 — Lectura consistente de saldo e historial

Propuesta: una vista/proyección DB de solo lectura e invocador con RLS efectiva, para obtener B/A/pendiente en un mismo snapshot. Si esa vista no puede preservar autorizaciones y consistencia con las herramientas existentes, evaluar una consulta de lectura acotada y justificarla antes de añadir una RPC adicional; no hacer sumas sobre páginas parciales en React. No derivar saldo combinando totales de dos peticiones en instantes diferentes. Si un actor puede ver cargos H3 pero no está autorizado para todos los pagos del perímetro, denegar el resumen financiero completo; no sumar un subconjunto filtrado por RLS y mostrar una deuda mayor como si fuera correcta. La autorización de la proyección y sus componentes debe concordar.

Historial mediante Data API sobre pago/aplicación con filtros de matrícula, orden registrado_at + id y paginación determinista; el total no se obtiene sumando solo la página visible. Nombres de concepto/medio históricos legibles sin exigir que sigan activos. No ficha completa de alumno ni snapshot en grilla/resultado de búsqueda. Un permiso retirado invalida lecturas, recuperación y respuestas tardías de la sesión anterior.

Separar historial original de cargo/pago de saldo actual. El filtro de Ciclo no reatribuye automáticamente abonos si matricula.ciclo_id cambió; OQ-H4-017 define su semántica. No informes financieros amplios, exportación, deuda de patrocinador ni mezclas de varias matrículas.

## DES-H4-017 — Pantalla propuesta y accesibilidad

Entrada desde matrícula individual existente, contextual a alumno/Ciclo. Resumen de importes y grilla de pagos con fecha de operación, registro, importe, medio y aplicación/concepto según OQ. Importes a la derecha y dos decimales solo si OQ-H4-014 lo confirma. Acción Registrar pago abre formulario breve; distribución manual de múltiples cargos, si se aprueba, puede requerir sección completa en lugar de modal estrecho. No Stepper largo ni segunda grilla confundible con historia.

Mostrar saldo de referencia y fecha de consulta, importe, medio, fecha/concepto aprobados y confirmación. La transacción decide saldo final y respuesta indica parcial/completo. Error inline y foco al primer inválido; conflicto conserva borrador sin enviar automáticamente. Resultado desconocido ofrece resolver operación, no otro cobro. Sin window.alert/confirm/prompt ni permisos decididos por React.

Mismo estándar Alumnos/Empresas/Ciclos: búsqueda, consulta frente a acción, acciones a derecha con texto/tooltip accesible, volver contextual, paginación/filtros, sin pérdida de borrador al cambiar pestaña/foco. Sistema/Claro/Oscuro/Alto contraste, forced-colors SO prioritario, teclado/foco/restauración en diálogo, estados no solo por color. El residual de H3 no prueba H4: registrar ensayo real o NO VERIFICADO para decisión humana futura.

## DES-H4-018 — Errores seguros y observabilidad mínima

Familias propuestas de respuesta: VALIDACION, SALDO_INSUFICIENTE, NO_AUTORIZADO, NO_ELEGIBLE, CONFLICTO_VERSION, CONFLICTO_IDEMPOTENCIA, CONFIRMADO/RECUPERADO; nombres/códigos finales se fijan antes de implementar con OQ-H4-011. Timeout es condición de transporte/resultado desconocido, no prueba de que DB devolvió rechazo.

Solo actores autorizados obtienen detalles de saldo/contexto; sin SQL, constraints internos, tokens, cuentas/documentos ni payload en mensajes. Logs técnicos mínimos con identificador de correlación no sensible, resultado y operación, sin registrar clave/importe de rutina. No nueva plataforma de observabilidad, métricas especulativas ni centralizador de negocio.

Una respuesta 40001 no significa que se deba regenerar una clave: tras rollback conocido puede reabrirse la revisión explícita con el protocolo acordado; tras transporte ambiguo se recupera primero. Una respuesta tardía de otra identidad nunca rellena el formulario actual.

## DES-H4-019 — Verificación progresiva y entorno

Tras Gate 1, validar por bloques y dependencias del [tasks](tasks.md): modelo/decimales, permisos, protocolo/rutas H3, alta/idempotencia, rollback, dos conexiones y recuperación, consultas/UI, regresión completa. Datos sintéticos, JWT ordinario por rol para probar autorización; SQL privilegiado solo prepara/verifica fallos transaccionales y no es evidencia de permiso de usuario final.

Base desechable CI para suites con escrituras persistidas; no reset, inyección ni fixtures de negocio contra la base humana. Comprobar cleanup incluso con fallo y no llamar limpieza de usuarios a una limpieza de entidades. Ningún test se ejecuta en este Spec; las verificaciones presentes son únicamente enlaces, IDs, cobertura/dependencias y diff-check.

## DES-H4-020 — Inventario, criterios arquitectónicos y gates

Inventario base aceptado H3: 22 tablas públicas, 17 RPC, 16 helpers y 25 policies SELECT; 15 migraciones. Propuesta mínima H4: pago; pago_aplicacion solo si se aprueba B; una RPC de alta; una proyección de saldo sin persistencia; SELECT policies/grants imprescindibles. No fijar conteo final mientras OQ de modelo/corrección/medios siga abierta; no añadir helpers por simetría. Reutilizar auditoría/roles y justificar cada objeto futuro por REQ y prueba.

| Criterio aplicado | Decisión relevante |
| --- | --- |
| AWS Seguridad / OWASP autorización y mínimo privilegio | Auth/roles actuales, RLS y grants, RPC sin actor arbitrario, no secretos ni PII en logs |
| AWS Fiabilidad | Transacción, locks ordenados, UNIQUE de clave, rollback y recuperación de respuesta perdida |
| AWS Rendimiento | Índices mínimos, agregado DB y paginación; sin sumar páginas en cliente ni materializar saldo sin necesidad |
| AWS Costos | PostgreSQL/Supabase existentes; sin nuevos servicios, colas, Storage o proveedores |
| AWS Excelencia Operacional / OWASP Secure SDLC | Trazabilidad, pruebas negativas/concurrentes, errores seguros, revisión de migraciones/grants y operación en CI aislada |
| OWASP validación/inyección/auditoría | Whitelist/tipos/decimales, consultas parametrizadas y sin SQL dinámico, proyección explícita/auditoría atómica |

Son criterios aplicados al diseño, no certificación ni checklist teórico. Si se necesita una API oculta en PostgreSQL, ledger genérico, motor de distribución extensible o nueva infraestructura para el mínimo H4, detener expansión y reportar el riesgo. Revisar primero si se interpretó mal una OQ.

Gate 1 requiere cierre humano de OQ-H4-001…017 y Spec exacto consistente. Construcción futura parte de ese SHA/registro según patrón anterior. Gate 2 futuro recibe CI/candidato/evidencia humana/inventario/residuales y decisión independiente; nunca se infiere de tests. No acceptance, código, SQL ni pruebas ejecutables ahora; H5+ no autorizado.
