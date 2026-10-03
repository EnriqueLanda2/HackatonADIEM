// =============================================================================
// Sesiones por rol
// - Técnico: configura parcelas e instala tuberías.
// - Productor: monitorea y opera riego, dron y alertas.
// Con backend el token lo firma el servidor; sin backend se usa una sesión local
// de demostración con las mismas cuentas.
// =============================================================================

import { Rol, Sesion, UsuarioSesion } from '@/types';

const STORAGE_KEY = 'agromai.sesion';
export const EVENTO_SESION_EXPIRADA = 'agromai:sesion-expirada';
const SESION_DEMO_HORAS = 12;

export const CUENTAS_DEMO: { email: string; password: string; usuario: Omit<UsuarioSesion, 'id'> }[] = [
  { email: 'tecnico@agromai.mx', password: 'tecnico123', usuario: { nombre: 'Técnico de campo', email: 'tecnico@agromai.mx', rol: 'tecnico' } },
  { email: 'productor@agromai.mx', password: 'productor123', usuario: { nombre: 'Productor Ejido Morelos', email: 'productor@agromai.mx', rol: 'productor' } },
];

export const ROL_INFO: Record<Rol, { label: string; icono: string; descripcion: string }> = {
  tecnico: { label: 'Técnico', icono: '🛠️', descripcion: 'Da de alta parcelas, instala tuberías y configura el sistema.' },
  productor: { label: 'Productor', icono: '👨‍🌾', descripcion: 'Monitorea el cultivo y opera el riego, el dron y las alertas.' },
};

let sesionActual: Sesion | null = null;

function guardar(sesion: Sesion | null) {
  sesionActual = sesion;
  try {
    if (sesion) localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento disponible la sesión dura lo que la pestaña.
  }
}

export function obtenerSesion(): Sesion | null {
  if (sesionActual) return new Date(sesionActual.expira).getTime() > Date.now() ? sesionActual : null;
  try {
    const guardada = localStorage.getItem(STORAGE_KEY);
    if (!guardada) return null;
    const sesion: Sesion = JSON.parse(guardada);
    if (new Date(sesion.expira).getTime() <= Date.now()) {
      guardar(null);
      return null;
    }
    sesionActual = sesion;
    return sesion;
  } catch {
    return null;
  }
}

export const tokenSesion = () => obtenerSesion()?.token;
export const esTecnico = () => obtenerSesion()?.usuario.rol === 'tecnico';

export async function iniciarSesion(apiUrl: string, email: string, password: string): Promise<Sesion> {
  let respuesta: Response | null = null;
  try {
    respuesta = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    respuesta = null; // backend no disponible
  }

  if (respuesta) {
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.message ?? 'No se pudo iniciar sesión.');
    const sesion: Sesion = { token: datos.token, usuario: datos.usuario, expira: datos.expira };
    guardar(sesion);
    return sesion;
  }

  // Modo demo sin backend
  const cuenta = CUENTAS_DEMO.find((c) => c.email === email.trim().toLowerCase() && c.password === password);
  if (!cuenta) throw new Error('Correo o contraseña incorrectos.');
  const sesion: Sesion = {
    token: 'demo',
    usuario: { id: `demo-${cuenta.usuario.rol}`, ...cuenta.usuario },
    expira: new Date(Date.now() + SESION_DEMO_HORAS * 3600000).toISOString(),
    demo: true,
  };
  guardar(sesion);
  return sesion;
}

export function cerrarSesion() {
  guardar(null);
}

// El backend rechazó el token (expiró, es de demo o fue alterado): se pide iniciar sesión otra vez.
export function notificarSesionExpirada() {
  guardar(null);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO_SESION_EXPIRADA));
}

// Cambia la suscripción. Con backend lo valida el servidor y devuelve la sesión nueva; en demo es local.
export async function cambiarPlan(apiUrl: string, plan: 'basico' | 'pro'): Promise<Sesion> {
  const actual = obtenerSesion();
  if (!actual) throw new Error('Inicia sesión para cambiar de plan.');
  if (!actual.demo) {
    const respuesta = await fetch(`${apiUrl}/auth/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${actual.token}` },
      body: JSON.stringify({ plan }),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.message ?? 'No se pudo cambiar el plan.');
    const sesion: Sesion = { token: datos.token, usuario: datos.usuario, expira: datos.expira };
    guardar(sesion);
    return sesion;
  }
  const sesion: Sesion = { ...actual, usuario: { ...actual.usuario, plan } };
  guardar(sesion);
  return sesion;
}
