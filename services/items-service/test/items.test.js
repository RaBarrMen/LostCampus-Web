const request = require('supertest');
const { createItem, updateItem, listQuery } = require('../src/schemas');
const { createApp, buildStats, limpiarBusqueda } = require('../src/app');

const hoy = new Date().toISOString().slice(0, 10);
const base = {
  tipo: 'encontrado',
  titulo: 'Cartera negra de piel',
  category_id: 2,
  color: 'negro',
  zona: 'Biblioteca',
  fecha: hoy,
  pregunta_verificacion: '¿Qué credencial tenía dentro?',
};

describe('validación de reportes', () => {
  test('acepta un reporte válido', () => {
    expect(() => createItem.parse(base)).not.toThrow();
  });

  test('exige pregunta de verificación en objetos encontrados', () => {
    const { pregunta_verificacion, ...sin } = base;
    expect(() => createItem.parse(sin)).toThrow();
    expect(() => createItem.parse({ ...sin, tipo: 'perdido' })).not.toThrow();
  });

  test('rechaza fechas futuras', () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    expect(() => createItem.parse({ ...base, fecha: d.toISOString().slice(0, 10) })).toThrow();
  });

  test('rechaza ubicaciones fuera del campus', () => {
    expect(() => createItem.parse({ ...base, lat: 19.4326, lng: -99.1332 })).toThrow();
  });

  test('rechaza campos no permitidos (asignación masiva)', () => {
    expect(() => createItem.parse({ ...base, user_id: 'otro', estado: 'devuelto' })).toThrow();
  });

  test('rechaza rutas de imagen manipuladas', () => {
    expect(() => createItem.parse({ ...base, image_path: '../../etc/passwd' })).toThrow();
  });

  test('limpia espacios y caracteres de control', () => {
    const r = createItem.parse({ ...base, titulo: '  Cartera \u0000  negra  ' });
    expect(r.titulo).toBe('Cartera negra');
  });

  test('update solo permite estados activo y cerrado', () => {
    expect(() => updateItem.parse({ estado: 'devuelto' })).toThrow();
    expect(() => updateItem.parse({ estado: 'cerrado' })).not.toThrow();
    expect(() => updateItem.parse({})).toThrow();
  });

  test('limita la paginación', () => {
    expect(() => listQuery.parse({ limit: '1000' })).toThrow();
    expect(listQuery.parse({}).limit).toBe(24);
  });
});

describe('utilidades', () => {
  test('limpiarBusqueda elimina caracteres de filtros PostgREST', () => {
    expect(limpiarBusqueda('cartera),user_id.eq.(x')).toBe('cartera user id eq x');
    expect(limpiarBusqueda('Cálculo II')).toBe('Cálculo II');
  });

  test('buildStats calcula la tasa de devolución', () => {
    const now = new Date().toISOString();
    const rows = [
      { tipo: 'encontrado', estado: 'devuelto', zona: 'Biblioteca', created_at: now, categories: { nombre: 'Llaves' } },
      { tipo: 'encontrado', estado: 'activo', zona: 'Cafetería', created_at: now, categories: { nombre: 'Llaves' } },
      { tipo: 'perdido', estado: 'activo', zona: 'Cafetería', created_at: now, categories: { nombre: 'Ropa' } },
    ];
    const s = buildStats(rows);
    expect(s.total).toBe(3);
    expect(s.tasa_devolucion).toBe(50);
    expect(s.por_categoria[0]).toEqual({ nombre: 'Llaves', total: 2 });
    expect(s.por_dia).toHaveLength(30);
    expect(s.por_dia[29].total).toBe(3);
  });
});

describe('seguridad HTTP', () => {
  process.env.INTERNAL_API_KEY = 'k';
  const app = createApp({ MATCHING_SERVICE_URL: 'http://localhost:1' });

  test('health es público', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
  });

  test('no se puede llamar al servicio sin pasar por el gateway', async () => {
    expect((await request(app).get('/items')).status).toBe(401);
    expect((await request(app).get('/stats/public')).status).toBe(401);
  });

  test('responde 404 en JSON para rutas desconocidas', async () => {
    const res = await request(app)
      .get('/no-existe')
      .set('x-internal-key', 'k')
      .set('x-user-id', '3f2b8c1e-7a4d-4c9e-9b1a-2d3e4f5a6b7c')
      .set('x-user-role', 'alumno')
      .set('authorization', 'Bearer t');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
