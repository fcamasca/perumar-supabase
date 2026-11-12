# H4 — Pagos: design

Versión 0.3 · 09/11/2026 (America/Lima).

**17 OQ RESUELTAS HUMANAMENTE. SPEC PENDIENTE DE REVISIÓN Y GATE 1. SIN IMPLEMENTACIÓN.**

[Requirements](requirements.md) registra decisiones, base `143ea773e9ff77a7c52944fcc25b620f351c17ef`, precedencia y precisión C-H4-001. Cada DES-H4-n desarrolla REQ-H4-n; [tasks](tasks.md) y [test-plan](test-plan.md) mantienen trazabilidad. Los modelos/contratos son documentación de construcción futura, no SQL, migraciones, RPC ni tests implementados. No quedan alternativas de aplicación global o reparto automático.

## DES-H4-001 — Recorrido acotado

React → SDK existente → lectura RLS/proyección DB o comando financiero concreto → PostgreSQL y auditoría atómicos. Pago particular admite matrícula patrocinada, pero no maneja responsabilidad económica de empresa ni HU14/HU15. Dos comandos de escritura necesarios: registrar_pago y anular_pago; no RPC genérica con modos editar/revertir/ejecutar. Sin servicios nuevos, pasarela, Storage, PDF, reportes amplios ni infraestructura preventiva.

## DES-H4-002 — Matriz definitiva

| Actor activo | Registrar | Saldo/historial | Recuperar registro idempotente | Anular pago |
| --- | --- | --- | --- | --- |
| Director Académico | Sí, según estados | Sí | Sí | Sí, según matrícula/estado/motivo/versión |
| Coordinador Académico | Sí, según estados | Sí | Sí | No |
| Admin Sistema sin rol financiero académico | No | No | No | No |
| Anónimo/token inválido/expirado, usuario/rol inactivo, solo roles técnicos | No | No | No | No |

Reutilizar app_users/app_roles/app_user_roles y auth.uid(); multirol suma capacidades activas, no claims o actor enviados. Acceso académico financiero institucional, sin restringir arbitrariamente recuperación al creador del pago: ambos roles autorizados recuperan una operación si pueden consultar esa matrícula/pago. La clave no concede acceso.

RLS SELECT en pago y pago_aplicacion según estos roles/objeto; sin grants cliente INSERT/UPDATE/DELETE/TRUNCATE. Revocar EXECUTE PUBLIC/anon de comandos; authenticated solo habilita la llamada, cada cuerpo verifica rol vigente. Owner confiable, search_path vacío, nombres calificados, whitelist/tipos y consultas parametrizadas sin SQL dinámico. Vista/proyección de saldo con autorización efectiva, no bypass por owner. Admin puede conservar lectura de eventos mínimos de auditoría H2; eso no abre tablas financieras.

## DES-H4-003 — Ecuación única de deuda

Para matrícula M: base exigible = suma de importe_final de sus matricula_cargo activos. Abonado = suma de pago_aplicacion.importe correspondientes a esos cargos y cuyo pago esté CONFIRMADO. Pendiente = base − abonado. Por cargo activo se calcula importe_final − aplicado vigente; suma de pendientes por cargo concilia con matrícula. Pagos ANULADO se excluyen del abonado, no del historial.

Cargos retirados sin pagos no generan deuda. No filtrar pagos confirmados de un cargo activo por vigencia actual del catálogo/tarifa/medio. Nunca recalcular importes desde tarifa/ciclo_tarifa actuales, trasladar abonos a otro UUID o truncar un negativo a cero. No tabla deuda, saldo persistido ni bandera PAGADO independiente. CERRADO conserva deuda pendiente; ANULADO de matrícula no la borra: queda resumen de solo consulta conforme a la misma ecuación.

