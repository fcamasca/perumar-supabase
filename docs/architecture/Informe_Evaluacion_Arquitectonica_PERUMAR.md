# 1. Documentación encontrada

**Informe de diagnóstico arquitectónico de PERÚ MAR — 21 de octubre de 2026.**

La documentación describe un sistema de gestión académica, matrícula, expedientes y cobros cuyo núcleo tiene relaciones importantes y reglas de consistencia. La evolución documentada reduce infraestructura autogestionada, pero conserva decisiones técnicas y expectativas de escalabilidad que no están justificadas por una carga de trabajo medida.

El análisis toma como contexto vigente la instrucción del solicitante: **una institución, pocos usuarios concurrentes y ninguna necesidad inmediata de una arquitectura SaaS compleja**. Este contexto actualiza las prioridades, pero no se atribuye a los documentos históricos.

## Alcance y criterio de evidencia

Se inventariaron **39 archivos** en `DocumentosPM`: 12 DOCX, 8 Markdown, 3 PDF, 3 XLSX, 3 JSON, 8 scripts SH, 1 TXT y 1 JPG. Se revisaron textos, tablas, hojas de seguimiento, formularios y scripts como evidencia documental; los scripts no se ejecutaron. La imagen de la ficha se inspeccionó visualmente.

Este informe no es una auditoría del código de las cuatro implementaciones ni una verificación de infraestructura desplegada. Un checklist marcado como completado demuestra un estado declarado, no una funcionalidad comprobada en producción. Los documentos con instrucciones de conversación o generación de proyectos se trataron como antecedentes, no como instrucciones para esta evaluación.

Se emplean tres distinciones:

- **Documentado:** aparece expresamente en una fuente identificada.
- **Inferencia:** interpretación arquitectónica derivada de esas fuentes.
- **No determinado:** no existe evidencia suficiente para afirmarlo.

Las referencias D01–D39 permiten localizar los archivos dentro de la raíz `D:\FRANKZ\aplicaciones\PERUMAR\DocumentosPM`. Las categorías pueden solaparse.

## Inventario y clasificación

| ID | Ruta relativa a DocumentosPM | Clasificación | Aporte principal |
|---|---|---|---|
| D01 | `Análisis/Arquitectura_Ligera_Aws.md` | Arquitectura; seguridad; estándares/patrones; operación/despliegue | Monolito modular React/WebFlux, DynamoDB, Cognito y S3; evolución futura |
| D02 | `Análisis/Arquitectura_Ligera_Aws.docx` | Arquitectura; operación/despliegue | Variante con comentarios de actualización y secciones pendientes |
| D03 | `Análisis/dynamodb-standards.md` | Modelo de datos; estándares/patrones; seguridad | Tablas por agregado, claves, índices, auditoría y validación |
| D04 | `Análisis/estandares_github_perumar.docx` | Estándares/patrones; operación/despliegue | Repositorios, PR, ramas, commits y versiones |
| D05 | `Análisis/Historias_de_Usuario_export.md` | Requisitos funcionales; historias de usuario; seguridad; modelo de datos | Objetivos, alcance, roles y criterios; presenta problemas de codificación |
| D06 | `Análisis/Mapa_Navegacion_Fases.md` | Requisitos funcionales; UI/wireframes | Módulos y separación Fase 1/Fase 2; fecha interna agosto de 2025 |
| D07 | `Análisis/MVP - priorización y secuencia.docx` | Historias de usuario; arquitectura; operación/despliegue | Secuencia de entrega, dependencias y recortes del MVP |
| D08 | `Análisis/wireframe.md` | UI/wireframes | Dashboard, navegación y ejemplo CRUD de carreras |
| D09 | `Análisis/versiones anteriores/Arquitectura_Detallada.md` | Arquitectura; seguridad; estándares/patrones; operación/despliegue | Diseño distribuido con Angular, Spring Boot y herramientas autogestionadas |
| D10 | `Análisis/versiones anteriores/Arquitectura Detallada.docx` | Arquitectura; seguridad; estándares/patrones; operación/despliegue | Versión Word del diseño distribuido |
| D11 | `Análisis/versiones anteriores/Arquitectura_Ligera_Aws_Actualizada.pdf` | Arquitectura; seguridad; estándares/patrones; operación/despliegue | React/WebFlux y controles detallados de seguridad y WAF |
| D12 | `Análisis/versiones anteriores/Executive_Summary.md` | Arquitectura | Resumen del enfoque distribuido virtualizado |
| D13 | `Análisis/versiones anteriores/Executive Summary.docx` | Arquitectura | Variante Word del resumen distribuido |
| D14 | `Análisis/versiones anteriores/Executive_Summary_Aws_Actualizada.pdf` | Arquitectura; operación/despliegue | Resumen del enfoque AWS React/WebFlux |
| D15 | `Análisis/versiones anteriores/Historias_de_Usuario.md` | Requisitos funcionales; historias de usuario; seguridad; modelo de datos | Fuente legible de reglas académicas, financieras, documentales y de acceso |
| D16 | `Análisis/versiones anteriores/proyecto.docx` | Requisitos funcionales; historias de usuario; seguridad; modelo de datos | Visión, alcance, matriz de roles y desarrollo de historias |
| D17 | `Análisis/versiones anteriores/prompts - desarrollo.docx` | Arquitectura; estándares/patrones; operación/despliegue | Prescripciones tecnológicas originales, sin justificación por volumen |
| D18 | `Análisis/versiones anteriores/Resumen de Fase 1.docx` | Arquitectura; modelo de datos; seguridad; historias de usuario | Tablas e índices académicos, contratos y validaciones |
| D19 | `Análisis/versiones anteriores/Resumen de Fase 1 v2.docx` | Arquitectura; historias de usuario; seguridad | Amplía alcance con profesores, certificados y usuarios |
| D20 | `Análisis/versiones anteriores/Manual de Instalación y Configuración de la Máquina Virtual vm-dev-db.docx` | Operación/despliegue; seguridad | Instalación declarada de PostgreSQL y MongoDB; esquema aún pendiente |
| D21 | `Análisis/versiones anteriores/checklist.xlsx` | Operación/despliegue; UI/wireframes; estándares/patrones | Avance declarado de frontend React/TypeScript, CRUD y guardas |
| D22 | `Análisis/versiones anteriores/peru_mar_checklist.xlsx` | Operación/despliegue; arquitectura | Tablero de trabajo del enfoque distribuido |
| D23 | `Análisis/versiones anteriores/peru_mar_checklist.json` | Operación/despliegue; arquitectura | Avance declarado de VMs, repositorios, herramientas y pendientes de modelado |
| D24 | `Análisis/versiones anteriores/peru_mar_board_clean.json` | Operación/despliegue; arquitectura | Exportación de tablero con tareas técnicas y contenido residual de Trello |
| D25 | `Análisis/versiones anteriores/servidores.json` | Operación/despliegue; seguridad | Inventario de servidores y servicios; contiene datos de acceso en claro |
| D26 | `Análisis/versiones anteriores/servidores.txt` | Operación/despliegue; seguridad | Notas de acceso y configuración de VM |
| D27 | `Análisis/versiones anteriores/install_databases.sh` | Operación/despliegue; seguridad | Instalación de PostgreSQL/MongoDB y cuentas privilegiadas |
| D28 | `Análisis/versiones anteriores/install_minio.sh` | Operación/despliegue; seguridad | Instalación de almacenamiento de objetos |
| D29 | `Análisis/versiones anteriores/install_rabbitmq.sh` | Operación/despliegue; seguridad | Instalación y permisos del broker |
| D30 | `Análisis/versiones anteriores/recrea-gitlab.sh` | Operación/despliegue; estándares/patrones; seguridad | Recreación destructiva del grupo y repositorios GitLab |
| D31 | `Análisis/versiones anteriores/setup-backend.sh` | Operación/despliegue; estándares/patrones; seguridad | Generación de servicio de usuarios y configuración inicial |
| D32 | `Análisis/versiones anteriores/setup-backend-vm-completo.sh` | Operación/despliegue; estándares/patrones; seguridad | Generación de múltiples servicios, Docker y pipelines |
| D33 | `Análisis/versiones anteriores/setup-ci.sh` | Operación/despliegue; seguridad | Aprovisionamiento de GitLab/Jenkins |
| D34 | `Análisis/versiones anteriores/setup_vm.sh` | Operación/despliegue | Configuración de red de máquinas virtuales |
| D35 | `Usuarios/Datos Alumnos Nuevos.xlsx` | Requisitos funcionales; modelo de datos; UI/wireframes | Ficha, catálogos, correspondencias por curso y geografía |
| D36 | `Usuarios/Expediente Perú Mar Nuevos.docx` | Requisitos funcionales; modelo de datos; UI/wireframes | Ficha, solicitud, declaración jurada, carta poder y datos personales |
| D37 | `Usuarios/Ficha - Perú Mar.docx` | Requisitos funcionales; modelo de datos; UI/wireframes | Formato operativo de matrícula y condiciones impresas |
| D38 | `Usuarios/ficha-perumar.pdf` | Requisitos funcionales; UI/wireframes | Ejemplo imprimible de ficha de matrícula |
| D39 | `Usuarios/ficha-perumar_page-0001.jpg` | UI/wireframes | Representación visual de la ficha |

