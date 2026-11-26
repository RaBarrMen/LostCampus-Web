// Copia de packages/common/src/campus.js (mantener sincronizados)
export const CENTER = { lat: 20.5397, lng: -100.8157 };

export const BOUNDS = {
  minLat: 20.534,
  maxLat: 20.546,
  minLng: -100.823,
  maxLng: -100.808,
};

export const ZONAS = [
  'Edificio A',
  'Edificio B',
  'Edificio C',
  'Edificio D',
  'Edificio E',
  'Edificio F',
  'Edificio de Sistemas',
  'Biblioteca',
  'Cafetería',
  'Centro de Cómputo',
  'Auditorio',
  'Canchas',
  'Gimnasio',
  'Explanada',
  'Estacionamiento',
  'Entrada principal',
  'Otro',
];

export const COLORES = {
  negro: '#1f2937',
  blanco: '#f9fafb',
  gris: '#9ca3af',
  azul: '#2563eb',
  rojo: '#dc2626',
  verde: '#16a34a',
  amarillo: '#facc15',
  naranja: '#f97316',
  rosa: '#ec4899',
  morado: '#9333ea',
  café: '#92400e',
  plateado: '#cbd5e1',
  dorado: '#d4a017',
  multicolor: 'conic-gradient(#ef4444,#f59e0b,#22c55e,#3b82f6,#a855f7,#ef4444)',
};

export const ESTADOS = {
  activo: { label: 'Activo', cls: 'bg-surface-2 text-ink' },
  en_proceso: { label: 'En proceso', cls: 'bg-accent/20 text-accent-ink dark:text-accent' },
  devuelto: { label: 'Devuelto', cls: 'bg-found-soft text-found' },
  cerrado: { label: 'Cerrado', cls: 'bg-surface-2 text-muted' },
  oculto: { label: 'Oculto', cls: 'bg-lost-soft text-lost' },
};

export const ESTADOS_RECLAMO = {
  pendiente: { label: 'Pendiente', cls: 'bg-accent/20 text-accent-ink dark:text-accent' },
  aprobado: { label: 'Aprobado', cls: 'bg-found-soft text-found' },
  rechazado: { label: 'Rechazado', cls: 'bg-lost-soft text-lost' },
  entregado: { label: 'Entregado', cls: 'bg-found text-white' },
  cancelado: { label: 'Cancelado', cls: 'bg-surface-2 text-muted' },
};

export const inCampus = (lat, lng) =>
  lat >= BOUNDS.minLat && lat <= BOUNDS.maxLat && lng >= BOUNDS.minLng && lng <= BOUNDS.maxLng;
