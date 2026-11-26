// Crea una app Express con la configuración de seguridad común a todos los servicios.
const crypto = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const { setupMetrics } = require('./metrics');
const { notFoundHandler, errorHandler } = require('./errors');

function createLogger(name) {
  return require('pino')({
    name,
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
    redact: ['req.headers.authorization', 'req.headers["x-internal-key"]', 'req.headers.cookie'],
  });
}

function createService(name, { jsonLimit = '100kb' } = {}) {
  const app = express();
  const logger = createLogger(name);

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Render pone un proxy delante
  app.use(helmet());
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = req.headers['x-request-id'] || crypto.randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/health' },
    }),
  );
  // jsonLimit:false desactiva el parseo (el gateway reenvía el cuerpo sin leerlo)
  if (jsonLimit !== false) app.use(express.json({ limit: jsonLimit }));

  setupMetrics(app, name);
  app.get('/health', (req, res) => res.json({ status: 'ok', service: name, uptime: process.uptime() }));

  // Se llama al final, después de registrar las rutas del servicio
  app.finish = () => {
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
  };
  app.logger = logger;
  return app;
}

function listen(app, port, name) {
  return app.listen(port, () => app.logger.info(`${name} escuchando en el puerto ${port}`));
}

module.exports = { createService, createLogger, listen };
