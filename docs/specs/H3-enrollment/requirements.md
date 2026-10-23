# H3 — Alumno y Matrícula: requirements

Versión 0.1 · 22/10/2026 (America/Lima).

**SPEC ELABORADO. PENDIENTE DE REVISIÓN HUMANA Y GATE 1. CONSTRUCCIÓN NO AUTORIZADA.**

## Base y precedencia

Main y origin/main verificados tras fetch: `bcbff1438d572de959535a7ffccab435ffc8e47e`. Working tree limpio antes de crear `feature/h3-enrollment-spec`. H2 cerrado mediante merge bcbff14, cierre 993d91b y candidato aceptado 796a47a. Referencias: [PLAN](../../PLAN_MVP.md), [aceptación H2](../H2-academic/acceptance.md), [diseño H2](../H2-academic/design.md), [diseño H1](../H1-security/design.md). Los estados históricos de los Specs no sustituyen sus registros posteriores de aprobación/cierre.

La solicitud humana H3 del 22/10/2026 concreta el alcance preliminar «Alumno mínimo» del PLAN: ficha completa, contactos, tarifas y patrocinador mínimo. Ante diferencias con las HU originales prevalecen decisiones expresas H1/H2 y esta solicitud. No autoriza construcción.

## REQ-H3-001 — Gobernanza y arquitectura

Solo cuatro documentos Spec, EVOLUCIONES y estado PLAN. Sin implementación, migraciones, cambios React, acceptance ni aprobación automática. Arquitectura proporcional: React + Supabase/PostgreSQL + RLS + constraints + RPC concretas. Sin API propia, WebFlux, DynamoDB, microservicios, CQRS, bus ni capas preventivas. Revisión humana de operación localizada, entendible, testeable, transaccional, segura y mantenible.

## REQ-H3-002 — Roles y seguridad

Director y Coordinador crean/consultan/editan alumnos y contactos, registran/editan matrículas activas y anulan con motivo. Solo Director aplica descuentos y mantiene tarifas/asociaciones con Ciclo. ADMIN_SISTEMA no tiene permisos académicos implícitos. Autoridad servidor vigente, nunca visibilidad UI ni metadata cliente. Multirol suma solo capacidades activas asignadas explícitamente.

## REQ-H3-003 — Ficha independiente

Obligatorios: apellido paterno, apellido materno, nombres, tipo DI, número DI, fecha nacimiento, sexo, celular, Departamento/Provincia/Distrito nacimiento, domicilio y Departamento/Provincia/Distrito domicilio. Opcionales: fijo, email, grupo sanguíneo, instrucción, ojos, cabello, estatura, peso, señas, ocupación, estado civil. Contemplar N°/Mz Lt; propuesta opcional porque no está en la lista obligatoria. Edad calculada, no persistida. Tipos iniciales DNI/CARNET_EXTRANJERIA, reutilizar catálogo simple y UBIGEO H2. Ficha mantenible sin matrícula.

## REQ-H3-004 — Identidad y ficha incompleta

Documento único protegido por DB, incluida concurrencia. Buscar alumno devuelve todos sus datos autorizados disponibles. Ficha histórica incompleta permite completar/editar y exige obligatorios al guardar; no ocultarla ni duplicarla. Alumno puede tener múltiples matrículas en distintos Ciclos; consultas operativas usan ficha vigente por alumno_id.

## REQ-H3-005 — Emergencia

Entidad separada alumno_contacto_emergencia, uno a muchos por alumno; apellido, nombre, parentesco y celular obligatorios, dirección opcional. Al matricular debe existir al menos un contacto válido. No columnas de contacto en alumno ni pertenencia a matrícula.

## REQ-H3-006 — Snapshot y PII

Matrícula guarda alumno_id y alumno_snapshot JSONB histórico inmutable con ficha relevante y contactos vigentes al inscribir. Cambios posteriores de alumno o matrícula no reescriben esa fotografía. No copiar toda la ficha ni snapshot en auditoría/logs. Lectura histórica y vigente distinguibles, exposición mínima.

## REQ-H3-007 — Empresa mínima

