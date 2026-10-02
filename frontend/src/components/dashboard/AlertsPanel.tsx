'use client';

import { Alerta } from '@/types';

interface AlertsPanelProps {
  alertas: Alerta[];
  onDismiss?: (id: string) => void;
}

export default function AlertsPanel({ alertas, onDismiss }: AlertsPanelProps) {
  if (alertas.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
        <span className="text-2xl">✅</span>
        <p className="text-white/50 text-sm mt-2">Sin alertas activas</p>
      </div>
    );
  }

  const severidadConfig = {
    critica: {
      bg: 'bg-red-500/15 border-red-500/40',
      icon: '🚨',
      badge: 'bg-red-500 text-white',
      label: 'CRÍTICA',
    },
    alta: {
      bg: 'bg-orange-500/15 border-orange-500/40',
      icon: '⚠️',
      badge: 'bg-orange-500 text-white',
      label: 'ALTA',
    },
    media: {
      bg: 'bg-yellow-500/15 border-yellow-500/40',
      icon: '📋',
      badge: 'bg-yellow-500 text-black',
      label: 'MEDIA',
    },
    baja: {
      bg: 'bg-blue-500/15 border-blue-500/40',
      icon: 'ℹ️',
      badge: 'bg-blue-500 text-white',
      label: 'BAJA',
    },
  };

  const tipoConfig: Record<string, { icon: string; color: string }> = {
    prevencion_organica: { icon: '🍄', color: 'text-orange-300' },
    nivel_reserva: { icon: '🏗️', color: 'text-red-300' },
    humedad_critica: { icon: '💧', color: 'text-yellow-300' },
    temperatura: { icon: '🌡️', color: 'text-red-300' },
    pronostico: { icon: '🌧️', color: 'text-blue-300' },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold flex items-center gap-2">
          🔔 Alertas Activas
          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            {alertas.length}
          </span>
        </h2>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
        {alertas.map((alerta) => {
          const config = severidadConfig[alerta.severidad];
          const tipo = tipoConfig[alerta.tipo] || { icon: '📋', color: 'text-white' };

          return (
            <div
              key={alerta.id}
              className={`rounded-xl p-3 border backdrop-blur-sm transition-all ${config.bg} ${
                alerta.severidad === 'critica' ? 'animate-pulse-slow' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{tipo.icon}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${config.badge}`}
                    >
                      {config.label}
                    </span>
                  </div>
                  <h3 className={`text-sm font-semibold ${tipo.color}`}>
                    {alerta.titulo}
                  </h3>
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    {alerta.mensaje}
                  </p>
                  <div className="text-[10px] text-white/30 mt-2">
                    {new Date(alerta.created_at).toLocaleString('es-MX')}
                  </div>
                </div>
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(alerta.id)}
                    className="text-white/30 hover:text-white/60 transition-colors text-sm"
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
