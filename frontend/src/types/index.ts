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
export type MetodoRiego = 'goteo' | 'microaspersion' | 'aspersion' | 'aspersion_presurizada' | 'inundacion';
// Sistema(s) con los que riega la parcela: uno o los dos instalados a la vez.
export type SeleccionRiego = MetodoRiego | 'ambos';

// Tubería instalada por el técnico; sin instalación la parcela no puede regar por válvula.
export interface InstalacionRiego {
  estado: 'pendiente' | 'instalada';
  metodo: MetodoRiego;
  metros_tuberia: number;
  emisores: number; // goteros o aspersores
  fecha?: string;
  tecnico?: string;
  notas?: string;
}

// ---- Sesiones ----
export type Rol = 'tecnico' | 'productor';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
  plan?: 'basico' | 'pro';
}

export interface Sesion {
  token: string;
  usuario: UsuarioSesion;
  expira: string;
  demo?: boolean; // sesión local cuando el backend no está disponible
}
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
  metodo_riego?: SeleccionRiego | null; // null = el recomendado por el cultivo
  instalaciones_riego?: InstalacionRiego[] | null; // una por sistema; null = instalación previa al registro (operativa)
  propietario: string;
  notas?: string;
  sensores_activos?: {
    humedad_suelo: boolean;
    humedad_ambiental: boolean;
    temperatura: boolean;
    ph_suelo: boolean;
  };
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
  ultima_lectura?: number;
  ultima_lectura_at?: string;
  activo: boolean;
}

export interface LecturaSensor {
  id: string;
  sensor_id: string;
  valor: number;
  unidad: string;
  timestamp: string;
}

// ---- Actuadores / Válvulas ----
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
  activa: boolean;
}

// ---- Reservas de Agua (Cisterna) ----
export interface TanqueAgua {
  id: string;
  nombre: string;
  tipo: 'cisterna' | 'pozo' | 'tanque_elevado';
  capacidad_litros: number;
  nivel_actual_porcentaje: number;
  nivel_critico_porcentaje: number;
  nivel_alerta_porcentaje: number;
  activo: boolean;
  llave_recarga_abierta?: boolean;
}

// ---- Sistema de Dron de Riego de Emergencia ----
export type TipoMisionDron = 'riego' | 'fumigacion' | 'escaneo';

// Resultado del clasificador de visión del dron al escanear una parcela.
export interface EscaneoPlaga {
  id: string;
  parcela_id: string;
  parcela_nombre: string;
  plaga_detectada: boolean;
  confianza: number; // 0-1
  plaga?: string;
  severidad?: Severidad;
  recomendacion?: string;
  fecha: string;
}

// Predicción del modelo de riesgo de plagas antes de escanear.
export interface RiesgoPlaga {
  probabilidad: number; // 0-1
  nivel: 'bajo' | 'moderado' | 'alto';
  factores: string[];
  plaga_probable: string;
}

export interface MisionDronResumen {
  tipo: TipoMisionDron;
  parcela_id: string;
  parcela_nombre: string;
  litros_objetivo: number;
  litros_aplicados: number;
  completada: boolean;
  motivo_fin: string;
  fin: string;
  escaneo?: EscaneoPlaga;
}

export interface DronRiego {
  id: string;
  nombre: string;
  estado: 'en_base' | 'regando' | 'fumigando' | 'escaneando' | 'cargando_agua' | 'emergencia';
  nivel_agua_porcentaje: number;
  capacidad_litros: number;
  bateria_porcentaje: number;
  en_posicion_recarga: boolean;       // Sensor ultrasónico/proximidad que detecta objeto presente en la base
  llave_paso_recarga_abierta: boolean; // Válvula de suministro de agua al dron (bloqueada si en_posicion_recarga === false)
  mision_activa: boolean;
  dias_sin_lluvia: number;
  requiere_riego_emergencia: boolean;
  ultimo_despacho?: string;
  objetivo_parcela_id?: string;
  // Misión en curso: el dron descarga una dosis calculada para la parcela objetivo.
  tipo_mision?: TipoMisionDron;
  litros_objetivo?: number;
  litros_aplicados?: number;
  avance_porcentaje?: number; // progreso de la misión (escaneo: superficie recorrida)
  // Cartucho de biopreparado orgánico que se inyecta en línea durante la fumigación.
  nivel_biopreparado_porcentaje: number;
  capacidad_biopreparado_litros: number;
  ultima_mision?: MisionDronResumen;
}

