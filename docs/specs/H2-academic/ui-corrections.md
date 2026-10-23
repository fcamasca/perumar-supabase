# H2 — Correcciones UI posteriores a TEST-H2-018

> Estado al cierre: **H2 CLOSED**. Gate 2 aprobado humanamente sobre `796a47aa4c1ce21c6cf8c81e9c631a22202bb709`; TEST-H2-018/020 PASSED humanos y TEST-H2-019 completado con riesgo residual aceptado. forced-colors real del sistema operativo no fue verificado manualmente en H2; el usuario aceptó este riesgo en Gate 2. Ver [acceptance.md](acceptance.md). Los pendientes, conteos y estados conservados debajo son históricos; no sustituyen el cierre. H3 NO INICIADO.

## Confirmación humana recibida

El usuario confirmó **TEST-H2-018: PASSED** sobre el candidato exacto `e2f2db9365b4c46fd6932caba3d47a17324ebe29`. Confirmación recibida el 22/10/2026; no se presume fecha de ejecución ni nombre del revisor no proporcionados. Este resultado pertenece a esa revisión humana, no a Codex, y no se extiende automáticamente al candidato corregido.

La misma instrucción autorizó únicamente correcciones UX/UI antes de TEST-H2-019. TEST-H2-019 y TEST-H2-020 permanecen pendientes. Gate 2 no aprobado; sin acceptance, merge ni H3.

## Implementación y trazabilidad

Commit de código probado: `96437d3ca8c22c872748119f4093412fa62f762d`. El candidato final añade el registro documental; su SHA completo y CI se entregan por separado para evitar autorreferencia circular.

| Hallazgo humano | Corrección acotada |
|---|---|
| confirm/prompt y burbujas nativas | Un diálogo propio React para confirmación con motivo opcional; formularios noValidate con feedback inline basado en restricciones HTML existentes. No alert/confirm/prompt en flujos académicos. |
| Inactivación imposible pedía pasos previos | Consulta de relaciones y referencias actuales antes del diálogo; si falta otra Materia activa, indica Carrera con código/nombre y cómo corregir. Fallo de consulta no solicita motivo ni escribe. Es ayuda UX; PostgreSQL conserva validación final concurrente. |
| Acciones inmediatas inconsistentes | Reactivar Materia/Carrera y retirar/reactivar relación Ciclo–Materia requieren confirmación. No se inventó motivo obligatorio; solo inactivaciones ya aprobadas lo exigen. Abrir/consultar/descartar no requieren confirmación. |
| Referencias ambiguas | Código — nombre en selección/asociación de Materias, precarga, adicionales, Carrera seleccionada y advertencias. Identidades UUID/FK intactas. |
| Materias del Ciclo poco visibles | Bloque integrado al formulario de Ciclo con origen, estado, motivo y acción explícita; retiro sigue sin DELETE ni reactivación por sincronización. |
| Límites silenciosos | Máximos visibles 30/150/500/10, contador de descripción y promoción 150. maxLength conservado; sin truncado propio de entradas. |
| Mensajes genéricos de campos inexistentes | Errores por entidad; duplicados conocidos distinguen código/nombre/sigla mediante mapeo cerrado, sin exponer constraint/SQL. Mínimos, catálogo, conflicto y superposición con textos propios. Seguridad sigue genérica. |
| Sigla sugerida | Iniciales de varias palabras o nombre normalizado de una palabra, uppercase alfanumérico y máximo 10. Editable; modificación manual detiene sugerencias. Edición de Carrera persistida no recalcula. UNIQUE sigue en DB. |
| Propagación sin aviso | Antes de guardar nuevas asociaciones, consulta Ciclos PROGRAMADO/EN_CURSO y advierte cantidad asociada, adición solo faltantes, no reactivación/reclasificación ni cambios terminales. Cantidad orientativa, no reserva de estado concurrente. |
| Cambio Carrera/sigla | Advertencias existentes trasladadas al mismo diálogo propio; reglas intactas. |
| Presentación básica | Jerarquía, espacio, anchuras, formularios, tablas, botones secundarios, feedback y bloque de relaciones mejorados con tokens existentes; sin librería ni framework nuevo. |

