// Códigos QR de entrega.
// El QR contiene un JWT firmado con QR_SECRET que expira en 24 h.
// Solo se guarda el hash de su identificador (jti) en la base de datos:
//   - generar un QR nuevo invalida el anterior
//   - al entregarse, el hash se borra y el QR ya no sirve (un solo uso)
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const ISSUER = 'lostcampus-claims';
const AUDIENCE = 'lostcampus-entrega';
const EXPIRES = '24h';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function createQrToken(claimId, secret) {
  if (!secret || secret.length < 32) throw new Error('QR_SECRET debe tener al menos 32 caracteres');
  const jti = crypto.randomBytes(16).toString('hex');
  const token = jwt.sign({ cid: claimId }, secret, {
    algorithm: 'HS256',
    expiresIn: EXPIRES,
    issuer: ISSUER,
    audience: AUDIENCE,
    jwtid: jti,
  });
  return { token, jtiHash: sha256(jti) };
}

// Devuelve { claimId, jtiHash } o lanza un error con mensaje para el usuario
function verifyQrToken(token, secret) {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE });
    if (!payload.cid || !payload.jti) throw new Error('incompleto');
    return { claimId: payload.cid, jtiHash: sha256(payload.jti) };
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new Error('El código QR expiró, pide uno nuevo');
    throw new Error('Código QR inválido');
  }
}

module.exports = { createQrToken, verifyQrToken, sha256 };
