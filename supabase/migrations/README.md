# Migraciones locales

H0 no tiene migraciones SQL ni esquema de aplicación. Esta carpeta conserva la convención para cambios reales de hitos posteriores; no se crean migraciones vacías ni tablas dummy.

Después de aprobar el hito correspondiente, cada cambio real se genera con la CLI Supabase fijada, con nombre y versión ordenados. Se revisa y versiona antes de aplicarlo. No se modifica una migración ya aplicada para ocultar un cambio posterior.

La reconstrucción H0 solo puede operar sobre la instancia local desechable de este proyecto, sin link remoto. Recrea la plataforma y un historial propio vacío. No es una prueba de restauración ni un backup productivo.
