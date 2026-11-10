# H4 — Guía de pruebas humanas del candidato

**Gate 2 PENDIENTE. Todas las pruebas humanas H4 están PENDIENTES. H5 NO INICIADO.**

Registrar antes de empezar: SHA (`git rev-parse HEAD`), rol, navegador/versión, SO, resultado por bloque y limitaciones. La evidencia humana de H3 no prueba H4.

## Preparación sin reset

En PowerShell, desde la raíz del repositorio y con Docker disponible:

```powershell
git switch feature/h4-payments
git pull --ff-only
git rev-parse HEAD
npm ci
npm run supabase:start
node node_modules/supabase/dist/supabase.js migration up --local
if (-not (Test-Path .env.local)) { npm run supabase:env }
npm run dev
```

`migration up --local` aplica únicamente las migraciones pendientes. **No ejecutar supabase:reset sobre la base de pruebas humanas.** No usar enlaces/proyectos remotos. Node del proyecto: `.nvmrc`; utilizar la versión fijada para reproducir CI.

En una segunda terminal, si necesitas actores sintéticos:

```powershell
npm run fixtures:human
```

Mantener esa terminal abierta y usar las credenciales de ensayo elegidas allí. Enter retira identidades al terminar; no borra historia funcional. Utilizar un entorno destinado a pruebas y datos sintéticos: ningún ensayo justifica DELETE financiero ni limpieza de historia. Las suites automáticas locales seguras son `npm run test:payments:rollback` y `npm run test:payments:isolated`; la matriz API `test:payments` se limita a GitHub Actions desechable.

## Recorrido

1. **Acceso y contexto (002–004, 039, 047).** Desde Ciclos → Matrículas → Ver matrícula → Pagos. Director y Coordinador ven resumen e historial y pueden registrar. Coordinador no ve Anular; Admin sin rol académico no accede a finanzas. No existe Editar pago, fecha manual ni concepto libre.
2. **Imputación manual (005, 008–010, 021, 053–054).** Preparar cargos positivos y uno opcional. Marcar propone todo el pendiente; escribir un parcial mantiene selección; desmarcar deja cero; Seleccionar todos propone pendientes completos y permite reducirlos. Confirmar total, medio obligatorio y notas opcionales. Probar cero, exceso individual y tres decimales: rechazo sin redondeo ni efectos. Verificar foco en el primer importe inválido.
3. **Historia y dinero (006, 017–020, 036–038).** Registrar parcial, comprobar base/abonado/pendiente. La fecha aparece solo tras registro DB, en hora Lima. Notas conservan mayúsculas/minúsculas y se muestran como texto. Un cambio de tarifa no repricia cargos existentes. Recorrer páginas: el saldo completo no cambia por la página visible.
4. **Anulación (046–048).** Como Director, abrir Anular, cancelar el diálogo y comprobar ausencia de efecto. Reabrir y confirmar con motivo válido sin datos personales innecesarios: estado Anulado, fecha/actor/motivo y aplicaciones históricas conservados; recupera exactamente el saldo. No se libera dos veces al repetir. Coordinador no adquiere esta capacidad.
5. **Reglas H3 (011–016, 049–052).** Cargo parcialmente pagado no se retira. Descuento igual a lo abonado se permite; por debajo se rechaza. Anular todos los pagos del cargo permite retirar el opcional conforme H3; reañadir conserva el cargo anterior y crea otro UUID. Cualquier pago histórico sigue bloqueando traslado y estados Desierto/Anulado del Ciclo. Agregar/cambiar/quitar empresa no reasigna pagos. Cobrar en Ciclo Cerrado se permite; no abre edición académica. Matrícula Anulada queda solo consulta, incluidos sus pagos.
6. **Dos sesiones (030–033, 041, 055).** Abrir la misma matrícula en dos sesiones autorizadas. Competir por el saldo: una operación se rechaza por conflicto/exceso, nunca se reduce automáticamente ni deja negativo. Verificar rechazo de versión conservando borrador; Consultar saldo e historial es acción explícita antes de volver a confirmar. La evidencia de barreras/conexiones reales está en la suite aislada, no se infiere de este ensayo manual.
7. **Recuperación (023–029, 038, 048).** Simular pérdida de respuesta con herramientas de red en entorno de ensayo: resultado desconocido conserva referencia y no crea otro cobro. Consultar resultado o reenviar conscientemente el mismo intento. Tras recarga se consulta DB antes de permitir otra alta. Consulta vacía no significa rollback. Anulación incierta se consulta por estado/actor/fecha y versión, sin otra clave. Si se perdió el borrador y no hay resultado visible, mantener la resolución pendiente; no inventar importes para reconstruirlo.
8. **Accesibilidad y privacidad (040, 043).** Teclado completo, foco de errores y diálogo, Escape/Tab/restauración; escritorio/móvil, Sistema/Claro/Oscuro/Alto contraste. Estados comprensibles sin depender del color. Revisar que URL y almacenamiento no contienen notas, importes, aplicaciones ni ficha; solo referencia opaca de recuperación por usuario/pestaña. **Contraste alto real de Windows / forced-colors: NO VERIFICADO hasta ensayo humano explícito.** No se hereda su aceptación residual H3.
9. **Arquitectura y Gate 2 (044–045).** Revisar inventario, comandos concretos, mínimo privilegio, locks, rollback y recuperación en [technical-results.md](technical-results.md). No hay deuda persistida, API adicional, ledger ni mantenimiento de catálogos. Registrar una decisión humana independiente sobre el SHA candidato y sus riesgos.

Formato de devolución: `Bloque N: OK / FALLÓ / NO VERIFICADO; rol; pasos; resultado observado; navegador/SO; residual`. Una aprobación global no se convierte en subcasos humanos no reportados. Acceptance, merge a main y H5 requieren autorización posterior.
