# H2 — Evidencia de construcción

Estado vigente: TASK-H2-001 a 008 COMPLETADAS. TEST-H2-018 confirmado PASSED humanamente sobre e2f2db9; correcciones UI y revisión UX posteriores implementadas y verificadas (112 unitarias; ver ux-review.md). Refresh visual posterior implementado (ver visual-refresh.md). TEST-H2-019 NO INICIADO/NO APROBADO; TEST-H2-020 y revisión del nuevo candidato pendientes; TASK-009 requiere persona y TASK-010 bloqueada por Gate 2. No acceptance ni merge.

Los bloques siguientes conservan estados históricos de cada etapa; sus pendientes intermedios no son el estado vigente.

## TASK-H2-001 — Completada

Fecha 22/10/2026 America/Lima. Spec aprobado exacto 5c4f57de6618fb0568c6d8846ed04d9d75a89932; rama Spec posterior dbc4d40 solo registra Gate 1. Working tree limpio y descendencia de main 32f38ff9ea1bf576bde54735e4a6879f4faf7e35 verificados con git cat-file, status, merge-base --is-ancestor. Se creó feature/h2-academic desde 5c4f57d exacto y después se incorporó dbc4d40 por cherry-pick (669efb5). Sin inicio desde main posterior ni cambios al Spec aprobado/H0/H1 históricos.

## TASK-H2-002 — Modelo y referencias verificados

Fuentes oficiales obtenidas: UBIGEO INEI 2022, conjunto completo 1891 distritos, ZIP enlazado por Plataforma Nacional de Datos Abiertos; DICAPI API pública usada por su web, 19 Capitanías. Snapshot versionado para reset sin red. No se declara que UBIGEO 2022 sea catálogo actualizado a 2026; versión explícita y conservación de fuente.

Decisión técnica: exclusión declarativa parcial con btree_gist nativa PostgreSQL para UUID Carrera/Capitanía y daterange inclusivo; necesaria para garantía concurrente sin reservas/locks de formulario ni validación check-then-insert. No servicio, dependencia JS ni cambio arquitectónico adicional. No se modifica host/firewall/WSL/Docker.

Todas las tareas 003–008 pendientes; no pruebas funcionales aprobadas ni candidato final todavía.

### Verificación del bloque de modelo

Comandos: local-supabase start; reset (Node 24.19.0 del runtime existente, guard habilitado); inspección psql local con ON_ERROR_STOP. Reset final: salida 0. Inventario: 15 tablas públicas, todas RLS; 0 grants anon/authenticated para tablas H2; 0 cuentas Auth; 3 roles funcionales sin mapeo; exclusión parcial de superposición presente. Semillas: 25 departamentos, 196 provincias, 1891 distritos, 19 Capitanías, 2 catálogos/7 valores. Sin datos de negocio sintéticos todavía.

Correcciones: CSV INEI cp1252 contiene 20 filas de notas/pie, filtradas por IDDIST de seis dígitos conservando 1891 registros; reset heredado usaba --no-seed y no cargaba referencias, retirado solo ese flag sin alterar guard. Repetición de reset e inventario: satisfactorios. Estos son checks del modelo/carga, no aprobación de los TEST funcionales completos, que requieren TASK-003/004.

Archivos: migración 20261022150000_h2_academic_model.sql, seed.sql, reference/ con snapshots públicos derivados y sources.json, configuración de seed y ruta reset del wrapper. No migración histórica reescrita. TASK-003 pendiente; modelo H2 permanece cerrado a producto hasta sus policies/RPC. No TASK-004 ni UI iniciadas.

## TASK-H2-003 — Bloque de comandos y autorización

Implementación: 7 RPC concretas, RLS de lectura funcional/referencial y auditoría, directorio ADMIN_SISTEMA, helpers internos cerrados, triggers de versión/auditoría y mínimo diferido. Las escrituras ordinarias directas quedan sin grants; actor auth.uid(), motivos sensibles y JSONB acotado. Restricciones de entidades futuras no se simulan.

Comprobaciones reales previas a TASK-004: Auth/Data API con Director, Coordinador y Admin Sistema sintéticos; normalización Materia, creación Carrera, rechazo de inactivar última materia, Ciclo, exclusión inclusiva, denegación de transición a Coordinador, ANULADO/liberación de rango, DELETE denegado, directorio solo Admin Sistema, auditoría visible a roles funcionales. Identidades limpiadas al finalizar.

