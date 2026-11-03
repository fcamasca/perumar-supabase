# H3 — Gate 1: aprobación humana del Spec

Fecha: 22/10/2026 (America/Lima). Decisor: usuario/revisor humano de esta conversación.

Declaración humana: «Gate 1 de H3 fue aprobado humanamente sobre: 551cd00ed2957178400dca8fe9d945cf3f9e8d20. Queda autorizada la construcción de H3 conforme exactamente a ese Spec».

**H3 SPEC: APPROVED HUMANLY** sobre el SHA exacto `551cd00ed2957178400dca8fe9d945cf3f9e8d20`, rama feature/h3-enrollment-spec. OQ-H3-001…008 resueltas, incluido el ajuste de cuatro catálogos. Working tree limpio y commit aprobado existente comprobados antes del registro.

Los cuatro documentos aprobados se conservan íntegros, incluidos sus estados históricos de bloqueo previo. Este registro posterior levanta Gate 1 exclusivamente para su alcance. Siguiendo H2, crear feature/h3-enrollment desde el commit exacto aprobado e incorporar después este registro documental, sin partir de main posterior.

Se autoriza construcción y validación progresiva TASK-H3-002…020. EVOL-001/002 y H4+ excluidos. Gate 2, pruebas humanas, acceptance e integración a main requieren decisión independiente; este registro no las aprueba.


## Enmienda posterior registrada

[CHG-H3-001 — Ocupación](approved-occupation-amendment.md), solicitada por la persona el 28/10/2026: catálogo OCUPACION, búsqueda y detalle OTROS. Es un cambio funcional autorizado después del SHA aprobado; no formaba parte del Gate 1 original. La enmienda registra alcance, implementación y evidencia por separado, sin alterar los cuatro documentos aprobados. Gate 2 sigue pendiente e incluye su revisión humana.


[CHG-H3-002 — Modalidad de Carrera opcional](approved-career-modality-amendment.md), solicitud humana del 02/11/2026: modifica la obligatoriedad de una propiedad H2 usada por la construcción H3. Es posterior a la base aprobada, sin reescribir el Spec histórico ni aprobar Gate 2.


## Actualización 02/11/2026 — CHG-H3-003

[Experiencia, modalidad y códigos de operación](approved-career-student-code-amendment.md), por solicitud y aclaración humanas posteriores al Gate 1. Carrera separa experiencia Sí/No (default No) de enseñanza (default Presencial); conserva CON/SIN antiguos como valores inactivos y convierte su significado al flag. Sigla/Nombre arriba, Modalidad/Experiencia en segunda fila. Materia/Carrera conservan codigo técnico nullable fuera de UI y comandos. Alumno incorpora código DB automático e inmutable A-0000001 con secuencia global, sin garantía gapless. Los snapshots históricos no se reescriben.

Migración 20261102020000 aplicada incrementalmente sin reset: huellas y mapeo previo/posterior verificados. Tres regresiones SQL reales con rollback y ocho transacciones concurrentes con códigos únicos pasaron, sin retries ni cambios a registros existentes. Inventario: 22 tablas públicas / 17 RPC / 16 helpers / 25 policies SELECT, más una secuencia privada sin acceso directo de producto. Los documentos aprobados H2/H3 se preservan. Gate 2 permanece pendiente.
