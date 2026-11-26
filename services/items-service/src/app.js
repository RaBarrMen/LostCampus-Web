const express = require('express');
const {
  createService,
  requireInternal,
  requireUser,
  requireRole,
  validate,
  uuidParam,
  userClient,
  adminClient,
  signImages,
  fireAndForget,
  fromSupabase,
  badRequest,
  notFound,
  forbidden,
  BUCKET,
} = require('@lostcampus/common');
const schemas = require('./schemas');

const ITEM_FIELDS =
  'id, user_id, tipo, titulo, descripcion, category_id, color, zona, lat, lng, fecha, estado, image_path, en_resguardo, pregunta_verificacion, created_at, categories(nombre, icono), profiles(nombre)';

// Para búsquedas: solo letras, números y espacios (evita inyectar filtros de PostgREST)
const limpiarBusqueda = (q) => q.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

function createApp(env = process.env) {
  const app = createService('items-service');

  // ---------- Rutas internas (solo otros servicios / gateway) ----------
  app.get('/stats/public', requireInternal, async (req, res) => {
    const db = adminClient();
    const [total, devueltos] = await Promise.all([
      db.from('items').select('id', { count: 'exact', head: true }).neq('estado', 'oculto'),
      db.from('items').select('id', { count: 'exact', head: true }).eq('estado', 'devuelto'),
    ]);
    res.json({ reportes: total.count || 0, devueltos: devueltos.count || 0 });
  });

  // Todo lo demás necesita la identidad verificada por el gateway
  const api = express.Router();
  api.use(requireInternal, requireUser);

  // ---------- Categorías ----------
  api.get('/categories', async (req, res) => {
    const { data, error } = await userClient(req.user.token).from('categories').select('id, nombre, icono').order('id');
    if (error) throw fromSupabase(error);
    res.set('Cache-Control', 'private, max-age=300');
    res.json(data);
  });

  // ---------- Reportes ----------
  api.get('/items', validate(schemas.listQuery, 'query'), async (req, res) => {
    const { tipo, category_id, zona, estado, q, page, limit } = req.valid.query;
    let query = userClient(req.user.token)
      .from('items')
      .select(ITEM_FIELDS, { count: 'exact' })
      .eq('estado', estado)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    if (tipo) query = query.eq('tipo', tipo);
    if (category_id) query = query.eq('category_id', category_id);
    if (zona) query = query.eq('zona', zona);
    if (q) {
      const term = limpiarBusqueda(q);
      if (term) query = query.or(`titulo.ilike.%${term}%,descripcion.ilike.%${term}%`);
    }
    const { data, error, count } = await query;
    if (error) throw fromSupabase(error);
    await signImages(data);
    res.json({ data: data.map(publicItem), page, limit, total: count || 0 });
  });

  api.get('/items/mine', async (req, res) => {
    const { data, error } = await userClient(req.user.token)
      .from('items')
      .select(ITEM_FIELDS)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) throw fromSupabase(error);
    await signImages(data);
    res.json(data);
  });

  api.get('/items/:id', validate(uuidParam, 'params'), async (req, res) => {
    const { data, error } = await userClient(req.user.token)
      .from('items')
      .select(ITEM_FIELDS)
      .eq('id', req.valid.params.id)
      .maybeSingle();
    if (error) throw fromSupabase(error);
    if (!data) throw notFound('Reporte no encontrado');
    await signImages(data);
    const isOwner = data.user_id === req.user.id;
    res.json({ ...publicItem(data), es_mio: isOwner, pregunta_verificacion: data.pregunta_verificacion });
  });

  api.post('/items', validate(schemas.createItem), async (req, res) => {
    const body = req.valid.body;
    if (body.image_path && !body.image_path.startsWith(`${req.user.id}/`)) {
      throw badRequest('La imagen no pertenece a tu cuenta');
    }
    if (body.tipo === 'perdido') delete body.pregunta_verificacion;
    const { data, error } = await userClient(req.user.token)
      .from('items')
      .insert({ ...body, user_id: req.user.id })
      .select(ITEM_FIELDS)
      .single();
    if (error) throw fromSupabase(error, 'No se pudo crear el reporte');

    // El cálculo de coincidencias se hace en segundo plano
    fireAndForget(req.log, env.MATCHING_SERVICE_URL, '/internal/run', { body: { item_id: data.id }, requestId: req.id });

    await signImages(data);
    res.status(201).json(data);
  });

  api.patch('/items/:id', validate(uuidParam, 'params'), validate(schemas.updateItem), async (req, res) => {
    const { data, error } = await userClient(req.user.token)
      .from('items')
      .update(req.valid.body)
      .eq('id', req.valid.params.id)
      .eq('user_id', req.user.id)
      .select(ITEM_FIELDS)
      .maybeSingle();
    if (error) throw fromSupabase(error);
    if (!data) throw notFound('Reporte no encontrado o no es tuyo');
    await signImages(data);
    res.json(data);
  });

  api.delete('/items/:id', validate(uuidParam, 'params'), async (req, res) => {
    const id = req.valid.params.id;
    const isAdmin = req.user.rol === 'admin';
    const db = isAdmin ? adminClient() : userClient(req.user.token);

    const { data: item } = await db.from('items').select('id, user_id, image_path').eq('id', id).maybeSingle();
    if (!item) throw notFound('Reporte no encontrado');
    if (!isAdmin && item.user_id !== req.user.id) throw forbidden();

    const { error } = await db.from('items').delete().eq('id', id);
    if (error) throw fromSupabase(error);
    if (item.image_path) await adminClient().storage.from(BUCKET).remove([item.image_path]);
    res.status(204).end();
  });

  // ---------- Perfil ----------
  api.get('/profile', async (req, res) => {
    const { data, error } = await userClient(req.user.token)
      .from('profiles')
      .select('id, nombre, carrera, rol, avatar_url, created_at')
      .eq('id', req.user.id)
      .single();
    if (error) throw fromSupabase(error);
    res.json({ ...data, email: req.user.email });
  });

  api.patch('/profile', validate(schemas.updateProfile), async (req, res) => {
    const { data, error } = await userClient(req.user.token)
      .from('profiles')
      .update(req.valid.body)
      .eq('id', req.user.id)
      .select('id, nombre, carrera, rol, avatar_url')
      .single();
    if (error) throw fromSupabase(error);
    res.json(data);
  });

  // ---------- Administración ----------
  api.get('/admin/stats', requireRole('admin', 'resguardo'), async (req, res) => {
    const { data, error } = await adminClient()
      .from('items')
      .select('tipo, estado, zona, created_at, categories(nombre)')
      .neq('estado', 'oculto')
      .limit(10000);
    if (error) throw fromSupabase(error);
    res.json(buildStats(data));
  });

  api.get('/admin/items', requireRole('admin'), async (req, res) => {
    const { data, error } = await adminClient()
      .from('items')
      .select(ITEM_FIELDS)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw fromSupabase(error);
    await signImages(data);
    res.json(data);
  });

  api.patch('/admin/items/:id/hide', requireRole('admin'), validate(uuidParam, 'params'), async (req, res) => {
    const { data, error } = await adminClient()
      .from('items')
      .update({ estado: 'oculto' })
      .eq('id', req.valid.params.id)
      .select('id, estado')
      .maybeSingle();
    if (error) throw fromSupabase(error);
    if (!data) throw notFound();
    res.json(data);
  });

  app.use(api);
  return app.finish();
}

