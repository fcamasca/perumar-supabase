# PLAN MVP — PERÚ MAR Supabase

**Versión:** 1.0
**Estado:** APROBADO

## Registro de aprobación humana — 21/10/2026

El usuario aprobó explícitamente el PLAN y el Spec de H0 el 21/10/2026 y autorizó el Gate 1 de H0 — Bootstrap. El commit final del Spec aprobado es `dff3c1c94683e5767c5837203d6910a6f25f43e3`, en `feature/h0-bootstrap-spec`.

Se autoriza construir exclusivamente H0, conservando alcance, diseño y tareas aprobadas. OQ-H0-001 queda resuelta. OQ-H0-002 (owner GitHub) sigue pendiente hasta contar con evidencia humana explícita. La aprobación del Gate 1 no sustituye pruebas humanas, Gate 2, acceptance ni autorización de merge a main.

Este registro documental se incorpora en la rama Spec antes de construir; no modifica el contenido de los cuatro documentos aprobados. La implementación nace del commit exacto aprobado y recibe después este registro documental.

### Estado vigente de H0 — cierre del 21/10/2026

H0 ACEPTADO humanamente y Gate 2 aprobado el 21/10/2026 sobre `9523e2e0e1b1889dd12ed3902fa3fe23f7c52141`. La [aceptación](specs/H0-bootstrap/acceptance.md) quedó registrada y la implementación se integró y publicó en main mediante el merge `b491b556353d60e0a925b293ea214cd4d5d88e07`. H1 está ACEPTADO e integrado en main bajo su Gate 2 humano del 22/10/2026; véase el registro de cierre siguiente.

### Estado vigente de H1 — cierre del 22/10/2026

H1 — Seguridad base: **ACEPTADO / INTEGRADO**. El usuario aprobó Gate 2 sobre el candidato exacto `7c15f6c382c43b08b900f00a793fd590205ab618`, confirmó TEST-H1-018 y TEST-H1-019 satisfactorios y autorizó su integración a main conservando trazabilidad. La [aceptación](specs/H1-security/acceptance.md) registra Gate 1, evidencia técnica, pruebas humanas y riesgo residual aceptado. Este cierre es exclusivamente documental; no altera implementación ni los cuatro documentos del Spec aprobado.

Al cierre de H1, H2 aún no estaba iniciado; ese registro histórico no sustituye la aprobación posterior de Gate 1 indicada a continuación.

### Registro histórico de H2 — Gate 1 del 22/10/2026

El usuario aprobó humanamente Gate 1 sobre el Spec exacto `5c4f57de6618fb0568c6d8846ed04d9d75a89932`. Véase el [registro de aprobación](specs/H2-academic/gate-1.md). **SPEC APROBADO; H2 EN CONSTRUCCIÓN en esa etapa.** Los cuatro documentos aprobados se conservan sin cambios. Este es el estado anterior al cierre, no el vigente.

### Estado vigente de H2 — cierre del 22/10/2026

H2 — Base académica: **CLOSED / ACEPTADO / INTEGRADO**. El usuario aprobó explícitamente Gate 2 sobre `796a47aa4c1ce21c6cf8c81e9c631a22202bb709`: TEST-H2-018 y TEST-H2-020 PASSED humanos; TEST-H2-019 completado con Sistema/Claro/Oscuro/Alto contraste revisados, persistencia, teclado/foco y OBS-UX-01 a 04 PASSED. **forced-colors real del sistema operativo no fue verificado manualmente en H2; el usuario aceptó este riesgo en Gate 2.** La [aceptación](specs/H2-academic/acceptance.md) registra la decisión, CI del candidato completamente verde y cierre exclusivamente documental con integración trazable. H3 tiene Spec elaborado; véase el estado vigente siguiente.

### Estado vigente de H3 — cierre del 09/11/2026

H3 — Alumno y Matrícula: **CLOSED / ACEPTADO / INTEGRADO** al incorporarse este cierre a `main` mediante PR/merge commit trazable; en la rama de cierre la integración permanece autorizada y condicionada a CI SUCCESS. Gate 2 aprobado humanamente sobre `42dcd1507a28121e9d8d588c2dff22cb263cd19d`, con Gate 1 en `551cd00ed2957178400dca8fe9d945cf3f9e8d20` y enmiendas posteriores aceptadas. La [aceptación](specs/H3-enrollment/acceptance.md) registra CI exacta run 42682734012 COMPLETED / SUCCESS, evidencia técnica 283/283 y nueve bloques humanos reportados OK en Chrome / Windows 11 Pro.

**forced-colors / contraste alto real de Windows: NO VERIFICADO; riesgo residual aceptado explícitamente en Gate 2.** Los subcasos humanos de CHG-H3-011 no se inventan como ejecuciones individuales; existe cobertura técnica y Gate 2 acepta el paquete. TEST-H3-044 tampoco se declara ejecutado separadamente: el usuario acepta arquitectura/mantenibilidad documentadas como suficientes para el cierre. Los cuatro documentos aprobados de Gate 1 permanecen intactos.