El diálogo tiene nombre/descripción accesibles, foco inicial en Cancelar, contención Tab/Shift+Tab y focusin, fondo inert con restauración de su estado previo, Escape y retorno de foco al cerrar. Motivo vacío presenta error y enfoca textarea después de renderizar. Estilos usan paletas existentes y forced-colors. La validación/formato se muestra dentro de la aplicación con campos aria-invalid y descripción del error; no sustituye validadores de servidor.

## Pruebas y resultados técnicos

Entorno local Windows, Node 24.19.0/npm 10.9.0; stack de desarrollo existente, guard habilitado. Comandos ejecutados mediante los scripts npm o su mismo entrypoint Node:

| Comando | Resultado |
|---|---|
| `npm run lint` | PASSED |
| `npm run typecheck` | PASSED |
| `npm test` | PASSED: 106 pruebas / 9 archivos |
| `npm run build` | PASSED; JS 518.25 kB, gzip 148.32; CSS 5.34 kB, gzip 1.71 |
| `npm run test:build-safety` | PASSED; configuración privilegiada rechazada sin canario en salida/bundle |
| `npm run supabase:start` | PASSED; mitigación Firewall aprobada, sin modificar configuración |
| `npm run test:local` | PASSED; API pública e inventario/grants/RLS/helpers/RPC exactos |
| `npm run test:security` | PASSED: 14 escenarios; ocho actores limpiados y roles restaurados |
| `npm run test:academic` | PASSED: 11 grupos DB/API; ocho actores limpiados; verificaciones Matrícula/Facturación DEFERRED |
| `npm run supabase:reset` + `npm run test:local` | PASSED; referencias/roles y esquema reiniciados sin fixtures de negocio |
| `npm run supabase:stop` | PASSED; stack detenido |

Se añaden 17 pruebas respecto de las 89 anteriores. Cubren diálogo accesible, foco y fondo, Escape/cancelación, motivo vacío/confirmado, prevalidación de última activa, reactivaciones sin motivo inventado, límites/contador/required inline, errores específicos seguros, código+nombre, sugerencia manual/persistida, formato de sigla, advertencias de propagación/sigla/Carrera, OTRO antes de confirmación y ausencia de llamadas nativas. Las pruebas previas de permisos y conflicto se conservan.

Defecto de esta corrección: una ejecución mostró foco en Cancelar al presentar motivo obligatorio vacío (104 passed/1 failed). Se corrigió enfocando el motivo después de renderizar el mensaje; repetición completa: 106 PASSED. No se relajó la prueba. No se atribuyen pruebas humanas ni conformidad WCAG/SO a estas comprobaciones DOM.

## Alcance preservado y limitaciones

Sin cambios en migraciones, modelo DB, SQL/RPC, RLS/grants, auditoría, roles, sincronización, estados, catálogo, optimistic concurrency ni no DELETE. Sin dependencias nuevas ni cambios en lockfile/configuración del host. Los cuatro archivos del Spec aprobado y el histórico H0/H1 permanecen intactos; PLAN no se marca completado.

No se identificó un hallazgo de esta lista que requiriera modificar el Spec. Las precomprobaciones y cantidades son una fotografía orientativa y no garantizan el resultado frente a concurrencia; DB/RPC permanece autoridad. La advertencia de tamaño del bundle continúa sin ocultarse. Persisten riesgos documentados H0/H1 y snapshot de referencias.

Pendiente de persona: revisión de las correcciones en el candidato nuevo, TEST-H2-019 (paletas, teclado/foco reales y forced-colors) y TEST-H2-020 (mantenibilidad/arquitectura). El PASSED humano anterior de TEST-H2-018 no se reescribe ni se considera aceptación del candidato nuevo. Seguir human-test-guide.md, verificando especialmente cancelación/confirmación, viabilidad, mensajes, sigla sugerida, propagación y referencias antes de Gate 2.

**UI CORRECTIONS: COMPLETE**  
**LOCAL TECHNICAL TESTS: PASSED**  
**HUMAN TEST-H2-018: PASSED ON PREVIOUS EXACT CANDIDATE**  
**HUMAN TEST-H2-019/020: PENDING**  
**GATE 2 / ACCEPTANCE / MERGE: BLOCKED**  
**H3: NOT STARTED**