No se encontró un modelo lógico integral, un diccionario completo de datos ni un registro formal de decisiones que vincule los cuatro nombres de implementación con versiones aprobadas. Hay modelos parciales y relaciones deducibles de las historias y formularios.

# 2. Requisitos principales de PERÚ MAR

## Necesidades documentadas del negocio

| Área | Necesidad y reglas relevantes | Evidencia |
|---|---|---|
| Base académica | Materias con código único; carreras con modalidad y materias; ciclos con carrera, fechas, promoción y ubicación | D15–D16, HU1–3 |
| Profesores | Asignar uno o más profesores habilitados según especialidad al ciclo | D15–D16, HU4 |
| Alumnos | Identidad, datos personales, domicilio, características requeridas por los formatos y al menos un contacto de emergencia | D15–D16, HU5; D35–D38 |
| Matrícula | Elegir ciclo activo, buscar/crear alumno, asociar patrocinador opcional, seleccionar conceptos y evitar duplicación alumno/ciclo | D15–D16, HU5 |
| Operación repetitiva | Registrar alumnos sucesivamente en el mismo ciclo; no implica por sí mismo importación masiva de archivos | D15, HU5 |
| Expediente | Adjuntos durante o después de la matrícula; tipo, descripción para otros documentos, PDF/JPG/PNG y máximo 5 MB | D15, HU6 |
| Documentos | Ficha PDF imprimible con vista previa, datos consolidados y firmas; generación individual o por ciclo, con ZIP para lotes | D15, HU7–8; D36–D39 |
| Plantillas | Edición enriquecida, variables, tipos, previsualización e inactivación con motivo; el objetivo general menciona versiones | D15–D16, HU9 |
| Certificados | Emitir a alumnos que completan satisfactoriamente el curso, con duración y nota final; emisión individual o masiva | D15, HU11 |
| Costos | Conceptos por ciclo obligatorios y opcionales; calcular deuda de matrícula; inactivar costos sin eliminarlos | D15, HU12 |
| Pagos particulares | Abonos por alumno/ciclo, medios de pago, historial y saldo; impedir importes superiores al pendiente | D15, HU13 |
| Patrocinadores | Empresa por RUC, contactos y vínculo con matrículas; facturas relacionadas con uno o más ciclos | D15, HU5 y HU14 |
| Pagos de patrocinador | Distribuir un pago entre varias facturas y admitir abonos parciales con trazabilidad de saldos | D15, HU15 |
| Reportes | Matrículas y estados de cuenta por alumno/empresa; filtros y exportación, con diferencias de fase entre documentos | D15–D16; D06–D07 |
| Usuarios | Alta, edición, inactivación, reactivación, varios roles y recuperación de acceso por correo | D15, HU17–18 |
| Maestras | Mantener catálogos, estados y jerarquía departamento/provincia/distrito | D15, HU20 |
| Auditoría | Registrar autor, fecha, operación, cambios y motivos cuando correspondan; consulta restringida | D15–D16, alcance y HU23 |

