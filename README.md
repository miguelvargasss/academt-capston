# FrontendKellyAcademy

## Configuración pública de la API

El archivo `public/runtime-config.js` se copia al resultado de compilación como
`runtime-config.js`. Para un despliegue con la API en otro origen, configura por ejemplo
`window.__KELLY_CONFIG__ = { apiUrl: 'https://api.ejemplo.com' };` en ese archivo.
El valor es público: nunca incluyas contraseñas ni claves. Debe ser un origen sin ruta,
consulta ni fragmento; si el frontend usa HTTPS, la API también debe usar HTTPS.
En un servidor propio se puede sustituir el archivo publicado; en Vercel el cambio
requiere una nueva publicación del archivo estático.

Sin configuración, en desarrollo local se usa `http://localhost:8080`. En un dominio
remoto se usa `https://kelly-academy-backend.onrender.com`. Configura CORS en el backend
con el origen exacto que Vercel asigne al frontend y
sirve `runtime-config.js` sin caché para que los cambios lleguen a los navegadores.
La referencia pública de archivos del backend (`APP_PUBLIC_URL`) debe coincidir con
el origen configurado para la API. Las referencias privadas antiguas de
`http://localhost:8080` se resuelven contra el origen actual; referencias persistidas
con otros orígenes pueden necesitar una migración de datos planificada.

### Despliegue en Vercel

El archivo `vercel.json` publica el directorio `dist/frontend.kellyAcademy/browser`
y dirige las rutas de la aplicación a `index.csr.html` para que funcionen los enlaces
directos ([configuración de Vercel](https://vercel.com/docs/project-configuration/vercel-json)).
La página de login prerenderizada y los recursos generados se sirven como
archivos estáticos; la aplicación no requiere un servidor Node para estas rutas.
Configura el proyecto con la raíz del repositorio frontend y ejecuta `npm run build`.
Una vez que Vercel asigne el dominio, agrega su origen exacto a
`APP_CORS_ALLOWED_ORIGINS` en Render y comprueba login, navegación y archivos.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.26.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
