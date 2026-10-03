'use client';

import { useState } from 'react';
import { PronosticoClima, TanqueAgua, UsuarioSesion } from '@/types';
import { ROL_INFO } from '@/lib/auth';
import { api } from '@/lib/api';
import { EstadoNotificaciones } from '@/lib/push';

// =============================================================================
// Header / Barra Superior
// =============================================================================
interface HeaderProps {
  backendStatus: boolean;
  checking: boolean;
  onRefresh?: () => void;
  onOpenCreateParcel?: () => void;
  usuario?: UsuarioSesion;
  onLogout?: () => void;
  notificaciones?: {
    estado: EstadoNotificaciones;
    activar: () => Promise<EstadoNotificaciones>;
    probar: () => Promise<void>;
  };
}

const NOTIFICACION_INFO: Record<EstadoNotificaciones, { icono: string; label: string; titulo: string }> = {
  no_soportado: { icono: '🔕', label: 'Sin soporte', titulo: 'Este navegador no soporta notificaciones.' },
  bloqueado: { icono: '🔕', label: 'Bloqueadas', titulo: 'Permite las notificaciones de este sitio en la configuración del navegador.' },
  inactivo: { icono: '🔔', label: 'Activar alertas', titulo: 'Recibe avisos de agua baja, riesgo, sequía, lluvia y plagas.' },
  local: { icono: '🔔', label: 'Alertas locales', titulo: 'Notificaciones en este navegador. Conecta el backend para recibir push con la app cerrada. Clic para probar.' },
  push: { icono: '🔔', label: 'Push activas', titulo: 'Recibirás push aunque la app esté cerrada. Clic para enviar una prueba.' },
};

