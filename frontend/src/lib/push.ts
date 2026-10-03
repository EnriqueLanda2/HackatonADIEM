// =============================================================================
// Push notifications
// - Con backend: el dispositivo se suscribe con VAPID y el backend envía la push a
//   todos los dispositivos suscritos (llega aunque la app esté cerrada).
// - Sin backend: se muestra una notificación local desde el service worker.
// =============================================================================

import { API_URL, api } from './api';
import { Severidad } from '@/types';

export type EstadoNotificaciones = 'no_soportado' | 'bloqueado' | 'inactivo' | 'local' | 'push';

export interface Notificacion {
  clave: string;
  titulo: string;
  mensaje: string;
  tipo?: string;
  severidad?: Severidad;
  parcela_id?: string;
  cooldown_min?: number;
}

const COOLDOWN_LOCAL_MS = 30 * 60000;
const enviadasLocal = new Map<string, number>();

export function soportaNotificaciones(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

const soportaPush = () => soportaNotificaciones() && 'PushManager' in window;

async function registrarServiceWorker(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

function base64UrlABytes(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function estadoNotificaciones(): Promise<EstadoNotificaciones> {
  if (!soportaNotificaciones()) return 'no_soportado';
  if (Notification.permission === 'denied') return 'bloqueado';
  if (Notification.permission !== 'granted') return 'inactivo';
  if (!soportaPush()) return 'local';
  const registro = await navigator.serviceWorker.getRegistration();
  const suscripcion = await registro?.pushManager.getSubscription();
  return suscripcion ? 'push' : 'local';
}

// Pide permiso y suscribe el dispositivo a las push del backend (si está disponible).
export async function activarNotificaciones(): Promise<EstadoNotificaciones> {
  if (!soportaNotificaciones()) return 'no_soportado';
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return permiso === 'denied' ? 'bloqueado' : 'inactivo';

  const registro = await registrarServiceWorker();
  if (!soportaPush() || !(await api.isBackendAvailable())) return 'local';
  try {
    const { publicKey } = await fetch(`${API_URL}/notificaciones/vapid-public-key`).then((r) => r.json());
    let suscripcion = await registro.pushManager.getSubscription();
    if (!suscripcion) {
      suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlABytes(publicKey) as BufferSource,
      });
    }
    const res = await fetch(`${API_URL}/notificaciones/suscribir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suscripcion.toJSON()),
    });
    return res.ok ? 'push' : 'local';
  } catch (err) {
    console.warn('No se pudo suscribir a push; se usarán notificaciones locales:', err);
    return 'local';
  }
}

async function mostrarLocal(n: Notificacion) {
  if (!soportaNotificaciones() || Notification.permission !== 'granted') return;
  const ultima = enviadasLocal.get(n.clave) ?? 0;
  if (Date.now() - ultima < (n.cooldown_min != null ? n.cooldown_min * 60000 : COOLDOWN_LOCAL_MS)) return;
  enviadasLocal.set(n.clave, Date.now());
  const registro = await registrarServiceWorker();
  await registro.showNotification(n.titulo, {
    body: n.mensaje,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: n.clave,
    data: n,
  });
}

// Entrega una notificación: por el backend a todos los dispositivos y, si este
// dispositivo no está suscrito a push (o el backend falla), localmente.
export async function notificar(n: Notificacion, estado: EstadoNotificaciones): Promise<void> {
  let entregadaPorPush = false;
  if (await api.isBackendAvailable()) {
    try {
      const res = await fetch(`${API_URL}/notificaciones/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n),
      });
      entregadaPorPush = res.ok && estado === 'push';
    } catch {
      entregadaPorPush = false;
    }
  }
  if (!entregadaPorPush) await mostrarLocal(n);
}

export async function enviarPrueba(estado: EstadoNotificaciones): Promise<void> {
  await notificar(
    {
      clave: `prueba-${Date.now()}`,
      titulo: '🌱 agromIA',
      mensaje: estado === 'push' ? 'Push activas: recibirás alertas aunque la app esté cerrada.' : 'Notificaciones activas en este navegador.',
      tipo: 'prueba',
      severidad: 'baja',
      cooldown_min: 0,
    },
    estado
  );
}
