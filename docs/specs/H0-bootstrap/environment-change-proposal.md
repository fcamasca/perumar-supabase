# CHG-H0-001 — Aislamiento del entorno local Windows

**Documento histórico de propuesta.** Posteriormente la persona creó la regla, confirmó el ensayo y aprobó la mitigación y revisión del guard. Estado vigente: [approved-isolation-amendment.md](approved-isolation-amendment.md); evidencia: [controlled-network-test.md](controlled-network-test.md) y [technical-results.md](technical-results.md). Las indicaciones NO APLICADA/PENDIENTE de este texto corresponden a su emisión original.

**Fecha:** 21/10/2026. **Estado:** PROPUESTA PARA REVISIÓN HUMANA — NO APLICADA.

El usuario autorizó preparar un cambio concreto del entorno, sin aplicarlo. Este documento no modifica el Spec aprobado ni autoriza continuar su construcción. No se ejecutaron los comandos de modificación que figuran más abajo.

## Hallazgo y límites de la evidencia

Supabase CLI 2.121.0 y Docker Engine 29.7.2 arrancaron el stack local en la red `perumar-h0-local`. Se comprobó la opción `com.docker.network.bridge.host_binding_ipv4=127.0.0.1`. Sin embargo, los puertos 54321–54324 aparecieron publicados como `0.0.0.0` y `::`; una petición desde el equipo a una dirección propia no-loopback recibió respuesta HTTP.

No se probaron conexiones desde otro dispositivo ni se acredita una exposición a Internet. El resultado sí impide demostrar el aislamiento local exigido. No había datos ni esquema de negocio. El stack fue detenido, sin eliminar volúmenes ni afectar otros proyectos.

