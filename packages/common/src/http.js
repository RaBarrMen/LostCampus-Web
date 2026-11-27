// Cliente HTTP para llamadas entre servicios (con clave interna y timeout).
async function callService(baseUrl, path, { method = 'POST', body, user, requestId, timeoutMs = 5000 } = {}) {
  const headers = {
    'content-type': 'application/json',
    'x-internal-key': process.env.INTERNAL_API_KEY,
  };
  if (requestId) headers['x-request-id'] = requestId;
  if (user) {
    headers['x-user-id'] = user.id;
    headers['x-user-role'] = user.rol;
    headers.authorization = `Bearer ${user.token}`;
  }
  const res = await fetch(new URL(path, baseUrl), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(`Servicio ${baseUrl}${path} respondió ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Llamada "dispara y olvida": si el otro servicio falla no se rompe la petición original.
function fireAndForget(log, ...args) {
  const p = callService(...args).catch((err) => log?.warn({ err: err.message }, 'Llamada a servicio falló'));
  if (process.env.VERCEL) {
    try {
      require('@vercel/functions').waitUntil(p);
    } catch {}
  }
}
module.exports = { callService, fireAndForget };
