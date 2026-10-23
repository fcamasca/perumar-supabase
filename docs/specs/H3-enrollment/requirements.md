# H3 — Alumno y Matrícula: requirements

Versión 0.2 · 22/10/2026 (America/Lima).

**SPEC ELABORADO. PENDIENTE DE REVISIÓN HUMANA Y GATE 1. CONSTRUCCIÓN NO AUTORIZADA.**

## Base y precedencia

Main y origin/main verificados tras fetch: `bcbff1438d572de959535a7ffccab435ffc8e47e`. Working tree limpio antes de crear `feature/h3-enrollment-spec`. H2 cerrado mediante merge bcbff14, cierre 993d91b y candidato aceptado 796a47a. Referencias: [PLAN](../../PLAN_MVP.md), [aceptación H2](../H2-academic/acceptance.md), [diseño H2](../H2-academic/design.md), [diseño H1](../H1-security/design.md). Los estados históricos de los Specs no sustituyen sus registros posteriores de aprobación/cierre.

La solicitud humana H3 del 22/10/2026 concreta el alcance preliminar «Alumno mínimo» del PLAN: ficha completa, contactos, tarifas y patrocinador mínimo. Ante diferencias con las HU originales prevalecen decisiones expresas H1/H2 y esta solicitud. No autoriza construcción.

## REQ-H3-001 — Gobernanza y arquitectura

Solo cuatro documentos Spec, EVOLUCIONES y estado PLAN. Sin implementación, migraciones, cambios React, acceptance ni aprobación automática. Arquitectura proporcional: React + Supabase/PostgreSQL + RLS + constraints + RPC concretas. Sin API propia, WebFlux, DynamoDB, microservicios, CQRS, bus ni capas preventivas. Revisión humana de operación localizada, entendible, testeable, transaccional, segura y mantenible.

## REQ-H3-002 — Roles y seguridad

Director y Coordinador crean/consultan/editan alumnos y contactos, buscan/crean/editan empresa patrocinadora mínima, registran/editan matrículas ACTIVO cuyo Ciclo no sea terminal y anulan con motivo incluso si su Ciclo es terminal. Solo Director aplica descuentos y mantiene tarifas/asociaciones con Ciclo. ADMIN_SISTEMA no tiene permisos académicos implícitos. Autoridad servidor vigente, nunca visibilidad UI ni metadata cliente. Multirol suma solo capacidades activas asignadas explícitamente.

## REQ-H3-003 — Ficha independiente

Obligatorios: apellido paterno, apellido materno, nombres, tipo DI, número DI, fecha nacimiento, sexo, celular, Departamento/Provincia/Distrito nacimiento, domicilio y Departamento/Provincia/Distrito domicilio. Opcionales: fijo, email, grupo sanguíneo, instrucción, ojos, cabello, estatura, peso, señas, ocupación, estado civil y N°/Mz Lt. Edad calculada, no persistida. Catálogos simples TIPO_DI, SEXO, ESTADO_CIVIL y GRUPO_SANGUINEO; TIPO_DI inicia con DNI/CARNET_EXTRANJERIA. Instrucción, ojos, cabello y parentesco son texto simple, sin mantenimiento genérico. DNI texto trim de exactamente 8 dígitos; CE texto trim/uppercase alfanumérico de máximo técnico 30, sin checksum ni longitud legal adicional. Estatura en centímetros, peso en kilogramos, positivos si presentes sin rangos clínicos. Mantener cotas técnicas DES-003 y UBIGEO H2. Ficha mantenible sin matrícula.

## REQ-H3-004 — Identidad y ficha incompleta

Unicidad DB de tipo_di + numero_di normalizado, incluida concurrencia; no unicidad global solo por número. Buscar alumno devuelve todos sus datos autorizados disponibles. Ficha histórica incompleta permite completar/editar y exige obligatorios al guardar; no ocultarla ni duplicarla. Alumno puede tener múltiples matrículas en distintos Ciclos; consultas operativas usan ficha vigente por alumno_id.

## REQ-H3-005 — Emergencia

Entidad separada alumno_contacto_emergencia, uno a muchos por alumno; apellido, nombre, parentesco texto y celular obligatorios, dirección opcional. Retiro lógico a INACTIVO, no DELETE ni contacto principal. Al registrar matrícula debe existir al menos un contacto activo válido. No columnas de contacto en alumno ni pertenencia a matrícula.

