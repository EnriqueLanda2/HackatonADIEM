'use client';

import { ParcelaDashboard } from '@/types';

interface ParcelaCardProps {
  data: ParcelaDashboard;
  onToggleValve?: () => void;
}

export default function ParcelaCard({ data, onToggleValve }: ParcelaCardProps) {
  const { parcela, cultivo, humedad_suelo, temperatura, humedad_ambiental, valvula_estado } = data;

  // Semáforo de Humedad
  let statusLabel = 'Óptimo';
  let badgeClasses = 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300';
  let barColor = 'bg-emerald-500';
  let statusIcon = '🟢';

  if (humedad_suelo < 35) {
    statusLabel = 'Crítico';
    badgeClasses = 'bg-rose-950/80 border-rose-500/40 text-rose-300';
    barColor = 'bg-rose-500';
    statusIcon = '🔴';
  } else if (humedad_suelo < 50) {
    statusLabel = 'Bajo';
    badgeClasses = 'bg-amber-950/80 border-amber-500/40 text-amber-300';
    barColor = 'bg-amber-500';
    statusIcon = '🟡';
  } else if (humedad_suelo > 75) {
    statusLabel = 'Saturado';
    badgeClasses = 'bg-blue-950/80 border-blue-500/40 text-blue-300';
    barColor = 'bg-blue-500';
    statusIcon = '🔵';
  }

  // Nombre amigable de la zona
  const zoneName = parcela.zona_3d === 'zona_alta' 
    ? 'Norte' 
    : parcela.zona_3d === 'zona_baja' 
    ? 'Sur' 
    : 'Centro';

  const cropName = cultivo.nombre.split(' ')[0];
  const isOpen = valvula_estado === 'abierta';

  // pH según cultivo (óptimo 6.0 a 7.2)
  const phVal = data.ph_suelo ?? (cultivo.id === 'arroz' ? 6.5 : cultivo.id === 'tomate_rojo' ? 6.2 : 6.8);
  const phStatus = phVal >= 6.0 && phVal <= 7.2 ? 'Neutro óptimo' : phVal < 6.0 ? 'Ácido' : 'Alcalino';

  return (
    <div className="bg-[#18181b] rounded-2xl p-5 border border-white/5 shadow-md flex flex-col justify-between hover:border-white/10 transition-all">
      {/* ======================================================================= */}
      {/* CABECERA: CULTIVO Y ESTADO DE TELEMETRÍA                                */}
      {/* ======================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{cultivo.icono}</span>
            <div>
              <h3 className="font-semibold text-white text-base tracking-tight leading-tight">
                {zoneName} · {cropName}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-zinc-400 font-medium">Sensor IoT en línea</span>
              </div>
            </div>
          </div>

          <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold flex items-center gap-1 ${badgeClasses}`}>
            <span>{statusIcon}</span>
            <span>{statusLabel}</span>
          </span>
        </div>

        {/* ======================================================================= */}
        {/* SENSOR PRINCIPAL: HUMEDAD DEL SUELO (%)                                 */}
        {/* ======================================================================= */}
        <div className="bg-black/30 rounded-xl p-3 mb-3 border border-white/5">
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
              <span>💧 Humedad del Suelo</span>
            </span>
            <span className="text-2xl font-bold tracking-tight text-white">
              {humedad_suelo.toFixed(0)}<span className="text-sm font-normal text-zinc-400">%</span>
            </span>
          </div>

          {/* Barra semafórica con marcas de rango */}
          <div className="w-full bg-zinc-800/90 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${barColor}`}
              style={{ width: `${Math.min(100, Math.max(0, humedad_suelo))}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-zinc-500 mt-1">
            <span>0%</span>
            <span>Óptimo: {cultivo.humedad_optima}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* MATRIZ DE SENSORES CRÍTICOS (TEMPERATURA, pH, HUMEDAD AMBIENTAL)        */}
        {/* ======================================================================= */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Sensor Temperatura */}
          <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5 text-center">
            <div className="text-[10px] text-zinc-400 font-medium mb-0.5">🌡️ Temp</div>
            <div className="text-sm font-bold text-white">
              {temperatura.toFixed(1)}°C
            </div>
            <div className="text-[9px] text-zinc-500">Suelo</div>
          </div>

          {/* Sensor pH */}
          <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5 text-center">
            <div className="text-[10px] text-zinc-400 font-medium mb-0.5">🧪 pH Suelo</div>
            <div className="text-sm font-bold text-emerald-400">
              {phVal.toFixed(1)}
            </div>
            <div className="text-[9px] text-zinc-500 truncate">{phStatus}</div>
          </div>

          {/* Sensor Humedad Ambiental (HR) */}
          <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5 text-center">
            <div className="text-[10px] text-zinc-400 font-medium mb-0.5">🌫️ HR Aire</div>
            <div className="text-sm font-bold text-sky-400">
              {humedad_ambiental.toFixed(0)}%
            </div>
            <div className="text-[9px] text-zinc-500">Ambiente</div>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* CONTROL DE ACTUADOR / VÁLVULA DE RIEGO                                  */}
      {/* ======================================================================= */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-400">Regando</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-zinc-500"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span className="text-xs text-zinc-400">Cerrada</span>
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleValve?.();
          }}
          className={`text-xs px-4 py-1.5 rounded-full border transition-all font-semibold ${
            isOpen
              ? 'bg-rose-500/20 border-rose-500/30 text-rose-300 hover:bg-rose-500/30'
              : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30'
          }`}
        >
          {isOpen ? 'Detener riego' : 'Iniciar riego'}
        </button>
      </div>
    </div>
  );
}
