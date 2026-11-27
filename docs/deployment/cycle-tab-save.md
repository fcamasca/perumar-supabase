# Guardado por pestaña de la ficha de Ciclo

Migración 20261126010000 aplicada y verificada en perumar-prod (26/11/2026). La publicación del frontend debe realizarse después de esa verificación.

- Datos guarda mediante guardar_ciclo y permanece en la misma pestaña. Cancelar cambios restaura los datos guardados.
- Asignaturas mantiene un borrador de altas, retiros y reactivaciones. Guardar asignaturas envía un solo lote atómico; Cancelar cambios descarta el borrador sin llamar al servidor.
- Con matrículas activas se mantiene la autorización del Director y una confirmación al guardar el lote. Una matrícula nueva detectada al guardar requiere confirmación explícita antes de otro intento.
- Un conflicto de versión o error conserva el borrador; no hay reintento automático ni cambios parciales. Los borradores bloquean otras mutaciones hasta guardar o cancelar.
- En un Ciclo nuevo, Crear ciclo guarda Datos y Asignaturas juntos mediante el comando existente.
- Las otras pestañas conservan sus acciones y las restricciones de estados terminales.

## Publicación posterior

1. Revisar y validar el candidato, incluida la CI integral en un entorno aislado.
2. Autorizar expresamente la aplicación hospedada de `20261126010000_cycle_subject_batch_save.sql`. Es aditiva: incorpora guardar_asignaturas_ciclo reutilizando cambiar_materia_ciclo, sus autorizaciones, auditoría, comprobaciones de versión y confirmación. No modifica tablas, roles ni las 41 migraciones históricas.
3. En perumar-prod ya provisionado, aplicar solamente esa migración después de revalidar el historial. No ejecutar seed, reset ni repair. Verificar el nuevo historial de 42 versiones, 40 funciones públicas y ACL del comando (authenticated, sin ejecución pública/anon).
4. Solo después publicar el frontend que utiliza el nuevo comando. La rama feature/hosted-deployment publica automáticamente; no subir allí el frontend antes de aplicar la migración.
5. Verificar con JWT ordinarios, sin datos de prueba en producción. No cambiar cuentas o roles para probar.

Para instalaciones nuevas se pueden aplicar las 42 migraciones antes de la primera carga de catálogos. El loader admite exclusivamente el historial original de 41 versiones o ese historial más la nueva migración aprobada; rechaza cualquier otra desviación. La prueba test:hosted-preparation comprueba ambas precondiciones en una base temporal independiente. No reutilizar el loader para un destino ya poblado.

Las protecciones de destino de los scripts locales permanecen vigentes; solo se actualiza su inventario esperado para la migración aditiva. La base de desarrollo existente no se resetea como parte de este cambio.
