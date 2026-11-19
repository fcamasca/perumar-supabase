# H6 — Expediente y documentos institucionales: Gate 2

Fecha de registro: **19/11/2026, America/Lima**. Decisor: usuario/revisor humano de esta conversación.

**H6 Gate 2 — APROBADO HUMANAMENTE**, exclusivamente sobre el candidato exacto:

`ca7a4613e5e8f23d6942b2cb6f75309816f04f12`

## Trazabilidad y evidencia técnica

- Spec aprobado Gate 1: `e2de23443f887d4050aeb910a13e3611ae751be5`; [registro Gate 1](gate-1.md).
- CI del candidato: [44443096743](https://github.com/fcamasca/perumar-supabase/actions/runs/44443096743), **SUCCESS**.
- Pruebas técnicas del candidato: **483/483 PASSED**. No confundir esta cifra con verificaciones locales posteriores.
- Evidencia y enmiendas en [technical-results.md](technical-results.md) e [implementation-log.md](implementation-log.md).
- Los cuatro documentos históricos requirements/design/tasks/test-plan permanecen inalterados.

## Evidencia humana reportada

El usuario declara ejecutados y aprobados sobre ese candidato los siguientes bloques:

| Bloque | Resultado humano |
| --- | --- |
| 1. Configuración documental y sincronización con matrículas | PASSED |
| 2. Carga, reemplazo, descarga e Historia | PASSED |
| 3. Documentos generados y revisión visual funcional | PASSED |
| 4. Fuente, regeneración e Historia | PASSED |
| 5. Retiro opcional individual/múltiple | PASSED |
| 6. Roles, estados académicos e Historia | PASSED |
| 7. Recuperación, errores, teclado, foco, ancho reducido y temas | PASSED |

**No repetir las pruebas humanas.** No se inventan ejecuciones individuales de subcasos, roles probados, navegador/versión ni entorno no especificados en esta aprobación. La decisión humana no acredita pruebas hospedadas ni mediciones de recursos.

## Residuales preservados

- Hosted Edge/PostgREST: **NO PROBADO DIRECTAMENTE**.
- CPU: **NO MEDIDA**.
- Memoria: **NO MEDIDA**.
- Forced-colors real H5/H6: **NO VERIFICADO**, nunca PASSED.
- Bundle >500 kB: advertencia vigente.
- Limpieza física/manual donde ya está documentada; no se acredita automatización.
- Compatibilidad PDF conservadora.
- Conciliación manual de archivos nunca confirmados.
- Política definitiva de purga documental diferida a H9/release.

Estos residuales permanecen visibles y no se convierten en PASSED.

## Diferencia de alcance detectada antes del cierre

Al registrar la aprobación, `feature/h6-expediente` está en `126071206524a1a4d1efffab3438fd5bc1086ef2`, que añade cambios funcionales de formularios y vista previa después del candidato aprobado. Existen además cambios funcionales locales sin commit: foto/última foto por alumno, migración FOTO_ALUMNO, carga/optimización/compresión, transporte binario, iconos, filtros/estados y otros ajustes documentados.

La aprobación exacta de `ca7a461...` no se amplió automáticamente. Consultado el alcance, el usuario autorizó expresamente: **«Incluir los ajustes revisados: publicar un nuevo candidato, verificar su CI y cerrar sin repetir pruebas humanas.»** Esta decisión posterior incluye el commit `1260712...` y los ajustes locales descritos, sujetos a CI propia SUCCESS antes del cierre e integración. No atribuye nuevas ejecuciones humanas ni cambia los residuales.

El nuevo candidato y su CI exacta se registrarán en acceptance.md después de verificarlos. Cierre documental, CI propia, PR y merge commit trazable están autorizados; INTEGRADO solo se hace efectivo al incorporar el cierre a main y verificar su CI. **H7 NO INICIADO; no crear rama H7.**
