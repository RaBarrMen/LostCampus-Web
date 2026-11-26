// Algoritmo de coincidencias de LostCampus.
//
// Puntuación de 0 a 100:
//   - Categoría igual ............ 40 puntos
//   - Color igual ................ 20 puntos (10 si alguno es "multicolor")
//   - Zona igual ................. 15 puntos (7 si ambos tienen coordenadas a < 150 m)
//   - Cercanía de fechas ......... hasta 15 puntos (pierde 1 punto por día de diferencia)
//   - Palabras en común .......... hasta 10 puntos (título y descripción)
//
// Además, el objeto encontrado no puede tener fecha anterior a la de pérdida
// por más de 1 día (nadie encuentra algo antes de perderlo).

const THRESHOLD = 60;
const MAX_DAYS = 30;

const STOPWORDS = new Set(
  'el la los las un una unos unas de del y o en con sin por para mi su sus al lo que se es color perdi perdí encontre encontré cerca'.split(' '),
);

function normalize(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ');
}

function keywords(item) {
  return new Set(
    normalize(`${item.titulo || ''} ${item.descripcion || ''}`)
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

// Distancia en metros (fórmula de Haversine)
function distanceMeters(a, b) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function hasCoords(i) {
  return typeof i.lat === 'number' && typeof i.lng === 'number';
}

function scoreMatch(lost, found) {
  const breakdown = { categoria: 0, color: 0, zona: 0, fecha: 0, palabras: 0 };

  // Encontrado antes de perderse: imposible
  const diff = daysBetween(lost.fecha, found.fecha);
  if (diff < -1) return { score: 0, breakdown };

  if (lost.category_id === found.category_id) breakdown.categoria = 40;

  if (lost.color === found.color) breakdown.color = 20;
  else if (lost.color === 'multicolor' || found.color === 'multicolor') breakdown.color = 10;

  if (lost.zona === found.zona) breakdown.zona = 15;
  else if (hasCoords(lost) && hasCoords(found) && distanceMeters(lost, found) < 150) breakdown.zona = 7;

  const days = Math.abs(diff);
  if (days <= MAX_DAYS) breakdown.fecha = Math.max(0, 15 - days);

  const a = keywords(lost);
  const b = keywords(found);
  const common = [...a].filter((w) => b.has(w)).length;
  breakdown.palabras = Math.min(10, common * 5);

  const score = Object.values(breakdown).reduce((s, v) => s + v, 0);
  return { score: Math.min(100, score), breakdown };
}

function isMatch(score) {
  return score >= THRESHOLD;
}

module.exports = { scoreMatch, isMatch, keywords, distanceMeters, THRESHOLD, MAX_DAYS };