Se observó firewall Windows habilitado en Domain, Private y Public, con acción entrante por defecto Block. No se han cambiado reglas, perfiles, WSL ni configuración del daemon. La causa raíz exacta entre Engine, publicación de Docker Desktop y forwarding de Windows aún no está demostrada. Hay antecedentes de comportamiento similar en el repositorio oficial de Supabase, pero no prueban que este equipo tenga la misma causa. [Incidencia oficial](https://github.com/supabase/supabase/issues/51027).

## Cambio concreto propuesto para ensayo controlado

**Candidato:** añadir UNA regla entrante de Windows Defender Firewall que bloquee TCP 54320–54324 cuando la dirección de destino sea distinta de loopback. No instalar servicios ni cambiar el stack. Los puertos incluyen API, base, Studio, correo local y el puerto de shadow DB reservado en configuración.

La regla usaría nombre único `PERUMAR-H0-Block-NonLoopback`, todos los perfiles y bloqueo de destinos IPv4/IPv6 no-loopback. El comando siguiente es una propuesta, NO una instrucción para ejecutarlo antes de revisión:

```powershell
# PROPUESTA — NO EJECUTADA. Requiere aprobación y consola administrativa.
if (Get-NetFirewallRule -Name 'PERUMAR-H0-Block-NonLoopback' -ErrorAction SilentlyContinue) {
    throw 'Ya existe una regla con este nombre; no se sobrescribe.'
}
New-NetFirewallRule `
    -Name 'PERUMAR-H0-Block-NonLoopback' `
    -DisplayName 'PERÚ MAR H0: bloquear destinos no-loopback' `
    -Direction Inbound -Action Block -Enabled True -Profile Any `
    -Protocol TCP -LocalPort '54320-54324' -RemoteAddress Any `
    -LocalAddress @('0.0.0.0-126.255.255.255', '128.0.0.0-255.255.255.255', '::2-ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff') `
    -EdgeTraversalPolicy Block
```

El cmdlet admite rangos de direcciones y puertos. Esta regla concreta es un diseño propuesto, no una configuración recomendada por Microsoft específicamente para Supabase. [Microsoft: New-NetFirewallRule](https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule).

**Impacto:** cambia una política del equipo, requiere administración y afecta a cualquier proceso que use esos puertos mientras esté activa. No cambia origin, credenciales, base, imágenes o servicios. No se deben reservar silenciosamente esos puertos si otro proyecto los necesita. El coste de mantenimiento es una regla del host y su verificación; no es cero.

## Por qué aún no permite continuar H0

Una regla de firewall no transforma un socket `0.0.0.0` en `127.0.0.1`. El guard actual rechaza bindings globales y debe seguir haciéndolo mientras no se apruebe una política distinta de aislamiento efectivo. Adoptar el candidato requiere revisión explícita del control y del mecanismo que lo verifica, antes de modificar el guard. No se propone desactivar el guard o admitir `0.0.0.0` sin evidencia.

Además, el tráfico reenviado por Docker Desktop o entre procesos del mismo host puede no evaluarse como tráfico entrante ordinario. Por eso no se garantiza que la regla sea suficiente; debe ensayarse con un segundo dispositivo autorizado. Si el criterio humano es bind estricto a loopback en vez de filtrado efectivo, esta alternativa no satisface ese criterio y no debe aprobarse como solución.

## Validación necesaria antes de adoptarla

1. Revisar alcance, colisión de puertos y regla propuesta; guardar referencia del estado previo sin exportar secretos. Confirmar permisos administrativos.
2. Aprobar por separado el ensayo de la regla y cualquier ajuste del mecanismo de verificación. Mantener el stack detenido hasta esa decisión. No modificar WSL, desactivar firewall ni habilitar Docker API remota.
3. En una ventana controlada, comprobar que localhost/127.0.0.1 funciona y que IPv4 e IPv6 no-loopback no son accesibles desde OTRO dispositivo autorizado de la red. Revisar todos los puertos publicados. Una petición desde el mismo equipo no sustituye esa prueba.
4. Comprobar inicio/parada/reconstrucción y que la regla sigue siendo efectiva después de recrear contenedores. No probar con datos reales.
5. Si falla una comprobación, detener el stack y revertir exclusivamente la regla creada. No añadir más controles sucesivos para forzar un resultado aceptable.
6. Registrar resultado y decisión humana. Solo si se aprueba la solución concreta y su incorporación al diseño, retomar TASK-H0-003 y después las dependientes. El Gate 2 de H0 sigue siendo otra decisión posterior.

## Reversión propuesta

```powershell
# PROPUESTA — NO EJECUTADA. Solo para la regla exacta creada por el ensayo.
Remove-NetFirewallRule -Name 'PERUMAR-H0-Block-NonLoopback'
```

Antes de revertir, detener el stack. No eliminar reglas Docker preexistentes ni cambiar perfiles completos.

## Alternativas y recomendación

- **Mantener H0 bloqueado:** opción segura si no se quiere modificar el host o no puede verificarse la red desde otro dispositivo.
- **Ensayo de regla acotada:** cambio concreto anterior, sujeto a validación; introduce dependencia de firewall Windows y puede requerir ajuste explícito del diseño de verificación.
- **Corregir el binding efectivo en Docker/CLI:** mantiene mejor el control de loopback, pero no se ha identificado un ajuste soportado y validado para este equipo. No se propone reinstalar, actualizar o cambiar de runtime a ciegas.

**Recomendación:** no reactivar el stack ahora. Revisar primero si se acepta el control por firewall como solución para este equipo y, en tal caso, autorizar únicamente el ensayo acotado con criterios de reversión. Si se requiere bind estricto, conservar el bloqueo hasta disponer de una corrección demostrable de Docker/CLI. No introducir otra plataforma ni una API adicional para resolver un problema de exposición local.

La opción de red intentada corresponde a la documentación oficial. Cambiar globalmente `default-network-opts` o `ip` del daemon afecta más proyectos y no se presenta como solución demostrada, especialmente cuando ya se observó el fallo con la opción por red. [Docker: publicación de puertos](https://docs.docker.com/engine/network/port-publishing/), [Supabase: desarrollo local](https://supabase.com/docs/guides/local-development).

**APROBACIÓN DEL CAMBIO: PENDIENTE. APLICACIÓN: NO AUTORIZADA.**
