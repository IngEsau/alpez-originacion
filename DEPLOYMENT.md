# Despliegue del frontend ALPEZ

## Modelo de ramas

- `main`: codigo fuente de React, pruebas y configuracion de compilacion.
- `deploy`: contenido compilado de `dist/` colocado directamente en la raiz de la rama.

Cada push a `main` ejecuta `.github/workflows/publish-deploy.yml`. El workflow valida TypeScript, ejecuta las pruebas, genera el build y crea un commit de despliegue con historial lineal en `deploy`.

## Variables del build

El workflow acepta estas variables del repositorio en GitHub:

- `VITE_API_BASE_URL`
- `VITE_USE_REAL_API`
- `VITE_API_FALLBACK_TO_MOCK`
- `VITE_DEMO_MODE`

Se configuran en `Settings > Secrets and variables > Actions > Variables`. Mientras no se definan, el workflow usa el endpoint actual y estos valores seguros para el despliegue:

```env
VITE_API_BASE_URL=https://dev.alpez.lercomx.com/web
VITE_USE_REAL_API=true
VITE_API_FALLBACK_TO_MOCK=false
VITE_DEMO_MODE=false
```

## Configuracion inicial del servidor

La carpeta publica es:

```text
/home/wwlerc/dev.alpez-originacion.lercomx.com
```

La carpeta `.well-known` existente debe conservarse. Para vincular el webroot con la rama de artefactos:

```bash
ssh wwlerc@lercomx.com -p 22022
cd /home/wwlerc/dev.alpez-originacion.lercomx.com
git init
git remote add origin https://github.com/IngEsau/alpez-originacion.git
git fetch origin deploy
git checkout -b deploy --track origin/deploy
```

Los archivos `index.html`, `assets/`, logos y `.htaccess` quedan directamente en el webroot. No se crea una carpeta `dist` en el servidor.

## Publicar una version nueva

1. Crear el commit correspondiente en `main` y hacer push.
2. Esperar a que termine correctamente el workflow `Publicar frontend en deploy`.
3. Actualizar el servidor:

```bash
ssh wwlerc@lercomx.com -p 22022
cd /home/wwlerc/dev.alpez-originacion.lercomx.com
git pull --ff-only
```

El ultimo comando descarga unicamente el build que ya fue validado y generado en GitHub.
