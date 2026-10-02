// =============================================================================
// API Client - Comunicación con el Backend NestJS
// Soporta modo mock cuando el backend no está disponible
// =============================================================================

import {
  DashboardSummary,
  Parcela,
  Cultivo,
  Valvula,
  Alerta,
  TanqueAgua,
  EventoRiego,
  PronosticoClima,
  DatosSimulacion,
  ParcelaDashboard,
} from '@/types';
import { CULTIVOS_MORELOS } from './crop-profiles';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ---- Estado de conexión ----
let isBackendAvailable = false;
let lastCheck = 0;

async function checkBackend(): Promise<boolean> {
  const now = Date.now();
  if (now - lastCheck < 10000) return isBackendAvailable;
  lastCheck = now;
  try {
    const res = await fetch(`${API_URL}/dashboard/summary`, {
      signal: AbortSignal.timeout(3000),
    });
    isBackendAvailable = res.ok;
  } catch {
    isBackendAvailable = false;
  }
  return isBackendAvailable;
}

// ---- API Genérica ----
async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`API Error ${res.status}: ${path}`);
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API Error ${res.status}: ${path}`);
  return res.json();
}

// =============================================================================
// DATOS MOCK - Para operación sin backend (demo/hackathon)
// =============================================================================

let mockSimulationData: DatosSimulacion = {
  humedad_cana: 62,
  humedad_tomate: 48,
  humedad_arroz: 88,
  nivel_tanque: 72,
  temperatura: 27.5,
  humedad_ambiental: 65,
  valvula_cana: false,
  valvula_tomate: true,
  valvula_arroz: false,
};

// Simulación progresiva - los valores cambian ligeramente cada consulta
function updateMockData(): DatosSimulacion {
  const vary = (val: number, range: number, min: number, max: number) => {
    const delta = (Math.random() - 0.5) * range;
    return Math.max(min, Math.min(max, +(val + delta).toFixed(1)));
  };

  mockSimulationData = {
    humedad_cana: vary(mockSimulationData.humedad_cana, 4, 20, 95),
    humedad_tomate: vary(mockSimulationData.humedad_tomate, 5, 15, 85),
    humedad_arroz: vary(mockSimulationData.humedad_arroz, 3, 60, 100),
    nivel_tanque: vary(mockSimulationData.nivel_tanque, 2, 5, 100),
    temperatura: vary(mockSimulationData.temperatura, 1.5, 18, 38),
    humedad_ambiental: vary(mockSimulationData.humedad_ambiental, 3, 30, 95),
    valvula_cana: mockSimulationData.humedad_cana < 55,
    valvula_tomate: mockSimulationData.humedad_tomate < 45,
    valvula_arroz: mockSimulationData.humedad_arroz < 80,
  };

  return mockSimulationData;
}

function generateMockDashboard(): DashboardSummary {
  const data = updateMockData();
  const cultivoCana = CULTIVOS_MORELOS.cana_azucar;
  const cultivoTomate = CULTIVOS_MORELOS.tomate_rojo;
  const cultivoArroz = CULTIVOS_MORELOS.arroz;

  const parcelas: ParcelaDashboard[] = [
    {
      parcela: {
        id: 'parcela-1',
        nombre: 'Parcela Norte - Caña',
        cultivo_id: 'cana-azucar',
        latitud: 18.9186,
        longitud: -99.235,
        altitud_msnm: 1520,
        superficie_hectareas: 5.5,
        zona_3d: 'zona_alta',
        color_base: '#8BC34A',
        activa: true,
        modo_operacion: 'automatico',
        propietario: 'Ejido Morelos Norte',
      },
      humedad_suelo: data.humedad_cana,
      temperatura: data.temperatura,
      humedad_ambiental: data.humedad_ambiental,
      valvula_estado: data.valvula_cana ? 'abierta' : 'cerrada',
      valvula_modo: 'automatico',
      cultivo: cultivoCana,
    },
    {
      parcela: {
        id: 'parcela-2',
        nombre: 'Parcela Centro - Tomate',
        cultivo_id: 'tomate-rojo',
        latitud: 18.91,
        longitud: -99.228,
        altitud_msnm: 1480,
        superficie_hectareas: 2.0,
        zona_3d: 'zona_media',
        color_base: '#F44336',
        activa: true,
        modo_operacion: 'automatico',
        propietario: 'Cooperativa Jiutepec',
      },
      humedad_suelo: data.humedad_tomate,
      temperatura: data.temperatura,
      humedad_ambiental: data.humedad_ambiental,
      valvula_estado: data.valvula_tomate ? 'abierta' : 'cerrada',
      valvula_modo: 'automatico',
      cultivo: cultivoTomate,
    },
    {
      parcela: {
        id: 'parcela-3',
        nombre: 'Parcela Sur - Arroz',
        cultivo_id: 'arroz',
        latitud: 18.902,
        longitud: -99.22,
        altitud_msnm: 1420,
        superficie_hectareas: 8.0,
        zona_3d: 'zona_baja',
        color_base: '#2196F3',
        activa: true,
        modo_operacion: 'automatico',
        propietario: 'Ejido Morelos Sur',
      },
      humedad_suelo: data.humedad_arroz,
      temperatura: data.temperatura,
      humedad_ambiental: data.humedad_ambiental,
      valvula_estado: data.valvula_arroz ? 'abierta' : 'cerrada',
      valvula_modo: 'automatico',
      cultivo: cultivoArroz,
    },
  ];

  const alertas: Alerta[] = [];

  // Generar alertas dinámicas basadas en datos
  if (data.humedad_ambiental > 80) {
    alertas.push({
      id: 'alerta-hongos',
      parcela_id: 'parcela-2',
      tipo: 'prevencion_organica',
      severidad: 'alta',
      titulo: '🍄 Alta humedad ambiental detectada',
      mensaje:
        'Alta humedad ambiental detectada. Momento óptimo para aplicación de repelente orgánico (estiércol y resina de árbol) para prevención de plagas en Tomate Rojo.',
      leida: false,
      activa: true,
      created_at: new Date().toISOString(),
    });
  }

  if (data.nivel_tanque < 20) {
    alertas.push({
      id: 'alerta-tanque',
      tipo: 'nivel_reserva',
      severidad: 'critica',
      titulo: '🚨 Nivel crítico de reserva de agua',
      mensaje: `El tanque está al ${data.nivel_tanque.toFixed(0)}%. Se han bloqueado los riegos automáticos no críticos. Necesidad de recarga inmediata.`,
      leida: false,
      activa: true,
      created_at: new Date().toISOString(),
    });
  }

  if (data.humedad_cana < 40) {
    alertas.push({
      id: 'alerta-humedad-cana',
      parcela_id: 'parcela-1',
      tipo: 'humedad_critica',
      severidad: 'alta',
      titulo: '⚠️ Humedad crítica en Parcela Norte',
      mensaje: `La humedad del suelo en la Parcela Norte (Caña) está al ${data.humedad_cana.toFixed(0)}%, muy por debajo del mínimo recomendado (55%).`,
      leida: false,
      activa: true,
      created_at: new Date().toISOString(),
    });
  }

  return {
    parcelas,
    tanques: [
      {
        id: 'tanque-1',
        nombre: 'Cisterna Principal',
        tipo: 'cisterna',
        capacidad_litros: 50000,
        nivel_actual_porcentaje: data.nivel_tanque,
        nivel_critico_porcentaje: 20,
        nivel_alerta_porcentaje: 35,
        activo: true,
      },
    ],
    alertas_activas: alertas,
    clima: {
      pronostico_lluvia_12h: Math.random() > 0.7,
      probabilidad_lluvia: +(Math.random() * 60).toFixed(0),
      temperatura_exterior: data.temperatura,
      humedad_relativa_exterior: data.humedad_ambiental,
      velocidad_viento: +(Math.random() * 15 + 2).toFixed(1),
      fuente_api: 'mock-morelos',
      consultado_at: new Date().toISOString(),
    },
    eventos_recientes: [
      {
        id: 'evento-1',
        parcela_id: 'parcela-2',
        valvula_id: 'valvula-2',
        tipo: 'automatico',
        accion: 'apertura',
        humedad_suelo_al_evento: 42,
        nivel_tanque_al_evento: 75,
        temperatura_al_evento: 28,
        inicio: new Date(Date.now() - 30 * 60000).toISOString(),
        duracion_minutos: 30,
        litros_estimados: 450,
        razon: 'Humedad por debajo del mínimo (45%) para Tomate Rojo',
      },
    ],
    estadisticas: {
      total_parcelas: 3,
      parcelas_activas: 3,
      valvulas_abiertas: parcelas.filter((p) => p.valvula_estado === 'abierta').length,
      alertas_sin_leer: alertas.filter((a) => !a.leida).length,
      litros_hoy: Math.round(1200 + Math.random() * 800),
      riegos_hoy: Math.round(3 + Math.random() * 5),
    },
  };
}

// =============================================================================
// API Pública
// =============================================================================

export const api = {
  // Dashboard
  async getDashboard(): Promise<DashboardSummary> {
    const backendUp = await checkBackend();
    if (backendUp) {
      return apiGet<DashboardSummary>('/dashboard/summary');
    }
    return generateMockDashboard();
  },

  // Cultivos
  async getCultivos(): Promise<Cultivo[]> {
    const backendUp = await checkBackend();
    if (backendUp) {
      return apiGet<Cultivo[]>('/crops');
    }
    return Object.values(CULTIVOS_MORELOS);
  },

  // Parcelas
  async getParcelas(): Promise<Parcela[]> {
    const backendUp = await checkBackend();
    if (backendUp) {
      return apiGet<Parcela[]>('/parcels');
    }
    const dashboard = generateMockDashboard();
    return dashboard.parcelas.map((p) => p.parcela);
  },

  // Válvulas
  async toggleValvula(valvulaId: string): Promise<Valvula> {
    const backendUp = await checkBackend();
    if (backendUp) {
      return apiPost<Valvula>(`/valves/${valvulaId}/toggle`, {});
    }
    // Mock toggle
    return {
      id: valvulaId,
      parcela_id: 'parcela-1',
      tanque_id: 'tanque-1',
      nombre: 'Válvula Mock',
      posicion_x: 0,
      posicion_y: 0,
      posicion_z: 0,
      estado: 'abierta',
      modo: 'manual',
      pin_rele: 8,
      voltaje: '12V',
      activa: true,
    };
  },

  // Alertas
  async getAlertas(): Promise<Alerta[]> {
    const backendUp = await checkBackend();
    if (backendUp) {
      return apiGet<Alerta[]>('/alerts');
    }
    return generateMockDashboard().alertas_activas;
  },

  async marcarAlertaLeida(alertaId: string): Promise<void> {
    const backendUp = await checkBackend();
    if (backendUp) {
      await apiPost(`/alerts/${alertaId}/read`, {});
    }
  },

  // Clima
  async getClima(): Promise<PronosticoClima> {
    const backendUp = await checkBackend();
    if (backendUp) {
      return apiGet<PronosticoClima>('/weather/forecast');
    }
    return generateMockDashboard().clima;
  },

  // Enviar datos de simulación
  async enviarDatosSimulacion(datos: DatosSimulacion): Promise<void> {
    const backendUp = await checkBackend();
    if (backendUp) {
      await apiPost('/sensors/bulk-readings', datos);
    }
    // En mock mode, actualizar datos locales
    mockSimulationData = datos;
  },

  // Actualizar datos mock manualmente (para input manual en la presentación)
  updateMockData(datos: Partial<DatosSimulacion>): void {
    mockSimulationData = { ...mockSimulationData, ...datos };
  },

  // Obtener datos de simulación actuales
  getSimulationData(): DatosSimulacion {
    return { ...mockSimulationData };
  },

  // Verificar si el backend está disponible
  async isBackendAvailable(): Promise<boolean> {
    return checkBackend();
  },
};
