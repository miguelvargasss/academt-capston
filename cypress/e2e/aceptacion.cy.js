// Estas pruebas usan exclusivamente el backend y PostgreSQL efímeros de
// docker-compose.acceptance.yml. Las respuestas de la API no se simulan.
const API = 'http://127.0.0.1:18080';
const password = 'Aceptacion123*';

function authenticatedRequest(method, path, token, body) {
  return cy.request({ method, url: `${API}${path}`, headers: { Authorization: `Bearer ${token}` },
    ...(body ? { body } : {}), log: false });
}

// Preparación únicamente: el administrador de la base temporal crea cuentas
// sintéticas. Cada persona probada acepta sus propios términos en la interfaz.
function crearCuenta(rol) {
  const email = `aceptacion-${rol.toLowerCase()}-${Date.now()}-${Cypress._.random(100000, 999999)}@example.test`;
  return cy.request({ method: 'POST', url: `${API}/auth/login`,
    body: { correoElectronico: 'admin@kellyacademy.com', contrasena: 'Admin123*' }, log: false })
    .then(({ body }) => {
      const adminToken = body.accessToken;
      return authenticatedRequest('GET', '/api/terminos/aceptacion', adminToken).then(({ body: status }) => {
        const ready = status.aceptado
          ? cy.wrap(null, { log: false })
          : authenticatedRequest('POST', '/api/terminos/aceptacion', adminToken,
            { version: status.version, rolesMostrados: status.roles });
        return ready.then(() => authenticatedRequest('POST', '/api/usuarios', adminToken, {
          nombre: 'Aceptacion', apellido: 'Temporal', correoElectronico: email,
          contrasena: password, roles: [rol],
        })).then(() => ({ email, rol, adminToken }));
      });
    });
}

function accederYaceptar(cuenta, capturarTerminos = false) {
  cy.visit('/login');
  if (cuenta.rol !== 'ESTUDIANTE') cy.contains('button', 'Profesora').click();
  cy.get('#email').type(cuenta.email);
  cy.get('#password').type(password, { log: false });
  cy.contains('button', 'Ingresar al Portal').click();
  cy.location('pathname', { timeout: 20000 }).should('eq', '/terminos');
  cy.contains('h1', 'Términos y condiciones').should('be.visible');
  const clausula = cuenta.rol === 'DOCENTE' ? 'Compromisos del docente' :
    cuenta.rol === 'ADMINISTRADOR' ? 'Responsabilidades de administración' : 'Compromisos del estudiante';
  cy.contains(clausula).should('exist');
  if (capturarTerminos) {
    cy.contains(clausula).scrollIntoView();
    cy.screenshot('02-terminos-estudiante', { capture: 'viewport' });
  }
  cy.get('input[name="acceptTerms"]').check();
  cy.contains('button', 'Aceptar y continuar').click();
  cy.location('pathname', { timeout: 20000 }).should('eq', '/dashboard');
}

function buscarRecurso(title) {
  cy.get('input[name="title"]').clear().type(title);
  cy.contains('button', 'Buscar').click();
  cy.contains('li', title).should('be.visible');
}

