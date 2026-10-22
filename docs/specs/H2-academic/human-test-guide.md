# H2 — Recorrido para revisión humana

Estado vigente: TEST-H2-018 confirmado PASSED por el usuario sobre e2f2db9365b4c46fd6932caba3d47a17324ebe29. Correcciones posteriores y alcance de esa confirmación en ui-corrections.md. El usuario comunicó una regresión humana parcial de correcciones UX; ver ux-observations-01-04.md. TEST-H2-019 queda PENDIENTE de regresión corta de esos cuatro puntos y comprobaciones restantes de teclado/forced-colors; TEST-H2-020 y revisión del candidato corregido PENDIENTES. Codex preparó este recorrido; no realizó ni aprobó las pruebas humanas. Revisar el SHA candidato completo de la entrega, no una rama que haya cambiado. No es acceptance ni Gate 2.

## Preparación reproducible

Una persona autorizada usa un único checkout y stack local, sin datos reales. Node/npm/Docker deben cumplir README y el guard debe permanecer habilitado. No cambiar Firewall, Docker, WSL ni instalar dependencias globales para el recorrido.

```powershell
git clone --branch feature/h2-academic https://github.com/fcamasca/perumar-supabase.git
cd perumar-supabase
git log -1 --format=%H
npm ci
npm run lint
npm run typecheck
npm test
npm run supabase:start
npm run supabase:reset
npm run supabase:env
npm run test:local
npm run test:security
npm run test:academic
npm run build
npm run test:build-safety
npm run supabase:reset
npm run test:local
```

Si ya existe configuración local, seguir README sin sobrescribirla automáticamente. Comparar SHA con la entrega antes de comenzar. El reset después de las suites elimina fixtures de negocio/correlativos. En una terminal ejecutar `npm run dev`; en otra `npm run fixtures:human`. El comando imprime los correos sintéticos y pide contraseña local sin mostrarla. No enviarla por chat ni capturar tokens. Mantener esta terminal abierta hasta finalizar los recorridos funcional y visual; Enter al terminar elimina identidades. Abrir la URL local indicada por Vite.

| Alias | Habilitación explícita |
|---|---|
| A / B | Admin Sistema |
| D | Director |
| O | Coordinador |
| M | Admin Sistema + Coordinador |
| N | Sin rol |
| F | Sin app_user |
| I | Coordinador inactivo |

## TEST-H2-018 — Funcional y seguridad