Defecto detectado: Carrera concurrente con inactivación de su única Materia podía producir mínimo inválido bajo READ COMMITTED. Se corrigió con configuración SERIALIZABLE por RPC, elevada al inicio de la transacción por PostgREST (documentación oficial transactions/isolation-level); sin locks de formulario, reserva, nueva capa o reintento automático con nueva versión. Repetición 12 carreras concurrentes, más repetición tras reset: invariant preservada; solicitudes incompatibles rechazadas. Los fallos 40001 son conflictos que exigen recarga.

Validaciones finales añadidas: tipos JSON cerrados, fechas calendario ISO y rechazo de nuevas referencias inactivas conservando históricas. Aplicación local de los últimos validadores requirió UTF-8 explícito al usar psql desde Python Windows; primer intento de ese ajuste falló antes de aplicarlo por encoding, corregido y repetido. No se expusieron credenciales.

La verificación anterior es smoke de TASK-003, no equivale a cobertura completa TEST-H2 ni TASK-004 terminado. Fixtures de negocio del smoke permanecen solo en base desechable hasta próximo reset; no datos reales. TASK-004 inicia después de este bloque. TASK-005 a 008 no iniciadas.

## TASK-H2-004 — Suites reales

Fixtures H2 asignan explícitamente roles reales a A/B (Admin Sistema), O (Coordinador), D (Director), M (Admin Sistema+Coordinador), N sin rol, F sin fila e I inactivo. Sin mapeo de cuentas H1. La regresión técnica conserva sus identificadores TEST-H1 para propiedades históricas, usando el catálogo evolucionado, no declara nueva aceptación H1.

Primeras ejecuciones: test:security PASSED (14 escenarios, ocho identidades retiradas y roles restaurados); test:academic PASSED (10 grupos DB/API que cubren inventario/semillas, normalización, FK, mínimos, RLS, roles/metadata, exclusión inclusiva, versión, sigla, sincronización/cambio Carrera, estados, motivo OTRO y fallo real de auditoría con rollback). Trigger de fallo retirado en finally. Las pruebas de materias de ciclo mantienen filas/origen, no borran historia. El directorio global solo aparece al Admin Sistema; lectura referencial Coordinador no da mantenimiento.

La suite académica se amplía además con solicitudes concurrentes de correlativo y paso real por 999/1000; requiere repetición antes de cierre de tarea. Las verificaciones de UI/temas aún no existen y no se atribuyen a estos resultados. TEST-018/019/020 humanos y Gate 2 siguen pendientes. El ensayo negativo de CI TASK-007 no ha sido ejecutado.

Repetición ampliada test:academic: PASSED, 11 grupos técnicos. Incluye nuevas selecciones inactivas rechazadas/historia conservada, correlativos con peticiones simultáneas y creación real 999/1000, Lima vs UTC mediante expresión controlada sin cambiar reloj del host. Conflictos SERIALIZABLE 40001 permitidos, nunca duplicados ni retry automático. Lint de scripts: salida 0. Bloque TASK-004 preparado/verificado; comienzan TASK-005 temas y después TASK-006 UI. La regresión de expiración real y reset/CI completos se ejecutan en TASK-007. No se declara UI ni prueba humana realizada.

## TASK-H2-005 — Preferencias visuales

Selector simple Sistema/Claro/Oscuro/Alto contraste con estado React local y una clave de navegador, sin Context/backend/dependencias. Sistema sigue cambios de color-scheme y prefers-contrast; CSS forced-colors prevalece sobre variables propias con colores del sistema, sin forced-color-adjust:none. Tokens semánticos compartidos; sin color de estado como único significado.

Vitest ThemeSelector: 5 pruebas PASSED (tres paletas con cálculo de contraste por superficie/texto/estado/borde/foco/primario y dos escenarios de sistema/persistencia/corrupción o storage bloqueado). Texto normal ≥4.5:1 y controles necesarios ≥3:1 en pares probados. Typecheck salida 0. Son medidas técnicas, no conformidad WCAG completa ni prueba humana del SO. Montaje en App y comprobación de pantallas se realiza en TASK-006. TEST-019 humano pendiente.

## TASK-H2-006 — UI concreta

Pantallas Materias, Carreras, Ciclos y consulta básica Auditoría, protegidas bajo sesión existente. Coordinador consulta referencias sin mantenimiento; directorio de seguridad solo ADMIN_SISTEMA. Ciclos muestran código no editable, estados textuales, geografía dependiente, heredadas/adicionales, retiro/reactivación explícita, motivos sensibles y catálogo OTRO. No botón Eliminar en persistidos; Cancelar nuevo no llama RPC. Advertencias de inactivación/cambio de sigla/Carrera y conflicto 40001 conservando formulario con recarga explícita. Respuestas de consultas/selecciones tardías protegidas con cancelación/epoch.

