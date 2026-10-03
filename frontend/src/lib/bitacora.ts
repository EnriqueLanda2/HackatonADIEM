import { ParcelaDashboard } from '@/types';
import { API_URL } from './api';
import { tokenSesion } from './auth';

export function tipoRiegoTexto(parcela: ParcelaDashboard): string {
  if (parcela.parcela.metodo_riego === 'goteo') return 'Goteo';
  if (parcela.parcela.metodo_riego === 'aspersion') return 'Aspersión';
  return 'Ninguno';
}

function getBrowserInfo(): { navegador: string; sistema: string; dispositivo: string; idioma: string; zona_horaria: string } {
  if (typeof window === 'undefined') {
    return { navegador: 'Desconocido', sistema: 'Desconocido', dispositivo: 'Desconocido', idioma: 'es', zona_horaria: 'UTC' };
  }
  const ua = window.navigator.userAgent;
  let navegador = 'Desconocido';
  if (ua.includes('Chrome')) navegador = 'Chrome';
  else if (ua.includes('Firefox')) navegador = 'Firefox';
  else if (ua.includes('Safari')) navegador = 'Safari';
  else if (ua.includes('Edge')) navegador = 'Edge';

  let sistema = 'Desconocido';
  if (ua.includes('Win')) sistema = 'Windows';
  else if (ua.includes('Mac')) sistema = 'macOS';
  else if (ua.includes('Linux')) sistema = 'Linux';
  else if (ua.includes('Android')) sistema = 'Android';
  else if (ua.includes('iOS')) sistema = 'iOS';

  const dispositivo = /Mobile|Android|iP(hone|od|ad)/.test(ua) ? 'Móvil' : 'Escritorio';

  return {
    navegador,
    sistema,
    dispositivo,
    idioma: window.navigator.language,
    zona_horaria: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export async function registrarBitacora(dto: { categoria: string; accion: string; detalle?: string; tipo_riego?: string | null; parcela?: string | null }) {
  const token = tokenSesion();
  if (!token) return;

  const env = getBrowserInfo();
  const payload = {
    ...dto,
    ...env,
    origen: typeof window !== 'undefined' ? window.location.href : 'Servidor',
  };

  try {
    await fetch(`${API_URL}/bitacora`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Error al registrar bitácora', err);
  }
}

export async function listarBitacora() {
  const token = tokenSesion();
  if (!token) return [];

  try {
    const res = await fetch(`${API_URL}/bitacora`, {
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Error al listar bitácora', err);
    return [];
  }
}
