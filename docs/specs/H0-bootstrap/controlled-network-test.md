# CHG-H0-001 — Registro del ensayo controlado

Fecha: 21/10/2026. Rama: `feature/h0-bootstrap`. Base documental: `3bceb2f`.

## Decisión humana y evidencia recibida

El usuario aprobó CHG-H0-001 exclusivamente para ensayo controlado, sin adoptar una solución definitiva ni modificar el guard. Confirmó desde un segundo dispositivo de la misma LAN acceso a `192.168.1.236:54321`, Studio en `54323` y correo en `54324`. En `54322` la ausencia de respuesta HTTP útil no demuestra aislamiento de PostgreSQL. DEF-H0-001 queda CONFIRMADO / ABIERTO. No se atribuye esta prueba humana a Codex.

La autorización posterior sustituye el estado de aprobación pendiente del documento original solo en cuanto al ensayo; no aprueba el cambio definitivo de diseño.

## Ejecución técnica

1. Estado inicial: working tree limpio; regla `PERUMAR-H0-Block-NonLoopback` no encontrada. Stack del diagnóstico anterior activo con publicaciones globales.
2. Se ejecutó `node scripts/local-supabase.mjs stop` con el Node 24.19.0 documentado. Resultado: salida 0, stack detenido.
3. Se intentó `New-NetFirewallRule` con nombre, direcciones, puertos y parámetros exactos de CHG-H0-001. Resultado: salida 1, **Acceso denegado**. La herramienta permitió ejecutar el comando, pero Windows denegó la operación administrativa; no fue un rechazo de revisión automática.
4. No se inició nuevamente el stack, no se hicieron cambios alternativos y no se modificó el guard. Las pruebas de loopback, LAN con regla y recreación están NO EJECUTADAS.

## Continuación pendiente

Se necesita ejecutar la creación exacta de la regla desde una consola de PowerShell con privilegios de administrador. La autorización humana del ensayo ya existe; la limitación actual es de permisos efectivos del sistema operativo. No se intentó sortearla ni modificar otros controles.

Después de comprobar la regla: iniciar temporalmente el stack por la CLI local, verificar loopback para HTTP 54321/54323/54324 y TCP 54322, y solicitar prueba humana TCP de 54321–54324 desde el segundo dispositivo. Tras un resultado satisfactorio, detener y recrear el stack y repetir ambas verificaciones. No modificar el guard para permitir el ensayo.

Si falla alguna comprobación, detener el stack y eliminar exclusivamente la regla del ensayo si se creó. No hay regla creada que revertir por el intento denegado. H0 y TASK-H0-004 en adelante permanecen bloqueados; sin acceptance ni merge.

```text
CHG-H0-001: APPROVED FOR CONTROLLED TEST ONLY
CONTROLLED TEST: BLOCKED — WINDOWS ADMINISTRATIVE PERMISSION
DEF-H0-001: CONFIRMED / OPEN
H0 IMPLEMENTATION: BLOCKED (PARTIAL)
ACCEPTANCE: BLOCKED
```