Estado histórico al cerrar H3: **H4 NO INICIADO** entonces; ese cierre no autorizaba su inicio automático. El estado vigente posterior de H4 figura en la sección 13 y en [Gate 2 H4](specs/H4-payments/gate-2.md). EVOL-001/002 no se incorporaron en el cierre H3.

### Seguimiento histórico de H0 — estado anterior al cierre

Los párrafos siguientes describen la construcción antes de Gate 2; no representan el estado vigente ni mantienen bloqueos después del cierre.

OQ-H0-002 quedó resuelta por indicación explícita del usuario: `https://github.com/fcamasca/perumar-supabase.git`. En la comprobación inicial, el repositorio ya existía, era privado y estaba vacío; en ese momento todavía no se había publicado contenido allí.

H0 estaba EN CONSTRUCCIÓN. Tras el ensayo controlado, el usuario aprobó CHG-H0-001 y la continuación de TASK-H0-003 y siguientes. DEF-H0-001 quedó RESOLVED BY APPROVED MITIGATION: aislamiento efectivo mediante la regla exacta de Windows Firewall, sin afirmar binding exclusivo a loopback. `54322/TCP: NO VERIFICADO DE FORMA INDEPENDIENTE`; limitación aceptada como riesgo residual de H0 local sin datos reales. Véanse la [enmienda autorizada](specs/H0-bootstrap/approved-isolation-amendment.md), las [rondas](specs/H0-bootstrap/controlled-network-test.md) y la [evidencia de construcción](specs/H0-bootstrap/implementation-log.md). En esa etapa Gate 2, acceptance y merge estaban bloqueados, y H1 no se había iniciado.

---

## 1. Objetivo

Construir una nueva versión de PERÚ MAR orientada inicialmente a una sola institución y pocos usuarios concurrentes, priorizando:

- velocidad de desarrollo;
- facilidad de mantenimiento;
- simplicidad;
- modelo de datos relacional;
- seguridad proporcional;
- servicios administrados;
- bajo costo total;
- ausencia de over engineering.

La arquitectura candidata es:

**React + TypeScript + Supabase + PostgreSQL**

Supabase podrá aportar:

- Auth;
- PostgreSQL;
- Row Level Security;
- Storage;
- Database Functions / RPC;
- Edge Functions cuando sean realmente necesarias.

La arquitectura será validada mediante implementación incremental antes de comprometer todo el producto.

---

# 2. Regla de trabajo

Este PLAN es la fuente única de verdad para el orden y estado de los hitos.

Cada hito tendrá obligatoriamente:

1. `requirements.md`
2. `design.md`
3. `tasks.md`
4. `test-plan.md`
5. aprobación humana del Spec
6. construcción por Codex
7. pruebas técnicas
8. pruebas humanas
9. `acceptance.md`

Flujo:

```text
PLAN
  ↓
HITO
  ↓
requirements.md
  ↓
design.md
  ↓
tasks.md
  ↓
test-plan.md
  ↓
APROBACIÓN HUMANA DEL SPEC
  ↓
CONSTRUCCIÓN
  ↓
PRUEBAS TÉCNICAS
  ↓
PRUEBAS HUMANAS
  ↓
ACCEPTANCE
```

La aprobación del Spec y la aceptación final del hito son dos decisiones humanas independientes.

---

# 3. Reglas generales

## 3.1 Codex construye; nosotros decidimos

Codex puede:

- inspeccionar;
- implementar;
- probar;
- presentar evidencia;
- informar problemas.

Codex no puede por decisión propia:

- ampliar alcance;
- introducir nuevas tecnologías;
- comenzar el siguiente hito;
- modificar decisiones arquitectónicas;
- considerar un hito aceptado.

---

## 3.2 No adelantarse

Un hito aprobado autoriza únicamente el alcance de ese hito.

No se implementará anticipadamente funcionalidad de hitos posteriores aunque hacerlo parezca técnicamente conveniente.

---

## 3.3 Cambios encontrados durante construcción o pruebas

Todo hallazgo se clasificará como:

- corrección necesaria para cumplir el Spec;
- cambio de diseño;
- cambio de alcance;
- evolución futura.

Los cambios de diseño o alcance requieren decisión humana antes de implementarse.

---

## 3.4 Arquitectura proporcional

No introducir inicialmente:

- microservicios;
- microfrontends;
- WebFlux;
- DynamoDB;
- Kubernetes;
- event buses;
- CQRS;
- multi-tenancy;
- abstracciones destinadas únicamente a crecimiento hipotético.

Un componente nuevo debe resolver una necesidad concreta del sistema.

---

# 4. Estrategia de implementación

La implementación se divide en dos etapas.

## Etapa A — Validación arquitectónica

Primero comprobaremos que Supabase realmente reduce el esfuerzo.

