const express = require('express');
const request = require('supertest');
const { requireInternal, requireUser, requireRole, safeEqual } = require('../src/internal');
const { errorHandler } = require('../src/errors');

process.env.INTERNAL_API_KEY = 'clave-interna-de-prueba';
const USER = '3f2b8c1e-7a4d-4c9e-9b1a-2d3e4f5a6b7c';

function app() {
  const a = express();
  a.get('/privado', requireInternal, requireUser, (req, res) => res.json(req.user));
  a.get('/admin', requireInternal, requireUser, requireRole('admin'), (req, res) => res.json({ ok: true }));
  a.use(errorHandler);
  return a;
}

describe('seguridad entre servicios', () => {
  test('safeEqual compara en tiempo constante', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual(undefined, 'x')).toBe(false);
  });

  test('rechaza peticiones sin clave interna', async () => {
    const res = await request(app()).get('/privado');
    expect(res.status).toBe(401);
  });

  test('rechaza clave interna incorrecta', async () => {
    const res = await request(app()).get('/privado').set('x-internal-key', 'otra');
    expect(res.status).toBe(401);
  });

  test('rechaza identidad mal formada', async () => {
    const res = await request(app())
      .get('/privado')
      .set('x-internal-key', process.env.INTERNAL_API_KEY)
      .set('x-user-id', 'no-es-uuid')
      .set('x-user-role', 'alumno')
      .set('authorization', 'Bearer t');
    expect(res.status).toBe(401);
  });

  test('acepta identidad válida del gateway', async () => {
    const res = await request(app())
      .get('/privado')
      .set('x-internal-key', process.env.INTERNAL_API_KEY)
      .set('x-user-id', USER)
      .set('x-user-role', 'alumno')
      .set('authorization', 'Bearer token123');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: USER, rol: 'alumno', token: 'token123' });
  });

  test('requireRole bloquea a quien no tiene el rol', async () => {
    const res = await request(app())
      .get('/admin')
      .set('x-internal-key', process.env.INTERNAL_API_KEY)
      .set('x-user-id', USER)
      .set('x-user-role', 'alumno')
      .set('authorization', 'Bearer t');
    expect(res.status).toBe(403);
  });
});
