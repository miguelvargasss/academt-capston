# Alcance y criterios de aceptación por sprint

Este documento reúne el alcance propuesto para las pruebas de aceptación del sistema Kelly Academy. Abarca el backend, el frontend y sus integraciones. Cada criterio describe un resultado esperado: **no indica que la funcionalidad esté implementada, probada o aprobada**.

La copia de este documento se encuentra tanto en el repositorio del backend como en el del frontend. Los cambios posteriores al alcance deben mantenerse sincronizados entre ambos.

## Preparación y registro de aceptación

- Utilizar un entorno aislado y datos de prueba, con usuarios de los roles necesarios y sin afectar información real.
- Registrar para cada criterio: identificador, versión evaluada, condiciones y datos utilizados, resultado observado, evidencia, responsable y fecha.
- Usar los estados **pendiente**, **aprobado**, **fallido** o **bloqueado**. Un criterio bloqueado debe indicar su causa; la existencia de código o de pruebas automáticas no equivale a aceptación.
- Acordar antes de la ejecución los valores que faltan: límites y ventanas de rate limiting, orígenes y proxies confiables, alcance de roles, navegadores, tamaño de página, cantidad N de mensajes y reglas de negocio de cada flujo.
- Una funcionalidad transversal debe verificarse desde el cliente y, cuando corresponda, directamente en la API y en la persistencia. Las configuraciones de infraestructura deben validarse en un entorno equivalente al despliegue previsto.

---

## Sprint 1: Infraestructura Backend, Seguridad y Entorno de Pruebas

**Lógica:** Antes de desarrollar funcionalidades, se establece la base del backend, las reglas perimetrales para evitar bloqueos del cliente y un entorno de testing robusto.

### 1.1. Configuración de CORS y forward-headers-strategy

**Ámbito:** Backend e infraestructura; integración con frontend.

**Criterios de aceptación:**

- Una petición y su preflight desde un origen autorizado reciben las cabeceras CORS acordadas y permiten al navegador consumir la API.
- Un origen no autorizado no recibe autorización CORS. Los métodos, cabeceras y credenciales permitidos corresponden a la configuración aprobada.
- Detrás de un proxy confiable, la aplicación interpreta correctamente el esquema y host originales sin confiar en cabeceras de origen no verificado.

### 1.2. Auditoría de IP real detrás de Cloudflare/Render

**Ámbito:** Backend e infraestructura.

**Criterios de aceptación:**

- Una operación auditable realizada a través de la cadena de proxies autorizada registra la IP del cliente según la topología acordada.
- Una conexión directa o desde un proxy no confiable no puede sustituir la IP registrada mediante cabeceras manipuladas.
- El registro conserva los datos necesarios para identificar la operación sin almacenar contraseñas ni tokens.

### 1.3. Implementación de Rate Limiting perimetral

**Ámbito:** Backend e infraestructura; experiencia de error en frontend.

**Criterios de aceptación:**

- Las peticiones dentro del límite y la ventana acordados se procesan normalmente; al superar el límite se recibe una respuesta de limitación identificable, como HTTP 429.
- El límite se aplica con la clave y el alcance acordados, por ejemplo IP o usuario, sin bloquear indebidamente a otros clientes.
- Al finalizar la ventana o periodo de espera, el cliente puede volver a operar. La interfaz muestra un mensaje comprensible cuando corresponde.

### 1.4. Migración del entorno de pruebas a Testcontainers PostgreSQL

**Ámbito:** Backend y entorno de pruebas.

**Criterios de aceptación:**

- Las pruebas de integración previstas arrancan un PostgreSQL aislado mediante Testcontainers y aplican las migraciones necesarias.
- La ejecución no se conecta ni modifica una base de datos de desarrollo o producción; al finalizar libera los recursos creados.
- Los prerrequisitos y el comando de ejecución quedan documentados y la suite puede ejecutarse en un entorno compatible con contenedores.

### 1.5. Configuración de Surefire para inclusión de tests *IT

**Ámbito:** Backend y compilación.

**Criterios de aceptación:**

- La ejecución acordada de Maven descubre y ejecuta las clases de integración con sufijo `IT` además de las pruebas incluidas en su configuración.
- El informe permite identificar las pruebas ejecutadas y sus resultados; una prueba fallida o una suite requerida sin ejecutar no se reporta como exitosa.

