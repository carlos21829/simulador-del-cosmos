// Tiro parabólico. Ángulos en GRADOS (se convierten a radianes aquí). Unidades SI.
// - Sin aire (c = 0): modelo ideal analítico, g constante. Incluye altura inicial h0.
// - Con aire (c > 0): arrastre cuadrático a = −c·|v|·v con c constante (1/m) e integración RK4.
//   Es un modelo simplificado: densidad constante, no es una atmósfera realista.
export const OBSTACULO = { x: 50, h: 15 };   // m
export const SEMI_ZONA = 5;                  // m: zona de aterrizaje = objetivo ± 5 m
export const C_ARRASTRE = 0.002;             // 1/m
const rad = (d) => (d * Math.PI) / 180;
const pt = (t, s) => ({ t, x: s[0], y: Math.max(s[1], 0), vx: s[2], vy: s[3] });

export function ideal(v0, ang, h0, g) {
  const vx0 = v0 * Math.cos(rad(ang)), vy0 = v0 * Math.sin(rad(ang));
  const tf = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * h0)) / g;      // raíz positiva de h0 + vy0·t − ½gt² = 0
  return { vx0, vy0, tf, alcance: vx0 * tf, hmax: vy0 > 0 ? h0 + (vy0 * vy0) / (2 * g) : h0 };
}
// Solo válida si lanzamiento y aterrizaje están a la misma altura (h0 = 0). Se usa para diagnosticar errores.
export const alcanceMismaAltura = (v0, ang, g) => (v0 * v0 * Math.sin(2 * rad(ang))) / g;
// Error típico: usar el ángulo (en grados) como si fueran radianes.
export function alcanceAnguloEnRadianes(v0, ang, h0, g) {
  const vx = v0 * Math.cos(ang), vy = v0 * Math.sin(ang);
  return vx * ((vy + Math.sqrt(vy * vy + 2 * g * h0)) / g);
}
export function validar(v0, ang, h0, xT) {
  const ok = (x, a, b) => Number.isFinite(x) && x >= a && x <= b;
  if (!ok(v0, 1, 150)) return 'La velocidad inicial debe estar entre 1 y 150 m/s.';
  if (!ok(ang, 1, 89)) return 'El ángulo debe estar entre 1° y 89°.';
  if (!ok(h0, 0, 100)) return 'La altura inicial debe estar entre 0 y 100 m.';
  if (!ok(xT, 70, 300)) return 'El objetivo debe estar entre 70 y 300 m.';
  return '';
}
export function trayectoria(v0, ang, h0, g, c) {
  const a = ideal(v0, ang, h0, g), pts = [];
  if (!c) {
    const p = (t) => pt(t, [a.vx0 * t, h0 + a.vy0 * t - 0.5 * g * t * t, a.vx0, a.vy0 - g * t]);
    for (let t = 0; t < a.tf; t += 0.02) pts.push(p(t));
    pts.push(p(a.tf));
    return { pts, tf: a.tf, alcance: a.alcance, hmax: a.hmax };
  }
  const f = (s) => { const v = Math.hypot(s[2], s[3]); return [s[2], s[3], -c * v * s[2], -g - c * v * s[3]]; };
  const add = (s, k, h) => s.map((x, j) => x + h * k[j]);
  let s = [0, h0, a.vx0, a.vy0], t = 0, hmax = h0, i = 0;
  const dt = 0.002;
  pts.push(pt(0, s));
  while (t < 600) {
    const k1 = f(s), k2 = f(add(s, k1, dt / 2)), k3 = f(add(s, k2, dt / 2)), k4 = f(add(s, k3, dt));
    const n = s.map((x, j) => x + (dt / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    if (n[1] < 0) { const q = s[1] / (s[1] - n[1]); t += q * dt; pts.push(pt(t, s.map((x, j) => x + q * (n[j] - x)))); break; }
    s = n; t += dt; hmax = Math.max(hmax, s[1]);
    if (++i % 10 === 0) pts.push(pt(t, s));
  }
  const L = pts[pts.length - 1];
  return { pts, tf: L.t, alcance: L.x, hmax };
}
// Resultado del intento: 'acierto' | 'corto' | 'largo' | 'obstaculo'.
export function evaluar(pts, xT) {
  const o = OBSTACULO; let yObs = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (a.x < o.x && b.x >= o.x) {
      const q = (o.x - a.x) / (b.x - a.x);
      yObs = a.y + q * (b.y - a.y);
      if (yObs < o.h) {
        const p = { t: a.t + q * (b.t - a.t), x: o.x, y: yObs, vx: a.vx + q * (b.vx - a.vx), vy: a.vy + q * (b.vy - a.vy) };
        return { estado: 'obstaculo', yObs, supera: false, pts: pts.slice(0, i + 1).concat(p) };
      }
      break;
    }
  }
  const xL = pts[pts.length - 1].x;
  const estado = Math.abs(xL - xT) <= SEMI_ZONA ? 'acierto' : xL < xT ? 'corto' : 'largo';
  return { estado, yObs, supera: yObs !== null, xL, pts };
}
