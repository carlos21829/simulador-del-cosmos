import { analizar, tContacto, duracion, posiciones, validar, ANCHO } from '../physics/collisions.js';
import { otorgar } from '../game-state.js';

const $ = (s) => document.querySelector(s);
const fmt = (x, d = 2) => x.toFixed(d).replace('.', ',');
const KEY = { elastica: 'el', inelastica: 'in', perfecta: 'pi' };
const NOM = { elastica: 'elástica', inelastica: 'inelástica', perfecta: 'perfectamente inelástica' };
const FILAS = [['Velocidad de A (m/s)', 'vA'], ['Velocidad de B (m/s)', 'vB'], ['Momento de A (kg·m/s)', 'pA'], ['Momento de B (kg·m/s)', 'pB'],
  ['Momento total (kg·m/s)', 'p'], ['Energía cinética de A (J)', 'kA'], ['Energía cinética de B (J)', 'kB'], ['Energía cinética total (J)', 'k']];
const PISTAS = [
  'Pista 1 (concepto): sin fuerzas externas se conserva el momento lineal total, p = m·v, con signo según la dirección.',
  'Pista 2 (matemática): si quedan unidos, mA·vA + mB·vB = (mA + mB)·v. Revisa el signo de cada velocidad.',
  'Pista 3 (ejemplo): A de 2 kg a 5 m/s y B de 3 kg en reposo, unidos: v = (2·5 + 0)/(2 + 3) = 2 m/s. Repite con tus datos, cuidando los signos.'
];
const PISTA_C = ['Pista 1 (concepto): el momento se conserva siempre sin fuerzas externas; la energía cinética puede transformarse en deformación o calor.',
  'Pista 2: ejecuta una colisión de cada tipo y compara la energía cinética total antes y después en la tabla.'];

