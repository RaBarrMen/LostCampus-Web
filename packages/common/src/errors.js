const { ZodError } = require('zod');

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const badRequest = (msg, details) => new HttpError(400, msg, details);
const unauthorized = (msg = 'No autenticado') => new HttpError(401, msg);
const forbidden = (msg = 'No tienes permiso para esta acción') => new HttpError(403, msg);
const notFound = (msg = 'Recurso no encontrado') => new HttpError(404, msg);
const conflict = (msg) => new HttpError(409, msg);

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

// Manejador central de errores: nunca expone stack traces ni mensajes
// internos de la base de datos al cliente.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Datos inválidos',
      details: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    });
  }
  if (err instanceof HttpError) {
    const body = { error: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El cuerpo de la petición es demasiado grande' });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON mal formado' });
  }
  if (req.log) req.log.error({ err }, 'Error no controlado');
  else console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor' });
}

// Convierte el error de Supabase en un HttpError sin filtrar detalles internos
function fromSupabase(error, fallback = 'No se pudo completar la operación') {
  if (!error) return null;
  if (error.code === '23505') return conflict('El registro ya existe');
  if (error.code === '42501' || error.code === 'PGRST301') return forbidden();
  if (error.code === 'PGRST116') return notFound();
  if (error.code === 'P0001') return badRequest(error.message);
  const e = new HttpError(500, fallback);
  e.cause = error;
  return e;
}

module.exports = {
  HttpError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  notFoundHandler,
  errorHandler,
  fromSupabase,
};
