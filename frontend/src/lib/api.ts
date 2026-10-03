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
  CreateParcelaDTO,
  DronRiego,
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
  humedad_descanso: 32,
  nivel_tanque: 72,
  temperatura: 27.5,
  humedad_ambiental: 65,
  ph_tierra: 6.8,
  valvula_cana: false,
  valvula_tomate: true,
  valvula_arroz: false,
};

// Parcelas creadas por el usuario en modo demo
const mockCustomParcels: ParcelaDashboard[] = [];

let mockModoGlobalRiego: 'automatico' | 'manual' = 'automatico';

let mockDronState: DronRiego = {
  id: 'dron-agricola-1',
  nombre: 'AeroSpray T-40 Morelos',
  estado: 'en_base',
  nivel_agua_porcentaje: 85,
  capacidad_litros: 40,
  bateria_porcentaje: 94,
  en_posicion_recarga: true,
  llave_paso_recarga_abierta: false,
  mision_activa: false,
  dias_sin_lluvia: 3,
  requiere_riego_emergencia: true,
};

// Simulación progresiva - los valores cambian ligeramente cada consulta
function updateMockData(): DatosSimulacion {
  const vary = (val: number, range: number, min: number, max: number) => {
    const delta = (Math.random() - 0.5) * range;
    return Math.max(min, Math.min(max, +(val + delta).toFixed(1)));
  };

  // Lógica del dron
  if (mockDronState.llave_paso_recarga_abierta && mockDronState.en_posicion_recarga) {
    // Si la llave de paso está abierta y está presente, se llena
    mockDronState.nivel_agua_porcentaje = Math.min(100, mockDronState.nivel_agua_porcentaje + 15);
    if (mockDronState.nivel_agua_porcentaje >= 100) {
      mockDronState.llave_paso_recarga_abierta = false;
    }
  }

  if (mockDronState.mision_activa && mockDronState.nivel_agua_porcentaje > 0) {
    mockDronState.nivel_agua_porcentaje = Math.max(0, mockDronState.nivel_agua_porcentaje - 10);
    mockDronState.estado = 'regando';
    if (mockDronState.nivel_agua_porcentaje === 0) {
      mockDronState.mision_activa = false;
      mockDronState.estado = 'en_base';
    }
  }

  mockSimulationData = {
    ...mockSimulationData,
    humedad_cana: vary(mockSimulationData.humedad_cana, 3, 20, 95),
    humedad_tomate: vary(mockSimulationData.humedad_tomate, 4, 15, 85),
    humedad_arroz: vary(mockSimulationData.humedad_arroz, 2, 60, 100),
    humedad_descanso: vary(mockSimulationData.humedad_descanso ?? 32, 2, 10, 60),
    nivel_tanque: vary(mockSimulationData.nivel_tanque, 1.5, 5, 100),
    temperatura: vary(mockSimulationData.temperatura, 1, 18, 38),
    humedad_ambiental: vary(mockSimulationData.humedad_ambiental, 2, 30, 95),
    ph_tierra: vary(mockSimulationData.ph_tierra ?? 6.8, 0.1, 5.0, 8.5),
  };

  return mockSimulationData;
}