Suite completa React/SDK: 88 pruebas PASSED en 8 archivos, incluidos 6 casos UI nuevos (solo lectura, acceso académico, conflicto sin retry, descarte sin RPC, terminal no editable/DELETE/reapertura y OTRO obligatorio). Typecheck/lint se verifican en este bloque y se repiten dentro de CI. No es recorrido humano ni evaluación visual del SO.

Corrección necesaria al integrar UI: modalidad inactiva ya referenciada debe permanecer válida al editar otros campos de la Carrera, pero no en nuevas selecciones. RPC guardar_carrera conserva solo referencia previa idéntica; toda nueva selección sigue validando catálogo activo y pertenencia. Caso técnico incorporado a test:academic para repetición desde reset en TASK-007.

## TASK-H2-007 — CI y reproducción en curso

Workflow incorpora test:academic antes del build y después del reset final. Ensayo negativo temporal usa asignación ADMIN_SISTEMA indebida al Coordinador y verifica primero directorio ampliado por petición ordinaria; no permite asumir que una falla por fixture/conteo basta. README incluye rama de revisión H2, comandos, fuentes, roles reales, limpieza por reset y límites visuales.

Se ejecutan suites locales y CI del commit que contiene este bloque; resultados, run IDs y repetición/clone se registrarán después, no se presuponen PASSED. Última ampliación técnica comprueba las 7 RPC directamente con Admin Sistema, no habilitados y anónimo: ninguna escritura académica permitida.

### Hallazgo CI y corrección de portabilidad

CI positiva bb180ee, run 39791100000: lint/tipos/88 unitarias, arranque/reset e inventario/seguridad H1 evolucionada PASSED; fallo en hash de referencia al iniciar test:academic. Causa: snapshot JSON DICAPI fue escrito con CRLF por Python Windows, su hash se calculó antes de normalización Git a LF; en Linux el contenido normalizado no coincidía. Se normalizan explícitamente snapshots/metadata a LF y se recalcula SHA256 de bytes versionados, conservando hashes originales descargados y todos los nombres oficiales. No se elimina ni relaja el test de integridad. Repetición CI pendiente en el commit de corrección.

Clon privado bb180ee: npm ci PASSED, 215 paquetes/216 auditados, cero vulnerabilidades informadas; typecheck PASSED. Un intento de build anterior a generar la configuración pública fue rechazado correctamente por falta VITE_SUPABASE_URL. Se completará siguiendo README (supabase:env) al transferir el stack tras terminar la suite del checkout principal; sin copiar secretos ni levantar dos stacks.

### Verificación final de cobertura y formularios

CI corregida 91498b0, run 39792352234: SUCCESS en todos los pasos, incluidas expiración real/restauración y reset con repetición de seguridad/academic. Clon privado 91498b0: instalación, lint/unit, start/reset/env/local, seguridad, académica, build/build-safety, reset/cleanup/stop satisfactorios; cero cuentas/usuarios/asignaciones/datos académicos/auditoría de ensayo tras limpieza. Inventario capturado de PostgreSQL real.

Ensayo negativo bb180ee, run 39791112224: fallo esperado TEST-H1-007 por «Coordinador recibió directorio ampliado», no por conteos o preparación; identidades retiradas, stack detenido y rama remota temporal eliminada. Logs de primera CI/negativo y 16 logs locales revisados por patrones de PAT/canarios/JWT privilegiados sin hallazgos. El archivo de logs de CI 91498b0 devolvió 404 al primer intento; steps y conclusión global SUCCESS verificados mediante acceso Git autorizado; se volverá a revisar el archivo cuando esté disponible.

Revisión de cobertura añadió casos explícitos de modificación exitosa y conflicto Materia, límites válidos 30/150/500 y sigla 2/10, sigla duplicada, edición Coordinador EN_CURSO, PROGRAMADO→DESIERTO/ANULADO y prohibición de edición/reapertura/DELETE de todos los terminales. Suite académica ampliada PASSED (11 grupos) con Auth/RPC reales. UI bloquea entrada/recarga/descarte durante guardado para no perder ediciones ni confundir Cancelar con rollback de solicitud en curso. Regresión UI añadida; suite completa: 89 pruebas PASSED, typecheck y lint salida 0. Se repite CI del nuevo commit antes de declarar conformidad final.

