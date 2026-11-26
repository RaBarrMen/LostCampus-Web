const { createClient } = require('@supabase/supabase-js');

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
let admin;

// Cliente con service role: salta RLS. Solo se usa para operaciones
// que el servicio ya validó (notificaciones a otros usuarios, matching, etc.).
function adminClient() {
  if (!admin) {
    admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, opts);
  }
  return admin;
}

// Cliente con el JWT del usuario: todas las consultas pasan por las
// políticas RLS de la base de datos (defensa en profundidad).
function userClient(token) {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    ...opts,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

module.exports = { adminClient, userClient };
