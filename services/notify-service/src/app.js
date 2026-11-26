const express = require('express');
const {
  createService,
  requireInternal,
  requireUser,
  validate,
  uuidParam,
  userClient,
  adminClient,
  fromSupabase,
  notFound,
  z,
} = require('@lostcampus/common');
const { sendEmails } = require('./email');

const notificationSchema = z.object({
  user_id: z.uuid(),
  tipo: z.enum(['match', 'claim', 'claim_update', 'message', 'delivery', 'system']),
  titulo: z.string().min(1).max(120),
  cuerpo: z.string().max(300).default(''),
  link: z
    .string()
    .max(200)
    .regex(/^\/(?!\/)[a-zA-Z0-9/_-]*$/, 'El enlace debe ser una ruta interna')
    .optional(),
});

function createApp(env = process.env) {
  const app = createService('notify-service');

  // ---------- Interna: la usan los demás servicios ----------
  app.post(
    '/internal/notify',
    requireInternal,
    validate(z.object({ notifications: z.array(notificationSchema).min(1).max(50) })),
    async (req, res) => {
      const rows = req.valid.body.notifications;
      const { error } = await adminClient().from('notifications').insert(rows);
      if (error) throw fromSupabase(error);
      // El correo no bloquea la respuesta
      sendEmails(rows, env, req.log).catch(() => {});
      res.status(201).json({ created: rows.length });
    },
  );

  const api = express.Router();
  api.use(requireInternal, requireUser);

  api.get('/notifications', async (req, res) => {
    const db = userClient(req.user.token);
    const [list, unread] = await Promise.all([
      db
        .from('notifications')
        .select('id, tipo, titulo, cuerpo, link, leida, created_at')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(30),
      db.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', req.user.id).eq('leida', false),
    ]);
    if (list.error) throw fromSupabase(list.error);
    res.json({ data: list.data, sin_leer: unread.count || 0 });
  });

  api.patch('/notifications/:id/read', validate(uuidParam, 'params'), async (req, res) => {
    const { data, error } = await userClient(req.user.token)
      .from('notifications')
      .update({ leida: true })
      .eq('id', req.valid.params.id)
      .eq('user_id', req.user.id)
      .select('id, leida')
      .maybeSingle();
    if (error) throw fromSupabase(error);
    if (!data) throw notFound();
    res.json(data);
  });

  api.post('/notifications/read-all', async (req, res) => {
    const { error } = await userClient(req.user.token)
      .from('notifications')
      .update({ leida: true })
      .eq('user_id', req.user.id)
      .eq('leida', false);
    if (error) throw fromSupabase(error);
    res.json({ ok: true });
  });

  app.use(api);
  return app.finish();
}

module.exports = { createApp, notificationSchema };