La carga inicial H4 calcula desde cargos H3 ya existentes, sin inventar pagos de apertura ni saldos manuales. Un traslado de matrícula sin pagos conserva H3; cuando ya existe una fila pago, aunque anulada, el traslado se prohíbe, por lo que no hay reparto de pagos entre Ciclos. C-H4-001 RESUELTA: tras anular todos los pagos y no quedar aplicaciones vigentes, el cargo puede retirarse conforme a H3 y sale de base; pago/aplicaciones históricos se conservan, sin abonado perdido.

## DES-H4-004 — Modelo definitivo de aplicación por cargo

Base H3 conservada: matrícula UUID, alumno/ciclo, patrocinador nullable, ACTIVO/ANULADO, snapshot/código históricos y updated_at; cargos UUID con matrícula/origen ciclo_tarifa, tipo técnico CARRERA/OTRO, original/descuento/final numeric(12,2), activo/motivo. Retirar/reagregar en H3 no reutiliza UUID.

Nueva entidad propuesta **pago**:

| Campo | Regla |
| --- | --- |
| id UUID | DB; identidad, no número de comprobante legal |
| matricula_id FK | Una única matrícula existente |
| idempotency_key UUID UNIQUE global | Frontend genera opaco, oculto/no editable, permanente en pago, sin TTL/reutilización |
| importe numeric(12,2) | >0, igual a suma de aplicaciones, backend calcula/valida |
| medio_pago_id FK | catalogo_valor correcto/activo al registrar |
| medio_codigo / medio_etiqueta | Copia histórica mínima de catálogo resuelta DB, no input confiable |
| observaciones | Texto plano opcional ≤500, trim, vacío→NULL, preserva caso |
| estado_codigo | CONFIRMADO inicial; solo transición a ANULADO |
| created_at / registrado_por | Única fecha/hora del pago y actor de registro, DB e inmutables |
| updated_at | Versión optimista DB, cambia al anular |
| motivo_anulacion / anulado_por / anulado_at | Requeridos conjuntamente si ANULADO; motivo no vacío ≤500, actor/timestamp DB |

Sin fecha_operacion manual, concepto libre, saldo, divisa seleccionable, responsable de deuda, referencia bancaria exigida ni payload genérico. PEN es constante del dominio; no tabla de monedas. Datos de anulación ausentes en CONFIRMADO y consistentes en ANULADO. Campos de registro/importe/medio/notas/matrícula/clave no se editan ni siquiera para corregir; corrección = anular y nuevo registro.

**pago_aplicacion** es necesaria: UUID de relación según patrón H3, pago_id FK, matricula_cargo_id FK e importe numeric(12,2)>0, UNIQUE(pago_id,cargo). Cada cargo debe pertenecer a la matrícula del pago y estar activo al alta; suma de aplicaciones igual a pago y ninguna supera pendiente individual. FKs aisladas no validan propiedad o sumas: comando/constraints concretos deben cerrar esas invariantes en transacción. Registros inmutables: no DELETE, no cambiar monto/cargo/pago ni marcar importes cero al anular.

Aplicación **vigente** significa pago padre CONFIRMADO; se deriva del estado del padre, sin otro flag mutable en aplicación. Anular conserva aplicaciones idénticas y el join de saldo deja de contarlas. No moverlas a cargo nuevo. Sin tabla deuda, comandos/reservas persistentes, ledger, event sourcing ni motor de reversos. Índices solo por clave UNIQUE, historial matrícula/created_at/id y vínculos cargo/pago/estado que necesiten consultas e invariantes.

## DES-H4-005 — Dinero exacto y límites

PEN, máximo dos decimales. Transportar valores como texto decimal, validar precisión antes de convertir; «100.000» se rechaza aunque equivalga numéricamente a 100.00. numeric(12,2) permite hasta 9999999999.99 por importe; rechazar overflow, NaN, infinito, cero/negativo y formatos inválidos. UI restringe ingreso a dos decimales, sin ser autoridad. Totales frontend mediante representación decimal exacta/unidades menores; no float para decidir cobro.