### 1.6. Refactor IntegrationTestBase con metamodelo de Hibernate

**Ámbito:** Backend y soporte de pruebas.

**Criterios de aceptación:**

- La base común de integración usa el metamodelo de Hibernate para el propósito acordado y funciona con el esquema y las entidades vigentes.
- La preparación y limpieza de datos mantienen el aislamiento entre casos, respetan relaciones y no eliminan datos ajenos al entorno de pruebas.

### 1.7. Configuración de Mockito como -javaagent en Surefire

**Ámbito:** Backend y compilación.

**Criterios de aceptación:**

- La suite que necesita Mockito se ejecuta con el agente configurado en Surefire y es compatible con la versión de Java acordada.
- La configuración funciona junto con otros agentes de prueba utilizados por el proyecto y no depende de rutas particulares de un equipo.

### 1.8. Homogeneización de Specifications con Specification.unrestricted()

**Ámbito:** Backend y acceso a datos.

**Criterios de aceptación:**

- Los filtros opcionales se combinan de manera uniforme; sin filtros opcionales no se agregan restricciones accidentales ni se producen errores.
- Con uno o varios filtros, los resultados cumplen las condiciones solicitadas y mantienen las restricciones de autorización aplicables.

---

## Sprint 2: Arquitectura Frontend Transversal y Autenticación

**Lógica:** Una vez seguro el backend, se construyen los cimientos visuales (UI/UX), la configuración del cliente HTTP para comunicarse con el servidor y se implementa el flujo crítico de acceso (Login/Auth).

### 2.1. Maquetación base de vistas reactivas y enrutamiento

**Ámbito:** Frontend.

**Criterios de aceptación:**

- Las vistas principales se adaptan a los tamaños de pantalla acordados y la navegación entre rutas funciona sin pérdida inesperada de estado.
- Las rutas protegidas verifican la sesión y redirigen conforme al rol; una ruta inexistente presenta una salida comprensible.

### 2.2. Sistema de diseño: badges de estado, tablas paginadas y modales

**Ámbito:** Frontend.

**Criterios de aceptación:**

- Los estados se presentan con textos y estilos consistentes; las tablas permiten navegar sus páginas e indican el estado vacío y de carga.
- Los modales se abren y cierran correctamente, admiten teclado y cuentan con etiquetas accesibles y foco apropiado.

### 2.3. Configuración de cliente HTTP con interceptores (auth, errores, loading)

**Ámbito:** Frontend e integración con backend.

**Criterios de aceptación:**

- El cliente usa la URL de API del entorno y adjunta credenciales solo a los destinos autorizados.
- Los estados de carga se activan y finalizan también ante errores o cancelaciones; las peticiones simultáneas no ocultan la carga prematuramente.
- Las respuestas de error y el vencimiento de sesión se procesan de manera coherente en las vistas correspondientes.

### 2.4. Interceptor de excepciones global con traducción de códigos semánticos

**Ámbito:** Frontend e integración con backend.

**Criterios de aceptación:**

- Los códigos de error acordados se traducen a mensajes comprensibles sin mostrar detalles internos ni información sensible.
- Los errores desconocidos, de red y de servidor presentan un mensaje alternativo y permiten reintentar cuando corresponda.

### 2.5. Sistema de notificaciones toast global

**Ámbito:** Frontend.

**Criterios de aceptación:**

- Las operaciones previstas muestran mensajes globales coherentes de éxito o error, sin duplicados inesperados.
- Las notificaciones se pueden percibir mediante tecnologías de asistencia y desaparecen o pueden cerrarse según el comportamiento acordado.

### 2.6. Sincronización de vistas y formateo de fechas America/Lima

**Ámbito:** Frontend e integración con backend.

**Criterios de aceptación:**

- Las fechas y horas de los flujos acordados se muestran en la zona `America/Lima`, incluidos cambios de día y datos provenientes del servidor.
- Los cambios realizados se reflejan en las vistas dependientes con la estrategia de actualización acordada, sin presentar datos obsoletos como actuales.

### 2.7. Migración a jjwt 0.12.x y eliminación de DaoAuthenticationProvider manual

**Ámbito:** Backend y autenticación.

**Criterios de aceptación:**

