// Estado y Puntos de Realidad (PR). Cada logro se otorga una sola vez.
const K = 'cosmos.v1';
const base = () => ({ pr: 0, logros: {}, m1: { simulaciones: 0, intentos: 0, fallos: { q1: 0, q2: 0 }, concepto: false, tiempo: false, completada: false } });
export function cargar() {
  try {
    const s = JSON.parse(localStorage.getItem(K));
    const b = base();
    return s ? { ...b, ...s, m1: { ...b.m1, ...s.m1, fallos: { ...b.m1.fallos, ...(s.m1 && s.m1.fallos) } } } : b;
  } catch { return base(); }
}
export function guardar(s) { try { localStorage.setItem(K, JSON.stringify(s)); } catch { /* almacenamiento no disponible */ } }
export function otorgar(s, clave, pr) {
  if (s.logros[clave]) return false;
  s.logros[clave] = true; s.pr += pr; return true;
}
export function reiniciar() { try { localStorage.removeItem(K); } catch {} return base(); }