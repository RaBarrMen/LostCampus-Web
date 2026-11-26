const fs = require('node:fs');
const path = require('node:path');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const { createService, callService } = require('@lostcampus/common');
const { authenticate } = require('./auth');
const buildRoutes = require('./routes');

const IDENTITY_HEADERS = ['x-user-id', 'x-user-role', 'x-user-email', 'x-internal-key'];

function createApp(env = process.env, { resolver } = {}) {
  // El gateway NO parsea el cuerpo (lo reenvía tal cual al servicio)
  const app = createService('api-gateway', { jsonLimit: false });

  const origins = (env.CORS_ORIGINS || 'http://localhost:3000').split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || origins.includes(origin)),
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );

  // Límite general por IP y uno más estricto para escrituras
  app.use(
    '/api',
    rateLimit({ windowMs: 60 * 1000, limit: Number(env.RATE_LIMIT_PER_MIN || 100), standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiadas peticiones, intenta en un minuto' } }),
  );
  const writeLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: Number(env.WRITE_LIMIT_PER_MIN || 30),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: (req) => req.method === 'GET',
    message: { error: 'Estás enviando demasiadas acciones, espera un momento' },
  });

  // Documentación de la API
  const specPath = path.join(__dirname, '..', '..', '..', 'docs', 'openapi.yaml');
  if (fs.existsSync(specPath)) {
    const spec = YAML.parse(fs.readFileSync(specPath, 'utf8'));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: 'LostCampus API' }));
  }

  app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

  // Estadísticas públicas para la página de inicio (sin login)
  app.get('/api/v1/stats/public', async (req, res, next) => {
    try {
      const data = await callService(env.ITEMS_SERVICE_URL, '/stats/public', { method: 'GET', requestId: req.id, timeoutMs: 8000 });
      res.set('Cache-Control', 'public, max-age=60');
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // Todo lo demás requiere sesión
  const auth = authenticate(resolver);
  for (const route of buildRoutes(env)) {
    if (!route.target) continue;
    app.use(
      route.prefix,
      writeLimiter,
      auth,
      createProxyMiddleware({
        target: route.target,
        changeOrigin: true,
        pathRewrite: (p) => route.rewrite + (p === '/' ? '' : p),
        proxyTimeout: 15000,
        timeout: 15000,
        on: {
          proxyReq: (proxyReq, req) => {
            // Nunca se confía en encabezados de identidad que mande el cliente
            for (const h of IDENTITY_HEADERS) proxyReq.removeHeader(h);
            proxyReq.setHeader('x-internal-key', env.INTERNAL_API_KEY);
            proxyReq.setHeader('x-user-id', req.user.id);
            proxyReq.setHeader('x-user-role', req.user.rol);
            proxyReq.setHeader('x-user-email', req.user.email || '');
            proxyReq.setHeader('x-request-id', req.id);
          },
          error: (err, req, res) => {
            req.log?.error({ err: err.message, target: route.target }, 'Servicio no disponible');
            if (!res.headersSent) res.status(502).json({ error: 'Servicio no disponible, intenta de nuevo' });
          },
        },
      }),
    );
  }

  return app.finish();
}

module.exports = { createApp };
