const express = require('express');
const {
  createService,
  requireInternal,
  requireUser,
  validate,
  uuidParam,
  adminClient,
  signImages,
  fireAndForget,
  fromSupabase,
  notFound,
  forbidden,
  z,
} = require('@lostcampus/common');
const { scoreMatch, isMatch, MAX_DAYS } = require('./scoring');

const ITEM_FIELDS = 'id, user_id, tipo, titulo, descripcion, category_id, color, zona, lat, lng, fecha, estado, image_path, en_resguardo';

function shiftDate(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Busca candidatos del tipo contrario y guarda las coincidencias
async function runMatching(itemId, { log, notifyUrl, requestId } = {}) {
  const db = adminClient();
  const { data: item, error } = await db.from('items').select(ITEM_FIELDS).eq('id', itemId).maybeSingle();
  if (error) throw fromSupabase(error);
  if (!item || item.estado !== 'activo') return [];

  const otherType = item.tipo === 'perdido' ? 'encontrado' : 'perdido';
  const { data: candidates, error: e2 } = await db
    .from('items')
    .select(ITEM_FIELDS)
    .eq('tipo', otherType)
    .eq('estado', 'activo')
    .neq('user_id', item.user_id)
    .gte('fecha', shiftDate(item.fecha, -MAX_DAYS))
    .lte('fecha', shiftDate(item.fecha, MAX_DAYS))
    .limit(500);
  if (e2) throw fromSupabase(e2);

  const results = [];
  for (const c of candidates) {
    const [lost, found] = item.tipo === 'perdido' ? [item, c] : [c, item];
    const { score } = scoreMatch(lost, found);
    if (isMatch(score)) results.push({ lost, found, score });
  }
  if (!results.length) return [];

  const rows = results.map((r) => ({ lost_item_id: r.lost.id, found_item_id: r.found.id, score: r.score }));
  const { data: saved, error: e3 } = await db
    .from('matches')
    .upsert(rows, { onConflict: 'lost_item_id,found_item_id', ignoreDuplicates: true })
    .select('id, lost_item_id, found_item_id, score');
  if (e3) throw fromSupabase(e3);

  // Avisar a los dueños de los objetos perdidos (y al que reportó, si es uno solo)
  if (notifyUrl && saved?.length) {
    const notifications = results
      .filter((r) => saved.some((s) => s.lost_item_id === r.lost.id && s.found_item_id === r.found.id))
      .map((r) => ({
        user_id: r.lost.user_id,
        tipo: 'match',
        titulo: `Posible coincidencia con "${r.lost.titulo}"`,
        cuerpo: `Alguien encontró "${r.found.titulo}" en ${r.found.zona} (${r.score}% de coincidencia).`,
        link: `/objeto/${r.found.id}`,
      }));
    fireAndForget(log, notifyUrl, '/internal/notify', { body: { notifications }, requestId });
  }
  return saved || [];
}

function createApp(env = process.env) {
  const app = createService('matching-service');

  // ---------- Interna: la llama items-service al crear un reporte ----------
  app.post('/internal/run', requireInternal, validate(z.object({ item_id: z.uuid() })), async (req, res) => {
    const saved = await runMatching(req.valid.body.item_id, {
      log: req.log,
      notifyUrl: env.NOTIFY_SERVICE_URL,
      requestId: req.id,
    });
    res.json({ matches: saved.length });
  });

  const api = express.Router();
  api.use(requireInternal, requireUser);

  // Coincidencias de un reporte propio
  api.get('/matches', validate(z.object({ item_id: z.uuid() }), 'query'), async (req, res) => {
    const db = adminClient();
    const itemId = req.valid.query.item_id;
    const { data: item } = await db.from('items').select('id, user_id, tipo').eq('id', itemId).maybeSingle();
    if (!item) throw notFound('Reporte no encontrado');
    if (item.user_id !== req.user.id) throw forbidden('Solo el autor del reporte ve sus coincidencias');

    const own = item.tipo === 'perdido' ? 'lost_item_id' : 'found_item_id';
    const other = item.tipo === 'perdido' ? 'found' : 'lost';
    const { data, error } = await db
      .from('matches')
      .select(
        `id, score, estado, created_at, lost:items!matches_lost_item_id_fkey(${ITEM_FIELDS}), found:items!matches_found_item_id_fkey(${ITEM_FIELDS})`,
      )
      .eq(own, itemId)
      .neq('estado', 'descartado')
      .order('score', { ascending: false })
      .limit(10);
    if (error) throw fromSupabase(error);

    const list = data
      .filter((m) => m[other] && m[other].estado === 'activo')
      .map((m) => ({ id: m.id, score: m.score, estado: m.estado, created_at: m.created_at, item: m[other] }));
    await signImages(list.map((m) => m.item));
    res.json(list);
  });

  // Recalcular manualmente (botón "Buscar coincidencias")
  api.post('/matches/run', validate(z.object({ item_id: z.uuid() })), async (req, res) => {
    const { data: item } = await adminClient().from('items').select('user_id').eq('id', req.valid.body.item_id).maybeSingle();
    if (!item) throw notFound('Reporte no encontrado');
    if (item.user_id !== req.user.id) throw forbidden();
    const saved = await runMatching(req.valid.body.item_id, { log: req.log, notifyUrl: env.NOTIFY_SERVICE_URL, requestId: req.id });
    res.json({ nuevas: saved.length });
  });

  // Descartar una coincidencia
  api.patch('/matches/:id', validate(uuidParam, 'params'), validate(z.object({ estado: z.literal('descartado') }).strict()), async (req, res) => {
    const db = adminClient();
    const { data: m } = await db
      .from('matches')
      .select('id, lost:items!matches_lost_item_id_fkey(user_id), found:items!matches_found_item_id_fkey(user_id)')
      .eq('id', req.valid.params.id)
      .maybeSingle();
    if (!m) throw notFound();
    if (![m.lost?.user_id, m.found?.user_id].includes(req.user.id)) throw forbidden();
    const { error } = await db.from('matches').update({ estado: 'descartado' }).eq('id', m.id);
    if (error) throw fromSupabase(error);
    res.json({ id: m.id, estado: 'descartado' });
  });

  app.use(api);
  return app.finish();
}

module.exports = { createApp, runMatching };
