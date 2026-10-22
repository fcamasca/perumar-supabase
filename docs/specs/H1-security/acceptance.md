# H1 — Seguridad base: aceptación y cierre

Fecha: **22/10/2026 (America/Lima)**.
Decisor: usuario/revisor humano de esta conversación.
Estado: **ACEPTADO — Gate 2 APROBADO HUMANAMENTE**.

## Candidato y Gate 1

- Candidato aceptado exacto: `7c15f6c382c43b08b900f00a793fd590205ab618`, rama `feature/h1-security`.
- Spec aprobado en Gate 1 el 21/10/2026: `3cf847451690d320f1fce39b2992f8a2e53be925`.
- [Registro de Gate 1](gate-1.md): commit documental `3283305b51ec3c833786458c20163ae98281e636` en la rama Spec, incorporado a implementación como `902704b` después de crearla desde el Spec exacto.
- Main previo al cierre: `93399eefe118488d0e2f497ba29a3075098a32bd`.
- Los cuatro documentos del Spec aprobado permanecen sin modificaciones. Gate 1 autorizó construcción; la presente decisión humana independiente autoriza aceptación e integración.

## Pruebas técnicas

La [evidencia de construcción](implementation-log.md) detalla commits, comandos, resultados, defectos y correcciones dentro del Spec.

| Comando o comprobación | Resultado registrado |
|---|---|
| `npm ci`, lint y typecheck | PASSED |
| `npm test` | PASSED: 77 pruebas, seis archivos |
| `npm run build` y `npm run test:build-safety` | PASSED |
| `npm run supabase:reset` y `npm run test:local` | PASSED, también confirmados por el revisor al finalizar |
| `npm run test:security` | PASSED: 14 escenarios; repetición final confirmada por el revisor |
| `npm run test:expiry` | PASSED: expiración real, renovación, restauración y límite de JWT residual; configuración temporal restaurada |
| Reproducción desde clon privado | PASSED según registro técnico |
| Cleanup técnico y eliminación de fixtures | PASSED |
| `npm run supabase:stop` | Completado, confirmado por el revisor |

[CI completa del candidato aceptado](https://github.com/fcamasca/perumar-supabase/actions/runs/39724302206): SUCCESS sobre `7c15f6c382c43b08b900f00a793fd590205ab618`.

[Ensayo negativo de autorización](https://github.com/fcamasca/perumar-supabase/actions/runs/39723487260), sobre `49312c475b6f4781583abc2c6d5bc71dc703b338`: fallo esperado al dar ADMIN temporalmente a O y detectar directorio ampliado en una petición ordinaria. Se retiró la alteración, se limpiaron fixtures y se eliminó la rama temporal. No es un fallo pendiente del candidato.

Este cierre documental no vuelve a ejecutar ni se atribuye las pruebas humanas: registra los resultados ya presentados y confirmados. No introduce cambios técnicos posteriores al candidato aceptado.

## Pruebas humanas y Gate 2

El usuario declaró explícitamente: **“H1 — Gate 2 APROBADO por revisión humana”** y aceptó el candidato exacto indicado arriba.

| Verificación humana confirmada por el usuario | Resultado |
|---|---|
| TEST-H1-018, recorrido de ejecución/sesión/acceso | PASSED |
| TEST-H1-019, revisión de seguridad y mantenibilidad Auth/RLS | PASSED |
| Matriz A/B/O/M/N/F/I | Validada |
| Cambio de identidad M → O | Sin fuga de estado |
| Logout y restauración | Validados |
| Fixtures humanos | Eliminados correctamente |
| Reset, test:local, test:security y cleanup finales | PASSED |
| Stack detenido y working tree del candidato | Confirmados: detenido y limpio |
| TEST-H1-020, decisión final humana | Gate 2 APROBADO |

Codex únicamente registra esta confirmación humana y ejecuta el cierre autorizado. No se atribuye la realización ni la aprobación de los recorridos humanos.

## Limitaciones y riesgos aceptados

Un JWT ya emitido puede permanecer criptográficamente vigente hasta su expiración. La autorización efectiva se reevalúa contra PostgreSQL/RLS; logout no implica invalidación criptográfica instantánea de una copia del token. El usuario aceptó expresamente este comportamiento documentado.

Se conservan los límites y riesgos descritos en la evidencia del Spec: entorno exclusivamente local, roles de validación ADMIN/OPERADOR, helper privilegiado acotado, unión de policies y exposición de tokens del SDK ante XSS. H1 no constituye administración completa de usuarios ni auditoría productiva.

La mitigación CHG-H0-001 permanece aceptada sin cambios: aislamiento efectivo mediante la regla aprobada de Windows Firewall, sin afirmar binding Docker exclusivo a loopback. **54322/TCP: NO VERIFICADO DE FORMA INDEPENDIENTE**; no se declara una nueva comprobación externa en H1.

No hay defectos ni preguntas abiertas bloqueantes registrados para el cierre de H1.

## Cierre autorizado y límites

TASK-H1-001 a TASK-H1-008 quedan completadas con la evidencia técnica y la confirmación humana. TASK-H1-009 registra esta aceptación, actualiza PLAN/estado documental y realiza la integración de `feature/h1-security` a main mediante merge con trazabilidad, sin integrar la rama Spec por separado.

El commit de cierre solo modifica este archivo, PLAN, README y la nota histórica del registro de construcción. Implementación, migraciones, RLS, frontend y Spec aprobado permanecen idénticos al candidato aceptado. Los SHA del cierre y del merge se obtienen de Git y se presentan al usuario al finalizar, evitando una referencia circular al propio commit.

**H2: NO INICIADO.** No se genera su Spec ni se construye funcionalidad de H2 en este paso. La aceptación de H1 no autoriza anticipadamente otro hito.