Las condiciones impresas sobre retiro, inasistencias, deudas y documentación son **evidencia de reglas operativas por validar**. Su presencia en una ficha no demuestra que deban automatizarse ni que exista un flujo digital definido para aplicarlas. Tampoco se evalúa aquí la vigencia legal de esos textos.

## Restricciones y decisiones de distinta naturaleza

| Tipo | Elementos | Interpretación |
|---|---|---|
| Contexto actual del solicitante | Una institución, baja concurrencia, prioridad en entrega y mantenimiento | Base vigente de la evaluación; no justifica aislamiento de tenants ni administración SaaS |
| Restricciones funcionales documentadas | Unicidad, estados, relaciones válidas, permisos, límites de adjuntos, saldos y trazabilidad | Deben conservarse independientemente de la tecnología |
| Restricciones de operación documentadas | Acceso web responsivo; sin instalar software adicional en el cliente; respaldo y recuperación en el enfoque histórico | Necesidades distintas del producto concreto que las implemente |
| Objetivo económico histórico | Bajo costo y uso de Free Tier | Intención documentada, sin presupuesto validado ni cálculo de costo total |
| Decisiones técnicas | WebFlux, DynamoDB, Cognito, Keycloak, MinIO, S3, frameworks y herramientas de CI | No son requisitos intrínsecos del negocio aunque aparezcan redactados como historias |
| Anticipación de crecimiento | Microservicios, microfrontends, HPA, ECS/EKS y extracción futura a funciones | No se acompaña de umbrales de carga, equipos autónomos o necesidad de despliegue independiente |

No se documentan objetivos cuantitativos de disponibilidad, latencia, recuperación, volumen anual ni concurrencia. Tampoco se acredita una necesidad de streaming o de procesamiento reactivo extremo a extremo.

# 3. Evolución arquitectónica

## Secuencia que puede reconstruirse

La evolución **conceptual** respaldada por los documentos es:

1. **Diseño distribuido autogestionado:** Angular con microfrontends, microservicios Spring Boot, bases PostgreSQL por servicio, RabbitMQ/Sagas, Keycloak, MinIO y auditoría con Debezium/MongoDB. D09–D10, D12–D13 y D17.
2. **Aprovisionamiento antes de completar el dominio:** cuatro VMs y herramientas de desarrollo/CI. Los seguimientos aún dejan pendientes el modelo definitivo y reglas financieras/de auditoría. D20, D22–D34.
3. **Reducción a React y monolito WebFlux en AWS:** DynamoDB, Cognito, S3, Elastic Beanstalk, GitHub Actions y CloudWatch. D11 y D14.
4. **Formalización como monolito modular y SPA por funcionalidades:** estándares DynamoDB, módulos por dominio y configuración externa de UI. D01–D04.
5. **Replanteamiento del MVP:** diferentes documentos recortan o amplían profesores, plantillas, certificados, patrocinadores, reportes y auditoría. D06–D07, D18–D21.

Esta secuencia no establece fechas exactas de sustitución ni prueba que todos los diseños se implementaran. La carpeta `versiones anteriores` contiene también documentos React/WebFlux y no representa exclusivamente una etapa tecnológica.

## Las cuatro implementaciones solicitadas

### perumar-PB

**No determinado documentalmente.** No se encontró en DocumentosPM una descripción explícita de esta implementación. No es válido expandir «PB» a un producto concreto ni deducir su base de datos o autenticación.

Frontend, backend, base de datos, autenticación/autorización, archivos, infraestructura, despliegue y patrones: **no determinados**. Ventajas, desventajas y complejidad de desarrollo/mantenimiento: **no evaluables con esta evidencia**.

### perumar-vue-amplify

**No determinado documentalmente.** El nombre proporcionado por el solicitante sugiere Vue y Amplify, pero eso no prueba una arquitectura. Los documentos que mencionan Amplify lo hacen en el contexto **React/Cognito o herramientas de despliegue**, no como descripción de esta variante.

Frontend: Vue es una pista nominal pendiente de corroboración. Backend, datos, autenticación/autorización, archivos, infraestructura, despliegue y patrones: **no determinados**. Ventajas, desventajas y complejidades: **no evaluables**. No se atribuyen automáticamente API administrada, funciones ni base de datos a la palabra Amplify.

### perumar-webflux

La documentación acredita un enfoque WebFlux, pero **no lo vincula inequívocamente con esta carpeta** frente a `perumar-React-WebFlux-DynamoDB-Cognito`.

Por tanto, los componentes descritos a continuación constituyen una **asociación provisional al enfoque documentado**, no una reconstrucción verificada de esta implementación. No se puede demostrar que ambas carpetas sean etapas diferentes, copias o experimentos independientes.

### perumar-React-WebFlux-DynamoDB-Cognito

Es el nombre más alineado con D01, D07, D11, D14, D18 y D19. La correspondencia es **inferencia por coincidencia del stack**; no existe un manifiesto documental que certifique qué revisión del diseño corresponde a esa carpeta.

| Componente | Enfoque React/WebFlux documentado |
|---|---|
| Frontend | React, Vite, React Bootstrap, Bootswatch y React Router; D21 declara conversión a TypeScript |
| Backend | Java/Spring WebFlux, REST `/api/v1/**`, primero monolito reactivo y luego monolito modular por dominio |
| Base de datos | DynamoDB, tabla por agregado, claves e índices secundarios; esquemas académicos parciales |
| Autenticación | Cognito User Pools, integración frontend mediante Amplify y validación JWT en backend |
| Autorización | Grupos ADMIN, DIRECTOR y COORDINADOR; reglas de rutas y `@PreAuthorize`; permisos contradictorios entre fuentes |
| Archivos | S3 privado mediante acceso temporal prefirmado por backend; metadatos de documento |
| Infraestructura | Elastic Beanstalk/EC2 para backend; DynamoDB, S3, Cognito, CloudFront y CloudWatch |
| Despliegue | GitHub Actions, EB CLI y AWS CLI/Amplify CLI; frontend descrito en S3/CloudFront |
| Patrones | Modularidad por dominio, programación reactiva, DTO/validación, errores centralizados, JWT, auditoría estructurada y UI configurable en curso |

