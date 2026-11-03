# CHG-H3-005 — Matrícula dentro de Ciclo, grilla única y panel lateral

Fecha: 02/11/2026 (America/Lima). Decisor: usuario/revisor humano de esta conversación.

**CAMBIO UX AUTORIZADO POR SOLICITUD HUMANA, IMPLEMENTADO. GATE 2 PENDIENTE.**

## Autoridad y relación documental

Después de revisar el registro continuo por Ciclo, la persona aprobó mover Matrícula a la ficha de Ciclo y separar búsqueda/registro de la grilla de matriculados: «ok haz el cambio, revisa la documentación q afecta y regulariza». Se implementa la propuesta aceptada de una sola grilla y un panel lateral para matricular individualmente.

Sustituye la ubicación/navegación de registro de CHG-H3-004 y el Stepper histórico de REQ-H3-019/DES-H3-019 aprobado en `551cd00ed2957178400dca8fe9d945cf3f9e8d20`. Conserva su búsqueda por palabras y todas las reglas DB. Los cuatro documentos aprobados H3 y el cierre/Spec H2 se mantienen íntegros; tampoco se reinterpreta el documento fuente Historias_de_Usuario. Las referencias antiguas a Registrar Matrícula se leen con el recorrido vigente documentado aquí. No aprueba Gate 2 ni modifica H4+/EVOL-001/002.

> **Panel simplificado por [CHG-H3-006](approved-quick-add-amendment.md).** Sus pasos de selección/cargos/confirmación son antecedentes: el recorrido actual es Buscar → Agregar directamente → editar datos individuales desde la grilla. Contexto de Ciclo, grilla e historia se conservan.

## Recorrido anterior

1. Abrir un Ciclo existente. Pestañas Datos / Materias / Matrículas / Estado. Un Ciclo todavía no guardado mantiene Datos/Materias.
2. Matrículas muestra **Alumnos matriculados · cantidad**, filtro **Filtrar matriculados…** y botón **+ Matricular alumno**. No exige entrar a Editar Ciclo. Cambios de Datos pendientes bloquean registro hasta guardar/cancelar; terminales permiten consulta solamente.
3. Grilla única: Alumno, Documento, Código de matrícula, Estado y Ver matrícula. Incluye activas/anuladas conservando historia. Orden por registro descendente con desempate ID, paginación de 30 y total exacto dentro de RLS. El filtro busca únicamente alumnos relacionados con matrículas de ese Ciclo, por apellidos/nombres/documento/código de Alumno. No es búsqueda de candidatos.
4. Matricular alumno reconsulta el Ciclo y abre un panel lateral con Ciclo fijo y título **Matricular alumno en [código]**. Busca candidatos mientras se escribe (mínimo dos caracteres, pausa 300ms, máximo veinte), con los filtros de CHG-H3-004. Las coincidencias son una lista compacta con Seleccionar, nunca otra grilla de alumnos.
5. Elegir candidato consulta su ficha completa y comprueba la existencia de cualquier matrícula en el mismo Ciclo, incluida anulada, antes de habilitar el registro. La restricción UNIQUE y validación transaccional DB siguen resolviendo duplicados/carreras concurrentes. No se reactiva una matrícula anulada ni se libera el par.
6. La lista se reemplaza por alumno elegido, patrocinador opcional, cargos y confirmación individual. No hay pestañas/Stepper dentro del panel ni selector de Ciclo. Cambiar alumno limpia patrocinador, opcionales, descuento/motivo y código manual para evitar trasladarlos.
7. Confirmar utiliza registrar_matricula existente con versiones de Ciclo/Alumno y la misma autoridad DB para permisos, elegibilidad, ficha/contactos, tarifas/importes/descuento, código, snapshot y auditoría. Solo Director ve el descuento. No escritura parcial de matrícula/cargos ni registro por lotes.
8. Éxito cierra panel, muestra código registrado y refresca la grilla conservando Ciclo, filtro y página. El botón queda listo para otro alumno con un borrador nuevo; no se trasladan opciones individuales. Si el filtro excluye al recién registrado, el aviso de éxito permanece visible y puede limpiarse el filtro.
9. Cancelar/cerrar/Escape sin operación pendiente descarta el borrador y vuelve a la misma grilla. Mientras se confirma, se bloquea cierre/cancelación/Escape. Error/conflicto/respuesta incierta conserva el panel y no reintenta silenciosamente.

## Ficha de Alumno, foco y rutas

Nuevo Alumno y Completar/editar ficha siguen siendo formularios completos fuera del panel lateral: el panel se retira temporalmente, se oculta la grilla y se conserva el borrador de matrícula; guardar/cancelar vuelve al mismo Ciclo/panel. El Stepper de nuevo Alumno no cambia. La ficha de Alumno conserva su pestaña Matrículas como historial y enlaces a detalles.

El panel usa dialog nativo modal, título accesible, foco inicial y devolución al botón Matricular, fondo inerte y comportamiento Escape controlado por operación pendiente. La ficha completa de Alumno no se convierte en modal. Teclado/temas/forced-colors/SO reales quedan para validación humana.

Se retira Matrícula del menú principal para evitar recorridos duplicados. `/matriculas/nueva` conserva compatibilidad mediante redirección protegida a `/academico/ciclos`. `/matriculas/:id` conserva detalle, edición/anulación permitidas y fotografía histórica; añade Volver a matrículas del Ciclo. El destino `/academico/ciclos?ciclo=[UUID]&seccion=matriculas` abre esa ficha en Matrículas, aunque el Ciclo no figure en la primera página de la lista. No se elimina ni reescribe historia de matrícula.

## Arquitectura y regularización

Solo React/presentación/lecturas con el cliente ordinario y RLS. Se reutilizan registrar_matricula y el detalle existente; no hay migraciones, tablas, RPC, helpers DB, policies, grants ni dependencias nuevas. La grilla usa relación matricula → alumno con filtro por Ciclo y búsqueda referenciada; no descarga toda la tabla Alumno para filtrar localmente.

Documentos afectados: este registro y Gate 1 como enlace posterior; CHG-H3-004 marcado como antecedente sustituido en ubicación/navegación; human-test-guide con recorrido vigente; implementation-log/technical-results con evidencia; README con entradas operativas H3. Requisitos/diseño/tasks/test-plan aprobados, acceptance H2 y fuente histórica permanecen sin cambios.

Pruebas: una sola grilla frente a lista de candidatos, filtro por relación/Ciclo, ciclo fijo, confirmación única y refresco, siguiente alumno limpio, cancelación sin escritura, cierre bloqueado durante RPC pendiente, conflicto sin retry, terminales/roles/borradores pendientes, alumno con matrícula anulada y alta completa de Alumno fuera del panel. Evidencia final en implementation-log. Pruebas humanas y Gate 2 pendientes.
