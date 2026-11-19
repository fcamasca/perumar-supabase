# H6 — Expediente y documentos institucionales: aceptación y cierre

Fecha: **19/11/2026 (America/Lima)**. Decisor: usuario/revisor humano de esta conversación.

**H6 CLOSED / ACEPTADO. Gate 2 APROBADO HUMANAMENTE.** Integración autorizada mediante PR y merge commit, preservando candidatos, enmiendas y evidencia. **H7 NO INICIADO; no crear rama H7.**

## Gates y alcance aceptado

- Spec aprobado Gate 1: `e2de23443f887d4050aeb910a13e3611ae751be5`, CI [44399674178](https://github.com/fcamasca/perumar-supabase/actions/runs/44399674178) SUCCESS; [Gate 1](gate-1.md). Los cuatro documentos requirements/design/tasks/test-plan se conservan byte a byte.
- Candidato exacto del Gate 2 original: `ca7a4613e5e8f23d6942b2cb6f75309816f04f12`, CI [44443096743](https://github.com/fcamasca/perumar-supabase/actions/runs/44443096743) SUCCESS, **483/483 pruebas técnicas PASSED**; [Gate 2](gate-2.md).
- Autorización humana posterior: **«Incluir los ajustes revisados: publicar un nuevo candidato, verificar su CI y cerrar sin repetir pruebas humanas.»** Incluye `126071206524a1a4d1efffab3438fd5bc1086ef2` (formatos institucionales/vista previa), `cc38fa1eabac8607aee4dcf38d3e4771fc739ccf` (fotos, carga/compresión, transporte binario, acciones/estados y sus regresiones) y la corrección de formato de una línea final.
- **Candidato final aceptado para cierre: `f6157e953eb4f307066b16e8b5580b7f09c23f58`**, descendiente de los SHA anteriores. CI [44616848493](https://github.com/fcamasca/perumar-supabase/actions/runs/44616848493) **COMPLETED / SUCCESS**, **524/524 PASSED**, 34 archivos.
- Main previo: `1228a028fc203e0319340b5b55d7d9aa99802760`. Rama de integración: `feature/h6-expediente`.

La autorización posterior acepta los ajustes sin atribuirlos al candidato original ni inventar nuevas ejecuciones humanas. La cronología permanece en [implementation-log.md](implementation-log.md) y la evidencia técnica en [technical-results.md](technical-results.md).

## Evidencia técnica vigente

| Comprobación | Resultado y alcance |
| --- | --- |
| Calidad y unidades | 524/524 PASSED; lint, TypeScript, Deno H5/H6 con locks congelados, build, build-safety y diff-check PASSED |
| DB/API y seguridad | Auth real, JWT/RLS, permisos, IDOR/tampering, DML cliente denegado, auditoría sin PII y conflictos PT409/HTTP409 sin mutación/éxito auditado |
| Contratos y concurrencia H6 | Configuración efectiva, sincronización atómica, obligatorio/opcional, retiro individual/múltiple, versiones/historia, locks y rollback; barreras concurrentes y revocación mientras espera, sin retry oculto |
| Archivos | Edge y Storage privados reales de CI, reserva/confirmación/aborto, PDF/JPEG/PNG, descarga de bytes, compensación y versiones; transporte binario de imágenes y preservación del UUID/historia al renombrar FOTO_ALUMNO |
| Renderers y UX | Cinco formatos institucionales, extremos/multipágina y rasterización independiente; vista previa sintética separada del archivo real; carga/optimización explícita, fotos, acciones accesibles y pendientes/retirados visibles |
| Regresión | H1–H5, pagos 70 + 60 sobre saldo 100, serialización/deadlock reales sin retry, cierre/fotografía final H5, expiración y restauración de perfil |
| Reconstrucción | Base desechable reconstruida desde cero y repetición H1–H6 SUCCESS; sin reset ni borrado de datos humanos locales |

Inventario final: **28 tablas públicas, 5 vistas, 28 funciones públicas, 21 helpers privados, 31 policies públicas SELECT de negocio, 27 migraciones, 2 buckets privados y 4 Edge Functions**. H6 agrega únicamente las cuatro tablas previstas (tres de dominio y una técnica), una vista, ocho RPC, dos helpers, un bucket persistente y tres Edge. La migración adicional FOTO_ALUMNO conserva identidades, archivos, estados e historia; no agrega objetos permanentes. Sin quinta tabla, S3, API generalista, worker, cola, scheduler ni motor editable.

## Evidencia humana

El usuario reportó los siete bloques ejecutados y aprobados: **1)** configuración/sincronización; **2)** carga, reemplazo, descarga e Historia; **3)** generación/revisión visual; **4)** fuente, regeneración e Historia; **5)** retiro opcional individual/múltiple; **6)** roles, estados e Historia; **7)** recuperación, errores, teclado, foco, ancho reducido y temas. **Bloques 1–7: PASSED por reporte humano.**

No se repiten las pruebas. No se inventan navegador/versión, sistema operativo, roles concretos ni subcasos individuales no reportados. Los marcadores de revisión humana pendiente de artefactos sintéticos históricos no sustituyen ni amplían este reporte.

## Residuales preservados

1. Hosted Edge/PostgREST: **NO PROBADO DIRECTAMENTE**; suficiencia hospedada no acreditada por CI local.
2. CPU: **NO MEDIDA**.
3. Memoria: **NO MEDIDA**.
4. Forced-colors real H5/H6: **NO VERIFICADO**, nunca PASSED ni heredado.
5. Bundle >500 kB: advertencia vigente (principal 732.32 kB y vista previa 741.92 kB en build local del paquete final).
6. Limpieza física/manual donde está documentada, incluida la temporal H5; no se acredita automatización.
7. Compatibilidad PDF conservadora; no garantía antimalware ni admisión universal de PDF.
8. Conciliación manual de archivos nunca confirmados.
9. Política definitiva de purga documental diferida a **H9/release**.

Estos residuales no se convierten en PASSED. GATE-A01 conserva **APROBADO CON AJUSTES** y sus límites.

## Integración y detención

El commit de cierre modifica únicamente gate-2.md, acceptance.md, implementation-log.md, technical-results.md y PLAN_MVP.md. Sin cambios de código, migraciones, tests ni Spec aprobado. Su CI propia debe terminar SUCCESS antes del PR/merge; también se exige CI SUCCESS del SHA exacto de main integrado.

**CLOSED / ACEPTADO / INTEGRADO** se hace efectivo en main al incorporar este cierre mediante merge commit y verificar su CI. Los identificadores del cierre, PR, merge y runs se devuelven en la entrega para evitar referencias circulares al propio commit. No se inicia H7 ni se crea su rama. Detenerse tras verificar y reportar la integración.