Comprobación adicional de navegador integrada no iniciada: herramienta falló con «failed to write kernel assets» antes de abrir página. No se atribuyen resultados de navegador/teclado/SO ni pruebas humanas a Codex. Vite de esa comprobación fue detenido, sin cambiar entorno de automatización/host. TEST-018/019/020 siguen pendientes de persona.

## TASK-H2-007 — Completada

CI fuente final f851dc728d22ac218da0b629c9a0192cfa5bc0c3, run 39795267071: todos los pasos SUCCESS (89 unitarias, seguridad real, académica real, build/safety, expiración/restauración y reset/repetición/stop). CI negativa relevante y clon reproducible completados, detallados en technical-results.md. Logs positivos 91498b0 obtenidos posteriormente por endpoint de job: sin patrones PAT/JWT privilegiado, 40 identidades por lote retiradas. Sin cambios de host ni relajación del guard.

## TASK-H2-008 — Completada; detención humana

technical-results.md publica matriz TEST, commits/comandos/defectos/correcciones, inventario PostgreSQL real de tablas/roles/semillas/policies/ACL/funciones/constraints/índices/triggers y limitaciones. human-test-guide.md prepara reproducción y TEST-018/019/020; no se registra resultado humano aún. Código final f851dc7 verificado local/clon/CI. El SHA candidato documental y su CI se presentan en la entrega para evitar autorreferencia circular. Stack y Vite locales detenidos, datos sintéticos eliminados por reset. Spec aprobado y H0/H1 intactos; main no cambia. No acceptance, Gate 2, merge ni H3.

## Correcciones UX/UI autorizadas tras TEST-H2-018 humano

El usuario confirmó PASSED humano en e2f2db9365b4c46fd6932caba3d47a17324ebe29 y solicitó correcciones antes de TEST-019. Código 96437d3ca8c22c872748119f4093412fa62f762d: diálogo accesible propio, validación inline, previabilidad y confirmaciones consistentes, código+nombre, relaciones integradas, límites visibles, mensajes seguros, sigla sugerida y advertencias de propagación, presentación ligera. 106 unitarias y lint/tipos/build/safety/local/seguridad14/academic11 PASSED; reset/local/stop completados. Registro detallado y defecto de foco corregido en ui-corrections.md. Sin cambios DB/RLS/RPC/Spec ni nuevas dependencias. TEST-019/020 y Gate 2 pendientes; no acceptance, merge ni H3.

## Revisión UX/UI previa a TEST-H2-019

Base 51b73ba5c6b18c9436a7e087f4110f3c10d91f18; código 0f8096097c7cfa5426ee84a55b56d4bc0e1fc551. Revisión pantalla por pantalla y correcciones de jerarquía/navegación, listado/editor/consulta, relaciones de Ciclo y auditoría legible; reporte de problemas/cambios/beneficio en ux-review.md. 112 unitarias, lint/tipos/build/safety y regresión real local/seguridad14/academic11 PASSED; reset/local/stop y Vite detenidos. Browser integrado falló antes de abrir página; no inspección visual real ni TEST-019/020 humano aprobado. Sin cambios en DB/RLS/RPC/permisos/Spec/PLAN/dependencias/host. Estado de CI del candidato documental se presenta en la entrega. Gate 2, acceptance y merge siguen bloqueados; H3 no iniciado.

## Renovación visual del shell y componentes base

Base humana 7f0a5487d4ddb001eadf3d89cfee91cb02c84255. La funcionalidad se considera bien pero el acabado visual no alcanza el nivel esperado; no equivale a aceptación del nuevo candidato. Código d593ac2: CSS reemplazado/consolidado, paletas marítimas coherentes, login compuesto, marca SVG decorativa mínima y controles/superficies/tablas/diálogos unificados. Sin DB/RLS/RPC/permisos/reglas/Spec/PLAN/dependencias. 112 unitarias con contraste ampliado, lint/tipos/build/safety/local, seguridad14 y academic11 PASSED; reset/local/stop completados. Primera seguridad falló por ocho cuentas sintéticas previas; repetición desde reset pasó sin relajar controles. Herramienta visual no inicializó; sin capturas ni comprobación de viewport/SO atribuida. Evidencia y límites en visual-refresh.md. TEST-019 NO INICIADO/NO APROBADO; TEST-020 y Gate 2 pendientes; sin acceptance, merge ni H3.
