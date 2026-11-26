# Primer despliegue hospedado — procedimiento preparado, no ejecutado

Base: main `43bc1fcfa986b046aa0db8801d9e4b7dba4585c7`. Rama: feature/hosted-deployment.
Fase 1 modifica únicamente el repositorio. H7 permanece CLOSED / ACEPTADO / INTEGRADO. No inicia H8/H9, no autoriza infraestructura, migraciones remotas, publicación ni merge.

## 1. Validación y separación de entornos

`VITE_DEPLOYMENT_ENV=local|hosted` selecciona un contrato, nunca se infiere desde la URL. Ausencia conserva local para los scripts históricos; valor vacío o desconocido falla.

| Variable pública | Local | Hospedado |
| --- | --- | --- |
| VITE_DEPLOYMENT_ENV | local (predeterminado seguro) | hosted explícito |
| VITE_SUPABASE_URL | HTTP loopback, puerto 54321 | HTTPS, `<project-ref>.supabase.co`, puerto estándar |
| VITE_SUPABASE_PROJECT_REF | ausente o vacío | 20 caracteres minúsculos alfanuméricos, coincide con URL |
| VITE_SUPABASE_PUBLISHABLE_KEY | publicable o JWT anon | publicable del proyecto o JWT anon con ref coincidente |

Se rechazan credenciales en URL, rutas, query, fragmentos y claves secret/service_role. Una clave publicable opaca no permite comprobar criptográficamente su pertenencia durante el build: comprobarla contra el proyecto por Auth/Data API antes de publicar. El análisis de JWT aquí solo restringe configuración pública; no valida su firma ni autoriza usuarios. Auth valida la sesión en servidor.

Todo VITE_* es público. Se rechazan nombres públicos que contengan SECRET, SERVICE_ROLE, PASSWORD o TOKEN. Nunca introducir credenciales SQL, PAT ni claves administrativas con otro nombre público. El build y el navegador aplican el mismo validador. No configurar valores reales en archivos versionados.

Mantener `scripts/local-platform.mjs`, `scripts/local-supabase.mjs` y `scripts/check-local.mjs` intactos. No enlazar este checkout local a Cloud. No ejecutar fixtures, test:* de integración, reset o cleanup contra Cloud. La CI conserva regresión local y construye ambos entornos con datos sintéticos; no tiene credenciales de despliegue.

## 2. Preparación de operador (ejecución posterior y autorizada)

1. Fijar candidato exacto y verificar CI de ese SHA, dependencias y diff. Las 41 migraciones deben coincidir byte por byte con la base aprobada.
2. Registrar responsable, proyecto/ref, región, plan, dominio HTTPS y ventana de mantenimiento. Confirmar PostgreSQL 17 compatible, extensión btree_gist y configuración de Data API. Exponer únicamente public; private no debe estar expuesto. Mantener límite de respuesta 1000 y Realtime deshabilitado, como en local.
3. Usar una copia operativa limpia y separada del checkout de desarrollo, con CLI 2.121.0 instalada por `npm ci`, Node 24.19.0 y npm 10.9.0. No copiar `.env.local`, `.temp`, backups o datos de desarrollo. No actualizar la CLI implícitamente mediante npx.
4. Solo después de autorización, crear/seleccionar el proyecto y comprobar su identidad en Dashboard y host. Guardar secretos en el gestor del operador. Usar login interactivo o entorno protegido; nunca argumentos de contraseña, logs de depuración o transcripciones de secretos.

## 3. Aplicación de migraciones y catálogos

En la copia operativa, enlazar explícitamente con `node node_modules/supabase/dist/supabase.js link --project-ref REF_APROBADA` (credenciales por canal seguro). Verificar el ref enlazado. Consultar ayuda de la CLI fijada antes de operar: documentación reciente puede describir versiones mayores.

Precondición: proyecto nuevo, sin esquema de aplicación, cuentas, objetos ni datos previos. Si hay discrepancias, detener y revisar; no ejecutar reset remoto, repair, borrados o cambios del historial para forzar compatibilidad.

