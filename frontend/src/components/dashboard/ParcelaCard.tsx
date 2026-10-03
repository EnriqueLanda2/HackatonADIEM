'use client';

import { ParcelaDashboard } from '@/types';
import { getEstadoPH } from '@/lib/crop-profiles';

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
  const {
    parcela,
    cultivo,
    tiene_cultivo,
    humedad_suelo,
    temperatura,
    humedad_ambiental,
    ph_suelo,
    sensores_activos,
    valvula_estado,
    valvula_modo,
  } = data;

  const hasCrop = tiene_cultivo && !!cultivo;

  // Determinar estado de humedad
  const humedadStatus = hasCrop && cultivo
    ? humedad_suelo < cultivo.humedad_minima
      ? 'critico'
      : humedad_suelo < cultivo.humedad_optima
      ? 'aceptable'
      : humedad_suelo <= cultivo.humedad_maxima
      ? 'optimo'
      : 'saturado'
    : humedad_suelo < 25
    ? 'critico'
    : humedad_suelo <= 60
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

  const phInfo = getEstadoPH(ph_suelo ?? 6.8);
  const fungalAlert = hasCrop && cultivo
    ? humedad_ambiental > cultivo.hr_alerta_hongos
    : humedad_ambiental > 80;

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
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl flex-shrink-0">
            {hasCrop && cultivo ? cultivo.icono : '🍂'}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-white text-sm truncate">
              {parcela.nombre}
            </h3>
            <p className="text-[10px] text-white/50 truncate">
              {hasCrop && cultivo
                ? `${cultivo.nombre} · ${cultivo.tipo_riego}`
                : 'Sin cultivo · Terreno en descanso'}
            </p>
          </div>
        </div>

        {/* Badges de estado de cultivo y humedad */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full border font-medium ${
              hasCrop
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            }`}
          >
            {hasCrop ? '🌱 Con Cultivo' : '🍂 Sin Cultivo'}
          </span>
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full border ${statusColors[humedadStatus]}`}
          >
            {statusLabels[humedadStatus]}
          </span>
        </div>
      </div>

      {/* Grid de 4 Sensores: Suelo, Ambiente HR, Temp, pH */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Sensor 1: Humedad del Suelo / Tierra */}
        <div className="bg-black/25 rounded-lg p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-white/60 mb-0.5">
            <span>💧 Humedad Tierra</span>
            {sensores_activos && !sensores_activos.humedad_suelo && (
              <span className="text-[8px] text-white/30">Off</span>
            )}
          </div>
          <div className="text-base font-bold text-white">
            {humedad_suelo.toFixed(0)}%
          </div>
          <div className="w-full bg-white/10 rounded-full h-1 mt-1 mb-1">
            <div
              className={`h-1 rounded-full transition-all duration-500 ${
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
          <div className="text-[8px] text-white/40 truncate">
            {hasCrop && cultivo
              ? `Rango: ${cultivo.humedad_minima}-${cultivo.humedad_maxima}%`
              : 'Suelo en descanso'}
          </div>
        </div>

        {/* Sensor 2: Humedad Ambiental */}
        <div className="bg-black/25 rounded-lg p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-white/60 mb-0.5">
            <span>🌫️ Humedad Amb.</span>
            {sensores_activos && !sensores_activos.humedad_ambiental && (
              <span className="text-[8px] text-white/30">Off</span>
            )}
          </div>
          <div
            className={`text-base font-bold ${
              fungalAlert ? 'text-orange-400' : 'text-white'
            }`}
          >
            {humedad_ambiental.toFixed(0)}%
          </div>
          <div className="text-[8px] mt-1 truncate">
            {fungalAlert ? (
              <span className="text-orange-400 font-medium">⚠️ Riesgo hongos</span>
            ) : (
              <span className="text-white/40">HR controlada</span>
            )}
          </div>
        </div>

        {/* Sensor 3: Temperatura Ambiental */}
        <div className="bg-black/25 rounded-lg p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-white/60 mb-0.5">
            <span>🌡️ Temp Ambiente</span>
            {sensores_activos && !sensores_activos.temperatura && (
              <span className="text-[8px] text-white/30">Off</span>
            )}
          </div>
          <div className="text-base font-bold text-white">
            {temperatura.toFixed(1)}°C
          </div>
          <div className="text-[8px] text-white/40 mt-1 truncate">
            {hasCrop && cultivo
              ? `Óptima: ${cultivo.temp_optima}°C`
              : 'Temp entorno'}
          </div>
        </div>

        {/* Sensor 4: pH de la Tierra */}
        <div className="bg-black/25 rounded-lg p-2 flex flex-col justify-between border border-white/5">
          <div className="flex items-center justify-between text-[10px] text-white/60 mb-0.5">
            <span>🧪 pH de la Tierra</span>
            {sensores_activos && !sensores_activos.ph_suelo && (
              <span className="text-[8px] text-white/30">Off</span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold text-white font-mono">
              {(ph_suelo ?? 6.8).toFixed(1)}
            </span>
            <span
              className={`text-[8px] px-1.5 py-0.5 rounded border font-semibold ${phInfo.badgeClass}`}
            >
              {phInfo.label}
            </span>
          </div>
          <div className="text-[8px] text-white/40 mt-1 truncate">
            {phInfo.descripcion.slice(0, 24)}...
          </div>
        </div>
      </div>

      {/* Control de Válvula */}
      <div className="flex items-center justify-between bg-black/20 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
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