**Ventajas inferidas:** menos herramientas autogestionadas que el diseño distribuido; menor coordinación entre servicios; separación funcional comprensible; identidad y archivos delegados; automatización de entrega.

**Desventajas inferidas:** programación reactiva para flujos administrativos; consultas y consistencia entre agregados a resolver expresamente; integración de identidad/grupos con permisos de negocio; varias configuraciones de infraestructura para un producto pequeño; UI dinámica sin necesidad funcional demostrada.

**Complejidad de desarrollo estimada:** media-alta, especialmente en pagos, reportes y reglas entre entidades. **Mantenimiento estimado:** medio-alto por la combinación de capacidades requeridas. Son valoraciones cualitativas, no mediciones del código ni comparaciones de productividad entre frameworks.

## Arquitectura histórica adicional que sí está documentada

No debe confundirse con `perumar-PB` por ausencia de otra descripción.

| Aspecto | Diseño distribuido autogestionado |
|---|---|
| Frontend | Angular con microfrontends vinculados a microservicios |
| Backend | Spring Boot, APIs REST y eventos RabbitMQ |
| Datos | PostgreSQL por servicio; MongoDB para auditoría mediante CDC de Debezium |
| Identidad y acceso | Keycloak, OAuth2/JWT y control por roles |
| Archivos | MinIO |
| Infraestructura | VirtualBox/Ubuntu; VMs de backend, datos, middleware y CI |
| Despliegue | GitLab, Jenkins, Docker; Kubernetes/HPA como diseño, sin acreditar despliegue completo |
| Patrones | Database per Service, Saga, microfrontends, circuit breakers, reintentos, CDC y GitFlow completo |
| Ventajas inferidas | Autonomía de módulos y escalado independiente si hubiera una necesidad que los justificase |
| Desventajas inferidas | Operación de muchas herramientas, contratos distribuidos, coordinación de datos y recuperación de fallos parciales |
| Complejidad estimada | Desarrollo muy alto y mantenimiento muy alto para el contexto actual |

# 4. Comparación de arquitecturas existentes

| Variante/enfoque | Stack respaldado | Desarrollo estimado | Mantenimiento estimado | Ventaja principal | Límite o desventaja principal |
|---|---|---|---|---|---|
| perumar-PB | No determinado | No evaluable | No evaluable | No acreditada | Falta de documentación específica |
| perumar-vue-amplify | Solo pista nominal Vue/Amplify | No evaluable | No evaluable | No acreditada | No se puede reconstruir el backend ni sus controles |
| perumar-webflux | Asociación provisional al enfoque WebFlux | Media-alta, si corresponde al diseño descrito | Medio-alto, bajo esa misma condición | Menos distribución que el diseño inicial | Correspondencia con carpeta sin demostrar |
| perumar-React-WebFlux-DynamoDB-Cognito | React/WebFlux/DynamoDB/Cognito/S3; asociación por coincidencia | Media-alta | Medio-alto | Menor administración de servicios base | Reactividad y modelo de acceso/consistencia añaden trabajo |
| Diseño histórico distribuido | Angular/MFE, Spring Boot/MS, PostgreSQL, RabbitMQ, Keycloak, MinIO, CDC/MongoDB | Muy alta | Muy alto | Independencia potencial de módulos | Cantidad de componentes desproporcionada para la escala actual |

No existe evidencia para ordenar PB y Vue/Amplify por conveniencia ni para declarar ganadora a la variante más reciente. Tampoco hay mediciones de tiempos de entrega, defectos, incidencias o costo total que permitan una clasificación empírica.

# 5. Análisis del modelo de datos

## Naturaleza del dominio

**Inferencia principal: dominio predominantemente relacional, con contenido documental y configuración complementaria.** Esta conclusión describe las necesidades de información; todavía no selecciona un motor de persistencia.

| Relación o estructura | Evidencia y consecuencia |
|---|---|
| Carrera–Materia | Una carrera selecciona varias materias, reutilizables entre carreras. HU1–2 |
| Carrera–Ciclo | El ciclo referencia carrera y precarga materias, con modificaciones permitidas. HU3 |
| Ciclo–Profesor | Uno o más profesores por ciclo y validación de habilitación. HU4 |
| Alumno–Ciclo mediante Matrícula | Un alumno tiene historial de ciclos; cada ciclo tiene alumnos; combinación sin duplicados. HU5 |
| Alumno–Contacto de emergencia | Al menos un contacto, con parentesco y datos propios. HU5 |
| Patrocinador–Matrícula | Empresa opcional en el proceso; debe precisarse vigencia del patrocinio. HU5 y HU14–15 |
| Ciclo–Concepto de costo–Matrícula | Configuración de costos y selección aplicable a cada inscripción. HU5 y HU12 |
| Alumno/Ciclo–Pago | Abonos y saldos específicos del ciclo. HU13 |
| Factura–Ciclo | Una factura puede cubrir varios ciclos; deben contemplarse facturaciones parciales. HU14 |
| Pago de patrocinador–Factura | Un pago se distribuye entre facturas y una factura recibe varios abonos. HU15 |
| Usuario–Rol–Permiso | Usuarios con varios roles y permisos configurables en el alcance amplio. HU17–18 |
| Plantilla–Documento generado | Variables, tipo, versión mencionada y contexto de generación. HU8–11 y objetivos |
| Departamento–Provincia–Distrito | Jerarquía explícita que debe conservarse. HU20 |

Las relaciones de varios a varios son inferencias de los casos de uso cuando no existe un esquema explícito; no constituyen un diseño físico aprobado.