Entidad independiente con RUC, razón social, persona contacto, teléfono/celular, email. Una empresa puede patrocinar varias matrículas; matrícula admite cero o una. No relación fija empresa-alumno. Solo mantenimiento necesario para matrícula, sin facturas/pagos/deuda ni H7 completo. Permisos y obligatoriedad detallada pendientes en OQ.

## REQ-H3-008 — Tarifas

Catálogo independiente: UUID, código, nombre, descripción, tipo, monto_por_defecto, activo, timestamps/concurrencia. Solo Director mantiene. No borrar tarifas usadas. Default solo ayuda inicial; no asociación automática con Carrera.

## REQ-H3-009 — Configuración por Ciclo

Relación ciclo_tarifa con Ciclo, tarifa, importe configurado, obligatorio/opcional y activo. Selección manual por Director; propone default y admite override sin modificar catálogo. Concepto CARRERA obligatorio; otros como Capitanía opcionales. Misma Carrera puede tener Ciclos de S/650 y S/700.

## REQ-H3-010 — Registro y cargos

Matrícula mediante comando único transaccional DB: autorizar, validar, reobtener tarifas activas del Ciclo, incluir obligatorias, validar opcionales elegidas, recalcular importes y guardar matrícula/cargos/snapshot/auditoría juntos. React no coordina esas escrituras ni decide montos, permisos o estados. Fallo en cualquier parte revierte toda matrícula. Cargos históricos preservan concepto, importe original, descuento separado y final; cambios futuros de tarifa/default/Ciclo no alteran matrículas anteriores. Preparar referencia estable para H4 sin pagos.

## REQ-H3-011 — Ciclo y compatibilidad H2

Registrar o cambiar a Ciclo solo PROGRAMADO/EN_CURSO; bloquear CERRADO/DESIERTO/ANULADO en servidor. Activar reglas H2 diferidas con matrículas: edición ordinaria del Ciclo solo Director y promoción/fechas; prohibir ANULAR Ciclo con matrículas. Revisar rutas indirectas H2 sin inventar cascadas de estado ni pagos.

## REQ-H3-012 — Duplicado

No más de una matrícula alumno+ciclo mediante UNIQUE DB, también concurrente y al cambiar Ciclo. Incluye anuladas: anular no habilita rematrícula en el mismo par durante H3.

## REQ-H3-013 — Código

PK UUID y código visible automático AÑO-SIGLA_CARRERA-CORRELATIVO; correlativo por año+sigla, reinicio anual, generación servidor concurrente. MPC y BZ independientes. Código sugerido editable por usuario autorizado, siempre único y con trazabilidad de propuesta original y cambios. No confundir con correlativo global anual/código de Ciclo H2.

## REQ-H3-014 — Descuento

Solo Director; monto en soles únicamente sobre concepto CARRERA. Original no cambia, descuento separado, 0 ≤ descuento ≤ original, final=original-descuento. Motivo obligatorio si >0. Coordinador no lo aplica/modifica mediante request ni cambio indirecto. Auditar original/descuento/motivo/actor/operación, sin PII ajena.

## REQ-H3-015 — Edición activa

Director/Coordinador pueden cambiar Ciclo, patrocinador y opciones de tarifa; Director además descuento. Cambio Ciclo valida destino/par, recupera tarifas destino y recalcula consistentemente con auditoría. No reglas sobre movimientos financieros inexistentes; antes de H4 revisar libertad de cambios. Versionado de cargos y descuentos existentes requiere cerrar OQ.

## REQ-H3-016 — Anulación

Alta ACTIVO. Ambos roles anulan con motivo obligatorio; ANULADO terminal y consulta, sin reactivar, editar ni borrar registros/cargos/snapshot. Auditar motivo y actor.

## REQ-H3-017 — Auditoría

Reutilizar public.auditoria append-only H2. Registrar altas/ediciones de alumno, contactos, empresa, tarifa/estado, asociación Ciclo, matrícula, cambio de Ciclo/empresa/opciones/código, descuento y anulación. Actor/fecha DB, evento y mutación atómicos; no secretos ni duplicación de ficha personal.

## REQ-H3-018 — Concurrencia

Expected updated_at servidor donde aplica, conflicto explícito y sin retry silencioso. Probar documento/par duplicados, correlativo, edición, creación transaccional y cambios concurrentes de referencias. No mecanismos adicionales sin necesidad demostrada.

