'use client';

import { PronosticoClima } from '@/types';

interface WeatherWidgetIOSProps {
  clima: PronosticoClima;
}

export default function WeatherWidgetIOS({ clima }: WeatherWidgetIOSProps) {
  const tempActual = clima.temperatura_exterior.toFixed(1);
  const tempMax = clima.temperatura_max ?? 32;
  const tempMin = clima.temperatura_min ?? 19;
  const condicion = clima.condicion_texto ?? 'Mayormente soleado';
  const sensacion = clima.sensacion_termica ?? Number(tempActual);

  return (
    <div className="bg-[#18181b] rounded-2xl p-5 border border-white/5 shadow-md flex flex-col justify-between">
      {/* ========================================================================= */}
      {/* CABECERA ESTILO iOS WEATHER                                               */}
      {/* ========================================================================= */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium tracking-wide">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>Cuernavaca, Morelos</span>
          </div>
          <h3 className="text-3xl font-light text-white tracking-tight mt-1">
            {tempActual}°
          </h3>
          <p className="text-xs text-zinc-300 font-medium">{condicion}</p>
        </div>

        {/* Máx / Mín y fuente */}
        <div className="text-right">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-zinc-400">
            {clima.fuente_api.includes('Google') ? 'Google Weather' : 'Satélite en vivo'}
          </span>
          <div className="text-xs text-zinc-400 mt-2 font-medium">
            Máx. {tempMax}° · Mín. {tempMin}°
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRONÓSTICO POR HORA (CAROUSEL TIPO iOS)                                    */}
      {/* ========================================================================= */}
      {clima.pronostico_por_hora && clima.pronostico_por_hora.length > 0 && (
        <div className="border-t border-b border-white/5 py-3 mb-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1">
            <span>Pronóstico próximas horas</span>
          </div>
          <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-thin">
            {clima.pronostico_por_hora.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center min-w-[48px] py-1.5 px-1 rounded-xl bg-white/[0.03] text-center"
              >
                <span className="text-[10px] text-zinc-400">{item.hora}</span>
                <span className="text-lg my-1">{item.icono}</span>
                {item.probabilidad_lluvia > 15 ? (
                  <span className="text-[9px] font-bold text-sky-400">
                    {item.probabilidad_lluvia}%
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-white">
                    {item.temperatura}°
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TARJETAS DE DETALLES METEOROLÓGICOS (ESTILO TILES iOS)                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Probabilidad Lluvia */}
        <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
          <div className="text-[10px] text-zinc-400 flex items-center gap-1 mb-1">
            <span>🌧️ Lluvia</span>
          </div>
          <div className="text-base font-semibold text-white">
            {clima.probabilidad_lluvia}%
          </div>
          <div className="text-[9px] text-zinc-500 truncate">
            {clima.pronostico_lluvia_12h ? 'Lluvia en 12h' : 'Sin precipitación'}
          </div>
        </div>

        {/* Viento */}
        <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
          <div className="text-[10px] text-zinc-400 flex items-center gap-1 mb-1">
            <span>💨 Viento</span>
          </div>
          <div className="text-base font-semibold text-white">
            {clima.velocidad_viento.toFixed(1)} <span className="text-[10px] font-normal text-zinc-400">km/h</span>
          </div>
          <div className="text-[9px] text-zinc-500">
            Ráfagas {clima.direccion_viento || 'SO'}
          </div>
        </div>

        {/* Humedad Ambiental */}
        <div className="bg-white/[0.03] p-2.5 rounded-xl border border-white/5">
          <div className="text-[10px] text-zinc-400 flex items-center gap-1 mb-1">
            <span>💧 Humedad</span>
          </div>
          <div className="text-base font-semibold text-white">
            {clima.humedad_relativa_exterior}%
          </div>
          <div className="text-[9px] text-zinc-500">
            Sensación {sensacion.toFixed(0)}°
          </div>
        </div>
      </div>
    </div>
  );
}
