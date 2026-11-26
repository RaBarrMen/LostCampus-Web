const { z } = require('zod');

// Valida y reemplaza req[source] con los datos ya limpios por Zod.
// Express 5 define req.query como getter, por eso se guarda en req.valid.
const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const parsed = schema.parse(req[source] ?? {});
    req.valid = { ...(req.valid || {}), [source]: parsed };
    next();
  };

const uuidParam = z.object({ id: z.uuid('Identificador inválido') });

module.exports = { validate, uuidParam, z };
