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

### Estado vigente de H3 — Spec del 22/10/2026

H3 — Alumno y Matrícula: **SPEC ELABORADO / PENDIENTE DE REVISIÓN HUMANA Y GATE 1**. [Requisitos](specs/H3-enrollment/requirements.md), [diseño](specs/H3-enrollment/design.md), [tareas](specs/H3-enrollment/tasks.md) y [plan de pruebas](specs/H3-enrollment/test-plan.md) preparados desde main con H2 cerrado e integrado. OQ-H3-001 a 008 resueltas por decisión humana e incorporadas en los cuatro documentos; Spec listo para revisión humana de Gate 1, todavía no aprobado. Construcción NO INICIADA / NO AUTORIZADA. Sin aprobación automática de Gate 1, sin acceptance ni cambios funcionales. [Evoluciones](EVOLUCIONES.md) registra dos propuestas fuera de alcance. El alcance preliminar de H3 más abajo es antecedente de planificación; el detalle del Spec solicitado está pendiente de aprobación humana.

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

| Hito | Estado |
|---|---|
| H0 Bootstrap | ACEPTADO — Gate 2 aprobado 21/10/2026 |
| H1 Seguridad base | ACEPTADO / INTEGRADO — Gate 2 aprobado 22/10/2026 |
| H2 Base académica | CLOSED / ACEPTADO / INTEGRADO — Gate 2 aprobado 22/10/2026; riesgo forced-colors aceptado |
| H3 Alumno y Matrícula | NO INICIADO |
| H4 Pagos | NO INICIADO |
| H5 Ficha PDF | NO INICIADO |
| Gate A01 | BLOQUEADO |
| H6 Expediente | BLOQUEADO |
| H7 Patrocinadores y facturación | BLOQUEADO |
| H8 Reportes y operación | BLOQUEADO |
| H9 Cierre MVP | BLOQUEADO |

---

# 14. Próximo paso

H2 está cerrado tras Gate 2 humano. H3 — Alumno y Matrícula permanece **NO INICIADO**.

La siguiente actividad requiere una instrucción humana posterior para preparar exclusivamente el Spec de H3 (requirements.md, design.md, tasks.md y test-plan.md) y detenerse para revisión y aprobación humana. No generar ese Spec ni iniciar construcción de H3 como parte del cierre de H2.
