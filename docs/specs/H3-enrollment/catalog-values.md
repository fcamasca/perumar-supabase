# H3 — Valores iniciales autorizados

Fuente: respuesta humana del 23/10/2026 (America/Lima) a la consulta de datos iniciales. Se conservan las etiquetas enviadas; los códigos técnicos son estables y únicos dentro de cada catálogo existente.

| Catálogo | Cantidad | Etiquetas autorizadas |
|---|---:|---|
| SEXO | 2 | F, M |
| ESTADO_CIVIL | 5 | Casado (a), Conviviente, Divorciado (a), Soltero (a), Viudo (a) |
| GRUPO_SANGUINEO | 8 | A-, A+, AB-, AB+, B-, B+, O-, O+ |
| GRADO_INSTRUCCION | 5 | Analfabeto, Primaria, Secundaria, Tecnico, Superior |
| COLOR_OJOS | 5 | Azules, Marrones, Negros, Pardos, Verdes |
| COLOR_CABELLO | 4 | Castaño, Marrón, Negro, Pelirrojo |
| PARENTESCO | 12 | Conviviente, Cuñado (a), Cónyuge, Hermano (a), Hijo (a), Madre, Padre, Primo (a), Sobrino (a), Suegro (a), Tio (a), Vecino (a) |

Total: **41 valores en siete catálogos**. Se cargan mediante la migración aditiva `20261023030000_h3_authorized_catalog_values.sql`; no se modifican las migraciones ya publicadas ni se agregan tablas/helpers/RPC/policies. La referencia versionada está en `supabase/reference/h3-catalog-values.json` y la integración compara códigos, etiquetas, vigencia y pertenencia por catálogo tras reset.

TIPO_DI conserva exclusivamente DNI y CARNET_EXTRANJERIA. El usuario confirmó expresamente «Mantener solo DNI y Carné de extranjería en H3» al consultar PASAPORTE presente en la tabla original. No se añade PASAPORTE ni se amplía su validación.

Se conservan por separado Castaño y Marrón en COLOR_CABELLO, y Conviviente en sus respectivos catálogos ESTADO_CIVIL/PARENTESCO. GRUPO_SANGUINEO mantiene etiquetas A-/A+/AB-/AB+/B-/B+/O-/O+ con códigos técnicos inequívocos. Ninguna etiqueta implica un permiso o comportamiento adicional.

No cambia el Spec aprobado, Gate 1 ni alcance; pruebas humanas/Gate 2 siguen pendientes. EVOL-001/002 excluidas.


## Etiquetas de sexo — ajuste humano del 28/10/2026

El usuario solicitó palabras completas. La migración aditiva `20261028190000_h3_sex_labels.sql` cambia únicamente las etiquetas del catálogo SEXO: F → FEMENINO, M → MASCULINO. Códigos e IDs estables, sin reescribir snapshots históricos. La referencia JSON y la comparación de integración usan estas etiquetas vigentes; la tabla anterior conserva la procedencia original de F/M.


## Ocupación — solicitud humana del 28/10/2026

Se incorpora OCUPACION al catálogo genérico existente: OTROS primero, PESCADOR, VENDEDOR, CHOFER, ALBAÑIL, MECÁNICO, COCINERO, MOZO, VIGILANTE, PANADERO, CARPINTERO, AGRICULTOR, TÉCNICO, LIMPIADOR, GASFITERO y ELECTRICISTA. No se almacenan códigos CNO ni perfiles NSE. Los códigos internos del catálogo identifican sus valores y no son códigos CNO.

Migración aditiva `20261028200000_h3_occupation_catalog.sql`: `alumno.ocupacion_id` referencia `catalogo_valor`; `ocupacion` conserva el nombre canónico o el detalle obligatorio de OTROS. El trigger valida pertenencia y vigencia del catálogo/valor. La RPC y el snapshot existentes incorporan la referencia, etiqueta y detalle histórico; no se crean tablas, RPC, helpers ni policies. Los textos anteriores permanecen intactos con referencia nula hasta edición explícita. Ocupación continúa opcional. Total inicial: 11 catálogos y 66 valores. Este ajuste solicitado se registra separado de los cuatro documentos aprobados; Gate 2 sigue pendiente.