El libro D35 contiene una ficha de 58 columnas, catálogos y búsquedas por curso que recuperan textos de trámites y documentos. Esto evidencia reutilización de datos y correspondencias, no un dominio naturalmente key-value. La ficha mezcla atributos del alumno, contexto del curso y datos registrales; no debe asumirse que toda esa información pertenece al mismo registro lógico.

## Partes documentales y key-value

- **Documentales:** archivos adjuntos, fotografías, solicitudes, declaraciones, certificados, contenido de plantillas y documentos generados.
- **Estructuradas con contenido variable:** metadatos de archivos y diferencias registradas en auditoría. Su flexibilidad no obliga a una base documental separada.
- **Posibles usos key-value:** parámetros simples o configuración de UI, esta última propuesta en D01. No representan el núcleo de matrículas y cobros.

Almacenar PDFs no convierte a todo el dominio en documental. Del mismo modo, toda entidad necesita identificadores, pero eso no basta para clasificar el negocio como key-value.

## Evaluación neutral de DynamoDB

D03 justifica su uso por modularidad, bajo costo y «poca necesidad de relaciones complejas». Esa premisa está **insuficientemente sustentada frente al alcance completo**, especialmente HU13–15 y HU17–18.

El modelo académico parcial de D18 usa códigos, referencias, arrays de materias, objetos de ubicación e índices por carrera/estado. Puede representar esos datos, pero la documentación no resuelve suficientemente:

1. Cómo garantizar unicidad de matrícula alumno/ciclo ante escrituras concurrentes.
2. Cómo coordinar registro de pago, distribución entre facturas y saldos sin estados parciales.
3. Qué consultas e índices soportarán reportes por alumno, ciclo, carrera y empresa.
4. Cómo validar referencias activas e impedir inconsistencias entre agregados.
5. Qué significa copiar materias a un ciclo: referencia viva, copia editable o versión histórica.
6. Cómo generar correlativos por carrera/año sin colisiones.
7. Cómo conservar importes históricos cuando cambien costos o conceptos.

**DynamoDB no queda descartado ni validado.** Su adecuación debería demostrarse contra estas operaciones y el esfuerzo de implementarlas y mantenerlas. La evaluación tampoco presupone que elegir otro modelo resuelva las reglas de negocio automáticamente.

## Consistencia requerida y pendientes

La matrícula sin duplicados y los límites de pagos están documentados. De ellos se infiere la necesidad de mecanismos de consistencia resistentes a concurrencia; pocos usuarios no eliminan la posibilidad de dos operaciones simultáneas.

La conservación de importes aplicados, versiones de plantillas y datos usados en documentos es una necesidad de diseño **a confirmar**, derivada de la trazabilidad y del historial solicitado. No hay una política completa de modificaciones retroactivas, anulación de pagos, reversos ni conservación documental.

# 6. Complejidad y deuda arquitectónica

## Hallazgos principales

| Hallazgo | Evidencia | Consecuencia o riesgo inferido |
|---|---|---|
| Infraestructura definida antes del modelo completo | D17, D20, D22–D23 | Tiempo invertido en herramientas mientras reglas esenciales seguían pendientes |
| Distribución de procesos estrechamente relacionados | D09–D10 | Matrícula, costos y pagos necesitan coordinación entre bases/servicios |
| Reactividad sin demanda demostrada | D01, D11 | Mayor esfuerzo de composición, diagnóstico y manejo de operaciones bloqueantes sin beneficio medido |
| Modelo de acceso incompleto | D03, D18 | Cada nueva consulta puede exigir nuevos índices o composición de lecturas |
| Identidad confundida con permisos de negocio | D15 frente a D07/D19 | Grupos fijos no equivalen por sí solos a permisos dinámicos y reglas por estado |
| UI configurable y dashboards por rol | D01, D21 | Configuración, rutas y permisos adicionales para navegación relativamente pequeña |
| Auditoría reducida sin equivalencia funcional | D07 frente a D15–D16 | Logs mínimos pueden omitir diferencias, motivos y consultas exigidas |
| Documentación divergente | D06–D07, D18–D19 | Rehacer trabajo y criterios de aceptación ambiguos |
| Secretos en archivos históricos | D25–D33 | Riesgo concreto de exposición; no se verificó si las credenciales siguen vigentes |

## Recorridos donde puede acumularse trabajo

**Crear una materia en el enfoque React/WebFlux.** Los documentos describen formulario/listado, cliente API con token, ruta protegida, validación JWT, autorización, DTO, controlador, servicio, repositorio, modelo/tabla y auditoría. El checklist añade tipos y estructura frontend. Cada pieza puede tener un propósito, pero replicar contratos y transformaciones triviales entre todas ellas eleva el costo del CRUD. **No se comprobó en código cuántas de estas piezas existen ni cuáles son redundantes.**

**Registrar matrícula en el diseño distribuido.** Debe consultar contexto académico, alumno y patrocinador, calcular conceptos, guardar matrícula y auditar. Con separación por servicios y bases, el diseño agrega llamadas/eventos y posible compensación a una operación administrativa. La necesidad de Saga aparece en el diseño técnico, no en un requisito de negocio de distribución.

**Subir un archivo.** La propuesta con URL temporal tiene sentido: autorizar, permitir transferencia y registrar metadatos. El vacío está en cómo confirmar el resultado y resolver archivo cargado sin metadatos o metadatos sin archivo. No se necesita inferir un microservicio independiente para cubrir ese problema.

**Registrar un pago de patrocinador.** Su complejidad sí es del negocio: seleccionar facturas, distribuir abonos y validar saldos. La arquitectura debe facilitar la operación coherente; eventos, copias y coordinaciones adicionales requieren justificación propia.

## Alcance de la deuda identificada

Se acredita deuda **documental y de decisiones**: ausencia de correspondencia entre versiones, alcance cambiante y reglas incompletas. Se identifican riesgos de deuda **de implementación**, pero no se puede afirmar que existan clases, filtros, adaptadores o abstracciones redundantes concretas sin revisar código.

