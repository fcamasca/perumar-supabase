# CHG-H4-001 — Acceso operativo directo a Pagos

09/11/2026 (America/Lima). Enmienda UX posterior a Gate 1, aprobada expresamente por el usuario sobre el candidato `42e7737d23cf42ec5c70fd44c67f1bb2b6c8ba50`, rama `feature/h4-payments`.

Solicitud humana: agregar una opción principal Pagos porque el recorrido desde Ciclos/Matrículas resulta demasiado profundo. Gate 2 NO aprobado; no acceptance, merge ni H5. Los cuatro documentos del Spec aprobado `15f5e80` permanecen intactos.

## Alcance aprobado

Pagos → Por Alumno (inicial) / Por Ciclo → seleccionar matrícula → flujo H4 existente. Se conserva la pestaña Pagos contextual de matrícula. Director/Coordinador acceden; Admin sin rol académico no obtiene acceso financiero. RLS/DB son autoridad.

Buscar Alumno reutiliza studentSearchFilter (código, documento, nombres y apellidos). Sus matrículas muestran Ciclo, Curso, estado de Ciclo, base/abonado/pendiente y acción. Por Ciclo admite Programado/En curso/Cerrado, con filtro de alumnos reutilizado. Cero permanece al final. Pendiente descendente, fecha de Ciclo descendente y desempates deterministas en DB. Matrículas anuladas/estados no cobrables admiten solo consulta.

El detalle muestra Alumno/documento, matrícula, Ciclo, Curso y pendiente antes de operar. Reutiliza EnrollmentPayments sin nueva lógica financiera. Pagar abre su formulario existente; Ver ofrece consulta/historial. El retorno preserva contexto de búsqueda en estado React del workspace /pagos/* por identidad (no PII ni payload financiero en URL/history/storage).

## Justificación previa de lectura agregada

Revisadas matricula_saldo y matricula_cargo_saldo: la primera contiene matrícula y totales agregados; la segunda contiene cargos, sin contexto de alumno/ciclo/curso. Las FK de matricula permiten obtener ese contexto, pero no una relación FK directa entre la propia matrícula y su proyección agregada que permita filtrar y paginar por pendiente en una única consulta PostgREST mantenible. Una consulta de saldo por fila produciría N+1; ordenar una página parcial en React no cumpliría el orden global.

Se autoriza por la cláusula de lecturas de esta solicitud una sola vista específica **matricula_pago_listado**, security_invoker, que une matricula_saldo con matrícula/alumno/ciclo/carrera. No repite la fórmula de saldo ni materializa datos. Permite filtros, orden numérico y paginación DB en una petición por listado. No tablas/RPC/helpers/policies nuevos; solo SELECT authenticated sobre la vista y RLS de las mismas relaciones. Esta decisión se registra antes de implementar la proyección.

## Límites y evidencia

Sin cambios en dinero, aplicaciones, idempotencia, locks/SERIALIZABLE, PT409, auditoría, permisos financieros o reglas H3/H4. Sin API/servicio, mantenimiento, facturación ni H5. La validación y resultados reales se registran en implementation-log.md y technical-results.md. Pruebas humanas PENDIENTES, incluyendo accesibilidad visual/móvil/forced-colors real.

## Evidencia tecnica del 10/11/2026

Implementada sobre la base indicada. [CI 42758669622 SUCCESS](https://github.com/fcamasca/perumar-supabase/actions/runs/42758669622), codigo `914bb837ef570e214798f05634be363e2049d272`; 359/359 pruebas. Inventario: una vista adicional, sin tablas/RPC/helpers/policies nuevos. [Detalle tecnico](technical-results.md), [registro](implementation-log.md) y [guia humana actualizada](human-test-guide.md). La entrega verifica asimismo el SHA documental final. Revisión humana y Gate 2 PENDIENTES.

## Ajuste visual aprobado el 10/11/2026

El usuario reviso la pantalla de pago y aprobo compactarla («ok haz el cambio»): encabezado con matricula/estado/retorno en una fila; contexto alumno/DI y Curso/Ciclo en dos lineas; un unico resumen Base/Abonado/Pendiente con Actualizar; sin subtitulo Pagos ni instrucciones redundantes; formulario al ancho del contenido; seleccion total desde el checkbox del encabezado; Medio mas corto y Observaciones de dos lineas ampliable; acciones separadas, Cancelar a la izquierda y Confirmar pago con el importe a la derecha, en barra sticky al desplazar cargos largos.

Estilos limitados a Pagos, compartidos por acceso directo y contextual. Sin cambios de calculo, payload, RPC, permisos, idempotencia, PT409, modelo o inventario DB. La seleccion de todos conserva propuesta de pendientes completos y permite parciales; desmarcar todos equivale a desmarcar sus cargos. Se conserva el foco de entrada y las etiquetas accesibles.

Revision visual automatica NO VERIFICADA: la herramienta de escritorio no pudo iniciar su kernel (error de entorno; sin acciones sobre pagos). No se marca una prueba humana/visual como ejecutada. Ver evidencia automatizada en technical-results.md.
