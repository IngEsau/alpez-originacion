---

## `specs/05-application-wizard.spec.md`

```markdown
# 05 — Application Wizard Spec

## Objetivo

Crear un wizard para capturar una nueva solicitud de originación en el MVP ALPEZ.

El wizard debe permitir capturar los datos mínimos para demo, adaptar campos según tipo de persona y generar una solicitud mock al finalizar.

## Ruta

```txt
/solicitudes/nueva
```

## Página

NewApplicationPage

## Componente principal

ApplicationWizard

## Pasos del wizard

El wizard debe tener 5 pasos:

1. Tipo de solicitud
2. Datos generales
3. Información financiera
4. Documentos
5. Revisión y simulación

## Paso 1 — Tipo de solicitud

## Objetivo

Seleccionar el escenario de originación.

## Campos

Escenario de solicitud  
Monto solicitado  
Ejecutivo asignado  

## Opciones de escenario

Persona Física con hit Buró  
Persona Moral con hit Buró  
Persona Moral sin hit Buró  

## Reglas

El escenario es obligatorio.  
El monto solicitado es obligatorio.  
El monto solicitado debe ser mayor a 0.  
El ejecutivo puede cargarse por defecto como "Ejecutivo Demo".  

Al seleccionar escenario se define:

personType  
scenario  
documentos requeridos  
campos siguientes  

## Resultado del paso

Debe construir parcialmente:

```ts
{
  personType: "fisica" | "moral";
  scenario: ApplicationScenario;
  requestedAmount: number;
  executiveName: string;
}
```

## Paso 2 — Datos generales

## Objetivo

Capturar datos del solicitante.

## Campos para Persona Física

Nombre  
Primer apellido  
Segundo apellido  
RFC  
CURP  
Fecha de nacimiento  
Teléfono  
Correo electrónico  
Actividad/giro del negocio  
Antigüedad del negocio en años  
Calle domicilio titular  
Colonia domicilio titular  
Municipio domicilio titular  
Estado domicilio titular  
Código postal domicilio titular  
Calle domicilio negocio  
Colonia domicilio negocio  
Municipio domicilio negocio  
Estado domicilio negocio  
Código postal domicilio negocio  

## Validaciones Persona Física

Nombre requerido  
Primer apellido requerido  
RFC requerido  
CURP requerido  
Teléfono requerido  
Correo requerido  
Domicilio titular requerido  
Domicilio negocio requerido  

Validaciones de formato:

RFC: formato básico  
CURP: formato básico  
Teléfono: 10 dígitos  
Correo: formato email  
Código postal: 5 dígitos  

## Campos para Persona Moral

Razón social  
Nombre comercial  
RFC empresa  
Giro  
Fecha de constitución  
Antigüedad de empresa en años  
Calle domicilio empresa  
Colonia domicilio empresa  
Municipio domicilio empresa  
Estado domicilio empresa  
Código postal domicilio empresa  
Nombre representante legal  
RFC representante legal  
CURP representante legal  
Teléfono representante legal  
Correo representante legal  

## Validaciones Persona Moral

Razón social requerida  
RFC empresa requerido  
Giro requerido  
Domicilio empresa requerido  
Nombre representante legal requerido  
RFC representante legal requerido  
CURP representante legal requerida  
Teléfono representante legal requerido  
Correo representante legal requerido  

Validaciones de formato:

RFC: formato básico  
CURP: formato básico  
Teléfono: 10 dígitos  
Correo: formato email  
Código postal: 5 dígitos  

## Paso 3 — Información financiera

## Objetivo

Capturar datos financieros mínimos para mostrar análisis y decisión.

## Campos para Persona Física

Ingresos promedio mensuales  
Ventas promedio mensuales  
Antigüedad del negocio  
Monto solicitado  

## Campos para Persona Moral con hit Buró

Ingresos promedio mensuales  
Ventas anuales  
Activo total  
Pasivo total  
Utilidad operativa anual  
Antigüedad de empresa  
Monto solicitado  

## Campos para Persona Moral sin hit Buró

Ingresos promedio mensuales  
Ventas anuales  
Saldo promedio bancario  
Antigüedad cuenta bancaria en meses  
Activo circulante  
Pasivo circulante  
Activo total  
Pasivo total  
Utilidad operativa anual  
Monto solicitado  

## Validaciones

Los montos deben ser numéricos.  
Los montos no deben ser negativos.  
El monto solicitado debe ser mayor a 0.  
Antigüedad no debe ser negativa.  
Para Persona Moral sin hit Buró, saldo promedio y antigüedad bancaria deben ser requeridos.  

## Paso 4 — Documentos

## Objetivo

Mostrar documentos requeridos y permitir simular carga.

## Componente

DocumentChecklist

## Comportamiento

Mostrar documentos según tipo de persona.  
Cada documento debe tener estado inicial pendiente.  
Cada documento debe permitir acción "Simular carga".  
Al simular carga, cambiar estado a cargado.  

Permitir cambiar manualmente a:

pendiente  
cargado  
en revisión  
validado  
rechazado  

Si se marca rechazado, permitir comentario.

## Documentos para Persona Física

INE titular  
CURP  
Constancia de Situación Fiscal  
Comprobante domicilio titular  
Comprobante domicilio negocio  
Estados de cuenta bancarios  
Opinión positiva SAT  
Garantía  
INE aval  
Comprobante domicilio aval  

## Documentos para Persona Moral

INE representante legal  
Constancia de Situación Fiscal  
Comprobante domicilio empresa  
Comprobante domicilio representante legal  
Estados de cuenta bancarios  
Estados financieros  
Declaración anual  
Poder representante legal  
Acta constitutiva  
Opinión positiva SAT  
Garantía  
INE aval  
Comprobante domicilio aval  

## Validaciones del paso documentos

No bloquear el avance por documentos pendientes.  
Mostrar advertencia si faltan documentos requeridos.  
Permitir continuar para efectos demo.  
En el paso final, la decisión debe considerar si faltan documentos.  

## Paso 5 — Revisión y simulación

## Objetivo

Mostrar resumen de captura y permitir crear la solicitud.

## Debe mostrar

Tipo de solicitud.  
Cliente/prospecto.  
Monto solicitado.  
Datos principales.  
Documentos cargados.  
Documentos pendientes.  
Advertencias.  
Botón "Crear solicitud demo".  

## Acción final

Al hacer clic en "Crear solicitud demo":

Generar id.  
Generar folio.  
Crear objeto Application.  
Inicializar documentos.  
Inicializar validaciones.  
Inicializar timeline.  
Guardar en mock store.  
Redirigir a /solicitudes/:id.  

## Estado inicial de solicitud creada

```ts
status: "captura_datos"
decision: "pendiente"
assignedCreditLine: null
bureauScore: null
finalScore: null
riskLevel: "no_aplica"
```

## Validaciones globales del wizard

El botón "Siguiente" debe validar el paso actual.

El botón "Anterior" debe regresar sin perder información.

El wizard debe conservar estado entre pasos mientras el usuario no abandone la página.

## UX requerida

Mostrar stepper visual.  
Mostrar título y descripción de cada paso.  
Mostrar botones:  
Anterior  
Siguiente  
Crear solicitud demo  
Mostrar errores debajo del campo.  
Mostrar resumen antes de crear.  
Evitar formularios demasiado largos sin secciones.  

## Datos generados automáticamente

Folio  
ID  
Fecha creación  
Fecha actualización  
Ejecutivo demo  
Timeline inicial  
Validaciones iniciales  
Documentos iniciales  

## Criterios de aceptación

El wizard tiene 5 pasos.  
Permite elegir los 3 escenarios.  
Cambia campos según escenario.  
Cambia documentos según tipo de persona.  
Valida campos requeridos.  
Permite simular carga de documentos.  
Muestra resumen final.  
Crea solicitud mock.  
Redirige al detalle.  
No depende de backend real.
```
