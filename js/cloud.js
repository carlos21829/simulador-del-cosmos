// Acceso y progreso en Supabase. Todo error de red se convierte en un mensaje; nada de esto bloquea el modo local.
import { CONFIG } from './config.js';
let sb = null, user = null;

export const configurado = () => !!CONFIG.url && !!CONFIG.anonKey && !CONFIG.url.includes('TU-PROYECTO') && !CONFIG.anonKey.startsWith('TU_');
export const activa = () => !!user;

async function cargarPerfil(u) {
  const { data, error } = await sb.from('profiles').select('rol,alias').eq('id', u.id).maybeSingle();
  if (error) return { error: 'No se pudo leer tu perfil. Comprueba la conexión.' };
  if (!data) return { error: 'Tu cuenta no tiene un perfil asignado. Pide al docente que la configure.' };
  user = u;
  return { modo: 'nube', user: u, perfil: data };
}
export async function iniciar() {
  if (!configurado()) return { modo: 'local', motivo: 'Supabase aún no está configurado en js/config.js' };
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
    sb = createClient(CONFIG.url, CONFIG.anonKey);
    const { data } = await sb.auth.getSession();
    if (data.session) { const r = await cargarPerfil(data.session.user); return r.error ? { modo: 'login', error: r.error } : r; }
    return { modo: 'login' };
  } catch { return { modo: 'local', motivo: 'no se pudo cargar la librería o conectar con el servicio' }; }
}
export async function entrar(email, clave) {
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password: clave });
    if (error) return { error: 'Correo o contraseña incorrectos.' };
    return await cargarPerfil(data.user);
  } catch { return { error: 'No hay conexión con el servicio. Inténtalo de nuevo.' }; }
}
export async function token() { try { const { data } = await sb.auth.getSession(); return data.session ? data.session.access_token : null; } catch { return null; } }
export async function salir() { try { await sb.auth.signOut(); } catch {} user = null; }
export async function leerProgreso() {
  try { const { data } = await sb.from('progreso').select('estado').eq('user_id', user.id).maybeSingle(); return data ? data.estado : null; } catch { return null; }
}
export async function guardarProgreso(estado) {
  try {
    const { error } = await sb.from('progreso').upsert({ user_id: user.id, estado, pr: estado.pr, actualizado: new Date().toISOString() });
    return !error;
  } catch { return false; }
}
export async function listarEstudiantes() {
  try {
    const a = await sb.from('profiles').select('id,alias').eq('rol', 'estudiante');
    const b = await sb.from('progreso').select('user_id,pr,estado,actualizado');
    if (a.error || b.error) return { error: 'No se pudieron cargar los resultados. Comprueba la conexión y que tu cuenta sea de docente.' };
    const m = new Map(b.data.map((x) => [x.user_id, x]));
    return { filas: a.data.map((p) => ({ alias: p.alias, ...(m.get(p.id) || {}) })) };
  } catch { return { error: 'No hay conexión con el servicio.' }; }
}
