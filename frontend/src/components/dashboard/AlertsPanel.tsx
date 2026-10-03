'use client';

import { Alerta } from '@/types';

interface AlertsPanelProps {
  alertas: Alerta[];
  onDismiss?: (id: string) => void;
}

export default function AlertsPanel({ alertas, onDismiss }: AlertsPanelProps) {
  if (alertas.length === 0) {
    return (
      <div className="bg-[#131d08]/70 border border-[#8DA432]/20 rounded-xl p-4 text-center">
        <span className="text-2xl">✅</span>
        <p className="text-[#EDE383]/60 text-sm mt-2 font-medium">Sin alertas activas en el sembradío</p>
      </div>
    );
  }

  const severidadConfig = {
    critica: {
      bg: 'bg-[#925E06]/35 border-[#925E06]',
      icon: '🚨',
      badge: 'bg-[#925E06] text-[#FFFCE9]',
      label: 'CRÍTICA',
    },
    alta: {
      bg: 'bg-[#925E06]/20 border-[#EDE383]/50',
      icon: '⚠️',
      badge: 'bg-[#EDE383] text-[#0f1706]',
      label: 'ALTA',
    },
    media: {
      bg: 'bg-[#365004]/40 border-[#8DA432]/50',
      icon: '📋',
      badge: 'bg-[#8DA432] text-[#0f1706]',
      label: 'MEDIA',
    },
    baja: {
      bg: 'bg-[#365004]/20 border-[#8DA432]/30',
      icon: 'ℹ️',
      badge: 'bg-[#365004] text-[#EDE383]',
      label: 'INFO',
    },
  };

  const tipoConfig: Record<string, { icon: string; color: string }> = {
    prevencion_organica: { icon: '🍄', color: 'text-[#EDE383]' },
    nivel_reserva: { icon: '🏗️', color: 'text-[#FFFCE9]' },
    humedad_critica: { icon: '💧', color: 'text-[#EDE383]' },
    temperatura: { icon: '🌡️', color: 'text-[#FFFCE9]' },
    pronostico: { icon: '🌧️', color: 'text-[#8DA432]' },
    dron_vacio: { icon: '🚁', color: 'text-[#EDE383]' },
    dron_emergencia: { icon: '🚀', color: 'text-[#8DA432]' },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[#FFFCE9] font-bold text-sm flex items-center gap-2">
          <span>🔔 Alertas del Sistema</span>
          <span className="bg-[#925E06] text-[#FFFCE9] text-xs px-2 py-0.5 rounded-full font-bold">
            {alertas.length}
          </span>
        </h2>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
        {alertas.map((alerta) => {
          const config = severidadConfig[alerta.severidad] || severidadConfig.media;
          const tipo = tipoConfig[alerta.tipo] || { icon: '📋', color: 'text-[#FFFCE9]' };

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
                  <p className="text-xs text-[#FFFCE9]/80 mt-1 leading-relaxed">
                    {alerta.mensaje}
                  </p>
                  <div className="text-[10px] text-[#EDE383]/60 mt-2">
                    {new Date(alerta.created_at).toLocaleString('es-MX')}
                  </div>
                </div>
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(alerta.id)}
                    className="text-[#EDE383]/60 hover:text-[#FFFCE9] text-xs p-1 hover:bg-[#365004]/40 rounded-lg transition-all"
                    title="Descartar alerta"
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