Backend obtiene pendientes de cargos activos, valida cada monto solicitado, suma y compara con importe del pago. Si total de Seleccionar todos excede cota de una operación, indicar que debe reducir importes/hacer operaciones separadas; no redondear, truncar o fraccionar automáticamente. Agregados de varios cargos usan numeric con capacidad suficiente, no se cambia silenciosamente el tipo H3. Ante impedimento técnico real reportar antes de cambiar compatibilidad.

Rechazar saldo/total previo/descuento/precios/actor/estado/fecha ingresados como autoridad. El total solicitado es solo comprobación: lo persistido concilia con suma validada DB. La solicitud contiene solo cargos positivos seleccionados; cero representa no seleccionado en UI y no genera fila aplicación.

## DES-H4-006 — Elegibilidad y estados concretos

Pago nuevo: matrícula ACTIVO, con o sin empresa_patrocinadora_id, y Ciclo PROGRAMADO/EN_CURSO/CERRADO. Denegar DESIERTO/ANULADO. CERRADO es académico, no liquidación financiera. Matrícula ANULADO: solo consulta, sin registrar/anular pagos o modificar cargos/descuentos/patrocinador/opciones/versión por comandos financieros.

Ciclo con cualquier fila pago registrada no puede pasar a DESIERTO ni ANULADO, aunque todos esos pagos estén ANULADO. No rebajar la restricción H3 adicional: un Ciclo con matrículas tampoco puede anularse por no tener pagos. Transiciones de estado y pago coordinan locks y reevaluación de existencia, no solo un precheck React.

Anular pago requiere Director, pago CONFIRMADO y matrícula ACTIVO. No se agrega una restricción no solicitada por estado del Ciclo al anular: matrícula ANULADO es el bloqueo explícito, se conservan las demás invariantes y locks. Recuperar por clave no es registrar otra vez: se devuelve el mismo pago con estado actual aunque luego cambió estado de matrícula/Ciclo, sujeto a permiso de lectura vigente.

## DES-H4-007 — Ajustes H3 estrictamente necesarios en construcción futura

| Ruta | Regla nueva acordada, además de H3 |
| --- | --- |
| Retirar/inactivar cargo | Denegar con aplicaciones vigentes, parcial o total; ninguna reasignación/UUID sustituto. Sin aplicaciones vigentes, incluido tras anular todos sus pagos, permitir conforme a H3; conservar historia (C-H4-001 RESUELTA) |
| Descuento sobre CARRERA | Solo Director y original − nuevo descuento ≥ aplicado vigente al cargo; igualdad válida, por debajo rechazar |
| Trasladar matrícula a otro Ciclo | Denegar si existe al menos un pago, incluido ANULADO; no transferir aplicaciones ni crear destino para eludir bloqueo |
| Cambiar patrocinador | Permitido agregar/cambiar/quitar con pagos, conforme a elegibilidad/rol/versiones H3; no altera cargos ni pagos y no reparte deuda |
| Anular matrícula ACTIVO | Conservar facultad H3 y motivo, sin borrar/revertir pagos. Al pasar a ANULADO, toda mutación posterior incluida anulación de pago queda bloqueada |
| Ciclo → DESIERTO/ANULADO | Denegar con pagos registrados; mantener prohibición H3 de ANULADO con matrículas |
| Tarifas/configuración/medios posteriores | No repricing de cargo/pago ni reescritura de representación histórica |
| Asignaturas CHG-H3-011 | Mantener confirmación Director y alcance exclusivamente académico; no genera ajuste monetario |

