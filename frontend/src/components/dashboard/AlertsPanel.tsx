'use client';

import { Alerta } from '@/types';

interface AlertsPanelProps {
  alertas: Alerta[];
  onDismiss?: (id: string) => void;
}

export default function AlertsPanel({ alertas, onDismiss }: AlertsPanelProps) {
  if (alertas.length === 0) {
    return (
      <div className="bg-card border border-applegreen/30 rounded-2xl p-5 text-center shadow-lg shadow-black/15">
        <span className="text-3xl">✅</span>
        <p className="text-flax text-sm font-semibold mt-2">Sin alertas activas · Todos los parámetros en rango óptimo</p>
      </div>
    );
  }

  const severidadConfig = {
    critica: {
      bg: 'bg-goldenbrown/60 border-goldenbrown',
      icon: '🚨',
      badge: 'bg-goldenbrown text-creme',
      label: 'CRÍTICA',
    },
    alta: {
      bg: 'bg-goldenbrown/35 border-goldenbrown',
      icon: '⚠️',
      badge: 'bg-goldenbrown text-flax',
      label: 'ALTA',
    },
    media: {
      bg: 'bg-darkgreen/70 border-applegreen',
      icon: '📋',
      badge: 'bg-applegreen text-ink',
      label: 'MEDIA',
    },
    baja: {
      bg: 'bg-panel border-applegreen/40',
      icon: 'ℹ️',
      badge: 'bg-darkgreen text-flax',
      label: 'INFO',
    },
  };

  const tipoConfig: Record<string, { icon: string; color: string }> = {
    prevencion_organica: { icon: '🍄', color: 'text-flax' },
    nivel_reserva: { icon: '🚰', color: 'text-creme' },
    humedad_critica: { icon: '💧', color: 'text-creme' },
    temperatura: { icon: '🌡️', color: 'text-flax' },
    pronostico: { icon: '🌧️', color: 'text-applegreen' },
    plaga_detectada: { icon: '🐛', color: 'text-creme' },
    escaneo_limpio: { icon: '✅', color: 'text-applegreen' },
    riesgo_plaga: { icon: '🤖', color: 'text-flax' },
    sequia: { icon: '☀️', color: 'text-flax' },
    lluvia_proxima: { icon: '🌧️', color: 'text-applegreen' },
    dron_vacio: { icon: '🚁', color: 'text-flax' },
    dron_emergencia: { icon: '🧪', color: 'text-flax' },
  };

  return (
    <div className="bg-card rounded-2xl p-5 border border-goldenbrown/50 shadow-lg shadow-black/15 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-applegreen/20">
        <h2 className="text-creme font-bold text-base flex items-center gap-2">
          <span>🔔</span> Alertas Activas del Sembradío
          <span className="bg-goldenbrown text-creme font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-sm">
            {alertas.length}
          </span>
        </h2>
      </div>

      <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
        {alertas.map((alerta) => {
          const config = severidadConfig[alerta.severidad] || severidadConfig.media;
          const tipo = tipoConfig[alerta.tipo] || { icon: '📋', color: 'text-creme' };

          return (
            <div
              key={alerta.id}
              className={`rounded-xl p-3.5 border transition-all ${config.bg} ${
                alerta.severidad === 'critica' ? 'animate-pulse-slow' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xl">{tipo.icon}</span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-black tracking-wide ${config.badge}`}
                    >
                      {config.label}
                    </span>
                  </div>
                  <h3 className={`text-sm font-bold ${tipo.color}`}>
                    {alerta.titulo}
                  </h3>
                  <p className="text-xs text-flax mt-1 leading-relaxed font-medium">
                    {alerta.mensaje}
                  </p>
                  <div className="text-[10px] text-flax/60 mt-2 font-mono">
                    {new Date(alerta.created_at).toLocaleString('es-MX')}
                  </div>
                </div>
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(alerta.id)}
                    className="text-flax hover:text-creme hover:bg-applegreen/20 p-1 rounded-lg transition-colors text-sm font-bold cursor-pointer"
                    title="Marcar como leída"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
