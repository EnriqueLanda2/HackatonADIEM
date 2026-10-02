// =============================================================================
// Perfiles Hídricos de Cultivos - Estado de Morelos
// Datos base para operación sin conexión al backend
// =============================================================================

import { Cultivo } from '@/types';

export const CULTIVOS_MORELOS: Record<string, Cultivo> = {
  cana_azucar: {
    id: 'cana-azucar',
    nombre: 'Caña de Azúcar',
    nombre_cientifico: 'Saccharum officinarum',
    humedad_minima: 55,
    humedad_optima: 75,
    humedad_maxima: 90,
    temp_minima: 20,
    temp_optima: 28,
    temp_maxima: 35,
    hr_alerta_hongos: 85,
    frecuencia_riego_horas: 48,
    duracion_riego_minutos: 60,
    tipo_riego: 'aspersion',
    descripcion: 'Cultivo estratégico del Estado de Morelos. Requiere riego abundante pero controlado.',
    icono: '🌾',
  },
  nopal: {
    id: 'nopal',
    nombre: 'Nopal',
    nombre_cientifico: 'Opuntia ficus-indica',
    humedad_minima: 15,
    humedad_optima: 30,
    humedad_maxima: 45,
    temp_minima: 15,
    temp_optima: 25,
    temp_maxima: 40,
    hr_alerta_hongos: 90,
    frecuencia_riego_horas: 168,
    duracion_riego_minutos: 15,
    tipo_riego: 'goteo',
    descripcion: 'Cultivo endémico. Requiere estrés hídrico controlado.',
    icono: '🌵',
  },
  aguacate: {
    id: 'aguacate',
    nombre: 'Aguacate',
    nombre_cientifico: 'Persea americana',
    humedad_minima: 50,
    humedad_optima: 65,
    humedad_maxima: 80,
    temp_minima: 15,
    temp_optima: 22,
    temp_maxima: 30,
    hr_alerta_hongos: 75,
    frecuencia_riego_horas: 72,
    duracion_riego_minutos: 45,
    tipo_riego: 'microaspersion',
    descripcion: 'Sensible a exceso de humedad en raíz. Requiere buen drenaje.',
    icono: '🥑',
  },
  tomate_rojo: {
    id: 'tomate-rojo',
    nombre: 'Tomate Rojo',
    nombre_cientifico: 'Solanum lycopersicum',
    humedad_minima: 45,
    humedad_optima: 60,
    humedad_maxima: 75,
    temp_minima: 18,
    temp_optima: 24,
    temp_maxima: 32,
    hr_alerta_hongos: 80,
    frecuencia_riego_horas: 24,
    duracion_riego_minutos: 30,
    tipo_riego: 'goteo',
    descripcion: 'Sensible a hongos con humedad ambiental alta. Riego frecuente y preciso.',
    icono: '🍅',
  },
  tomate_verde: {
    id: 'tomate-verde',
    nombre: 'Tomate Verde',
    nombre_cientifico: 'Physalis philadelphica',
    humedad_minima: 40,
    humedad_optima: 55,
    humedad_maxima: 70,
    temp_minima: 16,
    temp_optima: 22,
    temp_maxima: 30,
    hr_alerta_hongos: 80,
    frecuencia_riego_horas: 24,
    duracion_riego_minutos: 25,
    tipo_riego: 'goteo',
    descripcion: 'Tomatillo. Nativo de México, tolerante a sequía.',
    icono: '🫒',
  },
  maiz: {
    id: 'maiz',
    nombre: 'Maíz',
    nombre_cientifico: 'Zea mays',
    humedad_minima: 45,
    humedad_optima: 65,
    humedad_maxima: 80,
    temp_minima: 18,
    temp_optima: 26,
    temp_maxima: 35,
    hr_alerta_hongos: 85,
    frecuencia_riego_horas: 48,
    duracion_riego_minutos: 40,
    tipo_riego: 'aspersion',
    descripcion: 'Cultivo base de la agricultura mexicana.',
    icono: '🌽',
  },
  sorgo: {
    id: 'sorgo',
    nombre: 'Sorgo',
    nombre_cientifico: 'Sorghum bicolor',
    humedad_minima: 35,
    humedad_optima: 50,
    humedad_maxima: 70,
    temp_minima: 20,
    temp_optima: 30,
    temp_maxima: 38,
    hr_alerta_hongos: 85,
    frecuencia_riego_horas: 72,
    duracion_riego_minutos: 35,
    tipo_riego: 'aspersion',
    descripcion: 'Altamente tolerante a la sequía.',
    icono: '🌾',
  },
  arroz: {
    id: 'arroz',
    nombre: 'Arroz',
    nombre_cientifico: 'Oryza sativa',
    humedad_minima: 80,
    humedad_optima: 95,
    humedad_maxima: 100,
    temp_minima: 20,
    temp_optima: 28,
    temp_maxima: 35,
    hr_alerta_hongos: 90,
    frecuencia_riego_horas: 24,
    duracion_riego_minutos: 120,
    tipo_riego: 'inundacion',
    descripcion: 'Requiere inundación controlada. Mayor consumo de agua.',
    icono: '🍚',
  },
};

/**
 * Obtiene el color de humedad basado en el nivel y el perfil del cultivo.
 * Se usa para mapear colores a la malla 3D.
 */
export function getColorHumedad(humedad: number, cultivo: Cultivo): string {
  const ratio = humedad / 100;

  if (humedad >= cultivo.humedad_maxima) {
    // Saturación - Azul oscuro
    return '#1565C0';
  } else if (humedad >= cultivo.humedad_optima) {
    // Óptimo - Verde
    return '#4CAF50';
  } else if (humedad >= cultivo.humedad_minima) {
    // Aceptable - Amarillo/Verde
    const t = (humedad - cultivo.humedad_minima) / (cultivo.humedad_optima - cultivo.humedad_minima);
    return interpolateColor('#FFC107', '#4CAF50', t);
  } else {
    // Seco - Rojo/Marrón
    const t = humedad / cultivo.humedad_minima;
    return interpolateColor('#8B4513', '#FFC107', t);
  }
}

/**
 * Determina si se debe activar una alerta de prevención orgánica
 */
export function necesitaPrevencionOrganica(
  humedadAmbiental: number,
  cultivo: Cultivo
): boolean {
  return humedadAmbiental > cultivo.hr_alerta_hongos;
}

/**
 * Determina si se debe activar el riego automático
 */
export function necesitaRiego(
  humedadSuelo: number,
  cultivo: Cultivo,
  nivelTanque: number,
  lluviaPronosticada: boolean
): { necesita: boolean; razon: string } {
  if (humedadSuelo >= cultivo.humedad_minima) {
    return {
      necesita: false,
      razon: `Humedad del suelo (${humedadSuelo}%) está por encima del mínimo (${cultivo.humedad_minima}%)`,
    };
  }

  if (lluviaPronosticada) {
    return {
      necesita: false,
      razon: 'Se pronostica lluvia en las próximas 12 horas',
    };
  }

  if (nivelTanque < 20) {
    return {
      necesita: false,
      razon: `Nivel del tanque (${nivelTanque}%) por debajo del mínimo crítico (20%)`,
    };
  }

  return {
    necesita: true,
    razon: `Humedad del suelo (${humedadSuelo}%) por debajo del mínimo (${cultivo.humedad_minima}%) para ${cultivo.nombre}`,
  };
}

// --- Utilidades de color ---
function interpolateColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
