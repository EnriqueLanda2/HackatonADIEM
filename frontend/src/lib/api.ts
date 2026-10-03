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

// Válvulas individuales por parcela
const mockParcelValves: Record<string, boolean> = {
  'parcela-1': false,
  'parcela-2': true,
  'parcela-3': false,
  'parcela-4': false,
};

// Llave de recarga de la cisterna principal desde pozo/red
let mockCisternaLlaveLlenado = false;

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

// Simulación interactiva en tiempo real con detección de LLENO
function updateMockData(): DatosSimulacion {
  // 1. Simulación de recarga de cisterna (Pozo / Red general)
  if (mockCisternaLlaveLlenado) {
    mockSimulationData.nivel_tanque = Math.min(100, +(mockSimulationData.nivel_tanque + 20).toFixed(1));
    if (mockSimulationData.nivel_tanque >= 100) {
      mockSimulationData.nivel_tanque = 100;
      mockCisternaLlaveLlenado = false; // Sensor de boya / nivel máximo detecta LLENO -> corte automático
    }
  }

  // 2. Simulación de recarga del Dron
  if (mockDronState.llave_paso_recarga_abierta) {
    if (!mockDronState.en_posicion_recarga) {
      // Bloqueo de seguridad: objeto retirado de la plataforma
      mockDronState.llave_paso_recarga_abierta = false;
    } else {
      mockDronState.nivel_agua_porcentaje = Math.min(100, mockDronState.nivel_agua_porcentaje + 25);
      if (mockDronState.nivel_agua_porcentaje >= 100) {
        mockDronState.nivel_agua_porcentaje = 100;
        mockDronState.llave_paso_recarga_abierta = false; // Detecta tanque LLENO: corte automático por flotador
        mockDronState.estado = 'en_base';
      }
    }
  }

  // 3. Simulación de vuelo y aspersión del Dron
  if (mockDronState.mision_activa) {
    mockDronState.nivel_agua_porcentaje = Math.max(0, mockDronState.nivel_agua_porcentaje - 12);
    mockDronState.estado = 'regando';
    // Aspersión moja todas las parcelas
    mockSimulationData.humedad_cana = Math.min(96, +(mockSimulationData.humedad_cana + 3).toFixed(1));
    mockSimulationData.humedad_tomate = Math.min(92, +(mockSimulationData.humedad_tomate + 3).toFixed(1));
    mockSimulationData.humedad_arroz = Math.min(100, +(mockSimulationData.humedad_arroz + 2).toFixed(1));

    if (mockDronState.nivel_agua_porcentaje <= 0) {
      mockDronState.nivel_agua_porcentaje = 0;
      mockDronState.mision_activa = false;
      mockDronState.estado = 'en_base';
      mockDronState.en_posicion_recarga = true; // Aterriza en la base
    }
  }

  // 4. Riego dinámico de parcelas por electroválvulas
  // Caña de Azúcar (parcela-1)
  if (mockParcelValves['parcela-1']) {
    mockSimulationData.humedad_cana = Math.min(98, +(mockSimulationData.humedad_cana + 4.5).toFixed(1));
    mockSimulationData.nivel_tanque = Math.max(0, +(mockSimulationData.nivel_tanque - 0.6).toFixed(1));
    if (mockSimulationData.humedad_cana >= 92 && mockModoGlobalRiego === 'automatico') {
      // Corte automático al llegar a capacidad óptima de campo (LLENO)
      mockParcelValves['parcela-1'] = false;
      mockSimulationData.valvula_cana = false;
    }
  } else {
    mockSimulationData.humedad_cana = Math.max(20, +(mockSimulationData.humedad_cana - 0.2).toFixed(1));
  }

  // Tomate Rojo (parcela-2)
  if (mockParcelValves['parcela-2']) {
    mockSimulationData.humedad_tomate = Math.min(95, +(mockSimulationData.humedad_tomate + 4.5).toFixed(1));
    mockSimulationData.nivel_tanque = Math.max(0, +(mockSimulationData.nivel_tanque - 0.6).toFixed(1));
    if (mockSimulationData.humedad_tomate >= 85 && mockModoGlobalRiego === 'automatico') {
      // Corte automático al llegar a humedad óptima
      mockParcelValves['parcela-2'] = false;
      mockSimulationData.valvula_tomate = false;
    }
  } else {
    mockSimulationData.humedad_tomate = Math.max(16, +(mockSimulationData.humedad_tomate - 0.2).toFixed(1));
  }

  // Arroz (parcela-3)
  if (mockParcelValves['parcela-3']) {
    mockSimulationData.humedad_arroz = Math.min(100, +(mockSimulationData.humedad_arroz + 3.5).toFixed(1));
    mockSimulationData.nivel_tanque = Math.max(0, +(mockSimulationData.nivel_tanque - 0.6).toFixed(1));
    if (mockSimulationData.humedad_arroz >= 98 && mockModoGlobalRiego === 'automatico') {
      mockParcelValves['parcela-3'] = false;
      mockSimulationData.valvula_arroz = false;
    }
  } else {
    mockSimulationData.humedad_arroz = Math.max(60, +(mockSimulationData.humedad_arroz - 0.1).toFixed(1));
  }

  // Parcela 4 (Descanso)
  if (mockParcelValves['parcela-4']) {
    mockSimulationData.humedad_descanso = Math.min(90, +((mockSimulationData.humedad_descanso ?? 32) + 4).toFixed(1));
    mockSimulationData.nivel_tanque = Math.max(0, +(mockSimulationData.nivel_tanque - 0.4).toFixed(1));
    if ((mockSimulationData.humedad_descanso ?? 32) >= 80 && mockModoGlobalRiego === 'automatico') {
      mockParcelValves['parcela-4'] = false;
    }
  } else {
    mockSimulationData.humedad_descanso = Math.max(15, +((mockSimulationData.humedad_descanso ?? 32) - 0.2).toFixed(1));
  }

  // Sincronizar estado de actuadores
  mockSimulationData = {
    ...mockSimulationData,
    valvula_cana: Boolean(mockParcelValves['parcela-1']),
    valvula_tomate: Boolean(mockParcelValves['parcela-2']),
    valvula_arroz: Boolean(mockParcelValves['parcela-3']),
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
      valvula_estado: mockParcelValves['parcela-1'] ? 'abierta' : 'cerrada',
      valvula_modo: mockModoGlobalRiego,
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
      valvula_estado: mockParcelValves['parcela-2'] ? 'abierta' : 'cerrada',
      valvula_modo: mockModoGlobalRiego,
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
      valvula_estado: mockParcelValves['parcela-3'] ? 'abierta' : 'cerrada',
      valvula_modo: mockModoGlobalRiego,
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
      valvula_estado: mockParcelValves['parcela-4'] ? 'abierta' : 'cerrada',
      valvula_modo: mockModoGlobalRiego,
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

  // Alerta cuando el dron alcanza el 100% de agua (Lleno)
  if (mockDronState.nivel_agua_porcentaje >= 100 && !mockDronState.mision_activa) {
    alertas.push({
      id: 'alerta-dron-lleno',
      tipo: 'dron_emergencia',
      severidad: 'baja',
      titulo: '✅ Dron al 100% de agua (Lleno)',
      mensaje:
        'Sensor de nivel máximo detectó tanque completo (40 L). Llave de paso cerrada automáticamente para evitar derrame.',
      leida: false,
      activa: true,
      created_at: new Date().toISOString(),
    });
  }

  // Alerta cuando la cisterna alcanza el 100% de agua (Llena)
  if (data.nivel_tanque >= 100) {
    alertas.push({
      id: 'alerta-cisterna-llena',
      tipo: 'nivel_reserva',
      severidad: 'baja',
      titulo: '✅ Cisterna Principal al 100% (Llena)',
      mensaje:
        'Sensor de boya de corte activado: Tanque lleno (50,000 L). Válvula de pozo/red cerrada automáticamente.',
      leida: false,
      activa: true,
      created_at: new Date().toISOString(),
    });
  }

  // Lógica de riego automático vs manual por parcela
  if (mockModoGlobalRiego === 'automatico') {
    parcelas.forEach((p) => {
      if (p.tiene_cultivo && p.cultivo) {
        // Modo automático: se activa si humedad < minima y tanque > 20%
        if (p.humedad_suelo < p.cultivo.humedad_minima && data.nivel_tanque >= 20) {
          mockParcelValves[p.parcela.id] = true;
          p.valvula_estado = 'abierta';
          p.valvula_modo = 'automatico';
        } else if (p.humedad_suelo >= p.cultivo.humedad_optima) {
          mockParcelValves[p.parcela.id] = false;
          p.valvula_estado = 'cerrada';
          p.valvula_modo = 'automatico';
        }
      }
    });
  } else {
    // Modo manual: cada válvula refleja mockParcelValves
    parcelas.forEach((p) => {
      const isOpen = Boolean(mockParcelValves[p.parcela.id]);
      p.valvula_estado = isOpen ? 'abierta' : 'cerrada';
      p.valvula_modo = 'manual';
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
        nivel_actual_porcentaje: Math.round(data.nivel_tanque),
        nivel_critico_porcentaje: 20,
        nivel_alerta_porcentaje: 35,
        activo: true,
        llave_recarga_abierta: mockCisternaLlaveLlenado,
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

    // Identificar parcela objetivo (acepta tanto 'valvula-1' como 'parcela-1')
    let targetKey = valvulaId;
    if (valvulaId.startsWith('valvula-')) {
      targetKey = valvulaId.replace('valvula-', 'parcela-');
    }

    mockParcelValves[targetKey] = !mockParcelValves[targetKey];
    const isOpen = Boolean(mockParcelValves[targetKey]);

    if (targetKey === 'parcela-1') mockSimulationData.valvula_cana = isOpen;
    if (targetKey === 'parcela-2') mockSimulationData.valvula_tomate = isOpen;
    if (targetKey === 'parcela-3') mockSimulationData.valvula_arroz = isOpen;

    // Actualizar datos del ciclo
    updateMockData();

    return {
      id: valvulaId,
      parcela_id: targetKey,
      tanque_id: 'tanque-1',
      nombre: `Electroválvula ${targetKey}`,
      posicion_x: 0,
      posicion_y: 0,
      posicion_z: 0,
      estado: isOpen ? 'abierta' : 'cerrada',
      modo: mockModoGlobalRiego,
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
    mockParcelValves['parcela-1'] = true;
    mockParcelValves['parcela-2'] = true;
    mockParcelValves['parcela-3'] = true;
    mockParcelValves['parcela-4'] = true;
    mockSimulationData.valvula_cana = true;
    mockSimulationData.valvula_tomate = true;
    mockSimulationData.valvula_arroz = true;
    mockCustomParcels.forEach((cp) => {
      mockParcelValves[cp.parcela.id] = true;
      cp.valvula_estado = 'abierta';
    });
    updateMockData();
  },

  detenerRiegoTodo(): void {
    mockParcelValves['parcela-1'] = false;
    mockParcelValves['parcela-2'] = false;
    mockParcelValves['parcela-3'] = false;
    mockParcelValves['parcela-4'] = false;
    mockSimulationData.valvula_cana = false;
    mockSimulationData.valvula_tomate = false;
    mockSimulationData.valvula_arroz = false;
    mockCustomParcels.forEach((cp) => {
      mockParcelValves[cp.parcela.id] = false;
      cp.valvula_estado = 'cerrada';
    });
    updateMockData();
  },

  // ---- Control de Cisterna Principal (Llenado desde Red / Pozo) ----
  toggleCisternaLlave(): { abierta: boolean; message: string; nivel: number } {
    if (!mockCisternaLlaveLlenado && mockSimulationData.nivel_tanque >= 100) {
      return {
        abierta: false,
        message: 'La cisterna ya está llena al 100% (50,000 L). Boya de nivel activa.',
        nivel: 100,
      };
    }
    mockCisternaLlaveLlenado = !mockCisternaLlaveLlenado;
    updateMockData();
    return {
      abierta: mockCisternaLlaveLlenado,
      message: mockCisternaLlaveLlenado
        ? '🚰 Válvula de red/pozo abierta. Suministrando agua a la cisterna...'
        : 'Válvula de cisterna cerrada.',
      nivel: mockSimulationData.nivel_tanque,
    };
  },

  isCisternaLlaveAbierta(): boolean {
    return mockCisternaLlaveLlenado;
  },

  // ---- Control del Sistema de Dron de Riego de Emergencia ----
  getDronState(): DronRiego {
    return { ...mockDronState };
  },

  // Sensor de presencia de objeto en la estación de recarga (simula HC-SR04)
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
        message: 'Acceso denegado: El sensor de presencia ultrasónico no detecta ningún objeto en la plataforma de recarga.',
        abierta: false,
      };
    }
    if (!mockDronState.llave_paso_recarga_abierta && mockDronState.nivel_agua_porcentaje >= 100) {
      return {
        success: false,
        message: 'Tanque del dron al 100% (Lleno). El flotador de corte impide abrir la llave para evitar desbordamiento.',
        abierta: false,
      };
    }
    mockDronState.llave_paso_recarga_abierta = !mockDronState.llave_paso_recarga_abierta;
    updateMockData();
    return {
      success: true,
      message: mockDronState.llave_paso_recarga_abierta
        ? '🚰 Llave de paso abierta. Suministrando agua al tanque del dron...'
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
    updateMockData();
    return {
      success: true,
      message: 'Misión de riego por dron de emergencia iniciada con éxito sobre todo el sembradío.',
    };
  },

  // Llenado manual del dron
  llenarDronManual(): void {
    mockDronState.nivel_agua_porcentaje = 100;
    mockDronState.llave_paso_recarga_abierta = false;
    updateMockData();
  },
};
