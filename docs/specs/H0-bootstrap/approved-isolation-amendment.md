# CHG-H0-001 — Decisión final y enmienda autorizada

Fecha: 21/10/2026. Decisor: usuario/revisor humano de esta conversación. Decisión explícita posterior a las rondas documentadas en controlled-network-test.md.

**CHG-H0-001: ACCEPTED. DEF-H0-001: RESOLVED BY APPROVED MITIGATION.**

La persona considera suficiente para H0 la evidencia de loopback operativo y timeout externo de 54321/54323/54324 antes y después de recreación, junto con la regla exacta habilitada. No hubo cambios de Docker Desktop, WSL ni daemon global.

**54322/TCP: NO VERIFICADO DE FORMA INDEPENDIENTE.** Riesgo residual aceptado expresamente para H0 local sin datos reales: regla sobre el mismo rango TCP 54320–54324, tres servicios comprobados externamente y persistencia tras recreación. IPv6 no se ensayó externamente; no se afirma aislamiento universal. No se afirma que Docker se haya enlazado exclusivamente a loopback.

Esta enmienda complementa DES-H0-004/010 sin reescribir el Spec histórico aprobado. Guard autorizado: admitir loopback estricto o publicaciones globales TCP del rango aprobado con regla efectiva exacta `PERUMAR-H0-Block-NonLoopback`, habilitada, bloqueo entrante, todos los perfiles y filtros aprobados. Debe rechazar regla ausente, deshabilitada o alterada y detener el stack si no hay condición válida. Consulta de política efectiva y perfiles; ningún cambio automático de firewall. Fuera de Windows solo se admite loopback estricto. La verificación ocurre al operar el script, no es monitorización continua de cambios administrativos posteriores.

Se autoriza completar TASK-H0-003, repetir pruebas afectadas y continuar las tareas siguientes en el orden original. Esto no es aceptación de H0, no sustituye TEST-H0-012/014 y no autoriza acceptance.md, Gate 2, merge a main ni H1.
