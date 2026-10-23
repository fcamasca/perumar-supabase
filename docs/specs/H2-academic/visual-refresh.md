# H2 — Refresh visual del shell y componentes base

> Estado al cierre: **H2 CLOSED**. Gate 2 aprobado humanamente sobre `796a47aa4c1ce21c6cf8c81e9c631a22202bb709`; TEST-H2-018/020 PASSED humanos y TEST-H2-019 completado con riesgo residual aceptado. forced-colors real del sistema operativo no fue verificado manualmente en H2; el usuario aceptó este riesgo en Gate 2. Ver [acceptance.md](acceptance.md). Los pendientes, conteos y estados conservados debajo son históricos; no sustituyen el cierre. H3 NO INICIADO.

Base: `7f0a5487d4ddb001eadf3d89cfee91cb02c84255`. Código: `d593ac23563cff51e2a84d2d50e2423a7ee1ad62`. Fecha: 22/10/2026. Rama: feature/h2-academic. El candidato final y su CI se identifican en la entrega.

## Contexto y límite de aceptación

El usuario indicó que la funcionalidad estaba bien pero el acabado visual todavía no alcanzaba el nivel esperado. Se interpreta MikuyApp como referencia de acabado, no como una interfaz a copiar. **TEST-H2-019: NO INICIADO / NO APROBADO**, según decisión humana; este refresh no inicia ni aprueba esa prueba. TEST-H2-020 y Gate 2 continúan pendientes. El adjunto termina en el encabezado «22. Criterio UX de aceptación interna»; no se inventan criterios adicionales ni aceptación.

## Renovación realizada

Se sustituye íntegramente la hoja styles.css acumulada por una base única organizada: fundamentos/tipografía, shell, controles, superficies funcionales, tablas/estados, mensajes, login, diálogos/detalles, responsive y forced-colors. No se agregan capas de overrides por etapa ni un design system/framework nuevo.

| Área | Dirección aplicada |
|---|---|
| Identidad y shell | Primario océano/azul marino con fondos neutros, marca compacta y contexto secundario. Pequeña marca SVG decorativa propia reutilizada en header/login; sin imágenes externas ni icon pack. Preferencia visual discreta y cuenta en navegación secundaria. |
| Login | Tarjeta centrada de máximo 456 px, padding propio, bordes suaves, radio contenido y sombra ligera. Identidad compacta, título/subtítulo breves, controles de ~46 px y botón Entrar de ancho completo. Sin segunda tarjeta dentro del formulario. Diagnóstico técnico sigue plegado al pie. |
| Tipografía | Stack de sistema sin fuentes descargadas; escala diferenciada de marca/título/sección/label/cuerpo/ayuda. Espaciado consistente y líneas de lectura acotadas. |
| Navegación | Superficie horizontal compacta; activo combina fondo, peso y borde inferior. En ancho estrecho se envuelven los grupos, sin sidebar. Roles y enlaces autorizados intactos. |
| Formularios | Mismos campos y orden funcional; tamaños por dato, grids responsivos y superficies agrupadas por tarea. Asterisco integrado al label, límites/errores preservados. Pies de formulario agrupan Guardar y Cancelar. |
| Controles y botones | Radio/padding/altura coherentes; primario, secundario y sensible distinguibles por texto y borde/color. Acciones de tabla compactas; foco visible y disabled legible. |
| Materias/Carreras | Se conservan listado neutral y editor identificado. Selección de Materias mantiene búsqueda, scroll, código+nombre, contador y selección visible; sin componente complejo nuevo. |
| Ciclos | Mantiene grupos de datos/ubicación/materias/estado y tabla de relaciones. La ficha terminal sigue sin Guardar ni controles deshabilitados innecesarios. Etiqueta EN CURSO legible conservando el valor EN_CURSO en opciones/payloads. |
| Tablas y estados | Se reemplaza la cuadrícula de bordes por reglas horizontales suaves y espacio. Cabeceras legibles, acciones compactas, badges textuales consistentes y scroll horizontal en contenedor. |
| Auditoría/Directorio | Se conserva el contenido/lectura autorizada y evidencia secundaria. Las nuevas superficies, tipografía y tablas dan continuidad al conjunto sin exponer UUID/JSON como protagonista en auditoría. No reporting nuevo. |
| Mensajes y diálogos | Superficies compactas, borde de estado, acciones explícitas y misma geometría de controles. Se mantienen Escape, contención/retorno de foco, cancelación y motivo donde corresponde. |