describe('Aceptación: acceso y biblioteca', () => {
  beforeEach(() => cy.viewport(1280, 900));

  it('impide el acceso anónimo y rechaza credenciales incorrectas', () => {
    cy.visit('/library');
    cy.location('pathname').should('eq', '/login');
    cy.get('#email').type('nadie@example.test');
    cy.get('#password').type('Incorrecta123*', { log: false });
    cy.contains('button', 'Ingresar al Portal').click();
    cy.contains('Credenciales incorrectas o servidor no disponible').should('be.visible');
    cy.location('pathname').should('eq', '/login');
    cy.screenshot('01-acceso-rechazado', { capture: 'viewport' });
  });

  it('exige al estudiante aceptar sus términos antes de acceder a la API', () => {
    crearCuenta('ESTUDIANTE').then((student) => {
      cy.request({ method: 'POST', url: `${API}/auth/login`, body: {
        correoElectronico: student.email, contrasena: password,
      }, log: false }).then(({ body }) => {
        const token = body.accessToken;
        cy.request({ url: `${API}/api/recursos`, headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false, log: false }).then((response) => {
          expect(response.status).to.eq(403);
          expect(response.body.codigo).to.eq('TERMINOS_PENDIENTES');
        });
        accederYaceptar(student, true);
        authenticatedRequest('GET', '/api/terminos/aceptacion', token).its('body.aceptado').should('eq', true);
        authenticatedRequest('GET', '/api/recursos', token).its('status').should('eq', 200);
      });
    });
  });

  it('permite a docentes publicar un recurso y a estudiantes consultarlo', () => {
    const title = `Guía de prueba ${Date.now()} ${Cypress._.random(1000, 9999)}`;
    crearCuenta('DOCENTE').then((teacher) => {
      crearCuenta('ESTUDIANTE').then((student) => {
        accederYaceptar(teacher);
        cy.visit('/library');
        cy.contains('button', 'Agregar recurso').click();
        cy.get('[name="formTitle"]').type(title);
        cy.get('[name="formType"]').select('ENLACE');
        cy.get('[name="externalUrl"]').type('https://example.com/guia-prueba');
        cy.contains('button', 'Guardar recurso').click();
        cy.contains('Recurso añadido a la biblioteca').should('be.visible');
        buscarRecurso(title);
        cy.contains('li', title).within(() => {
          cy.contains('button', 'Editar').should('exist');
          cy.contains('button', 'Eliminar').should('not.exist');
        });
        cy.screenshot('03-biblioteca-docente', { capture: 'viewport' });
        // El servidor debe rechazar la acción incluso si se intenta fuera de la UI.
        cy.window().then((win) => {
          const token = win.localStorage.getItem('kelly_access_token');
          authenticatedRequest('GET', `/api/recursos?titulo=${encodeURIComponent(title)}`, token)
            .then(({ body }) => {
              expect(body.content).to.have.length(1);
              cy.request({ method: 'DELETE', url: `${API}/api/recursos/${body.content[0].id}`,
                headers: { Authorization: `Bearer ${token}` }, failOnStatusCode: false, log: false })
                .its('status').should('eq', 403);
            });
        });

        cy.clearLocalStorage();
        accederYaceptar(student);
        cy.visit('/library');
        buscarRecurso(title);
        cy.contains('li', title).within(() => {
          cy.contains('button', 'Editar').should('not.exist');
          cy.contains('button', 'Eliminar').should('not.exist');
          cy.contains('button', 'Abrir recurso').click();
        });
        cy.contains('button', 'Agregar recurso').should('not.exist');
        cy.contains('a', `Abrir ${title} en otra pestaña`)
          .should('have.attr', 'href', 'https://example.com/guia-prueba');
        cy.screenshot('04-biblioteca-estudiante', { capture: 'viewport' });
        cy.window().then((win) => {
          const token = win.localStorage.getItem('kelly_access_token');
          cy.request({ method: 'POST', url: `${API}/api/recursos`, headers: { Authorization: `Bearer ${token}` },
            body: { titulo: 'No permitido', tipo: 'ENLACE', urlExterno: 'https://example.com' },
            failOnStatusCode: false, log: false }).its('status').should('eq', 403);
        });
      });
    });
  });

  it('permite al administrador eliminar un recurso con confirmación', () => {
    const title = `Recurso temporal ${Date.now()} ${Cypress._.random(1000, 9999)}`;
    crearCuenta('ADMINISTRADOR').then((admin) => {
      authenticatedRequest('POST', '/api/recursos', admin.adminToken, {
        titulo: title, descripcion: null, categoria: 'Aceptación', nivelCefr: null,
        tipo: 'ENLACE', urlArchivo: null, urlExterno: 'https://example.com/temporal', tamanoMb: null,
      });
      accederYaceptar(admin);
      cy.visit('/library');
      buscarRecurso(title);
      cy.contains('li', title).contains('button', 'Eliminar').click();
      cy.get('[role="dialog"]').contains(title).should('be.visible');
      cy.screenshot('05-confirmacion-eliminacion', { capture: 'viewport' });
      cy.get('[role="dialog"]').contains('button', 'Eliminar').click();
      cy.contains('Recurso eliminado').should('be.visible');
      cy.contains('li', title).should('not.exist');
      cy.screenshot('06-recurso-eliminado', { capture: 'viewport' });
    });
  });
});
