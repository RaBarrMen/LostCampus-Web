// Verifica el JWT de Supabase y obtiene el rol del usuario.
// Los resultados se guardan 60 s en memoria para no consultar a Supabase en cada petición.
const crypto = require('node:crypto');
const { adminClient, unauthorized, forbidden } = require('@lostcampus/common');

const TTL_MS = 60 * 1000;
const MAX_ENTRIES = 5000;
const cache = new Map();

const hash = (t) => crypto.createHash('sha256').update(t).digest('hex');

async function resolveUser(token, supabase = adminClient()) {
  const key = hash(token);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.user;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;

  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', data.user.id).single();
  if (!profile) return null;

  const user = { id: data.user.id, email: data.user.email, rol: profile.rol };
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(key, { user, expires: Date.now() + TTL_MS });
  return user;
}

function authenticate(resolver = resolveUser) {
  return async (req, res, next) => {
    const header = req.get('authorization') || '';
    if (!header.startsWith('Bearer ')) return next(unauthorized());
    const token = header.slice(7).trim();
    if (!token || token.length > 4096) return next(unauthorized());
    try {
      const user = await resolver(token);
      if (!user) return next(unauthorized('Sesión inválida o expirada'));
      if (user.blocked) return next(forbidden('Cuenta bloqueada'));
      req.user = { ...user, token };
      next();
    } catch (err) {
      next(err);
    }
  };
}

function clearCache() {
  cache.clear();
}

module.exports = { authenticate, resolveUser, clearCache };
