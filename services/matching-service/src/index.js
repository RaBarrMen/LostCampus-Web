const { loadDotEnv, requireEnv, env, listen } = require('@lostcampus/common');

loadDotEnv();
requireEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'INTERNAL_API_KEY', 'NOTIFY_SERVICE_URL']);

const { createApp } = require('./app');
listen(createApp(), env('PORT', 4002), 'matching-service');
