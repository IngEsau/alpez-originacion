---

## `specs/11-acceptance-criteria.spec.md`

```markdown
# 11 — Acceptance Criteria Spec

## 1. Objetivo

Definir los criterios finales para considerar el MVP ALPEZ listo para demo.

---

# 2. Criterios globales

## 2.1 Funcionalidad

El MVP debe permitir:

1. Entrar al sistema mediante login demo.
2. Navegar al dashboard.
3. Ver métricas mock.
4. Ver solicitudes mock.
5. Filtrar solicitudes.
6. Crear una solicitud nueva.
7. Ver el detalle de una solicitud.
8. Ver documentos requeridos.
9. Simular carga de documentos.
10. Ejecutar validaciones simuladas.
11. Ejecutar modelo de decisión.
12. Mostrar resultado aprobado, rechazado u observado.
13. Ver timeline de la solicitud.

---

# 3. Criterios por pantalla

## 3.1 Login

Debe cumplir:

1. Renderiza en `/login`.
2. Muestra nombre ALPEZ.
3. Muestra formulario simple.
4. Permite entrar con cualquier dato.
5. Crea sesión demo.
6. Redirige a `/dashboard`.

---

## 3.2 Dashboard

Debe cumplir:

1. Renderiza en `/dashboard`.
2. Muestra total de solicitudes.
3. Muestra solicitudes en validación.
4. Muestra documentos pendientes.
5. Muestra aprobadas.
6. Muestra rechazadas.
7. Muestra embudo o distribución por estado.
8. Muestra solicitudes recientes.
9. Permite navegar a nueva solicitud.
10. Permite navegar a bandeja de solicitudes.

---

## 3.3 Bandeja de solicitudes

Debe cumplir:

1. Renderiza en `/solicitudes`.
2. Muestra tabla/listado de solicitudes.
3. Muestra folio.
4. Muestra cliente.
5. Muestra tipo persona.
6. Muestra escenario.
7. Muestra estado.
8. Muestra decisión.
9. Muestra score.
10. Muestra monto solicitado.
11. Muestra línea asignada.
12. Permite buscar.
13. Permite filtrar por estado.
14. Permite filtrar por tipo persona.
15. Permite filtrar por decisión.
16. Permite abrir detalle.
17. Permite ir a nueva solicitud.

---

## 3.4 Nueva solicitud

Debe cumplir:

1. Renderiza en `/solicitudes/nueva`.
2. Muestra wizard de 5 pasos.
3. Permite seleccionar Persona Física con hit Buró.
4. Permite seleccionar Persona Moral con hit Buró.
5. Permite seleccionar Persona Moral sin hit Buró.
6. Adapta campos según escenario.
7. Adapta documentos según tipo de persona.
8. Valida campos requeridos.
9. Permite simular carga documental.
10. Muestra resumen final.
11. Crea solicitud mock.
12. Redirige al detalle de la solicitud creada.

---

## 3.5 Detalle de solicitud

Debe cumplir:

1. Renderiza en `/solicitudes/:id`.
2. Muestra folio.
3. Muestra cliente/prospecto.
4. Muestra tipo persona.
5. Muestra escenario.
6. Muestra estado.
7. Muestra decisión.
8. Muestra monto solicitado.
9. Muestra score.
10. Muestra riesgo.
11. Muestra línea asignada.
12. Muestra timeline.
13. Muestra checklist documental.
14. Muestra validaciones.
15. Muestra datos capturados.
16. Permite simular validación INE.
17. Permite simular consulta Buró.
18. Permite simular validación de listas.
19. Permite ejecutar modelo de decisión.
20. Actualiza visualmente la solicitud.

---

# 4. Criterios de datos mock

Debe existir mínimo:

```txt
8 solicitudes mock
```

Casos obligatorios:

1. Persona Física aprobada.
2. Persona Física rechazada por INE.
3. Persona Física con documentos pendientes.
4. Persona Física rechazada por score.
5. Persona Moral hit Buró aprobada.
6. Persona Moral hit Buró rechazada por score.
7. Persona Moral sin hit Buró pendiente.
8. Persona Moral sin hit Buró aprobada.

# 5. Criterios de reglas de decisión

## 5.1 Persona Física

Debe cumplir:

1. Score menor a 630 rechaza.
2. Score 630-649 asigna $10,000 y riesgo alto.
3. Score 650-669 asigna $20,000 y riesgo medio.
4. Score 670-689 asigna $30,000 y riesgo medio.
5. Score 690-719 asigna $40,000 y riesgo bajo.
6. Score mayor a 720 asigna $60,000 y riesgo bajo.

## 5.2 Persona Moral con hit Buró

Debe cumplir:

1. Score menor o igual a 499 rechaza.
2. Score 500-549 asigna $10,000 y riesgo alto.
3. Score 550-599 asigna $20,000 y riesgo medio.
4. Score 600-649 asigna $30,000 y riesgo medio.
5. Score 650-699 asigna $40,000 y riesgo bajo.
6. Score mayor a 700 asigna $60,000 y riesgo bajo.

## 5.3 Persona Moral sin hit Buró

Debe cumplir:

1. Si faltan documentos, mostrar observación.
2. Si finalScore menor a 65, rechazar.
3. Si finalScore mayor o igual a 65, aprobar.
4. Si aprueba, asignar línea según rango.
5. Mostrar score final.

# 6. Criterios técnicos

Debe cumplir:

1. Proyecto en React.
2. Proyecto en TypeScript.
3. Proyecto creado con Vite.
4. Rutas con React Router.
5. Estilos con Tailwind CSS.
6. Íconos con Lucide React.
7. Código organizado por features.
8. Mocks aislados.
9. Servicios mock consumidos desde services.
10. Componentes reutilizables en shared.
11. Tipos TypeScript definidos.
12. No hay lógica mock hardcodeada dentro de componentes visuales.
13. No hay llamadas HTTP reales.
14. No hay backend.
15. No hay dependencias innecesarias.
16. `npm install` funciona.
17. `npm run dev` levanta la app.
18. No hay errores TypeScript.
19. No hay errores de build.
20. La app corre localmente.

# 7. Criterios visuales

Debe cumplir:

1. Layout con sidebar.
2. Header superior.
3. Cards de métricas.
4. Badges por estado.
5. Tablas limpias.
6. Formularios ordenados.
7. Timeline legible.
8. Checklist documental claro.
9. Paneles de validación claros.
10. Feedback visual de loading.
11. Feedback visual de empty states.
12. Feedback visual de errores.
13. Diseño profesional para demo.
14. Responsive básico.
15. Sin saturación visual.

# 8. Criterios de exclusión

No debe existir:

1. Backend PHP implementado.
2. Base de datos.
3. Login real.
4. JWT.
5. Consulta real Buró.
6. Validación real INE.
7. OCR real.
8. SAT real.
9. SMS real.
10. Firma real.
11. Motor de crédito productivo.
12. Integraciones externas.

# 9. Definition of Done

El MVP se considera terminado cuando:

1. Se puede hacer una demo completa de inicio a fin.
2. Hay al menos 8 casos mock.
3. Se puede crear una solicitud nueva.
4. Se puede abrir su detalle.
5. Se pueden ejecutar validaciones simuladas.
6. Se puede ejecutar decisión simulada.
7. La UI se ve profesional.
8. El código está listo para sustituir mocks por API.
9. El proyecto corre sin errores.
10. El alcance no incluye funcionalidades fuera del MVP.
```
