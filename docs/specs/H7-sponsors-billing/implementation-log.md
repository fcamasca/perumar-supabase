# H7 — Construcción por bloques

## 2026-11-23 — Núcleo DB autorizado tras Gate 1

Spec aprobado: `08d8a7a6e3279ff8f36344247de4c270b44f19f0`; rama núcleo creada desde ese SHA. [Gate 1](gate-1.md).

Implementación acotada TASK-H7-002..005:

- Migración `20261123010000_h7_billing_model.sql`: seis tablas de negocio, una técnica sin protocolo de bytes; constraints, índices, historia inmutable, validación diferida por raíces afectadas, auditoría mínima, RLS/grants y dos proyecciones invoker.
- Migración `20261123020000_h7_billing_commands.sql`: siete RPC específicas. Selección OS histórica y manual; factura n:m con diferencia confirmable; workflow adyacente; transferencia con banco/fecha; idempotencia; dependencias de anulación sin cascadas.
- Migración `20261123030000_h7_private_payment_eligibility.sql`: reemplazo aditivo de registrar_pago H4 con una comprobación nueva después de versión/locks y de recuperación idempotente. Migraciones históricas, fórmulas, aplicaciones e importes H4 sin cambios.
- RPC JSON siguen convención de campos escalares string/null. OS: matriculas con id/expected_updated_at y expected_ciclo_updated_at. Factura: ordenes con id/expected_updated_at y confirmar_diferencia explícito. Pago: aplicaciones con factura_id/importe/expected_updated_at; la versión es contexto de validación, no contenido económico canónico. Recuperar clave existente precede a reevaluar versiones/elegibilidad actuales.
- Locks académicos Ciclo→Alumno→Matrícula; después empresa→OS→facturas→pago, UUID ordenados, sin locks H7 nuevos dentro de H3/H4. El lock de empresa serializa comandos comerciales del mismo patrocinador; no es lock global. PostgreSQL40001/40P01 reales se propagan, PT409 lógico, ningún retry.
- Suite aislada nueva reconstruye todas las migraciones y seed desde cero en una base aleatoria, copia solo esquema de plataforma y levanta PostgREST desechable con JWT ordinarios. No copia usuarios/datos humanos ni resetea el stack humano.
- Regresión H4 distingue pago anterior a patrocinio, nuevo pago rechazado, recuperación histórica y anulación intacta; conserva todos los escenarios concurrentes anteriores. Inventario de seguridad/CI adaptado a nuevos objetos.

Fallos encontrados durante desarrollo: alias SQL ambiguo en guard de anulación; expectativa de prueba HTTP que no contemplaba serialización nativa; fixture H4 que sobrescribía el payload de recuperación histórica. Corregidos y repetidos los bloques afectados; no se cambiaron políticas aprobadas para hacer pasar pruebas.

Sin cambios React, reportes/CSV, buckets, Edge, SUNAT ni archivos reales. Sin modificaciones de los cuatro documentos aprobados. Resultados y límites en [technical-results.md](technical-results.md). No declarar H7 completo ni iniciar bloques posteriores sin revisión.

## 2026-11-23 — TASK-H7-006: UX autorizada tras aprobación del núcleo

Núcleo aprobado humanamente para continuar: `83140cce4204fb0b8e3e61fab1164088d11f26a5`, CI `45287905957` SUCCESS. Rama `feature/h7-sponsors-billing-ui` creada exactamente desde ese SHA. La nueva autorización cubre solo UX; no es Gate 2 H7.

- Entrada desde la ficha existente de Empresa, sin segundo maestro. Ruta `/empresas/:companyId/facturacion`, con órdenes, facturas y pagos paginados. Bloqueo de acceso UI para ADMIN solo y autoridad DB inalterada.
- OS: Ciclo elegible → matrículas ACTIVO del patrocinador; selección individual/múltiple/todas las visibles, monto manual, correlativo textual y snapshots de versión. Cobertura histórica consultada por relación OS, no por patrocinador actual. PDF solo texto “No adjunto”, sin botón de subida simulado.
- Facturas: OS VIGENTE propias, sugerencia exacta con BigInt, importe editable, advertencia/diferencia y confirmación explícita; sin reparto. Workflow solo siguiente etapa con fecha; estado financiero derivado y condición de anulación separados. Anulación Director/motivo/confirmación y errores de dependencias sin cascadas.
- Transferencias: banco/fecha/referencia y aplicaciones a facturas pendientes, total exacto y versiones esperadas. Una decisión de envío, una RPC. Referencia UUID conservada antes de enviar, por usuario/empresa; sin payload financiero persistido. Consulta explícita por clave; un reenvío idéntico solo se ofrece después de consulta sin resultado, con el borrador original aún en memoria y decisión humana adicional. Nunca nueva clave/retry automático ante respuesta incierta.
- Matrícula: consulta comercial y enlaces históricos, sin CRUD duplicado ni suma H4+H7. H4 oculta formulario nuevo incluso con apertura inicial solicitada si está patrocinada, preserva historial y anulación autorizada. Acceso directo desde Pagos consulta patrocinio y falla cerrado ante lectura incierta. Historial no depende de que el catálogo de medios para pagos nuevos siga disponible.
- Reutilizados InlineForm, confirmación/modal con foco y teclado, tabs y estilos por variables de tema. Paginación/selección explícita de página; cambiar de página reinicia selección según aviso visible. Sin nueva dependencia.
- Nuevas pruebas React (31), fixtures existentes ajustados únicamente para el enlace de navegación y lectura de patrocinio. Núcleo, migraciones, siete RPC, RLS y las186 comprobaciones DB sin cambios. Verificadas además siete consultas concretas contra PostgREST desechable con JWT ordinario, sin modificar scripts de pruebas DB.

Sin reportes/CSV, Storage/buckets, Edge H7, PDF real o SUNAT. Sin capturas ni ejecución humana; revisión visual/operativa pendiente. Sin Gate 2, acceptance o merge. Evidencia en technical-results; detenerse para revisión UX H7.

## 2026-11-23 — Fix focalizado: recuperación de transferencia tras remount

Base exacta UX: `9c8ab2b0b5019dde72e7ec8db18d143260a8c7bb`, misma rama UI. Solo TransferForm, pruebas focalizadas y evidencia; SQL/RPC/RLS intactos.

Tras una consulta explícita sin resultado, se ofrece revisar/reconstruir los datos originales con la clave conservada, aunque el payload en memoria se haya perdido. Se requiere confirmación humana de correspondencia con el intento original. El envío reutiliza esa clave; el contrato DB vigente recupera el pago existente o rechaza diferencias, sin crear un duplicado. No se persiste payload financiero adicional ni se limpia la referencia para crear otro intento.

La incertidumbre del intento anterior permanece tras remontar o fallar un reenvío: un error de la petición nueva no demuestra que la anterior no confirmó. La clave solo se libera por resultado positivo autorizado o por rechazo definitivo de un primer envío que nunca estuvo incierto. Sin generación de claves/reenvíos automáticos; guard síncrono de una mutación por decisión.

Tres pruebas nuevas cubren pérdida de respuesta→remount→consulta vacía→reconstrucción confirmada con misma clave, conflicto idempotente con consulta posterior y error definitivo de reenvío sin liberar la referencia anterior. Checks limitados a Billing/Payments, lint/typecheck/build/diff-check. Publicación con `[skip ci]` para respetar la instrucción humana de no volver a ejecutar DB ni regresión H1–H6. No Gate 2/merge ni ampliación de alcance.