// ---- Historial de Riego ----
export interface EventoRiego {
  id: string;
  parcela_id: string;
  valvula_id: string;
  tipo: 'automatico' | 'manual' | 'programado' | 'dron_emergencia';
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
export type TipoAlerta =
  | 'prevencion_organica'
  | 'nivel_reserva'
  | 'temperatura'
  | 'humedad_critica'
  | 'pronostico'
  | 'dron_vacio'
  | 'dron_emergencia'
  | 'plaga_detectada'
  | 'escaneo_limpio'
  | 'riesgo_plaga'
  | 'sequia'
  | 'lluvia_proxima';
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
export interface PronosticoClimaHora {
  hora: string;
  temperatura: number;
  probabilidad_lluvia: number;
  icono: string;
  condicion: string;
}

export interface PronosticoClimaDia {
  dia: string;
  fecha?: string;
  periodo?: 'historico' | 'pronostico';
  temp_min: number;
  temp_max: number;
  probabilidad_lluvia: number;
  icono: string;
}

export interface PronosticoClima {
  pronostico_lluvia_12h: boolean;
  pronostico_lluvia_3dias: boolean;    // Flag para riego por dron de emergencia (>= 3 días sin lluvia)
  dias_consecutivos_sin_lluvia: number;
  probabilidad_lluvia: number;
  temperatura_exterior: number;
  temperatura_max?: number;
  temperatura_min?: number;
  condicion_texto?: string;
  humedad_relativa_exterior: number;
  velocidad_viento: number;
  direccion_viento?: string;
  indice_uv?: number;
  sensacion_termica?: number;
  pronostico_por_hora?: PronosticoClimaHora[];
  pronostico_dias?: PronosticoClimaDia[];
  proximo_riego?: string;
  requiere_riego_emergencia?: boolean;
  razon_riego_emergencia?: string;
  fuente_api: string;
  consultado_at: string;
}

// ---- Dashboard ----
export interface DashboardSummary {
  parcelas: ParcelaDashboard[];
  tanques: TanqueAgua[];
  dron: DronRiego;
  alertas_activas: Alerta[];
  clima: PronosticoClima;
  eventos_recientes: EventoRiego[];
  estadisticas: Estadisticas;
  modo_global_riego: 'automatico' | 'manual';
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
  // Riego por tubería según el sistema instalado en la parcela
  metodo_riego?: SeleccionRiego;
  sistemas_instalados?: MetodoRiego[]; // tuberías terminadas en la parcela
  sistemas_activos?: MetodoRiego[]; // los que riegan con la selección actual
  caudal_lpm?: number; // litros por minuto que toma de la cisterna con la válvula abierta
  eficiencia_riego?: number; // fracción del agua que llega a la raíz (0-1)
  litros_hoy?: number;
  riego_pospuesto_por_lluvia?: boolean;
  tuberia_pendiente?: boolean; // el sistema seleccionado aún no está instalado
  // IA de plagas
  riesgo_plaga?: RiesgoPlaga;
  ultimo_escaneo?: EscaneoPlaga;
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

// ---- Telemetría de sensores ----
export interface DatosSimulacion {
  humedad_cana: number;
  humedad_tomate: number;
  humedad_arroz: number;
  nivel_tanque: number;
  temperatura: number;
  humedad_ambiental: number;
  ph_suelo?: number;
  ph_tierra?: number;
  valvula_cana: boolean;
  valvula_tomate: boolean;
  valvula_arroz: boolean;
  // Dron y sensor de presencia
  dron_en_base?: boolean;
  dron_nivel_agua?: number;
  dron_llave_paso?: boolean;
  modo_riego_auto?: boolean;
  dias_sin_lluvia_sim?: number;
  [key: string]: any;
}

// ---- Formulario Crear Parcela DTO ----
export interface CreateParcelaDTO {
  nombre: string;
  propietario: string;
  superficie_hectareas: number;
  zona_3d: Zona3D;
  modo_operacion: ModoOperacion;
  metodo_riego?: SeleccionRiego | null;
  instalaciones_riego?: InstalacionRiego[] | null;
  color_base?: string;
  tiene_cultivo: boolean;
  cultivo_id?: string | null;
  estado_descanso?: string;
  notas?: string;
  sensores_config: {
    humedad_suelo: boolean;
    humedad_ambiental: boolean;
    temperatura: boolean;
    ph_suelo: boolean;
    humedad_suelo_valor: number;
    humedad_ambiental_valor: number;
    temperatura_valor: number;
    ph_suelo_valor: number;
  };
}

export interface UpdateParcelaDTO {
  nombre?: string;
  activa?: boolean;
  tiene_cultivo?: boolean;
  cultivo_id?: string | null;
  modo_operacion?: ModoOperacion;
  metodo_riego?: SeleccionRiego | null;
  instalaciones_riego?: InstalacionRiego[] | null;
  notas?: string;
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
