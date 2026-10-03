'use client';

import { PronosticoClima } from '@/types';

interface WeatherWidgetIOSProps {
  clima: PronosticoClima;
}

export default function WeatherWidgetIOS({ clima }: WeatherWidgetIOSProps) {
  // Conversión numérica ultra segura para soportar tanto números como strings/nulls de la BD
  const rawTemp = Number(clima?.temperatura_exterior ?? 26.5);
  const tempActual = isNaN(rawTemp) ? '26.5' : rawTemp.toFixed(1);
  const tempMax = Number(clima?.temperatura_max ?? 32);
  const tempMin = Number(clima?.temperatura_min ?? 19);
  const condicion = clima?.condicion_texto ?? 'Mayormente soleado';
  const sensacion = Number(clima?.sensacion_termica ?? rawTemp);

  const rawViento = Number(clima?.velocidad_viento ?? 12.0);
  const velocidadViento = isNaN(rawViento) ? '12.0' : rawViento.toFixed(1);

  const rawLluvia = Number(clima?.probabilidad_lluvia ?? 10);
  const probLluvia = isNaN(rawLluvia) ? 10 : Math.round(rawLluvia);

  const rawHumedad = Number(clima?.humedad_relativa_exterior ?? 60);
  const humedadRelativa = isNaN(rawHumedad) ? 60 : Math.round(rawHumedad);

  return (
    <div className="bg-[#161616] rounded-2xl p-5 border border-[#8DA432]/35 shadow-lg shadow-black/15 flex flex-col justify-between">
      {/* ========================================================================= */}
      {/* CABECERA ESTILO iOS WEATHER                                               */}
      {/* ========================================================================= */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-[#EDE383] text-xs font-semibold tracking-wide">
            <svg
              width="14"
              height="14"
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
          <h3 className="text-4xl font-extrabold text-[#FFFCE9] tracking-tight mt-1">
            {tempActual}°
          </h3>
          <p className="text-xs text-[#EDE383] font-medium mt-0.5">{condicion}</p>
        </div>

        {/* Máx / Mín y fuente */}
        <div className="text-right">
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#1e1e1e] border border-[#8DA432]/40 text-[#EDE383] font-semibold">
            {clima?.fuente_api?.includes('Google') ? 'Google Weather' : 'Satélite en vivo'}
          </span>
          <div className="text-xs text-[#EDE383] mt-2 font-semibold">
            Máx. {tempMax}° · Mín. {tempMin}°
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRONÓSTICO POR HORA (CAROUSEL TIPO iOS)                                    */}
      {/* ========================================================================= */}
      {clima?.pronostico_por_hora && clima.pronostico_por_hora.length > 0 && (
        <div className="border-t border-b border-[#8DA432]/25 py-3 mb-4">
          <div className="text-[10px] text-[#EDE383] uppercase tracking-wider mb-2 font-bold flex items-center gap-1">
            <span>Pronóstico próximas horas</span>
          </div>
          <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-thin">
            {clima.pronostico_por_hora.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center min-w-[50px] py-2 px-1.5 rounded-xl bg-[#1e1e1e] border border-[#8DA432]/20 text-center"
              >
                <span className="text-[10px] text-[#EDE383] font-medium">{item.hora}</span>
                <span className="text-lg my-1">{item.icono}</span>
                {Number(item.probabilidad_lluvia) > 15 ? (
                  <span className="text-[10px] font-extrabold text-[#8DA432]">
                    {Number(item.probabilidad_lluvia)}%
                  </span>
                ) : (
                  <span className="text-xs font-bold text-[#FFFCE9]">
                    {Number(item.temperatura)}°
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
        <div className="bg-[#1e1e1e] p-3 rounded-xl border border-[#8DA432]/25">
          <div className="text-[10px] text-[#EDE383] flex items-center gap-1 mb-1 font-semibold">
            <span>🌧️ Lluvia</span>
          </div>
          <div className="text-lg font-black text-[#FFFCE9]">
            {probLluvia}%
          </div>
          <div className="text-[9px] text-[#EDE383]/70 truncate font-medium">
            {clima?.pronostico_lluvia_12h ? 'Lluvia en 12h' : 'Sin precipitación'}
          </div>
        </div>

        {/* Viento */}
        <div className="bg-[#1e1e1e] p-3 rounded-xl border border-[#8DA432]/25">
          <div className="text-[10px] text-[#EDE383] flex items-center gap-1 mb-1 font-semibold">
            <span>💨 Viento</span>
          </div>
          <div className="text-lg font-black text-[#FFFCE9]">
            {velocidadViento} <span className="text-[10px] font-normal text-[#EDE383]/70">km/h</span>
          </div>
          <div className="text-[9px] text-[#EDE383]/70 font-medium">
            Ráfagas {clima?.direccion_viento || 'SO'}
          </div>
        </div>

        {/* Humedad Ambiental */}
        <div className="bg-[#1e1e1e] p-3 rounded-xl border border-[#8DA432]/25">
          <div className="text-[10px] text-[#EDE383] flex items-center gap-1 mb-1 font-semibold">
            <span>🌫️ Humedad</span>
          </div>
          <div className="text-lg font-black text-[#FFFCE9]">
            {humedadRelativa}%
          </div>
          <div className="text-[9px] text-[#EDE383]/70 font-medium">
            Sensación {sensacion.toFixed(0)}°
          </div>
        </div>
      </div>
    </div>
  );
}
