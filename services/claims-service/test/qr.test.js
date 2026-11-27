const jwt = require('jsonwebtoken');
const request = require('supertest');
const { createQrToken, verifyQrToken, sha256 } = require('../src/qr');
const { createApp } = require('../src/app');

const SECRET = 'a'.repeat(48);
const CLAIM = '3f2b8c1e-7a4d-4c9e-9b1a-2d3e4f5a6b7c';

describe('códigos QR de entrega', () => {
  test('genera y verifica un token válido', () => {
    const { token, jtiHash } = createQrToken(CLAIM, SECRET);
    const r = verifyQrToken(token, SECRET);
    expect(r.claimId).toBe(CLAIM);
    expect(r.jtiHash).toBe(jtiHash);
  });

  test('cada QR tiene un identificador distinto', () => {
    const a = createQrToken(CLAIM, SECRET);
    const b = createQrToken(CLAIM, SECRET);
    expect(a.jtiHash).not.toBe(b.jtiHash);
  });

  test('rechaza secretos cortos', () => {
    expect(() => createQrToken(CLAIM, 'corto')).toThrow();
  });

  test('rechaza un token firmado con otro secreto', () => {
    const { token } = createQrToken(CLAIM, SECRET);
    expect(() => verifyQrToken(token, 'b'.repeat(48))).toThrow('Código QR inválido');
  });

  test('rechaza un token alterado', () => {
    const { token } = createQrToken(CLAIM, SECRET);
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    payload.cid = '00000000-0000-4000-8000-000000000000';
    parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
    expect(() => verifyQrToken(parts.join('.'), SECRET)).toThrow('Código QR inválido');
  });

  test('rechaza tokens expirados', () => {
    const token = jwt.sign({ cid: CLAIM, exp: Math.floor(Date.now() / 1000) - 10 }, SECRET, {
      issuer: 'lostcampus-claims',
      audience: 'lostcampus-entrega',
      jwtid: 'x',
    });
    expect(() => verifyQrToken(token, SECRET)).toThrow('expiró');
  });

  test('rechaza el algoritmo "none"', () => {
    const token = jwt.sign({ cid: CLAIM }, null, { algorithm: 'none', issuer: 'lostcampus-claims', audience: 'lostcampus-entrega', jwtid: 'x' });
    expect(() => verifyQrToken(token, SECRET)).toThrow('Código QR inválido');
  });

  test('sha256 es determinista', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
    expect(sha256('abc')).toHaveLength(64);
  });
});

describe('claims-service HTTP', () => {
  process.env.INTERNAL_API_KEY = 'k';
  const app = createApp({ QR_SECRET: SECRET });
  const headers = {
    'x-internal-key': 'k',
    'x-user-id': CLAIM,
    'x-user-role': 'alumno',
    authorization: 'Bearer t',
  };

  test('bloquea acceso directo', async () => {
    expect((await request(app).get('/claims')).status).toBe(401);
  });

  test('valida el cuerpo antes de tocar la base de datos', async () => {
    const res = await request(app).post('/claims').set(headers).send({ item_id: 'x', respuesta: '' });
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  test('un QR inválido devuelve 400', async () => {
    const res = await request(app).post('/claims/verify-qr').set(headers).send({ token: 'esto-no-es-un-token-valido' });
    expect(res.status).toBe(400);
  });

  test('rechaza JSON mal formado', async () => {
    const res = await request(app).post('/claims').set(headers).set('content-type', 'application/json').send('{malo');
    expect(res.status).toBe(400);
  });
});
