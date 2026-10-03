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
    <div className="bg-[#131d08]/85 rounded-2xl p-5 border border-[#8DA432]/20 shadow-md flex flex-col justify-between">
      {/* ========================================================================= */}
      {/* CABECERA ESTILO iOS WEATHER CON PALETA ORGÁNICA                           */}
      {/* ========================================================================= */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-[#EDE383]/80 text-xs font-medium tracking-wide">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[#8DA432]"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span>Cuernavaca, Morelos</span>
          </div>
          <h3 className="text-3xl font-light text-[#FFFCE9] tracking-tight mt-1">
            {tempActual}°
          </h3>
          <p className="text-xs text-[#EDE383] font-medium">{condicion}</p>
        </div>

        {/* Máx / Mín y fuente */}
        <div className="text-right">
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#365004]/60 border border-[#8DA432]/40 text-[#EDE383] font-semibold">
            {clima.fuente_api.includes('Google') ? 'Google Weather' : 'Satélite en vivo'}
          </span>
          <div className="text-xs text-[#EDE383]/70 mt-2 font-medium">
            Máx. {tempMax}° · Mín. {tempMin}°
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRONÓSTICO POR HORA (CAROUSEL TIPO iOS)                                    */}
      {/* ========================================================================= */}
      {clima.pronostico_por_hora && clima.pronostico_por_hora.length > 0 && (
        <div className="border-t border-b border-[#8DA432]/15 py-3 mb-4">
          <div className="text-[10px] text-[#EDE383]/70 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1">
            <span>Pronóstico próximas horas</span>
          </div>
          <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-thin">
            {clima.pronostico_por_hora.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center min-w-[48px] py-1.5 px-1 rounded-xl bg-[#0a1004]/60 border border-[#8DA432]/10 text-center"
              >
                <span className="text-[10px] text-[#EDE383]/70">{item.hora}</span>
                <span className="text-lg my-1">{item.icono}</span>
                {item.probabilidad_lluvia > 15 ? (
                  <span className="text-[9px] font-bold text-[#8DA432]">
                    {item.probabilidad_lluvia}%
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-[#FFFCE9]">
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
        <div className="bg-[#0a1004]/70 p-2.5 rounded-xl border border-[#8DA432]/15">
          <div className="text-[10px] text-[#EDE383]/80 flex items-center gap-1 mb-1 font-medium">
            <span>🌧️ Lluvia</span>
          </div>
          <div className="text-base font-bold text-[#FFFCE9]">
            {clima.probabilidad_lluvia}%
          </div>
          <div className="text-[9px] text-[#EDE383]/60 truncate">
            {clima.pronostico_lluvia_12h ? 'Lluvia en 12h' : 'Sin precipitación'}
          </div>
        </div>

        {/* Viento */}
        <div className="bg-[#0a1004]/70 p-2.5 rounded-xl border border-[#8DA432]/15">
          <div className="text-[10px] text-[#EDE383]/80 flex items-center gap-1 mb-1 font-medium">
            <span>💨 Viento</span>
          </div>
          <div className="text-base font-bold text-[#FFFCE9]">
            {clima.velocidad_viento.toFixed(1)} <span className="text-[10px] font-normal text-[#EDE383]/60">km/h</span>
          </div>
          <div className="text-[9px] text-[#EDE383]/60">
            Ráfagas {clima.direccion_viento || 'SO'}
          </div>
        </div>

        {/* Humedad Ambiental */}
        <div className="bg-[#0a1004]/70 p-2.5 rounded-xl border border-[#8DA432]/15">
          <div className="text-[10px] text-[#EDE383]/80 flex items-center gap-1 mb-1 font-medium">
            <span>💧 Humedad</span>
          </div>
          <div className="text-base font-bold text-[#FFFCE9]">
            {clima.humedad_relativa_exterior}%
          </div>
          <div className="text-[9px] text-[#EDE383]/60">
            Sensación {sensacion.toFixed(0)}°
          </div>
        </div>
      </div>
    </div>
  );
}