1. Ejecutar `node node_modules/supabase/dist/supabase.js db push --dry-run` y revisar que se proponen exactamente las 41 migraciones ordenadas. No usar `--include-seed`.
2. Ejecutar `node node_modules/supabase/dist/supabase.js db push`. No asumir que esto aplica ajustes de Auth/Data API del config local; configurarlos y verificarlos por separado.
3. Comprobar las 41 versiones y grants/RLS/owners. Son relevantes `btree_gist` en extensions, roles Supabase, vistas security_invoker, RPC restringidas y search_path vacío. Si una migración falla, inspeccionar el estado antes de reanudar; no marcarla aplicada manualmente.
4. Preparar un servicio libpq privado `perumar-hosted` con host exacto del proyecto, usuario autorizado, TLS verificado (`verify-full`, CA correspondiente) y contraseña mediante archivo protegido fuera del repositorio. Comprobar conexión y ref; no pasar una URL con contraseña al shell. Usar conexión directa o session pooler adecuado, no transaction pooler para esta operación.
5. Desde la raíz de la copia operativa ejecutar: `psql "service=perumar-hosted" -X -v ON_ERROR_STOP=1 -f supabase/reference/load-hosted-catalogs.sql`.

El archivo agrupa en una transacción con precondiciones y bloqueo de carga:

1. `supabase/seed.sql`: modalidades/motivos, INEI y capitanías.
2. `20261104020000_initial_dicapi_fishing_courses.sql`: MAM-009/010.
3. `supabase/reference/dicapi-course-links.sql`.
4. `20261104040000_initial_authorized_dicapi_courses.sql`: MAM-037/038/039/048.

Las dos migraciones DICAPI omiten carga cuando todavía no existe modalidad Presencial; por eso se vuelven a ejecutar sus cargas acotadas después del seed, sin editar archivos ni añadir entradas falsas al historial. Dentro de la transacción se restablecen constraints diferidas antes de cada carga DICAPI: los bloques anteriores ejecutan SET CONSTRAINTS ALL IMMEDIATE, y cada curso debe poder insertar sus materias antes de validar su mínimo. No repetir seed a ciegas: el procedimiento rechaza un destino ya poblado. Si falla, la transacción revierte también los cambios de triggers; investigar antes de reintentar.

Verificar 25 departamentos, 196 provincias, 1891 distritos (snapshot INEI 2022, no actualizado a 2026), 19 capitanías, seis cursos y sus materias/enlaces. Comprobar catálogos H3, documentos H6 y bancos LBTR H7 contra archivos de supabase/reference y fuentes aprobadas. No descargar ni actualizar fuentes durante despliegue. No copiar alumnos, empresas, ciclos, matrículas, pagos, cuentas ni objetos de prueba. Conservar hashes y recuentos como evidencia sin PII.

## 4. Auth y usuarios iniciales

Configurar en Cloud Site URL HTTPS del dominio aprobado, redirect allowlist exacta, email/password disponible, registro público y anónimo deshabilitados, expiración 3600 segundos. No copiar SMTP local. Si se habilita correo, configurar proveedor, remitente y probar entrega/recuperación; no presuponer que la aplicación contiene una pantalla de recovery/invitación (actualmente no existe).

1. Aprobar por persona el correo y roles mínimos. ADMIN_SISTEMA no concede por sí mismo acceso académico. No asignar todos los roles por defecto.
2. Desde Auth Admin/Dashboard, crear cada identidad verificada usando una contraseña única generada y entregada por canal privado. No versionar contraseñas ni ponerlas en argumentos, seed o logs; el canal de cambio/recuperación se debe resolver operativamente antes del acceso real. No simular confirmación de una dirección no verificada.
3. Con el UUID confirmado ejecutar `psql "service=perumar-hosted" -X -v ON_ERROR_STOP=1 -v auth_user_id=UUID_APROBADO -v role_code=ROL_APROBADO -f supabase/reference/bootstrap-hosted-user.sql`. Admite únicamente ADMIN_SISTEMA, DIRECTOR_ACADEMICO o COORDINADOR_ACADEMICO; repetir por cada rol aprobado. No reactiva perfiles inactivos ni elimina asignaciones previas.
4. Comprobar Auth más app_users activo y app_user_roles. El alta Auth y la asignación SQL son dos operaciones: si la segunda falla, la cuenta sin perfil/roles queda sin acceso funcional. Corregir la causa y reintentar la asignación; no eliminar cuentas potencialmente utilizadas ni ampliar permisos para desbloquearlas.
5. Probar login, cierre, expiración, bloqueo por usuario/rol inactivo y separación entre administración y academia. Usar cuentas institucionales controladas; no ejecutar la matriz de fixtures local contra producción.

