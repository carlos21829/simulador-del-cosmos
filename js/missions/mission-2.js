import { GRAVEDAD } from '../physics/free-fall.js';
import { ideal, alcanceMismaAltura, alcanceAnguloEnRadianes, trayectoria, evaluar, validar, OBSTACULO, SEMI_ZONA, C_ARRASTRE } from '../physics/projectile.js';
import { otorgar } from '../game-state.js';

const $ = (s) => document.querySelector(s);
const fmt = (x, d = 2) => x.toFixed(d).replace('.', ',');
const PISTAS = [
  'Pista 1 (concepto): descompón la velocidad inicial en vx = v0·cos θ y vy = v0·sen θ. Horizontal: velocidad constante; vertical: aceleración −g.',
  'Pista 2 (matemática): el tiempo de vuelo sale de h0 + vy·t − ½·g·t² = 0 (cuadrática; no es 2·vy/g si h0 ≠ 0). Luego alcance = vx·t. Usa el ángulo en grados.',
  'Pista 3 (ejemplo): v0 = 20 m/s, θ = 30°, h0 = 0, Tierra: vx = 17,32 m/s, vy = 10 m/s, t = 2,04 s, alcance ≈ 35,3 m. Repite el procedimiento con tus datos.'
];
const pista = (n) => PISTAS[Math.min(n, 3) - 1];

