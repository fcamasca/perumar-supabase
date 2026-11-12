# H5 — Evidencia técnica de construcción

Estado: **EN CONSTRUCCIÓN / Gate 2 PENDIENTE / GATE-A01 PENDIENTE**. Gate 1: `9804bb07063590e8917fc86d07995c474b84e718`. Los estados históricos del Spec aprobado no se reescriben.

## Evidencia local inicial (12/11/2026)

- Lint y typecheck: PASSED tras el primer bloque.
- Unit/component: **404/404 PASSED**, incluye 32 nuevas pruebas H5 de procedencia, estados, versión, render, fallos/compensación y UX.
- Spike real Edge: HTTP 200, PDF español de 5.060 bytes, dos páginas, render 149,15 ms; parseo pypdf y render Poppler. No dato CPU ni resultado hosted.
- `test:pdf:rollback`: PASSED; actor, whitelist de eventos, versión, duplicado, expiración, anulación y denegaciones sin auditoría de éxito. Fingerprint de filas de negocio/auditoría idéntico antes/después.
- Regresión `test:payments:rollback`: PASSED; sin fixtures persistidos.
- Regresión `test:payments:isolated`: en ejecución al redactar este registro; base desechable, nunca reset humano.
- Build/build-safety/diff-check y CI integral: en curso; completar con resultados exactos, sin anticipar SUCCESS.

## Inventario previsto implementado

| Recurso | Cambio H5 |
| --- | --- |
| Tablas/vistas de negocio | Ninguna nueva: 24 tablas y 3 vistas existentes |
| RPC pública | Una: `registrar_evento_ficha_pdf(uuid,uuid,uuid,text,timestamptz,timestamptz)`, ejecución solo service_role |
| Helpers privados DB | Ninguno nuevo; 18 existentes |
| Policies de negocio | Ninguna nueva; 27 SELECT existentes |
| Policies Storage para clientes | Ninguna; acceso directo denegado |
| Bucket | Uno privado: `fichas-matricula`, application/pdf, límite 2 MiB |
| Edge Functions de producto | Una: `ficha-matricula` |
| Migración | `20261112010000_h5_private_enrollment_pdf.sql` |

Inventario automatizado se amplió con comprobaciones exactas de bucket, ausencia de policies Storage y permisos/configuración del comando de auditoría; no se relajó el inventario financiero.

## Pendientes y límites explícitos

No pruebas humanas H5 reportadas. Comparación institucional final mínima/extensa, teclado, accesibilidad y dictamen GATE-A01 requieren revisión humana. Forced-colors real H5 **NO VERIFICADO**; no se hereda un PASSED de H3/H4.

No existe entorno hospedado autorizado para este ensayo. Data API hospedada/PostgREST 14 y Edge hospedado **NO PROBADOS DIRECTAMENTE**. CPU/peak memory aisladas aún sin medición fiable; tiempo wall-clock no las sustituye. No afirmar aptitud hospedada a partir de local. Bundle >500 kB y operación manual de limpieza deben mantenerse como residuales si subsisten. Costos/mediciones finales se consolidarán tras CI; sin Gate 2 ni suficiencia arquitectónica automáticos.