## REQ-H3-019 — UI y accesibilidad

Nuevo Alumno Stepper: Identificación, Domicilio, Información adicional, Contacto emergencia, Revisar; Anterior/Siguiente/Guardar, sin avanzar con errores obligatorios del paso. Alumno existente Tabs: Resumen, Datos personales, Domicilio, Información adicional, Contactos, Matrículas (historial). Registrar matrícula Stepper: Ciclo, Alumno, Patrocinador, Tarifas, Confirmación. Alumno existente muestra resumen, incompleto permite completar, nuevo abre alta y retorna. Conservar Ciclo para siguiente alumno; confirmar con «Matricular otro alumno en este Ciclo» y «Ver matrícula». Modales solo acciones breves, no ficha completa. Identidad H2 y Sistema/Claro/Oscuro/Alto contraste, forced-colors prioritario, teclado, errores inline/foco primero, estados con texto, modales propios sin window.alert/confirm/prompt.

## REQ-H3-020 — Evidencia y gates

Trazabilidad completa entre los cuatro documentos; pruebas automatizadas, integración local, seguridad/RLS, concurrencia, humanas y Gate 2 diferenciadas. Revisar aislamiento, permisos, validación, parameter tampering, PII, outputs y secretos según OWASP Secure SDLC y cinco pilares Well-Architected aplicables. CI no concede aprobación humana. Si RPC exige capas/helpers excesivos, registrar riesgo para decisión humana, no construir API oculta.

## Preguntas abiertas — todas PENDIENTES, previas a Gate 1

| ID | Decisión requerida | Requisitos afectados |
|---|---|---|
| OQ-H3-001 | Unicidad DI por tipo+número o global; formatos exactos DNI/CE; listas o texto para sexo/estado civil/sangre/instrucción/ojos/cabello/parentesco y valores iniciales; unidades estatura/peso. Revisar cotas técnicas propuestas y N°/Mz Lt opcional. Sin longitud legal ni rango clínico inventado. | 003–005 |
| OQ-H3-002 | Permitir Director/Coordinador alta/edición empresa mínima; obligatorios de contacto/teléfono/email, formato RUC y unicidad propuesta. | 002, 007 |
| OQ-H3-003 | Confirmar retiro lógico de contactos y snapshot con todos los activos válidos, sin contacto principal obligatorio. | 005–006 |
| OQ-H3-004 | Confirmar exactamente una CARRERA activa obligatoria por Ciclo, tipos CARRERA/OTRO, importes cero y mantenimiento de tarifas en Ciclos terminales. | 008–010 |
| OQ-H3-005 | «Con matrículas» incluye anuladas; edición/anulación de matrícula activa si Ciclo ya terminal; límites sobre cambios automáticos H2 de materias/sigla. | 011, 015–016 |
| OQ-H3-006 | Año de inscripción America/Lima, roles/momento/formato del código manual (propuesta ≤50), código estable ante cambio Ciclo/sigla y consumo correlativo con override. | 013 |
| OQ-H3-007 | Cambio Ciclo por Coordinador con descuento previo: ¿conservar nominal si compatible y rechazar si excede nuevo costo, o reservar cambio al Director? Nunca ajustar automáticamente. | 014–015 |
| OQ-H3-008 | Aprobar retención de precio de cargos existentes, opcionales nuevos a precio vigente y revisiones de cargos retirados/reemplazados sin DELETE; continuidad UUID para H4. | 010, 015 |

## Exclusiones

Pagos/medios, deuda/saldos, idempotencia financiera, facturación/pagos de patrocinadores, PDFs, documentos/Storage, plantillas documentarias, importación Excel, workflow de aprobación de descuentos, notificaciones, profesores, reportes analíticos, H7 completo. No adelantar H4/H5/H6/H7. EVOL-001/002 solo en [EVOLUCIONES](../../EVOLUCIONES.md).

## Trazabilidad

Cada índice 001–020 vincula REQ-H3-n → DES-H3-n → TASK-H3-n. El test-plan enumera explícitamente los TEST vinculados; tasks contiene la matriz de cobertura. Todas las propuestas de diseño y OQ deben resolverse/coherenciarse antes de Gate 1.
