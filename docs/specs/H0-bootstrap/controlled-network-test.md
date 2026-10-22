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
CONTROLLED TEST: PARTIAL — EXTERNAL VALIDATION INCOMPLETE
DEF-H0-001: CONFIRMED / OPEN
H0 IMPLEMENTATION: BLOCKED (PARTIAL)
ACCEPTANCE: BLOCKED
```

## Continuación posterior: regla creada por la persona y primera ronda

El usuario informó creación manual de la regla desde PowerShell administrativo. Codex comprobó que existe y está habilitada, con dirección Inbound, acción Block, todos los perfiles, TCP 54320–54324 y los rangos de direcciones exactos de CHG-H0-001. No modificó la regla. IP Wi-Fi comprobada: `192.168.1.236`.

Se inició el stack con la CLI local y red existentes, sin modificar el guard ni configuración. Arranque: salida 0. Comprobaciones desde el host por `127.0.0.1`: API 54321 HTTP 404; Studio 54323 HTTP 307; correo 54324 HTTP 200; PostgreSQL 54322 conexión TCP correcta. Servicios saludables; consulta de solo lectura confirmó cero tablas base en public. No se imprimieron claves ni cuerpos de respuesta.

El usuario aportó capturas desde el celular: 54321 ERR_CONNECTION_ABORTED, 54323 inicialmente en blanco y después ERR_CONNECTION_TIMED_OUT, 54324 inicialmente en blanco y después ERR_CONNECTION_ABORTED. Se atribuyen a la persona, no a Codex. Archivos originales conservados en los adjuntos de esta conversación; no se copiaron al repositorio.

Tras recibir la primera observación, Codex detuvo el stack (`node scripts/local-supabase.mjs stop`, salida 0). Las capturas finales llegaron después de esa parada en el orden de mensajes. No está confirmada la relación temporal entre los errores capturados y la parada, por lo que no prueban por sí solos aislamiento con servicios activos. Las horas visibles del teléfono no sustituyen esa correlación.

**Resultado:** indicios de inaccesibilidad, validación incompleta. Falta prueba TCP externa de 54322 y confirmar resultados externos mientras el stack está activo; después falta detener/recrear y repetir. IPv6 externo tampoco está validado. No se declara fallo del firewall ni éxito definitivo; no se revierte la regla por una evidencia inconclusa. Stack detenido, regla del ensayo conservada, guard intacto, TASK-H0-004 sin iniciar. DEF-H0-001 sigue confirmado/abierto; aceptación y merge bloqueados.

## Nueva ronda con stack mantenido activo

El usuario descartó las capturas anteriores como evidencia definitiva y autorizó repetir, manteniendo el stack encendido hasta su confirmación de finalización. Se verificaron de nuevo regla habilitada y filtros exactos, IP Wi-Fi 192.168.1.236 y red existente; no se modificaron. Arranque local: salida 0. Loopback inicial: API 404, Studio 307, correo 200 y PostgreSQL TCP correcto.

El usuario aportó tres nuevas capturas, todas con ERR_CONNECTION_TIMED_OUT: puerto 54321 (hora visible 20:19), 54323 (20:21) y 54324 (20:23). Adjuntos originales: 1000293742.jpg, 1000293743.jpg y 1000293744.jpg, respectivamente. Se registra como prueba humana desde el celular de esta ronda, no como ejecución de Codex. Las horas son las visibles del teléfono, sin certificación independiente.

Al recibirlas, Codex comprobó nuevamente respuestas por 127.0.0.1: API HTTP 404, Studio HTTP 307, correo HTTP 200 y PostgreSQL TCP correcto. Todos los contenedores del proyecto seguían activos desde hacía aproximadamente ocho minutos y los que tienen healthcheck estaban saludables. No se detuvo el stack entre el aviso de disponibilidad y esta comprobación.

**Resultado de esta ronda:** inaccesibilidad HTTP observada desde el celular para 54321/54323/54324 mientras los servicios locales permanecen disponibles. Evidencia compatible con el efecto esperado de la regla; no demuestra aislamiento universal ni valida 54322/TCP o IPv6. Persistencia tras recreación pendiente. Se mantiene el stack encendido hasta confirmación humana de finalización, según instrucción expresa. No se modifica guard, no se continúa TASK-H0-004 ni se acepta CHG-H0-001 como solución definitiva. DEF-H0-001 permanece abierto.
