// Estado y Puntos de Realidad (PR). Cada logro se otorga una sola vez.
const K = 'cosmos.v1';
const base = () => ({
  pr: 0, logros: {},
  m1: { simulaciones: 0, intentos: 0, fallos: { q1: 0, q2: 0 }, concepto: false, tiempo: false, completada: false },
  m2: { lanzamientos: 0, intentos: 0, fallos: { l: 0, q: 0 }, acierto: false, aire: false, prediccion: false, completada: false }
});
export function cargar() {
  try {
    const s = JSON.parse(localStorage.getItem(K)), b = base();
    if (!s) return b;
    const mez = (k) => ({ ...b[k], ...s[k], fallos: { ...b[k].fallos, ...(s[k] && s[k].fallos) } });
    return { ...b, ...s, m1: mez('m1'), m2: mez('m2') };
  } catch { return base(); }
}
export function guardar(s) { try { localStorage.setItem(K, JSON.stringify(s)); } catch { /* almacenamiento no disponible */ } }
export function otorgar(s, clave, pr) {
  if (s.logros[clave]) return false;
  s.logros[clave] = true; s.pr += pr; return true;
}
export function reiniciar() { try { localStorage.removeItem(K); } catch {} return base(); }