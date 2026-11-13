# CHG-H5-002 — Fuente vigente y fotografía final de cierre

13/11/2026, America/Lima. **APROBADO HUMANAMENTE PARA IMPLEMENTACIÓN**, posterior a Gate 1 H5. Base funcional previa: `0b9081cc505bcbd7bfe503503eb3300adc7dec9e`, CI `43351040067` SUCCESS (417/417). La autorización humana incluye las tres precisiones de locks, captura única/etiquetas inactivas y fingerprint canónico. No equivale a Gate 2 ni GATE-A01.

## Decisión que reemplaza la fuente H5 anterior

| Estado | Fuente personal para generación/regeneración |
| --- | --- |
| PROGRAMADO / EN_CURSO | Alumno vigente, domicilio, contactos activos, IDs/etiquetas y geografía actuales |
| CERRADO | Exclusivamente alumno_snapshot_cierre |
| DESIERTO / ANULADO o matrícula ANULADA | Generación y descarga bloqueadas |

`alumno_snapshot` original sigue siendo inmutable y representa cómo estaba el Alumno al matricularse. Historial H3 conserva esa consulta. No existe fallback entre original, cierre y datos vigentes. Curso/Ciclo/promoción/patrocinador/distrito conservan el contexto actual al emitir; fecha de matrícula y edad calculada a esa fecha permanecen, emisión real Lima solo en el pie. No se guarda edad nueva.

## Cambio concreto e inventario

Migración aditiva `20261113010000_h5_current_and_closure_source.sql`:

- Una columna nullable `matricula.alumno_snapshot_cierre`, objeto JSON con versión, instante DB, Alumno, contactos activos y etiquetas/geografía.
- Una vista específica `matricula_ficha_fuente`, **security_invoker=true**, SELECT authenticated sujeto a RLS de las tablas subyacentes. Devuelve fuente explícita y fingerprint calculados en una única lectura coherente. No es endpoint de edición ni consulta genérica. Justificación: evitar fuentes mezcladas y una segunda implementación de serialización/hash en JavaScript.
- Un helper privado de trigger `freeze_cycle_students`, sin EXECUTE para clientes, ejecutado exclusivamente en la transición EN_CURSO -> CERRADO. La RPC existente cambiar_estado_ciclo conserva firma, autorización y transiciones; el trigger integra la captura a su misma transacción y protege también otras rutas de transición DB.
- La RPC de auditoría existente conserva su propósito y privilegio exclusivo service_role; añade el argumento obligatorio `p_source_fingerprint text`. La firma anterior se sustituye, sin sobrecarga legacy ni RPC pública nueva.
- Guard de Matrícula valida NULL -> valor exclusivamente desde el trigger de cierre autorizado, mediante profundidad de trigger, contexto transaccional interno, Director y Ciclo CERRADO; se rechazan INSERT con captura, reemplazo, limpieza y cualquier escritura ordinaria. Snapshot original y guards financieros H4 se conservan.
- Auditoría excluye explícitamente alumno_snapshot **y** alumno_snapshot_cierre de old_values/new_values. Solo el hash/metadatos cerrados del artefacto llegan a auditoría PDF; nunca el payload fuente o PII.

Inventario comprobado local: **24 tablas, 4 vistas, 20 funciones públicas, 19 helpers privados, 27 policies SELECT**, un bucket privado y cero policies Storage cliente. Sin nuevas tablas, políticas, roles, backend, cron, colas, gestor de versiones ni infraestructura.

## Transacción, locks y privacidad

Orden estricto: **Ciclo -> Alumno(s) por UUID -> Matrícula(s) por UUID**. La transición ya posee el lock del Ciclo; el trigger bloquea todos los alumnos y luego todas las matrículas ACTIVAS en orden estable. La captura del lote usa una sola sentencia UPDATE desde la vista: todos sus alumnos observan la misma lectura MVCC de etiquetas/geografía/contexto. Captura y estado/versiones/auditoría confirman juntos. Una captura fallida revierte todo, incluso capturas anteriores del lote. Matrículas ANULADAS quedan excluidas. Contactos vigentes son los activos; cero contactos no introduce un nuevo bloqueo al cierre.