## REQ-H3-006 — Snapshot y PII

Matrícula guarda alumno_id y alumno_snapshot JSONB histórico inmutable con ficha relevante y todos los contactos activos/válidos existentes al inscribir; excluir contactos inactivos del nuevo snapshot. Cambios posteriores de alumno, contactos o matrícula no reescriben esa fotografía. No copiar toda la ficha ni snapshot en auditoría/logs. Lectura histórica y vigente distinguibles, exposición mínima.

## REQ-H3-007 — Empresa mínima

Entidad independiente: RUC y razón social obligatorios; persona contacto, teléfono/celular y email opcionales. RUC texto trim de exactamente 11 dígitos, UNIQUE, nunca número. Director y Coordinador buscan/crean/editan empresa mínima. Una empresa puede patrocinar varias matrículas; matrícula admite cero o una. No relación fija empresa-alumno. Sin SUNAT, facturas/pagos/deuda ni H7 completo.

## REQ-H3-008 — Tarifas

Catálogo independiente: UUID, código, nombre, descripción, tipo CARRERA/OTRO, monto_por_defecto numeric(12,2), activo, timestamps/concurrencia. Permitir 0.00, no negativos ni precisión superior a dos decimales mediante redondeo silencioso. Solo Director mantiene. No borrar tarifas usadas. Default solo ayuda inicial; no asociación automática con Carrera. Capitanía/Refrigerio/Actividades son conceptos por código/nombre, no tipos nuevos.

## REQ-H3-009 — Configuración por Ciclo

Relación ciclo_tarifa con Ciclo, tarifa, importe numeric(12,2) no negativo (0.00 permitido), obligatorio/opcional y activo. Selección manual por Director; propone default y admite override sin modificar catálogo. Para matricular exactamente una tarifa activa de tipo CARRERA marcada obligatoria; otras obligatorias se incluyen y opcionales se eligen por alumno. Misma Carrera puede tener Ciclos de S/650 y S/700. Mantenimiento ciclo_tarifa solo PROGRAMADO/EN_CURSO; terminales CERRADO/DESIERTO/ANULADO solo consulta. Sin redondeo silencioso ni asociación automática con Carrera.

## REQ-H3-010 — Registro y cargos

Matrícula mediante comando único transaccional DB: autorizar, validar, reobtener tarifas activas del Ciclo, incluir obligatorias, validar opcionales elegidas, recalcular importes y guardar matrícula/cargos/snapshot/auditoría juntos. React no coordina esas escrituras ni decide montos, permisos o estados. Fallo en cualquier parte revierte toda matrícula. matricula_cargo tiene UUID estable, estado/vigencia y datos históricos de concepto, importe original, descuento separado/motivo y final. No DELETE ni replaced_by, árbol de versiones o event sourcing. Cambios de tarifa/default/ciclo_tarifa no alteran cargos existentes. Preparar referencias estables para H4 sin pagos.

## REQ-H3-011 — Ciclo y compatibilidad H2

Registrar o cambiar a Ciclo solo PROGRAMADO/EN_CURSO; bloquear CERRADO/DESIERTO/ANULADO en servidor. Si existe al menos una matrícula ACTIVO, no cambiar Carrera del Ciclo; conservar edición ordinaria limitada a Director y promoción/fechas. Si solo hay matrículas ANULADO, permitir cambiar Carrera respetando reglas H2, sin reescribir historia/códigos de esas matrículas. Revisar rutas indirectas H2 de Carrera, sigla y sincronización para no evadir esa protección. Conservar la regla H2 de no ANULAR un Ciclo con matrículas: no confundirla con el criterio de matrículas activas que limita cambio de Carrera. Matrícula ACTIVO cuyo Ciclo pasó a terminal pierde edición ordinaria de Ciclo/patrocinador/opciones/código/descuento, pero ambos roles pueden ANULARLA con motivo. Sin cascadas automáticas.

## REQ-H3-012 — Duplicado

No más de una matrícula alumno+ciclo mediante UNIQUE DB, también concurrente y al cambiar Ciclo. Incluye anuladas: anular no habilita rematrícula en el mismo par durante H3.