Respecto a Cognito, WebFlux y DynamoDB, el costo relevante no es solo su infraestructura: es el trabajo de comprender sus modelos, integrar permisos, modelar consultas y consistencia, diagnosticar errores y desarrollar funcionalidades transversales. Esa valoración es una inferencia cualitativa, sin horas registradas.

# 7. Patrones y estándares: necesarios vs simplificables

## Controles que deben conservarse

| Principio | Valor real y condición mínima |
|---|---|
| Autenticación | Identificar de forma confiable al usuario; recuperación e inactivación conforme al alcance |
| Autorización | Decidir operaciones permitidas en un entorno confiable, incluyendo rol y estado del recurso |
| Control de acceso | Proteger registros y documentos; una ruta oculta o botón deshabilitado no es una barrera suficiente |
| Validación | Tipos, tamaños, rangos, referencias, unicidad y reglas de negocio comprobados fuera del cliente |
| Gestión de secretos | Separar credenciales de documentación/código, restringir acceso y permitir renovación |
| Protección contra inyecciones | Evitar construcción insegura de consultas y ejecución de contenido; tratar plantillas enriquecidas como superficie de entrada |
| Auditoría crítica | Autor, fecha, entidad, acción, resultado y cambios/motivo cuando proceda, con integridad y acceso restringido |
| Transporte y datos | Comunicaciones protegidas, archivos privados y permisos mínimos de infraestructura |
| Errores consistentes | Respuestas entendibles sin trazas internas ni secretos |
| Recuperación | Respaldos y restauración verificable; parámetros operativos aún por definir |

Estos controles provienen del alcance y los estándares documentados, además de los mínimos expresos del solicitante. Sus mecanismos concretos siguen abiertos.

## Estándares con valor, pero ajustables

| Estándar/patrón | Aporte | Qué puede simplificarse o debe validarse |
|---|---|---|
| Modularidad por dominio | Localiza reglas y cambios | No exige servicios ni despliegues separados |
| DTO y validación en el borde | Define datos aceptados y errores | Evitar DTO, JSON Schema y validadores manuales duplicando la misma regla sin motivo |
| Separación presentación/negocio/persistencia | Evita dispersar reglas | No exigir interfaces, factories y mapeos que solo delegan y no protegen una frontera útil |
| JWT y validación central | Consistencia de identidad | Evitar validaciones ad hoc repetidas; centralizar no elimina permisos de negocio |
| Guards frontend | Mejora navegación | Mantenerlos como UX, sin duplicar allí la autoridad de seguridad |
| Convenciones de nombres y errores | Consistencia | Elegir una convención coherente, evitando excepciones y traducciones innecesarias |
| Estado y metadatos de modificación | Operación y trazabilidad básica | `created_by/updated_by` no sustituye historial de cambios; no imponer ACTIVO/INACTIVO a pagos y documentos sin semántica definida |
| SemVer, PR y CI | Entregas rastreables y verificadas | Flujo de ramas proporcional al equipo; GitFlow completo no está justificado por el tamaño documentado |
| Pruebas | Protegen reglas críticas | Priorizar permisos, duplicados, importes, relaciones y recuperación sobre pruebas repetidas de delegación |
| URLs temporales para archivos | Restringe acceso y reduce tránsito por aplicación | Mantener autorización, validación y confirmación de metadatos sin duplicar pasarelas |
| Cifrado y mínimo privilegio | Protección de datos | No equiparar un producto o modo de claves específico con el principio; definir necesidad y operación de claves |

## Patrones sin justificación suficiente para el contexto actual

- Microservicios y bases independientes por módulo.
- Microfrontends por correspondencia con cada servicio.
- Sagas y broker para operaciones que no necesitan ser distribuidas por negocio.
- CDC más otra base exclusivamente para satisfacer auditoría sin evaluar sus necesidades concretas.
- Kubernetes/HPA y extracción anticipada hacia múltiples plataformas futuras.
- Configuración dinámica de menú/dashboard en base de datos sin un caso de uso de administración demostrado.
- Geoblocking, Bot Control y reglas complejas de WAF como estándar general sin una evaluación concreta. D01 lo trata como opcional, mientras D11 desarrolla un conjunto amplio.

No se concluye que esos patrones sean incorrectos en general. **La documentación no demuestra que compensen su costo en PERÚ MAR.**

La auditoría mediante CDC no garantiza por sí sola conocer al usuario de negocio ni el motivo de una operación. Un log de infraestructura tampoco satisface automáticamente la auditoría funcional. Es necesario preservar el control, aunque se reduzcan componentes.

La política de CSRF debe corresponder al mecanismo efectivo de sesión y transporte de credenciales. No basta con listar un filtro estándar. El escape de React tampoco cubre automáticamente contenido enriquecido de plantillas o salidas que eviten ese escape.

## Funcionalidades y necesidad de backend propio

En esta tabla, «ejecución confiable» puede estar en lógica propia o en controles de un servicio administrado. **No equivale a exigir un servidor dedicado ni un backend independiente por módulo.** La evaluación identifica responsabilidades, sin seleccionar proveedores.

