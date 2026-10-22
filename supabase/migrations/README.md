# Migraciones locales

H0 no tiene migraciones SQL ni esquema de aplicación. Esta carpeta conserva la convención para cambios reales de hitos posteriores; no se crean migraciones vacías ni tablas dummy.

H1 incorpora la migración real `20261022041000_h1_security.sql`: tres tablas de seguridad, roles ADMIN/OPERADOR, grants, seis policies SELECT y un helper privado. No crea cuentas Auth ni datos/entidades de negocio. Fixtures se crean y retiran por el proceso local independiente de pruebas; no se guardan contraseñas en migraciones.

Después de aprobar el hito correspondiente, cada cambio real se genera con la CLI Supabase fijada, con nombre y versión ordenados. Se revisa y versiona antes de aplicarlo. No se modifica una migración ya aplicada para ocultar un cambio posterior.

La reconstrucción solo puede operar sobre la instancia local desechable de este proyecto, sin link remoto. En H0 recreaba plataforma sin historial propio; en H1 reaplica la migración real de seguridad y los roles iniciales, sin cuentas Auth ni datos de negocio. No es una prueba de restauración ni un backup productivo.