export function iniciarMision3(ctx) {
  const cv = $('#cv3'), c = cv.getContext('2d');
  let sim = null;
  const RETO = { mA: 3, vA: 8, mB: 5, vB: -2 };
  RETO.v = (RETO.mA * RETO.vA + RETO.mB * RETO.vB) / (RETO.mA + RETO.mB);
  const cerca = (a, b) => Number.isFinite(a) && Math.abs(a - b) / Math.abs(b) <= 0.03;
  const tb = $('#tb3');
  FILAS.forEach(([n, k]) => { const r = tb.insertRow(); const h = document.createElement('th'); h.scope = 'row'; h.textContent = n; r.append(h); r.insertCell().id = 'a_' + k; r.insertCell().id = 'd_' + k; });
  const llenar = (a) => FILAS.forEach(([, k]) => { $('#a_' + k).textContent = fmt(a.antes[k]); $('#d_' + k).textContent = fmt(a.despues[k]); });

  function leer() {
    const tipo = $('#t3').value;
    const d = { mA: +$('#mA3').value, mB: +$('#mB3').value, vA: +$('#vA3').value, vB: +$('#vB3').value, tipo, e: tipo === 'elastica' ? 1 : tipo === 'perfecta' ? 0 : +$('#e3').value };
    const e = validar(d); $('#err3').textContent = e;
    return e ? null : d;
  }
  function vista(d, f) {
    const tc = tContacto(d), xs = [];
    [0, tc, duracion(d)].forEach((t) => { const p = posiciones(d, f, t); xs.push(p.xA - ANCHO, p.xA + ANCHO, p.xB - ANCHO, p.xB + ANCHO); });
    const x0 = Math.min(...xs), s = (cv.width - 60) / (Math.max(...xs) - x0);
    return { s, X: (x) => 30 + (x - x0) * s };
  }
  function flecha(x, y, v) {
    const L = Math.max(-90, Math.min(90, v * 4));
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + L, y); c.stroke();
    if (L) { const q = L > 0 ? -6 : 6; c.beginPath(); c.moveTo(x + L, y); c.lineTo(x + L + q, y - 4); c.lineTo(x + L + q, y + 4); c.fill(); }
  }
  function dibujar(d, f, v, t) {
    const W = cv.width, H = cv.height, suelo = H - 50, p = posiciones(d, f, t), fg = getComputedStyle(document.body).color;
    c.clearRect(0, 0, W, H); c.fillStyle = fg; c.strokeStyle = fg; c.lineWidth = 2; c.font = 'bold 13px sans-serif'; c.textAlign = 'center';
    c.fillRect(0, suelo, W, 3);
    [['A', p.xA, '#d9622b', p.post ? f.vA : d.vA], ['B', p.xB, '#2b7bb9', p.post ? f.vB : d.vB]].forEach(([n, x, col, vel]) => {
      const w = ANCHO * v.s;
      c.fillStyle = col; c.fillRect(v.X(x) - w / 2, suelo - 34, w, 34);
      c.fillStyle = '#fff'; c.fillText(n, v.X(x), suelo - 12);
      c.fillStyle = fg; flecha(v.X(x), suelo - 52, vel); c.fillText('v = ' + fmt(vel) + ' m/s', v.X(x), suelo - 62);
    });
  }
  const previa = () => { const d = leer(); if (d && !sim) { const a = analizar(d); dibujar(d, a.f, vista(d, a.f), 0); } };
  $('#t3').addEventListener('change', () => { $('#e3').disabled = $('#t3').value !== 'inelastica'; });
  ['t3', 'e3', 'mA3', 'mB3', 'vA3', 'vB3'].forEach((id) => $('#' + id).addEventListener('input', previa));
  $('#t3').addEventListener('change', previa);

  function tick(ts) {
    if (!sim) return;
    if (sim.last == null) sim.last = ts;
    sim.t = Math.min(sim.t + ((ts - sim.last) / 1000) * sim.k, sim.T); sim.last = ts;
    dibujar(sim.d, sim.a.f, sim.v, sim.t);
    $('#tiem3').textContent = 'Tiempo: ' + fmt(sim.t) + ' s' + (sim.t > sim.tc ? ' (después del impacto)' : ' (antes del impacto)');
    if (sim.t >= sim.T) return terminar();
    requestAnimationFrame(tick);
  }
  function terminar() {
    const { d, a } = sim, S = ctx.S, m = [], k = KEY[d.tipo];
    llenar(a); S.m3.colisiones++;
    const okP = Math.abs(a.dp) <= 1e-9 * Math.max(1, Math.abs(a.antes.p));
    const okK = Math.abs(a.dk) <= 1e-9 * Math.max(1, a.esperado.k);
    const perdida = a.antes.k - a.despues.k;
    m.push('Momento total: antes ' + fmt(a.antes.p) + ' y después ' + fmt(a.despues.p) + ' kg·m/s (diferencia ' + a.dp.toExponential(1) + ').');
    m.push('Energía cinética: antes ' + fmt(a.antes.k) + ' J, después ' + fmt(a.despues.k) + ' J, esperada ' + fmt(a.esperado.k) + ' J; pérdida ' + fmt(perdida) + ' J.');
    m.push(d.tipo === 'elastica' ? 'En la elástica ideal la energía cinética total se conserva.' : 'Parte de la energía cinética se transformó en otras formas (deformación, calor).');
    if (okP && okK) { if (!S.m3.tipos[k]) { S.m3.tipos[k] = true; if (otorgar(S, 'm3_' + k, 10)) m.push('+10 PR por analizar una colisión ' + NOM[d.tipo] + '.'); } }
    else m.push('Aviso: no se cumplió la tolerancia numérica; no se otorgan puntos.');
    const f = completar(S); if (f) m.push(f);
    $('#res3').textContent = m.join(' '); $('#est3').textContent = 'Estado: colisión analizada (' + NOM[d.tipo] + ').';
    ctx.repintar();
  }
  function completar(S) {
    const t = S.m3.tipos;
    if (t.el && t.in && t.pi && S.m3.concepto && S.m3.prediccion && !S.m3.completada) {
      S.m3.completada = true; otorgar(S, 'm3_fin', 25);
      return 'Misión 3 completada (+25 PR). ¡Has completado todas las misiones!';
    }
    return '';
  }
  $('#lanzar3').onclick = () => {
    const d = leer(); if (!d) return;
    const a = analizar(d), T = duracion(d);
    sim = { d, a, T, tc: tContacto(d), v: vista(d, a.f), t: 0, last: null, k: Math.max(1, T / 8) };
    $('#res3').textContent = ''; $('#est3').textContent = 'Estado: en ejecución.';
    requestAnimationFrame(tick);
  };
  $('#reset3').onclick = () => { sim = null; $('#res3').textContent = ''; $('#tiem3').textContent = 'Tiempo: 0,00 s'; $('#est3').textContent = 'Estado: pendiente. Ajusta los datos y pulsa «Ejecutar».'; FILAS.forEach(([, k]) => { $('#a_' + k).textContent = ''; $('#d_' + k).textContent = ''; }); previa(); };
  $('#comprobar3').onclick = () => {
    const S = ctx.S, out = [], r = document.querySelector('input[name=q3]:checked'), p = parseFloat($('#pred3').value.replace(',', '.'));
    S.m3.intentos++;
    if (!r) out.push(['bad', '1. Elige una opción.']);
    else if (!(S.m3.tipos.el && S.m3.tipos.pi)) out.push(['bad', '1. Antes de responder, analiza una colisión elástica y una perfectamente inelástica.']);
    else if (r.value === 'el') { S.m3.concepto = true; out.push(['ok', '1. Correcto' + (otorgar(S, 'm3_concepto', 20) ? ' (+20 PR)' : '') + ': solo en la elástica ideal se conserva la energía cinética; el momento se conserva en todas.']); }
    else { S.m3.fallos.c++; out.push(['bad', '1. Incorrecto. ' + PISTA_C[Math.min(S.m3.fallos.c, 2) - 1]]); }
    if (!Number.isFinite(p)) out.push(['bad', '2. Escribe un número (en m/s, con signo).']);
    else if (cerca(p, RETO.v)) { S.m3.prediccion = true; out.push(['ok', '2. Correcto' + (otorgar(S, 'm3_pred', 25) ? ' (+25 PR)' : '') + ': v = (mA·vA + mB·vB)/(mA + mB) = ' + fmt(RETO.v) + ' m/s.']); }
    else {
      S.m3.fallos.q++;
      const signo = (RETO.mA * RETO.vA + RETO.mB * Math.abs(RETO.vB)) / (RETO.mA + RETO.mB), media = (RETO.vA + RETO.vB) / 2;
      const diag = cerca(p, signo) ? ' Tu valor coincide con ignorar el signo negativo de vB.' : cerca(p, media) ? ' Tu valor coincide con promediar las velocidades sin tener en cuenta las masas.' : '';
      out.push(['bad', '2. Fuera del margen del 3 %.' + diag + ' ' + PISTAS[Math.min(S.m3.fallos.q, 3) - 1]]);
    }
    const f = completar(S); if (f) out.push(['ok', f]);
    const fb = $('#fb3'); fb.textContent = '';
    out.forEach(([k, t]) => { const e = document.createElement('p'); e.className = 'fb-' + k; e.textContent = (k === 'ok' ? '✔ ' : '✖ ') + t; fb.append(e); });
    ctx.repintar();
  };
  previa();
}
