// Colisión frontal en 1D (eje x, positivo hacia la derecha). Unidades SI.
// Modelo: sin fricción ni fuerzas externas, impacto instantáneo, rovers rígidos.
// e = coeficiente de restitución: 1 elástica ideal · entre 0 y 1 inelástica · 0 perfectamente inelástica.
export const ANCHO = 4;         // m (ancho de cada rover)
export const SEPARACION = 40;   // m entre centros al inicio (A a la izquierda de B)
export const cinetica = (m, v) => 0.5 * m * v * v;

export function colisionar(mA, vA, mB, vB, e) {
  const M = mA + mB;
  return { vA: ((mA - e * mB) * vA + (1 + e) * mB * vB) / M, vB: ((mB - e * mA) * vB + (1 + e) * mA * vA) / M };
}
// Energía cinética esperada después, calculada con otra fórmula: K0 − ½·μ·(1 − e²)·(vA − vB)².
export function energiaEsperadaDespues(mA, vA, mB, vB, e) {
  const mu = (mA * mB) / (mA + mB), vr = vA - vB;
  return cinetica(mA, vA) + cinetica(mB, vB) - 0.5 * mu * (1 - e * e) * vr * vr;
}
const est = (mA, vA, mB, vB) => ({ vA, vB, pA: mA * vA, pB: mB * vB, p: mA * vA + mB * vB, kA: cinetica(mA, vA), kB: cinetica(mB, vB), k: cinetica(mA, vA) + cinetica(mB, vB) });
export function analizar(d) {
  const f = colisionar(d.mA, d.vA, d.mB, d.vB, d.e);
  const antes = est(d.mA, d.vA, d.mB, d.vB), despues = est(d.mA, f.vA, d.mB, f.vB);
  const esperado = { p: antes.p, k: energiaEsperadaDespues(d.mA, d.vA, d.mB, d.vB, d.e) };
  return { f, antes, despues, esperado, dp: despues.p - esperado.p, dk: despues.k - esperado.k };
}
export const tContacto = (d) => (SEPARACION - ANCHO) / (d.vA - d.vB);
export const duracion = (d) => tContacto(d) + 3;
export function posiciones(d, f, t) {
  const tc = tContacto(d);
  if (t <= tc) return { xA: d.vA * t, xB: SEPARACION + d.vB * t, post: false };
  const xc = d.vA * tc, s = t - tc;
  return { xA: xc + f.vA * s, xB: xc + ANCHO + f.vB * s, post: true };
}
export function validar(d) {
  const ok = (x, a, b) => Number.isFinite(x) && x >= a && x <= b;
  if (!ok(d.mA, 0.1, 1000) || !ok(d.mB, 0.1, 1000)) return 'Las masas deben estar entre 0,1 y 1000 kg.';
  if (!ok(d.vA, -20, 20) || !ok(d.vB, -20, 20)) return 'Las velocidades deben estar entre −20 y 20 m/s.';
  if (d.vA - d.vB < 1) return 'Los rovers deben acercarse: vA − vB debe ser al menos 1 m/s (A va a la izquierda de B).';
  if (d.tipo === 'inelastica' && !ok(d.e, 0.05, 0.95)) return 'En la colisión inelástica, e debe estar entre 0,05 y 0,95.';
  return '';
}
