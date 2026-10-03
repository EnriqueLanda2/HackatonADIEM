'use client';

import { Alerta } from '@/types';

interface AlertsPanelProps {
  alertas: Alerta[];
  onDismiss?: (id: string) => void;
}

export default function AlertsPanel({ alertas, onDismiss }: AlertsPanelProps) {
  if (alertas.length === 0) {
    return (
      <div className="bg-[#161616] border border-[#8DA432]/30 rounded-2xl p-5 text-center shadow-lg shadow-black/15">
        <span className="text-3xl">✅</span>
        <p className="text-[#EDE383] text-sm font-semibold mt-2">Sin alertas activas · Todos los parámetros en rango óptimo</p>
      </div>
    );
  }

  const severidadConfig = {
    critica: {
      bg: 'bg-[#925E06]/60 border-[#925E06]',
      icon: '🚨',
      badge: 'bg-[#925E06] text-[#FFFCE9]',
      label: 'CRÍTICA',
    },
    alta: {
      bg: 'bg-[#925E06]/35 border-[#925E06]',
      icon: '⚠️',
      badge: 'bg-[#925E06] text-[#EDE383]',
      label: 'ALTA',
    },
    media: {
      bg: 'bg-[#365004]/70 border-[#8DA432]',
      icon: '📋',
      badge: 'bg-[#8DA432] text-[#FFFCE9]',
      label: 'MEDIA',
    },
    baja: {
      bg: 'bg-[#1e1e1e] border-[#8DA432]/40',
      icon: 'ℹ️',
      badge: 'bg-[#365004] text-[#EDE383]',
      label: 'INFO',
    },
  };

  const tipoConfig: Record<string, { icon: string; color: string }> = {
    prevencion_organica: { icon: '🍄', color: 'text-[#EDE383]' },
    nivel_reserva: { icon: '🚰', color: 'text-[#FFFCE9]' },
    humedad_critica: { icon: '💧', color: 'text-[#FFFCE9]' },
    temperatura: { icon: '🌡️', color: 'text-[#EDE383]' },
    pronostico: { icon: '🌧️', color: 'text-[#8DA432]' },
  };

  return (
    <div className="bg-[#161616] rounded-2xl p-5 border border-[#925E06]/50 shadow-lg shadow-black/15 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#8DA432]/20">
        <h2 className="text-[#FFFCE9] font-bold text-base flex items-center gap-2">
          <span>🔔</span> Alertas Activas del Sembradío
          <span className="bg-[#925E06] text-[#FFFCE9] font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-sm">
            {alertas.length}
          </span>
        </h2>
      </div>

      <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
        {alertas.map((alerta) => {
          const config = severidadConfig[alerta.severidad] || severidadConfig.media;
          const tipo = tipoConfig[alerta.tipo] || { icon: '📋', color: 'text-[#FFFCE9]' };

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
                  <p className="text-xs text-[#EDE383] mt-1 leading-relaxed font-medium">
                    {alerta.mensaje}
                  </p>
                  <div className="text-[10px] text-[#EDE383]/60 mt-2 font-mono">
                    {new Date(alerta.created_at).toLocaleString('es-MX')}
                  </div>
                </div>
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(alerta.id)}
                    className="text-[#EDE383] hover:text-[#FFFCE9] hover:bg-[#8DA432]/20 p-1 rounded-lg transition-colors text-sm font-bold cursor-pointer"
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
