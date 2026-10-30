import { GRAVEDAD, tiempoCaida, estado, validar } from './physics/free-fall.js';
import { cargar, guardar, otorgar, reiniciar } from './game-state.js';
import { iniciarMision2 } from './missions/mission-2.js';

const $ = (s) => document.querySelector(s);
const fmt = (x, d = 2) => x.toFixed(d).replace('.', ',');
let S = cargar();
const RETO = { h: 80, g: GRAVEDAD.luna.g, tol: 0.03 };
RETO.t = tiempoCaida(RETO.h, RETO.g);

// ---- Navegación ----
const avisar = (t) => { const a = $('#aviso'); if (a) a.textContent = t; };
function ir(v) {
  if (v === 'siguiente') v = S.m1.completada ? 'mision2' : 'mision';
  if (v === 'mision2' && !S.m1.completada) { v = 'mapa'; avisar('Completa la Misión 1 para desbloquear la Misión 2.'); } else avisar('');
  document.querySelectorAll('.view').forEach((e) => (e.hidden = e.id !== 'v-' + v));
  document.querySelectorAll('#nav button').forEach((b) =>
    b.dataset.go === v ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  if (v === 'mapa') pintarMapa();
  $('#main').focus();
}
document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) ir(g.dataset.go); });

function pintarPR() { $('#pr').textContent = S.pr; }
function pintarMapa() {
  const m = S.m1, p = Math.round(((m.simulaciones > 0) + m.concepto + m.tiempo) / 3 * 100);
  $('#pg1').value = p;
  $('#b1').textContent = m.completada ? 'Completado' : p ? 'En progreso · ' + p + ' %' : 'Disponible';
  const n = S.m2, q = Math.round((n.acierto + n.prediccion) / 2 * 100);
  $('#pg2').value = q;
  $('#b2').textContent = !m.completada ? 'Bloqueado' : n.completada ? 'Completado' : q ? 'En progreso · ' + q + ' %' : 'Disponible';
  $('#b3').textContent = n.completada ? 'Desbloqueado · en construcción' : 'Bloqueado';
  pintarPR();
}

// ---- Simulación (Misión 1) ----
let sim = null;
const cv = $('#cv'), ctx = cv.getContext('2d');
function leer() {
  const d = { g: GRAVEDAD[$('#planeta').value].g, mA: +$('#mA').value, mB: +$('#mB').value, h: +$('#h').value };
  const e = validar(d.mA, d.mB, d.h);
  $('#err').textContent = e;
  return e ? null : d;
}
function pintar(h, y, mA, mB) {
  const W = cv.width, H = cv.height, suelo = H - 20, top = 30;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = getComputedStyle(document.body).color;
  ctx.fillRect(0, suelo, W, 4);
  [[W / 3, mA, 'A'], [2 * W / 3, mB, 'B']].forEach(([x, m, n]) => {
    const r = 8 + 5 * Math.log10(m + 1), py = suelo - r - (y / h) * (suelo - top - 2 * r);
    ctx.beginPath(); ctx.arc(x, py, r, 0, 7); ctx.fillStyle = n === 'A' ? '#d9622b' : '#2b7bb9'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n, x, py + 4);
  });
}
function datos(d, e) {
  ['A', 'B'].forEach((n) => {
    $('#dm' + n).textContent = fmt(d['m' + n], 1) + ' kg';
    $('#dy' + n).textContent = fmt(e.y) + ' m';
    $('#dv' + n).textContent = fmt(e.v) + ' m/s';
  });
  $('#tiem').textContent = 'Tiempo: ' + fmt(e.t) + ' s';
}
function tick(ts) {
  if (!sim || !sim.run) return;
  if (sim.last == null) sim.last = ts;
  sim.t += ((ts - sim.last) / 1000) * sim.k; sim.last = ts;
  const e = estado(sim.h, sim.g, sim.t);
  pintar(sim.h, e.y, sim.mA, sim.mB); datos(sim, e);
  if (e.fin) return terminar();
  requestAnimationFrame(tick);
}
function terminar() {
  sim.run = false; S.m1.simulaciones++;
  const tf = tiempoCaida(sim.h, sim.g);
  let msg = 'Resultado: A y B llegaron al suelo en t = ' + fmt(tf) + ' s (modelo ideal, sin aire). Tiempo teórico √(2h/g) = ' + fmt(tf) + ' s.';
  if (sim.mA !== sim.mB) { if (otorgar(S, 'm1_sim', 10)) msg += ' +10 PR por contrastar dos masas distintas.'; }
  else msg += ' Usa masas distintas para obtener puntos.';
  $('#res').textContent = msg; $('#est').textContent = 'Estado: simulación terminada.';
  guardar(S); pintarPR();
}
$('#soltar').onclick = () => {
  const d = leer(); if (!d) return;
  const tf = tiempoCaida(d.h, d.g);
  sim = { ...d, t: 0, last: null, run: true, k: Math.max(1, tf / 6) };
  $('#res').textContent = ''; $('#est').textContent = 'Estado: en ejecución (tiempo ×' + fmt(sim.k, 1) + ' de la escala real).';
  requestAnimationFrame(tick);
};
$('#pausa').onclick = () => {
  if (!sim || sim.t >= tiempoCaida(sim.h, sim.g)) return;
  sim.run = !sim.run;
  $('#pausa').textContent = sim.run ? 'Pausar' : 'Reanudar';
  $('#est').textContent = sim.run ? 'Estado: en ejecución.' : 'Estado: pausada.';
  if (sim.run) { sim.last = null; requestAnimationFrame(tick); }
};
$('#reset').onclick = () => { sim = null; ctx.clearRect(0, 0, cv.width, cv.height); $('#pausa').textContent = 'Pausar'; $('#est').textContent = 'Estado: pendiente. Pulsa «Soltar».'; $('#tiem').textContent = 'Tiempo: 0,00 s'; $('#res').textContent = ''; };

