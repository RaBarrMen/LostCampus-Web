// Datos del campus compartidos entre servicios (y copiados en web/lib/campus.js).
// Las coordenadas son aproximadas: ajústenlas con Google Maps si hace falta.

const CENTER = { lat: 20.5397, lng: -100.8157 };

// Rectángulo que delimita el campus (se rechazan reportes fuera de él)
const BOUNDS = {
  minLat: 20.5340,
  maxLat: 20.5460,
  minLng: -100.8230,
  maxLng: -100.8080,
};

const ZONAS = [
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

const COLORES = [
  'negro',
  'blanco',
  'gris',
  'azul',
  'rojo',
  'verde',
  'amarillo',
  'naranja',
  'rosa',
  'morado',
  'café',
  'plateado',
  'dorado',
  'multicolor',
];

module.exports = { CENTER, BOUNDS, ZONAS, COLORES };
