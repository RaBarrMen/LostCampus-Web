const { loadDotEnv, requireEnv, env, listen } = require('@lostcampus/common');

loadDotEnv();
const { QR_SECRET } = requireEnv([
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'INTERNAL_API_KEY',
  'NOTIFY_SERVICE_URL',
  'QR_SECRET',
]);
if (QR_SECRET.length < 32) throw new Error('QR_SECRET debe tener al menos 32 caracteres');

const { createApp } = require('./app');
listen(createApp(), env('PORT', 4003), 'claims-service');