La vertical de validación será:

**Carrera/Materia → Matrícula → Pago → Ficha PDF**

No se desarrollará todo PERÚ MAR antes de validar esta vertical.

Al finalizar existirá un Gate de Arquitectura.

---

## Etapa B — Construcción funcional

Solo si Supabase supera el Gate de Arquitectura continuaremos con los demás módulos funcionales.

Si no lo supera, se evaluará la segunda arquitectura candidata:

**React + API ligera + PostgreSQL administrado.**

No se intentará corregir una arquitectura inconveniente agregándole capas y servicios indefinidamente.

---

# 5. Hitos

## H0 — Bootstrap del proyecto

### Objetivo

Crear la base técnica mínima y reproducible del nuevo proyecto.

### Alcance previsto

- nuevo repositorio `perumar-supabase`;
- Git desde el inicio;
- repositorio GitHub privado;
- React + TypeScript + Vite;
- Supabase;
- entorno local;
- variables de entorno;
- migraciones;
- estructura mínima del proyecto;
- README;
- CI básica.

### No incluye

- funcionalidad de negocio;
- modelo completo;
- diseño visual definitivo.

### Resultado

El proyecto puede clonarse, configurarse, ejecutarse y probarse desde cero.

---

# H1 — Seguridad base

### Objetivo

Validar que autenticación, roles y RLS puedan mantenerse de manera sencilla y segura.

### Alcance previsto

- Supabase Auth;
- usuario de aplicación;
- roles iniciales;
- relación usuario/rol;
- RLS base;
- sesión React;
- rutas protegidas;
- pruebas positivas y negativas de autorización.

### Roles iniciales de prueba

- ADMIN
- OPERADOR

No representan todavía la matriz definitiva de roles de PERÚ MAR.

### Gate del hito

Las políticas deben resultar comprensibles, probables y mantenibles.

Si una autorización básica comienza a requerir políticas RLS excesivamente complejas, se revisará el diseño antes de continuar.

---

# H2 — Base académica

### Objetivo

Validar el desarrollo de CRUD relacional sencillo con Supabase.

### Alcance previsto

- Materias;
- Carreras;
- relación Carrera–Materia;
- Ciclos mínimos necesarios para los siguientes hitos;
- estados;
- validaciones;
- auditoría básica.

### Prueba arquitectónica principal

Determinar si:

**React + RLS + constraints + RPC para operaciones compuestas**

es realmente más simple que mantener una API CRUD propia.

### Gate del hito

Carrera/Materia debe quedar:

- simple de desarrollar;
- fácil de probar;
- fácil de depurar;
- sin lógica de negocio distribuida innecesariamente.

---

# H3 — Alumno y Matrícula

### Objetivo

Validar una operación real de negocio con múltiples entidades y consistencia transaccional.

### Alcance previsto

- Alumno mínimo;
- ciclo;
- matrícula;
- conceptos/cargos mínimos necesarios;
- prevención de matrícula duplicada;
- auditoría;
- transacción mediante RPC.

### Regla principal

La matrícula se ejecutará como un comando transaccional.

React no será responsable de coordinar múltiples escrituras para completar una matrícula.

### Pruebas relevantes

- alumno/ciclo duplicado;
- ciclo no válido;
- importes manipulados desde cliente;
- error durante el proceso;
- rollback completo.

### Gate del hito

La lógica de matrícula debe quedar:

- localizada;
- entendible;
- testeable;
- transaccional.

Si la RPC se vuelve excesivamente compleja o difícil de mantener, se revisará la arquitectura.

---

# H4 — Pagos

### Objetivo

Validar la parte financiera y el comportamiento bajo concurrencia.

### Alcance previsto

- cargos de matrícula;
- deuda;
- pago particular;
- aplicación de pago;
- saldo;
- historial;
- idempotencia;
- auditoría.

### Casos críticos

No permitir:

- importes <= 0;
- pago superior al saldo;
- duplicar un pago por reintento;
- inconsistencia por operaciones concurrentes.

### Prueba de concurrencia obligatoria

Con saldo 100:

- Pago A = 70
- Pago B = 60

El sistema nunca puede finalizar con 130 pagados.

### Gate del hito

PostgreSQL + RPC debe resolver la operación financiera de forma clara, transaccional y mantenible.

---

# H5 — Ficha de matrícula PDF

### Objetivo

Resolver la principal incertidumbre técnica detectada en la evaluación arquitectónica.

### Alcance

Generar una ficha representativa utilizando datos reales del modelo.

La prueba deberá cubrir:

- caracteres españoles;
- textos largos;
- tablas;
- múltiples secciones;
- saltos de página;
- formato institucional;
- almacenamiento privado;
- descarga autorizada.

### Evaluación

Se determinará si una Edge Function de Supabase resulta suficiente para la generación requerida.

### No hacer

Si Edge Functions no resultan adecuadas:

- no incorporar automáticamente otro backend;
- no crear infraestructura adicional;
- no cambiar de arquitectura automáticamente.

Se registra el resultado y se activa el Gate de Arquitectura.

---

# 6. Gate de Arquitectura

Después de H5 se realizará una evaluación humana explícita.

## GATE-A01 — Continuidad de Supabase

**Decisión humana del 18/11/2026: APROBADO CON AJUSTES.** [Registro formal, evaluación de cada criterio y condiciones](architecture/GATE-A01-continuidad-supabase.md). Continuar con React/TypeScript + Supabase Auth/PostgreSQL/RLS/RPC + Edge acotadas + Storage privado. H6 autorizado solo para preparar Spec; implementación requiere Gate 1 H6. S3 NO AUTORIZADO / NO NECESARIO POR AHORA. No se introducen servicios adicionales por defecto.

Residuales aceptados para continuar, sin declararlos resueltos/PASSED: Hosted Edge/PostgREST 14 no probados directamente; CPU y memoria de Edge no medidas; forced-colors H5 NO VERIFICADO; bundle >500 kB; limpieza física de PDFs manual. La suficiencia hospedada sigue técnicamente inconclusa. Mantenerlos visibles y resolver o aceptar explícitamente los relevantes para producción antes de H9/release. H5 continúa con Gate 2 aprobado y sin merge autorizado.

Criterios definidos para la evaluación (se preservan):

Responder:

### Seguridad

¿Auth + RLS resultan claros y mantenibles?

### CRUD

¿Carrera/Materia requirió significativamente menos trabajo que una API propia?

### Negocio

¿Matrícula quedó expresada claramente mediante una operación transaccional?

### Finanzas

¿Pago, concurrencia e idempotencia pudieron resolverse sin lógica dispersa?

### Documentos

¿La ficha PDF puede generarse con calidad y esfuerzo razonables?

### Desarrollo

¿Realmente disminuyó la cantidad de código y configuración?

### Mantenimiento

¿Una persona puede entender y depurar fácilmente el recorrido de una operación?

---

## Posibles decisiones

### APROBADO

Continuar con Supabase.

### APROBADO CON AJUSTES

Continuar después de introducir cambios arquitectónicos acotados y expresamente aprobados.

### NO APROBADO

Detener expansión de esta implementación y evaluar:

**React + API ligera + PostgreSQL administrado.**

El Gate requiere decisión humana.

---

# 7. Hitos posteriores al Gate

Los siguientes hitos se consideran planificación inicial.

Su alcance exacto será revisado antes de generar cada Spec.

---

## H6 — Expediente

