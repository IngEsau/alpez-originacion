---

## `specs/04-applications-list.spec.md`

```markdown
# 04 — Applications List Spec

## Objetivo

Crear la bandeja operativa de solicitudes para consultar, filtrar y abrir solicitudes de originación.

## Ruta

```txt
/solicitudes
```

## Página

ApplicationsPage

## Componentes requeridos

ApplicationsTable  
ApplicationFilters  
ApplicationStatusBadge  
ApplicationDecisionBadge  
ApplicationScenarioBadge  
ApplicationsEmptyState  

## Encabezado de página

### Título

Solicitudes

### Subtítulo

Consulta y seguimiento de solicitudes de originación

### Acción principal

Nueva solicitud

### Ruta

```txt
/solicitudes/nueva
```

## Tabla de solicitudes

### Columnas requeridas

Folio  
Cliente / Prospecto  
Tipo persona  
Escenario  
Estado  
Decisión  
Score  
Monto solicitado  
Línea asignada  
Ejecutivo  
Fecha creación  
Acciones  

## Campo: Folio

Ejemplo:

```txt
ALP-000123
```

Debe ser clicable o tener acción para abrir detalle.

## Campo: Cliente / Prospecto

Para Persona Física:

Nombre completo

Para Persona Moral:

Razón social

## Campo: Tipo persona

Valores visibles:

Persona Física  
Persona Moral  

## Campo: Escenario

Valores visibles:

PF · Hit Buró  
PM · Hit Buró  
PM · Sin hit Buró  

## Campo: Estado

Usar badge.

Mapeo visible:

nueva => Nueva  
captura_datos => Captura de datos  
validacion_ine => Validación INE  
documentos_pendientes => Documentos pendientes  
documentos_revision => Documentos en revisión  
sms_pendiente => SMS pendiente  
consulta_buro => Consulta Buró  
validacion_listas => Validación listas  
modelo_decision => Modelo decisión  
analisis_credito => Análisis crédito  
investigacion_legal => Investigación legal  
contratos => Contratos  
aprobada => Aprobada  
rechazada => Rechazada  

## Campo: Decisión

Valores:

Pendiente  
Aprobada  
Rechazada  
Observada  

## Campo: Score

Si existe score Buró:

```txt
680
```

Si no existe y hay score final:

```txt
Score final: 72
```

Si no existe:

```txt
N/A
```

## Campo: Monto solicitado

Formato:

```txt
$50,000 MXN
```

## Campo: Línea asignada

Si existe:

```txt
$30,000 MXN
```

Si no existe:

```txt
Pendiente
```

## Acciones por fila

Cada fila debe incluir:

Ver detalle

Ruta:

```txt
/solicitudes/:id
```

Opcional:

Continuar flujo

Debe llevar al mismo detalle.

## Filtros requeridos

## Búsqueda general

Campo:

```txt
Buscar por folio, cliente o RFC
```

Debe filtrar localmente.

## Estado

Select con:

Todos  
Nueva  
Captura de datos  
Validación INE  
Documentos pendientes  
Documentos en revisión  
SMS pendiente  
Consulta Buró  
Validación listas  
Modelo decisión  
Análisis crédito  
Investigación legal  
Contratos  
Aprobada  
Rechazada  

## Tipo persona

Select con:

Todos  
Persona Física  
Persona Moral  

## Decisión

Select con:

Todas  
Pendiente  
Aprobada  
Rechazada  
Observada  

## Escenario

Select con:

Todos  
PF · Hit Buró  
PM · Hit Buró  
PM · Sin hit Buró  

## Ordenamiento

Deseable pero no obligatorio.

Si se implementa, soportar:

Fecha creación descendente  
Fecha creación ascendente  
Monto solicitado mayor  
Monto solicitado menor  
Score mayor  
Score menor  

## Datos requeridos del servicio

Usar:

```ts
getApplications(filters?: ApplicationFilters): Promise<Application[]>
```

Tipo esperado:

```ts
export interface ApplicationFilters {
  search?: string;
  status?: ApplicationStatus | "todos";
  personType?: PersonType | "todos";
  decision?: ApplicationDecision | "todas";
  scenario?: ApplicationScenario | "todos";
}
```

## Estado empty

Si no hay resultados:

```txt
No se encontraron solicitudes con los filtros seleccionados.
```

Acción:

Limpiar filtros

Si no hay ninguna solicitud mock:

```txt
Aún no hay solicitudes registradas.
```

Acción:

Crear nueva solicitud

## Estado loading

Mostrar skeleton de tabla o mensaje:

```txt
Cargando solicitudes...
```

## Estado error

Mostrar:

```txt
No se pudieron cargar las solicitudes demo.
```

Acción:

Reintentar

## Reglas UI

La tabla debe ser clara en desktop.  
En mobile puede convertirse en cards.  
Los filtros deben estar arriba de la tabla.  
El botón "Nueva solicitud" debe estar visible.  
Los badges deben permitir identificar rápidamente el estado.  
No usar tablas saturadas con texto excesivo.  
Los montos deben estar alineados de forma legible.  
La acción de detalle debe ser evidente.  

## Criterios de aceptación

La página muestra solicitudes mock.  
La tabla contiene todas las columnas requeridas.  
La búsqueda filtra por folio, cliente o RFC.  
El filtro por estado funciona.  
El filtro por tipo persona funciona.  
El filtro por decisión funciona.  
El filtro por escenario funciona.  
El botón "Nueva solicitud" navega correctamente.  
Cada fila permite abrir el detalle. 
La página no depende de backend real.
```
