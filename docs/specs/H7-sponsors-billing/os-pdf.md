# H7 — PDF privado de órdenes de servicio

Checkpoint autorizado el 25/11/2026 sobre `feature/h7-sponsors-billing-ui`, base publicada `b770cadb9baed2be96e41222471eacbc95e0a6a2`. El usuario reportó satisfactoria la revisión funcional y de facilidad de uso anterior; esto no constituye Gate 2 H7 ni aceptación humana de este bloque nuevo.

## Contrato del bloque

- OS registrada sin PDF sigue siendo válida. Adjuntar/reemplazar es opcional y solo se permite para OS VIGENTE.
- OS ANULADA conserva consulta y descarga de todos sus PDFs confirmados, sin nuevas cargas.
- Director/Coordinador activos; ADMIN_SISTEMA solo no tiene acceso académico.
- Exclusivamente PDF, hasta 5 MiB y 20 páginas. Se reutiliza exactamente `validateFile` de H6: firma/envoltura, estructura, presupuesto de descompresión y rechazo conservador de cifrado, formularios y contenido activo y estructuras no verificables. No es antivirus/CDR.
- `orden_servicio_archivo` ya existente conserva versiones. La última CONFIRMADA por numero_version es la actual; reemplazo crea fila y clave nuevas, nunca upsert. Intentos abortados pueden dejar saltos en la numeración.
- Fallar un reemplazo no cambia ni elimina la versión anterior. Respuesta de confirmación perdida se resuelve por consulta explícita: la compensación no puede abortar ni eliminar un archivo confirmado.

## Arquitectura específica

Migración aditiva `20261125040000_h7_order_private_files.sql`. Bucket privado `h7-os`, 5 MiB, application/pdf; sin políticas de acceso directo para navegador. Sin tablas nuevas, cambios de modelo financiero, dependencias ni infraestructura nueva permanente.

RPC cerradas, exclusivamente service_role:

- preparar_archivo_os(actor, OS, versión esperada): autorización actual; empresa → OS; exige VIGENTE; una operación pendiente por OS; clave OS_UUID/archivo_UUID.pdf y contador generados en servidor; conserva base de reemplazo.
- confirmar_archivo_os(actor, OS, archivo, bytes, hash): mismos locks y luego archivo; iniciador, pertenencia a OS, versión y estado revalidados; máximo 5 minutos; base anterior intacta; hash/tamaño obligatorios; replay idéntico no duplica fila/auditoría y replay inconsistente falla.
- abortar_archivo_os(actor, OS, archivo): solo intento nunca confirmado del mismo iniciador; terminal e idempotente. Permite liberar un intento si la orden fue anulada entre reserva y confirmación.
- consultar_archivo_os(actor, OS, archivo, registrar): autoriza la pareja exacta OS/archivo confirmado; permite historia anulada; auditoría de descarga sin PII.

Guard dedicado permite exclusivamente las transiciones técnicas cerradas; CONFIRMADO y ABORTADO son inmutables, sin DELETE. RLS devuelve solo metadatos confirmados a perfiles académicos; permisos por columna excluyen object_key, hash y actores. Browser no ejecuta RPC privilegiadas ni escribe en la tabla.

Edge Functions `os-pdf-cargar` y `os-pdf-descargar`: JWT/getUser, perfil/rol actual y acceso a OS antes de crear/usar cliente privilegiado; body acotado y lista cerrada de campos; validación estructural antes de reservar; reserva → Storage sin sobrescritura → confirmación. Descarga verifica longitud/hash y revalida JWT, rol y OS después del I/O antes de entregar bytes. No URL pública/firmada ni clave sale al navegador. Respuestas no-store; logs limitados a categoría fija y correlación aleatoria, sin input/SQL/PII/secretos.

CORS: `H7_OS_ALLOWED_ORIGINS` debe enumerar orígenes del despliegue. En local usa http://127.0.0.1:5173. Se mantienen los mismos paquetes/import-map y lockfile de H6.

## Interfaz

Sección Documento de orden de servicio dentro del detalle existente. Sin archivo: Sin documento adjunto / Adjuntar PDF. Con archivo: Ver PDF / Descargar / Reemplazar PDF / Historial de versiones. El visor y los diálogos se reutilizan; estado de carga y guard síncrono contra doble envío. Errores administrativos con consulta explícita, sin reenvíos automáticos. La orden anulada oculta modificación y conserva lectura/historia. No se muestran estados técnicos, hashes ni claves.

## Operación y límites

Conciliación de intentos nunca confirmados exclusivamente manual, igual que H6. Si queda una operación incierta se consulta primero la versión actual; una reserva pendiente bloquea otra carga hasta conciliarla. La expiración de 5 minutos impide confirmar una reserva vieja pero no la elimina ni desbloquea por sí sola. No scheduler/colas/limpieza automática. Los fallos de eliminación de bytes nunca confirmados requieren conciliación manual por metadatos; jamás borrar historia confirmada.

Migración aplicada al entorno local habitual el 25/11/2026. Para revisión, recargar la aplicación y mantener levantado `functions serve --network-id perumar-h0-local`; reiniciar ese proceso si no reconoce las dos funciones nuevas. No se hizo reset ni se reescribieron OS/facturas/pagos.

Resultados y límites de prueba en technical-results.md. Gate 2 H7 PENDIENTE; sin acceptance, reportes, CSV, consulta RUC, SUNAT ni merge.

## Ajuste humano de compatibilidad PDF — 25/11/2026

El usuario pidió suavizar el rechazo de PDFs habituales tras reproducir el fallo de su archivo original: una página, 468469 bytes, sin cifrado, con ObjStm/XRef comprimidos. Se permite esa compresión sin reescribir los bytes subidos. Preflight por instancia de PDFParser (pdf-lib fijado 1.17.1), sin parches globales: hasta 8 MiB descomprimidos por stream estructural, 16 MiB acumulados, 10000 objetos comprimidos y 20000 entradas de referencias; filtros estructurales sin compresión o FlateDecode simple. Se validan N/First, Size/Index/W antes de los bucles internos. Después se mantienen la validación semántica y los controles originales. El validador compartido aplica esta mejora también a los PDFs de H6; no cambia imágenes ni renderers.

Permanecen 5 MiB, 20 páginas, rechazo de cifrado/contenido activo y presupuestos de recursos. No se incorporan archivos del usuario ni copias de prueba al repositorio.

El segundo archivo aportado por el usuario (CV, tres páginas, 239079 bytes) era rechazado por un enlace HTTPS normal. Se admiten acciones URI explícitas hacia http/https/mailto; se rechazan protocolos de ejecución/datos/archivos, controles/espacios crudos y credenciales embebidas. OpenAction/AA/JavaScript/Launch y demás acciones activas siguen bloqueadas. Archivo original probado y aceptado sin transformación; sin incorporar CV ni enlaces/datos del usuario a Git. Microcopy del validador compartido ajustado para no anunciar un bloqueo total de enlaces.
