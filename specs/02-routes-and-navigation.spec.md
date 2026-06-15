---

## `specs/02-routes-and-navigation.spec.md`

```markdown
# 02 — Routes and Navigation Spec

## Objetivo

Definir las rutas, navegación, layout y comportamiento general de la SPA del MVP ALPEZ.

## Tecnología esperada

Usar React Router.

## Rutas requeridas

```txt
/login
/dashboard
/solicitudes
/solicitudes/nueva
/solicitudes/:id

## Ruta inicial

La ruta raíz / debe redirigir a: /dashboard

Si se implementa login demo, / puede redirigir primero a /login.

## Rutas fuera de alcance

No crear todavía:

/admin
/configuracion
/usuarios
/reportes
/contratos
/auditoria
/api

Estas rutas no son necesarias para el MVP.


# Layouts

---

## AuthLayout

Usado en:

/login

Debe contener:

- Fondo limpio.
- Card centrada.
- Logo o nombre ALPEZ.
- Texto breve de demo.
- Formulario de acceso simulado.
- Botón para entrar.

## AppLayout

Usado en:

/dashboard
/solicitudes
/solicitudes/nueva
/solicitudes/:id

Debe contener:

- Sidebar lateral.
- Header superior.
- Área principal de contenido.
- Breadcrumb opcional.
- Contenedor con ancho fluido.
- Responsive básico.

## Sidebar

El sidebar debe incluir:

- Dashboard
- Solicitudes
- Nueva solicitud

Opcional:

- Validaciones
- Documentos

Pero si se agregan, deben apuntar a secciones internas o quedar visualmente deshabilitadas.

- Comportamiento del sidebar:

	- Debe marcar la ruta activa.
	- Debe mostrar íconos.
	- Debe ser colapsable solo si se puede implementar rápido.
	- En mobile debe ocultarse o convertirse en drawer simple.
	- No debe bloquear el avance del MVP.

## Header superior

Debe mostrar:

- Nombre de la sección actual.
- Usuario demo.
- Rol demo.
- Fecha o ambiente "Demo".
- Botón secundario opcional para crear solicitud.

Ejemplo:

- ALPEZ Originación | Ambiente Demo
- Usuario: Ejecutivo Demo

## Breadcrumbs

Deseable pero no obligatorio.

Ejemplo:

- Dashboard / Solicitudes / ALP-000123

## Navegación principal

Desde Login

Acción:
Entrar al demo

Resultado:
Navegar a /dashboard

No validar credenciales reales.

Desde Dashboard
Acciones:

- Ver solicitudes recientes.
- Clic en solicitud reciente.
- Ir a detalle /solicitudes/:id.
- Clic en "Nueva solicitud".
- Ir a /solicitudes/nueva.
- Clic en "Ver todas".
- Ir a /solicitudes.
- Desde Bandeja de Solicitudes

Acciones:

- Filtrar solicitudes.
- Buscar por folio o cliente.
- Abrir detalle.
- Crear nueva solicitud.
- Desde Nueva Solicitud

Acciones:

- Seleccionar escenario.
- Completar wizard.
- Simular creación.
- Redirigir al detalle de la solicitud creada.

Resultado esperado:

/solicitudes/:id
Desde Detalle de Solicitud

Acciones:

- Ver datos generales.
- Ver documentos.
- Ver validaciones.
- Ejecutar validaciones simuladas.
- Ejecutar modelo de decisión simulado.
- Regresar a bandeja.
- Cambiar estado documental simulado.
- Rutas y componentes:

/login
  Page: LoginPage
  Layout: AuthLayout

/dashboard
  Page: DashboardPage
  Layout: AppLayout

/solicitudes
  Page: ApplicationsPage
  Layout: AppLayout

/solicitudes/nueva
  Page: NewApplicationPage
  Layout: AppLayout

/solicitudes/:id
  Page: ApplicationDetailPage
  Layout: AppLayout

## Manejo de rutas inválidas

Crear una vista simple:

404 — Página no encontrada

Debe incluir botón:

Volver al dashboard
Protección de rutas

Para el MVP usar protección simulada.

Comportamiento aceptado:

Si no existe demoSession, redirigir a /login.
Si existe demoSession, permitir navegación.
El login crea demoSession en localStorage.
Logout elimina demoSession.

No implementar JWT, refresh tokens, cookies seguras ni backend.

## Navegación post-creación

Cuando se cree una solicitud desde el wizard:

- Crear objeto mock.
- Agregarlo al estado local o mock store.
- Mostrar mensaje de éxito.
- Redirigir a /solicitudes/:id.
- Estados de navegación

Cada página debe contemplar:

- Loading.
- Empty state.
- Error state simple.
- Content state.

Criterios de aceptación:

1. /login renderiza correctamente.
2. /dashboard renderiza dashboard.
3. /solicitudes renderiza tabla.
4. /solicitudes/nueva renderiza wizard.
5. /solicitudes/:id renderiza detalle.
6. Abrir una solicitud desde la tabla navega al detalle.
7. Crear una solicitud navega al detalle.
8. Una ruta inexistente muestra 404.
9. El layout mantiene sidebar y header.
10. No hay rutas que dependan de backend real.
