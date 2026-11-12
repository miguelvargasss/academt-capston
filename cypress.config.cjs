const { defineConfig } = require('cypress');
const { execFileSync } = require('node:child_process');
const { realpathSync } = require('node:fs');
const path = require('node:path');

// Solo se admiten los puertos locales del entorno efímero de aceptación.
const FRONTEND = 'http://127.0.0.1:14200';
const compose = path.resolve(__dirname, '../backend.kellyacademy/docker-compose.acceptance.yml');

function inspect(service) {
  const id = execFileSync('docker', ['compose', '-f', compose, 'ps', '-q', service], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  if (!/^[0-9a-f]{12,64}$/.test(id)) throw new Error(`Servicio ${service} no disponible`);
  const output = execFileSync('docker', ['inspect', id], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const container = JSON.parse(output)[0];
  const labels = container.Config.Labels || {};
  const configuredFiles = (labels['com.docker.compose.project.config_files'] || '').split(',');
  const usesExpectedCompose = configuredFiles.some((file) => {
    try { return realpathSync(file) === realpathSync(compose); } catch { return false; }
  });
  if (!container.State.Running || labels['com.docker.compose.project'] !== 'kelly-acceptance' ||
      labels['com.docker.compose.service'] !== service || !usesExpectedCompose)
    throw new Error(`Servicio ${service} no corresponde al entorno aislado`);
  return container;
}

function verifyIsolatedBackend() {
  const backend = inspect('backend');
  const postgres = inspect('postgres');
  const proxy = inspect('proxy');
  const port = proxy.NetworkSettings.Ports?.['8080/tcp'];
  const env = backend.Config.Env || [];
  const expectedEnv = ['DB_URL=jdbc:postgresql://postgres:5432/kelly_acceptance',
    'SPRING_PROFILES_ACTIVE=dev', 'CLOUDINARY_CLOUD_NAME=', 'R2_ENDPOINT='];
  if (!Array.isArray(port) || port.length !== 1 || port[0].HostIp !== '127.0.0.1' || port[0].HostPort !== '18080' ||
      expectedEnv.some((entry) => !env.includes(entry))) throw new Error('El backend no coincide con la configuración aislada');
  if (!Object.hasOwn(postgres.HostConfig.Tmpfs || {}, '/var/lib/postgresql') || postgres.Mounts.length)
    throw new Error('PostgreSQL no usa el almacenamiento temporal esperado');
  const networks = Object.values(backend.NetworkSettings.Networks || {});
  if (networks.length !== 1) throw new Error('La red de aceptación no es exclusiva');
  const databaseNetworkId = networks[0].NetworkID;
  if (!Object.values(proxy.NetworkSettings.Networks || {}).some((item) => item.NetworkID === databaseNetworkId) ||
      !Object.values(postgres.NetworkSettings.Networks || {}).some((item) => item.NetworkID === databaseNetworkId))
    throw new Error('Los servicios de aceptación no comparten la red privada');
  const network = JSON.parse(execFileSync('docker', ['network', 'inspect', networks[0].NetworkID], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  }))[0];
  if (!network.Internal || network.Labels?.['com.docker.compose.project'] !== 'kelly-acceptance')
    throw new Error('La red del backend no está aislada');
}

module.exports = defineConfig({
  allowCypressEnv: false,
  video: false,
  e2e: {
    baseUrl: FRONTEND,
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(_on, config) {
      if (config.baseUrl !== FRONTEND) throw new Error(`Las pruebas solo admiten ${FRONTEND}`);
      try { verifyIsolatedBackend(); }
      catch (error) { throw new Error(`No se puede verificar el entorno de aceptación: ${error.message}`); }
      return config;
    },
  },
});