// ---- L.E.O. (tutor por reglas, pistas progresivas) ----
const PISTAS = {
  q1: ['Pista 1 (concepto): sin aire, todos los cuerpos en caída libre tienen la misma aceleración g.',
       'Pista 2 (matemática): revisa t = √(2h/g). ¿Aparece la masa en la ecuación?',
       'Pista 3 (ejemplo): dos esferas de 1 kg y 5 kg se sueltan desde 20 m en Marte (g = 3,71 m/s²). Calcula t para cada una. ¿Qué observas?'],
  q2: ['Pista 1 (concepto): parte del reposo, así que y = h − ½·g·t² y cae hasta y = 0.',
       'Pista 2 (matemática): despeja t = √(2h/g). Comprueba que usas g de la Luna y h = 80 m, en m y s.',
       'Pista 3 (ejemplo): en Marte, h = 20 m: t = √(2·20/3,71) ≈ 3,28 s. Repite el procedimiento con tus datos.']
};
const pista = (q) => PISTAS[q][Math.min(S.m1.fallos[q], 3) - 1];
$('#comprobar').onclick = () => {
  const out = [], r = document.querySelector('input[name=q1]:checked');
  const p = parseFloat($('#pred').value.replace(',', '.'));
  S.m1.intentos++;
  if (!r) out.push(['bad', '1. Elige una opción.']);
  else if (!S.logros.m1_sim) out.push(['bad', '1. Antes de responder, ejecuta un experimento con dos masas distintas.']);
  else if (r.value === 'igual') {
    S.m1.concepto = true;
    out.push(['ok', '1. Correcto' + (otorgar(S, 'm1_concepto', 20) ? ' (+20 PR)' : '') + ': sin aire, la masa no cambia el tiempo de caída. ¿Qué cambiaría si hubiera resistencia del aire?']);
  } else { S.m1.fallos.q1++; out.push(['bad', '1. Incorrecto. ' + pista('q1')]); }
  if (!Number.isFinite(p) || p <= 0) out.push(['bad', '2. Escribe un número positivo en segundos.']);
  else if (Math.abs(p - RETO.t) / RETO.t <= RETO.tol) {
    S.m1.tiempo = true;
    out.push(['ok', '2. Correcto' + (otorgar(S, 'm1_tiempo', 20) ? ' (+20 PR)' : '') + ': tu valor está dentro del 3 % del teórico (' + fmt(RETO.t) + ' s).']);
  } else {
    S.m1.fallos.q2++;
    const tierra = tiempoCaida(RETO.h, GRAVEDAD.tierra.g);
    const diag = Math.abs(p - tierra) / tierra <= RETO.tol ? ' Tu valor coincide con el que daría g de la Tierra: revisa la gravedad usada.' : '';
    out.push(['bad', '2. Fuera del margen del 3 %.' + diag + ' ' + pista('q2')]);
  }
  if (S.m1.concepto && S.m1.tiempo && !S.m1.completada) {
    S.m1.completada = true; otorgar(S, 'm1_fin', 30);
    out.push(['ok', 'Misión 1 completada (+30 PR). Nivel 2 desbloqueado en el mapa (aún en construcción).']);
  }
  const fb = $('#fb'); fb.textContent = '';
  out.forEach(([c, t]) => { const p = document.createElement('p'); p.className = 'fb-' + c; p.textContent = (c === 'ok' ? '✔ ' : '✖ ') + t; fb.append(p); });
  guardar(S); pintarPR();
};
$('#borrar').onclick = () => { if (confirm('¿Borrar todo tu progreso?')) { S = reiniciar(); pintarPR(); pintarMapa(); } };

iniciarMision2({ get S() { return S; }, repintar: () => { guardar(S); pintarPR(); } });
pintarPR(); ir('curso');