# H2 — Evidencia de construcción

Estado: EN CONSTRUCCIÓN. No acceptance ni Gate 2. Pruebas humanas 018/019/020 pendientes.

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
