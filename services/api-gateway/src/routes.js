// Tabla de enrutamiento: prefijo público → servicio interno.
// Para agregar un servicio nuevo (por ejemplo al integrar una tecnología del curso)
// basta con agregar una línea aquí y su variable de entorno.
module.exports = (env) => [
  { prefix: '/api/v1/items', target: env.ITEMS_SERVICE_URL, rewrite: '/items' },
  { prefix: '/api/v1/categories', target: env.ITEMS_SERVICE_URL, rewrite: '/categories' },
  { prefix: '/api/v1/profile', target: env.ITEMS_SERVICE_URL, rewrite: '/profile' },
  { prefix: '/api/v1/admin', target: env.ITEMS_SERVICE_URL, rewrite: '/admin' },
  { prefix: '/api/v1/matches', target: env.MATCHING_SERVICE_URL, rewrite: '/matches' },
  { prefix: '/api/v1/claims', target: env.CLAIMS_SERVICE_URL, rewrite: '/claims' },
  { prefix: '/api/v1/notifications', target: env.NOTIFY_SERVICE_URL, rewrite: '/notifications' },
];