## 5. Edge Functions, secretos y Storage

| Función | Origen autorizado | Credenciales del runtime |
| --- | --- | --- |
| ficha-matricula | FICHA_ALLOWED_ORIGINS | SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY |
| expediente-cargar | EXPEDIENTE_ALLOWED_ORIGINS | las tres anteriores |
| expediente-generar | EXPEDIENTE_ALLOWED_ORIGINS | las tres anteriores |
| expediente-descargar | EXPEDIENTE_ALLOWED_ORIGINS | las tres anteriores |
| os-pdf-cargar | H7_OS_ALLOWED_ORIGINS | las tres anteriores |
| os-pdf-descargar | H7_OS_ALLOWED_ORIGINS | las tres anteriores |
| consultar-ruc | RUC_ALLOWED_ORIGINS | SUPABASE_URL, SUPABASE_ANON_KEY |
| consultar-dni | DNI_ALLOWED_ORIGINS | SUPABASE_URL, SUPABASE_ANON_KEY; APIsPERU bloqueado |

Supabase proporciona las claves de runtime que utiliza el código actual; confirmar disponibilidad sin imprimirlas ni sobrescribir variables reservadas. Mantener compatibilidad con esas claves legacy, sin migrar SDK/arquitectura en esta fase. Las claves de operador (PAT/SQL/Cloudflare) no son secretos del frontend ni de las funciones.

Configurar los cinco *_ALLOWED_ORIGINS con el mismo origen HTTPS de Pages/dominio aprobado (lista separada por comas para varios orígenes explícitos). Sin rutas, slash final, comodines, localhost ni previews no aprobadas. Ausencia en hosted rechaza solicitudes de navegador; peticiones sin Origin siguen requiriendo sesión y rol. CORS no sustituye autorización.

**APIsPERU:** configurar APISPERU_PRODUCTION_AUTHORIZED=false; no cargar APISPERU_TOKEN en Cloud. El handler verifica autorización antes del fetch externo. No realizar prueba positiva contra el proveedor ni habilitar el flag durante este despliegue. Verificar una consulta válida autorizada devuelve indisponibilidad sin tráfico al proveedor. OpenRUC es independiente: consultar-ruc sigue consultando openruc.com, sin token APIsPERU y con los controles H7 existentes.

Desplegar posteriormente cada nombre de la tabla usando `node node_modules/supabase/dist/supabase.js functions deploy NOMBRE --project-ref REF_APROBADA`, conservando deno.json/deno.lock de cada función. No usar --no-verify-jwt por conveniencia: esta preparación conserva la verificación JWT predeterminada; verificar compatibilidad del gateway con los JWT de sesión/firma Cloud y preflight OPTIONS antes de liberar acceso. Si hay incompatibilidad, detener y preparar un cambio revisado; no retirar autenticación. El handler también verifica getUser, perfil y roles.

Storage: fichas-matricula privado PDF/2MiB, h6-expediente privado PDF/JPEG/PNG/5MiB y h7-os privado PDF/5MiB. No añadir policies de objetos para anon/authenticated ni convertir buckets en públicos. Verificar acceso directo/listado/firma denegados, acceso por Edge permitido solo a roles académicos, versiones y auditoría. Mantener limpieza/conciliación manual existente y nunca borrar bytes históricos confirmados por conveniencia de despliegue.

## 6. Cloudflare Pages

Configurar proyecto posteriormente con raíz del repositorio que contiene package.json, rama de producción aprobada, salida dist. Instalación reproducible `npm ci`, Node 24.19.0 (.nvmrc / NODE_VERSION), npm 10.9.0; build `npm run build`. Verificar las versiones reales del runner. No introducir nuevas dependencias, Workers ni proxy/API adicional.

Configurar solo las cuatro variables públicas hosted de la sección 1. No subir .env.local. Previews deshabilitadas para acceso al backend real; no heredar secretos ni habilitar un wildcard de orígenes. La URL pages.dev y un dominio propio son orígenes distintos: aprobar y configurar solo los que se usarán.