function NotificationBell({ notificaciones }: { notificaciones: NonNullable<HeaderProps['notificaciones']> }) {
  const [enviando, setEnviando] = useState(false);
  const info = NOTIFICACION_INFO[notificaciones.estado];
  const activo = notificaciones.estado === 'push' || notificaciones.estado === 'local';
  const deshabilitado = notificaciones.estado === 'no_soportado' || notificaciones.estado === 'bloqueado';

  const handleClick = async () => {
    setEnviando(true);
    try {
      if (activo) await notificaciones.probar();
      else await notificaciones.activar();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={deshabilitado || enviando}
      title={info.titulo}
      className={`flex h-9 min-w-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 sm:px-3 ${
        activo
          ? 'cursor-pointer border-applegreen bg-applegreen/20 text-creme hover:bg-applegreen hover:text-ink'
          : 'cursor-pointer border-flax/60 bg-flax/15 text-flax hover:bg-flax hover:text-ink'
      }`}
    >
      <span className={activo ? '' : 'animate-pulse'}>{info.icono}</span>
      <span className="hidden lg:inline">{enviando ? 'Enviando…' : info.label}</span>
    </button>
  );
}

export function Header({
  backendStatus,
  onRefresh,
  onOpenCreateParcel,
  notificaciones,
  usuario,
  onLogout,
}: HeaderProps) {
  const iconButton =
    'flex h-9 min-w-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-semibold transition-all sm:px-3';

  return (
    // Fija arriba y con margen para el notch cuando la PWA corre a pantalla completa.
    <header className="sticky top-0 z-40 border-b border-applegreen/40 bg-darkgreen/95 pt-[env(safe-area-inset-top)] shadow-lg shadow-black/20 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 py-2.5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:gap-3 sm:py-3.5 sm:px-6">
        {/* Logo y nombre */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-applegreen/50 bg-creme shadow-inner sm:h-11 sm:w-11">
            <img src="/agromai-logo.png" alt="Logo de agromIA" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold tracking-tight text-creme sm:text-xl">agromIA</h1>
              <span
                title={backendStatus ? 'Conectado al servidor' : 'Modo demo: datos locales'}
                className={`h-2 w-2 shrink-0 rounded-full sm:hidden ${backendStatus ? 'bg-applegreen' : 'bg-goldenbrown'}`}
              />
            </div>
            <span className="hidden text-xs font-medium text-flax sm:block">Morelos · AgroTech</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {onOpenCreateParcel && (
            <button
              onClick={onOpenCreateParcel}
              title="Nueva parcela"
              aria-label="Nueva parcela"
              className={`${iconButton} border-flax/40 bg-applegreen font-bold text-ink shadow-md shadow-black/20 hover:bg-card hover:text-creme`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="hidden lg:inline">Nueva parcela</span>
            </button>
          )}

          {notificaciones && <NotificationBell notificaciones={notificaciones} />}

          <span className="hidden rounded-xl border border-goldenbrown bg-goldenbrown/30 px-3 py-1.5 text-xs font-semibold text-flax sm:inline">
            {backendStatus ? '● En línea' : '⚡ Modo demo'}
          </span>

          <button
            onClick={onRefresh}
            title="Actualizar"
            aria-label="Actualizar"
            className={`${iconButton} border-applegreen/60 bg-card/60 text-creme hover:bg-applegreen hover:text-ink`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span className="hidden lg:inline">Actualizar</span>
          </button>

          {usuario && (
            <div className="flex h-9 items-center gap-1 rounded-xl border border-applegreen/40 bg-card/60 pl-2 pr-1 sm:gap-2 sm:pl-3">
              <div className="hidden text-right leading-tight md:block">
                <div className="text-xs font-semibold text-creme">{usuario.nombre}</div>
                <div className="text-[10px] text-flax/70">
                  {ROL_INFO[usuario.rol].icono} {ROL_INFO[usuario.rol].label}
                </div>
              </div>
              <span className="md:hidden" title={`${usuario.nombre} · ${ROL_INFO[usuario.rol].label}`}>
                {ROL_INFO[usuario.rol].icono}
              </span>
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-flax transition-colors hover:bg-goldenbrown hover:text-creme"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// =============================================================================
// Panel de Cisterna Principal
// =============================================================================
export function TankPanel({ tanque, modoGlobal = 'automatico' }: { tanque: TanqueAgua; modoGlobal?: 'automatico' | 'manual' }) {
  const [refilling, setRefilling] = useState(false);
  const nivel = Number(tanque?.nivel_actual_porcentaje ?? 0);
  const capacidad = Number(tanque?.capacidad_litros ?? 50000);
  const isCritical = nivel < 25;
  const volumenActual = ((capacidad * nivel) / 100 / 1000).toFixed(1);
  const capacidadTotal = (capacidad / 1000).toFixed(0);

  const handleRefillCistern = () => {
    if (modoGlobal === 'automatico') return;
    setRefilling(true);
    api.rellenarTanque(100);
    setTimeout(() => setRefilling(false), 2000);
  };

  return (
    <div className="bg-card rounded-2xl p-5 border border-applegreen/35 flex flex-col justify-between shadow-lg shadow-black/15">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-creme font-bold text-base">
          <span className="text-xl">🚰</span>
          <span>Cisterna Principal</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
          nivel >= 95 
            ? 'bg-applegreen/30 text-flax border-applegreen'
            : isCritical
            ? 'bg-goldenbrown/40 text-creme border-goldenbrown'
            : 'bg-darkgreen/60 text-flax border-applegreen/40'
        }`}>
          {nivel >= 95 ? 'Corte Flotador Activo' : isCritical ? 'Reserva Crítica' : 'Nivel Operativo'}
        </span>
      </div>

      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-2.5">
          <span className="text-4xl font-extrabold tracking-tight text-creme">
            {nivel.toFixed(0)}%
          </span>
          <span className="text-xs text-flax font-medium">
            {volumenActual} / {capacidadTotal} m³
          </span>
        </div>
        <button
          onClick={handleRefillCistern}
          disabled={refilling || nivel >= 98 || modoGlobal === 'automatico'}
          className="text-xs px-3.5 py-1.5 rounded-xl font-bold bg-applegreen hover:bg-darkgreen text-ink hover:text-creme border border-flax/40 shadow-sm transition-all disabled:opacity-40 cursor-pointer"
        >
          {modoGlobal === 'automatico' ? 'Recarga automática' : refilling ? 'Llenando...' : nivel >= 98 ? 'Cisterna Llena' : 'Rellenar Cisterna'}
        </button>
      </div>

      <div className="w-full bg-panel h-2.5 rounded-full overflow-hidden border border-applegreen/30">
        <div
          className={`h-full transition-all duration-1000 ${
            isCritical ? 'bg-goldenbrown' : 'bg-applegreen'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, nivel))}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-flax/70 mt-1.5">
        <span>0 m³</span>
        <span>Sensor Boya / Ultrasonido OK</span>
        <span>{capacidadTotal} m³</span>
      </div>
    </div>
  );
}