function generateMockDashboard(): DashboardSummary {
  const data = updateMockData();
  const cultivoCana = CULTIVOS_MORELOS.cana_azucar;
  const cultivoTomate = CULTIVOS_MORELOS.tomate_rojo;
  const cultivoArroz = CULTIVOS_MORELOS.arroz;

  const baseParcelas: ParcelaDashboard[] = [
    {
      parcela: {
        id: 'parcela-1',
        nombre: 'Parcela Norte - Caña',
        tiene_cultivo: true,
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
        sensores_activos: {
          humedad_suelo: true,
          humedad_ambiental: true,
          temperatura: true,
          ph_suelo: true,
        },
      },
      tiene_cultivo: true,
      humedad_suelo: data.humedad_cana,
      temperatura: data.temperatura,
      humedad_ambiental: data.humedad_ambiental,
      ph_suelo: data.ph_suelo ?? (data.ph_tierra ? +(data.ph_tierra).toFixed(1) : 6.8),
      sensores_activos: {
        humedad_suelo: true,
        humedad_ambiental: true,
        temperatura: true,
        ph_suelo: true,
      },
      valvula_estado: data.valvula_cana ? 'abierta' : 'cerrada',
      valvula_modo: 'automatico',
      cultivo: cultivoCana,
    },
    {
      parcela: {
        id: 'parcela-2',
        nombre: 'Parcela Centro - Tomate',
        tiene_cultivo: true,
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
        sensores_activos: {
          humedad_suelo: true,
          humedad_ambiental: true,
          temperatura: true,
          ph_suelo: true,
        },
      },
      tiene_cultivo: true,
      humedad_suelo: data.humedad_tomate,
      temperatura: data.temperatura,
      humedad_ambiental: data.humedad_ambiental,
      ph_suelo: data.ph_suelo ? +(data.ph_suelo - 0.4).toFixed(1) : (data.ph_tierra ? +(data.ph_tierra - 0.6).toFixed(1) : 6.2),
      sensores_activos: {
        humedad_suelo: true,
        humedad_ambiental: true,
        temperatura: true,
        ph_suelo: true,
      },
      valvula_estado: data.valvula_tomate ? 'abierta' : 'cerrada',
      valvula_modo: 'automatico',
      cultivo: cultivoTomate,
    },
    {
      parcela: {
        id: 'parcela-3',
        nombre: 'Parcela Sur - Arroz',
        tiene_cultivo: true,
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
        sensores_activos: {
          humedad_suelo: true,
          humedad_ambiental: true,
          temperatura: true,
          ph_suelo: true,
        },
      },
      tiene_cultivo: true,
      humedad_suelo: data.humedad_arroz,
      temperatura: data.temperatura,
      humedad_ambiental: data.humedad_ambiental,
      ph_suelo: data.ph_suelo ? +(data.ph_suelo + 0.2).toFixed(1) : (data.ph_tierra ? +(data.ph_tierra + 0.4).toFixed(1) : 6.5),
      sensores_activos: {
        humedad_suelo: true,
        humedad_ambiental: true,
        temperatura: true,
        ph_suelo: true,
      },
      valvula_estado: data.valvula_arroz ? 'abierta' : 'cerrada',
      valvula_modo: 'automatico',
      cultivo: cultivoArroz,
    },
    {
      parcela: {
        id: 'parcela-4',
        nombre: 'Parcela Poniente - En Descanso',
        tiene_cultivo: false,
        cultivo_id: null,
        latitud: 18.915,
        longitud: -99.231,
        altitud_msnm: 1490,
        superficie_hectareas: 3.2,
        zona_3d: 'zona_media',
        color_base: '#8D6E63',
        activa: true,
        modo_operacion: 'manual',
        propietario: 'Cooperativa Jiutepec',
        notas: 'Terreno en descanso y rotación de cultivo. Suelo enriquecido con abono orgánico.',
        sensores_activos: {
          humedad_suelo: true,
          humedad_ambiental: true,
          temperatura: true,
          ph_suelo: true,
        },
      },
      tiene_cultivo: false,
      cultivo: null,
      humedad_suelo: data.humedad_descanso ?? 32,
      temperatura: data.temperatura,
      humedad_ambiental: data.humedad_ambiental,
      ph_suelo: data.ph_tierra ? +(data.ph_tierra - 0.3).toFixed(1) : 6.5,
      sensores_activos: {
        humedad_suelo: true,
        humedad_ambiental: true,
        temperatura: true,
        ph_suelo: true,
      },
      valvula_estado: 'cerrada',
      valvula_modo: 'manual',
    },
  ];

  const parcelas: ParcelaDashboard[] = [...baseParcelas, ...mockCustomParcels];

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

  // Alerta de Dron de Emergencia si van >= 3 días sin lluvia
  if (mockDronState.dias_sin_lluvia >= 3) {
    mockDronState.requiere_riego_emergencia = true;
    if (mockDronState.nivel_agua_porcentaje <= 15) {
      alertas.push({
        id: 'alerta-dron-vacio',
        tipo: 'dron_vacio',
        severidad: 'critica',
        titulo: '🚨 Alerta: Dron de emergencia sin agua',
        mensaje:
          'Pronóstico crítico: 3 días consecutivos sin lluvia en Morelos. Se requiere activar riego de emergencia por dron, pero el tanque del dron está vacío. Colóquelo en la estación de recarga con sensor de presencia para habilitar la llave de paso de agua o llénelo manualmente.',
        leida: false,
        activa: true,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Lógica de riego automático vs manual por parcela
  if (mockModoGlobalRiego === 'automatico') {
    parcelas.forEach((p) => {
      if (p.tiene_cultivo && p.cultivo) {
        // Modo automático: se activa si humedad < minima y tanque > 20%
        if (p.humedad_suelo < p.cultivo.humedad_minima && data.nivel_tanque >= 20) {
          p.valvula_estado = 'abierta';
          p.valvula_modo = 'automatico';
        } else if (p.humedad_suelo >= p.cultivo.humedad_optima) {
          p.valvula_estado = 'cerrada';
          p.valvula_modo = 'automatico';
        }
      }
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
    dron: { ...mockDronState },
    alertas_activas: alertas,
    modo_global_riego: mockModoGlobalRiego,
    clima: {
      pronostico_lluvia_12h: false,
      pronostico_lluvia_3dias: false,
      dias_consecutivos_sin_lluvia: mockDronState.dias_sin_lluvia,
      probabilidad_lluvia: 5,
      temperatura_exterior: data.temperatura,
      temperatura_max: 33,
      temperatura_min: 19,
      condicion_texto: 'Despejado / Sequía temporal',
      humedad_relativa_exterior: data.humedad_ambiental,
      velocidad_viento: 12.5,
      fuente_api: 'Open-Meteo (Morelos)',
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
      total_parcelas: parcelas.length,
      parcelas_activas: parcelas.filter((p) => p.parcela.activa).length,
      parcelas_con_cultivo: parcelas.filter((p) => p.tiene_cultivo).length,
      parcelas_sin_cultivo: parcelas.filter((p) => !p.tiene_cultivo).length,
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

  // Crear Parcela
  async createParcela(dto: CreateParcelaDTO): Promise<ParcelaDashboard> {
    const backendUp = await checkBackend();
    let backendResult: any = null;
    if (backendUp) {
      try {
        backendResult = await apiPost('/parcels', dto);
      } catch (err) {
        console.warn('Backend /parcels POST falló, guardando localmente:', err);
      }
    }

    // Resolver cultivo si tiene_cultivo
    let cultivo: Cultivo | null = null;
    if (dto.tiene_cultivo && dto.cultivo_id) {
      cultivo =
        CULTIVOS_MORELOS[dto.cultivo_id] ||
        Object.values(CULTIVOS_MORELOS).find((c) => c.id === dto.cultivo_id) ||
        null;
    }

    const newId = backendResult?.id || `parcela-${Date.now()}`;
    const newParcela: Parcela = {
      id: newId,
      nombre: dto.nombre,
      tiene_cultivo: dto.tiene_cultivo,
      cultivo_id: dto.tiene_cultivo ? (cultivo?.id ?? dto.cultivo_id ?? null) : null,
      cultivo: cultivo,
      latitud: 18.912,
      longitud: -99.230,
      altitud_msnm: dto.zona_3d === 'zona_alta' ? 1520 : dto.zona_3d === 'zona_media' ? 1480 : 1420,
      superficie_hectareas: dto.superficie_hectareas,
      zona_3d: dto.zona_3d,
      color_base: dto.color_base || (dto.tiene_cultivo ? '#4CAF50' : '#8D6E63'),
      activa: true,
      modo_operacion: dto.modo_operacion,
      propietario: dto.propietario,
      notas: dto.notas,
      sensores_activos: {
        humedad_suelo: dto.sensores_config.humedad_suelo,
        humedad_ambiental: dto.sensores_config.humedad_ambiental,
        temperatura: dto.sensores_config.temperatura,
        ph_suelo: dto.sensores_config.ph_suelo,
      },
    };

    const newDashboardItem: ParcelaDashboard = {
      parcela: newParcela,
      tiene_cultivo: dto.tiene_cultivo,
      cultivo: cultivo,
      humedad_suelo: dto.sensores_config.humedad_suelo ? dto.sensores_config.humedad_suelo_valor : 45,
      temperatura: dto.sensores_config.temperatura ? dto.sensores_config.temperatura_valor : 26,
      humedad_ambiental: dto.sensores_config.humedad_ambiental ? dto.sensores_config.humedad_ambiental_valor : 60,
      ph_suelo: dto.sensores_config.ph_suelo ? dto.sensores_config.ph_suelo_valor : 6.8,
      sensores_activos: {
        humedad_suelo: dto.sensores_config.humedad_suelo,
        humedad_ambiental: dto.sensores_config.humedad_ambiental,
        temperatura: dto.sensores_config.temperatura,
        ph_suelo: dto.sensores_config.ph_suelo,
      },
      valvula_estado: 'cerrada',
      valvula_modo: dto.modo_operacion,
    };

    mockCustomParcels.push(newDashboardItem);
    return newDashboardItem;
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

  // ---- Control de Modo de Riego (Automático / Manual) ----
  toggleModoGlobalRiego(modo?: 'automatico' | 'manual'): 'automatico' | 'manual' {
    if (modo) {
      mockModoGlobalRiego = modo;
    } else {
      mockModoGlobalRiego = mockModoGlobalRiego === 'automatico' ? 'manual' : 'automatico';
    }
    return mockModoGlobalRiego;
  },

  getModoGlobalRiego(): 'automatico' | 'manual' {
    return mockModoGlobalRiego;
  },

  activarRiegoManualTodo(): void {
    mockSimulationData.valvula_cana = true;
    mockSimulationData.valvula_tomate = true;
    mockSimulationData.valvula_arroz = true;
  },

  detenerRiegoTodo(): void {
    mockSimulationData.valvula_cana = false;
    mockSimulationData.valvula_tomate = false;
    mockSimulationData.valvula_arroz = false;
  },

  // ---- Control del Sistema de Dron de Riego de Emergencia ----
  getDronState(): DronRiego {
    return { ...mockDronState };
  },

  // Sensor de presencia de objeto en la estación de recarga
  toggleDronPresencia(): boolean {
    mockDronState.en_posicion_recarga = !mockDronState.en_posicion_recarga;
    // Si se retira el dron de la base, se cierra la llave de paso por seguridad
    if (!mockDronState.en_posicion_recarga) {
      mockDronState.llave_paso_recarga_abierta = false;
    }
    return mockDronState.en_posicion_recarga;
  },

  // Llave de paso: solo se puede abrir si el sensor detecta objeto en posición
  toggleDronLlavePaso(): { success: boolean; message: string; abierta: boolean } {
    if (!mockDronState.en_posicion_recarga) {
      return {
        success: false,
        message: 'Acceso denegado: El sensor de presencia no detecta al dron en la plataforma de recarga.',
        abierta: false,
      };
    }
    mockDronState.llave_paso_recarga_abierta = !mockDronState.llave_paso_recarga_abierta;
    return {
      success: true,
      message: mockDronState.llave_paso_recarga_abierta
        ? 'Llave de paso abierta. Suministrando agua al tanque del dron...'
        : 'Llave de paso cerrada.',
      abierta: mockDronState.llave_paso_recarga_abierta,
    };
  },

  // Despacho de misión de riego por dron
  despacharDronEmergencia(): { success: boolean; message: string } {
    if (mockDronState.nivel_agua_porcentaje <= 15) {
      return {
        success: false,
        message: 'No es posible despegar: El tanque del dron está vacío o en nivel crítico (<15%). Realice la recarga.',
      };
    }
    mockDronState.mision_activa = true;
    mockDronState.estado = 'regando';
    mockDronState.ultimo_despacho = new Date().toISOString();
    return {
      success: true,
      message: 'Misión de riego por dron de emergencia iniciada con éxito sobre todo el sembradío.',
    };
  },

  // Llenado manual del dron
  llenarDronManual(): void {
    mockDronState.nivel_agua_porcentaje = 100;
  },
};
