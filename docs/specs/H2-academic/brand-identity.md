# H2 — Identidad digital aprobada e integración

## Aprobación humana y alcance

El usuario aprobó explícitamente el diseño del isotipo correspondiente a `741f4ac5998189676b22b9c3d67d3b2d556754b7` (741f4ac). Registro recibido el 22/10/2026, America/Lima. La aprobación se limita a identidad visual: no implica TEST-H2-019, TEST-H2-020, Gate 2, acceptance, merge ni H3.

**Estado: IDENTIDAD APROBADA / INTEGRACIÓN PENDIENTE DE VALIDACIÓN VISUAL HUMANA.**

Código de integración probado: `aeafc0f57c4e4470a8016dfa02a75ed649f253ca`. El SHA del candidato documental y su CI se presentan en la entrega.

## Archivos oficiales y uso

- `src/assets/brand/perumar-isotipo.svg`: fuente oficial única del isotipo; idéntica al diseño aprobado. Se utiliza en login, header y favicon.
- `src/assets/brand/perumar-logo.svg`: composición vectorial editable con texto, conservada como referencia oficial del lockup; la app usa texto HTML visible para mantener composición y accesibilidad.
- `src/BrandMark.tsx`: importa el isotipo como fuente SVG estática confiable mediante Vite ?raw, sin librería nueva. Prefija IDs y referencias de clip por instancia. No cambia paths, transforms, recorte ni proporciones. No recibe HTML ni SVG de usuarios.
- Login y header ya usaban BrandMark: sustitución de la marca provisional sin cambiar rutas, autenticación o estructura de la tarjeta. Texto visible PERÚ MAR y descriptor Gestión Académica conservados. Navegación separada; sin logos repetidos en módulos.
- `index.html`: favicon SVG apuntando al mismo archivo oficial; título de pestaña PERÚ MAR · Gestión Académica. Build actual: `dist/assets/perumar-isotipo-DZfCHr0H.svg`, verificado byte a byte contra la fuente. El hash del nombre puede variar en builds posteriores.
- `ThemeSelector.tsx`: conserva selección/persistencia y aplica los cinco tokens de marca. Como un favicon externo no hereda CSS del documento, su enlace se actualiza con una data URL generada desde ese mismo SVG y solo variables de color. El enlace inicial sirve como fallback; no hay segundo archivo ni variante simplificada. System/forced-colors escuchan cambios del SO.

Tamaños recomendados: isotipo de aplicación ~40–48 px; implementación actual header 2.8rem (~45 px), header estrecho 2.4rem (~38 px), login 3rem (48 px), sin aumentar dimensiones previas. Favicon con SVG escalable y comparación preparada a 16/32 px. El logo sigue subordinado a Iniciar sesión y a los títulos/acciones de la aplicación.

## Tokens y temas

| Variable | Claro | Oscuro | Alto contraste |
|---|---|---|---|
| `--pm-ink` | `#173d50` | `#c9e7ef` | `#ffffff` |
| `--pm-wheel` | `#947044` | `#d4b78d` | `#ffffff` |
| `--pm-paper` | `#fffaf0` | `#152b39` | `#000000` |
| `--pm-sea` | `#39758a` | `#43899e` | `#ffffff` |
| `--pm-red` | `#bb3544` | `#ef7b88` | `#ffffff` |

Sistema resuelve Claro/Oscuro/Alto contraste con las preferencias existentes del SO. forced-colors tiene prioridad: pm-paper usa Canvas y los demás CanvasText; sin forced-color-adjust:none. La adaptación cromática no rediseña timón, ancla, T, Perú ni mar occidental. Sin raster separados por tema.

## Accesibilidad

Cuando acompaña a PERÚ MAR visible, BrandMark y su SVG son decorativos (aria-hidden=true, focusable=false), sin role img ni título/desc redundantes en la instancia renderizada. La fuente oficial permanece informativa/editable; no se modifica. Los IDs locales evitan que un clipPath apunte a otra copia del logo. El favicon no requiere ARIA.

## Verificación técnica y límite visual

- lint / typecheck: PASSED.
- Unit tests: PASSED, 120 pruebas en 10 archivos. Ocho pruebas nuevas cubren geometría oficial, decoración sin nombre duplicado, IDs/clip aislados, favicon desde la fuente oficial, cuatro preferencias y respuesta técnica a forced-colors.
- build / build-safety: PASSED; favicon exportado y fuente coinciden byte a byte; sin canario privilegiado en salida/bundle. JS 539.22 kB (gzip 154.01), CSS 14.24 kB (gzip 3.69), SVG 3.85 kB (gzip 1.63). Permanece la advertencia de chunk >500 kB, sin ocultarla.
- No se ampliaron suites de datos/Auth/RLS: no cambian comportamiento funcional ni datos. Sin dependencias ni cambios de DB, SQL, RPC, RLS, auditoría, roles, permisos, Spec o PLAN.
- Verificación visual de favicon 16×16 y 32×32: **NO VERIFICADA**. La herramienta visual falló al inicializar (`failed to write kernel assets`, os error 3), antes de abrir el preview. No se afirma haber inspeccionado píxeles ni capturas. Se preparó `brand-integration-preview.html` con esos tamaños y los temas. No se creó una simplificación ni se demostró necesidad de rediseño.

Si una persona confirma ilegibilidad a 16 px, registrar evidencia y solicitar decisión antes de simplificar. La limitación no equivale a aprobación ni rechazo del diseño actual. Inspeccionar también el favicon real en la pestaña, no solo el SVG de la página.

## Referencias y estado de propuestas

- `perumar-logo-preview.html`: referencia del diseño aprobado, junto al escudo original; se conserva.
- `brand-integration-preview.html`: comprobación preparada de tamaños 16/32 y marcas 44/48, con colores actuales de integración; sin screenshots simulados.
- `perumar-mark-a.svg`, `perumar-mark-b.svg`, `perumar-mark-c.svg` y `brand-mark-preview.html`: EXPLORATORIOS / NO VIGENTES. No se importan en la aplicación.
- El icono provisional de ondas de BrandMark fue reemplazado; no se utiliza como identidad actual.

TEST-H2-019 no ejecutado ni aprobado; integración pendiente de revisión visual humana en Claro/Oscuro/Alto contraste/forced-colors. TEST-H2-020 y Gate 2 pendientes. Sin acceptance, merge ni H3. No se extiende automáticamente a este candidato el PASSED humano anterior de TEST-H2-018.
