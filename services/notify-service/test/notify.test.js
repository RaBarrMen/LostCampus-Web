const request = require('supertest');
const { createApp, notificationSchema } = require('../src/app');
const { escapeHtml } = require('../src/email');

const USER = '3f2b8c1e-7a4d-4c9e-9b1a-2d3e4f5a6b7c';

describe('notificaciones', () => {
  test('acepta una notificación válida', () => {
    expect(() => notificationSchema.parse({ user_id: USER, tipo: 'match', titulo: 'Hola', link: '/objeto/abc' })).not.toThrow();
  });

  test('bloquea enlaces externos (evita redirecciones a sitios maliciosos)', () => {
    expect(() => notificationSchema.parse({ user_id: USER, tipo: 'match', titulo: 'x', link: 'https://malicioso.com' })).toThrow();
    expect(() => notificationSchema.parse({ user_id: USER, tipo: 'match', titulo: 'x', link: '//malicioso.com' })).toThrow();
  });

  test('rechaza tipos desconocidos', () => {
    expect(() => notificationSchema.parse({ user_id: USER, tipo: 'spam', titulo: 'x' })).toThrow();
  });

  test('escapa HTML en correos', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });

  test('solo los servicios internos pueden crear notificaciones', async () => {
    process.env.INTERNAL_API_KEY = 'k';
    const app = createApp({});
    const res = await request(app).post('/internal/notify').send({ notifications: [] });
    expect(res.status).toBe(401);
  });
});
