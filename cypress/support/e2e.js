// Aun cuando el navegador se recargue, la configuración apunta únicamente a la
// API local de aceptación. Se rechazan peticiones XHR/fetch a otros orígenes;
// no se simulan respuestas de la API.
Cypress.on('window:before:load', (win) => {
  win.__KELLY_CONFIG__ = { apiUrl: 'http://127.0.0.1:18080' };
});

beforeEach(() => {
  cy.intercept('**', (request) => {
    const origin = new URL(request.url).origin;
    if (origin !== 'http://127.0.0.1:14200' && origin !== 'http://127.0.0.1:18080') {
      request.destroy();
      return;
    }
    request.continue();
  });
});
