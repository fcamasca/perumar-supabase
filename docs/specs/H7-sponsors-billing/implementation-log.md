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
