'use client';

import { ParcelaDashboard } from '@/types';

interface ParcelaCardProps {
  data: ParcelaDashboard;
  onSelect?: () => void;
  selected?: boolean;
  onToggleValve?: () => void;
}

export default function ParcelaCard({
  data,
  onSelect,
  selected,
  onToggleValve,
}: ParcelaCardProps) {
  const { parcela, cultivo, humedad_suelo, temperatura, humedad_ambiental, valvula_estado, valvula_modo } = data;

  // Determinar estado de humedad
  const humedadStatus =
    humedad_suelo < cultivo.humedad_minima
      ? 'critico'
      : humedad_suelo < cultivo.humedad_optima
      ? 'aceptable'
      : humedad_suelo <= cultivo.humedad_maxima
      ? 'optimo'
      : 'saturado';

  const statusColors = {
    critico: 'bg-red-500/20 border-red-500/50 text-red-400',
    aceptable: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
    optimo: 'bg-green-500/20 border-green-500/50 text-green-400',
    saturado: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  };

  const statusLabels = {
    critico: '🔴 Crítico',
    aceptable: '🟡 Aceptable',
    optimo: '🟢 Óptimo',
    saturado: '🔵 Saturado',
  };

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl p-4 cursor-pointer transition-all duration-300 border backdrop-blur-sm ${
        selected
          ? 'bg-white/15 border-yellow-400/60 shadow-lg shadow-yellow-400/10 scale-[1.02]'
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{cultivo.icono}</span>
          <div>
            <h3 className="font-semibold text-white text-sm">{parcela.nombre}</h3>
            <p className="text-[10px] text-white/50">{cultivo.nombre} · {cultivo.tipo_riego}</p>
          </div>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[humedadStatus]}`}
        >
          {statusLabels[humedadStatus]}
        </span>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Humedad del suelo */}
        <div className="bg-black/20 rounded-lg p-2 text-center">
          <div className="text-[10px] text-white/50 mb-1">💧 Humedad</div>
          <div className="text-lg font-bold text-white">{humedad_suelo.toFixed(0)}%</div>
          <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                humedadStatus === 'critico'
                  ? 'bg-red-500'
                  : humedadStatus === 'aceptable'
                  ? 'bg-yellow-500'
                  : humedadStatus === 'optimo'
                  ? 'bg-green-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, humedad_suelo)}%` }}
            />
          </div>
          <div className="text-[8px] text-white/30 mt-0.5">
            Rango: {cultivo.humedad_minima}-{cultivo.humedad_maxima}%
          </div>
        </div>

        {/* Temperatura */}
        <div className="bg-black/20 rounded-lg p-2 text-center">
          <div className="text-[10px] text-white/50 mb-1">🌡️ Temp</div>
          <div className="text-lg font-bold text-white">{temperatura.toFixed(1)}°</div>
          <div className="text-[8px] text-white/30 mt-1">
            Óptima: {cultivo.temp_optima}°C
          </div>
        </div>

        {/* Humedad ambiental */}
        <div className="bg-black/20 rounded-lg p-2 text-center">
          <div className="text-[10px] text-white/50 mb-1">🌫️ HR</div>
          <div
            className={`text-lg font-bold ${
              humedad_ambiental > cultivo.hr_alerta_hongos
                ? 'text-orange-400'
                : 'text-white'
            }`}
          >
            {humedad_ambiental.toFixed(0)}%
          </div>
          {humedad_ambiental > cultivo.hr_alerta_hongos && (
            <div className="text-[8px] text-orange-400 mt-1">⚠️ Riesgo hongos</div>
          )}
        </div>
      </div>

      {/* Válvula */}
      <div className="flex items-center justify-between bg-black/20 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              valvula_estado === 'abierta'
                ? 'bg-green-500 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          <span className="text-xs text-white/70">
            Válvula: {valvula_estado === 'abierta' ? '💧 Abierta' : '🔒 Cerrada'}
          </span>
          <span className="text-[10px] text-white/30">({valvula_modo})</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleValve?.();
          }}
          className={`text-[10px] px-3 py-1 rounded-full font-medium transition-colors ${
            valvula_estado === 'abierta'
              ? 'bg-red-500/30 text-red-300 hover:bg-red-500/50'
              : 'bg-green-500/30 text-green-300 hover:bg-green-500/50'
          }`}
        >
          {valvula_estado === 'abierta' ? 'Cerrar' : 'Abrir'}
        </button>
      </div>
    </div>
  );
}
