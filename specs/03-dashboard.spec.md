---

## `specs/03-dashboard.spec.md`

```markdown
# 03 — Dashboard Spec

## Objetivo

Crear una pantalla ejecutiva que muestre el estado general de la operación de originación usando datos mock.

La pantalla debe servir como entrada principal para presentar el sistema.

## Ruta

```txt
/dashboard

## Página

DashboardPage

## Componentes requeridos

DashboardMetricCard
ApplicationsFunnel
RecentApplicationsTable
StatusDistribution
DashboardHeader

## Información requerida

El dashboard debe mostrar:

Total de solicitudes.
Solicitudes nuevas.
Solicitudes en validación.
Solicitudes con documentos pendientes.
Solicitudes aprobadas.
Solicitudes rechazadas.
Monto total solicitado.
Línea total asignada.
Distribución por estado.
Solicitudes recientes.

## Métricas principales

Cards requeridas:

Total de solicitudes

Debe mostrar:

- Número total.
- Icono.
- Texto descriptivo.
- En validación

Debe agrupar solicitudes con estados:

- validacion_ine
- sms_pendiente
- consulta_buro
- validacion_listas
- modelo_decision
- analisis_credito

## Documentos pendientes

Debe contar solicitudes con estado:

- documentos_pendientes
- documentos_revision

## Aprobadas

Debe contar:

- aprobada
- contratos
- investigacion_legal

## Rechazadas

Debe contar:

- rechazada

## Embudo de originación

Debe mostrar visualmente el avance por etapas:

Nuevas
Captura
Validación INE
Documentos
Buró/Listas
Modelo decisión
Investigación legal
Contratos
Aprobadas/Rechazadas

Puede ser:

Barra horizontal.
Lista vertical con porcentajes.
Cards apiladas.
Gráfica simple hecha con divs.

No es obligatorio usar librería de gráficas.

## Tabla de solicitudes recientes

Columnas:

Folio
Cliente
Tipo
Estado
Score
Línea
Fecha
Acción

Acción:

Ver detalle

Debe navegar a:

/solicitudes/:id

## Distribución por escenario

Mostrar conteo de:

- Persona Física hit Buró
- Persona Moral hit Buró
- Persona Moral sin hit Buró

Puede representarse como:

- Cards pequeñas.
- Lista con barras.
- Donut simulado con CSS.
- Tabla simple.
- Header del dashboard

Debe incluir:

- Dashboard operativo
- Resumen general de solicitudes de originación

Acciones:

- Nueva solicitud
- Ver solicitudes

##  Datos requeridos del servicio

Usar:

```ts
getDashboardSummary(): Promise<DashboardSummary>


Respuesta esperada:

```ts
{
  totalApplications: number;
  newApplications: number;
  inValidation: number;
  pendingDocuments: number;
  approved: number;
  rejected: number;
  totalRequestedAmount: number;
  totalAssignedCreditLine: number;
  byStatus: Array<{ status: ApplicationStatus; count: number }>;
  byScenario: Array<{ scenario: ApplicationScenario; count: number }>;
  recentApplications: Application[];
}

## Estados visuales

Loading

Mostrar skeletons o cards con estado cargando.

## Empty

Si no hay solicitudes:

- Aún no hay solicitudes registradas

Acción:
Crear nueva solicitud

## Error

Si falla el mock service:

No se pudo cargar el dashboard demo

Acción:
Reintentar

## Reglas UI

1. El dashboard debe ser visualmente limpio.
2. No saturar con demasiadas métricas.
3. Los estados deben usar badges.
4. Los montos deben formatearse en MXN.
5. Las fechas deben mostrarse en formato legible.
6. Debe verse bien en laptop.
7. Debe ser aceptable en mobile, aunque la prioridad es desktop.

## Formatos

Dinero: $10,000 MXN
Fechas: 10 jun 2026
Score nulo: Si no hay score: N/A

## Criterios de aceptación

1. Dashboard carga desde datos mock.
2. Se muestran al menos 5 métricas principales.
3. Se muestra embudo o distribución por estado.
4. Se muestran solicitudes recientes.
5. El botón "Nueva solicitud" navega a /solicitudes/nueva.
6. El botón "Ver solicitudes" navega a /solicitudes.
7. Cada solicitud reciente permite abrir detalle.
8. La pantalla no depende de backend.
9. La pantalla usa componentes reutilizables.
10. El diseño es profesional y presentable.