- La configuración y dependencias usan la versión de jjwt acordada y no requieren un `DaoAuthenticationProvider` manual.
- El inicio de sesión genera tokens válidos; tokens alterados, vencidos o inválidos no permiten acceso. Las cuentas inactivas o suspendidas se rechazan.

### 2.8. Formulario web de cambio de contraseña con re-login forzado

**Ámbito:** Frontend, backend y autenticación.

**Criterios de aceptación:**

- Un usuario autenticado cambia su contraseña proporcionando la actual y cumpliendo las reglas de validación; recibe errores comprensibles ante datos incorrectos.
- Tras el cambio exitoso, la sesión se cierra y se solicita ingresar de nuevo. La contraseña anterior deja de servir y las sesiones o tokens anteriores se invalidan según la política aprobada.

### 2.9. Aceptación de términos y condiciones

**Ámbito:** Frontend, backend y registro de aceptación.

**Criterios de aceptación:**

- El usuario revisa las condiciones generales y las correspondientes a todos sus roles, y puede cerrar sesión sin aceptarlas.
- La API restringe las funciones protegidas hasta registrar la aceptación de la versión y roles mostrados. Se solicita una nueva aceptación cuando cambian.
- La cuenta puede consultar los términos vigentes desde su perfil y se conserva el historial de aceptación mientras exista la cuenta.
- Antes de publicar, la institución revisa el texto y define la información y los procedimientos de privacidad y de menores que correspondan.

---

## Sprint 3: Gestión de Usuarios, Comunicación y Notificaciones

**Lógica:** Con los usuarios pudiendo autenticarse y la UI lista, se habilitan las vistas de perfil y administración de cuentas, sumando las vías de interacción en tiempo real.

### 3.1. Vista de perfil de usuario con edición de datos

**Ámbito:** Frontend y backend.

**Criterios de aceptación:**

- El usuario ve y modifica los datos de perfil autorizados; los cambios válidos persisten al recargar.
- Los datos inválidos se rechazan con mensajes claros y un usuario no puede modificar perfiles ajenos sin permiso.

### 3.2. Vista de gestión de usuarios (listado, filtros, estado, roles)

**Ámbito:** Frontend, backend y autorización.

**Criterios de aceptación:**

- Los usuarios autorizados pueden consultar el listado y aplicar los filtros y paginación acordados.
- Los cambios permitidos de estado y roles persisten y respetan las reglas de autorización; los intentos no autorizados son rechazados por la API.
- Si una operación comprende más de una modificación, el resultado informa de forma fiel qué cambios se guardaron.

### 3.3. Interfaz de chat con últimos N mensajes

**Ámbito:** Frontend, backend y comunicación.

**Criterios de aceptación:**

- Los participantes autorizados visualizan los últimos N mensajes en el orden acordado y pueden enviar mensajes sin ver conversaciones ajenas.
- Los mensajes nuevos se reflejan según la estrategia y latencia acordadas; las confirmaciones de lectura solo se registran cuando corresponda al destinatario.
- Se gestionan de forma clara los estados de carga, conversación vacía y error de envío.

### 3.4. Badge de notificaciones no leídas en header

**Ámbito:** Frontend y backend.

**Criterios de aceptación:**

- El encabezado muestra el número de notificaciones no leídas del usuario autenticado y se actualiza según la estrategia acordada.
- Al marcar una notificación como leída, el contador se actualiza; los usuarios no pueden consultar ni modificar notificaciones ajenas.

---

## Sprint 4: Módulo Académico Core (Cursos, Matrículas y Asistencias)

**Lógica:** El núcleo del LMS. Se resuelven primero los problemas de acoplamiento y concurrencia (locks, algoritmos) antes de plasmar la interfaz de arrastrar y soltar, para luego atarlo a las matrículas y asistencias de los alumnos.

### 4.1. Refactor de matrícula, aula y gestión docente

**Ámbito:** Backend.

**Alcance:** centralizar las transiciones de matrícula y la conservación de su historial para los flujos de matrícula, aula y gestión docente. Unificar además la fórmula de asistencia utilizada en lecturas y cálculos persistidos.

**Criterios de aceptación:**