| Funcionalidad | Responsabilidad específica de PERÚ MAR | Capacidad potencialmente administrada | ¿Backend propio obligatorio? |
|---|---|---|---|
| Maestras/catálogos | Permisos, estados, jerarquías y reglas de uso | Persistencia y CRUD con controles | No necesariamente; sí controles confiables |
| Maestros/profesores | Habilitación y asignación válida a ciclos | CRUD y persistencia | Lógica del dominio necesaria; despliegue propio no demostrado |
| Alumnos | Identidad documental, relaciones y validaciones del expediente | Persistencia y operaciones simples | No para cada CRUD; reglas deben aplicarse de forma confiable |
| Ciclos | Fechas, correlativo, materias y edición según matrículas | Persistencia y restricciones | Requiere reglas; no necesariamente servidor permanente |
| Matrículas | Unicidad, costos aplicables, patrocinio y consistencia | Transacciones/restricciones disponibles | Requiere lógica confiable; no basta un formulario directo sin controles |
| Pagos | Validar y aplicar abonos sin exceder saldos | Persistencia y soporte transaccional | Requiere lógica de negocio confiable |
| Patrocinadores/facturas | Relaciones, líneas y distribución de pagos | CRUD y persistencia | CRUD delegable; distribución requiere reglas |
| Documentos/archivos | Autorizar acceso y registrar vínculo con expediente | Almacenamiento privado y transferencia temporal | No necesita retransmitir todos los bytes por un backend propio |
| Generación PDF | Elegir datos, plantilla, permisos y registrar emisión | Motor o ejecución de generación | Puede delegarse la capacidad; permanece la coordinación del dominio |
| Reportes | Definiciones, filtros, acceso y conciliación | Consultas, exportación o ejecución administrada | No exige microservicio propio ni almacén analítico separado |
| Autenticación | Política de acceso e integración de identidad | Login, contraseñas, recuperación y tokens | No requiere implementar autenticación propia |
| Autorización | Matriz y reglas contextuales | Políticas/grupos del servicio, si son suficientes | Debe ejecutarse confiablemente; los grupos pueden no cubrir todo |
| Auditoría | Semántica de operaciones, cambios, motivos y consulta | Almacenamiento/logs y controles de integridad | No exige un servicio independiente; logs técnicos solos son insuficientes |

Registrar Yape, Plin o transferencia en un abono no demuestra necesidad de integración de cobro online. La pasarela y la facturación electrónica figuran como evolutivos en D06.

# 8. Requisitos para una arquitectura simplificada

Los siguientes requisitos son criterios neutrales para evaluar una futura solución. No constituyen selección de tecnología ni propuesta de migración.

| ID | Requisito | Base y forma de comprobarlo |
|---|---|---|
| RA01 | Resolver la operación de una institución sin administración SaaS anticipada | Contexto actual del solicitante; demostrar los flujos sin aprovisionamiento de tenants |
| RA02 | Reducir tiempo de desarrollo y esfuerzo de mantenimiento | Prioridad del solicitante; comparar pasos y componentes para un CRUD y una regla transversal |
| RA03 | Mantener reglas de dominio localizables | HU1–15; identificar un punto responsable de cada regla sin copias divergentes |
| RA04 | Soportar relaciones e integridad del núcleo académico/financiero | HU2–5 y HU12–15; comprobar referencias y ausencia de matrículas duplicadas |
| RA05 | Registrar pagos y sus aplicaciones de forma coherente | HU13–15; demostrar que una concurrencia o fallo no deja saldos incompatibles |
| RA06 | Consultar y reportar sin reconstrucción manual habitual entre componentes | HU16 y alcance financiero; demostrar reportes por alumno, ciclo y patrocinador |
| RA07 | Preservar autenticación, autorización y control de acceso del servidor o servicio confiable | HU17–18; probar permisos positivos y negativos según recurso/estado |
| RA08 | Validar entradas y proteger contra inyecciones | Estándares y mínimos solicitados; cubrir formularios, consultas, archivos y plantillas |
| RA09 | Mantener secretos fuera de archivos de proyecto/documentación | Hallazgo D25–D33 y mínimo solicitado; demostrar suministro y renovación segura |
| RA10 | Proteger documentos y vincularlos al expediente | HU6; comprobar tipos, límite, acceso privado y resolución de cargas fallidas |
| RA11 | Generar documentos institucionales con datos y formato correctos | HU7–11, D36–D39; validar ficha impresa y trazabilidad de emisión |
| RA12 | Registrar auditoría de operaciones críticas con identidad estable y datos suficientes | Alcance y HU23; reconstruir una modificación y un pago sin depender solo del último editor |
| RA13 | Operar con un procedimiento de despliegue y recuperación comprensible | Documentación operativa; verificar entrega y restauración, con objetivos pendientes de acordar |
| RA14 | Mantener una sola definición vigente de alcance, permisos y contratos | Contradicciones detectadas; trazabilidad de historias a reglas y pruebas |
| RA15 | Introducir nuevos componentes solo con necesidad demostrable | Prioridad contra over engineering; justificar responsabilidad, costo y alternativa más simple |

La consistencia bajo concurrencia y la resolución de fallos son **requisitos derivados** de no duplicar matrículas, respetar saldos y mantener expedientes coherentes. No añaden alta escala al alcance.

La futura evaluación debe medir el costo total: desarrollo, configuración, pruebas, diagnóstico, operación, cambios de consultas y mantenimiento, además de infraestructura. No hay base documental para fijar todavía cifras de rendimiento, disponibilidad, RPO/RTO o presupuesto.

La modularidad debe permitir comprender y cambiar el sistema. La posibilidad de crecer a largo plazo puede preservarse con límites claros y datos comprensibles, sin convertir la extracción futura a microservicios en criterio obligatorio de diseño actual.

# 9. Vacíos o contradicciones encontrados en la documentación