public/_headers es una plantilla: Vite sustituye el origen reservado por la URL Supabase validada en dist/_headers. Publicar exclusivamente dist generado, nunca public o la plantilla sin resolver. connect-src queda limitado al mismo sitio y al proyecto concreto; no permite APIsPERU/OpenRUC desde navegador. script-src no permite inline ni eval. style-src permite estilos inline por menús/temas dinámicos existentes. img-src data:/blob: y frame-src blob: conservan logos, fotos y previews PDF; frame-ancestors none impide embeber la aplicación desde otro sitio. No añadir COEP u otras cabeceras que bloqueen PDF sin probar compatibilidad. HSTS, nosniff, DENY, no-referrer y Permissions-Policy completan la política. Las respuestas estáticas revalidan con Cache-Control: no-cache; se prioriza evitar versiones mezcladas en este primer despliegue.

Pages ofrece fallback SPA si no hay 404.html superior; no se necesita _redirects. Verificar respuestas de cabeceras, recarga/acceso directo a rutas protegidas, login, temas, imágenes, PDF en iframe/nueva pestaña, impresión, Word y CSV. La prueba de archivos de build no sustituye esta verificación real del navegador hospedado.

## 7. Validación antes de abrir acceso

Registrar evidencia del SHA desplegado y los ocho nombres/versiones, historial exacto, referencias, RLS/grants y buckets. Probar anónimo, roles aprobados, cuenta inactiva y JWT expirado; navegador desde origen aprobado y rechazado; DNI bloqueado; RUC y archivos según contrato. Medir CPU/memoria y latencias con muestras sintéticas acotadas en el entorno autorizado: local/CI no acredita límites Cloud. Los residuales H7 de hosted, CPU/memoria, forced-colors y bundle siguen registrados hasta su comprobación específica; H7 no se reabre.

## 8. Respaldo, recuperación y rollback

Objetivo mínimo propuesto: RPO 24h y RTO una jornada laboral. Confirmar responsable y capacidad real del plan antes de aceptar datos institucionales.

- BD: respaldo diario y previo a cambios, externo y cifrado; retención mínima propuesta de 7 diarios y 4 semanales. Confirmar cobertura de Auth, public/private, roles/grants, secuencias e historial de migraciones; no asumir que un db dump predeterminado incluye todos los esquemas administrados. Documentar los comandos/opciones concretos del plan y CLI elegidos y comprobar contenido antes de darlo por válido.
- Storage: copia separada de bytes de los tres buckets con keys, tamaños, hashes y versiones referenciadas; el backup de BD no incluye bytes. Para coherencia mínima, suspender escrituras durante la copia coordinada de BD y objetos. No confundir fichas derivadas temporales con expedientes/OS persistentes.
- Conservar SHA/artefacto dist, funciones/locks, configuración Auth/Data API/Storage, variables no sensibles y procedimiento para reponer secretos desde gestor externo. No guardar secretos junto al código o a evidencias públicas.
- Ensayar restauración en destino aislado autorizado: BD y Auth, archivos con mismas keys y hashes, secuencias, permisos, funciones/configuración y login/lecturas/documentos. Evitar sobrescribir tablas gestionadas de Storage sin seguir el procedimiento soportado por Supabase. Registrar duración y pérdida observada para validar RPO/RTO.
- Rollback del frontend: republicar artefacto anterior solo si es compatible con la BD. Rollback de funciones: versión anterior compatible. No ejecutar migraciones down improvisadas ni reset. Ante un cambio de datos fallido, detener escrituras y decidir corrección hacia adelante o restauración coordinada BD+objetos, conservando evidencia. Restaurar puede perder escrituras posteriores al punto de recuperación; aprobación operativa antes de reemplazar datos.

## Referencias oficiales

- [Funciones y despliegue](https://supabase.com/docs/guides/functions/deploy), [autorización](https://supabase.com/docs/guides/functions/auth-headers), [límites](https://supabase.com/docs/guides/functions/limits).
- [Backups y exclusión de bytes Storage](https://supabase.com/docs/guides/platform/backups).
- [Build Pages](https://developers.cloudflare.com/pages/configuration/build-configuration/), [SPA](https://developers.cloudflare.com/pages/configuration/serving-pages/), [cabeceras](https://developers.cloudflare.com/pages/configuration/headers/).

La documentación del proveedor puede avanzar respecto de CLI 2.121.0; prevalecen ayuda/versiones fijadas y comprobación explícita antes de ejecutar comandos remotos.
