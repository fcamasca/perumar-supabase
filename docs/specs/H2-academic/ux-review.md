# H2 — Revisión UX/UI previa a TEST-H2-019

Base revisada: `51b73ba5c6b18c9436a7e087f4110f3c10d91f18`. Fecha: 22/10/2026. Código resultante: `0f8096097c7cfa5426ee84a55b56d4bc0e1fc551`. El SHA final documental y el estado de CI se presentan en la entrega.

Revisión experta de tareas, contenido, componentes, CSS y DOM; **no es TEST-H2-019 humano ni una inspección visual real completada**. El navegador integrado falló antes de abrir la aplicación: `failed to write kernel assets`, os error 3. No se modificó el entorno para sortearlo ni se generaron capturas ficticias. Desktop/viewport estrecho y cuatro temas se revisaron conceptualmente y mediante estructura/CSS; necesitan validación humana real.

## Hallazgos, correcciones y beneficio

| Pantalla / situación | Problema detectado | Cambio realizado y beneficio para la tarea |
|---|---|---|
| Aplicación | Hito, stack y diagnóstico dominaban la entrada; título excesivo | Encabezado institucional compacto, selector visual y diagnóstico técnico secundario desplegable al pie. La tarea académica ocupa el espacio principal; se conserva diagnóstico H0. |
| Login | Contexto técnico y validación nativa | Contexto de acceso claro, campos etiquetados y validación inline existente reutilizada. Credenciales y errores de autenticación siguen genéricos; sin registro/recuperación nuevos. |
| Navegación | Enlaces sin ubicación activa ni separación de cuenta | Navegación superior académica y enlaces de cuenta, NavLink/aria-current con borde y subrayado. Permisos existentes siguen determinando visibilidad y servidor mantiene autoridad. |
| Mi acceso | UUID/roles internos y explicación DB eran la experiencia inicial | Roles con nombres comprensibles e instrucción para elegir sección. Identificador completo disponible bajo detalle, sin cambiar identidad ni permisos. |
| Directorio | Tabla técnica y texto de fixtures | Contexto de consulta, tabla desplazable y estado textual con indicador. Identificadores conservados; no se inventaron nombres/correos ni se amplió la consulta autorizada. |
| Materias | Tabla y formulario simultáneos sin modo claro | Listado neutral, Crear Materia y editor identificado como Editando CÓDIGO — NOMBRE. Cancelar/guardar regresa al listado; foco vuelve a Crear. Acciones visibles cortas y nombres accesibles específicos por fila. |
| Carreras | Misma ambigüedad y pared de checkboxes | Mismo patrón de editor; búsqueda local por código/nombre, contador de selección, selección marcada con texto/borde y bloque desplazable. Filtrar no borra selecciones. Sigla sugerida y validaciones aprobadas se conservan. |
| Ciclos — listado | No mostraba Carrera/Capitanía; estado competía con código | Identificador destacado, Carrera, Capitanía, fechas y estado con texto/indicador. Consultar abre el registro sin añadir acciones funcionales. |
| Ciclos — edición | Bloque largo sin agrupación por tarea | Datos principales, Ubicación, materias de Carrera/adicionales, materias actuales y Estado separados. Código y modo de edición visibles. Transición mantiene la matriz aprobada y bloquea controles durante su petición. |
| Materias del Ciclo | Frases largas difíciles de recorrer | Tabla Código / Nombre / Origen / Estado / Acción integrada al editor o ficha. Retirada manual o por cambio de Carrera se expresa en lenguaje directo; acciones de retiro/reactivación conservan RPC y no DELETE. |
| Ciclos terminales | Muchos campos deshabilitados confundían consulta con edición | Ficha solo lectura con código, estado, Carrera, Capitanía, fechas, promoción, ubicación y materias. Explica que no admite cambios ni reapertura. Sin Guardar/transición/formulario deshabilitado. |
| Confirmaciones | Botones genéricos y lenguaje técnico | Acciones explícitas: Inactivar, Reactivar, Guardar cambios, Cambiar Carrera, Retirar Materia, Iniciar/Cerrar/Anular/Declarar desierto. Explican impacto y carácter definitivo cuando corresponde. Cancelación sin escritura y motivo solo donde estaba aprobado. |
| Feedback | Guardado genérico sin identificar resultado | Materia/Carrera creada o actualizada, inactivada/reactivada; Ciclo creado/actualizado/declarado y Materia retirada/reactivada. Mensajes breves, anunciados como status; errores siguen alert y no exponen SQL. |
| Auditoría | UUID y JSON competían con qué pasó | Fecha/hora Lima, cuenta, entidad/código, acción traducida, motivo y cambios campo a campo antes/después. Identificadores completos y JSON original siguen disponibles como detalle secundario. Sin joins nuevos ni reporting avanzado. |
| Estados vacíos/consulta | Tabla vacía parecía error o contenido incompleto | Cargando explícito, sin falso vacío inicial; sin resultados distingue filtros y ofrece crear primera entidad solo al rol habilitado. Error de consulta conserva mensaje seguro. |
| Layout/tablas | Anchuras uniformes, palabras rotas y botones largos | Contenedor limitado, códigos/sigla/fechas de ancho corto, nombres medianos y descripción amplia; filtros agrupados. Cabeceras/estados sin corte, acciones compactas y desplazamiento horizontal en tablas estrechas. |

## Comprobación final de UX y accesibilidad