## REQ-H3-013 — Código

PK UUID y código automático AÑO-SIGLA_CARRERA-CORRELATIVO, año DB de inscripción America/Lima; correlativo por año+sigla, reinicio anual y generación concurrente servidor, MPC/BZ independientes. Ambos roles editan código solo matrícula ACTIVO y Ciclo no terminal. Manual trim/uppercase UNIQUE con formato YYYY-SIGLA-CORRELATIVO, correlativo mínimo 3 dígitos y crecimiento >999, sin límite arbitrario 50. Conservar codigo_generado_original, año/sigla/correlativo usados y código visible. No regenerar automáticamente por cambio de Ciclo, Carrera o sigla. Override consume contador, sin gapless. Auditar cada cambio manual. Independiente del correlativo/código Ciclo H2.

## REQ-H3-014 — Descuento

Solo Director aplica descuento en soles al cargo CARRERA, original separado, 0 ≤ descuento ≤ original, final=original-descuento, motivo obligatorio si >0. Coordinador no aplica/modifica descuento vigente mediante request. Al cambiar Ciclo, el cargo anterior conserva descuento/motivo/importes históricos y queda INACTIVO; el nuevo cargo CARRERA inicia descuento=0 por regla servidor, no por decisión del Coordinador. No trasladar descuento previo ni aceptar uno nuevo de Coordinador; solo Director puede aplicarlo nuevamente al nuevo cargo. Auditar importes, motivo, actor y operación sin PII ajena.

## REQ-H3-015 — Edición activa

Director/Coordinador cambian Ciclo, patrocinador y opciones solo matrícula ACTIVO con Ciclo actual no terminal; Director además descuento. Cambio Ciclo valida destino elegible/par: todos los cargos vigentes anteriores quedan INACTIVOS con motivo CAMBIO_CICLO, sin DELETE ni cambio de importes históricos; crea nuevos cargos con nuevos UUID desde tarifas obligatorias/opcionales destino y descuento CARRERA inicial cero, sin traslado previo. Solo Director puede aplicar nuevo descuento. Cambio de opciones en mismo Ciclo: retiro inactiva cargo con motivo conservando importes; agregar/reagregar crea UUID nuevo con precio vigente servidor. Cargos retenidos conservan importe original, sin repricing. Patrocinador no toca cargos. Todo atómico/auditado. Sin replaced_by/árboles/event sourcing ni reglas financieras inexistentes; antes de H4 revisar cambios libres.

## REQ-H3-016 — Anulación

Alta ACTIVO. Ambos roles anulan con motivo obligatorio incluso si Ciclo actual es terminal; ANULADO terminal y consulta, sin reactivar, editar ni borrar registros/cargos/snapshot. Auditar motivo y actor, sin cascada automática desde estado Ciclo.

## REQ-H3-017 — Auditoría

Reutilizar public.auditoria append-only H2. Registrar altas/ediciones de alumno, contactos, empresa, tarifa/estado, asociación Ciclo, matrícula, cambio de Ciclo/empresa/opciones/código, descuento y anulación. Actor/fecha DB, evento y mutación atómicos; no secretos ni duplicación de ficha personal.

## REQ-H3-018 — Concurrencia

Expected updated_at servidor donde aplica, conflicto explícito y sin retry silencioso. Probar documento/par duplicados, correlativo, edición, creación transaccional y cambios concurrentes de referencias. No mecanismos adicionales sin necesidad demostrada.

## REQ-H3-019 — UI y accesibilidad

Nuevo Alumno Stepper: Identificación, Domicilio, Información adicional, Contacto emergencia, Revisar; Anterior/Siguiente/Guardar, sin avanzar con errores obligatorios del paso. Alumno existente Tabs: Resumen, Datos personales, Domicilio, Información adicional, Contactos, Matrículas (historial). Registrar matrícula Stepper: Ciclo, Alumno, Patrocinador, Tarifas, Confirmación. Alumno existente muestra resumen, incompleto permite completar, nuevo abre alta y retorna. Conservar Ciclo para siguiente alumno; confirmar con «Matricular otro alumno en este Ciclo» y «Ver matrícula». Modales solo acciones breves, no ficha completa. Identidad H2 y Sistema/Claro/Oscuro/Alto contraste, forced-colors prioritario, teclado, errores inline/foco primero, estados con texto, modales propios sin window.alert/confirm/prompt.

