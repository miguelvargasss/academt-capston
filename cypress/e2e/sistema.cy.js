// Pruebas de sistema (extremo a extremo): flujos completos que atraviesan
// frontend Angular, API Spring Boot y PostgreSQL efímero. Usan el entorno
// aislado de docker-compose.acceptance.yml; las respuestas no se simulan.
const API = 'http://127.0.0.1:18080';
const password = 'Aceptacion123*';
const sufijo = () => `${Date.now()}-${Cypress._.random(1000, 9999)}`;

const peticion = (method, path, token, body, extra = {}) => cy.request({
  method, url: `${API}${path}`, headers: { Authorization: `Bearer ${token}` },
  ...(body ? { body } : {}), log: false, ...extra,
});

function tokenAdmin() {
  return cy.request({ method: 'POST', url: `${API}/auth/login`, log: false,
    body: { correoElectronico: 'admin@kellyacademy.com', contrasena: 'Admin123*' } })
    .then(({ body }) => {
      const token = body.accessToken;
      return peticion('GET', '/api/terminos/aceptacion', token).then(({ body: estado }) => {
        const listo = estado.aceptado ? cy.wrap(null, { log: false })
          : peticion('POST', '/api/terminos/aceptacion', token,
            { version: estado.version, rolesMostrados: estado.roles });
        return listo.then(() => token);
      });
    });
}

function crearUsuario(adminToken, rol) {
  const email = `sistema-${rol.toLowerCase()}-${sufijo()}@example.test`;
  return peticion('POST', '/api/usuarios', adminToken, {
    nombre: `Sistema${rol}`, apellido: 'Prueba', correoElectronico: email, contrasena: password, roles: [rol],
  }).then(({ body }) => ({ id: body.id, email, rol }));
}

function ingresarYaceptar(cuenta, captura) {
  cy.clearLocalStorage();
  cy.visit('/login');
  if (cuenta.rol !== 'ESTUDIANTE') cy.contains('button', 'Profesora').click();
  cy.get('#email').type(cuenta.email);
  cy.get('#password').type(password, { log: false });
  cy.contains('button', 'Ingresar al Portal').click();
  cy.location('pathname', { timeout: 20000 }).should('eq', '/terminos');
  cy.get('input[name="acceptTerms"]').check();
  cy.contains('button', 'Aceptar y continuar').click();
  cy.location('pathname', { timeout: 20000 }).should('eq', '/dashboard');
  if (captura) cy.screenshot(captura, { capture: 'viewport' });
}

const tokenActual = () => cy.window().then((win) => win.localStorage.getItem('kelly_access_token'));

describe('Sistema: flujo académico completo', () => {
  beforeEach(() => cy.viewport(1280, 900));

  it('SIS-01 admin configura curso, matrícula, asistencia y nota; el estudiante lo ve en el portal', () => {
    const titulo = `Inglés Sistema ${sufijo()}`;
    tokenAdmin().then((admin) => {
      crearUsuario(admin, 'DOCENTE').then((docente) => {
        crearUsuario(admin, 'ESTUDIANTE').then((estudiante) => {
          peticion('POST', '/api/cursos', admin, {
            docenteId: docente.id, titulo, descripcion: 'Curso de pruebas de sistema', nivelCefr: 'B1',
            horario: 'Lun 10:00', fechaInicio: '2026-11-01', fechaFin: '2027-02-01', capacidadMaxima: 20,
          }).then(({ status, body: curso }) => {
            expect(status).to.eq(201);
            expect(curso.titulo).to.eq(titulo);
            peticion('POST', '/api/unidades', admin, { cursoId: curso.id, numero: 1, titulo: 'Unidad 1' })
              .then(({ body: unidad }) => peticion('POST', '/api/semanas', admin,
                { unidadId: unidad.id, numero: 1, titulo: 'Semana 1' }))
              .then(({ body: semana }) => {
                peticion('POST', '/api/clases', admin, {
                  semanaId: semana.id, titulo: 'Clase 1', fechaHora: '2026-11-10T10:00:00', duracionMinutos: 60,
                }).then(({ status: s, body: clase }) => {
                  expect(s).to.eq(201);
                  peticion('POST', '/api/matriculas', admin, { cursoId: curso.id, estudianteId: estudiante.id })
                    .its('status').should('eq', 201);
                  peticion('POST', '/api/asistencias', admin,
                    { claseId: clase.id, estudianteId: estudiante.id, estado: 'PRESENTE' })
                    .its('status').should('eq', 201);
                });
                peticion('POST', '/api/tareas', admin, {
                  semanaId: semana.id, titulo: 'Tarea 1', fechaLimite: '2027-01-10T23:59:00', puntajeMaximo: 100,
                }).then(({ body: tarea }) => peticion('POST', '/api/entregas', admin,
                  { tareaId: tarea.id, estudianteId: estudiante.id }))
                  .then(({ body: entrega }) => peticion('PATCH', `/api/entregas/${entrega.id}/calificar`, admin,
                    { nota: 85, retroalimentacion: 'Buen trabajo' }))
                  .then(({ status: s, body }) => {
                    expect(s).to.eq(200);
                    expect(Number(body.nota)).to.eq(85);
                  });
              });

            ingresarYaceptar(estudiante, 'sis01-01-dashboard-estudiante');
            cy.visit('/courses');
            cy.contains(titulo, { timeout: 20000 }).should('be.visible');
            cy.screenshot('sis01-02-curso-visible-estudiante', { capture: 'viewport' });
            tokenActual().then((token) => {
              peticion('GET', '/api/matriculas/mis-matriculas', token).its('body').then((m) => {
                const lista = m.content ?? m;
                expect(lista.length).to.be.greaterThan(0);
              });
              peticion('GET', '/api/asistencias/mis-asistencias', token).its('status').should('eq', 200);
              peticion('GET', '/api/entregas/mis-entregas', token).its('status').should('eq', 200);
            });
          });
        });
      });
    });
  });
});

