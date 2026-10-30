// Caída libre ideal: sin aire, g constante, parte del reposo. La masa no interviene.
export const GRAVEDAD = {
  tierra:  { nombre: 'Tierra',  g: 9.81 },   // m/s²
  luna:    { nombre: 'Luna',    g: 1.62 },   // m/s²
  jupiter: { nombre: 'Júpiter', g: 24.79 }   // m/s²
};
export const tiempoCaida = (h, g) => Math.sqrt((2 * h) / g);           // s
export function estado(h, g, t) {
  const tf = tiempoCaida(h, g);
  const tt = Math.min(Math.max(t, 0), tf);
  return { t: tt, y: Math.max(h - 0.5 * g * tt * tt, 0), v: g * tt, fin: t >= tf };
}
export function validar(mA, mB, h) {
  const ok = (x, a, b) => Number.isFinite(x) && x >= a && x <= b;
  if (!ok(mA, 0.1, 1000) || !ok(mB, 0.1, 1000)) return 'Las masas deben estar entre 0,1 y 1000 kg.';
  if (!ok(h, 1, 500)) return 'La altura debe estar entre 1 y 500 m.';
  return '';
}