Proteger entradas directas/indirectas de editar_matricula, anular_matricula, cambio de estado y modificación de cargos, sin otorgar nuevos permisos a Coordinador. Matrícula ANULADO sigue inmutable. Si todos los pagos de un cargo se anulan, el aplicado vigente cae a cero y puede retirarse conforme a H3; no desaparecen las aplicaciones históricas ni la fila pago que sigue bloqueando traslado/estado de Ciclo. Reagregar después crea un cargo con UUID nuevo conforme a H3; no reactiva el cargo retirado ni transfiere aplicaciones históricas al nuevo. No añadir contabilidad, devoluciones o reparación automática para esa diferencia.

Esta fase no modifica funciones/guards H3: documenta la futura adaptación autorizada mínima por H4, bajo protocolo común y regresión. Las garantías financieras no pueden eludirse mediante un camino H3 que continúe fuera del lock.

## DES-H4-008 — Fecha única, observaciones y concepto

created_at es el único timestamp de registro/fecha del pago, generado PostgreSQL e inmutable; presentar hora local America/Lima sin guardar una fecha manual duplicada. No retrofechas/fechas futuras introducidas ni sustitución por timestamp del navegador. anulado_at es otro evento DB, no nueva fecha del pago.

Observaciones opcionales ≤500 caracteres, trim y vacío→NULL, preservar caso y admitir texto ordinario/tildes/apóstrofos; mostrar escapado como texto, no HTML ejecutable. Informativas: no estados, conceptos o reglas inferidos de su contenido. No editar después del registro. Motivo de anulación separado, obligatorio, ≤500 y sin datos personales innecesarios.

El concepto se muestra a partir de nombres/códigos históricos de matricula_cargo mediante pago_aplicacion. No concepto libre/catálogo nuevo/cargo por teclear notas. Si un pago tiene varios cargos, se muestran sus aplicaciones; no colapsarlos en un texto que pierda trazabilidad.

## DES-H4-009 — Catálogo y representación histórica

Reutilizar catalogo/catalogo_valor: categoría técnica MEDIO_PAGO, con códigos EFECTIVO, YAPE, PLIN, TRANSFERENCIA_BANCARIA y TARJETA; etiquetas Efectivo, Yape, Plin, Transferencia bancaria y Tarjeta. Son identificadores técnicos de las cinco opciones autorizadas, no nuevos medios ni integración. Carga inicial versionada siguiendo patrones H3, sin mantenimiento específico H4.

Registrar valida ID, catálogo exacto y activo; resuelve código/etiqueta históricos DB. Inactivar/renombrar después no altera pagos confirmados/anulados ni impide recuperar la misma operación. No se permite tomar etiqueta arbitraria del cliente. Historial usa la representación conservada. Mantenimiento genérico queda fuera hasta otra autorización; sin referencia bancaria obligatoria no solicitada ni archivos de comprobante.

## DES-H4-010 — Dos comandos concretos

**registrar_pago(p)**: propuesta de whitelist matricula_id, idempotency_key, importe, medio_pago_id, observaciones opcionales, aplicaciones (cargo_id/importe) y expected_matricula_updated_at. Aplicaciones manuales son solicitud, no autoridad. Sin fecha_operacion, concepto, actor, estado, saldo, descuento, precios o empresa responsable enviados para mandar sobre DB.

Flujo: autorizar y validar estructura/decimales → locks de DES-H4-013 y relectura de matrícula → localizar clave → si existe, comparar contenido semántico y recuperar sin escritura → si nueva, validar versión/estado/medio, cargos activos/propiedad y pendientes → comprobar suma exacta y límites → crear pago CONFIRMADO y aplicaciones → avanzar versión del agregado → evento mínimo → commit. Sin llamar proveedores ni encadenar escrituras React.

Respuesta: identidad/estado del mismo pago, importe/medio histórico/notas/timestamp de registro autorizados, aplicaciones/conceptos derivados, datos de anulación si corresponde y resumen actual derivado/nueva versión. El resumen actual puede cambiar después; recuperar el mismo pago no significa congelar el saldo de toda la matrícula como segunda verdad.

