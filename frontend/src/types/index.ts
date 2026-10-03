// =============================================================================
// Sistema de Riego Inteligente - Tipos TypeScript Compartidos
// Estado de Morelos
// =============================================================================

// ---- Cultivos ----
export interface Cultivo {
  id: string;
  nombre: string;
  nombre_cientifico: string;
  humedad_minima: number;
  humedad_optima: number;
  humedad_maxima: number;
  temp_minima: number;
  temp_optima: number;
  temp_maxima: number;
  hr_alerta_hongos: number;
  frecuencia_riego_horas: number;
  duracion_riego_minutos: number;
  tipo_riego: 'goteo' | 'aspersion' | 'inundacion' | 'microaspersion';
  descripcion: string;
  icono: string;
}

// ---- Parcelas ----
export type ModoOperacion = 'automatico' | 'manual';
export type Zona3D = 'zona_alta' | 'zona_media' | 'zona_baja';

export interface Parcela {
  id: string;
  nombre: string;
  tiene_cultivo: boolean;
  cultivo_id?: string | null;
  cultivo?: Cultivo | null;
  latitud: number;
  longitud: number;
  altitud_msnm: number;
  superficie_hectareas: number;
  zona_3d: Zona3D;
  color_base: string;
  activa: boolean;
  modo_operacion: ModoOperacion;
  propietario: string;
  notas?: string;
  // Sensores configurados
  sensores_activos?: {
    humedad_suelo: boolean;
    humedad_ambiental: boolean;
    temperatura: boolean;
    ph_suelo: boolean;
  };
  // Datos en tiempo real (populados desde sensores)
  humedad_actual?: number;
  temperatura_actual?: number;
  humedad_ambiental_actual?: number;
  ph_suelo_actual?: number;
  valvula?: Valvula;
  sensores?: Sensor[];
}

// ---- Sensores ----
export type TipoSensor = 'humedad_suelo' | 'temperatura' | 'humedad_ambiental' | 'ph_suelo' | 'nivel_tanque';

export interface Sensor {
  id: string;
  parcela_id: string;
  tipo: TipoSensor;
  modelo: string;
  posicion_x: number;
  posicion_y: number;
  posicion_z: number;
  activo: boolean;
  ultimo_valor: number;
  ultima_lectura: string;
  valor_minimo: number;
  valor_maximo: number;
  unidad: string;
}

// ---- Lecturas ----
export type FuenteLectura = 'sensor' | 'simulacion' | 'manual';

export interface Lectura {
  id: string;
  sensor_id: string;
  valor: number;
  unidad: string;
  timestamp: string;
  fuente: FuenteLectura;
  es_valido: boolean;
}

// ---- Tanques de Agua ----
export interface TanqueAgua {
  id: string;
  nombre: string;
  tipo: 'cisterna' | 'pozo' | 'tanque';
  capacidad_litros: number;
  nivel_actual_porcentaje: number;
  nivel_critico_porcentaje: number;
  nivel_alerta_porcentaje: number;
  sensor_id?: string;
  activo: boolean;
}

// ---- Válvulas ----
export type EstadoValvula = 'abierta' | 'cerrada';

export interface Valvula {
  id: string;
  parcela_id: string;
  tanque_id: string;
  nombre: string;
  posicion_x: number;
  posicion_y: number;
  posicion_z: number;
  estado: EstadoValvula;
  modo: ModoOperacion;
  pin_rele: number;
  voltaje: string;
  ultima_apertura?: string;
  ultimo_cierre?: string;
  activa: boolean;
}

// ---- Eventos de Riego ----
export interface EventoRiego {
  id: string;
  parcela_id: string;
  valvula_id: string;
  tipo: 'automatico' | 'manual' | 'programado';
  accion: 'apertura' | 'cierre';
  humedad_suelo_al_evento: number;
  nivel_tanque_al_evento: number;
  temperatura_al_evento: number;
  inicio: string;
  fin?: string;
  duracion_minutos?: number;
  litros_estimados?: number;
  razon: string;
}

