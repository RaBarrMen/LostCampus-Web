const http = require('node:http');
const request = require('supertest');
const { createApp } = require('../src/app');

const USER = { id: '3f2b8c1e-7a4d-4c9e-9b1a-2d3e4f5a6b7c', email: 'a@celaya.tecnm.mx', rol: 'alumno' };

// Servicio falso que devuelve lo que recibió, para revisar qué reenvía el gateway
let upstream;
let upstreamUrl;
beforeAll(async () => {
  upstream = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ url: req.url, method: req.method, headers: req.headers, body }));
    });
  });
  await new Promise((r) => upstream.listen(0, r));
  upstreamUrl = `http://127.0.0.1:${upstream.address().port}`;
});
afterAll(() => upstream.close());

function app(overrides = {}) {
  const env = {
    INTERNAL_API_KEY: 'clave-interna',
    ITEMS_SERVICE_URL: upstreamUrl,
    MATCHING_SERVICE_URL: upstreamUrl,
    CLAIMS_SERVICE_URL: upstreamUrl,
    NOTIFY_SERVICE_URL: upstreamUrl,
    CORS_ORIGINS: 'http://localhost:3000',
    ...overrides,
  };
  const resolver = async (token) => (token === 'valido' ? USER : null);
  return createApp(env, { resolver });
}

describe('api-gateway', () => {
  test('health responde sin autenticación', async () => {
    const res = await request(app()).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('rechaza rutas protegidas sin token', async () => {
    const res = await request(app()).get('/api/v1/items');
    expect(res.status).toBe(401);
  });

  test('rechaza tokens inválidos', async () => {
    const res = await request(app()).get('/api/v1/items').set('Authorization', 'Bearer falso');
    expect(res.status).toBe(401);
  });

  test('reenvía con identidad verificada y clave interna', async () => {
    const res = await request(app()).get('/api/v1/items/123?tipo=perdido').set('Authorization', 'Bearer valido');
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('/items/123?tipo=perdido');
    expect(res.body.headers['x-internal-key']).toBe('clave-interna');
    expect(res.body.headers['x-user-id']).toBe(USER.id);
    expect(res.body.headers['x-user-role']).toBe('alumno');
  });

  test('ignora encabezados de identidad falsificados por el cliente', async () => {
    const res = await request(app())
      .get('/api/v1/claims')
      .set('Authorization', 'Bearer valido')
      .set('x-user-role', 'admin')
      .set('x-user-id', '00000000-0000-4000-8000-000000000000')
      .set('x-internal-key', 'intento');
    expect(res.body.headers['x-user-role']).toBe('alumno');
    expect(res.body.headers['x-user-id']).toBe(USER.id);
    expect(res.body.headers['x-internal-key']).toBe('clave-interna');
  });

  test('reenvía el cuerpo JSON intacto', async () => {
    const res = await request(app())
      .post('/api/v1/items')
      .set('Authorization', 'Bearer valido')
      .send({ titulo: 'Cartera negra' });
    expect(res.body.method).toBe('POST');
    expect(JSON.parse(res.body.body)).toEqual({ titulo: 'Cartera negra' });
  });

  test('CORS solo permite el origen configurado', async () => {
    const ok = await request(app()).options('/api/v1/items').set('Origin', 'http://localhost:3000').set('Access-Control-Request-Method', 'GET');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    const bad = await request(app()).options('/api/v1/items').set('Origin', 'https://malicioso.com').set('Access-Control-Request-Method', 'GET');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('aplica rate limit', async () => {
    const a = app({ RATE_LIMIT_PER_MIN: '3' });
    for (let i = 0; i < 3; i++) await request(a).get('/api/v1/health');
    const res = await request(a).get('/api/v1/health');
    expect(res.status).toBe(429);
  });

  test('envía cabeceras de seguridad', async () => {
    const res = await request(app()).get('/api/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });
});
