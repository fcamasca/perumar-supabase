# CI segun los archivos modificados

El check `verify` se conserva para no cambiar su nombre en las protecciones de rama. El workflow sigue arrancando en cada push a `feature/**` y en los PR hacia `main`; no se omite el workflow completo con filtros de rutas.

- Siempre: reglas de seleccion, lint, tipos frontend/Edge, pruebas unitarias y builds sinteticos local/hospedado con CSP y rechazo de secretos.
- Push con cambios exclusivamente en `src/**/*.css`, imagenes/fuentes de `src/assets` o `public`, Markdown de `docs`, README.md o CHANGELOG.md: validacion rapida, sin iniciar Docker/Supabase.
- Cualquier otro archivo: regresion integral existente, incluidos SQL, Edge Functions, TS/TSX, tests, scripts, dependencias, cabeceras, configuracion y la propia CI.
- PR hacia `main`: integral siempre, aunque cambie solo CSS.
- Ejecucion manual: `suite=full` por defecto; `quick` debe elegirse explicitamente. El ensayo de fallo de seguridad siempre obliga a la integral.

La seleccion compara todos los cambios del push (`before` a `after`), no solo el ultimo commit. Los renombrados revisan ambas rutas. Rama nueva, historial no disponible, error de comparacion o evento desconocido obligan a la integral. Un push sin cambios de archivos usa la rapida.

Los componentes actuales mezclan interfaz y negocio: un cambio de texto en un TSX como EnrollmentDocuments.tsx activa la integral. No se considera seguro clasificar ese archivo entero como visual. No se intenta interpretar semanticamente el diff ni se refactoriza el modelo de la aplicacion por este motivo.

`scripts/ci-scope.mjs` escribe la seleccion FULL/QUICK y su motivo en el resumen de Actions. Sus pruebas se ejecutan antes de instalar dependencias con `node --test scripts/ci-scope.test.mjs`.

No se han cambiado las protecciones remotas de GitHub ni la integracion de Cloudflare. Pages conserva su disparador Git actual; esta seleccion de pruebas no convierte la CI en una puerta de publicacion de Pages. No hay despliegues, secretos ni datos Cloud en el workflow.
