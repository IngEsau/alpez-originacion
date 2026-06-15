---

## `specs/06-application-detail.spec.md`

```markdown
# 06 — Application Detail Spec

## Objetivo

Crear una vista 360 de la solicitud donde se pueda revisar el avance, documentos, validaciones, decisión y datos capturados.

## Ruta

```txt
/solicitudes/:id
```

## Página

ApplicationDetailPage

## Componentes requeridos

ApplicationDetailHeader  
ApplicationSummaryCards  
ApplicationTimeline  
ApplicantInfoPanel  
DocumentChecklist  
ValidationPanel  
DecisionPanel  
ActivityTimeline  

## Header de solicitud

Debe mostrar:

Folio  
Nombre del cliente/prospecto  
Tipo persona  
Escenario  
Estado actual  
Decisión  
Fecha creación  
Ejecutivo asignado  

Acciones:

Volver a solicitudes  
Ejecutar siguiente validación  
Ejecutar modelo de decisión  

## Summary cards

Cards requeridas:

Monto solicitado  
Línea asignada  
Score Buró / Score final  
Nivel de riesgo  
Estado actual  
Documentos pendientes  

## Formato de cards

## Monto solicitado

```txt
$50,000 MXN
```

## Línea asignada

Si existe:

```txt
$30,000 MXN
```

Si no existe:

```txt
Pendiente
```

## Score

Si hay bureauScore:

```txt
680
```

Si hay finalScore:

```txt
72 / 100
```

Si no existe:

```txt
N/A
```

## Riesgo

Alto  
Medio  
Bajo  
No aplica  

## Tabs o secciones

La vista debe organizarse en secciones.

Opción recomendada:

Resumen  
Documentos  
Validaciones  
Datos capturados  
Actividad  

Si no se implementan tabs, usar cards verticales en la misma página.

## Sección: Resumen

Debe mostrar:

Estado general.  
Resultado de decisión.  
Motivo de rechazo si aplica.  
Próximo paso sugerido.  
Timeline de avance.  

## Sección: Timeline

Debe mostrar estados recorridos.

Ejemplo:

Nueva solicitud creada  
Captura de datos completada  
Validación INE pendiente  
Documentos pendientes  
Consulta Buró pendiente  
Modelo de decisión pendiente  

Cada evento debe mostrar:

Título  
Descripción  
Actor  
Fecha  
Estado  

## Sección: Documentos

Usar el componente:

DocumentChecklist

Debe permitir:

Ver documentos requeridos.  
Ver estado por documento.  
Simular carga.  
Cambiar estado.  
Agregar comentario cuando se rechaza.  

Mostrar contador:

requeridos  
cargados  
validados  
rechazados  
pendientes  

## Sección: Validaciones

Usar:

ValidationPanel

Debe incluir paneles para:

INE  
Knockouts  
Cliente existente  
SMS  
Buró  
Listas  
Documentos  
Modelo de decisión  
Investigación legal  
Contratos  

Cada validación debe mostrar:

Nombre  
Estado  
Resultado  
Detalle  
Botón ejecutar cuando aplique  

## Acciones de validación

## Ejecutar validación INE

Debe llamar:

```ts
runIneValidation(applicationId)
```

## Ejecutar validación de listas

Debe llamar:

```ts
runListsValidation(applicationId)
```

## Ejecutar consulta Buró

Debe llamar:

```ts
runBureauQuery(applicationId)
```

## Ejecutar modelo de decisión

Debe llamar:

```ts
runDecisionModel(applicationId)
```

## Sección: Datos capturados

Para Persona Física mostrar:

Nombre completo  
RFC  
CURP  
Teléfono  
Correo  
Domicilio titular  
Domicilio negocio  
Actividad  
Ingresos promedio  
Antigüedad negocio  

Para Persona Moral mostrar:

Razón social  
RFC empresa  
Giro  
Domicilio empresa  
Representante legal  
RFC representante  
CURP representante  
Teléfono representante  
Correo representante  
Ventas anuales  
Ingresos promedio  
Activos  
Pasivos  
Utilidad operativa  

## Sección: Actividad

Debe mostrar eventos simulados:

Solicitud creada  
Documento cargado  
Validación ejecutada  
Estado actualizado  
Modelo de decisión ejecutado  

## Próximo paso sugerido

El detalle debe mostrar una sugerencia basada en estado.

Mapeo:

nueva => Continuar captura de datos  
captura_datos => Validar INE  
validacion_ine => Solicitar documentos  
documentos_pendientes => Completar documentos requeridos  
documentos_revision => Revisar documentos cargados  
sms_pendiente => Enviar SMS  
consulta_buro => Consultar Buró  
validacion_listas => Validar listas  
modelo_decision => Ejecutar modelo de decisión  
analisis_credito => Revisar análisis de crédito  
investigacion_legal => Validar investigación legal  
contratos => Preparar firma de contratos  
aprobada => Solicitud aprobada  
rechazada => Revisar motivo de rechazo  

## Estados de carga

## Loading

```txt
Cargando solicitud...
```

## Not found

```txt
Solicitud no encontrada.
```

Acción:

Volver a solicitudes

## Error

```txt
No se pudo cargar la solicitud demo.
```

## Criterios de aceptación

La vista carga una solicitud por id.  
Muestra folio y datos principales.  
Muestra cards resumen.  
Muestra timeline.  
Muestra documentos.  
Muestra validaciones.  
Permite ejecutar validaciones simuladas.  
Permite ejecutar modelo de decisión.  
Muestra decisión y línea asignada.  
Muestra motivo de rechazo si aplica.  
Muestra datos capturados.  
No depende de backend real.
```
