---

## `specs/10-ui-system.spec.md`

```markdown
# 10 — UI System Spec

## 1. Objetivo

Definir el sistema visual mínimo para construir una interfaz profesional, limpia y presentable para el MVP ALPEZ.

## 2. Principios visuales

La interfaz debe sentirse:

```txt
Profesional
Financiera
Operativa
Limpia
Clara
Confiable
Moderna
No saturada
```

## 3. Estilo general

Usar una estética tipo dashboard corporativo:

1. Fondo claro.
2. Cards blancas.
3. Bordes suaves.
4. Sombras sutiles.
5. Tipografía legible.
6. Estados con badges.
7. Espaciado amplio.
8. Íconos simples.
9. Tablas limpias.
10. Formularios ordenados.

## 4. Paleta sugerida

### 4.1 Colores base

```txt
Background: #F6F8FB
Surface: #FFFFFF
Surface muted: #F1F5F9
Border: #E2E8F0
Text primary: #0F172A
Text secondary: #64748B
```

### 4.2 Color principal

```txt
Primary: #0F4C81
Primary hover: #0B3A63
Primary soft: #E6F0FA
```

### 4.3 Estados

```txt
Success: #16A34A
Success soft: #DCFCE7

Warning: #D97706
Warning soft: #FEF3C7

Danger: #DC2626
Danger soft: #FEE2E2

Info: #2563EB
Info soft: #DBEAFE

Neutral: #64748B
Neutral soft: #F1F5F9
```

## 5. Tipografía

Usar fuente del sistema o Inter si se instala.

```css
font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

### 5.1 Tamaños

```txt
Display: 32px / 40px / 700
H1: 28px / 36px / 700
H2: 24px / 32px / 700
H3: 20px / 28px / 600
Body: 14px / 22px / 400
Body strong: 14px / 22px / 600
Small: 12px / 18px / 400
Label: 13px / 18px / 600
```

## 6. Espaciado

Usar escala Tailwind estándar.

```txt
4px
8px
12px
16px
20px
24px
32px
40px
48px
```

## 7. Bordes

```txt
Card radius: 16px
Input radius: 10px
Button radius: 10px
Badge radius: 999px
```

## 8. Sombras

Usar sombras suaves.

```txt
Card shadow: shadow-sm
Dropdown shadow: shadow-lg
Modal shadow: shadow-xl
```

No usar sombras pesadas.

## 9. Componentes compartidos requeridos

1. Button
2. Card
3. Input
4. Select
5. Textarea
6. Badge
7. Modal
8. EmptyState
9. PageHeader
10. SectionHeader
11. MetricCard
12. StatusBadge
13. Tabs
14. Skeleton

## 10. Button

### 10.1 Variantes

1. primary
2. secondary
3. outline
4. ghost
5. danger

### 10.2 Tamaños

1. sm
2. md
3. lg

### 10.3 Estados

1. default
2. hover
3. disabled
4. loading

## 11. Card

Debe aceptar:

1. title
2. description
3. children
4. actions

Uso:

1. Métricas.
2. Documentos.
3. Validaciones.
4. Secciones de detalle.
5. Formularios.

## 12. Input

Debe soportar:

1. label
2. placeholder
3. value
4. error
5. helperText
6. required
7. disabled

## 13. Select

Debe soportar:

1. label
2. options
3. value
4. error
5. placeholder
6. required

## 14. Badge

Usos:

1. Estado de solicitud
2. Decisión
3. Tipo de persona
4. Escenario
5. Documento
6. Validación
7. Riesgo

## 15. StatusBadge

Debe mapear estados a colores.

### 15.1 Solicitudes

```txt
nueva => neutral
captura_datos => info
validacion_ine => info
documentos_pendientes => warning
documentos_revision => warning
sms_pendiente => warning
consulta_buro => info
validacion_listas => info
modelo_decision => info
analisis_credito => warning
investigacion_legal => info
contratos => success
aprobada => success
rechazada => danger
```

### 15.2 Documentos

```txt
pendiente => neutral
cargado => info
en_revision => warning
validado => success
rechazado => danger
```

### 15.3 Validaciones

```txt
pendiente => neutral
procesando => info
aprobado => success
rechazado => danger
observado => warning
```

## 16. Layout

### 16.1 Sidebar

Ancho desktop:

```txt
260px
```

Debe incluir:

1. Logo ALPEZ
2. Navegación
3. Ambiente Demo

### 16.2 Header

Altura sugerida:

```txt
64px
```

Debe incluir:

1. Título de página
2. Usuario demo
3. Acciones contextuales

### 16.3 Main content

Padding:

```txt
24px desktop
16px mobile
```

## 17. Responsive

### 17.1 Desktop

Prioridad principal.

```txt
>= 1024px
```

### 17.2 Tablet

Debe verse usable.

```txt
768px - 1023px
```

### 17.3 Mobile

Debe ser aceptable, no perfecto.

```txt
< 768px
```

En mobile:

1. Sidebar puede ocultarse.
2. Tablas pueden convertirse en cards.
3. Cards deben apilarse.
4. Formularios deben usar una columna.

## 18. Formularios

### 18.1 Reglas

1. Agrupar campos por sección.
2. No mostrar más de 2 columnas en desktop.
3. En mobile usar 1 columna.
4. Mostrar errores cerca del campo.
5. Usar labels claros.
6. Evitar campos innecesarios.

## 19. Tablas

### 19.1 Reglas

1. Header claro.
2. Filas con hover sutil.
3. Acción visible.
4. Badges compactos.
5. Texto truncado si es largo.
6. En mobile usar cards o scroll horizontal.

## 20. Timeline

Debe mostrar:

1. Ícono/indicador
2. Título
3. Descripción
4. Fecha
5. Actor

Estados completados deben verse diferentes a pendientes.

## 21. Loading states

Usar:

1. Skeleton cards
2. Skeleton table rows
3. Botones loading

No dejar pantallas vacías sin feedback.

## 22. Empty states

Formato:

1. Título
2. Descripción breve
3. Acción sugerida

Ejemplo:

```txt
No hay solicitudes registradas.
Crea una nueva solicitud para iniciar el flujo de originación.
Crear solicitud
```

## 23. Iconografía

Usar Lucide React.

Iconos sugeridos:

1. LayoutDashboard
2. FileText
3. Users
4. Building2
5. User
6. ShieldCheck
7. ClipboardCheck
8. AlertTriangle
9. CheckCircle2
10. XCircle
11. Clock
12. Upload
13. Search
14. Filter
15. Plus
16. ArrowRight

## 24. Criterios de aceptación

1. La interfaz se ve profesional.
2. Usa layout con sidebar y header.
3. Usa componentes compartidos.
4. Usa badges consistentes.
5. Los estados son fáciles de identificar.
6. Los formularios son claros.
7. Las tablas son legibles.
8. El dashboard se ve presentable.
9. El detalle de solicitud se entiende sin explicación técnica.
10. No hay estilos improvisados duplicados en cada página.
```