**AUTORIZADO SOLO PARA PREPARACIÓN DE SPEC** por GATE-A01 (18/11/2026); Spec aún no iniciado en este registro. **Implementación NO AUTORIZADA** sin revisión humana y Gate 1 H6. [Decisión y entradas mínimas para el Spec](architecture/GATE-A01-continuidad-supabase.md#autorización-siguiente-y-límites).

Evaluar expediente por matrícula, documentos subidos/generados (solicitud, declaración jurada, carta poder y ficha de datos personales), tamaño/MIME/contenido, hash, retención y Storage privado persistente. Usar claves de objeto y metadatos de dominio como identidad documental, no URLs del proveedor. Supabase Storage privado es opción inicial cuya suficiencia deberá validarse; no S3 ni StorageProvider genérico anticipado.

Previsto:

- documentos de alumno;
- Supabase Storage privado;
- tipos de archivo;
- límites;
- metadatos;
- carga;
- confirmación;
- descarga;
- eliminación/baja;
- permisos;
- auditoría.

---

## H7 — Patrocinadores y facturación

**Forma parte del MVP de PERÚ MAR.**

Previsto:

- patrocinadores;
- contactos;
- relación con matrículas;
- facturas;
- ciclos facturados;
- pagos de patrocinador;
- aplicación de un pago a varias facturas;
- pagos parciales;
- concurrencia;
- auditoría.

El alcance detallado se definirá en el Spec de H7, sin cuestionar su inclusión dentro del MVP.

---

## H8 — Reportes y operación

Previsto:

- matrículas;
- estados de cuenta;
- filtros;
- exportación;
- consultas operativas;
- consulta de auditoría;
- necesidades administrativas del MVP.

No se introduce una plataforma analítica separada.

---

## H9 — Cierre MVP

Previsto:

- revisión de permisos;
- recuperación;
- backups;
- restauración;
- configuración productiva;
- documentación operativa;
- revisión de secretos;
- pruebas integrales;
- preparación de release.

Este hito no sustituye las pruebas y aceptaciones realizadas en hitos anteriores.

---

# 8. Fuera del alcance inicial

No forman parte de esta planificación inicial salvo decisión posterior:

- multiinstitución;
- arquitectura SaaS;
- aislamiento de tenants;
- microservicios;
- Kubernetes;
- event-driven architecture;
- escalamiento multi-región;
- infraestructura de alta disponibilidad avanzada;
- data warehouse;
- analítica avanzada;
- integraciones no requeridas por el MVP;
- automatización de reglas impresas no confirmadas funcionalmente.

---

# 9. Seguridad

Cada Spec deberá identificar los controles que realmente aplican.

Como mínimo:

- autenticación;
- autorización;
- validación;
- control de acceso;
- SQL Injection;
- XSS;
- CSRF cuando corresponda;
- secretos;
- archivos privados;
- auditoría crítica;
- backups/recuperación.

Los controles se aplicarán conforme al riesgo y no como una lista de infraestructura obligatoria.

---

## 9.1 Criterio transversal de interfaz — aprobado el 22/10/2026

Aplicable desde H2 en adelante. Cambio documental aprobado por el usuario; no modifica la evidencia histórica ni la implementación aceptada de H0/H1. Todo futuro Spec con interfaz debe considerar estos criterios. Se implementarán dentro del primer hito cuya UI los necesite, bajo su Spec aprobado.

### Preferencias y prioridad del sistema

PERÚ MAR soportará cuatro preferencias: **Sistema** (predeterminada), **Claro**, **Oscuro** y **Alto contraste**. Su representación conceptual será `system`, `light`, `dark` y `high-contrast`; el Spec definirá su selección y persistencia de manera simple.

Sistema sigue la preferencia clara u oscura del sistema operativo y sus preferencias visuales y de accesibilidad. Claro y Oscuro seleccionan explícitamente las respectivas paletas propias. Alto contraste selecciona una paleta propia orientada a mayor legibilidad incluso sin alto contraste del sistema; no reemplaza las funciones de accesibilidad del sistema operativo.

Si el sistema activa `forced-colors`, alto contraste equivalente o una función equivalente de accesibilidad, esa configuración tiene prioridad sobre las paletas propias, incluida Alto contraste. No reemplazar ni competir con los colores forzados del sistema.

### Contraste, estados y tokens

Las paletas propias cumplirán como mínimo los criterios de contraste aplicables de **WCAG 2.2 AA**: texto normal 4.5:1, texto grande 3:1 y contraste no textual de controles, indicadores y bordes necesarios conforme a AA. No afirmar que cumplir solo estas ratios demuestra conformidad completa con WCAG.

Los estados éxito, error, advertencia, información, foco, seleccionado y deshabilitado deben resultar distinguibles y legibles en Claro, Oscuro y Alto contraste. No transmitir información exclusivamente por color: acompañar con texto, icono con significado accesible o estado visible; por ejemplo, deuda/pagado con etiqueta legible.

Gestionar colores mediante tokens semánticos compartidos, no colores dispersos en componentes. Considerar conceptos equivalentes a: `background`, `surface`, `surface-elevated`, `text-primary`, `text-secondary`, `text-disabled`, `border`, `border-strong`, `primary`, `primary-contrast`, `focus`, `success`, `warning`, `error` e `info`. Los nombres pueden ajustarse en diseño; el componente consume significado, sin conocer una paleta concreta.

### Persistencia y simplicidad

La elección explícita podrá persistirse localmente en el navegador. No llevarla a PostgreSQL, Auth, RLS ni backend sin un requisito posterior real de sincronización entre dispositivos. No crear un framework propio de temas cuando CSS y React actuales sean suficientes; no agregar skins ni personalización avanzada.

Este cambio no implementa selector, CSS, componentes, hooks, contextos, almacenamiento local ni dependencias. Esos elementos solo se construirán dentro del hito y Spec que los aprueben.

---

# 10. AWS Well-Architected

Aunque la arquitectura candidata no se ejecute íntegramente sobre AWS, se utilizarán como criterios de diseño:

- Seguridad;
- Fiabilidad;
- Eficiencia de rendimiento;
- Optimización de costos;
- Excelencia operativa.

Estos principios no justifican por sí mismos agregar componentes.

---

# 11. Criterio de finalización de un hito

Un hito NO está terminado porque:

- Codex terminó de escribir código;
- compila;
- pasa tests automáticos;
- el pipeline está verde.

Un hito está terminado solamente cuando:

1. implementación aprobada completada;
2. pruebas técnicas satisfactorias;
3. pruebas humanas satisfactorias;
4. defectos críticos corregidos;
5. aprobación humana explícita;
6. `acceptance.md` generado.

---

# 12. Cambios al PLAN

Cuando una decisión aprobada cambie:

- alcance;
- orden;
- arquitectura;
- dependencia;
- definición del MVP;

este PLAN deberá actualizarse.

No mantener decisiones nuevas únicamente en conversaciones o código.

El PLAN vigente debe reflejar el estado real del proyecto.

---

# 13. Estado vigente

**Actualización hospedada — 27/11/2026.** H7 permanece CLOSED / ACEPTADO / INTEGRADO en main `43bc1fc` (PR #7). Supabase perumar-prod y Pages están desplegados: ocho funciones v1, nuevas API Keys, APIsPERU bloqueado y 42 migraciones actuales, conservando las 41 originales. El usuario autoriza integrar feature/hosted-deployment mediante merge commit condicionado a CI integral del candidato/PR y SHA exacto de main. La integración se acredita con el merge commit y CI exacta del [PR #8](https://github.com/fcamasca/perumar-supabase/pull/8), sin heredar la CI de otro SHA. [Inventario, pruebas humanas efectivas y pendientes](deployment/closure-2026-11-27.md). Respaldo PostgreSQL y 24 objetos capturados/cifrados; PostgreSQL restaurado y hashes de archivos comprobados en aislamiento; recuperación funcional completa y custodia externa pendientes. **No declarado apto para datos reales. H8/H9 no iniciados.** Los registros históricos inferiores se conservan como trazabilidad y se leen con esta actualización.

| Hito | Estado |
|---|---|
| H0 Bootstrap | ACEPTADO — Gate 2 aprobado 21/10/2026 |
| H1 Seguridad base | ACEPTADO / INTEGRADO — Gate 2 aprobado 22/10/2026 |
| H2 Base académica | CLOSED / ACEPTADO / INTEGRADO — Gate 2 aprobado 22/10/2026; riesgo forced-colors aceptado |
| H3 Alumno y Matrícula | CLOSED / ACEPTADO / INTEGRADO en main con el merge de este cierre — Gate 2 aprobado 09/11/2026; [aceptación](specs/H3-enrollment/acceptance.md), residual forced-colors aceptado |
| H4 Pagos | CLOSED / ACEPTADO; listo para integración en rama; INTEGRADO en main al incorporar este cierre. [Acceptance](specs/H4-payments/acceptance.md), Gate 2 humano 12/11/2026; forced-colors NO VERIFICADO — residual aceptado |
| H5 Ficha PDF | **CLOSED / ACEPTADO** sobre `a19520a1733dca53b38bfe1463d0473304c88d86`, CI `44375383072` SUCCESS, 440/440. Gate 2 y ajustes UX posteriores aceptados humanamente; [acceptance](specs/H5-enrollment-pdf/acceptance.md). **INTEGRADO** al incorporar este cierre mediante PR/merge commit a main y verificar CI SUCCESS. GATE-A01 APROBADO CON AJUSTES. Residuales: Hosted Edge/PostgREST 14 no probados directamente, CPU/memoria no medidas, forced-colors H5 NO VERIFICADO, bundle >500 kB y limpieza física manual. H6 solo Spec tras main verde |
| Gate A01 | **APROBADO CON AJUSTES** humanamente el 18/11/2026; [registro](architecture/GATE-A01-continuidad-supabase.md). Continuidad de Supabase, residuales aceptados para continuar el MVP y visibles hasta H9/release; sin infraestructura adicional por defecto |
| H6 Expediente y documentos institucionales | **CLOSED / ACEPTADO / INTEGRADO** en main al incorporar este cierre mediante PR/merge commit y verificar su CI SUCCESS. [Acceptance](specs/H6-expediente/acceptance.md), [Gate 2 humano](specs/H6-expediente/gate-2.md): ca7a461, CI44443096743 SUCCESS,483/483; ajustes posteriores expresamente aceptados sin repetir pruebas humanas. Candidato final `f6157e953eb4f307066b16e8b5580b7f09c23f58`, CI44616848493 SUCCESS,524/524. Spec e2de234 intacto. Forced-colors H5/H6 NO VERIFICADO y demás residuales preservados. **H7 NO INICIADO; sin rama H7** |
| H6.1 Reportes operativos por Ciclo | **CLOSED / ACEPTADO** sobre `9733f445b012e871b8064b4f75dea730eb32b2c3`, CI44768681886 SUCCESS, 590/590; cuatro bloques humanos PASSED, incluida apertura real en Excel. [Acceptance en el documento único](specs/H6.1-cycle-reports.md#acceptance--cierre-humano-h61--20112026). **INTEGRADO** al completar PR/merge commit y CI exacta de main SUCCESS. H4/H6 siguen como fuentes autoritativas; residuales preservados, forced-colors NO VERIFICADO. **H7 NO INICIADO** |
| H7 Patrocinadores y facturación | **CLOSED / ACEPTADO**. [Gate2 humano](specs/H7-sponsors-billing/gate-2.md) y [acceptance/checklist](specs/H7-sponsors-billing/acceptance.md),26/11/2026, candidato 44d60b1. TASK-H7-001–011 completadas, incluido reportes/CSV y OpenRUC con persistencia. Validación técnica 839/839 Vitest; núcleo 192/192, reportes 41/41, referencia tributaria 52/52 y baterías aisladas adicionales. **INTEGRADO únicamente tras PR/merge commit y CI exacta de main SUCCESS**, referencias finales en PR/informe. Mejora DNI H3 consolidada sin reabrir H3, consumo externo en producción bloqueado hasta autorización. Arquitectura actualizada con ocho diagramas Mermaid. Residuales preservados; H8 no iniciado. |
| H8 Reportes y operación | BLOQUEADO |
| H9 Cierre MVP | BLOQUEADO |

---

# 14. Próximo paso

H3 está CLOSED / ACEPTADO humanamente; su integración en main se hace efectiva con el PR/merge commit de este cierre, condicionado a CI SUCCESS. Véase [acceptance.md](specs/H3-enrollment/acceptance.md).

**H4 — CLOSED / ACEPTADO / listo para integración**; **INTEGRADO** al incorporar este cierre a main mediante PR/merge commit y verificar CI SUCCESS. Candidato funcional `0091190f0cf353d744d6b2d9a6447916d9c882d6`; [acceptance](specs/H4-payments/acceptance.md) y [Gate 2](specs/H4-payments/gate-2.md). Forced-colors: **NO VERIFICADO — residual aceptado**; bundle >500 kB y Data API hospedada / PostgREST 14 no probada directamente se conservan.

La instrucción humana del 12/11/2026 autoriza, inmediatamente después de H4 integrado y main verde, crear `feature/h5-enrollment-pdf-spec` desde ese main exacto y preparar **solo el Spec H5 — Ficha de matrícula PDF** (sección 5). Sin permiso intermedio. No cambia su alcance ni autoriza implementación, Edge Function, PDF, Storage, dependencias o backend alternativo. Resolver OQ y obtener Gate 1 H5 antes de construir. GATE-A01 sigue reservado a decisión humana tras evaluar H5.

Posteriormente el usuario aprobó Gate 1 H5 sobre `9804bb07063590e8917fc86d07995c474b84e718` y autorizó su construcción exacta en `feature/h5-enrollment-pdf`. Esta autorización posterior habilita el spike real Edge, PDF, Storage privado y UI del Spec; no autoriza Gate 2, acceptance, integración, cierre H5, GATE-A01 ni H6. Los cuatro documentos del Spec aprobado conservan sus estados históricos.

## Decisión posterior vigente — GATE-A01 (18/11/2026)

[APROBADO CON AJUSTES](architecture/GATE-A01-continuidad-supabase.md): continuidad de Supabase autorizada sobre evidencia H1–H5, con ajustes de alcance/operación y seis residuales explícitos. Esta decisión posterior sustituye las referencias históricas a GATE-A01 pendiente, sin reescribir los Specs ni sus gates históricos. H5 conserva el [Gate 2 sobre el candidato exacto](specs/H5-enrollment-pdf/gate-2.md), sin cierre/acceptance/merge adicional autorizado. H6 queda autorizado solo para preparar requirements/design/tasks/test-plan y someterlos a revisión y Gate 1; no se inicia Spec ni implementación H6 en este registro. S3 no autorizado por ahora.

## Autorización posterior de cierre H5 y preparación H6 — 18/11/2026

El usuario acepta para el cierre final H5 `a19520a1733dca53b38bfe1463d0473304c88d86` y los ajustes posteriores al candidato original de Gate 2 (recuperar referencia PDF, cuenta/roles, avatar con tooltip y mensajes diferenciados), sin repetir pruebas humanas. [Acceptance](specs/H5-enrollment-pdf/acceptance.md): CLOSED / ACEPTADO; integrar mediante PR/merge commit tras CI SUCCESS y comprobar CI de main. Esta autorización posterior sustituye los límites históricos de cierre/merge, sin reescribir gates previos. Los seis residuales se preservan.

Solo después crear `feature/h6-expediente-spec` desde el main exacto integrado y verde. Preparar únicamente cuatro documentos de **H6 — Expediente y documentos institucionales**: documentos subidos/generados, maestro tipo_documento propio, configuración por Ciclo y expediente por Matrícula; obligatorios y opcionales aplicados todos activos al crear, opcionales retirables individualmente o por selección múltiple sin borrar historia/archivos. No catálogo genérico documental, S3, motor editable, implementación, migraciones, tablas, buckets o Edge H6. Revisión humana y Gate 1 H6 pendientes.

## Autorización posterior de construcción H6 — 18/11/2026

Gate 1 humano sobre Spec exacto `e2de23443f887d4050aeb910a13e3611ae751be5`, CI44399674178 SUCCESS. Esta decisión sustituye el límite histórico de solo Spec: se autorizan TASK-H6-002+ por bloques y sus pruebas reales. La puerta inicial DB/API/locks pasó en CI44408192177 antes de Storage/renderers. Mantener modelo y arquitectura del Spec; no reset humano, quinta tabla, infraestructura ni motor adicional. Detenerse al entregar candidato técnico H6 para revisión humana; no Gate2 automático, acceptance ni merge a main.

## Gate 2 humano H6 — 19/11/2026

**Gate 2 H6 APROBADO HUMANAMENTE** exclusivamente sobre `ca7a4613e5e8f23d6942b2cb6f75309816f04f12`, CI44443096743 SUCCESS y483/483 pruebas técnicas; siete bloques humanos PASSED, sin repetirlos. [Registro y residuales](specs/H6-expediente/gate-2.md). Forced-colors real H5/H6 permanece NO VERIFICADO; se preservan todos los demás residuales.

Autorización humana posterior: incluir HEAD1260712 y los ajustes revisados locales, publicar un nuevo candidato, verificar su CI y cerrar sin repetir pruebas humanas. El cierre e integración requieren CI propia SUCCESS del paquete final. **H7 NO INICIADO, sin rama H7**. No marcar H6 INTEGRADO hasta completar merge y CI de main.

## Cierre e integración H6 autorizados — 19/11/2026

**H6 CLOSED / ACEPTADO**; [acceptance](specs/H6-expediente/acceptance.md). Gate 1 e2de234 y Gate 2 ca7a461/CI44443096743/483 pruebas conservados; siete bloques humanos PASSED. El usuario autoriza incluir ajustes revisados y cerrar sin repetir pruebas: candidato final `f6157e953eb4f307066b16e8b5580b7f09c23f58`, CI44616848493 COMPLETED / SUCCESS,524/524, reconstrucción/regresión H1–H6 completas. Commit de cierre exclusivamente documental. **CLOSED / ACEPTADO / INTEGRADO** en main al incorporar este cierre mediante PR y merge commit trazable, con CI propia y CI exacta de main SUCCESS. Esta autorización sustituye los límites históricos de construcción pendientes de Gate 2, sin reescribir los cuatro documentos Spec.

Residuales: Hosted Edge/PostgREST no probado directamente; CPU/memoria no medidas; forced-colors H5/H6 NO VERIFICADO; bundle >500 kB; limpieza física/manual; PDF conservador; conciliación manual de nunca confirmados; purga definitiva H9/release. Ninguno se convierte en PASSED. **H7 NO INICIADO, sin rama H7; requiere instrucción humana posterior.**

## Cierre e integración H6.1 autorizados — 20/11/2026

**H6.1 CLOSED / ACEPTADO** humanamente sobre `9733f445b012e871b8064b4f75dea730eb32b2c3`, [CI44768681886 SUCCESS](https://github.com/fcamasca/perumar-supabase/actions/runs/44768681886), 590/590 pruebas técnicas y cuatro bloques humanos PASSED: reportes/filtros/datos, CSV con apertura real en Excel, permisos/errores/UX y vista previa/PDF. [Acceptance](specs/H6.1-cycle-reports.md#acceptance--cierre-humano-h61--20112026) se registra excepcionalmente dentro del documento único del incremento, por preferencia humana expresa; satisface el registro de aceptación sin añadir un archivo duplicado. No se alteran los gates ni el acceptance histórico de H6.

Integrar exclusivamente H6.1 y sus ajustes/pruebas/documentación mediante PR y merge commit trazable, después de CI completa SUCCESS del cierre documental y del PR; verificar además CI SUCCESS del SHA exacto resultante en main para hacer efectivo **CLOSED / ACEPTADO / INTEGRADO**. H4 conserva la autoridad del saldo y H6 la del expediente; matricula_reporte_ciclo/matriz son lectura sin persistir derivados. RLS/security_invoker y prevención CSV Formula Injection preservados.

Residuales: Hosted Edge/PostgREST no probado directamente; CPU/memoria no medidas; forced-colors NO VERIFICADO; bundle >500 kB; CSV/PDF sin snapshot transaccional; memoria de exportación proporcional al volumen y demás residuales H6 documentados, sin convertirlos en PASSED. **H7 NO INICIADO**: no crear rama ni iniciar trabajo; requiere autorización humana posterior.

## Cierre definitivo H7 autorizado — 26/11/2026

La aprobación humana del candidato actual sustituye los pendientes de revisión funcional registrados en checkpoints anteriores. No repetir pruebas humanas ni reabrir H6/H6.1/H6.2/H3. TASK-H7-007 y008 completadas; Gate2 y acceptance registradas. La integración requiere CI completa SUCCESS de rama/PR y del SHA merge exacto, sin skip ci, squash ni rebase. No hay despliegue ni inicio H8. [Resultados](specs/H7-sponsors-billing/technical-results.md) y [checklist/residuales](specs/H7-sponsors-billing/acceptance.md).

OpenRUC externo/RUC20/manual y APIsPERU con autorización de uso/cuota/plan por confirmar; DNI hospedado bloqueado por defecto. Hosted Edge/PostgREST no probado directamente; CPU/memoria no medidas; forced-colors no verificado; bundle >500 kB; CSV sin snapshot/memoria proporcional; compatibilidad PDF conservadora; limpieza/conciliación manual y purga H9/release preservadas. La investigación Eldni se concluye como alternativa no seleccionada. Ningún residual se marca PASSED.
