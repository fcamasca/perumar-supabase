# H6 — Operación local y revisión humana pendiente

Construcción autorizada por [Gate 1](gate-1.md). Gate 2 **PENDIENTE**. Este documento no constituye aceptación ni autoriza merge. Los cuatro documentos del Spec exacto aprobado se conservan intactos.

## Preparar la revisión sin perder datos de prueba

Desde la raíz del repositorio, con Docker disponible y la rama `feature/h6-expediente` actualizada:

```powershell
npm ci
npm run supabase:start
npm run supabase:status
node node_modules/supabase/dist/supabase.js migration up --local
npm run supabase:env
npm run dev
```

La actualización es aditiva. **No ejecutar reset** para actualizar el entorno de revisión. No se aplican configuraciones de documentos a Ciclos existentes por una carga inicial silenciosa. Se crean únicamente los nueve tipos de documento del maestro; la persona configura cada Ciclo y confirma la sincronización de sus matrículas activas. La acción «Regularizar expedientes existentes» es explícita, transaccional e idempotente; no restablece retiros individuales válidos.

Si las funciones locales no están atendiendo, mantener otra terminal en el proyecto:

```powershell
node node_modules/supabase/dist/supabase.js functions serve
```

Las tres funciones son `expediente-cargar`, `expediente-generar` y `expediente-descargar`. Autorizan mediante getUser y roles académicos actuales antes de operar; no colocar service_role en Vite/React ni deshabilitar controles de identidad para resolver un error. `EXPEDIENTE_ALLOWED_ORIGINS` solo se configura en el entorno servidor; el valor local por defecto es `http://127.0.0.1:5173`. No hay despliegue hospedado acreditado.

## Recorrido humano H6 por reportar

1. **Configuración:** Documentos → crear/ver/editar/buscar tipo; Ciclo → Documentos → activar obligatorios/opcionales y confirmar alcance. Comprobar las aplicaciones de todas las matrículas activas, desactivar/reactivar y conservar retiros cuando otra fila cambia.
2. **Carga:** matrícula → Expediente → cargar PDF/JPEG/PNG admitido; probar archivo inválido, reemplazar, descargar y consultar versiones. El archivo anterior debe conservarse y no mostrarse completado antes de confirmar.
3. **Generados:** revisar Solicitud, Declaración, Carta Poder, Ficha personal y copia persistente de Ficha de matrícula. Carta Poder solicita apoderado explícito en cada generación. Revisar español, fecha/edad de generación en Lima, blancos, firma/huellas y páginas adicionales.
4. **Fuente e historia:** modificar datos durante PROGRAMADO/EN_CURSO y comprobar diagnóstico de cambio y regeneración explícita; cerrar Ciclo, editar Alumno después y comprobar fuente final congelada. Las versiones previas se descargan expresamente como históricas.
5. **Retiro:** individual desde Más acciones; múltiple desde la selección visible de alumnos de la página del Ciclo. Obligatorio no retirable; cancelar no escribe. Se conservan estado, versiones y bytes.
6. **Permisos y estados:** Director/Coordinador; ADMIN solo sin acceso académico. CERRADO mantiene las acciones H6 autorizadas. Matrícula anulada o Ciclo DESIERTO/ANULADO permiten historia autorizada, sin nuevas mutaciones.
7. **Recuperación:** provocar conflicto o fallo de red; conservar archivo/apoderado/selección, consultar Historia y operaciones antes de repetir. Un resultado confirmado se recupera por lectura; una reserva propia pendiente puede cancelarse explícitamente. No hay retry automático ni generación silenciosa.
8. **Accesibilidad y formato:** teclado/menús/modales/foco, ancho reducido y preferencias visuales. Reportar navegador, versión si se conoce y sistema operativo realmente usados. Forced-colors real H6 permanece **NO VERIFICADO** hasta ejecución explícita; la paleta propia de alto contraste no lo acredita.

Todos los puntos anteriores están **PENDIENTES DE REVISIÓN HUMANA**; las pruebas automáticas no los convierten en PASSED humanos.

## Archivos admitidos y persistencia

- Carga: máximo 5 MiB; PDF simple hasta20 páginas o JPEG/PNG hasta20 megapíxeles. Se verifica contenido y hash en servidor. Foto pasaporte admite solo JPEG/PNG.
- PDF conservador: sin cifrado, formularios, enlaces/acciones, adjuntos ni estructuras ObjStm/XRef comprimidas o filtros no verificables por el parser. Reexportar un PDF simple o usar una imagen admitida. No es antivirus ni garantía antimalware.
- Generación: máximo 2 MiB y20 páginas; cinco renderers fijos. No se admite plantilla, SQL, URL, ruta, bucket, hash o actor desde React.
- `CONFIRMADO` persiste sin TTL24h ni purga funcional, también al reemplazar/retirar/trasladar/anular. Los objetos H5 temporales siguen separados y no son la fuente del objeto H6.

## Limpieza manual de huérfanos

Solo operador local. Primero inspeccionar el conteo sin borrar:

```powershell
npm run expediente:cleanup
npm run expediente:cleanup -- --execute
```

Cada lote considera como máximo50 reservas/objetos **nunca confirmados** mayores de24h. Revalida el estado y reconoce el aborto antes de eliminar bytes. No elimina filas de historia ni ningún CONFIRMADO, incluso reemplazado o sin puntero actual. Si devuelve `nextOffset`, el siguiente lote se solicita manualmente con `--offset=N`; reiniciar desde0 en otra revisión de conciliación. No hay scheduler ni TTL documental. La política institucional de purga definitiva sigue diferida a H9/release.

`npm run pdf:cleanup` es la operación temporal H5; no sustituye esta conciliación ni puede borrar versiones persistentes H6.

## Pruebas técnicas y límites

`test:expediente:isolated` crea una DB y PostgREST desechables copiando solo esquema/ACL/referencias; destruye esos recursos al terminar. No resetea ni escribe alumnos humanos. `test:expediente`, igual que las suites de integración H1–H5, está restringido al stack desechable de GitHub Actions. No falsear variables CI para ejecutarlo sobre la base humana.

Los seis residuales H5/GATE-A01 permanecen: hosted Edge/PostgREST14 no probado directamente, CPU/memoria no medidas, forced-colors H5 no verificado, bundle >500kB y limpieza física H5 manual. H6 añade la compatibilidad PDF conservadora y la conciliación manual de nunca confirmados; sin nuevas tablas/servicios para ocultar esas limitaciones. [Resultados técnicos](technical-results.md) registra ejecuciones reales, inventario y supuestos de volumen.