La extracción no invoca validaciones exclusivas de alta ni exige referencias activas. Incluye etiquetas/geografía existentes aunque se hayan desactivado. Los permisos existentes de edición del Alumno y finanzas se conservan. Capturar avanza updated_at de las matrículas: un borrador con versión anterior obtiene conflicto y requiere recarga/decisión explícita. H4 mantiene reglas, montos, aplicaciones y pago permitido en Ciclo CERRADO con versión vigente.

## Fingerprint y artefactos obsoletos

SHA-256 se calcula **solo en PostgreSQL**, sobre representación canónica `jsonb::text` UTF-8. Incluye fuente vigente/cierre, datos personales/contactos/catálogos/geografía seleccionados, identificador y código de matrícula, fecha de matrícula, contexto completo usado por el PDF y versión técnica **h5-2**. Excluye emisión y updated_at financiero que no modifica el PDF. La misma vista se usa para leer, capturar y revalidar; React no calcula ni envía hashes. El contrato público Edge continúa aceptando solo matrícula/versión y artefacto opcional.

Edge compara la huella antes/después de render/upload y antes de entrega; la RPC de auditoría vuelve a validarla en DB con locks en el protocolo acordado. Se compara también contra el manifiesto de generación: proporcionar la huella actual no legitima un PDF antiguo. Un cambio de fuente o plantilla produce HTTP 409/SOURCE_CHANGED y exige regeneración explícita, sin lectura/entrega del PDF obsoleto ni evento de descarga exitoso. Los artefactos anteriores sin huella no son válidos para esta plantilla. Las carreras tienen un punto de autorización transaccional; no se promete revocar bytes ya entregados antes de un cambio posterior.

Al cerrar cambia la procedencia aunque los valores personales coincidan: un PDF vigente previo no pasa a ser final. Después del cierre, editar Alumno/contactos/etiquetas personales no cambia la captura final. Cambios del contexto que sí aparece en el PDF invalidan la huella y requieren regenerar. Fecha de emisión nueva por sí sola no invalida.

RLS/JWT, validaciones de estado, caché no-store, bucket privado, 24 h/expiración, límites 100 contactos/20 páginas/2 MiB/4 KiB, compensación y ausencia de URLs firmadas de producto se conservan. Errores lógicos PT409; 40001/40P01 nativos permanecen explícitos, sin retry automático.

## Desarrollo, validación y estado

Todos los datos existentes son de desarrollo según declaración humana. No se reseteó ni se hizo backfill: la migración solo incorpora esquema/contratos. Ciclos antiguos CERRADOS sin captura final rechazan la ficha de manera explícita; pueden recrearse o regularizarse mediante una operación puntual autorizada de desarrollo, sin lógica permanente de producto ni historia inventada.

Local: **425/425 PASSED**, lint/typecheck/Deno check/build/build-safety PASSED. Rollback DB verifica fuente vigente/cierre, snapshot original intacto, captura única, catálogos/geografía inactivos, cero contactos, exclusión de ANULADAS, fallo intermedio con rollback completo, fingerprint canónico y rechazo de manifiesto obsoleto/auditoría sin PII. Se ejecutaron todas las carreras H4 existentes, incluido 70+60/saldo100 y deadlock nativo; nuevas carreras cierre contra Alumno/contactos/pago/edición/anulación PASSED sin retries. Los fixtures de H3/H4 solo releen la versión después de capturar el cierre; no se debilitan aserciones financieras. CI del candidato se verificará antes de entrega, incluyendo JWT/RLS/Edge/Storage reales, expiración y reconstrucción.

QA visual técnico y extracción independiente de PDFs sintéticos: fuente vigente y final, ambos una página A4. La evidencia extensa de 100 contactos conserva su paginación. No constituye aceptación humana del Bloque 1. Se actualizan únicamente enmienda y registros de evidencia; los Spec/aprobaciones históricos de H2/H3/H5 permanecen intactos.

Residuales preservados: CPU y Memory NOT MEASURED; Hosted NOT EXECUTED; Data API hospedada/PostgREST 14 no probados directamente; forced-colors H5 NO VERIFICADO; bundle >500 kB (678,50 kB); limpieza física manual. Cierre masivo mantiene locks durante su transacción; timeout o conflicto revierte todo, sin tareas diferidas ni retries ocultos.

**Gate 2 H5 PENDIENTE; GATE-A01 PENDIENTE / suficiencia hospedada inconclusa.** Sin acceptance, PR, merge/main ni H6.
