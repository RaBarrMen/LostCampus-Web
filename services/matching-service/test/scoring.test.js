const { scoreMatch, isMatch, keywords, distanceMeters, THRESHOLD } = require('../src/scoring');

const lost = {
  titulo: 'Cartera negra de piel',
  descripcion: 'Tiene mi credencial del Tec',
  category_id: 2,
  color: 'negro',
  zona: 'Biblioteca',
  fecha: '2026-11-10',
};

describe('algoritmo de coincidencias', () => {
  test('dos reportes idénticos obtienen la puntuación máxima', () => {
    const { score } = scoreMatch(lost, { ...lost });
    expect(score).toBe(100);
  });

  test('misma categoría, color y zona superan el umbral', () => {
    const found = { ...lost, titulo: 'Billetera', descripcion: '', fecha: '2026-11-12' };
    const { score, breakdown } = scoreMatch(lost, found);
    expect(breakdown.categoria).toBe(40);
    expect(breakdown.color).toBe(20);
    expect(breakdown.zona).toBe(15);
    expect(breakdown.fecha).toBe(13);
    expect(isMatch(score)).toBe(true);
  });

  test('categoría distinta no alcanza el umbral', () => {
    const found = { ...lost, category_id: 7, titulo: 'Sudadera', descripcion: '' };
    expect(scoreMatch(lost, found).score).toBeLessThan(THRESHOLD);
  });

  test('un objeto no se encuentra antes de perderse', () => {
    const found = { ...lost, fecha: '2026-11-01' };
    expect(scoreMatch(lost, found).score).toBe(0);
  });

  test('se tolera un día de diferencia por zonas horarias', () => {
    const found = { ...lost, fecha: '2026-11-09' };
    expect(scoreMatch(lost, found).score).toBeGreaterThan(0);
  });

  test('la cercanía de fechas pierde un punto por día', () => {
    const a = scoreMatch(lost, { ...lost, fecha: '2026-11-11' }).breakdown.fecha;
    const b = scoreMatch(lost, { ...lost, fecha: '2026-11-20' }).breakdown.fecha;
    expect(a).toBe(14);
    expect(b).toBe(5);
  });

  test('multicolor da puntos parciales', () => {
    expect(scoreMatch(lost, { ...lost, color: 'multicolor' }).breakdown.color).toBe(10);
    expect(scoreMatch(lost, { ...lost, color: 'rojo' }).breakdown.color).toBe(0);
  });

  test('zonas distintas pero cercanas dan puntos parciales', () => {
    const a = { ...lost, zona: 'Biblioteca', lat: 20.5397, lng: -100.8157 };
    const b = { ...lost, zona: 'Cafetería', lat: 20.5399, lng: -100.8158 };
    expect(scoreMatch(a, b).breakdown.zona).toBe(7);
  });

  test('palabras clave ignoran acentos y palabras vacías', () => {
    const k = keywords({ titulo: 'Cálculo de la Calculadora', descripcion: 'perdí en el salón' });
    expect(k.has('calculo')).toBe(true);
    expect(k.has('calculadora')).toBe(true);
    expect(k.has('perdi')).toBe(false);
    expect(k.has('la')).toBe(false);
  });

  test('distancia Haversine aproximada', () => {
    const d = distanceMeters({ lat: 20.5397, lng: -100.8157 }, { lat: 20.5406, lng: -100.8157 });
    expect(d).toBeGreaterThan(90);
    expect(d).toBeLessThan(110);
  });
});
