const express = require('express');
const {
  createService,
  requireInternal,
  requireUser,
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
  conflict,
  z,
} = require('@lostcampus/common');
const { createQrToken, verifyQrToken } = require('./qr');

const MAX_ATTEMPTS = 2; // intentos de reclamo por usuario y objeto

const texto = (min, max) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim())
    .pipe(z.string().min(min, `Mínimo ${min} caracteres`).max(max, `Máximo ${max} caracteres`));

const CLAIM_FIELDS =
  'id, item_id, claimant_id, respuesta, estado, delivered_at, created_at, updated_at, claimant:profiles!claims_claimant_id_fkey(nombre), item:items(id, user_id, titulo, zona, estado, image_path, en_resguardo, pregunta_verificacion, owner:profiles(nombre))';

function createApp(env = process.env) {
  const app = createService('claims-service');
  const api = express.Router();
  api.use(requireInternal, requireUser);

  const notify = (req, notifications) =>
    fireAndForget(req.log, env.NOTIFY_SERVICE_URL, '/internal/notify', { body: { notifications }, requestId: req.id });

  // Carga un reclamo y verifica que el usuario participe en él
  async function loadClaim(req, id, { allowStaff = true } = {}) {
    const { data, error } = await adminClient().from('claims').select(CLAIM_FIELDS).eq('id', id).maybeSingle();
    if (error) throw fromSupabase(error);
    if (!data) throw notFound('Reclamo no encontrado');
    const isClaimant = data.claimant_id === req.user.id;
    const isFinder = data.item?.user_id === req.user.id;
    const isStaff = allowStaff && ['admin', 'resguardo'].includes(req.user.rol);
    if (!isClaimant && !isFinder && !isStaff) throw forbidden();
    return { claim: data, isClaimant, isFinder, isStaff };
  }

  // Quita datos que la otra parte no debe ver
  function present(claim, { isClaimant }) {
    const out = { ...claim, item: { ...claim.item } };
    out.rol_en_reclamo = isClaimant ? 'reclamante' : 'encontro';
    return out;
  }

  // ---------- Crear reclamo ----------
  api.post(
    '/claims',
    validate(z.object({ item_id: z.uuid(), respuesta: texto(2, 300) }).strict()),
    async (req, res) => {
      const { item_id, respuesta } = req.valid.body;
      const db = adminClient();

      const { data: item } = await db.from('items').select('id, user_id, tipo, estado, titulo').eq('id', item_id).maybeSingle();
      if (!item) throw notFound('Objeto no encontrado');
      if (item.tipo !== 'encontrado') throw badRequest('Solo se pueden reclamar objetos encontrados');
      if (item.estado !== 'activo') throw conflict('Este objeto ya está en proceso de entrega');
      if (item.user_id === req.user.id) throw badRequest('No puedes reclamar un objeto que tú reportaste');

      const { count } = await db
        .from('claims')
        .select('id', { count: 'exact', head: true })
        .eq('item_id', item_id)
        .eq('claimant_id', req.user.id);
      if ((count || 0) >= MAX_ATTEMPTS) throw forbidden('Ya alcanzaste el límite de intentos para este objeto');

      // Inserción con el cliente del usuario: la política RLS vuelve a validar todo
      const { data, error } = await userClient(req.user.token)
        .from('claims')
        .insert({ item_id, claimant_id: req.user.id, respuesta })
        .select('id, estado, created_at')
        .single();
      if (error) throw fromSupabase(error, 'No se pudo crear el reclamo');

      notify(req, [
        {
          user_id: item.user_id,
          tipo: 'claim',
          titulo: 'Alguien reclamó un objeto que reportaste',
          cuerpo: `Revisa la respuesta de verificación de "${item.titulo}".`,
          link: `/reclamos/${data.id}`,
        },
      ]);
      res.status(201).json(data);
    },
  );

  // ---------- Mis reclamos (los que hice y los que recibí) ----------
  api.get('/claims', async (req, res) => {
    const db = userClient(req.user.token);
    const [hechos, recibidos] = await Promise.all([
      db.from('claims').select(CLAIM_FIELDS).eq('claimant_id', req.user.id).order('created_at', { ascending: false }),
      db
        .from('claims')
        .select(CLAIM_FIELDS.replace('item:items(', 'item:items!inner('))
        .eq('item.user_id', req.user.id)
        .order('created_at', { ascending: false }),
    ]);
    if (hechos.error) throw fromSupabase(hechos.error);
    if (recibidos.error) throw fromSupabase(recibidos.error);
    await signImages([...hechos.data, ...recibidos.data].map((c) => c.item));
    res.json({
      hechos: hechos.data.map((c) => present(c, { isClaimant: true })),
      recibidos: recibidos.data.map((c) => present(c, { isClaimant: false })),
    });
  });

  api.get('/claims/:id', validate(uuidParam, 'params'), async (req, res) => {
    const ctx = await loadClaim(req, req.valid.params.id);
    await signImages(ctx.claim.item);
    res.json(present(ctx.claim, ctx));
  });

  // ---------- Aprobar / rechazar (quien encontró el objeto) ----------
  api.patch(
    '/claims/:id',
    validate(uuidParam, 'params'),
    validate(z.object({ accion: z.enum(['aprobar', 'rechazar', 'cancelar']) }).strict()),
    async (req, res) => {
      const { claim, isClaimant, isFinder } = await loadClaim(req, req.valid.params.id, { allowStaff: false });
      const { accion } = req.valid.body;
      const db = adminClient();

      if (accion === 'cancelar') {
        if (!isClaimant) throw forbidden('Solo quien hizo el reclamo puede cancelarlo');
        if (!['pendiente', 'aprobado'].includes(claim.estado)) throw conflict('El reclamo ya no se puede cancelar');
        await update(db, claim.id, claim.estado, { estado: 'cancelado', qr_jti_hash: null });
        if (claim.estado === 'aprobado') await db.from('items').update({ estado: 'activo' }).eq('id', claim.item_id);
        notify(req, [{ user_id: claim.item.user_id, tipo: 'claim_update', titulo: 'Un reclamo fue cancelado', cuerpo: claim.item.titulo, link: `/objeto/${claim.item_id}` }]);
        return res.json({ id: claim.id, estado: 'cancelado' });
      }

      if (!isFinder) throw forbidden('Solo quien encontró el objeto puede responder el reclamo');
      if (claim.estado !== 'pendiente') throw conflict('Este reclamo ya fue respondido');

      if (accion === 'rechazar') {
        await update(db, claim.id, 'pendiente', { estado: 'rechazado' });
        notify(req, [
          { user_id: claim.claimant_id, tipo: 'claim_update', titulo: 'Tu reclamo fue rechazado', cuerpo: `La respuesta no coincidió para "${claim.item.titulo}".`, link: `/reclamos/${claim.id}` },
        ]);
        return res.json({ id: claim.id, estado: 'rechazado' });
      }

      // Aprobar: el objeto pasa a "en proceso" y los demás reclamos pendientes se rechazan
      if (claim.item.estado !== 'activo') throw conflict('El objeto ya tiene otro reclamo aprobado');
      await update(db, claim.id, 'pendiente', { estado: 'aprobado' });
      await db.from('items').update({ estado: 'en_proceso' }).eq('id', claim.item_id);
      const { data: otros } = await db
        .from('claims')
        .update({ estado: 'rechazado' })
        .eq('item_id', claim.item_id)
        .eq('estado', 'pendiente')
        .select('claimant_id');

      notify(req, [
        {
          user_id: claim.claimant_id,
          tipo: 'claim_update',
          titulo: '¡Tu reclamo fue aprobado!',
          cuerpo: `Genera tu código QR para recoger "${claim.item.titulo}".`,
          link: `/reclamos/${claim.id}`,
        },
        ...(otros || []).map((o) => ({
          user_id: o.claimant_id,
          tipo: 'claim_update',
          titulo: 'Tu reclamo fue rechazado',
          cuerpo: `"${claim.item.titulo}" fue entregado a otra persona.`,
          link: '/reclamos',
        })),
      ]);
      res.json({ id: claim.id, estado: 'aprobado' });
    },
  );

  // ---------- Chat ----------
  api.get('/claims/:id/messages', validate(uuidParam, 'params'), async (req, res) => {
    await loadClaim(req, req.valid.params.id, { allowStaff: false });
    const { data, error } = await userClient(req.user.token)
      .from('messages')
      .select('id, claim_id, sender_id, contenido, created_at, sender:profiles(nombre)')
      .eq('claim_id', req.valid.params.id)
      .order('created_at')
      .limit(200);
    if (error) throw fromSupabase(error);
    res.json(data);
  });

  api.post(
    '/claims/:id/messages',
    validate(uuidParam, 'params'),
    validate(z.object({ contenido: texto(1, 1000) }).strict()),
    async (req, res) => {
      const { claim, isClaimant } = await loadClaim(req, req.valid.params.id, { allowStaff: false });
      if (!['pendiente', 'aprobado'].includes(claim.estado)) throw conflict('El chat de este reclamo está cerrado');
      const { data, error } = await userClient(req.user.token)
        .from('messages')
        .insert({ claim_id: claim.id, sender_id: req.user.id, contenido: req.valid.body.contenido })
        .select('id, claim_id, sender_id, contenido, created_at')
        .single();
      if (error) throw fromSupabase(error, 'No se pudo enviar el mensaje');
      const to = isClaimant ? claim.item.user_id : claim.claimant_id;
      notify(req, [{ user_id: to, tipo: 'message', titulo: 'Nuevo mensaje', cuerpo: req.valid.body.contenido.slice(0, 120), link: `/reclamos/${claim.id}` }]);
      res.status(201).json(data);
    },
  );

  // ---------- QR de entrega ----------
  api.get('/claims/:id/qr', validate(uuidParam, 'params'), async (req, res) => {
    const { claim, isClaimant } = await loadClaim(req, req.valid.params.id, { allowStaff: false });
    if (!isClaimant) throw forbidden('Solo el dueño del objeto puede generar el QR');
    if (claim.estado !== 'aprobado') throw conflict('El reclamo debe estar aprobado para generar el QR');

    const { token, jtiHash } = createQrToken(claim.id, env.QR_SECRET);
    const { error } = await adminClient().from('claims').update({ qr_jti_hash: jtiHash }).eq('id', claim.id).eq('estado', 'aprobado');
    if (error) throw fromSupabase(error);
    res.set('Cache-Control', 'no-store');
    res.json({ token, expira_en_horas: 24 });
  });

  api.post('/claims/verify-qr', validate(z.object({ token: z.string().min(20).max(2000) }).strict()), async (req, res) => {
    let decoded;
    try {
      decoded = verifyQrToken(req.valid.body.token, env.QR_SECRET);
    } catch (err) {
      throw badRequest(err.message);
    }
    const db = adminClient();
    const { data: claim } = await db.from('claims').select(CLAIM_FIELDS).eq('id', decoded.claimId).maybeSingle();
    if (!claim) throw badRequest('Código QR inválido');

    const isStaff = ['admin', 'resguardo'].includes(req.user.rol);
    const isFinder = claim.item?.user_id === req.user.id;
    if (!isStaff && !isFinder) throw forbidden('Solo el resguardo o quien encontró el objeto puede validar la entrega');

    // Actualización atómica: solo funciona una vez y con el QR más reciente
    const { data: updated, error } = await db
      .from('claims')
      .update({ estado: 'entregado', delivered_at: new Date().toISOString(), delivered_by: req.user.id, qr_jti_hash: null })
      .eq('id', claim.id)
      .eq('estado', 'aprobado')
      .eq('qr_jti_hash', decoded.jtiHash)
      .select('id')
      .maybeSingle();
    if (error) throw fromSupabase(error);
    if (!updated) throw conflict('Este código QR ya se usó o fue reemplazado por uno nuevo');

    await db.from('items').update({ estado: 'devuelto' }).eq('id', claim.item_id);
    // Las coincidencias con el reporte de pérdida del dueño se marcan como confirmadas
    await db.from('matches').update({ estado: 'confirmado' }).eq('found_item_id', claim.item_id);

    notify(req, [
      { user_id: claim.claimant_id, tipo: 'delivery', titulo: '¡Objeto entregado!', cuerpo: `Recuperaste "${claim.item.titulo}". ¡Gracias por usar LostCampus!`, link: `/reclamos/${claim.id}` },
      ...(isFinder ? [] : [{ user_id: claim.item.user_id, tipo: 'delivery', titulo: 'El objeto que encontraste fue entregado', cuerpo: `"${claim.item.titulo}" regresó a su dueño. ¡Gracias!`, link: `/objeto/${claim.item_id}` }]),
    ]);

    res.json({
      ok: true,
      claim_id: claim.id,
      objeto: claim.item.titulo,
      entregado_a: claim.claimant?.nombre || 'Usuario',
    });
  });

  app.use(api);
  return app.finish();
}

// Cambia el estado solo si sigue en el estado esperado (evita condiciones de carrera)
async function update(db, id, expected, values) {
  const { data, error } = await db.from('claims').update(values).eq('id', id).eq('estado', expected).select('id').maybeSingle();
  if (error) throw fromSupabase(error);
  if (!data) throw conflict('El reclamo cambió mientras lo editabas, recarga la página');
  return data;
}

module.exports = { createApp };
