# CHG-H3-007 — Tarifas dentro de la ficha de Ciclo

Fecha: 03/11/2026 (America/Lima). Autoridad: usuario/revisor humano de esta conversación.

**CAMBIO UX AUTORIZADO POR SOLICITUD HUMANA, IMPLEMENTADO. GATE 2 PENDIENTE.**

## Autoridad y relación con la base

La persona indicó que debe poder ver y agregar las tarifas del Ciclo en su ficha y autorizó «hazlo» sobre la propuesta: pestaña Tarifas, conceptos del catálogo, importe propio del Ciclo, obligatoriedad y retiro con historia, solo Director modifica y Coordinador consulta. Se conserva la jerarquía tarifa → ciclo_tarifa → matrícula/cargos.

Es posterior al Gate 1 de H3 sobre `551cd00ed2957178400dca8fe9d945cf3f9e8d20`. Complementa navegación de CHG-H3-005/006 y sustituye la ubicación de configuración por Ciclo descrita en la estandarización previa de Tarifas. Conserva las reglas de tarifas/cargos del Spec; los cuatro documentos aprobados H3, la aceptación H2 y fuentes históricas se mantienen íntegros.

## Recorrido vigente

- Ciclo existente: **Datos | Materias | Tarifas | Matrículas | Estado**. Ciclo sin guardar mantiene Datos/Materias. La pestaña Tarifas está disponible al consultar la ficha, sin exigir Editar Datos del Ciclo.
- Tarifas muestra únicamente conceptos asignados, tipo, importe para ese Ciclo y aplicación obligatoria/opcional. El Director puede buscar por código/nombre en el catálogo y agregar una tarifa activa que todavía no esté asignada. Las coincidencias se muestran al escribir, con máximo ocho y opción de precisar el término; no se lista todo el catálogo como asignado.
- Agregar toma el monto por defecto del catálogo como valor inicial y CARRERA obligatoria por defecto; OTRO es opcional inicialmente. El Director puede ajustar importe y obligatoriedad antes de guardar. No cambia el catálogo general.
- Editar importe, marcar obligatoriedad y Retirar son cambios de borrador. **Guardar tarifas del Ciclo** aplica la configuración completa mediante guardar_ciclo_tarifas con expected_updated_at. **Cancelar cambios** restaura lo consultado. No hay DELETE: la RPC existente inactiva las asignaciones omitidas y conserva sus referencias/historia.
- Se conserva el borrador al cambiar de pestaña. Cambios monetarios pendientes bloquean registro de matrículas y comandos separados de Datos/Materias/Estado hasta guardar o cancelar, para no sobrescribir versiones ni aplicar supuestos valores todavía no guardados. Una edición pendiente de Datos bloquea modificar tarifas; Cancelar cambios de Tarifas permanece disponible para resolver borradores.
- Al guardar se actualiza la versión del Ciclo que mantiene la ficha; no se provoca un conflicto artificial al operar después desde otra pestaña. Errores/conflictos conservan borrador y no reintentan silenciosamente; carga incompleta/error bloquea guardar para evitar reemplazo vacío.
- Coordinador consulta; solo Director en PROGRAMADO/EN_CURSO configura. Los estados terminales son de consulta. React presenta estos controles, pero permisos, versiones, datos y estado siguen validados por DB.

## Condición para matricular

Tarifas informa si no hay CARRERA activa, si hay más de una activa o si la única activa no es obligatoria. Exactamente una CARRERA activa y obligatoria, con configuración guardada, habilita la indicación Tarifas listas para matricular.

Matrículas comprueba el estado de carga/configuración presentado por la ficha: si falta configuración o hay borrador, muestra la causa y **Revisar tarifas del Ciclo**, sin permitir abrir el alta rápida. La validación transaccional final sigue en registrar_matricula; otro operador podría cambiar la configuración y DB conserva la autoridad.

## Catálogo y conservación histórica

El menú Tarifas mantiene exclusivamente catálogo general, búsqueda/grilla, creación, consulta, edición y activación autorizadas. Se retira el antiguo editor Tarifas por Ciclo de ese menú para no ofrecer dos lugares equivalentes.

Cambiar monto por defecto del catálogo o importe/asignación del Ciclo no recalcula cargos ya registrados ni reescribe alumno_snapshot. Matricular agrega con obligatorios según la configuración vigente DB; opcionales/descuento/empresa/código manual siguen gestionándose en la edición individual autorizada según CHG-H3-006. No incorpora pagos/deuda/facturación, H4+, EVOL-001/002 ni funcionalidad nueva de catálogos.

## Implementación y evidencia

Solo React y las lecturas/RPC existentes: tarifa, ciclo_tarifa, guardar_ciclo_tarifas. Sin migraciones, tablas, helpers/RPC DB, policies/grants o dependencias nuevas. Rutas de retorno desde matrícula conservan el acceso directo a Matrículas del Ciclo con su nueva posición de pestaña; no se pierde el historial de Alumno.

README, human-test-guide, Gate 1, implementation-log y technical-results registran ubicación y evidencia posterior. Pruebas automatizadas cubren consulta, agregar/default, monto propio, obligatoriedad, retiro/cancelación/configuración, versiones/conflictos, permisos/terminalidad, fallos de carga y advertencia antes de matricular. Recorrido visual/teclado/temas/SO y Gate 2 pendientes.
