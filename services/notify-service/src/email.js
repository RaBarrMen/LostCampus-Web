// Envío opcional de correos con Resend (https://resend.com, plan gratuito).
// Si RESEND_API_KEY no está configurada, simplemente no se envían correos.
const { adminClient } = require('@lostcampus/common');

const escapeHtml = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function sendEmails(notifications, env, log) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return 0;
  // Solo se mandan por correo los avisos importantes
  const important = notifications.filter((n) => ['match', 'claim', 'delivery'].includes(n.tipo));
  let sent = 0;
  for (const n of important) {
    try {
      const { data } = await adminClient().auth.admin.getUserById(n.user_id);
      const to = data?.user?.email;
      if (!to) continue;
      const link = env.APP_URL && n.link ? `${env.APP_URL}${n.link}` : env.APP_URL;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to,
          subject: `LostCampus · ${n.titulo}`,
          html: `<div style="font-family:sans-serif;max-width:480px">
            <h2 style="color:#1B2A4A">${escapeHtml(n.titulo)}</h2>
            <p>${escapeHtml(n.cuerpo)}</p>
            ${link ? `<p><a href="${escapeHtml(link)}" style="background:#F59E0B;color:#111;padding:10px 16px;border-radius:8px;text-decoration:none">Abrir LostCampus</a></p>` : ''}
          </div>`,
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) sent++;
    } catch (err) {
      log?.warn({ err: err.message }, 'No se pudo enviar el correo');
    }
  }
  return sent;
}

module.exports = { sendEmails, escapeHtml };