export function iniciarMision2(ctx) {
  const cv = $('#cv2'), c = cv.getContext('2d');
  let sim = null;
  const RETO = { v0: 25, ang: 40, h0: 10, g: GRAVEDAD.tierra.g, tol: 0.03 };
  RETO.alc = ideal(RETO.v0, RETO.ang, RETO.h0, RETO.g).alcance;
  const cerca = (a, b) => Number.isFinite(a) && Math.abs(a - b) / b <= RETO.tol;

  function leer() {
    const d = { g: GRAVEDAD[$('#pl2').value].g, v0: +$('#v0').value, ang: +$('#ang').value, h0: +$('#h02').value, xT: +$('#xT').value, aire: $('#aire').checked };
    const e = validar(d.v0, d.ang, d.h0, d.xT);
    $('#err2').textContent = e;
    return e ? null : d;
  }
  const calc = (d) => trayectoria(d.v0, d.ang, d.h0, d.g, d.aire ? C_ARRASTRE : 0);
  function vista(d, tr) {
    const xm = Math.max(d.xT + SEMI_ZONA + 15, tr.alcance * 1.05, OBSTACULO.x + 15);
    const ym = Math.max(tr.hmax * 1.15, OBSTACULO.h + 8, d.h0 + 5);
    const s = Math.min((cv.width - 50) / xm, (cv.height - 45) / ym);
    return { s, X: (x) => 25 + x * s, Y: (y) => cv.height - 25 - y * s };
  }
  function dibujar(d, v, pts, j, ref) {
    const W = cv.width, H = cv.height, fg = getComputedStyle(document.body).color;
    c.clearRect(0, 0, W, H); c.fillStyle = fg; c.strokeStyle = fg; c.lineWidth = 2; c.font = '12px sans-serif'; c.textAlign = 'center';
    c.fillRect(0, v.Y(0), W, 3);
    c.fillRect(v.X(OBSTACULO.x) - 4, v.Y(OBSTACULO.h), 8, OBSTACULO.h * v.s);
    c.fillText('Obstáculo', v.X(OBSTACULO.x), v.Y(OBSTACULO.h) - 6);
    c.fillStyle = '#2b7bb9'; c.fillRect(v.X(d.xT - SEMI_ZONA), v.Y(0) - 6, 2 * SEMI_ZONA * v.s, 9);
    c.fillStyle = fg; c.fillText('Objetivo', v.X(d.xT), v.Y(0) + 16);
    const px = v.X(0), py = v.Y(d.h0), L = 25 + Math.min(d.v0, 100) * 0.6, a = (d.ang * Math.PI) / 180;
    c.beginPath(); c.moveTo(px, py); c.lineTo(px + L * Math.cos(a), py - L * Math.sin(a)); c.stroke();
    c.fillText('v₀', px + (L + 12) * Math.cos(a), py - (L + 12) * Math.sin(a));
    if (ref) { c.save(); c.setLineDash([5, 5]); c.strokeStyle = '#7a8aa8'; c.beginPath(); ref.forEach((p, i) => (i ? c.lineTo(v.X(p.x), v.Y(p.y)) : c.moveTo(v.X(p.x), v.Y(p.y)))); c.stroke(); c.restore(); }
    if (j >= 0) {
      c.strokeStyle = '#d9622b'; c.beginPath();
      for (let i = 0; i <= j; i++) (i ? c.lineTo(v.X(pts[i].x), v.Y(pts[i].y)) : c.moveTo(v.X(pts[i].x), v.Y(pts[i].y)));
      c.stroke(); c.fillStyle = '#d9622b'; c.beginPath(); c.arc(v.X(pts[j].x), v.Y(pts[j].y), 6, 0, 7); c.fill();
    }
  }
  function datos(p) {
    $('#d2t').textContent = fmt(p.t) + ' s'; $('#d2x').textContent = fmt(p.x) + ' m'; $('#d2y').textContent = fmt(p.y) + ' m';
    $('#d2vx').textContent = fmt(p.vx) + ' m/s'; $('#d2vy').textContent = fmt(p.vy) + ' m/s';
  }
  function previa() { const d = leer(); if (d && !sim) dibujar(d, vista(d, calc(d)), [], -1, null); }
  ['pl2', 'v0', 'ang', 'h02', 'xT', 'aire'].forEach((id) => $('#' + id).addEventListener('input', previa));

  function tick(ts) {
    if (!sim) return;
    if (sim.last == null) sim.last = ts;
    const pts = sim.pts, tEnd = pts[pts.length - 1].t;
    sim.t = Math.min(sim.t + ((ts - sim.last) / 1000) * sim.k, tEnd); sim.last = ts;
    while (sim.j < pts.length - 1 && pts[sim.j + 1].t <= sim.t) sim.j++;
    if (sim.t >= tEnd) sim.j = pts.length - 1;
    dibujar(sim.d, sim.v, pts, sim.j, sim.ref); datos(pts[sim.j]);
    if (sim.t >= tEnd) return terminar();
    requestAnimationFrame(tick);
  }
  function terminar() {
    const { d, tr, ev } = sim, S = ctx.S, m = [];
    S.m2.lanzamientos++;
    if (ev.estado === 'obstaculo') m.push('Choque con el obstáculo: en x = ' + OBSTACULO.x + ' m el proyectil estaba a y = ' + fmt(ev.yObs) + ' m y el obstáculo mide ' + OBSTACULO.h + ' m.');
    else {
      m.push('Alcance: ' + fmt(ev.xL) + ' m · Tiempo de vuelo: ' + fmt(tr.tf) + ' s · Altura máxima: ' + fmt(tr.hmax) + ' m.');
      if (d.aire) m.push('Sin aire el alcance habría sido ' + fmt(ideal(d.v0, d.ang, d.h0, d.g).alcance) + ' m (modelo de arrastre simplificado, c = ' + C_ARRASTRE + ' 1/m).');
      m.push(ev.estado === 'acierto' ? 'Impacto dentro de la zona (objetivo ± ' + SEMI_ZONA + ' m).' : 'Cayó a ' + fmt(ev.xL) + ' m; el objetivo está a ' + d.xT + ' m (zona ± ' + SEMI_ZONA + ' m).');
      if (ev.supera && otorgar(S, 'm2_obst', 10)) m.push('+10 PR por superar el obstáculo.');
    }
    if (ev.estado === 'acierto') {
      if (!d.aire) { S.m2.acierto = true; if (otorgar(S, 'm2_acierto', 30)) m.push('+30 PR por acertar sin aire.'); }
      else { S.m2.aire = true; if (otorgar(S, 'm2_aire', 20)) m.push('+20 PR por acertar con resistencia del aire.'); }
    } else { S.m2.fallos.l++; m.push(pista(S.m2.fallos.l)); }
    completar(S, m);
    $('#res2').textContent = m.join(' '); $('#est2').textContent = 'Estado: intento terminado (' + ev.estado + ').';
    ctx.repintar();
  }
  function completar(S, out) {
    if (S.m2.acierto && S.m2.prediccion && !S.m2.completada) {
      S.m2.completada = true; otorgar(S, 'm2_fin', 25);
      out.push(Array.isArray(out[0]) ? ['ok', 'Misión 2 completada (+25 PR). Nivel 3 desbloqueado (en construcción).'] : 'Misión 2 completada (+25 PR). Nivel 3 desbloqueado (en construcción).');
    }
  }
  $('#lanzar').onclick = () => {
    const d = leer(); if (!d) return;
    const tr = calc(d), ev = evaluar(tr.pts, d.xT);
    sim = { d, tr, ev, pts: ev.pts, v: vista(d, tr), ref: d.aire ? trayectoria(d.v0, d.ang, d.h0, d.g, 0).pts : null, t: 0, last: null, j: 0, k: Math.max(1, tr.tf / 5) };
    const a = ideal(d.v0, d.ang, d.h0, d.g);
    $('#ini').textContent = 'Componentes iniciales: vx = ' + fmt(a.vx0) + ' m/s, vy = ' + fmt(a.vy0) + ' m/s.';
    $('#res2').textContent = ''; $('#est2').textContent = 'Estado: en ejecución.';
    requestAnimationFrame(tick);
  };
  $('#reset2').onclick = () => { sim = null; ['d2t', 'd2x', 'd2y', 'd2vx', 'd2vy'].forEach((i) => ($('#' + i).textContent = '–')); $('#res2').textContent = ''; $('#ini').textContent = ''; $('#est2').textContent = 'Estado: pendiente. Ajusta los datos y pulsa «Lanzar».'; previa(); };
  $('#comprobar2').onclick = () => {
    const S = ctx.S, out = [], p = parseFloat($('#pred2').value.replace(',', '.'));
    S.m2.intentos++;
    if (!Number.isFinite(p) || p <= 0) out.push(['bad', 'Escribe un número positivo en metros.']);
    else if (cerca(p, RETO.alc)) { S.m2.prediccion = true; out.push(['ok', 'Correcto' + (otorgar(S, 'm2_pred', 25) ? ' (+25 PR)' : '') + ': el alcance teórico es ' + fmt(RETO.alc) + ' m (margen 3 %).']); }
    else {
      S.m2.fallos.q++;
      let diag = '';
      if (cerca(p, alcanceMismaAltura(RETO.v0, RETO.ang, RETO.g))) diag = ' Tu valor coincide con la fórmula para igual altura de lanzamiento y aterrizaje; aquí h0 = 10 m, así que no aplica.';
      else if (cerca(p, alcanceAnguloEnRadianes(RETO.v0, RETO.ang, RETO.h0, RETO.g))) diag = ' Tu valor coincide con usar el ángulo en radianes: la calculadora debe estar en grados.';
      out.push(['bad', 'Fuera del margen del 3 %.' + diag + ' ' + pista(S.m2.fallos.q)]);
    }
    completar(S, out);
    const fb = $('#fb2'); fb.textContent = '';
    out.forEach(([k, t]) => { const e = document.createElement('p'); e.className = 'fb-' + k; e.textContent = (k === 'ok' ? '✔ ' : '✖ ') + t; fb.append(e); });
    ctx.repintar();
  };
  previa();
}