## Temas, contraste y responsive

Paletas Claro/Oscuro/Alto contraste con tokens semánticos ampliados para fondo de campo, superficie de marca, borde decorativo, hover, sombra y scrim. Sistema sigue resolviendo preferencias del SO. No colores hardcodeados en JSX.

Se amplía la prueba de contraste existente: texto normal ≥4.5:1 y bordes de controles/foco ≥3:1 sobre background, surface, surface-elevated, field-background y brand-soft; primario y hover contra primary-contrast ≥4.5:1. Los bordes suaves separan superficies decorativas, no sustituyen bordes esenciales de controles. Shadow/scrim también son tokens. Las tres paletas pasan las comprobaciones numéricas; no certificación WCAG completa.

forced-colors conserva prioridad !important sobre tokens inline, usa colores del SO y elimina sombras; no forced-color-adjust:none. En ancho estrecho header/nav se envuelven, formularios pasan a columna, tarjetas reducen padding, tablas mantienen scroll y diálogos limitan ancho/alto.

**Límite visual explícito:** la herramienta Computer Use falló al inicializar con «failed to write kernel assets», os error 3, antes de abrir una pantalla. No se reconfiguró el entorno ni se obtuvieron capturas. El resultado se revisó mediante código, CSS, estructura DOM y mediciones numéricas; no se afirma revisión real de píxeles/viewports/SO. La apreciación humana del acabado sigue pendiente.

## Verificación técnica

| Comando | Resultado local |
|---|---|
| npm run lint | PASSED |
| npm run typecheck | PASSED |
| npm test | PASSED: 112 pruebas / 9 archivos, contraste ampliado y valor de transición preservado |
| npm run build | PASSED: JS 534.45 kB (gzip 151.71), CSS 14.03 kB (gzip 3.61) |
| npm run test:build-safety | PASSED; configuración privilegiada rechazada sin canario en salida/bundle |
| supabase:start / test:local | PASSED; guard e inventario exactos, sin tocar configuración del host |
| test:security | PASSED, 14 escenarios tras reset; limpieza de ocho actores y roles restaurados |
| test:academic | PASSED, 11 grupos reales; limpieza de ocho actores; restricciones futuras DEFERRED |
| reset / test:local / stop | PASSED; stack detenido |

Incidencia de entorno: la primera test:security falló en la matriz exacta porque existían ocho cuentas sintéticas previas ajenas al lote técnico (8 Auth, 7 app_users, 7 asignaciones; cero Materias/Carreras/Ciclos). Se inspeccionaron solo conteos, se confirmó que todas eran @example.invalid y se repitió desde reset local. Las cuentas del lote fallido fueron eliminadas por su finally. No se modificó ni relajó la suite o RLS. Para el siguiente recorrido deben recrearse fixtures humanos con el procedimiento documentado.

## Alcance preservado y siguiente revisión

Sin cambios en reglas, DB, migraciones, RLS/RPC, auditoría, roles/permisos, transiciones, concurrencia, sincronización, Spec o PLAN. Sin nuevas dependencias, fuentes externas, framework, backend ni configuración Firewall/Docker/WSL. SessionProvider e históricos H0/H1 intactos. La advertencia de chunk >500 kB continúa visible, sin optimización arquitectónica fuera de alcance.

Revisión humana previa a iniciar TEST-H2-019: valorar primero composición/acabado del login, shell y pantallas. Después, cuando se indique, recorrer cuatro temas, teclado/foco, estados, errores y forced-colors. Ningún resultado técnico representa aceptación humana ni aprobación del acabado.

**VISUAL REFRESH: IMPLEMENTED — PENDING HUMAN REVIEW**  
**TEST-H2-019: NOT STARTED / NOT APPROVED**  
**TEST-H2-020: HUMAN PENDING**  
**GATE 2 / ACCEPTANCE / MERGE: BLOCKED**  
**H3: NOT STARTED**
