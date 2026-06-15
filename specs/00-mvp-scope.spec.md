# 00 — MVP Scope Spec

## Proyecto

ALPEZ — MVP Frontend de Originación

## Objetivo del MVP

Construir una aplicación frontend tipo demo para presentar un flujo operativo de originación de solicitudes.

El MVP debe permitir visualizar, capturar, revisar y simular el avance de solicitudes de originación sin depender de backend real, servicios externos, base de datos, Buró real, OCR real ni validación oficial de INE.

## Fecha objetivo de presentación

Martes 16 de junio.

## Alcance funcional del MVP

El frontend debe incluir:

1. Login demo.
2. Dashboard operativo.
3. Bandeja/listado de solicitudes.
4. Creación de nueva solicitud mediante wizard.
5. Captura de datos para Persona Física.
6. Captura de datos para Persona Moral.
7. Flujo diferenciado para:
   - Persona Física con hit Buró.
   - Persona Moral con hit Buró.
   - Persona Moral sin hit Buró.
8. Checklist documental.
9. Simulación de carga de documentos.
10. Simulación de validación de INE.
11. Simulación de validación de knockouts.
12. Simulación de cliente existente.
13. Simulación de envío/captura SMS.
14. Simulación de consulta Buró.
15. Simulación de validación de listas.
16. Simulación de modelo de decisión.
17. Visualización de score, riesgo y línea asignada.
18. Vista detalle 360 de cada solicitud.
19. Timeline de avance de la solicitud.
20. Estados visuales de aprobación, rechazo, pendiente y observación.

## Objetivo visual

La aplicación debe sentirse como un dashboard profesional de operación financiera:

- Clara.
- Ejecutiva.
- Ordenada.
- Fácil de presentar.
- Con estados visibles.
- Con flujos entendibles.
- Con datos mock realistas.
- Preparada para conectar posteriormente a una API.

## Usuarios/roles del demo

Para este MVP se usarán roles simulados.

### Ejecutivo de originación

Puede:

- Ver dashboard.
- Consultar solicitudes.
- Crear solicitudes.
- Capturar información.
- Cargar documentos simulados.
- Ejecutar validaciones simuladas.
- Consultar resultado.

### Analista de crédito

Puede:

- Revisar solicitudes.
- Ver documentos.
- Ver validaciones.
- Ver score.
- Ver decisión simulada.
- Cambiar estado documental simulado.

### Administrador/demo

Puede:

- Acceder a todo.
- Ver todos los casos mock.
- Presentar escenarios aprobados y rechazados.

## Tipos de solicitud soportados

### Persona Física con hit Buró

Debe mostrar:

- Datos personales.
- Datos de negocio.
- Documentos de titular.
- Documentos de aval.
- Consulta Buró simulada.
- Score Buró.
- Línea asignada por rango.

### Persona Moral con hit Buró

Debe mostrar:

- Datos de empresa.
- Datos del representante legal.
- Documentos empresariales.
- Documentos del representante legal.
- Documentos de aval.
- Consulta Buró simulada.
- Score Buró.
- Línea asignada por rango.

### Persona Moral sin hit Buró

Debe mostrar:

- Datos de empresa.
- Datos del representante legal.
- Documentos empresariales.
- Indicadores financieros simulados.
- Modelo de decisión simulado basado en KPIs.
- Resultado aprobado/rechazado/documentos pendientes.

## Fuera de alcance

No implementar en este MVP:

1. Backend real.
2. Base de datos real.
3. Autenticación real.
4. Roles reales.
5. Permisos reales.
6. Consulta real a Buró.
7. OCR real.
8. Validación real de INE.
9. Validación real contra padrón.
10. Validación real SAT.
11. Validación real CURP.
12. Validación real de listas negras.
13. Integración con firma electrónica.
14. Generación real de contratos.
15. Motor real de crédito.
16. Cálculo financiero legalmente válido.
17. Persistencia en servidor.
18. Carga real de archivos a servidor.
19. Notificaciones SMS reales.
20. Integración con WhatsApp, correo o servicios externos.

## Decisiones obligatorias para no bloquear el MVP

Cuando falte información documental, se tomarán estas decisiones:

1. Toda validación externa se simula.
2. Todo archivo cargado se representa como objeto mock.
3. Toda decisión crediticia usa reglas demo explícitas.
4. Los endpoints se definen como contratos esperados, no como servicios reales.
5. La app debe funcionar localmente con `npm install` y `npm run dev`.
6. Los mocks deben estar aislados para poder sustituirse después por API real.
7. No se implementará Redux salvo necesidad evidente.
8. El estado puede manejarse con React state, hooks y servicios mock.
9. Las pantallas deben priorizar presentación y navegación antes que lógica compleja.
10. Los componentes deben ser reutilizables pero sin sobreingeniería.

## Criterio de éxito del MVP

El MVP está completo cuando se pueda hacer una demo donde:

1. El usuario entra al login demo.
2. Accede al dashboard.
3. Ve métricas operativas.
4. Consulta una bandeja de solicitudes.
5. Crea una nueva solicitud.
6. Selecciona tipo de persona.
7. Captura información básica.
8. Carga documentos simulados.
9. Ejecuta validaciones simuladas.
10. Ve una decisión final simulada.
11. Abre el detalle de una solicitud.
12. Presenta timeline, documentos, score, riesgo, línea y estado.

## Prioridad de construcción

### Prioridad 1 — Imprescindible

- Layout principal.
- Dashboard.
- Bandeja de solicitudes.
- Wizard nueva solicitud.
- Detalle de solicitud.
- Mocks.
- Validaciones simuladas.
- Reglas de decisión demo.

### Prioridad 2 — Deseable

- Timeline visual avanzado.
- Animaciones suaves.
- Filtros más completos.
- Kanban por estado.
- Modo oscuro.
- Exportación visual simulada.

### Prioridad 3 — Fuera del MVP

- Integraciones reales.
- Backend.
- Motor de crédito real.
- Autenticación productiva.
- Firma contractual real.
