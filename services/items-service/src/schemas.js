const { z, campus } = require('@lostcampus/common');

const { BOUNDS, ZONAS, COLORES } = campus;

// Quita espacios repetidos y caracteres de control
const texto = (min, max) =>
  z
    .string()
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim())
    .pipe(z.string().min(min, `Mínimo ${min} caracteres`).max(max, `Máximo ${max} caracteres`));

const hoy = () => new Date().toISOString().slice(0, 10);
const haceUnAnio = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
};

const fecha = z.iso
  .date('Fecha inválida')
  .refine((d) => d <= hoy(), 'La fecha no puede ser futura')
  .refine((d) => d >= haceUnAnio(), 'La fecha no puede tener más de un año');

const lat = z.number().min(BOUNDS.minLat, 'Ubicación fuera del campus').max(BOUNDS.maxLat, 'Ubicación fuera del campus');
const lng = z.number().min(BOUNDS.minLng, 'Ubicación fuera del campus').max(BOUNDS.maxLng, 'Ubicación fuera del campus');

// Ruta de la imagen en el bucket: <user_id>/<uuid>.<ext>
const imagePath = z
  .string()
  .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/i, 'Ruta de imagen inválida');

const createItem = z
  .object({
    tipo: z.enum(['perdido', 'encontrado']),
    titulo: texto(3, 80),
    descripcion: texto(0, 500).default(''),
    category_id: z.number().int().positive(),
    color: z.enum(COLORES),
    zona: z.enum(ZONAS),
    lat: lat.optional(),
    lng: lng.optional(),
    fecha,
    image_path: imagePath.optional(),
    en_resguardo: z.boolean().default(false),
    pregunta_verificacion: texto(5, 150).optional(),
  })
  .strict()
  .refine((d) => d.tipo === 'perdido' || d.pregunta_verificacion, {
    message: 'Escribe una pregunta para verificar al dueño',
    path: ['pregunta_verificacion'],
  })
  .refine((d) => (d.lat === undefined) === (d.lng === undefined), {
    message: 'Indica latitud y longitud',
    path: ['lat'],
  });

const updateItem = z
  .object({
    titulo: texto(3, 80),
    descripcion: texto(0, 500),
    color: z.enum(COLORES),
    zona: z.enum(ZONAS),
    en_resguardo: z.boolean(),
    pregunta_verificacion: texto(5, 150),
    estado: z.enum(['activo', 'cerrado']),
  })
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, 'No hay cambios');

const listQuery = z.object({
  tipo: z.enum(['perdido', 'encontrado']).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  zona: z.enum(ZONAS).optional(),
  estado: z.enum(['activo', 'en_proceso', 'devuelto', 'cerrado']).default('activo'),
  q: texto(1, 60).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

const updateProfile = z
  .object({
    nombre: texto(2, 80),
    carrera: texto(2, 80),
  })
  .partial()
  .strict();

module.exports = { createItem, updateItem, listQuery, updateProfile };