**anular_pago(id, expected_updated_at, motivo)**: solo Director, pago CONFIRMADO y matrícula ACTIVO; bajo locks verifica versión y estado. Cambia exclusivamente estado/datos mínimos de anulación y versión del pago; avanza versión del agregado, conserva registro/importe/medio/notas/timestamp original/aplicaciones. Guarda evento mínimo, actor/fecha DB y commit atómico. Nuevo saldo excluye esas aplicaciones por estado padre. Repetir no vuelve a liberar saldo: devolver rechazo seguro de ya ANULADO o conflicto de versión, sin segundo evento. No idempotency key adicional ni tabla de comandos.

Si registro incorrecto, la persona anula y prepara un nuevo pago con nueva clave. No se modifica el pago anterior ni se interpreta mismo UUID como corrección. En matrícula ANULADO, también anular_pago queda bloqueado. No DELETE físico ni actualización de aplicaciones para fingir reverso.

## DES-H4-011 — Idempotencia del registro

UUID opaco generado por frontend al preparar un intento, oculto/no editable; UNIQUE global asociado permanentemente al pago. Sin TTL, reciclado ni tabla de comandos. No incorpora PII, fecha, monto u otros datos de negocio. Doble clic/reenvío/recuperación de la misma operación conservan UUID. Otro pago posterior confirmado o una corrección tras anular recibe otro UUID.

Contenido semántico: matrícula, importe, medio_pago_id, observaciones normalizadas (trim/vacío→NULL, preservando caso) y aplicaciones normalizadas por cargo UUID y decimal. Rechazar cargos duplicados, no sumar entradas repetidas silenciosamente; el orden de la lista no cambia semántica. «10», «10.0» y «10.00» equivalen tras validar máximo dos decimales; «10.000» se rechaza antes. Sin hash confiado al cliente ni payload arbitrario duplicado.

No comparar actor/timestamps DB, versión de transporte ni etiquetas históricas derivadas como si fueran inputs de negocio. Ambos roles autorizados pueden recuperar por clave y contenido semántico. Misma clave/mismo contenido: mismo pago_id y datos originales con estado actual; si está ANULADO, se informa, no se reactiva/recrea ni reaplica. Distinto contenido: conflicto y rechazo sin mutación, nueva clave automática o filtración ajena.

Resolver existente antes de validar versión/estado/vigencia para un alta nueva: un replay no falla solo porque el pago avanzó versión, el medio fue inactivado o matrícula/Ciclo cambió después. Revalidar primero autorización de lectura actual. Replay no cambia versiones, aplicaciones ni crea otro evento de registro. La clave UNIQUE está ligada al pago incluso anulado y no se libera al anularlo.

## DES-H4-012 — Recuperación y continuidad mínima

Estados UX: borrador, enviando, confirmado, rechazo inequívoco, resultado desconocido. Timeout no significa rechazo/rollback. No generar otra clave ni repetir cobro automáticamente. Consultar pago por clave bajo RLS y, si existe, mostrarlo con su estado actual y resumen; una lectura vacía puede ser transacción aún en curso, no prueba de fracaso.

Continuidad propuesta: mantener solo UUID opaco y referencia mínima matrícula/ámbito de usuario en sessionStorage de la pestaña, no importe/aplicaciones/notas, documento, snapshot, credenciales o payload financiero. Restaurar identidad pendiente tras recarga y buscar en DB antes de permitir nueva alta. La UI nunca muestra/edita la clave. Aislar por identidad y no exponer un pendiente de otro actor; conocer clave no evita autorización DB. Al cambiar sesión se vacían datos de UI y se ignoran respuestas tardías; referencias opacas no se usan para rellenar datos financieros sin nueva lectura autorizada.

