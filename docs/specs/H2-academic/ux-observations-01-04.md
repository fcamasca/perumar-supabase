# H2 — Corrección de observaciones humanas OBS-UX-01 a 04

> Estado al cierre: **H2 CLOSED**. Gate 2 aprobado humanamente sobre `796a47aa4c1ce21c6cf8c81e9c631a22202bb709`; TEST-H2-018/020 PASSED humanos y TEST-H2-019 completado con riesgo residual aceptado. forced-colors real del sistema operativo no fue verificado manualmente en H2; el usuario aceptó este riesgo en Gate 2. Ver [acceptance.md](acceptance.md). Los pendientes, conteos y estados conservados debajo son históricos; no sustituyen el cierre. H3 NO INICIADO.

Fecha: 22/10/2026 (America/Lima). Base recibida: `6d2a9b1018d205aa585272042c5dbad4925b35be`, rama `feature/h2-academic`. Implementación: `86b7924b00ec11ca877079c6322455b6a4060a03`.

## Procedencia y límites

La persona informó una regresión humana que confirmó las correcciones de los modales propios de inactivar/reactivar Materia, retirar/reactivar Materia de Ciclo y las transiciones EN_CURSO, DESIERTO y ANULADO; viabilidad antes del motivo de inactivación, OTRO con detalle, historial conservado, acciones explícitas y ausencia de alert/confirm/prompt nativos en esos recorridos. También informó temas Sistema/Claro, Oscuro y Alto contraste visualmente correctos en Materias, e isotipo aprobado e integrado. Este registro refleja el informe humano, no pruebas humanas ejecutadas por Codex ni aprobación de todo TEST-H2-019.

Se corrigieron únicamente las cuatro observaciones pendientes. Sin cambios en DB, migraciones, RLS, RPC, auditoría, roles/permisos, transiciones, relaciones, concurrencia, Spec funcional o PLAN. Sin dependencias nuevas. Se conservan login, header, isotipo, paletas y modales.

## Correcciones

| Hallazgo humano | Corrección aplicada | Ayuda a la tarea |
|---|---|---|
| OBS-UX-01: Consultar abría un Ciclo editable | PROGRAMADO/EN_CURSO muestra Editar para Director/Coordinador; terminal muestra Consultar. Sin rol modificador no ofrece edición. Se conserva la denegación de la ruta académica a Admin Sistema sin rol académico. | La acción anticipa lo que realmente podrá hacer la persona; no concede permisos nuevos. |
| OBS-UX-02: tira larga de materias y bloque adicional aparentemente vacío | Materias de la Carrera se presenta en tabla Código/Nombre; adicionales conserva selección Código — Nombre y estado vacío explícito. Carga/error se distinguen del vacío. La tabla de relaciones e historial Código/Nombre/Origen/Estado/Acción permanece. | Permite recorrer referencias y distinguir ausencia de opciones de una carga incompleta. |
| OBS-UX-03: error superior quedaba fuera de vista | InlineForm conserva resumen y muestra Error: + mensaje concreto junto al campo. aria-invalid/aria-describedby vinculan el mensaje; enfoca el primer inválido y ejecuta scrollIntoView centrado al enviar. Corregir el valor retira su error sin desplazar el foco durante la escritura. | La persona ve qué falta y dónde corregirlo, también sin depender del color. |
| OBS-UX-04: sigla copiaba la palabra completa | Iniciales significativas para varias palabras, conservando tokens numéricos como H2; una palabra usa inicial y hasta dos consonantes siguientes, con respaldo mínimo de dos caracteres y máximo de diez. BUZO → BZ, FORMACIÓN NÁUTICA → FN, FORMACIÓN ALTERNA H2 → FAH2. | Propone una abreviatura corta editable, sin sobrescribir cambios manuales ni siglas persistidas. Unicidad/validación final de servidor sin cambios. |

Los errores usan el token existente `--error`, incluido su mapeo a CanvasText en forced-colors. No se introdujo framework ni motor de formularios; el patrón común de validación se mantiene en InlineForm. Las asociaciones ARIA conservan otras descripciones existentes. Las comprobaciones DOM de foco/scroll no certifican experiencia real de lector de pantalla, teclado o SO.

## Evidencia técnica

Se verificó el árbol de implementación de `86b7924` (mismo contenido fuente probado antes de crear el commit). Ejecución local con Node del runtime existente, npm mediante su CLI instalada y guard habilitado. Las suites DB/API usan exclusivamente el stack local de ensayo. No se ejecutó TEST-H2-019.

| Comando | Resultado |
|---|---|
| `npm run lint` | PASSED |
| `npm run typecheck` | PASSED |
| `npm test` | PASSED: 139 pruebas en 10 archivos; 19 casos nuevos |
| `npm run build` | PASSED; aviso de bundle >500 kB, sin ampliar alcance para optimización |
| `npm run test:build-safety` | PASSED |
| `npm run supabase:start` | PASSED: guard verificó mitigación aprobada CHG-H0-001 |
| `npm run supabase:reset` previo | PASSED |
| `npm run test:local` | PASSED: Data API pública e inventario exacto H2 |
| `npm run test:security` | PASSED: 14 escenarios; cleanup de ocho actores confirmado |
| `npm run test:academic` | PASSED: 11 grupos DB/API; cleanup de ocho actores confirmado |
| `npm run supabase:reset` final + `npm run test:local` + inventario + `npm run supabase:stop` | PASSED: cero Auth/app_users/asignaciones/Materias/Carreras/Ciclos; stack detenido |

Antes de las suites se observaron por conteos ocho identidades locales de dominio example.invalid, cuatro Materias, dos Carreras y tres Ciclos de la revisión previa. Se ejecutó el reset local previsto por la guía para aislar la matriz de prueba; recrear fixtures y registros de ensayo para la siguiente regresión humana. Ningún resultado técnico de esta ejecución falló; no hubo correcciones de infraestructura ni servidor.

Los casos nuevos cubren ambos roles modificadores y ambos estados modificables, los tres terminales, ausencia de edición sin rol modificador (sin habilitar la ruta), tabla de Carrera, vacío adicional, exclusión de materias heredadas/relacionadas/inactivas, errores específicos adyacentes en los tres formularios, aria-invalid/describedby, foco/scroll, conservación de entrada y limpieza del error sin robo de foco, y siglas cortas/normalizadas. Se conservaron las pruebas de modales y sus confirmaciones/cancelaciones, mínimos, OTRO obligatorio y ausencia de diálogos nativos. El caso existente de sigla manual/persistida sigue pasando.

## Regresión humana pendiente

TEST-H2-019: PENDIENTE de regresión corta de OBS-UX-01 a 04 y comprobaciones restantes de teclado/forced-colors. Seguir [human-test-guide.md](human-test-guide.md), sobre el SHA candidato exacto de la entrega. La validación visual completa no se sustituye por pruebas DOM. TEST-H2-020 y Gate 2 siguen pendientes. Sin acceptance, merge ni H3.
