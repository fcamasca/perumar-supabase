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

## Ronda 1 confirmada y recreación para ronda 2

El usuario confirmó explícitamente ronda 1 completada y evidencia humana, y autorizó recrear. Estado declarado por la persona: CHG-H0-001 CONTROLLED TEST — ROUND 1 PASSED; no es aceptación definitiva ni cierre de DEF-H0-001.

Se comprobó regla habilitada, se registraron IDs previos, se detuvo con el script local (salida 0), se confirmó ausencia de contenedores activos del proyecto y se inició con la misma CLI/red (salida 0). Se conservaron volúmenes; no se ejecutó reset ni se modificó configuración. IDs diferentes demuestran recreación: DB `566bd029a4a1` → `49d746a16637`; API/Kong `98ffbc3e9281` → `c7384d5c171e`; Studio `06cc53ce0568` → `af3afc6fde17`; correo `b0a61439812e` → `4b30dbc6b89b`.

Tras recreación, los contenedores están activos y sus healthchecks disponibles saludables. Por 127.0.0.1: API 54321 HTTP 404, Studio 54323 HTTP 307, correo 54324 HTTP 200 y PostgreSQL 54322 TCP correcto. IP Wi-Fi sigue 192.168.1.236. Se deja el stack encendido para repetición humana; no detener hasta confirmación de finalización.

Prueba externa TCP 54322: **PENDIENTE**, sin acceso disponible a un segundo dispositivo autorizado desde las herramientas de esta sesión. No se sustituye por petición desde el host, contenedor del mismo host ni navegador. Desde OTRO equipo Windows de la misma LAN ejecutar `Test-NetConnection -ComputerName 192.168.1.236 -Port 54322 -InformationLevel Detailed` y entregar RemoteAddress, RemotePort y TcpTestSucceeded, indicando origen y hora. Se espera False con el servicio local activo; True confirma exposición y exige detener/revertir la regla según el plan. Un resultado negativo acredita solo el trayecto/dispositivo ensayado. Repetición HTTP externa 54321/54323/54324 y evaluación final pendientes. Guard intacto y TASK-H0-004 sin iniciar.

## Resultado humano de ronda 2 y limitación aceptada para el informe

El usuario confirmó que las tres URLs de 54321, 54323 y 54324 completaron con timeout después de la recreación. El stack se mantuvo encendido durante esa ronda. Posteriormente indicó que no será posible la prueba externa TCP de 54322 y pidió continuar sin ella. Se registra **NO VERIFICADA / OMITIDA POR INDICACIÓN HUMANA**, no PASADA. Esta indicación permite continuar el informe con evidencia parcial; no se interpreta como autorización para modificar el guard, aceptar definitivamente el firewall ni avanzar TASK-H0-004.

Las dos rondas aportan evidencia de inaccesibilidad HTTP desde el celular para API, Studio y correo, con loopback operativo y persistencia tras recreación. No demuestran aislamiento externo de PostgreSQL ni IPv6, ni satisfacen la condición previa de cuatro puertos externos comprobados. DEF-H0-001 sigue confirmado/abierto; no se reclasifica como falso positivo del guard.

Terminadas las pruebas disponibles se detuvo el stack con el script local. La regla autorizada del ensayo se conserva sin modificaciones; no hay fallo de aislamiento observado en estas rondas que active reversión automática. Su conservación no implica adopción definitiva.

### Propuesta para decisión humana, no implementada

La evidencia permite evaluar un criterio alternativo de aislamiento efectivo por firewall en este equipo, pero todavía no justifica reemplazar el guard actual. La propuesta mínima, si se desea continuar con la cobertura incompleta, es registrar primero una decisión humana explícita que acepte la limitación de 54322/TCP e IPv6 y revise el diseño aprobado. Solo esa decisión podría autorizar una propuesta de ajuste del guard que verifique la regla exacta habilitada, sus filtros y perfiles antes de iniciar, conserve rechazo ante regla ausente/alterada y mantenga el comportamiento estricto como opción predeterminada. Esta verificación de configuración no prueba por sí misma el aislamiento de red ni detecta automáticamente todos los cambios posteriores del host. No se introduce este ajuste ni una opción de excepción en el código actual.

Alternativa conservadora: conservar el bloqueo y el guard hasta poder completar la comprobación independiente. No se elige ninguna de las dos alternativas automáticamente. No hay acceptance, merge ni continuación de construcción en esta ejecución.

```text
CHG-H0-001: CONTROLLED TEST COMPLETED WITH LIMITATIONS — FINAL DECISION PENDING
LAN HTTP 54321/54323/54324: HUMAN-CONFIRMED TIMEOUTS, BEFORE/AFTER RECREATION
LAN TCP 54322: NOT VERIFIED — OMITTED AT USER REQUEST
DEF-H0-001: CONFIRMED / OPEN
H0 IMPLEMENTATION: BLOCKED (PARTIAL)
ACCEPTANCE: BLOCKED
```
