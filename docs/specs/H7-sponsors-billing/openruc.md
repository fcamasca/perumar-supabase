# TASK-H7-008 — Consulta opcional de RUC con OpenRUC

Enmienda humana específica del 25/11/2026. Base publicada e7804eb5d58df14cc3b04e5b1c8fa09be5e221b5; se preservan los ajustes PDF locales anteriores sin mezclarlos funcionalmente con esta consulta. Gate 1 histórico permanece válido y no se modifica gate-1.md. Sin cierre/merge de H7.

## Revisión del proveedor y condiciones publicadas

Fuentes revisadas el 25/11/2026:

- https://openruc.com/ — API abierta, gratuita, sin login ni API key; solo personas jurídicas con RUC que empieza por20; patrocinada por Latinfo.
- https://openruc.com/openapi.json — contrato GET /api/ruc/{ruc}, patrón20 + nueve dígitos, campos ruc/razon_social/estado/condicion/direccion/ubigeo/source/as_of; 400/404/429. Etiqueta de licencia «Public data (SUNAT)», sin licencia jurídica detallada ni termsOfService.
- https://openruc.com/llms.txt — confirma endpoint sin API key y exclusión de RUC de personas naturales. Sus enlaces MCP/Latinfo no se incorporan.

No se encontró un documento de términos separado enlazado desde la página/API ni cuotas numéricas/SLA publicados. El enlace GitHub publicado respondió404; no se infiere licencia MIT ni garantía por ese enlace. No se crea cuenta ni se aceptan contratos en nombre del usuario. La documentación pública invita expresamente al consumo de esta API por desarrolladores; el usuario autoriza este proveedor concreto. Cambios de condiciones, disponibilidad, exactitud o límites quedan como dependencia externa revisable. Se conserva source/as_of visible sin presentar al proveedor como SUNAT ni prometer información en tiempo real.

Prueba directa aislada: GET https://openruc.com/api/ruc/20100047218 devolvió HTTP200 application/json, los ocho campos previstos, source SUNAT, as_of 2026-11-25. Incluía _more con enlaces promocionales. No se siguieron ni consumieron esos enlaces. No se registró una cabecera RateLimit-Limit; ausencia de cabecera no significa ausencia de restricciones. Solo se consultó el RUC público autorizado, sin datos académicos/contactos/secretos.

## Contrato acotado

React llama únicamente a la Edge Function consultar-ruc mediante POST JSON {ruc}. JWT/getUser y rol académico actual Director/Coordinador se comprueban antes de llamar al proveedor y de nuevo antes de devolver los datos. ADMIN_SISTEMA solo no tiene acceso. La función usa cliente de usuario con clave anon y sin retry DB; no necesita service_role. No hay credencial de OpenRUC; si el proveedor la exigiera después, no se enviaría desde el navegador.

Se rechazan campos actor/URL/permisos, RUC con formato/verificador inválido y prefijos fuera de20 antes del upstream. Un único GET HTTPS a origen fijo, sin redirecciones, sin cabeceras de sesión enviadas al proveedor, límite total5s, entrada512bytes y respuesta32KiB. Se comprueban JSON, longitudes, RUC coincidente, source SUNAT, fecha real as_of no futura y ubigeo válido o nulo. Valores no publicados de referencia pueden ser nulos. Proyección fija: _more y cualquier otro atributo son descartados, sin enlaces/HTML interpolados. Logs solo categoría y correlación aleatoria, sin RUC/direcciones/tokens/PII. Headers no-store y CORS de origen permitido; RUC_ALLOWED_ORIGINS configura despliegues, local usa127.0.0.1:5173.

## Formulario y registro manual

Botón Consultar RUC solo en alta/edición de empresa para roles funcionales. La razón social y el domicilio fiscal del borrador se completan; no se inventan teléfono/email/contacto. Ambos siguen editables y la consulta nunca llama a guardar_empresa_patrocinadora. Guardar empresa amplía su RPC existente con domicilio_fiscal y datos_tributarios opcionales; conserva permisos, control de versión y auditoría. Migración 20261125050000_h7_company_tax_reference.sql, sin tablas ni índices nuevos.

La última referencia normalizada se conserva únicamente al Guardar empresa, separada de datos operativos editados. Se muestra almacenada al consultar/editar sin red automática, con proveedor, fuente, fecha del padrón y hora de consulta en Lima. Un guard síncrono evita doble consulta. Si cambia RUC, se aborta/descarta el resultado anterior; si se modifica nombre o domicilio mientras responde, no se sobrescribe esa edición. Fallos de red, timeout, 404,429, errores de permisos/proveedor o contenido inválido conservan todos los campos y permiten continuar manualmente conforme a los permisos existentes. Sin reintentos automáticos ni dependencia del servicio para guardar. El prefijo20 limita solo la consulta externa, no el registro manual.

## Validación y operación

Pruebas focalizadas en RucEdge, CompanyRucLookup y EnrollmentPages; tipos Edge/frontend, lint y diff-check. Resultados en technical-results.md. No se ejecutan regresión financiera/DB completa ni CI integral por este cambio sin SQL. La llamada directa real al proveedor no equivale a validación de punta a punta de Auth + Edge hospedado + React; ese recorrido y revisión humana quedan pendientes.

Para probar localmente: reiniciar functions serve --network-id perumar-h0-local si estaba levantado y recargar el formulario de empresa. Aplicar migration up --local --network-id perumar-h0-local antes de probar; no hay token de proveedor que configurar. Residuales existentes de H7/H6/GATE-A01 se mantienen, sin convertirlos en PASSED. No se implementa padrón local, SOAP SUNAT, RUC por scraping, consulta de otros datos, reportes, CSV, cierre ni merge.

## Ampliación humana — modelo híbrido, 25/11/2026

Esta ampliación sustituye el alcance inicial efímero de TASK-H7-008. domicilio_fiscal es operativo, opcional, editable (500 caracteres); datos_tributarios conserva exclusivamente ruc, razon_social, estado, condicion, direccion, ubigeo, source, as_of, proveedor, consultado_at. fuente=source SUNAT; proveedor=OpenRUC; as_of es fecha del padrón, consultado_at es fecha/hora UTC emitida por Edge. No se almacena respuesta completa ni _more. El JSONB no certifica jurídicamente una identidad ni prueba autenticidad del proveedor frente a un cliente manipulado: es referencia confirmada por un rol autorizado; el servidor valida forma y correspondencia, no una firma externa.

La consulta Edge sigue sin escribir DB. React mantiene la referencia en borrador; la RPC persiste atómicamente con nombre y domicilio confirmados, bajo versión esperada. Nueva consulta exitosa explícita reemplaza la referencia del borrador, fallo la conserva. Cambiar RUC elimina la referencia del borrador; cancelar restaura la guardada. Manual admite JSONB nulo. La dirección operativa puede diferir de la consultada; la UI identifica la dirección/razón social de referencia cuando corresponde. Fecha/hora de consulta y proveedor son metadatos de servidor en la respuesta normalizada.

Para clientes anteriores: insert sin nuevos campos produce NULL; update que los omite los preserva con mismo RUC, y cambio RUC sin nueva referencia limpia JSONB. Una referencia explícita de otro RUC se rechaza, sin fallback silencioso. CHECK aplica también a escritura privilegiada accidental; authenticated no gana DML, solo la RPC existente. Auditoría conserva nombres de campos modificados, nunca copia JSONB/domicilio. No hay historial, índices JSONB, backfill, nuevas tablas ni modificación financiera/arquitectura.
