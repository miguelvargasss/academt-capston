# Pruebas de aceptación de Kelly Academy

Las pruebas de aceptación comprueban escenarios desde la perspectiva de quienes utilizan el sistema. La suite Cypress de este proyecto abre la aplicación Angular en un navegador y utiliza el backend Spring Boot y una base PostgreSQL temporales; las respuestas de la API no se simulan. El administrador usado para preparar los datos y las demás cuentas creadas durante las pruebas son sintéticos.

## Requisitos

- Node.js y npm compatibles con las versiones del proyecto, y Google Chrome.
- Docker Desktop iniciado y acceso a las imágenes y dependencias necesarias para construir el backend.
- Los puertos locales `14200` y `18080` disponibles.
- Los repositorios frontend y backend ubicados uno junto al otro, como en el proyecto actual.

## Ejecutar

Desde `backend.kellyacademy`, inicia el entorno de aceptación:

```bash
docker compose -f docker-compose.acceptance.yml up -d --build
```

En otra terminal, desde `frontend.kellyAcademy`, instala las dependencias e inicia Angular para la suite:

```bash
npm install --legacy-peer-deps
npm run start:acceptance
```

En una tercera terminal, también desde el frontend, ejecuta las pruebas sin interfaz:

```bash
npm run test:acceptance
```

Para abrir la interfaz de Cypress y observar o ejecutar los escenarios individualmente:

```bash
npm run test:acceptance:open
```

Al terminar, detén el servidor Angular con `Ctrl+C` y, desde el backend, detén el entorno temporal:

```bash
docker compose -f docker-compose.acceptance.yml down
```

La base de aceptación utiliza almacenamiento temporal: sus datos se pierden al detener el contenedor. No utiliza la base ni los volúmenes de desarrollo. La aplicación de prueba apunta a `127.0.0.1:18080`, y Cypress comprueba que el backend y la base coincidan con el entorno aislado antes de ejecutar. No uses credenciales ni datos reales. Las integraciones R2 y Cloudinary no están configuradas en este entorno.

## Escenarios iniciales

- **Acceso:** rechazar credenciales incorrectas y redirigir a quien no ha iniciado sesión.
- **Términos:** exigir al estudiante la aceptación de la versión vigente antes de permitir el uso de la API.
- **Biblioteca:** el docente publica un enlace, el estudiante lo consulta y ambos reciben restricciones para operaciones no autorizadas.
- **Administración:** un administrador elimina un recurso después de confirmar la acción.

Estos escenarios son una base, no cubren todos los criterios de los planes de sprint ni validan la carga de archivos o los proveedores reales. Conviene ampliarlos por flujos completos: gestión de usuarios, cursos y reordenamiento, matrículas y asistencia, mensajes y notificaciones, y agenda y tutorías. Las pruebas técnicas existentes de Angular y backend siguen siendo útiles para reglas y casos específicos.

Para la aceptación final, usa los criterios de `PLAN-ACEPTACION-SPRINTS.md` como lista de verificación: prepara datos de prueba, registra resultado y evidencia de cada escenario, y haz revisar los flujos por representantes de estudiantes, docentes y administración. Verifica por separado las integraciones de almacenamiento y despliegue en un entorno autorizado.
