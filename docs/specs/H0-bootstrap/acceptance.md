# H0 — Bootstrap: aceptación humana

**Estado:** ACEPTADO. **Fecha:** 21/10/2026 (America/Lima).

## Decisión y autoría

Decisor: usuario/revisor humano de esta conversación. Declaración explícita posterior a la presentación del candidato y su evidencia: **«H0 aprobado. Gate 2 aprobado.»**

Se registra esa aprobación humana global del resultado y del Gate 2; Codex únicamente documenta y ejecuta la integración autorizada por el proceso. No se inventan identidad adicional, pasos manuales, capturas ni resultados individuales no relatados por la persona. La aprobación no se atribuye a Codex ni a CI.

**Commit candidato aceptado:** `9523e2e0e1b1889dd12ed3902fa3fe23f7c52141`, rama `feature/h0-bootstrap`.

El candidato local y remoto coincidían y el working tree estaba limpio antes del registro. Los cambios posteriores de cierre son exclusivamente documentales: este archivo, estado del PLAN, README y referencia de cierre en la evidencia. No hay cambios técnicos entre el candidato aceptado y su integración.

## Evidencia aceptada

- [Resultados técnicos y recorridos TEST-H0-012/014](technical-results.md): instalación/clon privado, lint, tipos, 62 pruebas, build, configuración negativa, SDK/Data API local, ausencia de dominio e inicio/parada/reset.
- [CI exitosa del candidato exacto](https://github.com/fcamasca/perumar-supabase/actions/runs/39708665414).
- [CI negativa deliberada](https://github.com/fcamasca/perumar-supabase/actions/runs/39708077807): fallo esperado de configuración y parada del stack; no corresponde a la rama aceptada.
- Confirmación humana global de H0 y Gate 2 recibida después de presentar los recorridos y evidencia. No se sustituye por una supuesta ejecución humana de Codex. El detalle individual de TEST-H0-012/014 no fue descrito por separado en el mensaje de aprobación; se conserva esa limitación de granularidad documental.
- [Enmienda CHG-H0-001 aprobada](approved-isolation-amendment.md) y [pruebas humanas de red](controlled-network-test.md).

## Mitigación y límites conservados

CHG-H0-001: ACCEPTED. DEF-H0-001: RESOLVED BY APPROVED MITIGATION. La mitigación es aislamiento efectivo mediante la regla exacta de Windows Firewall; no se afirma que Docker publique exclusivamente en loopback. El guard verifica loopback estricto o la política efectiva aprobada y falla de forma segura si no puede acreditar ninguna condición; no administra firewall automáticamente.

**54322/TCP: NO VERIFICADO DE FORMA INDEPENDIENTE.** Riesgo residual aceptado explícitamente para H0 local sin datos reales. IPv6 externo no se ensayó. Se conserva la limitación y no se transforma una prueba omitida en una prueba pasada.

Sin autenticación ni autorización funcional de H1, objetos o datos de negocio, proyecto Supabase alojado, hosting ni deployment. H0 no representa un sistema productivo. Las OQ de Gate 1 y owner están resueltas. El stack local quedó detenido al entregar el candidato; la regla aprobada permanece habilitada.

## Cierre e integración autorizada

TASK-H0-009 se ejecuta después de esta decisión: registrar aceptación, marcar H0 ACEPTADO en PLAN e integrar la rama de implementación a main, publicando sin force push. La rama Spec no se integra por separado. La integración incluye el candidato y el cierre documental, y se verifica su descendencia y coincidencia local/remota.

Esta aprobación corresponde exclusivamente a H0. **H1 no iniciado ni autorizado por este cierre.**
