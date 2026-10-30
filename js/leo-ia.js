// L.E.O. con IA generativa (Gemini, vía Worker). Opcional: si no está disponible, las pistas por reglas siguen funcionando.
import { LEO_URL } from './leo-config.js';
import * as nube from './cloud.js';
const $ = (s) => document.querySelector(s);

export function iniciarLeoIA(juego) {
  const out = $('#leo-resp'), btn = $('#leo-enviar');
  $('#leo-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pregunta = $('#leo-pregunta').value.trim(), m = Number($('#leo-mision').value);
    if (!pregunta) { out.textContent = 'Escribe tu pregunta primero.'; return; }
    if (!LEO_URL.startsWith('https://') || !nube.activa()) { out.textContent = 'L.E.O. con IA no está disponible (requiere iniciar sesión y que el servicio esté configurado). Usa las pistas de cada misión.'; return; }
    btn.disabled = true; out.textContent = 'L.E.O. está pensando…';
    try {
      const token = await nube.token(), mm = juego.S['m' + m];
      const r = await fetch(LEO_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ pregunta, mision: m, contexto: { intentos: Number(mm.intentos) || 0, completada: !!mm.completada } })
      });
      const d = await r.json().catch(() => ({}));
      out.textContent = r.ok && d.texto ? d.texto : (d.error || 'No se pudo obtener respuesta. Usa las pistas de la misión.');
    } catch { out.textContent = 'No hay conexión con L.E.O. con IA. Usa las pistas de cada misión.'; }
    finally { setTimeout(() => { btn.disabled = false; }, 3000); }
  });
}
