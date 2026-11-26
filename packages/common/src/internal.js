// Seguridad entre servicios: solo el gateway (o otro servicio) conoce
// INTERNAL_API_KEY. Una petición directa a un servicio sin la clave se rechaza,
// aunque alguien descubra su URL pública en Render.
const crypto = require('node:crypto');
const { unauthorized, forbidden } = require('./errors');

function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function requireInternal(req, res, next) {
  const key = req.get('x-internal-key');
  if (!process.env.INTERNAL_API_KEY || !safeEqual(key, process.env.INTERNAL_API_KEY)) {
    return next(unauthorized('Acceso directo no permitido'));
  }
  next();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLES = new Set(['alumno', 'resguardo', 'admin']);

// Lee la identidad que el gateway ya verificó. Se usa después de requireInternal.
function requireUser(req, res, next) {
  const id = req.get('x-user-id');
  const rol = req.get('x-user-role');
  const auth = req.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!id || !UUID_RE.test(id) || !ROLES.has(rol) || !token) {
    return next(unauthorized());
  }
  req.user = { id, rol, email: req.get('x-user-email') || null, token };
  next();
}

const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) return next(forbidden());
    next();
  };

module.exports = { requireInternal, requireUser, requireRole, safeEqual, UUID_RE };
