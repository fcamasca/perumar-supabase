# H2 — Resultados técnicos e inventario

Este informe conserva la evidencia del candidato inicial. Renovación visual posterior y evidencia actual: [visual-refresh.md](visual-refresh.md); TEST-H2-019 no iniciado ni aprobado. Revisión UX y evidencia técnica vigente (112 pruebas): [ux-review.md](ux-review.md). Estado posterior: TEST-H2-018 fue confirmado PASSED humanamente en e2f2db9; correcciones UI y resultados actuales (106 pruebas) en [ui-corrections.md](ui-corrections.md). TEST-H2-019/020 y Gate 2 siguen pendientes. Los estados PENDING de la matriz inferior reflejan el momento de la entrega inicial, no revocan la confirmación humana recibida.

Fecha: 22/10/2026 (America/Lima). Construcción autorizada por Gate 1 sobre Spec exacto `5c4f57de6618fb0568c6d8846ed04d9d75a89932`. No es acceptance ni Gate 2.

## Commits y trazabilidad

| SHA | Bloque |
|---|---|
| `669efb581624a03346010ad0dcf3bb2fae130cc9` | docs(h2): record human gate 1 approval of exact spec |
| `c8fa56aab0621e643bd77233cd84baa73624789f` | docs(h2): verify approved base and start ordered construction |
| `9fc7a168288986f6887c3bbdee0630326b63a503` | feat(h2): add closed academic model and official reference snapshots |
| `11b07e60eaa065445df7fee324ec8ef99b7bb01a` | feat(h2): protect academic commands with RLS audit and serializable invariants |
| `f48283731d34dd60168e4f9c0e245328485fd6f5` | test(h2): verify real role matrix academic invariants and rollback |
| `254933dae8cae5e9b7bd169da4e0f13c52fbebd0` | feat(h2): add accessible visual preferences and semantic palette tokens |
| `9ea2814a7dcbfea7281ac932ea95244a9f61cda2` | feat(h2): implement concrete academic screens with guarded operations |
| `bb180ee578fd35ea4d58ab8900bcf4097c7d1016` | ci(h2): verify academic invariants and controlled access regression |
| `91498b021e4cfc5ee500029f835556c081222aa0` | fix(h2): hash canonical reference bytes across Windows and Linux |
| `f851dc728d22ac218da0b629c9a0192cfa5bc0c3` | fix(h2): protect pending form saves and cover approved boundary transitions |

Base main conservada: `32f38ff9ea1bf576bde54735e4a6879f4faf7e35`. Rama `feature/h2-academic` nace de 5c4f57d exacto; registro Gate 1 recibido después por cherry-pick. Los cuatro archivos aprobados y la historia H0/H1 permanecen idénticos. Candidato final: comprobar SHA presentado en la entrega y `git log -1 --format=%H`; los commits posteriores a la última implementación solo documentan evidencia si así lo indica su diff.

## Comandos y resultados

| Comprobación | Resultado/evidencia |
|---|---|
| `npm ci` en clon privado | PASSED; 215 paquetes, 216 auditados; cero vulnerabilidades informadas por npm |
| `npm run lint` / `npm run typecheck` | PASSED |
| `npm test` | PASSED: 89 pruebas en 8 archivos |
| `npm run build` | PASSED; advertencia no bloqueante de chunk JS ~509.70 kB, gzip ~145.88 kB; no se ocultó el umbral |
| `npm run test:build-safety` | PASSED; configuración privilegiada/canario rechazados, sin filtración al bundle |
| start/reset/env/test:local | PASSED con guard e inventario exacto; semillas controladas |
| `npm run test:security` | PASSED, 14 escenarios de regresión Auth/RLS/multirol/revocación |
| `npm run test:academic` | PASSED, 11 grupos reales DB/Data API/RPC; cubren casos técnicos H2 detallados debajo |
| `npm run test:expiry` | PASSED: JWT real 60s, renovación/logout residual, rechazo tras exp+tolerancia; archivo restaurado a 3600 y stack reiniciado |
| Reset + repetición de suites | PASSED en checkout principal, clon y CI positiva 91498b0 |
| Cleanup final | Reset y test:local PASSED; stack detenido; identidades y datos de negocio/auditoría de ensayo en cero |

La preparación/observación administrativa local no se cuenta como petición de autorización: estas usan clave pública y JWT ordinario por actor. Motivos, roles y actores son sintéticos, sin cuentas reales ni secretos en evidencia. Scripts h2-fixtures/test-academic/test-security/test-expiry son reproducibles; logs operativos detallados se mantienen en caché ignorada, resultados durables aquí y en implementation-log.

## CI y ensayo negativo