- Los tres flujos usan reglas comunes de transición y conservación del historial, manteniendo sus rutas, autorizaciones y bloqueos.
- La lectura y el cálculo persistido utilizan la misma fórmula de asistencia; las pruebas relevantes verifican sus resultados y el proyecto inicia sin dependencias circulares.

### 4.2. Algoritmo de dos pasadas con offset +1_000_000 para reordenamiento

**Ámbito:** Backend y persistencia.

**Criterios de aceptación:**

- Al reordenar una colección válida, el orden final coincide con la solicitud, sin posiciones duplicadas ni pérdidas de elementos.
- La operación utiliza dos pasadas con el offset indicado y no deja posiciones temporales persistidas si ocurre un error.

### 4.3. Lock pesimista en reordenamiento de unidades y semanas

**Ámbito:** Backend y base de datos.

**Criterios de aceptación:**

- Las solicitudes concurrentes de reordenamiento sobre el mismo ámbito se coordinan mediante el bloqueo acordado y mantienen un orden consistente.
- Ante fallo o conflicto, la transacción no deja cambios parciales y el cliente recibe una respuesta controlada.

### 4.4. Interfaz Drag & Drop para reordenamiento de unidades y semanas

**Ámbito:** Frontend e integración con backend.

**Criterios de aceptación:**

- Un usuario autorizado puede reorganizar unidades y semanas dentro de los límites permitidos y el orden persiste al recargar.
- Si el guardado falla, la interfaz comunica el error y recupera o representa fielmente el orden persistido; existe una alternativa accesible al arrastre.

### 4.5. Vista de matrículas con máquina de estados

**Ámbito:** Frontend, backend y reglas académicas.

**Criterios de aceptación:**

- Los usuarios autorizados consultan matrículas y ejecutan únicamente las transiciones de estado aprobadas; las transiciones inválidas son rechazadas por la API.
- El estado mostrado coincide con el persistido y se respetan las reglas acordadas de capacidad, acceso y duplicidad, también ante operaciones simultáneas.

### 4.6. Interfaz de registro masivo de asistencias todo-o-nada

**Ámbito:** Frontend, backend y persistencia.

**Criterios de aceptación:**

- Un usuario autorizado registra un lote válido y todos los registros se guardan correctamente.
- Si cualquier elemento del lote es inválido o falla la operación, no se guarda ningún registro del lote y la interfaz identifica el problema.
- El cálculo de asistencia resultante respeta las clases y fechas aplicables y se actualiza cuando cambian los datos que lo afectan.

---

## Sprint 5: Recursos Adicionales, Eventos y Cierre de Proyecto

**Lógica:** Se entregan las características periféricas que aportan valor complementario al sistema y se documentan los resultados finales para despliegue y cierre de tesis.

### 5.1. Catálogo de biblioteca con descarga auditada

**Ámbito:** Frontend, backend, almacenamiento y auditoría.

**Criterios de aceptación:**

- Los usuarios autorizados pueden consultar el catálogo y descargar recursos disponibles; se rechaza el acceso no permitido.
- Estudiantes pueden buscar, filtrar y abrir recursos; docentes y administradores pueden además crear y editar; solo administradores pueden eliminar.
- Docentes y administradores pueden adjuntar un archivo de hasta 20 MB o registrar un enlace externo; la interfaz informa los formatos admitidos.
- Cada descarga acordada deja un registro verificable de usuario, recurso, fecha e IP conforme a la política de proxies confiables.
- Los enlaces de recursos privados cumplen la política de expiración y autorización aprobada.

### 5.2. Calendario de eventos, disponibilidades y tutorías

**Ámbito:** Frontend, backend y reglas de agenda.

**Criterios de aceptación:**

- Cada usuario visualiza los eventos, clases, disponibilidades y tutorías que le corresponden en la zona horaria acordada.
- Las operaciones autorizadas sobre eventos, disponibilidad y tutorías persisten y validan fechas, transiciones y solapamientos.
- Las reservas concurrentes no confirman horarios incompatibles; los errores se comunican al usuario.

### 5.3. Redacción del Capítulo 6 completo (resultados y conclusiones)

**Ámbito:** Documentación de tesis y cierre del proyecto.

**Alcance actual:** aplazado por indicación del usuario; el trabajo en curso se centra en la funcionalidad técnica del sistema.

**Criterios de aceptación:**

