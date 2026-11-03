# CHG-H3-006 — Buscar y Agregar; edición individual desde la grilla

Fecha: 02/11/2026 (America/Lima). Autoridad: usuario/revisor humano de esta conversación.

**CAMBIO UX AUTORIZADO POR SOLICITUD HUMANA, IMPLEMENTADO. GATE 2 PENDIENTE.**

La persona descartó el panel con cargos y confirmación y precisó: «la busqueda q me muestre el listado de resultados y agregar, eso lo pasa a la grilla de los matriculados en acciones que registre lo que falte». Esta enmienda sustituye exclusivamente el paso de selección/revisión/confirmación del panel de CHG-H3-005. Conserva Ciclo como contexto, grilla única, filtro de matriculados, historial y transacción DB. No reescribe el Spec aprobado ni atribuye el cambio al Gate 1 original.

## Recorrido vigente

- Ciclo → Matrículas → Matricular alumno abre un buscador simple: resultados y botón **Agregar** por alumno. No selecciona un alumno para mostrar más opciones, ni ofrece Cargos/Resumen/Confirmar adicionales.
- Agregar ejecuta inmediatamente registrar_matricula para ese alumno/Ciclo, con versiones recién consultadas; opcionales vacíos y patrocinador nulo. DB genera código y snapshot, obtiene tarifas obligatorias y calcula cargos/descuento cero. Un texto breve deja claro que Agregar registra matrícula con cargos obligatorios.
- Solo tras éxito DB se actualiza la grilla. Se quita el alumno agregado de los resultados y el buscador sigue abierto, listo para agregar otros. No hay fila local ficticia de matriculado ni matrícula incompleta/borrador; no existe una etapa posterior para completar obligatorios del registro.
- Se excluyen candidatos con cualquier matrícula previa en el Ciclo, incluidas anuladas, consultando solo los IDs de los veinte candidatos actuales. La unicidad DB sigue resolviendo duplicados concurrentes.
- Ficha/contactos y configuración obligatoria siguen siendo requisitos DB. Si fallan, no se agrega a la grilla; se muestra el error y acceso a completar la ficha cuando corresponde. No se relajan constraints ni permisos para permitir un registro parcial.
- Cierre/Escape y navegación a Nuevo Alumno se bloquean mientras Agregar está pendiente. Error/conflicto no reintenta automáticamente. Una respuesta incierta bloquea ese candidato hasta salir y consultar la grilla; no se presenta éxito sin respuesta confirmada.

## Edición posterior

La grilla ofrece **Ver matrícula** y, en matrícula ACTIVO con Ciclo PROGRAMADO/EN_CURSO y rol académico, **Editar matrícula**. Ver muestra consulta; Editar abre la pantalla completa existente, fuera del buscador, con código manual, patrocinador, opcionales y descuento solo Director. No se trasladan cargos opcionales, empresa, descuentos ni código manual entre alumnos.

Se reutiliza editar_matricula con sus versiones y reglas de cargos vigentes/históricos; cambiar Ciclo conserva código histórico y reinicia cargos/descuento según el Spec. La matrícula anulada o en Ciclo terminal no habilita edición ordinaria. Anulación con motivo conserva su regla vigente, incluida matrícula activa en Ciclo terminal. Las acciones sobre historia permanecen sin DELETE.

Registrar nuevo Alumno o completar ficha se abre como formulario completo y lleva el Ciclo en el retorno; guardar/cancelar desde alta y guardar/volver desde ficha retornan a Matrículas del mismo Ciclo. La matrícula recién agregada continúa accesible desde el historial del Alumno.

## Documentación y validación

CHG-H3-005 conserva antecedente, con aviso de sustitución del panel. README y guía humana describen Buscar → Agregar → grilla → Editar. Gate 1, implementation-log y technical-results enlazan esta enmienda posterior. Los cuatro documentos H3 aprobados, H2 acceptance y fuentes históricas se mantienen intactos.

Sin SQL, nuevas tablas, RPC/helpers DB, policies/grants, dependencias, pagos, H4+ ni EVOL-001/002. React no es autoridad de elegibilidad, importes, estados o transacciones. Pruebas/evidencia se registran en implementation-log. Pruebas humanas y Gate 2 pendientes.
