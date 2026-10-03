// =============================================================================
// Servicio de Clima en Tiempo Real (Google Weather API + Open-Meteo Fallback)
// Ubicación: Morelos, México (Cuernavaca: Lat 18.9242, Lon -99.2216)
// =============================================================================

import { PronosticoClima, PronosticoClimaHora, PronosticoClimaDia } from '@/types';

const MORELOS_COORDS = {
  lat: 18.9242,
  lon: -99.2216,
  city: 'Cuernavaca, Morelos',
};

// Mapeo de códigos WMO meteorológicos a condición e icono
function mapWeatherCode(code: number): { text: string; icon: string } {
  if (code === 0) return { text: 'Despejado', icon: '☀️' };
  if (code === 1) return { text: 'Mayormente soleado', icon: '🌤️' };
  if (code === 2) return { text: 'Parcialmente nublado', icon: '⛅' };
  if (code === 3) return { text: 'Nublado', icon: '☁️' };
  if ([45, 48].includes(code)) return { text: 'Niebla', icon: '🌫️' };
  if ([51, 53, 55].includes(code)) return { text: 'Llovizna', icon: '🌦️' };
  if ([61, 63, 65].includes(code)) return { text: 'Lluvia moderada', icon: '🌧️' };
  if ([80, 81, 82].includes(code)) return { text: 'Chubascos', icon: '🌧️' };
  if ([95, 96, 99].includes(code)) return { text: 'Tormenta eléctrica', icon: '⛈️' };
  return { text: 'Parcialmente nublado', icon: '⛅' };
}

function getWindDirection(deg: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return directions[Math.round(deg / 45) % 8];
}

/**
 * Consulta clima en tiempo real desde Google Weather API o Open-Meteo
 */
export async function fetchLiveWeather(): Promise<PronosticoClima> {
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_WEATHER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // 1. Si el usuario configuró Google Weather API Key
  if (googleApiKey) {
    try {
      // Google Environment / Weather API endpoint
      const res = await fetch(
        `https://weather.googleapis.com/v1/currentConditions:lookup?key=${googleApiKey}&location.latitude=${MORELOS_COORDS.lat}&location.longitude=${MORELOS_COORDS.lon}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (res.ok) {
        const gData = await res.json();
        // Procesar datos de Google Weather
        return {
          pronostico_lluvia_12h: (gData.precipitationProbability?.percent || 0) > 40,
          probabilidad_lluvia: gData.precipitationProbability?.percent || 5,
          temperatura_exterior: gData.temperature?.degrees || 28.5,
          temperatura_max: (gData.temperature?.degrees || 28.5) + 3,
          temperatura_min: (gData.temperature?.degrees || 28.5) - 8,
          condicion_texto: gData.condition?.description || 'Mayormente soleado',
          humedad_relativa_exterior: gData.relativeHumidity?.percent || 62,
          velocidad_viento: gData.wind?.speed?.kilometersPerHour || 14.2,
          direccion_viento: gData.wind?.direction?.compass || 'SO',
          indice_uv: gData.uvIndex || 6,
          sensacion_termica: gData.apparentTemperature?.degrees || 29.0,
          fuente_api: 'Google Weather API',
          consultado_at: new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn('Google Weather API falló, usando Open-Meteo como respaldo:', e);
    }
  }

  // 2. Open-Meteo (Proveedor gratuito de alta precisión para Morelos, sin API Key requerida)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${MORELOS_COORDS.lat}&longitude=${MORELOS_COORDS.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=6`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    
    if (res.ok) {
      const data = await res.json();
      const current = data.current;
      const daily = data.daily;
      const hourly = data.hourly;

      const condition = mapWeatherCode(current.weather_code);
      const windDir = getWindDirection(current.wind_direction_10m);

      // Extraer próximas 6 horas
      const currentHour = new Date().getHours();
      const pronosticoPorHora: PronosticoClimaHora[] = [];
      for (let i = currentHour; i < currentHour + 6 && i < (hourly.time?.length || 0); i++) {
        const timeStr = hourly.time[i] ? new Date(hourly.time[i]).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : `${i}:00`;
        const code = hourly.weather_code[i] || 0;
        const cond = mapWeatherCode(code);
        pronosticoPorHora.push({
          hora: i === currentHour ? 'Ahora' : timeStr,
          temperatura: Math.round(hourly.temperature_2m[i] || current.temperature_2m),
          probabilidad_lluvia: hourly.precipitation_probability[i] || 0,
          icono: cond.icon,
          condicion: cond.text,
        });
      }

      // Extraer pronóstico diario (próximos 5 días)
      const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const pronosticoDias: PronosticoClimaDia[] = [];
      for (let d = 0; d < Math.min(5, daily.time?.length || 0); d++) {
        const dateObj = new Date(daily.time[d] + 'T12:00:00');
        const diaNombre = d === 0 ? 'Hoy' : diasSemana[dateObj.getDay()];
        const condDia = mapWeatherCode(daily.weather_code[d] || 0);
        pronosticoDias.push({
          dia: diaNombre,
          temp_min: Math.round(daily.temperature_2m_min[d]),
          temp_max: Math.round(daily.temperature_2m_max[d]),
          probabilidad_lluvia: daily.precipitation_probability_max[d] || 0,
          icono: condDia.icon,
        });
      }

      const rainProb12h = Math.max(...(hourly.precipitation_probability.slice(currentHour, currentHour + 12) || [5]));

      return {
        pronostico_lluvia_12h: rainProb12h > 40,
        probabilidad_lluvia: Math.round(hourly.precipitation_probability[currentHour] || current.precipitation * 10 || 5),
        temperatura_exterior: Math.round(current.temperature_2m * 10) / 10,
        temperatura_max: Math.round(daily.temperature_2m_max[0] || current.temperature_2m + 3),
        temperatura_min: Math.round(daily.temperature_2m_min[0] || current.temperature_2m - 7),
        condicion_texto: condition.text,
        humedad_relativa_exterior: Math.round(current.relative_humidity_2m),
        velocidad_viento: Math.round(current.wind_speed_10m * 10) / 10,
        direccion_viento: windDir,
        sensacion_termica: Math.round(current.apparent_temperature * 10) / 10,
        indice_uv: 6,
        pronostico_por_hora: pronosticoPorHora,
        pronostico_dias: pronosticoDias,
        fuente_api: 'Open-Meteo (Morelos)',
        consultado_at: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('Error al consultar Open-Meteo:', err);
  }

  // Fallback con datos realistas para Morelos
  return {
    pronostico_lluvia_12h: false,
    probabilidad_lluvia: 5,
    temperatura_exterior: 29.9,
    temperatura_max: 32,
    temperatura_min: 19,
    condicion_texto: 'Parcialmente nublado',
    humedad_relativa_exterior: 65,
    velocidad_viento: 14.6,
    direccion_viento: 'SO',
    sensacion_termica: 30.5,
    indice_uv: 7,
    fuente_api: 'Simulación Morelos',
    consultado_at: new Date().toISOString(),
  };
}