Un reenvío consciente de un resultado desconocido mantiene clave y contenido semántico; si el borrador se perdió, recuperar primero de DB y no inventar aplicaciones para reconstruirlo. Si no hay fila visible, seguir resolución explícita con la misma identidad; nunca marcar rollback por mera ausencia temporal. La solución no promete portabilidad automática entre dispositivos ni añade un registro servidor de comandos pendientes; la clave permanente está en el pago confirmado. No guardar un borrador financiero persistente para resolver esa carencia.

Anulación incierta es distinta: consultar pago por id, estado/anulado_por/anulado_at y versión para determinar resultado real; no usar otra clave de registro ni anular dos veces automáticamente. Mostrar quién/qué ocurrió en lugar de atribuir al intento actual una anulación ajena. No nueva RPC de escritura de recuperación: lecturas RLS sobre las mismas entidades.

## DES-H4-013 — Locks, versiones y cruces

Mantener SERIALIZABLE y disciplina H3: Ciclo(s) por UUID ascendente → Alumno → Matrícula estable → cargos por UUID ascendente → pagos/aplicaciones relevantes en orden estable. Identificar padres con lecturas preliminares, luego releer bajo locks y comprobar Ciclo/alumno/versión; si cambió contexto, conflicto sin escrituras. No bloquear primero pago/matrícula y después invertir el orden esperando un Ciclo que ya retiene editar_matricula.

Matrícula serializa cambios de pendiente y pagos por claves diferentes. UNIQUE cierra claves iguales, no reemplaza ese lock. La anulación y editores H3 económicos siguen el mismo protocolo; cambio de estado de Ciclo se coordina con pagos antes de comprobar existencia/eligibilidad. Un pago nuevo que compite con DESIERTO/ANULADO no puede quedar en un estado final prohibido. No pagos de varias matrículas en un comando.

Nueva operación valida versión de borrador y recalcula saldo protegido. Registro/anulación avanzan updated_at de matrícula; anulación también la versión del pago. Replay confirmado se resuelve antes del chequeo de versión de un alta nueva y no vuelve a avanzar versiones. No refrescar expected_updated_at y reenviar automáticamente. Tras espera con snapshot viejo, SERIALIZABLE puede abortar: no continuar calculando saldo viejo; explicar 40001/40P01 y exigir acción explícita.

Prueba obligatoria 100 con 70 y 60, dos conexiones/barrera/claves distintas: un pago gana por importe solicitado y el otro recibe exceso/conflicto, nunca 130, ni convertir 60 a 30/70 a 40 automáticamente. Probar anular pago frente a nuevo pago y descuento, retirada/traslado frente a registro, transición de Ciclo y anulación de matrícula. Un cargo abonado parcialmente se bloquea igual que uno totalmente abonado.

## DES-H4-014 — Rollback y transición única

Registro: pago, aplicaciones, versión y evento juntos. Anulación: estado/datos de anulación, versiones y evento juntos. Fallo en cualquier etapa revierte el intento por completo; no aplicaciones activadas a medias, reservas de clave huérfanas o éxitos de auditoría sin negocio. Si todo se revierte, no hay pago asociado y el mismo intento puede resolverse explícitamente; sin reutilizar una clave ya asociada a un pago.

Pago CONFIRMADO→ANULADO es transición única, no un comando genérico de reversos. Dos anulaciones concurrentes no liberan dos veces saldo ni producen dos eventos. Si ya ANULADO, no nueva mutación; si matrícula ANULADO, rechazo aunque el actor sea Director. Mismo registro idempotente después de anular devuelve la fila ANULADO, nunca crea un pago de reemplazo.

Inyectar fallos únicamente en base desechable/harness controlado, sin endpoints públicos ni manipulación de base humana. Distinguir antes de commit (rollback comprobado) y después de commit (respuesta perdida, operación íntegra recuperable). Cleanup restaura controles incluso si falla el escenario y no confunde borrar usuarios con retirar entidades financieras de ensayo.

## DES-H4-015 — Auditoría mínima definida