- Cada pantalla distingue contexto, acciones, filtros, contenido y edición/consulta; no dashboard, sidebar, librería, state manager o framework nuevo.
- Crear es la acción inicial destacada. Editar abre un editor enfocado con identidad completa; Cancelar cierra al estado neutral y restaura foco. Los botones de filas muestran texto breve y conservan nombre accesible específico.
- Datos relacionados permanecen agrupados; asteriscos visibles y required nativo identifican obligaciones. Límites, previabilidad, geografía dependiente, sigla editable y advertencias de propagación siguen vigentes.
- Diálogo: Escape, contención de foco, Cancelar inicialmente enfocado y fondo inert conservados. El hook espera fin de la petición para restaurar foco cuando el botón vuelve a habilitarse. No introduce permisos ni validación de negocio nueva.
- Tablas usan HTML semántico; estados siempre incluyen texto. Tema activo de navegación también tiene subrayado/borde. Acciones sensibles usan token error y texto explícito, sin depender únicamente del color.
- Sistema/Claro/Oscuro/Alto contraste utilizan tokens existentes. No se cambiaron paletas ni prioridad forced-colors. Se mantiene la prueba de contraste de las tres paletas; no certificación WCAG completa.
- Revisión conceptual de layout en escritorio y ancho estrecho: encabezado/nav/filtros se envuelven; formularios usan columnas ajustables y mínimos acotados; tablas conservan ancho legible dentro de scroll; diálogo limita alto y ancho y permite scroll. No se afirma haber medido esos viewports en navegador.
- La identidad de una cuenta no puede convertirse en nombre humano con los datos actualmente disponibles para todos los roles. Se muestra cuenta abreviada con ID completo disponible; no se amplían permisos ni se inventa identidad.

## Verificación técnica

Código `0f8096097c7cfa5426ee84a55b56d4bc0e1fc551`, mismas fuentes probadas antes del commit. Ejecución local mediante scripts npm o su mismo entrypoint Node, Windows/Node 24.19.0/npm 10.9.0:

| Comando | Resultado |
|---|---|
| `npm run lint` | PASSED |
| `npm run typecheck` | PASSED |
| `npm test` | PASSED: 112 pruebas, 9 archivos; seis nuevas respecto del candidato anterior |
| `npm run build` | PASSED; JS 532.23 kB / gzip 151.33; CSS 10.27 kB / gzip 2.79 |
| `npm run test:build-safety` | PASSED; configuración privilegiada rechazada sin canario en salida/bundle |
| `npm run supabase:start` | PASSED, guard/mitigación Firewall aprobada sin cambios |
| `npm run test:local` | PASSED; inventario/ACL/RLS/helpers/RPC exactos |
| `npm run test:security` | PASSED, 14 escenarios; limpieza/restauración de roles |
| `npm run test:academic` | PASSED, 11 grupos reales; casos futuros Matrícula/Facturación DEFERRED |
| `npm run supabase:reset` + `npm run test:local` | PASSED; fixtures de negocio retirados, roles/referencias conservados por seed |
| `npm run supabase:stop` | PASSED; Vite de inspección también detenido tras verificar PID/puerto del proyecto |

Pruebas nuevas protegen neutral/crear/editar y foco al cancelar, vacío por rol, búsqueda sin pérdida de selección, auditoría legible con evidencia secundaria, navegación activa/permisos y restauración de foco después de petición confirmada. Se adaptaron pruebas de presentación a las nuevas acciones y ficha terminal, manteniendo verificaciones de permiso, conflicto, confirmación y no escritura al cancelar.

Incidencias durante verificación: dos asserts iniciales todavía esperaban la presentación técnica anterior; se verificó el diagnóstico plegado en vez de ausencia del DOM y se eliminó un role alert redundante de su detalle técnico. La prueba diferida de foco espera el inicio real de la RPC y verifica restauración al terminar; el hook conserva referencia hasta busy → libre. Repetición final completa: 112 PASSED. Sin fallos técnicos pendientes.

## Alcance y decisiones pendientes

Diff contra 51b73ba limitado a componentes/presentación, CSS, pruebas de UI y este registro. Sin cambios DB, SQL/migraciones, RLS/RPC, auditoría, permisos, SessionProvider, Spec, PLAN, scripts, dependencias ni host. Operaciones de crear/editar/consultar/estado conservan capacidades, payloads y reglas; cambia su presentación. H0/H1 históricos intactos.

No se encontró una decisión funcional que requiera cambiar el Spec. Permanecen para decisión humana la conformidad visual/uso real de TEST-H2-019 y mantenibilidad de TEST-H2-020. Revisar especialmente navegación activa, editor/retorno al listado, selección filtrada, tablas de Ciclo, ficha terminal, detalles de auditoría y confirmaciones, en cuatro temas/teclado/forced-colors. Fallo del navegador integrado explícito; no se atribuyen capturas ni pruebas humanas a Codex.

Advertencia de chunk >500 kB conservada, sin ocultar umbral ni añadir optimización/capas fuera de alcance. Riesgos documentados H0/H1 y snapshot UBIGEO permanecen. TEST-H2-018 PASSED humano solo sobre e2f2db9 según registro previo; no se extiende automáticamente a este candidato.

**UX/UI CORRECTIONS: COMPLETE**  
**LOCAL TECHNICAL TESTS: PASSED**  
**TEST-H2-019 / TEST-H2-020: HUMAN PENDING**  
**GATE 2 / ACCEPTANCE / MERGE: BLOCKED**  
**H3: NOT STARTED**
