# GATE-A01 — Continuidad de Supabase

Fecha: **18/11/2026 (America/Lima)**.
Decisor: usuario/revisor humano de esta conversación.
Decisión explícita: **GATE-A01: APROBADO CON AJUSTES**.

## Base y alcance de la decisión

Se autoriza continuar el MVP con **React + TypeScript, Supabase Auth, PostgreSQL, RLS, RPC / Database Functions, Edge Functions acotadas y Supabase Storage privado**. La decisión humana se basa en la evidencia acumulada H1–H5; no afirma que todos los riesgos de producción estén resueltos ni constituye una prueba hospedada.

Trazabilidad: criterios de [PLAN_MVP.md](../PLAN_MVP.md#gate-a01--continuidad-de-supabase); [Gate 2 H5](../specs/H5-enrollment-pdf/gate-2.md) sobre `f9fbc4ddbf0eae36786d2296d045900aa9ea818a`, CI [43474034111](https://github.com/fcamasca/perumar-supabase/actions/runs/43474034111) SUCCESS, ocho bloques humanos OK; registro documental `09bbd2716d480f93bd81349c9fc17ca92ff531d0`, CI [44334708494](https://github.com/fcamasca/perumar-supabase/actions/runs/44334708494) SUCCESS. Se preservan el alcance exacto de esa aprobación y los cambios posteriores identificados allí, sin ampliarla por inferencia.

Esta decisión posterior sustituye el estado pendiente de GATE-A01, sin reescribir decisiones históricas, Specs aprobados ni resultados de H1–H5. La suficiencia técnica hospedada continúa inconclusa; la continuidad del MVP se autoriza humanamente con los residuales explícitos siguientes. No es una aprobación sin reservas para producción.

## Evaluación de los criterios del plan

| Criterio | Resultado humano | Razón y condición de continuidad |
| --- | --- | --- |
| Seguridad: claridad y mantenibilidad de Auth + RLS | **SUFICIENTE PARA CONTINUAR** | Auth/JWT/RLS/RPC/Edge demostraron autorización server-side, separación de privilegios, uso acotado de service_role y minimización de PII adecuados para el MVP. Mantener controles OWASP Secure SDLC. |
| CRUD: esfuerzo frente a API propia | **SUFICIENTE PARA CONTINUAR** | H2/H3 reducen infraestructura adicional y localizan reglas en PostgreSQL + RLS + RPC sin una API generalista propia. Es una valoración humana de la evidencia, no una medición comparativa nueva de horas o líneas. No añadir API sin necesidad técnica demostrada. |
| Negocio: matrícula transaccional | **SUFICIENTE PARA CONTINUAR** | Matrícula, estados, snapshots, cierre y edición se expresan mediante transacciones, constraints y RPC con concurrencia explícita. CHG-H5-002 incorporó cambios sin servicios adicionales. |
| Finanzas: pago, concurrencia e idempotencia | **SUFICIENTE PARA CONTINUAR** | H4 resolvió pagos, aplicaciones, saldos, concurrencia, idempotencia, rollback, conflictos y auditoría sin backend permanente adicional. Mantener el enfoque transaccional. |
| Documentos: calidad y esfuerzo de ficha PDF | **SUFICIENTE PARA CONTINUAR** | H5 acredita viabilidad de Edge Function + pdf-lib, autorización, Storage privado, auditoría, retención lógica, regeneración, fingerprint, snapshot final y ocho bloques humanos. No impone la misma estrategia para todos los documentos futuros: evaluar cada necesidad en el Spec H6. |
| Desarrollo: código y configuración | **SUFICIENTE CON AJUSTES** | Arquitectura comprensible para una institución, pocos usuarios concurrentes y crecimiento moderado. Evitar servicios sin evidencia; reglas localizadas; Edge nuevas solo si aportan valor; no duplicar lógica React/DB/Edge. No se inventa una métrica de reducción de código. |
| Mantenimiento: entender y depurar una operación | **SUFICIENTE CON AJUSTES** | Mantener recorridos acotados y comprensibles, sin API generalista oculta ni abstracciones multicloud anticipadas. La continuidad requiere disciplina de alcance, no infraestructura nueva automática. |

### Controles y ajustes de continuidad

Mantener OWASP Secure SDLC: validación estricta de entradas, autorización en servidor, RLS como control adicional, gestión segura de secretos, logs/auditoría mínimos, protección IDOR, rechazo de payloads inesperados y React sin autoridad de negocio o permisos.

Los ajustes aprobados son límites de diseño y operación para continuar; este registro no implementa cambios arquitectónicos. No introducir por defecto backend WebFlux, API Node separada, Lambda, S3, colas, microservicios, Kubernetes, motor documental externo ni infraestructura AWS adicional. Una necesidad técnica futura exige evaluación y autorización explícitas; no se habilita infraestructura por inferencia.

## Residuales conocidos y aceptados para continuar el MVP

1. **Hosted Edge / PostgREST 14: NO PROBADO DIRECTAMENTE.**
2. **CPU de Edge: NO MEDIDA.**
3. **Memoria de Edge: NO MEDIDA.**
4. **Forced-colors real H5: NO VERIFICADO.**
5. **Bundle frontend >500 kB:** advertencia vigente.
6. **Limpieza física de PDFs H5: MANUAL:** residual operativo vigente.

Estos seis residuales son aceptados humanamente para continuar el MVP: no están resueltos, no se convierten en PASSED y no impiden preparar H6. Permanecen visibles en la planificación técnica. Los relevantes para producción deberán resolverse o aceptarse explícitamente antes de **H9 / release**. La expiración lógica no demuestra borrado físico automático. No se inventan mediciones CPU/memoria ni pruebas hospedadas o de accesibilidad real.

## Storage para H6

**Supabase Storage privado** es la opción inicial: menor complejidad, integración con Auth/RLS/Edge, evidencia de H5 y menor carga operativa/mantenimiento para el contexto actual. El Spec H6 deberá validar su suficiencia para almacenamiento persistente del expediente.

**S3: NO AUTORIZADO / NO NECESARIO POR AHORA.** No migrar a S3 ni crear ahora un StorageProvider genérico o abstracción multicloud. La identidad documental debe usar claves de objeto y metadatos de dominio; no persistir URLs específicas del proveedor como identidad documental. Este registro no crea buckets ni Storage H6.

## Autorización siguiente y límites

**H6: AUTORIZADO SOLO PARA PREPARACIÓN DE SPEC. H6 implementación: NO AUTORIZADA.** El siguiente proceso es requirements.md, design.md, tasks.md y test-plan.md; revisión humana; Gate 1 H6; y solo después construcción autorizada. Este registro se detiene sin comenzar esos documentos.

La preparación del Spec debe considerar como mínimo: expediente por matrícula; documentos subidos y generados institucionalmente; Storage privado persistente; tipos documentales; tamaño/MIME/contenido; metadatos; hash; carga; confirmación; descarga; baja; permisos; auditoría; retención; y generación de solicitud, declaración jurada, carta poder y ficha de datos personales. Son entradas para evaluar en H6, no un Spec ya aprobado ni permiso de implementación.

**H5: Gate 2 aprobado sobre su candidato exacto; sin acceptance, cierre formal ni merge a main autorizados por esta decisión.** No crear PR/merge adicional. H6 Spec aún no iniciado por este registro; sin código, tablas, migraciones ni Storage H6.

## Publicación

Registro exclusivamente documental en `feature/h5-enrollment-pdf`, desde `09bbd2716d480f93bd81349c9fc17ca92ff531d0`. Los cinco archivos locales de interfaz/tests previamente modificados se preservan fuera del commit. Los cuatro documentos aprobados de cada Spec anterior y las decisiones históricas no se modifican. El SHA documental y su CI exacta se informan en la entrega para evitar referencia circular al propio commit.