1. Ingresar como D. Crear Materias `M-H2-001` / `SEGURIDAD ACUÁTICA H2`, `M-H2-002` / `NAVEGACIÓN H2` y `M-H2-003` / `PRÁCTICA H2`. Comprobar normalización, edición, duplicados de código/nombre incluso inactivos, descripción y límites 30/150/500. Inactivar/reactivar con motivo cuando corresponda; observar advertencias y conservación histórica.
2. Crear Carrera `C-H2-001` / `FORMACIÓN H2`, sigla `FH2`, modalidad CON_EXPERIENCIA y materias 001/002. Verificar mínimo de una activa: rechazar retiro/inactivación de la última. No perder cambios al recibir error. Comprobar sigla 2–10 alfanumérica y duplicados. No inventar una conversión de usuarios H1.
3. Entrar como O: referencias consultables sin mantenimiento de Materia/Carrera. Crear Ciclo con Carrera anterior, Departamento/Provincia/Distrito LIMA/LIMA/LIMA, Capitanía CALLAO y fechas 2037-02-01 a 2037-02-02. Promoción opcional. Verificar código no editable: año de creación America/Lima, no año de fechas; contador global anual y sigla. Cancelar otro formulario nuevo: no fila ni evento. Persistidos no ofrecen Eliminar.
4. Intentar mismo par Carrera/Capitanía con inicio igual al fin anterior: rechazo inclusivo. En PISCO, mismas fechas: permitido. Revisar geografía dependiente y campos obligatorios; no dirección libre ni campo active de Ciclo.
5. Como D efectuar PROGRAMADO → EN_CURSO → CERRADO. O puede editar PROGRAMADO/EN_CURSO, pero no transicionar. CERRADO conserva ocupación del rango. En otro ciclo PROGRAMADO probar DESIERTO con motivo de catálogo; OTRO requiere detalle. Su rango se libera. Crear otro en ese rango y pasar PROGRAMADO → ANULADO con motivo libre. No EN_CURSO → ANULADO. Ningún terminal se edita, reabre o elimina. No probar restricciones de Matrícula/Facturación como si existieran: DIFERIDAS.
6. En un ciclo modificable retirar una materia: conservar relación inactiva y origen. Agregar materia 003 a Carrera: sincronizar solo faltantes, sin reactivar retiro manual. Comprobar adicional que después se asocia a Carrera: sigue ADICIONAL. Cambiar Carrera en otro ciclo: HEREDADAS activas anteriores quedan CAMBIO_CARRERA, adicionales se conservan, pares históricos no se reviven automáticamente. Preparar otra Carrera válida si hace falta.
7. Cambiar sigla FH2 → FH3. Leer advertencia; solo códigos de PROGRAMADO/EN_CURSO cambian sufijo, año/correlativo no cambian y terminales conservan código. Consultar auditoría y comprobar operación atómica.
8. Dos pestañas D: abrir misma Materia antes de guardar. Guardar en una; guardar versión vieja en otra debe dar conflicto, conservar entrada y exigir recarga explícita. Sin sobrescritura/reintento automático. Durante guardado, entradas/Cancelar/Recargar no deben permitir perder cambios por una segunda acción.
9. A accede a seguridad y auditoría, sin CRUD académico; intentar ruta académica directa. D/O no obtienen directorio global. M tiene unión de permisos; salir y entrar como O no conserva privilegios ni datos ampliados. N/F/I no acceden a datos protegidos. Repetir logout/restauración y ausencia de estado anterior.
10. Auditoría: filtrar fecha/actor/entidad/acción; revisar actor servidor, fecha, antes/después y motivos sensibles. Operaciones ordinarias no exigen motivo. Eventos no se modifican/eliminan desde aplicación. No incluir secretos en capturas.

Registrar cada fallo con pasos, alias, entidad sintética y SHA; no marcar PASSED si una etapa no se ejecutó. Las pruebas automatizadas de concurrencia/rollback complementan este recorrido; no se atribuyen a la persona automáticamente.

## Cambios de presentación para el candidato de revisión UX

Ver ux-review.md. Los listados comienzan sin formulario: usar Crear Materia/Carrera/Ciclo o Editar/Consultar en una fila. Cancelar vuelve al listado; el editor muestra la identidad del registro. Los Ciclos terminales muestran ficha de consulta, no campos deshabilitados. La selección de Materias de Carrera tiene filtro local que conserva selecciones. Auditoría muestra cambios legibles con IDs/JSON completos en detalle secundario. Estos cambios no alteran reglas funcionales.

## TEST-H2-019 — Visual, teclado y sistema

La identidad 741f4ac está aprobada humanamente; su integración no lo está. Ver brand-identity.md y brand-integration-preview.html. Incluir login/header y favicon real en Claro, Oscuro, Alto contraste y forced-colors; comprobar ausencia de marca provisional/nombre accesible duplicado y conservación de proporciones. Revisar 16 y 32 px: Codex no pudo verificarlos visualmente por fallo de la herramienta. Si 16 px resulta ilegible, registrar evidencia y detener el rediseño para decisión humana; no simplificar automáticamente. Esta guía no aprueba TEST-019; la integración y la regresión restante se evalúan humanamente en el candidato actual.

Estado humano vigente: PENDIENTE / NO APROBADO. La persona confirmó los recorridos indicados en ux-observations-01-04.md; no se interpreta como PASSED completo. Sobre el SHA candidato nuevo realizar esta regresión corta:

