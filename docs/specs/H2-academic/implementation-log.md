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