// ---- Alertas ----
export type TipoAlerta = 'prevencion_organica' | 'nivel_reserva' | 'temperatura' | 'humedad_critica' | 'pronostico';
export type Severidad = 'baja' | 'media' | 'alta' | 'critica';

export interface Alerta {
  id: string;
  parcela_id?: string;
  tipo: TipoAlerta;
  severidad: Severidad;
  titulo: string;
  mensaje: string;
  leida: boolean;
  activa: boolean;
  datos_contexto?: Record<string, unknown>;
  created_at: string;
  resuelta_at?: string;
}

// ---- Clima ----
export interface PronosticoClima {
  pronostico_lluvia_12h: boolean;
  probabilidad_lluvia: number;
  temperatura_exterior: number;
  humedad_relativa_exterior: number;
  velocidad_viento: number;
  fuente_api: string;
  consultado_at: string;
}

// ---- Dashboard ----
export interface DashboardSummary {
  parcelas: ParcelaDashboard[];
  tanques: TanqueAgua[];
  alertas_activas: Alerta[];
  clima: PronosticoClima;
  eventos_recientes: EventoRiego[];
  estadisticas: Estadisticas;
}

export interface ParcelaDashboard {
  parcela: Parcela;
  tiene_cultivo: boolean;
  cultivo?: Cultivo | null;
  humedad_suelo: number;
  temperatura: number;
  humedad_ambiental: number;
  ph_suelo: number;
  sensores_activos?: {
    humedad_suelo: boolean;
    humedad_ambiental: boolean;
    temperatura: boolean;
    ph_suelo: boolean;
  };
  valvula_estado: EstadoValvula;
  valvula_modo: ModoOperacion;
  ultimo_riego?: EventoRiego;
}

export interface Estadisticas {
  total_parcelas: number;
  parcelas_activas: number;
  parcelas_con_cultivo?: number;
  parcelas_sin_cultivo?: number;
  valvulas_abiertas: number;
  alertas_sin_leer: number;
  litros_hoy: number;
  riegos_hoy: number;
}

// ---- Datos de Simulación (desde Arduino/Tinkercad) ----
export interface DatosSimulacion {
  humedad_cana: number;
  humedad_tomate: number;
  humedad_arroz: number;
  nivel_tanque: number;
  temperatura: number;
  humedad_ambiental: number;
  ph_tierra: number;
  valvula_cana: boolean;
  valvula_tomate: boolean;
  valvula_arroz: boolean;
  [key: string]: any;
}

// ---- Formulario Crear Parcela DTO ----
export interface CreateParcelaDTO {
  nombre: string;
  propietario: string;
  superficie_hectareas: number;
  zona_3d: Zona3D;
  modo_operacion: ModoOperacion;
  color_base?: string;
  tiene_cultivo: boolean;
  cultivo_id?: string | null;
  estado_descanso?: string;
  notas?: string;
  sensores_config: {
    humedad_suelo: boolean;
    humedad_suelo_valor: number;
    humedad_ambiental: boolean;
    humedad_ambiental_valor: number;
    temperatura: boolean;
    temperatura_valor: number;
    ph_suelo: boolean;
    ph_suelo_valor: number;
  };
}

// ---- WebSocket Events ----
export interface WSEventSensorUpdate {
  event: 'sensor-update';
  data: {
    sensor_id: string;
    parcela_id: string;
    tipo: TipoSensor;
    valor: number;
    timestamp: string;
  };
}

export interface WSEventValveUpdate {
  event: 'valve-update';
  data: {
    valvula_id: string;
    parcela_id: string;
    estado: EstadoValvula;
    modo: ModoOperacion;
  };
}

export interface WSEventAlert {
  event: 'alert';
  data: Alerta;
}
