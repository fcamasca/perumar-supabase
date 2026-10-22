# PLAN MVP — PERÚ MAR Supabase

**Versión:** 1.0
**Estado:** APROBADO

## Registro de aprobación humana — 21/10/2026

El usuario aprobó explícitamente el PLAN y el Spec de H0 el 21/10/2026 y autorizó el Gate 1 de H0 — Bootstrap. El commit final del Spec aprobado es `dff3c1c94683e5767c5837203d6910a6f25f43e3`, en `feature/h0-bootstrap-spec`.

Se autoriza construir exclusivamente H0, conservando alcance, diseño y tareas aprobadas. OQ-H0-001 queda resuelta. OQ-H0-002 (owner GitHub) sigue pendiente hasta contar con evidencia humana explícita. La aprobación del Gate 1 no sustituye pruebas humanas, Gate 2, acceptance ni autorización de merge a main.

Este registro documental se incorpora en la rama Spec antes de construir; no modifica el contenido de los cuatro documentos aprobados. La implementación nace del commit exacto aprobado y recibe después este registro documental.

### Seguimiento de construcción — 21/10/2026

OQ-H0-002 quedó resuelta por indicación explícita del usuario: `https://github.com/fcamasca/perumar-supabase.git`. Se comprobó que ese repositorio ya existe, es privado y está vacío; no se creó ni publicó contenido allí.

H0 conserva estado EN CONSTRUCCIÓN. Tras el ensayo controlado, el usuario aprobó CHG-H0-001 y la continuación de TASK-H0-003 y siguientes. DEF-H0-001 queda RESOLVED BY APPROVED MITIGATION: aislamiento efectivo mediante la regla exacta de Windows Firewall, sin afirmar binding exclusivo a loopback. `54322/TCP: NO VERIFICADO DE FORMA INDEPENDIENTE`; limitación aceptada como riesgo residual de H0 local sin datos reales. Véanse la [enmienda autorizada](specs/H0-bootstrap/approved-isolation-amendment.md), las [rondas](specs/H0-bootstrap/controlled-network-test.md) y la [evidencia de construcción](specs/H0-bootstrap/implementation-log.md). Gate 2, acceptance y merge siguen bloqueados. No se comienza H1.

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

# 13. Estado inicial

| Hito | Estado |
|---|---|
| H0 Bootstrap | EN CONSTRUCCIÓN |
| H1 Seguridad base | NO INICIADO |
| H2 Base académica | NO INICIADO |
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

Una vez aprobado este PLAN:

Generar exclusivamente el Spec de:

**H0 — Bootstrap**

compuesto por:

- `requirements.md`
- `design.md`
- `tasks.md`
- `test-plan.md`

Después detenerse para revisión y aprobación humana.

No iniciar construcción de H0 sin esa aprobación.