// No se envía la pregunta de verificación en los listados
function publicItem(it) {
  const { pregunta_verificacion, ...rest } = it;
  return rest;
}

function buildStats(rows) {
  const count = (fn) => rows.reduce((acc, r) => ((acc[fn(r)] = (acc[fn(r)] || 0) + 1), acc), {});
  const toList = (obj) => Object.entries(obj).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total);

  const porEstado = count((r) => r.estado);
  const total = rows.length;
  const devueltos = porEstado.devuelto || 0;
  const encontrados = rows.filter((r) => r.tipo === 'encontrado').length;

  // Reportes por día de los últimos 30 días
  const dias = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dias.push(d.toISOString().slice(0, 10));
  }
  const porDia = count((r) => r.created_at.slice(0, 10));

  return {
    total,
    devueltos,
    activos: porEstado.activo || 0,
    en_proceso: porEstado.en_proceso || 0,
    tasa_devolucion: encontrados ? Math.round((devueltos / encontrados) * 100) : 0,
    por_tipo: toList(count((r) => r.tipo)),
    por_estado: toList(porEstado),
    por_categoria: toList(count((r) => r.categories?.nombre || 'Sin categoría')),
    por_zona: toList(count((r) => r.zona)).slice(0, 8),
    por_dia: dias.map((fecha) => ({ fecha, total: porDia[fecha] || 0 })),
  };
}

module.exports = { createApp, buildStats, limpiarBusqueda };
