// Algunas terminales integradas heredan ELECTRON_RUN_AS_NODE, que impide que
// Cypress inicie su propio proceso Electron. No modificar el entorno global.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const cypressCli = path.resolve(path.dirname(require.resolve('cypress')), '../bin/cypress');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const result = spawnSync(process.execPath, [cypressCli, ...process.argv.slice(2)], { env, stdio: 'inherit' });
if (result.error) {
  console.error('No se pudo iniciar Cypress:', result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
