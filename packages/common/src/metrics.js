// Métricas en formato Prometheus (para Grafana). El endpoint /metrics
// se protege con METRICS_TOKEN para no exponer información del servidor.
const client = require('prom-client');
const { safeEqual } = require('./internal');

function setupMetrics(app, serviceName) {
  const registry = new client.Registry();
  registry.setDefaultLabels({ service: serviceName });
  client.collectDefaultMetrics({ register: registry });

  const duration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duración de las peticiones HTTP',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [registry],
  });

  app.use((req, res, next) => {
    const end = duration.startTimer();
    res.on('finish', () => {
      const route = req.route?.path ? req.baseUrl + req.route.path : 'otra';
      end({ method: req.method, route, status: res.statusCode });
    });
    next();
  });

  app.get('/metrics', async (req, res) => {
    const token = process.env.METRICS_TOKEN;
    const sent = (req.get('authorization') || '').replace('Bearer ', '');
    if (!token || !safeEqual(sent, token)) return res.status(401).json({ error: 'No autorizado' });
    res.set('Content-Type', registry.contentType);
    res.send(await registry.metrics());
  });
}

module.exports = { setupMetrics };