describe('Sistema: control de acceso por rol', () => {
  beforeEach(() => cy.viewport(1280, 900));

  it('SIS-02 la API rechaza peticiones sin sesión', () => {
    ['/api/cursos', '/api/usuarios', '/api/matriculas', '/api/asistencias'].forEach((ruta) => {
      cy.request({ url: `${API}${ruta}`, failOnStatusCode: false, log: false })
        .its('status').should('be.oneOf', [401, 403]);
    });
  });

  it('SIS-03 el estudiante no puede administrar usuarios, cursos ni matrículas', () => {
    tokenAdmin().then((admin) => crearUsuario(admin, 'ESTUDIANTE')).then((estudiante) => {
      ingresarYaceptar(estudiante, 'sis03-01-estudiante-dashboard');
      tokenActual().then((token) => {
        peticion('GET', '/api/usuarios', token, null, { failOnStatusCode: false }).its('status').should('eq', 403);
        peticion('POST', '/api/cursos', token, {
          docenteId: estudiante.id, titulo: 'No permitido', nivelCefr: 'A1', capacidadMaxima: 5,
        }, { failOnStatusCode: false }).its('status').should('eq', 403);
        peticion('POST', '/api/matriculas', token, { cursoId: estudiante.id, estudianteId: estudiante.id },
          { failOnStatusCode: false }).its('status').should('eq', 403);
        peticion('POST', '/api/asistencias', token,
          { claseId: estudiante.id, estudianteId: estudiante.id, estado: 'PRESENTE' },
          { failOnStatusCode: false }).its('status').should('eq', 403);
      });
      cy.visit('/users');
      cy.location('pathname').should('not.eq', '/users');
      cy.visit('/students');
      cy.location('pathname').should('not.eq', '/students');
      cy.screenshot('sis03-02-ruta-protegida-redirigida', { capture: 'viewport' });
    });
  });

  it('SIS-04 el docente accede a su panel y no a la administración de usuarios', () => {
    tokenAdmin().then((admin) => crearUsuario(admin, 'DOCENTE')).then((docente) => {
      ingresarYaceptar(docente, 'sis04-01-docente-dashboard');
      cy.visit('/students');
      cy.location('pathname').should('eq', '/students');
      cy.screenshot('sis04-02-docente-estudiantes', { capture: 'viewport' });
      cy.visit('/users');
      cy.location('pathname').should('not.eq', '/users');
      tokenActual().then((token) => {
        peticion('GET', '/api/usuarios', token, null, { failOnStatusCode: false }).its('status').should('eq', 403);
      });
    });
  });
});

describe('Sistema: validaciones de negocio', () => {
  it('SIS-05 rechaza datos inválidos y duplicados', () => {
    tokenAdmin().then((admin) => {
      crearUsuario(admin, 'DOCENTE').then((docente) => {
        peticion('POST', '/api/cursos', admin, {
          docenteId: docente.id, titulo: '', nivelCefr: 'A1', capacidadMaxima: 10,
        }, { failOnStatusCode: false }).its('status').should('eq', 400);
        peticion('POST', '/api/cursos', admin, {
          docenteId: docente.id, titulo: 'Capacidad inválida', nivelCefr: 'A1', capacidadMaxima: 0,
        }, { failOnStatusCode: false }).its('status').should('eq', 400);

        crearUsuario(admin, 'ESTUDIANTE').then((estudiante) => {
          peticion('POST', '/api/cursos', admin, {
            docenteId: docente.id, titulo: `Duplicados ${sufijo()}`, nivelCefr: 'A2', capacidadMaxima: 5,
          }).then(({ body: curso }) => {
            peticion('POST', '/api/matriculas', admin, { cursoId: curso.id, estudianteId: estudiante.id })
              .its('status').should('eq', 201);
            peticion('POST', '/api/matriculas', admin, { cursoId: curso.id, estudianteId: estudiante.id },
              { failOnStatusCode: false }).its('status').should('be.gte', 400);
          });
        });
      });
    });
  });

  it('SIS-06 no permite iniciar sesión con credenciales inválidas', () => {
    cy.request({ method: 'POST', url: `${API}/auth/login`, failOnStatusCode: false, log: false,
      body: { correoElectronico: 'admin@kellyacademy.com', contrasena: 'incorrecta' } })
      .its('status').should('be.oneOf', [400, 401, 403]);
  });

  // Hallazgo: un valor de enum inválido en el JSON provoca HTTP 500 en lugar de 400.
  it('SIS-07 un nivel CEFR inexistente se rechaza con 400', () => {
    tokenAdmin().then((admin) => {
      crearUsuario(admin, 'DOCENTE').then((docente) => {
        peticion('POST', '/api/cursos', admin, {
          docenteId: docente.id, titulo: 'Nivel inválido', nivelCefr: 'Z9', capacidadMaxima: 5,
        }, { failOnStatusCode: false }).its('status').should('eq', 400);
      });
    });
  });
});