Reutilizar public.auditoria append-only. Dos eventos: PAGO_REGISTRADO y PAGO_ANULADO (nombres técnicos propuestos). Registro_id = pago_id; contexto mínimo matricula_id, usuario/actor y timestamp DB; motivo solo en anulación. No duplicar importe, medio, observaciones, aplicaciones, ficha/snapshot ni payload financiero completo. Detalle se consulta en pago/aplicación con permisos financieros, no se incorpora a old_values/new_values por trigger genérico.

Conservar lectores técnicos de auditoría H2 sin concederles acceso financiero por eso. Anulación justificada puede verse como evento mínimo, no revela detalle económico del pago a Admin. Mensaje/UI de motivo indica no incluir datos personales innecesarios. No logs de rutina con clave/payload/notas/montos ni copia de eventos de éxito para reenvíos. Fallo del evento revierte operación, no cola ni auditoría asíncrona.

## DES-H4-016 — Consulta e historial

Una proyección DB de solo lectura en snapshot consistente calcula base/abonado/pendiente y pendientes por cargo. Sin materialización ni sumas React sobre páginas parciales. RLS de pago/aplicación y proyección deben concordar: si un actor no puede ver todo el perímetro financiero, denegar el resumen completo, no devolver saldo engañoso con algunos pagos ocultos. Vista con invocador/controles efectivos, no owner que eluda RLS; cualquier lectura adicional debe justificarse sin API genérica.

Historial paginado estable por created_at + id, sin fecha manual, incluye estado/importe/medio histórico/conceptos derivados/observaciones autorizadas y anulación. Aplicaciones anuladas se conservan, marcadas por estado del pago; no abonan, pero no desaparecen. El total del resumen no depende de la página visible. Consulta por clave/UUID con mismos permisos, no llave pública de recuperación.

Patrocinador no cambia atribución de pago; matrícula anulada muestra toda historia y saldo de solo consulta. Con pagos registrados no existe traslado de Ciclo, por lo que no se reparte abonado entre origen/destino. Traslados H3 previos a cualquier pago conservan cargos antiguos inactivos fuera de base y cargos activos actuales como origen del nuevo pago.

## DES-H4-017 — Imputación manual en UI

Desde ficha de matrícula, sección Pagos coherente con estándar H3: resumen y una grilla de historial, acción Registrar pago; no módulo separado de deuda ni Stepper. Formulario/sección con grilla de cargos pendientes: check, concepto histórico, pendiente, importe a aplicar. Marcar check propone pendiente íntegro; reducir permite parcial; importe positivo selecciona; desmarcar fija cero. Seleccionar todos propone pendientes completos de todos y luego permite reducir cada uno. Total a pagar suma exacta de aplicaciones.

No FIFO/proporcionalidad/obligatorio primero ni reparto automático, tampoco «aplicar restante» no autorizado. Cero es deseleccionado y no se envía aplicación; sin selección/total cero no confirmar. Medio obligatorio entre cinco opciones activas; notas opcionales; fecha no editable y concepto no libre. Antes de confirmar: matrícula/Ciclo/alumno identificables sin snapshot completo, aplicaciones y total, saldo de referencia. Backend decide pendientes vigentes y total final.

Pago confirmado solo consulta. Solo Director ve Anular con diálogo breve de motivo; matrícula ANULADO sin acciones mutantes. Corrección explicada como anular y nuevo pago, no Editar. Durante envío no doble clic; conflicto conserva borrador/clave apropiados y resultado desconocido ofrece resolver. Historial/importe/cargos alineados a derecha, acciones/tooltip accesibles y navegación contextual. Teclado, foco/primer error, móvil, cuatro temas y forced-colors real separados de DOM; el residual de H3 no verifica H4.

## DES-H4-018 — Contratos de error y seguridad