- El capítulo incluye los resultados obtenidos y las conclusiones correspondientes a los objetivos, siguiendo la estructura y formato exigidos por la institución.
- Los resultados se sustentan en evidencias verificables, distinguen lo aprobado de lo pendiente o bloqueado y reflejan las limitaciones de la evaluación.
- La persona responsable revisa y aprueba el documento final conforme a los criterios institucionales acordados.

---

## Riesgos identificados para considerar durante la aceptación

La revisión previa del proyecto identificó aspectos que deben verificarse en la versión y entorno evaluados. No constituyen resultados de aceptación:

- Cuenta administradora inicial creada por migración con credenciales conocidas: revisar las instalaciones existentes y el mecanismo de inicialización.
- URL de API fijada a localhost y referencias de archivos dependientes del origen configurado: verificar despliegue remoto y HTTPS.
- Las imágenes históricas pueden conservar enlaces reutilizables. Las imágenes nuevas usan referencias propias y enlaces temporales; falta verificar el comportamiento con el proveedor real y planificar la migración y revocación de enlaces anteriores.
- Contraseña inicial incluida en un enlace de WhatsApp: revisar el mecanismo de entrega de credenciales.
- Capacidad de matrículas, reprogramación y cálculo de asistencia: comprobar estados y concurrencia.
- Estado visual de sesión vencida, actualización parcial de estudiantes, gráfico de horas sin datos y lectura de mensajes: validar el comportamiento final con usuarios.

## Registro de ejecución

| Criterio | Versión | Estado | Resultado / incidencia | Evidencia | Responsable | Fecha |
| --- | --- | --- | --- | --- | --- | --- |
| Por completar | Por completar | Pendiente | Por completar | Por completar | Por completar | Por completar |

## Seguimiento de implementación — 11 de noviembre de 2026

Este seguimiento describe el trabajo realizado en el código y lo que queda por completar. **No sustituye la ejecución y aprobación de los criterios de aceptación**; el estado de una prueba solo puede registrarse después de ejecutarla en el entorno correspondiente.

| Punto | Situación y trabajo restante |
| --- | --- |
| 1.1 | Existe configuración CORS; el procesamiento automático de cabeceras reenviadas está deshabilitado para no confiar en valores manipulados. Falta definir el origen definitivo de Vercel y comprobar URLs y esquema detrás de Render. |
| 1.2 | La auditoría usa un resolvedor de IP configurado para el borde público de Render; si no puede verificar la IP, la guarda como desconocida. Falta verificar la topología publicada. |
| 1.3 | Se limita `POST /auth/login` mediante PostgreSQL compartido: 120 intentos por IP cada 15 minutos por defecto. Biblioteca y subidas no se limitan. Falta verificar el comportamiento en Render y decidir si se necesitan reglas adicionales en el perímetro de red. |
| 1.4 | Existen perfiles aislados con Testcontainers/PostgreSQL: se validaron las migraciones y una selección de pruebas HTTP en PostgreSQL 18. La suite predeterminada conserva H2; falta ejecutar toda la suite en PostgreSQL. |
| 1.5–1.8 | Hay configuración para `*IT`, agente de Mockito, limpieza basada en metamodelo y Specifications. Falta comprobar su ejecución en el entorno PostgreSQL objetivo. |
| 2.1–2.2 | Existen rutas y componentes de interfaz y se preparó la configuración de publicación estática en Vercel; quedan pendientes las pruebas de aceptación de adaptación, accesibilidad y consistencia en las vistas. |
| 2.3–2.5 | Se añadieron configuración pública de API, indicador de solicitudes y aviso global de errores. Se requiere validar los flujos completos y la interacción con mensajes propios de cada vista. |
| 2.6 | Hay utilidades de fechas y sincronización de vistas; queda verificar exhaustivamente la zona `America/Lima` y los escenarios de cambio de día. |
| 2.7–2.8 | Existe jjwt 0.12.x; se añadieron perfil editable, formulario de contraseña, cierre de sesión y revocación de tokens al cambiarla. Falta la aceptación de extremo a extremo. |
| 2.9 | Se añadió aceptación versionada de términos por rol, con bloqueo en la API e historial. Pendientes revisión institucional del contenido y validación integral tras desplegar frontend y backend coordinadamente. |
| 3.1–3.2 | Se añadieron perfil y gestión administrativa paginada con filtros, estado y roles; validar roles y operaciones completas en el entorno objetivo. |
| 3.3–3.4 | Se añadieron chat por curso y notificaciones; se actualizan por sondeo periódico, no mediante WebSocket. Validar latencia y permisos con usuarios reales de prueba. |
| 4.1 | Se centralizaron las transiciones y el historial de matrícula y se unificó la fórmula de asistencia; pasaron pruebas unitarias y HTTP focalizadas. Falta la aceptación integral. |
| 4.2–4.4 | Existe reordenamiento de unidades y semanas en backend y se añadieron arrastre y botones en frontend. Falta probar concurrencia real sobre PostgreSQL y la experiencia accesible completa. |
| 4.5 | Se reforzó la reserva de cupos, incluyendo matrículas en riesgo, y la interfaz administrativa permite las transiciones previstas. Dos pruebas HTTP en PostgreSQL verificaron altas simultáneas y estados terminales; falta la aceptación integral. |
| 4.6 | Se añadió registro masivo por clase para estudiantes activos o en riesgo y cálculo actualizado de asistencia en las lecturas. Falta validar el flujo integral, especialmente concurrencia y PostgreSQL. |
| 5.1 | Catálogo con búsqueda y filtros, gestión por rol y archivos propios de biblioteca de hasta 20 MB. Las solicitudes de descarga se registran y los nuevos archivos privados usan enlaces temporales. Falta validar R2, Cloudinary y la IP en la infraestructura real. Los enlaces externos no permiten garantizar auditoría de accesos posteriores. Al eliminar un recurso también se elimina su historial de descargas; el archivo almacenado no se elimina automáticamente. |
| 5.2 | La agenda permite gestionar eventos personales, disponibilidades y tutorías según el rol. Falta verificar el flujo integral y la concurrencia en PostgreSQL. |
| 5.3 | Aplazado por indicación del usuario; fuera del alcance técnico actual. |

