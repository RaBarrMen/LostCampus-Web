// Carga y valida variables de entorno. Si falta una variable obligatoria
// el servicio no arranca (mejor fallar al inicio que en producción).
const path = require('node:path');
const fs = require('node:fs');

function loadDotEnv(dir = process.cwd()) {
  const file = path.join(dir, '.env');
  if (!fs.existsSync(file)) return;
  // Node 22 trae soporte nativo para archivos .env
  process.loadEnvFile(file);
}

function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n] || process.env[n].trim() === '');
  if (missing.length) {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }
  return Object.fromEntries(names.map((n) => [n, process.env[n]]));
}

function env(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

module.exports = { loadDotEnv, requireEnv, env };