## REQ-H3-020 — Evidencia y gates

Trazabilidad completa entre los cuatro documentos; pruebas automatizadas, integración local, seguridad/RLS, concurrencia, humanas y Gate 2 diferenciadas. Revisar aislamiento, permisos, validación, parameter tampering, PII, outputs y secretos según OWASP Secure SDLC y cinco pilares Well-Architected aplicables. CI no concede aprobación humana. Si RPC exige capas/helpers excesivos, registrar riesgo para decisión humana, no construir API oculta.

## Decisiones cerradas antes de Gate 1

OQ-H3-001 a OQ-H3-008: **RESUELTAS POR DECISIÓN HUMANA** en la solicitud de actualización del Spec base `96bd395487954f6fe1194c00b70487563a87ccfe`. No constituyen aprobación del Spec completo ni Gate 1.

| ID | Decisión cerrada | REQ / DES / TASK (mismo índice) | TEST afectados |
|---|---|---|---|
| OQ-H3-001 | Unicidad tipo+número; DNI 8 dígitos texto, CE alfanumérico uppercase ≤30; cuatro catálogos simples, instrucción/ojos/cabello/parentesco texto; N°/Mz Lt opcional, cm/kg sin rangos clínicos y cotas técnicas conservadas. | 003–005 | 004–008 |
| OQ-H3-002 | Ambos roles buscan/crean/editan empresa; RUC/razón social obligatorios, demás opcionales; RUC texto trim 11 dígitos UNIQUE, sin SUNAT/H7. | 002, 007 | 002, 012 |
| OQ-H3-003 | Retiro lógico INACTIVO, sin principal; snapshot incluye todos los activos/válidos y excluye inactivos, histórico inmutable. | 005–006 | 008–010 |
| OQ-H3-004 | Exactamente una CARRERA activa obligatoria; tipos CARRERA/OTRO; numeric(12,2) admite cero, sin negativos/redondeo; mantenimiento Ciclo solo PROGRAMADO/EN_CURSO. | 008–010 | 013–017 |
| OQ-H3-005 | Matrícula activa bloquea Carrera; solo anuladas permiten cambio bajo H2; historia/códigos intactos. Ciclo terminal bloquea edición ordinaria matrícula pero no anulación motivada; revisar rutas indirectas sin cascadas. | 011, 015–016 | 020–022, 027, 033–034 |
| OQ-H3-006 | Año America/Lima, contador año+sigla; manual por ambos roles solo ACTIVO/Ciclo no terminal con formato y unicidad; metadatos originales, sin regeneración automática/gapless, contador consumido con override. | 013 | 025–027 |
| OQ-H3-007 | Cambio Ciclo inactiva cargos anteriores CAMBIO_CICLO y crea nuevos desde servidor sin trasladar descuento; nuevo CARRERA inicia cero. Coordinador puede cambiar pero no enviar descuento nuevo; solo Director aplica nuevamente. | 014–015, 017 | 028–032, 035 |
| OQ-H3-008 | UUID/vigencia de cargo, no DELETE; retiro opcional conserva histórico y motivo; agregar/reagregar crea UUID/precio vigente, retenidos sin repricing; patrocinador no toca cargos. Sin árboles ni event sourcing. | 010, 015 | 017, 030–032 |

No quedan OQ abiertas de esta ronda. La revisión humana de Gate 1 permanece pendiente.

## Exclusiones

Pagos/medios, deuda/saldos, idempotencia financiera, facturación/pagos de patrocinadores, PDFs, documentos/Storage, plantillas documentarias, importación Excel, workflow de aprobación de descuentos, notificaciones, profesores, reportes analíticos, H7 completo. No adelantar H4/H5/H6/H7. EVOL-001/002 solo en [EVOLUCIONES](../../EVOLUCIONES.md).

## Trazabilidad

Cada índice 001–020 vincula REQ-H3-n → DES-H3-n → TASK-H3-n. El test-plan enumera explícitamente los TEST vinculados; tasks contiene la matriz de cobertura. Las ocho decisiones están incorporadas y coherenciadas; Gate 1 sigue pendiente de revisión humana.