| Tema | Hallazgo | Efecto en el diagnóstico |
|---|---|---|
| Versiones históricas | Faltan descripciones explícitas de PB y Vue/Amplify y correspondencia entre las dos carpetas WebFlux | No permite comparar con rigor las cuatro implementaciones reales |
| Cronología | Varias fuentes son propuestas o exportaciones; no hay decisiones fechadas de sustitución | Se reconstruyen enfoques, no una historia exacta de releases |
| MVP | D06 incluye certificados y patrocinadores en Fase 1; D07 los posterga; D18 cubre tres CRUD y D19 amplía | No existe una única línea base de entrega |
| Profesores | D06/D19 los incluyen; la secuencia D07 no desarrolla con igual precisión su lugar | Asignación y habilitación requieren aclarar alcance |
| Certificación | HU11 exige culminación satisfactoria y nota; D06 coloca evaluaciones/notas en Fase 2 | Falta definir cómo se acredita aprobación en el primer alcance |
| Roles | La matriz D16 restringe operaciones académicas del administrador; D19 permite mutaciones a ADMIN y restringe usuarios a ADMIN | No puede implementarse una política única sin resolver diferencias |
| Auditoría y permisos | El alcance menciona consulta por administrador/director; la matriz y HU23 incluyen coordinador | Falta un criterio de acceso consolidado |
| Permisos dinámicos | HU17 permite roles y permisos editables; D07 reduce a tres grupos Cognito | Recorte de alcance no equivale a implementar la historia completa |
| Auditoría mínima | D07 posterga módulo completo y usa logs; D15 solicita cambios, motivos y consulta | Debe distinguirse lo aplazable de los controles críticos desde el inicio |
| Identidad y almacenamiento | Historias siguen prescribiendo Keycloak/MinIO mientras arquitectura posterior usa Cognito/S3 | Mezcla de requisitos funcionales con implementaciones sustituidas |
| Maestras | HU20 pide mantenimiento; D03 permite listas estáticas para algunos catálogos | Elegir estático puede recortar una capacidad documentada y requiere decisión funcional |
| Datos | D03 presupone pocas relaciones complejas; HU14–15 describen distribución financiera entre varias entidades | La justificación de persistencia no cubre el alcance total |
| Convenciones | D03 exige snake_case; D18 usa createdAt, codigoCarrera y nombreCiclo | Riesgo de traducciones y criterios inconsistentes |
| Estados | D03 impone ACTIVO/INACTIVO a todas las tablas; los procesos tienen condiciones más ricas | Falta definir estados por entidad y distinguirlos de baja lógica |
| Serverless | D01/D03 describen infraestructura enteramente serverless, pero el backend se despliega en EB/EC2 | La descripción no representa de forma consistente los componentes |
| Costos | Se afirma cobertura total Free Tier sin dimensionamiento ni estimación detallada | No se puede tratar como garantía ni costo actual verificado |
| Despliegue | Amplify aparece como biblioteca de identidad, CLI y posible hosting futuro; API Gateway se menciona sin topología completa | Falta distinguir funciones de cada componente y rutas reales |
| Ciclos | HU3 prohíbe superposiciones sin definir claramente el universo; D18 lo limita a misma carrera | La regla debe acordarse, no generalizarse automáticamente |
| Datos históricos | Copia de materias al ciclo, cambios de costos y plantillas sin política completa de vigencia | No está definido qué cambia retroactivamente |
| Finanzas | No hay política completa de anulación, corrección, reversos, moneda/redondeo ni conciliación de líneas y total | No debe inventarse comportamiento financiero |
| Adjuntos | HU6 los permite después de matrícula; HU20 admite tipos obligatorios | Falta definir en qué etapa se exige cada documento |
| Documentos | Firmas y huellas aparecen como espacios impresos | No acredita requisito de firma digital ni almacenamiento biométrico |
| Seguridad operativa | Datos de acceso y tokens en claro; cuentas administrativas amplias; scripts con eliminación, desprotección y push forzado | Deuda concreta de seguridad y procedimiento; vigencia de accesos no comprobada |
| Operación | Respaldos y HTTPS aparecen como pendientes en seguimientos; no hay prueba productiva ni recuperación medida | No puede asumirse control operativo efectivo |
| Calidad documental | D05 tiene texto deteriorado; D24 conserva contenido ajeno al proyecto | Requiere separar evidencia de ruido y evitar tratar exportaciones como especificación aprobada |

No se reproducen valores de secretos en este informe. Los archivos históricos que los contienen deben tratarse como material sensible. Si siguen vigentes, corresponderá su renovación; no se ejecutó ninguna acción sobre credenciales ni infraestructura.

También faltan volumen real de alumnos/documentos, crecimiento, concurrencia medida, responsables de operación, política de retención, disponibilidad requerida y objetivos de recuperación. Son datos por obtener, no requisitos nuevos que este informe dé por aprobados.

# 10. Conclusiones

1. **PERÚ MAR necesita principalmente una aplicación administrativa con reglas académicas y financieras**, expedientes documentales, permisos y trazabilidad. La documentación no acredita una necesidad actual de una plataforma distribuida ni SaaS.
2. **El dominio es predominantemente relacional**, acompañado de archivos y plantillas documentales. La elección histórica de DynamoDB no demuestra su adecuación; debe contrastarse con relaciones, consultas y consistencia, incluyendo el costo de desarrollo.
3. **La evolución documentada sí reduce infraestructura autogestionada**, al pasar del diseño Angular/microservicios y múltiples herramientas al enfoque React/WebFlux con servicios administrados. Esa reducción no elimina la complejidad de programación, datos ni autorización.
4. **No es posible reconstruir por completo las cuatro implementaciones solo desde DocumentosPM.** PB y Vue/Amplify carecen de descripción específica; las carpetas WebFlux no tienen una correspondencia inequívoca con versiones documentales. Completar esa parte exigiría posteriormente evidencia de cada implementación.
5. **Parte de la complejidad es del negocio y debe conservarse:** pagos parciales, distribución entre facturas, reglas de edición, relaciones válidas y auditoría. Otra parte deriva de decisiones técnicas sin necesidad demostrada: distribución anticipada, reactividad obligatoria, UI dinámica y múltiples mecanismos transversales.
6. **Los servicios administrados pueden cubrir capacidades comunes**, pero las reglas de matrícula, costos, permisos contextuales y aplicaciones de pagos siguen siendo responsabilidad del sistema. Eso no obliga a un servidor propio permanente ni a un servicio separado por módulo.
7. **Simplificar exige conservar controles esenciales:** autenticación, autorización, validación, acceso a datos/archivos, secretos, protección contra inyecciones y auditoría crítica. Reducir componentes no autoriza a reemplazar esos controles por validaciones del frontend o logs insuficientes.
8. **La principal tarea previa a cualquier elección tecnológica es consolidar alcance, permisos, modelo lógico y reglas pendientes.** Este informe define criterios para esa evaluación posterior, sin elegir tecnología, proponer una migración ni afirmar que la versión más reciente sea la mejor.

Se creó únicamente este informe a petición del solicitante. No se modificaron código, documentos fuente ni configuraciones del proyecto.
