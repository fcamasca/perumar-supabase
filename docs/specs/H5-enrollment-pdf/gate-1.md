# H5 — Ficha de matrícula PDF: Gate 1 aprobado humanamente

Fecha: **12/11/2026 (America/Lima)**. Decisor: usuario/revisor humano de esta conversación.

Declaración: «Apruebo Gate 1 H5 sobre el SHA `9804bb07063590e8917fc86d07995c474b84e718` y autorizo iniciar la construcción H5 conforme al Spec aprobado».

**Gate 1 APROBADO HUMANAMENTE** sobre `9804bb07063590e8917fc86d07995c474b84e718`, rama `feature/h5-enrollment-pdf-spec`. Working tree limpio, SHA existente y CI [43294645122](https://github.com/fcamasca/perumar-supabase/actions/runs/43294645122) COMPLETED / SUCCESS verificados. Base main H4 integrado: `2789c12ca80f1f5b3e9ee3ef33a6e50ecfea52a1`.

OQ-H5-001…004 RESUELTAS HUMANAMENTE: datos personales/domicilio/contactos/etiquetas desde alumno_snapshot; Ciclo/Curso/promoción/patrocinador actuales; edad a matricula.created_at y emisión real en Lima. Libro/Folio/Registro, foto, firma/huellas visibles y vacíos, sin campos inventados. PDF privado temporal 24 h; almacenamiento permanente queda para H6. Generación/descarga solo ACTIVO + Ciclo PROGRAMADO/EN_CURSO/CERRADO; matrícula ANULADA o Ciclo DESIERTO/ANULADO bloquean también descargas de artefactos preexistentes.

Los cuatro documentos aprobados permanecen idénticos al SHA indicado, incluidos sus estados históricos. Este registro posterior autoriza TASK-H5-002…020 según dependencias y con spike mínimo real Edge antes de Storage/UI. Crear `feature/h5-enrollment-pdf` desde el SHA aprobado e incorporar este registro, siguiendo el patrón H3/H4. Registrar el SHA efectivo de inicio en implementation-log.md.

No se presume suficiencia de Edge ni validación hospedada. Si requiere otra arquitectura o no resulta suficiente, detener expansión y reportar a GATE-A01 humano; no añadir Lambda/WebFlux/Node permanente/colas/AWS. No resetear datos humanos ni copiar PII de la referencia a fixtures/logs.

**Gate 2 H5, acceptance, merge a main, cierre H5, GATE-A01 e inicio H6 NO AUTORIZADOS.** Entregar candidato técnico y evidencia real, sin inventar pruebas humanas, CPU/memoria no medidas ni aprobaciones.