### Configuración necesaria antes de desplegar

- El backend publicado actualmente está en `https://kelly-academy-backend.onrender.com`; el frontend lo usa por defecto fuera de desarrollo local. Cuando Vercel asigne el dominio definitivo, configurar ese origen exacto en CORS del backend.
- En Render, comprobar `SPRING_PROFILES_ACTIVE=prod`. Si el administrador inicial todavía conserva la contraseña conocida de la migración histórica, configurar una contraseña robusta mediante la variable secreta `APP_BOOTSTRAP_ADMIN_PASSWORD` **antes de desplegar**. Si no se configura en ese caso, la aplicación no arrancará. No compartir el valor en el código ni en el chat.
- El cambio de validación de JWT requiere que las personas con sesiones anteriores vuelvan a iniciar sesión después del despliegue.
- Se mantiene el límite de **20 MB por archivo**. El tamaño y las cuotas de los proveedores de almacenamiento también deben comprobarse en su configuración real.

### Verificación técnica ejecutada

- Frontend: 131 pruebas aprobadas y compilación de producción correcta.
- Backend: 749 pruebas aprobadas en una copia aislada con H2, anterior a los últimos ajustes de archivos y estados de matrícula. Estos ajustes se verificaron después con pruebas unitarias y HTTP focalizadas.
- PostgreSQL temporal con Testcontainers: migraciones y arranque de producción verificados; selección de ocho pruebas HTTP aprobada. Dos pruebas HTTP adicionales comprobaron concurrencia de cupos y estados terminales.
- Para la continuación de los puntos 1.1–1.3 y 4.1 se comprobaron las 21 migraciones, el arranque de producción, el límite compartido entre instancias, la respuesta HTTP `429` con CORS y `Retry-After`, y el rechazo cuando falta la IP confiable. La auditoría de biblioteca se probó en 24 casos HTTP aislados. El refactor académico pasó 102 pruebas unitarias y 70 HTTP aisladas.
- La configuración de Vercel es JSON válido y apunta al archivo generado para rutas de Angular. Falta comprobarla en una publicación real y configurar su origen en CORS.
- Cloudinary: firma, permisos y acceso comprobados con proveedor simulado; queda pendiente la comprobación con el servicio real y el tratamiento de enlaces históricos.

Estas verificaciones no reemplazan las pruebas de aceptación funcionales en el entorno definitivo.