Familias propuestas: VALIDACION/PRECISION, SALDO_INSUFICIENTE (global o cargo), NO_AUTORIZADO, NO_ELEGIBLE, CONFLICTO_VERSION, CONFLICTO_IDEMPOTENCIA, YA_ANULADO y RESULTADO_DESCONOCIDO de transporte. Mensajes concretos sin SQL ni detalle financiero ajeno. Campos desconocidos se rechazan, incluyendo fecha_operacion/concepto libre/actor/estado. No deserializar texto de observaciones como HTML ni SQL.

Fecha/actor/estado/anulación provienen de DB. Pago mayor al saldo o aplicación ajena no se subsana automáticamente en backend. Anulación solo motivo/id/versión, sin importes ni clave de registro. Revocar permiso o cambiar identidad invalida lecturas/acciones y descarta respuestas tardías; nunca exposición por consultar una clave conocida. Sin secretos/PII/payload en URL o almacenamiento persistente del borrador.

## DES-H4-019 — Validación progresiva futura

Tras Gate 1, validar modelo/constraints/decimales/roles, medios y representación, registro/manual/idempotencia, anulación/rollback, H3 adaptado y concurrencia, consultas/recuperación/UI y regresión. JWT ordinario prueba autorización; admin solo prepara/observa con datos sintéticos. No reset ni suites con residuos sobre base humana: CI/base desechable o pruebas acotadas con rollback íntegro verificado.

Los casos nuevos cubren ambas RPC y todas las decisiones, incluido CERRADO elegible, DESIERTO/ANULADO de Ciclo bloqueados con pagos, anulación/pagos históricos, patrocinador mutable y límites de descuento exactos. Todos los TEST de este Spec siguen NO EJECUTADOS. No inferir evidencia H4 de CI H3 o de verificaciones documentales.

## DES-H4-020 — Inventario y criterios

Base H3 aceptada: 22 tablas públicas, 17 RPC, 16 helpers, 25 policies SELECT y 15 migraciones. Diseño H4 añade solo pago y pago_aplicacion, dos RPC concretas registrar/anular y lectura derivada de saldo; catálogo genérico existente y policies/grants mínimos sobre las dos tablas. Una vista no se cuenta como tabla persistida. Todo helper/trigger futuro debe justificarse por invariantes o proyección concreta; preferir reutilizar/adaptar guards/auditoría existentes, no abstracciones preventivas ni inventario fijo ficticio de funciones antes de construir.

| Criterio aplicado | Decisión concreta |
| --- | --- |
| AWS Seguridad / OWASP autorización y mínimo privilegio | Roles DB, RLS/grants y comandos explícitos, sin actor arbitrario ni exposición financiera al Admin |
| AWS Fiabilidad | Atomicidad, locks ordenados, UNIQUE, versiones, transición única y recuperación sin duplicar |
| AWS Rendimiento | Índices de relaciones/clave/historial y agregación DB; sin reconstrucción cliente o saldo materializado |
| AWS Costos | Supabase/PostgreSQL existentes, sin proveedores, servicios o infraestructura adicional |
| AWS Excelencia Operacional / OWASP Secure SDLC | Trazabilidad y pruebas progresivas/negativas/concurrentes, errores seguros y CI desechable |
| OWASP validación/inyección/auditoría | Whitelist/tipos, dinero exacto, sin SQL dinámico, texto escapado y eventos mínimos atómicos |

Son criterios de diseño aplicados, no certificación. No ledger, deuda persistida, outbox, CQRS/event sourcing, motor de reversos, colas, Edge Function o API oculta. Si aparece necesidad de expansión para cumplir este mínimo, detenerse y reportar antes de añadirla.

Las 17 OQ y C-H4-001 están RESUELTAS por decisión humana; no quedan contradicciones de negocio identificadas en esta revisión. Revisar cuatro documentos exactos, luego solicitar Gate 1 sin concederlo. Construcción y futura aceptación/Gate 2 requieren instrucciones independientes. Sin implementación/acceptance/merge ahora y sin H5.