1. **OBS-UX-01:** D/O ven Editar en PROGRAMADO/EN_CURSO, abren edición; CERRADO/DESIERTO/ANULADO muestran Consultar y ficha sin controles de escritura. Los roles no autorizados conservan su denegación de acceso.
2. **OBS-UX-02:** comprobar Materias de la Carrera en columnas Código/Nombre; adicionales con código + nombre o mensaje explícito sin opciones. No tira larga separada por comas. Conservar tabla de relaciones/historial y retiro/reactivación por modal.
3. **OBS-UX-03:** desde el pie de Carrera, dejar Modalidad vacía y Guardar. Debe enfocar y desplazar hasta Modalidad, con “Selecciona una modalidad.” junto al campo y resumen complementario. Repetir obligatorios de Materia y Ciclo. Con teclado/lector comprobar asociación del mensaje, señal no solo de color y corrección sin pérdida de entrada ni saltos de foco durante escritura.
4. **OBS-UX-04:** Carrera nueva BUZO sugiere BZ; FORMACIÓN NÁUTICA sugiere FN y FORMACIÓN ALTERNA H2 sugiere FAH2. Editar la sugerencia y luego el nombre: no sobrescribir la sigla manual. Editar Carrera existente tampoco reemplaza la sigla persistida.
5. Completar las comprobaciones restantes de teclado, foco y forced-colors que siguen debajo. La observación humana positiva de temas en Materias no se extiende automáticamente a todas las pantallas. Conservar los flujos de modales ya comprobados; registrar cualquier regresión.

Se restablece la base local de ensayo para las suites técnicas y se limpian sus fixtures; recrear identidades mediante la preparación reproducible para este candidato.

Mantener fixtures durante esta revisión. Revisar login, listas, formularios, auditoría, estados de error/conflicto, seleccionado y deshabilitado en Sistema, Claro, Oscuro y Alto contraste. Comprobar persistencia al recargar y fallback tolerante a storage inválido/bloqueado.

Con Sistema seleccionado, cambiar apariencia/contraste del SO y comprobar respuesta en vivo. Comprobar forced-colors real del SO cuando esté disponible: debe prevalecer incluso sobre una paleta explícita. Restaurar después la preferencia del equipo. Si no puede ensayarse, registrar NO VERIFICADO y solicitar decisión humana; no sustituirlo por captura o prueba DOM.

Recorrer Tab, Shift+Tab, Enter y Espacio: foco visible, orden comprensible, etiquetas asociadas, operación sin ratón y sin depender únicamente del color. Revisar legibilidad de tablas/formularios/errores y foco tras acciones. Los cálculos técnicos de contraste no certifican conformidad WCAG completa. Codex no obtuvo evidencia visual de navegador: la herramienta de automatización falló antes de abrirlo. Adjuntar evidencia humana sin credenciales si se considera necesaria.

## TEST-H2-020 — Mantenibilidad y arquitectura

Revisar technical-results.md y los diffs de modelo/comandos/UI. Evaluar personalmente:

- Simplicidad del recorrido Materia → RPC concreta → restricciones/RLS → auditoría, y Carrera con relaciones/propagación en una transacción servidor.
- Legibilidad de 7 RPC, 11 helpers privados, 18 policies y triggers; localización de validaciones/errores y facilidad para diagnosticar una denegación.
- Concurrencia optimista sin retry automático, SERIALIZABLE por comando, exclusión declarativa y mínimo diferido; revisar por qué cada control existe y la evidencia de carreras reales.
- Ausencia de motor CRUD genérico, capas adicionales, permisos confiados a React o transacciones coordinadas por navegador. No tomar cantidad de archivos como evidencia suficiente de simplicidad.
- Costo de mantener RLS/SQL y UI concreta, temas y accesibilidad frente al alcance aprobado. Registrar juicio y motivos; no atribuir ahorros medidos que no se midieron ni aprobar arquitectura automáticamente.

## Limpieza y registro

Al terminar 018 y 019, cerrar sesión, Enter en terminal de fixtures y confirmar eliminación. Detener Vite con Ctrl+C. Ejecutar `npm run supabase:reset`, `npm run test:local`, `npm run supabase:stop` y `git status --short` (vacío). No dejar cuentas ni datos de ensayo. No ejecutar dos stacks simultáneos.

Registrar por separado para 018/019/020: persona, fecha, SO/navegador, SHA completo, pasos ejecutados, PASSED/FAILED/NO VERIFICADO, evidencia, defectos y riesgos aceptados. Gate 2 requiere decisión humana explícita posterior; completar un recorrido no autoriza merge. TASK-009 corresponde a la persona; TASK-010, acceptance.md, main y H3 siguen bloqueados.