- CI positiva completa: [39792352234](https://github.com/fcamasca/perumar-supabase/actions/runs/39792352234), SHA `91498b021e4cfc5ee500029f835556c081222aa0`, SUCCESS en todos los pasos.
- Primera CI `bb180ee` [39791100000](https://github.com/fcamasca/perumar-supabase/actions/runs/39791100000): falló por checksum CRLF/LF de snapshot DICAPI. Corregido en 91498b0 conservando integridad estricta y hashes originales.
- Ensayo negativo controlado [39791112224](https://github.com/fcamasca/perumar-supabase/actions/runs/39791112224), SHA `bb180ee578fd35ea4d58ab8900bcf4097c7d1016`: FAILURE esperado por «Coordinador recibió directorio ampliado». La asignación inesperada ADMIN_SISTEMA se detectó por filas obtenidas con JWT ordinario, no por un fallo de preparación. Ocho identidades retiradas, stack detenido y rama temporal eliminada.
- Logs de jobs revisados: CI positiva 91498b0 sin patrones PAT/JWT service_role y 40 identidades por lote retiradas; negativo sin esos patrones y ocho retiradas. No se imprimieron credenciales al descargar logs; las descargas firmadas se siguieron sin reenviar Authorization.
- CI de implementación final `f851dc728d22ac218da0b629c9a0192cfa5bc0c3`: [39795267071](https://github.com/fcamasca/perumar-supabase/actions/runs/39795267071), todos los pasos SUCCESS, incluidas 89 unitarias, expiración, reset/repetición y stop. La conclusión del candidato documental posterior se registra en la entrega, sin presuponerla.

## Matriz de TEST

Todos los resultados PASSED siguientes son técnicos y limitados al alcance H2. No certifican WCAG completa ni sustituyen revisión humana.

| TEST-H2 | Estado | Cobertura |
|---|---|---|
| 001 | PASSED (técnico) | SHA aprobado, Gate 1, base/descendencia y diff sin reescribir Spec/historia |
| 002 | PASSED (técnico) | Clon limpio, instalación, reset, migraciones y exacto inventario/ACL/semillas |
| 003 | PASSED (técnico) | Materia alta/edición/consulta/estado, normalización, duplicados y error/conflicto sin pérdida de formulario |
| 004 | PASSED (técnico) | Carrera y materias, modalidad, sigla, atomicidad, mínimo y referencias |
| 005 | PASSED (técnico) | Ciclo completo H2, fechas/referencias/código generado, sin campo active |
| 006 | PASSED (técnico) | Exclusión inclusiva concurrente, correlativo concurrente, rollback y estados participantes |
| 007 | PASSED (técnico) | Active maestras/reactivación, conservación histórica y rechazo de estados/cascadas inválidos |
| 008 | PASSED (técnico) | Roles reales por operación, unión multirol y denegación sin habilitación |
| 009 | PASSED (técnico) | Manipulación de IDs/payload/metadata/rutas; no elevación |
| 010 | PASSED (técnico) | Escritura directa y llamadas RPC privadas/alternativas sin bypass |
| 011 | PASSED (técnico) | Actor/tiempo DB, JSONB, motivo sensible y fallo real de auditoría con rollback |
| 012 | PASSED (técnico) | Auditoría de lectura para tres roles, sin mutaciones de eventos desde cliente |
| 013 | PASSED (técnico) | Regresión de sesión/identidad/restauración/expiración/respuestas tardías y limpieza |
| 014 | PASSED (técnico) | Sistema/selecciones explícitas, persistencia y fallback por storage corrupto/bloqueado |
| 015 | PASSED (técnico) | Medición de contraste por paleta/superficie/texto/estado/borde/foco y contraste de primario |
| 016 | PASSED (técnico) | DOM React: labels/tablas/formularios, feedback/selección/errores/disabled; foco/teclado real pendientes en TEST-019 |
| 017 | PASSED (técnico) | CI positiva y negativo relevante; reset/repetición y cleanup sin deploy |
| 018 | PENDING — HUMANO | Recorrido funcional/reproducibilidad por persona |
| 019 | PENDING — HUMANO | Revisión visual/teclado/SO por persona |
| 020 | PENDING — HUMANO | Mantenibilidad/arquitectura por persona |
| 021 | BLOCKED — Gate 2 | Sin acceptance/merge ni autoaprobación |
| 022 | PASSED (técnico) | Catálogo real, fixtures explícitos, rechazo de roles técnicos, estado/revocación/ACL |
| 023 | PASSED (técnico) | Maestras propias y catálogos simples iniciales, hashes/fuentes, jerarquía DB |
| 024 | PASSED (técnico) | UUID/FK, códigos/nombres normalizados UNIQUE incluso inactivos, límites 30/150/500 y sigla 2–10 |
| 025 | PASSED (técnico) | Contador global anual concurrente, 999/1000, año de creación Lima y ausencia de edición cliente |
| 026 | PASSED (técnico) | Sigla persistida/cambio atómico, años/correlativos fijos, terminales conservados y versiones |
| 027 | PASSED (técnico) | Herencia/adicional, sincronización solo faltantes, retiro e inactividad sin pérdida histórica |
| 028 | PASSED (técnico) | Matriz manual completa, motivos, terminales y prohibición de reapertura; reglas H3+ diferidas |
| 029 | PASSED (técnico) | Versión expected_updated_at, conflicto real y UI sin retry/sobrescritura automática |
| 030 | PASSED (técnico) | No DELETE de persistidos y descarte de nuevo formulario sin RPC/persistencia/auditoría |
| 031 | PASSED (técnico) | catalogo/catalogo_valor, pertenencia, activos/historia, OTRO+detalle y motivos libres sensibles |
| 032 | PASSED (técnico) | Mínimo Carrera/Ciclo, rechazo de última activa y carrera real concurrente validada |
| 033 | PASSED (técnico) | Fila permanente, origen único, no reactivación por sync, cambio Carrera con CAMBIO_CARRERA |
| 034 | PASSED (técnico) | Lectura referencial sin mantenimiento y directorio solo ADMIN_SISTEMA, no HU17/HU18 |

**DEFERRED / NOT APPLICABLE en H2:** comprobar matrículas/facturación antes de ANULADO y restricciones de edición cuando existan esos movimientos. Solo documentadas para H3/H4/H7; no entidades ficticias ni falsos PASSED. TEST-028 PASSED se refiere únicamente a reglas ejecutables de H2.

## Inventario observado

Capturado en PostgreSQL local después de reset/cleanup del clon 91498b0; las migraciones de f851dc7 son idénticas. No se infiere estado productivo ni se cambia plataforma.

| Objeto | Cantidad |
|---|---|
| Tablas públicas RLS | 15 |
| Policies SELECT | 18 |
| Constraints públicas | 71 |
| Índices públicos (incluye PK/UNIQUE/exclusión) | 41 |
| RPC públicas | 7 |
| Funciones privadas | 11 |
| Triggers propios | 12 |
| Tabla privada | private.ciclo_correlativo; PK anio y CHECK ultimo>0; sin acceso de navegador |

### Tablas públicas

`app_roles`, `app_user_roles`, `app_users`, `auditoria`, `capitania`, `carrera`, `carrera_materia`, `catalogo`, `catalogo_valor`, `ciclo`, `ciclo_materia`, `departamento`, `distrito`, `materia`, `provincia`.

Semillas: 3 roles, 2 catálogos, 7 valores, 25 departamentos, 196 provincias, 1891 distritos y 19 Capitanías. Fuente/versión/fecha/hashes en [sources.json](../../../supabase/reference/sources.json); datos de referencia iniciales, no cuentas Auth ni datos reales.

### Grants y RLS

anon/PUBLIC sin acceso a tablas de producto; authenticated SELECT explícito en las 15 tablas, sin INSERT/UPDATE/DELETE/TRUNCATE ni CREATE public/private. RLS reevalúa sujeto/roles activos. Director/Coordinador leen datos académicos/referenciales; Admin Sistema no tiene CRUD académico. Los tres leen auditoría; solo Admin Sistema lee directorio global de seguridad, los demás su identidad/asignaciones propias.

| Tabla | Policy | Predicado |
|---|---|---|
| carrera_materia | academic_read | `private.academic_user()` |
| ciclo_materia | academic_read | `private.academic_user()` |
| capitania | academic_read | `private.academic_user()` |
| materia | academic_read | `private.academic_user()` |
| carrera | academic_read | `private.academic_user()` |
| ciclo | academic_read | `private.academic_user()` |
| catalogo | academic_read | `private.academic_user()` |
| catalogo_valor | academic_read | `private.academic_user()` |
| departamento | academic_read | `private.academic_user()` |
| provincia | academic_read | `private.academic_user()` |
| distrito | academic_read | `private.academic_user()` |
| app_roles | app_roles_active_read | `(active AND private.functional_user())` |
| app_roles | app_roles_admin_read | `private.has_active_role('ADMIN_SISTEMA'::text)` |
| app_user_roles | app_user_roles_admin_read | `private.has_active_role('ADMIN_SISTEMA'::text)` |
| app_user_roles | app_user_roles_self_read | `((user_id = auth.uid()) AND private.functional_user())` |
| app_users | app_users_admin_read | `private.has_active_role('ADMIN_SISTEMA'::text)` |
| app_users | app_users_self_read | `((id = auth.uid()) AND private.functional_user())` |
| auditoria | audit_read | `private.functional_user()` |

### RPC públicas

Las siete son SECURITY DEFINER owner postgres, search_path vacío, aislamiento SERIALIZABLE por petición PostgREST y EXECUTE solo authenticated, nunca PUBLIC/anon. Cada cuerpo autoriza rol/operación/actor vigente; grant EXECUTE no es permiso de negocio. No SQL dinámico ni escritura genérica. Triggers y helpers internos no son endpoints.

| RPC | Firma |
|---|---|
| cambiar_active_carrera | `id uuid, expected_updated_at timestamp with time zone, active boolean, motivo text` |
| cambiar_active_materia | `id uuid, expected_updated_at timestamp with time zone, active boolean, motivo text` |
| cambiar_estado_ciclo | `id uuid, expected_updated_at timestamp with time zone, destino text, motivo text, motivo_desierto_id uuid` |
| cambiar_materia_ciclo | `ciclo_id uuid, materia_id uuid, expected_updated_at timestamp with time zone, activo boolean` |
| guardar_carrera | `p jsonb, materias uuid[]` |
| guardar_ciclo | `p jsonb, adicionales uuid[]` |
| guardar_materia | `p jsonb` |

### Funciones privadas

`academic_user`, `assert_fields`, `audit_change`, `authorize`, `carrera_minimum`, `functional_user`, `has_active_role`, `require_catalog`, `require_version`, `stamp_update`, `sync_missing`. Solo has_active_role, academic_user y functional_user reciben EXECUTE authenticated para evaluación de políticas; funciones internas restantes no. No schemas privados expuestos por Data API.

### Constraints públicas

| Tabla | Constraint | Definición |
|---|---|---|
| app_roles | app_roles_code_check | `CHECK ((code = ANY (ARRAY['DIRECTOR_ACADEMICO'::text, 'COORDINADOR_ACADEMICO'::text, 'ADMIN_SISTEMA'::text])))` |
| app_roles | app_roles_pkey | `PRIMARY KEY (code)` |
| app_user_roles | app_user_roles_pkey | `PRIMARY KEY (user_id, role_code)` |
| app_user_roles | app_user_roles_role_code_fkey | `FOREIGN KEY (role_code) REFERENCES app_roles(code)` |
| app_user_roles | app_user_roles_user_id_fkey | `FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE` |
| app_users | app_users_id_fkey | `FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE` |
| app_users | app_users_pkey | `PRIMARY KEY (id)` |
| auditoria | auditoria_pkey | `PRIMARY KEY (id)` |
| capitania | capitania_codigo_key | `UNIQUE (codigo)` |
| capitania | capitania_pkey | `PRIMARY KEY (id)` |
| carrera | carrera_codigo_check | `CHECK (((codigo = upper(btrim(codigo))) AND ((length(codigo) >= 1) AND (length(codigo) <= 30))))` |
| carrera | carrera_codigo_key | `UNIQUE (codigo)` |
| carrera | carrera_descripcion_check | `CHECK ((length(descripcion) <= 500))` |
| carrera | carrera_minimum | `TRIGGER DEFERRABLE INITIALLY DEFERRED` |
| carrera | carrera_modalidad_id_fkey | `FOREIGN KEY (modalidad_id) REFERENCES catalogo_valor(id)` |
| carrera | carrera_nombre_check | `CHECK (((nombre = upper(btrim(nombre))) AND ((length(nombre) >= 1) AND (length(nombre) <= 150))))` |
| carrera | carrera_nombre_key | `UNIQUE (nombre)` |
| carrera | carrera_pkey | `PRIMARY KEY (id)` |
| carrera | carrera_sigla_check | `CHECK (((sigla = upper(btrim(sigla))) AND (sigla ~ '^[A-Z0-9]{2,10}$'::text)))` |
| carrera | carrera_sigla_key | `UNIQUE (sigla)` |
| carrera_materia | asociacion_minimum | `TRIGGER DEFERRABLE INITIALLY DEFERRED` |
| carrera_materia | carrera_materia_carrera_id_fkey | `FOREIGN KEY (carrera_id) REFERENCES carrera(id)` |
| carrera_materia | carrera_materia_carrera_id_materia_id_key | `UNIQUE (carrera_id, materia_id)` |
| carrera_materia | carrera_materia_materia_id_fkey | `FOREIGN KEY (materia_id) REFERENCES materia(id)` |
| carrera_materia | carrera_materia_pkey | `PRIMARY KEY (id)` |
| catalogo | catalogo_codigo_key | `UNIQUE (codigo)` |
| catalogo | catalogo_pkey | `PRIMARY KEY (id)` |
| catalogo_valor | catalogo_valor_catalogo_id_codigo_key | `UNIQUE (catalogo_id, codigo)` |
| catalogo_valor | catalogo_valor_catalogo_id_fkey | `FOREIGN KEY (catalogo_id) REFERENCES catalogo(id)` |
| catalogo_valor | catalogo_valor_pkey | `PRIMARY KEY (id)` |
| ciclo | ciclo_anio_correlativo_key | `UNIQUE (anio, correlativo)` |
| ciclo | ciclo_capitania_id_fkey | `FOREIGN KEY (capitania_id) REFERENCES capitania(id)` |
| ciclo | ciclo_carrera_id_capitania_id_daterange_excl | `EXCLUDE USING gist (carrera_id WITH =, capitania_id WITH =, daterange(fecha_inicio, fecha_fin, '[]'::text) WITH &&) WHERE ((estado_codigo = ANY (ARRAY['PROGRAMADO'::text, 'EN_CURSO'::text, 'CERRADO'::text])))` |
| ciclo | ciclo_carrera_id_fkey | `FOREIGN KEY (carrera_id) REFERENCES carrera(id)` |
| ciclo | ciclo_check | `CHECK ((fecha_fin >= fecha_inicio))` |
| ciclo | ciclo_check1 | `CHECK (((estado_codigo <> 'DESIERTO'::text) OR (motivo_desierto_id IS NOT NULL)))` |
| ciclo | ciclo_check2 | `CHECK (((estado_codigo <> 'ANULADO'::text) OR (COALESCE(length(btrim(motivo)), 0) > 0)))` |
| ciclo | ciclo_codigo_ciclo_key | `UNIQUE (codigo_ciclo)` |
| ciclo | ciclo_correlativo_check | `CHECK ((correlativo > 0))` |
| ciclo | ciclo_departamento_id_fkey | `FOREIGN KEY (departamento_id) REFERENCES departamento(id)` |
| ciclo | ciclo_distrito_id_provincia_id_fkey | `FOREIGN KEY (distrito_id, provincia_id) REFERENCES distrito(id, provincia_id)` |
| ciclo | ciclo_estado_codigo_check | `CHECK ((estado_codigo = ANY (ARRAY['PROGRAMADO'::text, 'EN_CURSO'::text, 'CERRADO'::text, 'DESIERTO'::text, 'ANULADO'::text])))` |
| ciclo | ciclo_motivo_desierto_id_fkey | `FOREIGN KEY (motivo_desierto_id) REFERENCES catalogo_valor(id)` |
| ciclo | ciclo_nombre_promocion_check | `CHECK ((length(nombre_promocion) <= 150))` |
| ciclo | ciclo_pkey | `PRIMARY KEY (id)` |
| ciclo | ciclo_provincia_id_departamento_id_fkey | `FOREIGN KEY (provincia_id, departamento_id) REFERENCES provincia(id, departamento_id)` |
| ciclo_materia | ciclo_materia_check | `CHECK (((activo AND (motivo_inactivacion IS NULL)) OR ((NOT activo) AND (motivo_inactivacion IS NOT NULL))))` |
| ciclo_materia | ciclo_materia_ciclo_id_fkey | `FOREIGN KEY (ciclo_id) REFERENCES ciclo(id)` |
| ciclo_materia | ciclo_materia_ciclo_id_materia_id_key | `UNIQUE (ciclo_id, materia_id)` |
| ciclo_materia | ciclo_materia_materia_id_fkey | `FOREIGN KEY (materia_id) REFERENCES materia(id)` |
| ciclo_materia | ciclo_materia_motivo_inactivacion_check | `CHECK ((motivo_inactivacion = ANY (ARRAY['RETIRO_MANUAL'::text, 'CAMBIO_CARRERA'::text])))` |
| ciclo_materia | ciclo_materia_observacion_check | `CHECK ((length(observacion) <= 500))` |
| ciclo_materia | ciclo_materia_origen_check | `CHECK ((origen = ANY (ARRAY['HEREDADA'::text, 'ADICIONAL'::text])))` |
| ciclo_materia | ciclo_materia_pkey | `PRIMARY KEY (id)` |
| departamento | departamento_codigo_key | `UNIQUE (codigo)` |
| departamento | departamento_pkey | `PRIMARY KEY (id)` |
| distrito | distrito_codigo_key | `UNIQUE (codigo)` |
| distrito | distrito_id_provincia_id_key | `UNIQUE (id, provincia_id)` |
| distrito | distrito_pkey | `PRIMARY KEY (id)` |
| distrito | distrito_provincia_id_fkey | `FOREIGN KEY (provincia_id) REFERENCES provincia(id)` |
| materia | materia_codigo_check | `CHECK (((codigo = upper(btrim(codigo))) AND ((length(codigo) >= 1) AND (length(codigo) <= 30))))` |
| materia | materia_codigo_key | `UNIQUE (codigo)` |
| materia | materia_descripcion_check | `CHECK ((length(descripcion) <= 500))` |
| materia | materia_minimum | `TRIGGER DEFERRABLE INITIALLY DEFERRED` |
| materia | materia_nombre_check | `CHECK (((nombre = upper(btrim(nombre))) AND ((length(nombre) >= 1) AND (length(nombre) <= 150))))` |
| materia | materia_nombre_key | `UNIQUE (nombre)` |
| materia | materia_pkey | `PRIMARY KEY (id)` |
| provincia | provincia_codigo_key | `UNIQUE (codigo)` |
| provincia | provincia_departamento_id_fkey | `FOREIGN KEY (departamento_id) REFERENCES departamento(id)` |
| provincia | provincia_id_departamento_id_key | `UNIQUE (id, departamento_id)` |
| provincia | provincia_pkey | `PRIMARY KEY (id)` |

### Índices públicos

| Tabla | Índice | Definición |
|---|---|---|
| app_roles | app_roles_pkey | `CREATE UNIQUE INDEX app_roles_pkey ON public.app_roles USING btree (code)` |
| app_user_roles | app_user_roles_pkey | `CREATE UNIQUE INDEX app_user_roles_pkey ON public.app_user_roles USING btree (user_id, role_code)` |
| app_users | app_users_pkey | `CREATE UNIQUE INDEX app_users_pkey ON public.app_users USING btree (id)` |
| auditoria | auditoria_actor | `CREATE INDEX auditoria_actor ON public.auditoria USING btree (actor)` |
| auditoria | auditoria_entidad_accion | `CREATE INDEX auditoria_entidad_accion ON public.auditoria USING btree (entidad, accion)` |
| auditoria | auditoria_fecha | `CREATE INDEX auditoria_fecha ON public.auditoria USING btree (fecha DESC)` |
| auditoria | auditoria_pkey | `CREATE UNIQUE INDEX auditoria_pkey ON public.auditoria USING btree (id)` |
| capitania | capitania_codigo_key | `CREATE UNIQUE INDEX capitania_codigo_key ON public.capitania USING btree (codigo)` |
| capitania | capitania_pkey | `CREATE UNIQUE INDEX capitania_pkey ON public.capitania USING btree (id)` |
| carrera | carrera_codigo_key | `CREATE UNIQUE INDEX carrera_codigo_key ON public.carrera USING btree (codigo)` |
| carrera | carrera_nombre_key | `CREATE UNIQUE INDEX carrera_nombre_key ON public.carrera USING btree (nombre)` |
| carrera | carrera_pkey | `CREATE UNIQUE INDEX carrera_pkey ON public.carrera USING btree (id)` |
| carrera | carrera_sigla_key | `CREATE UNIQUE INDEX carrera_sigla_key ON public.carrera USING btree (sigla)` |
| carrera_materia | carrera_materia_carrera_id_materia_id_key | `CREATE UNIQUE INDEX carrera_materia_carrera_id_materia_id_key ON public.carrera_materia USING btree (carrera_id, materia_id)` |
| carrera_materia | carrera_materia_materia | `CREATE INDEX carrera_materia_materia ON public.carrera_materia USING btree (materia_id)` |
| carrera_materia | carrera_materia_pkey | `CREATE UNIQUE INDEX carrera_materia_pkey ON public.carrera_materia USING btree (id)` |
| catalogo | catalogo_codigo_key | `CREATE UNIQUE INDEX catalogo_codigo_key ON public.catalogo USING btree (codigo)` |
| catalogo | catalogo_pkey | `CREATE UNIQUE INDEX catalogo_pkey ON public.catalogo USING btree (id)` |
| catalogo_valor | catalogo_valor_catalogo | `CREATE INDEX catalogo_valor_catalogo ON public.catalogo_valor USING btree (catalogo_id)` |
| catalogo_valor | catalogo_valor_catalogo_id_codigo_key | `CREATE UNIQUE INDEX catalogo_valor_catalogo_id_codigo_key ON public.catalogo_valor USING btree (catalogo_id, codigo)` |
| catalogo_valor | catalogo_valor_pkey | `CREATE UNIQUE INDEX catalogo_valor_pkey ON public.catalogo_valor USING btree (id)` |
| ciclo | ciclo_anio_correlativo_key | `CREATE UNIQUE INDEX ciclo_anio_correlativo_key ON public.ciclo USING btree (anio, correlativo)` |
| ciclo | ciclo_carrera_id_capitania_id_daterange_excl | `CREATE INDEX ciclo_carrera_id_capitania_id_daterange_excl ON public.ciclo USING gist (carrera_id, capitania_id, daterange(fecha_inicio, fecha_fin, '[]'::text)) WHERE (estado_codigo = ANY (ARRAY['PROGRAMADO'::text, 'EN_CURSO'::text, 'CERRADO'::text]))` |
| ciclo | ciclo_codigo_ciclo_key | `CREATE UNIQUE INDEX ciclo_codigo_ciclo_key ON public.ciclo USING btree (codigo_ciclo)` |
| ciclo | ciclo_pkey | `CREATE UNIQUE INDEX ciclo_pkey ON public.ciclo USING btree (id)` |
| ciclo_materia | ciclo_materia_ciclo_id_materia_id_key | `CREATE UNIQUE INDEX ciclo_materia_ciclo_id_materia_id_key ON public.ciclo_materia USING btree (ciclo_id, materia_id)` |
| ciclo_materia | ciclo_materia_materia | `CREATE INDEX ciclo_materia_materia ON public.ciclo_materia USING btree (materia_id)` |
| ciclo_materia | ciclo_materia_pkey | `CREATE UNIQUE INDEX ciclo_materia_pkey ON public.ciclo_materia USING btree (id)` |
| departamento | departamento_codigo_key | `CREATE UNIQUE INDEX departamento_codigo_key ON public.departamento USING btree (codigo)` |
| departamento | departamento_pkey | `CREATE UNIQUE INDEX departamento_pkey ON public.departamento USING btree (id)` |
| distrito | distrito_codigo_key | `CREATE UNIQUE INDEX distrito_codigo_key ON public.distrito USING btree (codigo)` |
| distrito | distrito_id_provincia_id_key | `CREATE UNIQUE INDEX distrito_id_provincia_id_key ON public.distrito USING btree (id, provincia_id)` |
| distrito | distrito_pkey | `CREATE UNIQUE INDEX distrito_pkey ON public.distrito USING btree (id)` |
| distrito | distrito_provincia | `CREATE INDEX distrito_provincia ON public.distrito USING btree (provincia_id)` |
| materia | materia_codigo_key | `CREATE UNIQUE INDEX materia_codigo_key ON public.materia USING btree (codigo)` |
| materia | materia_nombre_key | `CREATE UNIQUE INDEX materia_nombre_key ON public.materia USING btree (nombre)` |
| materia | materia_pkey | `CREATE UNIQUE INDEX materia_pkey ON public.materia USING btree (id)` |
| provincia | provincia_codigo_key | `CREATE UNIQUE INDEX provincia_codigo_key ON public.provincia USING btree (codigo)` |
| provincia | provincia_departamento | `CREATE INDEX provincia_departamento ON public.provincia USING btree (departamento_id)` |
| provincia | provincia_id_departamento_id_key | `CREATE UNIQUE INDEX provincia_id_departamento_id_key ON public.provincia USING btree (id, departamento_id)` |
| provincia | provincia_pkey | `CREATE UNIQUE INDEX provincia_pkey ON public.provincia USING btree (id)` |

### Triggers propios

| Tabla | Trigger | Definición |
|---|---|---|
| carrera | carrera_audit | `CREATE TRIGGER carrera_audit AFTER INSERT OR DELETE OR UPDATE ON public.carrera FOR EACH ROW EXECUTE FUNCTION private.audit_change()` |
| carrera | carrera_minimum | `CREATE CONSTRAINT TRIGGER carrera_minimum AFTER INSERT OR UPDATE ON public.carrera DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.carrera_minimum()` |
| carrera | carrera_stamp | `CREATE TRIGGER carrera_stamp BEFORE UPDATE ON public.carrera FOR EACH ROW EXECUTE FUNCTION private.stamp_update()` |
| carrera_materia | asociacion_minimum | `CREATE CONSTRAINT TRIGGER asociacion_minimum AFTER INSERT OR DELETE ON public.carrera_materia DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.carrera_minimum()` |
| carrera_materia | carrera_materia_audit | `CREATE TRIGGER carrera_materia_audit AFTER INSERT OR DELETE ON public.carrera_materia FOR EACH ROW EXECUTE FUNCTION private.audit_change()` |
| ciclo | ciclo_audit | `CREATE TRIGGER ciclo_audit AFTER INSERT OR DELETE OR UPDATE ON public.ciclo FOR EACH ROW EXECUTE FUNCTION private.audit_change()` |
| ciclo | ciclo_stamp | `CREATE TRIGGER ciclo_stamp BEFORE UPDATE ON public.ciclo FOR EACH ROW EXECUTE FUNCTION private.stamp_update()` |
| ciclo_materia | ciclo_materia_audit | `CREATE TRIGGER ciclo_materia_audit AFTER INSERT OR DELETE OR UPDATE ON public.ciclo_materia FOR EACH ROW EXECUTE FUNCTION private.audit_change()` |
| ciclo_materia | ciclo_materia_stamp | `CREATE TRIGGER ciclo_materia_stamp BEFORE UPDATE ON public.ciclo_materia FOR EACH ROW EXECUTE FUNCTION private.stamp_update()` |
| materia | materia_audit | `CREATE TRIGGER materia_audit AFTER INSERT OR DELETE OR UPDATE ON public.materia FOR EACH ROW EXECUTE FUNCTION private.audit_change()` |
| materia | materia_minimum | `CREATE CONSTRAINT TRIGGER materia_minimum AFTER UPDATE ON public.materia DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.carrera_minimum()` |
| materia | materia_stamp | `CREATE TRIGGER materia_stamp BEFORE UPDATE ON public.materia FOR EACH ROW EXECUTE FUNCTION private.stamp_update()` |

## Limpieza observada

`{"auth": 0, "app_users": 0, "assignments": 0, "materias": 0, "carreras": 0, "ciclos": 0, "auditoria": 0, "roles": 3, "distritos": 1891, "capitanias": 19}`

Cero cuentas Auth/app_users/asignaciones y cero Materias/Carreras/Ciclos/auditoría de ensayo; quedan únicamente roles y referencias del reset. No se borran Ciclos desde una operación de aplicación: se reconstruye la base local desechable. Supabase y Vite de verificaciones quedaron detenidos.

## Hallazgos y riesgos residuales

- Carrera/inactivación concurrentes: primera implementación READ COMMITTED falló; SERIALIZABLE por RPC y repetición real corrigen el mínimo sin locks de formulario. Conflictos 40001 exigen recarga, no retry con nueva versión.
- CRLF/LF del snapshot: normalización canónica y hash corregidos, sin eliminar controles. Reset heredado --no-seed corregido para cargar referencias; guard intacto.
- Modalidad inactiva histórica: edición conserva referencia previa sin permitir nuevas selecciones inactivas. Guardado UI bloquea entrada/descarte mientras está pendiente.
- JWT residual hasta expiración aceptado en H1; autorización efectiva DB/RLS vigente. XSS sigue siendo riesgo relevante del SDK; no HTML arbitrario ni secretos en cliente.
- UBIGEO es snapshot oficial 2022, no se declara cobertura completa actualizada a 2026; DICAPI snapshot 22/10/2026. Versiones explícitas para decisión humana, no datos inventados.
- btree_gist nativa permite exclusión declarativa UUID/rangos concurrente; sin servicio nuevo ni dependencia JS. Funciones privilegiadas y composición RLS requieren revisión humana de mantenibilidad.
- Browser adicional no iniciado por fallo del entorno de automatización: failed to write kernel assets. No resultado de navegador ni SO atribuido; revisar teclado/foco/forced-colors en TEST-019 humano.
- Mediciones de paletas son técnicas y acotadas; no certificación WCAG completa. Chunk build ~510 kB genera advertencia, sin SLA de rendimiento inventado ni optimización prematura.
- Riesgo H0 conservado: 54322/TCP NO VERIFICADO DE FORMA INDEPENDIENTE; mitigación Windows Firewall aprobada, sin afirmar Docker exclusivo loopback.

No aceptación humana H2, Gate 2 ni merge. No H3 ni funcionalidades financieras, alumnos/profesores/documentos/PDF o infraestructura productiva.

## Comparación razonada de simplicidad — pendiente de juicio humano

Una alta/edición de Materia atraviesa formulario concreto → RPC guardar_materia → constraints y trigger de auditoría, dentro de una petición/transacción. Una consulta usa Data API con RLS; React no decide la autorización efectiva. No existen controller/service/repository adicionales ni motor configurable de CRUD. Esto reduce lugares que modificar para una operación sencilla, pero no demuestra por sí solo menor tiempo de mantenimiento.

Carrera con materias, propagación y cambio de sigla exige más lógica que una alta simple: se concentra en el comando SQL para evitar coordinación de varias escrituras desde React. La restricción de solapamiento reside en una exclusión declarativa; el mínimo y la auditoría se garantizan en servidor. SERIALIZABLE fue necesario por un fallo concurrente observado, no por escalabilidad hipotética. Su costo son conflictos explícitos y SQL privilegiado que un mantenedor debe comprender.

Frente a separar API propia, servicios y repositorios, esta implementación tiene menos componentes desplegables y ninguna dependencia nueva de frontend. A cambio, PostgreSQL reúne reglas, ACL, RLS, RPC y triggers: siete RPC y once helpers no deben considerarse automáticamente simples. El inventario permite revisar exactamente cada privilegio y localizar fallos; test:academic reproduce invariantes/rollback y test:security las denegaciones. No se midió un ahorro comparativo de horas ni se evaluaron implementaciones históricas como benchmark.

El catálogo maestro y las pantallas son concretos; la propagación solo agrega faltantes, conservando un origen por relación. Se evita un motor de sincronización o permisos genérico. Los tres temas explícitos y Sistema reutilizan tokens CSS y estado local, sin backend/Context adicional. La persona debe validar legibilidad, facilidad real de cambiar un CRUD y diagnóstico en TEST-H2-020; este análisis técnico no aprueba el gate arquitectónico.
