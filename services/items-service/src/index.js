const { loadDotEnv, requireEnv, env, listen } = require('@lostcampus/common');

loadDotEnv();
requireEnv(['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'INTERNAL_API_KEY', 'MATCHING_SERVICE_URL']);

const { createApp } = require('./app');
listen(createApp(), env('PORT', 4001), 'items-service');
