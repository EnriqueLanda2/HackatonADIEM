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
  UpdateParcelaDTO,
  DronRiego,
  TipoMisionDron,
  MetodoRiego,
  SeleccionRiego,
  EscaneoPlaga,
  InstalacionRiego,
} from '@/types';
import { CULTIVOS_MORELOS } from './crop-profiles';
import { aplicarFumigacion, clasificarEscaneo, evolucionarInfestacion, infestacionInicial, predecirRiesgoPlaga } from './pest-ai';
import { evaluarAlertasInteligentes, lluviaProxima } from './alertas-inteligentes';
import { esTecnico, notificarSesionExpirada, tokenSesion } from './auth';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

// Encabezados con la sesión; el backend exige el token de técnico para configurar parcelas.
function encabezados(): HeadersInit {
  const token = tokenSesion();
  return { 'Content-Type': 'application/json', ...(token && token !== 'demo' ? { Authorization: `Bearer ${token}` } : {}) };
}

async function apiEnviar<T>(method: 'POST' | 'PUT', path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method, headers: encabezados(), body: JSON.stringify(body) });
  if (res.status === 401) {
    notificarSesionExpirada();
    throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message ?? `API Error ${res.status}: ${path}`);
  }
  return res.json();
}

const apiPost = <T>(path: string, body: unknown) => apiEnviar<T>('POST', path, body);
const apiPut = <T>(path: string, body: unknown) => apiEnviar<T>('PUT', path, body);

// El productor administra su parcela, lo que siembra y con qué sistema instalado riega;
// instalar tuberías y los datos físicos son del técnico.
export const CAMPOS_PRODUCTOR = new Set(['nombre', 'activa', 'tiene_cultivo', 'cultivo_id', 'notas', 'metodo_riego']);

const exigirTecnico = () => {
  if (!esTecnico()) throw new Error('Solo el técnico puede dar de alta parcelas e instalar tuberías.');
};

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

const simulatorState = {
  lastUpdateAt: Date.now(),
  valveByParcel: {
    'parcela-1': false,
    'parcela-2': true,
    'parcela-3': false,
  } as Record<string, boolean>,
};

// Parcelas creadas por el usuario en modo demo
const mockCustomParcels: ParcelaDashboard[] = [];
const mockParcelOverrides = new Map<string, UpdateParcelaDTO>();

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
  objetivo_parcela_id: undefined,
  nivel_biopreparado_porcentaje: 80,
  capacidad_biopreparado_litros: 5,
};

const CISTERNA_CAPACIDAD_L = 50000;
const CISTERNA_NIVEL_CRITICO = 20;
const DRON_NIVEL_MINIMO_DESPEGUE = 15;
const DRON_RECARGA_LPM = 150; // litros por minuto desde la cisterna
const DRON_RIEGO_LPM = 45; // caudal de aspersión de agua
const DRON_FUMIGACION_LPM = 20; // caudal de fumigación (gota más fina)
const DRON_HUMEDAD_POR_LITRO = 0.4; // puntos de humedad del suelo por litro de riego
const DRON_RIEGO_MINIMO_L = 8; // riego de refuerzo cuando la parcela ya está cerca del óptimo
const FUMIGACION_L_POR_HA = 10; // caldo (agua + biopreparado) por hectárea
const BIOPREPARADO_POR_LITRO = 0.05; // 5% de biopreparado inyectado en línea
const FUMIGACION_VIGENCIA_MS = 12 * 3600000; // tras fumigar, no se repite en 12 h

const dronLitros = (porcentaje: number) => (mockDronState.capacidad_litros * porcentaje) / 100;
const cisternaLitros = () => (CISTERNA_CAPACIDAD_L * Number(mockSimulationData.nivel_tanque ?? 0)) / 100;
const biopreparadoLitros = () => (mockDronState.capacidad_biopreparado_litros * mockDronState.nivel_biopreparado_porcentaje) / 100;

/*
 * Riego por tubería según el sistema instalado en cada parcela.
 * Goteo: poco caudal, casi toda el agua llega a la raíz y no moja el follaje.
 * Aspersión: humedece el doble de rápido pero gasta más agua, pierde parte por
 * evaporación y viento, y moja el follaje (sube la humedad ambiental → riesgo de hongos).
 */
import { MetodoRiego } from '@/types';
export const RIEGO_POR_METODO: Record<string, { label: string; icono: string; caudalPorHa: number; eficiencia: number; hrFollaje: number }> = {
  goteo: { label: 'Goteo', icono: '💧', caudalPorHa: 80, eficiencia: 0.9, hrFollaje: 0 },
  microaspersion: { label: 'Micro', icono: '🌧️', caudalPorHa: 120, eficiencia: 0.85, hrFollaje: 4 },
  aspersion: { label: 'Aspersión', icono: '🌦️', caudalPorHa: 200, eficiencia: 0.75, hrFollaje: 8 },
  aspersion_presurizada: { label: 'Aspersión', icono: '🌦️', caudalPorHa: 200, eficiencia: 0.75, hrFollaje: 8 },
  inundacion: { label: 'Inundación', icono: '🌊', caudalPorHa: 400, eficiencia: 0.6, hrFollaje: 2 },
};
const HUMEDAD_POR_LITRO_EFECTIVO_HA = 0.085; // puntos de humedad del suelo por litro útil por hectárea
const EVAPORACION_SUELO_POR_MIN = 1.2; // puntos por minuto a 28 °C
const HUMEDAD_RESIDUAL_SUELO = 10; // la evaporación no seca el suelo por debajo de esto

// Estado del suelo y las válvulas por id real de parcela (backend o simulador).
const sueloPorParcela = new Map<string, number>();
const valvulaPorParcela = new Map<string, boolean>();
const litrosHoyPorParcela = new Map<string, number>();
let litrosHoyFecha = new Date().toDateString();
let riegoLastSyncAt = Date.now();
let parcelasConocidas: ParcelaDashboard[] = [];

// Materiales estimados para instalar el sistema en la parcela.
// Goteo: cintas cada 2.5 m (4,000 m/ha) con goteros cada 30 cm. Aspersión: marco de 12 × 12 m.
export function sugerirInstalacion(metodo: MetodoRiego, hectareas: number): Pick<InstalacionRiego, 'metros_tuberia' | 'emisores'> {
  const ha = Math.max(0.1, Number(hectareas) || 1);
  return metodo === 'goteo'
    ? { metros_tuberia: Math.round(ha * 4000), emisores: Math.round((ha * 4000) / 0.3) }
    : { metros_tuberia: Math.round(ha * 850), emisores: Math.round((ha * 10000) / 144) };
}

export const METODOS_RIEGO: MetodoRiego[] = ['goteo', 'aspersion'];
export const metodosDeSeleccion = (seleccion: SeleccionRiego): MetodoRiego[] =>
  seleccion === 'ambos' ? METODOS_RIEGO : [seleccion];

const metodoRecomendado = (p: ParcelaDashboard): MetodoRiego => (p.cultivo?.tipo_riego === 'goteo' ? 'goteo' : 'aspersion');

// Instalaciones registradas por el técnico (una por sistema).
export const instalacionesDe = (p: ParcelaDashboard): InstalacionRiego[] => p.parcela.instalaciones_riego ?? [];

// Sistemas listos para regar. Sin registro se asume la instalación previa del sistema recomendado.
export function sistemasInstalados(p: ParcelaDashboard): MetodoRiego[] {
  const instalaciones = p.parcela.instalaciones_riego;
  if (!instalaciones) return [p.parcela.metodo_riego && p.parcela.metodo_riego !== 'ambos' ? p.parcela.metodo_riego : metodoRecomendado(p)];
  return METODOS_RIEGO.filter((m) => instalaciones.some((i) => i.metodo === m && i.estado === 'instalada'));
}

// Selección de la parcela: la elegida o, si no hay, la que permiten sus tuberías.
export function metodoRiegoDe(p: ParcelaDashboard): SeleccionRiego {
  if (p.parcela.metodo_riego) return p.parcela.metodo_riego;
  const instalados = sistemasInstalados(p);
  return instalados.length === 2 ? 'ambos' : instalados[0] ?? metodoRecomendado(p);
}

// Sistemas que riegan con la selección actual (solo los que ya tienen tubería terminada).
export const sistemasActivos = (p: ParcelaDashboard): MetodoRiego[] => {
  const instalados = sistemasInstalados(p);
  return metodosDeSeleccion(metodoRiegoDe(p)).filter((m) => instalados.includes(m));
};

export const tuberiaInstalada = (p: ParcelaDashboard) => sistemasActivos(p).length > 0;

// La aspersión pierde eficiencia con calor y viento; el goteo no.
function eficienciaRiego(metodo: MetodoRiego, temperatura: number, viento: number): number {
  if (metodo === 'goteo') return RIEGO_POR_METODO.goteo.eficiencia;
  const perdida = Math.max(0, temperatura - 25) * 0.01 + Math.max(0, viento) * 0.004;
  return +Math.max(0.5, RIEGO_POR_METODO.aspersion.eficiencia - perdida).toFixed(2);
}
const fumigacionesRecientes = new Map<string, number>();
let dronLastSyncAt = Date.now();
let misionParcelaNombre = '';

// IA de plagas: infestación real (oculta) por parcela y último escaneo del dron.
const ESCANEO_SEG_POR_HA = 20;
const ESCANEO_MIN_SEG = 20;
const ESCANEO_VIGENCIA_MS = 6 * 3600000;
const RIESGO_ESCANEO_AUTO = 0.6;
const infestacionPorParcela = new Map<string, number>();
const escaneosPorParcela = new Map<string, EscaneoPlaga>();
// pendiente → enviando al backend; backend → el backend ya notificó; local → hay que notificar desde el navegador
const reporteEscaneo = new Map<string, 'pendiente' | 'backend' | 'local'>();
let climaEnVivo: PronosticoClima | null = null;

const duracionEscaneoSeg = (p: ParcelaDashboard) =>
  Math.max(ESCANEO_MIN_SEG, ESCANEO_SEG_POR_HA * Number(p.parcela.superficie_hectareas || 1));

// El dron manda al backend el booleano de plaga; el backend crea la alerta y la push.
async function reportarEscaneo(escaneo: EscaneoPlaga) {
  reporteEscaneo.set(escaneo.id, 'pendiente');
  try {
    if (!(await checkBackend())) throw new Error('backend no disponible');
    await apiPost('/dron/escaneos', escaneo);
    reporteEscaneo.set(escaneo.id, 'backend');
  } catch {
    reporteEscaneo.set(escaneo.id, 'local');
  }
}

// Mueve agua de la cisterna al dron conservando el volumen total.
function transferirCisternaADron(litros: number) {
  if (litros <= 0) return;
  mockDronState.nivel_agua_porcentaje = Math.min(100, mockDronState.nivel_agua_porcentaje + (litros / mockDronState.capacidad_litros) * 100);
  mockSimulationData.nivel_tanque = Math.max(0, mockSimulationData.nivel_tanque - (litros / CISTERNA_CAPACIDAD_L) * 100);
}

const parcelaOperable = (p: ParcelaDashboard) => Boolean(p.parcela.activa && p.tiene_cultivo && p.cultivo);

// Litros que necesita la parcela para la misión indicada.
function calcularDosisDron(p: ParcelaDashboard, tipo: TipoMisionDron): number {
  if (tipo === 'escaneo') return 0;
  if (tipo === 'fumigacion') {
    return +Math.max(5, FUMIGACION_L_POR_HA * Number(p.parcela.superficie_hectareas || 1)).toFixed(1);
  }
  const deficit = Number(p.cultivo?.humedad_optima ?? 60) - Number(p.humedad_suelo);
  return +Math.max(DRON_RIEGO_MINIMO_L, deficit / DRON_HUMEDAD_POR_LITRO).toFixed(1);
}

function iniciarMisionDron(p: ParcelaDashboard, tipo: TipoMisionDron) {
  mockDronState.mision_activa = true;
  mockDronState.tipo_mision = tipo;
  mockDronState.estado = tipo === 'fumigacion' ? 'fumigando' : tipo === 'escaneo' ? 'escaneando' : 'regando';
  mockDronState.objetivo_parcela_id = p.parcela.id;
  mockDronState.litros_objetivo = tipo === 'escaneo' ? 0 : calcularDosisDron(p, tipo);
  mockDronState.litros_aplicados = 0;
  mockDronState.avance_porcentaje = 0;
  mockDronState.en_posicion_recarga = false;
  mockDronState.llave_paso_recarga_abierta = false;
  mockDronState.ultimo_despacho = new Date().toISOString();
  misionParcelaNombre = p.parcela.nombre;
}

// Termina la misión, guarda su resumen y deja el dron acoplado con la llave cerrada.
function regresarDronABase(motivo = 'Misión finalizada', escaneo?: EscaneoPlaga) {
  if (mockDronState.mision_activa && mockDronState.tipo_mision && mockDronState.objetivo_parcela_id) {
    const aplicados = +(mockDronState.litros_aplicados ?? 0).toFixed(1);
    const objetivo = mockDronState.litros_objetivo ?? 0;
    const esEscaneo = mockDronState.tipo_mision === 'escaneo';
    mockDronState.ultima_mision = {
      tipo: mockDronState.tipo_mision,
      parcela_id: mockDronState.objetivo_parcela_id,
      parcela_nombre: misionParcelaNombre,
      litros_objetivo: objetivo,
      litros_aplicados: aplicados,
      completada: esEscaneo ? Boolean(escaneo) : aplicados >= objetivo - 0.05,
      motivo_fin: motivo,
      fin: new Date().toISOString(),
      escaneo,
    };
    if (mockDronState.tipo_mision === 'fumigacion' && aplicados > 0) {
      const id = mockDronState.objetivo_parcela_id;
      fumigacionesRecientes.set(id, Date.now());
      const cobertura = objetivo > 0 ? aplicados / objetivo : 1;
      infestacionPorParcela.set(id, aplicarFumigacion(infestacionPorParcela.get(id) ?? 0, cobertura));
    }
  }
  mockDronState.mision_activa = false;
  mockDronState.estado = 'en_base';
  mockDronState.en_posicion_recarga = true;
  mockDronState.llave_paso_recarga_abierta = false;
  mockDronState.objetivo_parcela_id = undefined;
  mockDronState.tipo_mision = undefined;
  mockDronState.litros_objetivo = undefined;
  mockDronState.litros_aplicados = undefined;
  mockDronState.avance_porcentaje = undefined;
}

/*
 * Motor de riego por tubería. Cada válvula abierta toma de la cisterna el caudal de
 * su sistema (goteo o aspersión) × hectáreas, y solo la fracción eficiente humedece el suelo.
 */
function simularRiegoParcelas(dashboard: DashboardSummary): DashboardSummary {
  const now = Date.now();
  const minutos = Math.min(10, Math.max(0, (now - riegoLastSyncAt) / 1000)) / 60;
  riegoLastSyncAt = now;
  if (new Date(now).toDateString() !== litrosHoyFecha) {
    litrosHoyFecha = new Date(now).toDateString();
    litrosHoyPorParcela.clear();
  }

  const viento = Number(dashboard.clima?.velocidad_viento ?? 0);
  const llueve = lluviaProxima(dashboard.clima);
  const parcelas = dashboard.parcelas.map((p) => {
    const id = p.parcela.id;
    const seleccion = metodoRiegoDe(p);
    const activos = sistemasActivos(p);
    const operable = parcelaOperable(p);
    const temperatura = Number(p.temperatura ?? 25);
    const hectareas = Math.max(0.1, Number(p.parcela.superficie_hectareas) || 1);

    if (!sueloPorParcela.has(id)) sueloPorParcela.set(id, Number(p.humedad_suelo ?? 50));
    if (!valvulaPorParcela.has(id)) valvulaPorParcela.set(id, p.valvula_estado === 'abierta');
    let humedad = sueloPorParcela.get(id)!;
    const conTuberia = activos.length > 0;
    let abierta = operable && conTuberia && valvulaPorParcela.get(id)!;

    // Automático con histéresis: abre bajo el mínimo y cierra al llegar al óptimo.
    // Si se espera lluvia, pospone el riego salvo que la parcela esté en nivel crítico.
    let pospuesto = false;
    if (mockModoGlobalRiego === 'automatico' && operable && conTuberia) {
      const minima = Number(p.cultivo!.humedad_minima);
      const cisternaSegura = Number(mockSimulationData.nivel_tanque) >= CISTERNA_NIVEL_CRITICO;
      pospuesto = llueve && humedad >= minima - 10;
      if (humedad < minima && cisternaSegura && !pospuesto) abierta = true;
      else if (humedad >= Number(p.cultivo!.humedad_optima) || !cisternaSegura || pospuesto) abierta = false;
    }

    // Con goteo y aspersión a la vez, los caudales se suman y cada uno aporta según su eficiencia.
    const caudalPorMetodo = activos.map((m) => ({ m, caudal: RIEGO_POR_METODO[m].caudalPorHa * hectareas, eficiencia: eficienciaRiego(m, temperatura, viento) }));
    const caudalTotal = caudalPorMetodo.reduce((total, c) => total + c.caudal, 0);
    const caudal = abierta ? caudalTotal : 0;
    const solicitados = caudal * minutos;
    const litros = Math.min(solicitados, cisternaLitros());
    if (abierta && litros < solicitados) abierta = false; // la cisterna se vació
    mockSimulationData.nivel_tanque = Math.max(0, mockSimulationData.nivel_tanque - (litros / CISTERNA_CAPACIDAD_L) * 100);
    litrosHoyPorParcela.set(id, (litrosHoyPorParcela.get(id) ?? 0) + litros);
    const eficiencia = caudalTotal > 0
      ? +(caudalPorMetodo.reduce((total, c) => total + c.caudal * c.eficiencia, 0) / caudalTotal).toFixed(2)
      : 0;
    const mojaFollaje = abierta && activos.includes('aspersion');

    const heatFactor = Math.max(0.65, temperatura / 28);
    humedad += (litros * eficiencia * HUMEDAD_POR_LITRO_EFECTIVO_HA) / hectareas;
    if (humedad > HUMEDAD_RESIDUAL_SUELO) {
      humedad = Math.max(HUMEDAD_RESIDUAL_SUELO, humedad - EVAPORACION_SUELO_POR_MIN * heatFactor * minutos);
    }
    humedad = Math.min(100, humedad);
    sueloPorParcela.set(id, humedad);
    valvulaPorParcela.set(id, abierta);

    return {
      ...p,
      humedad_suelo: +humedad.toFixed(1),
      humedad_ambiental: +Math.min(100, Number(p.humedad_ambiental ?? 60) + (mojaFollaje ? RIEGO_POR_METODO.aspersion.hrFollaje : 0)).toFixed(1),
      valvula_estado: (abierta ? 'abierta' : 'cerrada') as ParcelaDashboard['valvula_estado'],
      valvula_modo: mockModoGlobalRiego,
      metodo_riego: seleccion,
      sistemas_instalados: sistemasInstalados(p),
      sistemas_activos: activos,
      caudal_lpm: +caudal.toFixed(0),
      eficiencia_riego: eficiencia,
      litros_hoy: Math.round(litrosHoyPorParcela.get(id) ?? 0),
      riego_pospuesto_por_lluvia: pospuesto && humedad < Number(p.cultivo?.humedad_minima ?? 0),
      tuberia_pendiente: operable && !conTuberia,
    };
  });
  parcelasConocidas = parcelas;

  // Alerta de hongos por parcela; la aspersión moja el follaje y la provoca antes.
  const alertas = [...dashboard.alertas_activas];
  parcelas.forEach((p) => {
    if (!parcelaOperable(p) || Number(p.humedad_ambiental) < Number(p.cultivo!.hr_alerta_hongos)) return;
    if (alertas.some((a) => a.tipo === 'prevencion_organica' && a.parcela_id === p.parcela.id)) return;
    const porAspersion = Boolean(p.sistemas_activos?.includes('aspersion')) && p.valvula_estado === 'abierta';
    alertas.push({
      id: `alerta-hongos-${p.parcela.id}`,
      parcela_id: p.parcela.id,
      tipo: 'prevencion_organica',
      severidad: 'alta',
      titulo: `🍄 Riesgo de hongos en ${p.parcela.nombre}`,
      mensaje: `Humedad ambiental de ${Number(p.humedad_ambiental).toFixed(0)}% (umbral ${p.cultivo!.hr_alerta_hongos}%).${
        porAspersion ? ' La aspersión está mojando el follaje; considera cambiar a goteo.' : ''
      } Programa una fumigación con biopreparado.`,
      leida: false,
      activa: true,
      created_at: new Date().toISOString(),
    });
  });

  return {
    ...dashboard,
    parcelas,
    alertas_activas: alertas,
    estadisticas: {
      ...dashboard.estadisticas,
      valvulas_abiertas: parcelas.filter((p) => p.valvula_estado === 'abierta').length,
      litros_hoy: Math.round([...litrosHoyPorParcela.values()].reduce((total, litros) => total + litros, 0)),
    },
  };
}

/*
 * Motor del dron. Trabaja sobre las parcelas que realmente muestra el dashboard
 * (backend o simulador), así la parcela objetivo siempre existe con su id real.
 */
function sincronizarDron(dashboard: DashboardSummary): DashboardSummary {
  const now = Date.now();
  const minutos = Math.min(10, Math.max(0, (now - dronLastSyncAt) / 1000)) / 60;
  dronLastSyncAt = now;

  // Recarga: el agua sale de la cisterna litro por litro, sin pérdidas.
  if (mockDronState.llave_paso_recarga_abierta && mockDronState.en_posicion_recarga) {
    const espacioLibre = dronLitros(100) - dronLitros(mockDronState.nivel_agua_porcentaje);
    transferirCisternaADron(Math.min(DRON_RECARGA_LPM * minutos, espacioLibre, cisternaLitros()));
    if (mockDronState.nivel_agua_porcentaje >= 100 || cisternaLitros() <= 0) {
      mockDronState.llave_paso_recarga_abierta = false;
    }
  } else if (!mockDronState.en_posicion_recarga) {
    mockDronState.llave_paso_recarga_abierta = false;
  }

  const parcelas = dashboard.parcelas;

  // La infestación evoluciona según las condiciones de cada parcela.
  parcelas.filter(parcelaOperable).forEach((p) => {
    const actual = infestacionPorParcela.get(p.parcela.id) ?? infestacionInicial(p);
    infestacionPorParcela.set(p.parcela.id, evolucionarInfestacion(actual, p, minutos));
  });

  // Aspersión de la dosis (o recorrido de escaneo) sobre la parcela objetivo.
  if (mockDronState.mision_activa) {
    const objetivo = parcelas.find((p) => p.parcela.id === mockDronState.objetivo_parcela_id);
    const fumigando = mockDronState.tipo_mision === 'fumigacion';
    if (!objetivo) {
      regresarDronABase('La parcela objetivo ya no está disponible');
    } else if (mockDronState.tipo_mision === 'escaneo') {
      mockDronState.estado = 'escaneando';
      mockDronState.avance_porcentaje = Math.min(100, (mockDronState.avance_porcentaje ?? 0) + ((minutos * 60) / duracionEscaneoSeg(objetivo)) * 100);
      if (mockDronState.avance_porcentaje >= 100) {
        const escaneo: EscaneoPlaga = {
          ...clasificarEscaneo(objetivo, infestacionPorParcela.get(objetivo.parcela.id) ?? 0),
          id: `escaneo-${now}`,
          fecha: new Date(now).toISOString(),
        };
        escaneosPorParcela.set(objetivo.parcela.id, escaneo);
        void reportarEscaneo(escaneo);
        regresarDronABase(escaneo.plaga_detectada ? `Plaga detectada: ${escaneo.plaga}` : 'Escaneo limpio: sin plaga', escaneo);
      }
    } else {
      const restante = (mockDronState.litros_objetivo ?? 0) - (mockDronState.litros_aplicados ?? 0);
      let litros = Math.min((fumigando ? DRON_FUMIGACION_LPM : DRON_RIEGO_LPM) * minutos, restante, dronLitros(mockDronState.nivel_agua_porcentaje));
      if (fumigando) litros = Math.min(litros, biopreparadoLitros() / BIOPREPARADO_POR_LITRO);
      litros = Math.max(0, litros);

      mockDronState.nivel_agua_porcentaje = Math.max(0, mockDronState.nivel_agua_porcentaje - (litros / mockDronState.capacidad_litros) * 100);
      mockDronState.litros_aplicados = (mockDronState.litros_aplicados ?? 0) + litros;
      mockDronState.estado = fumigando ? 'fumigando' : 'regando';
      if (fumigando) {
        const bio = biopreparadoLitros() - litros * BIOPREPARADO_POR_LITRO;
        mockDronState.nivel_biopreparado_porcentaje = Math.max(0, (bio / mockDronState.capacidad_biopreparado_litros) * 100);
      } else {
        const suelo = sueloPorParcela.get(objetivo.parcela.id) ?? Number(objetivo.humedad_suelo);
        sueloPorParcela.set(objetivo.parcela.id, Math.min(100, suelo + litros * DRON_HUMEDAD_POR_LITRO));
      }

      if (mockDronState.litros_aplicados >= (mockDronState.litros_objetivo ?? 0) - 0.05) {
        regresarDronABase(fumigando ? 'Fumigación completada' : 'Riego completado');
      } else if (mockDronState.nivel_agua_porcentaje <= 0.01) {
        regresarDronABase('Tanque vacío: aplicación parcial');
      } else if (fumigando && mockDronState.nivel_biopreparado_porcentaje <= 0.01) {
        regresarDronABase('Biopreparado agotado: fumigación parcial');
      }
    }
  }

  const riesgoDe = (p: ParcelaDashboard) =>
    predecirRiesgoPlaga(p, { ultimaFumigacion: fumigacionesRecientes.get(p.parcela.id), ultimoEscaneo: escaneosPorParcela.get(p.parcela.id) }, now);
  const plagaSinTratar = (p: ParcelaDashboard) => {
    const escaneo = escaneosPorParcela.get(p.parcela.id);
    return Boolean(escaneo?.plaga_detectada) && (fumigacionesRecientes.get(p.parcela.id) ?? 0) < new Date(escaneo!.fecha).getTime();
  };

  // Modo automático: 1) riego de emergencia, 2) fumigar plagas confirmadas por escaneo,
  // 3) escanear la parcela con mayor riesgo estimado por la IA.
  if (mockModoGlobalRiego === 'automatico' && !mockDronState.mision_activa) {
    const conAgua = mockDronState.nivel_agua_porcentaje > DRON_NIVEL_MINIMO_DESPEGUE;
    const sedienta = parcelas
      .filter((p) => parcelaOperable(p) && Number(p.humedad_suelo) < Number(p.cultivo!.humedad_minima))
      .sort((a, b) => Number(a.humedad_suelo) - Number(b.humedad_suelo))[0];
    const conPlaga = parcelas.find((p) => parcelaOperable(p) && plagaSinTratar(p));
    const porEscanear = parcelas
      .filter((p) => {
        const escaneo = escaneosPorParcela.get(p.parcela.id);
        return parcelaOperable(p) && (!escaneo || now - new Date(escaneo.fecha).getTime() > ESCANEO_VIGENCIA_MS);
      })
      .map((p) => ({ p, riesgo: riesgoDe(p).probabilidad }))
      .filter(({ riesgo }) => riesgo >= RIESGO_ESCANEO_AUTO)
      .sort((a, b) => b.riesgo - a.riesgo)[0]?.p;

    if (sedienta && conAgua && mockDronState.requiere_riego_emergencia) {
      iniciarMisionDron(sedienta, 'riego');
    } else if (conPlaga && conAgua && mockDronState.nivel_biopreparado_porcentaje > 10) {
      iniciarMisionDron(conPlaga, 'fumigacion');
    } else if (porEscanear) {
      iniciarMisionDron(porEscanear, 'escaneo');
    }
  }

  // En automático el sistema recarga el dron acoplado mientras la cisterna no esté en nivel crítico.
  if (mockModoGlobalRiego === 'automatico' && !mockDronState.mision_activa && mockDronState.en_posicion_recarga && mockDronState.nivel_agua_porcentaje < 100) {
    mockDronState.llave_paso_recarga_abierta = Number(mockSimulationData.nivel_tanque) > CISTERNA_NIVEL_CRITICO;
  }

  // Refleja el agua que el dron acaba de aplicar y la evaluación de la IA de plagas.
  const parcelasActualizadas = parcelas.map((p) => {
    const suelo = sueloPorParcela.get(p.parcela.id);
    const conSuelo = suelo === undefined ? p : { ...p, humedad_suelo: +suelo.toFixed(1) };
    if (!parcelaOperable(p)) return conSuelo;
    return { ...conSuelo, riesgo_plaga: riesgoDe(conSuelo), ultimo_escaneo: escaneosPorParcela.get(p.parcela.id) };
  });

  // Una parcela recién fumigada ya no necesita la alerta de prevención orgánica.
  const alertas = dashboard.alertas_activas.filter(
    (a) => !(a.tipo === 'prevencion_organica' && a.parcela_id && now - (fumigacionesRecientes.get(a.parcela_id) ?? 0) < FUMIGACION_VIGENCIA_MS)
  );
  // Plagas confirmadas por el dron y aún sin fumigar (en modo demo; con backend llegan como alertas de la BD).
  parcelasActualizadas.forEach((p) => {
    const escaneo = escaneosPorParcela.get(p.parcela.id);
    if (!escaneo || !plagaSinTratar(p)) return;
    if (alertas.some((a) => a.tipo === 'plaga_detectada' && a.parcela_id === p.parcela.id)) return;
    alertas.push({
      id: `plaga-${p.parcela.id}`,
      parcela_id: p.parcela.id,
      tipo: 'plaga_detectada',
      severidad: escaneo.severidad ?? 'alta',
      titulo: `🐛 Plaga detectada en ${p.parcela.nombre}`,
      mensaje: `El escaneo del dron detectó ${escaneo.plaga} (confianza ${Math.round(escaneo.confianza * 100)}%). ${escaneo.recomendacion ?? ''}`,
      leida: false,
      activa: true,
      created_at: escaneo.fecha,
    });
  });
  if (mockDronState.nivel_biopreparado_porcentaje < 20) {
    alertas.push({
      id: 'alerta-dron-biopreparado',
      tipo: 'dron_emergencia',
      severidad: 'media',
      titulo: '🧪 Biopreparado del dron bajo',
      mensaje: `El cartucho de biopreparado está al ${mockDronState.nivel_biopreparado_porcentaje.toFixed(0)}%. Recárgalo en modo manual para habilitar la fumigación.`,
      leida: false,
      activa: true,
      created_at: new Date().toISOString(),
    });
  }

  return {
    ...dashboard,
    parcelas: parcelasActualizadas,
    alertas_activas: alertas,
    dron: { ...mockDronState },
    tanques: dashboard.tanques.map((tanque, index) =>
      index === 0 ? { ...tanque, nivel_actual_porcentaje: +Number(mockSimulationData.nivel_tanque).toFixed(2) } : tanque
    ),
  };
}

// Simulador físico de telemetría: cada consulta representa un payload del Arduino.
function updateSensorReadings(): DatosSimulacion {
  const now = Date.now();
  const elapsedSeconds = Math.min(10, Math.max(0, (now - simulatorState.lastUpdateAt) / 1000));
  simulatorState.lastUpdateAt = now;
  const elapsedMinutes = elapsedSeconds / 60;
  const temperature = 24 + 7 * Math.sin(((now / 3600000 - 6) / 24) * Math.PI * 2) + (Math.random() - 0.5) * 0.6;
  const heatFactor = Math.max(0.65, temperature / 28);
  const irrigated = (parcelId: string, key: keyof DatosSimulacion, rate: number, evaporation: number, min: number, max: number) => {
    const current = Number(mockSimulationData[key] ?? 50);
    const next = current + (simulatorState.valveByParcel[parcelId] ? rate : -evaporation * heatFactor) * elapsedMinutes;
    return +Math.max(min, Math.min(max, next)).toFixed(1);
  };

  mockSimulationData = {
    ...mockSimulationData,
    humedad_cana: irrigated('parcela-1', 'humedad_cana', 7.5, 1.4, 20, 95),
    humedad_tomate: irrigated('parcela-2', 'humedad_tomate', 9, 1.8, 15, 85),
    humedad_arroz: irrigated('parcela-3', 'humedad_arroz', 5, 0.8, 60, 100),
    humedad_descanso: irrigated('parcela-4', 'humedad_descanso', 0, 0.7, 10, 60),
    temperatura: +temperature.toFixed(1),
    humedad_ambiental: +Math.max(30, Math.min(95, 72 - (temperature - 24) * 1.5 + (Math.random() - 0.5) * 2)).toFixed(1),
    ph_tierra: +Math.max(5, Math.min(8.5, Number(mockSimulationData.ph_tierra ?? 6.8) + (Math.random() - 0.5) * 0.04)).toFixed(1),
  };

  mockSimulationData.valvula_cana = simulatorState.valveByParcel['parcela-1'];
  mockSimulationData.valvula_tomate = simulatorState.valveByParcel['parcela-2'];
  mockSimulationData.valvula_arroz = simulatorState.valveByParcel['parcela-3'];

  return mockSimulationData;
}

function generateMockDashboard(): DashboardSummary {
  const data = updateSensorReadings();
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

  const parcelas: ParcelaDashboard[] = [...baseParcelas, ...mockCustomParcels].map((item) => {
    const override = mockParcelOverrides.get(item.parcela.id);
    if (!override) return item;
    const cultivo = override.tiene_cultivo === false
      ? null
      : Object.values(CULTIVOS_MORELOS).find((crop) => crop.id === override.cultivo_id) ?? item.cultivo ?? null;
    return {
      ...item,
      parcela: {
        ...item.parcela,
        ...override,
        cultivo,
        cultivo_id: override.tiene_cultivo === false ? null : override.cultivo_id ?? item.parcela.cultivo_id,
      },
      tiene_cultivo: override.tiene_cultivo ?? item.tiene_cultivo,
      cultivo,
    };
  });

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

  if (Number(data.nivel_tanque ?? 100) < 20) {
    alertas.push({
      id: 'alerta-tanque',
      tipo: 'nivel_reserva',
      severidad: 'critica',
      titulo: '🚨 Nivel crítico de reserva de agua',
      mensaje: `El tanque está al ${Number(data.nivel_tanque ?? 0).toFixed(0)}%. Se han bloqueado los riegos automáticos no críticos. Necesidad de recarga inmediata.`,
      leida: false,
      activa: true,
      created_at: new Date().toISOString(),
    });
  }

  // Alerta de Dron de Emergencia si van >= 3 días sin lluvia
  const forecastDays = [1, 2, 3].map((offset) => {
    const date = new Date(Date.now() + offset * 86400000);
    return {
      dia: date.toLocaleDateString('es-MX', { weekday: 'short' }),
      fecha: date.toISOString().slice(0, 10),
      periodo: 'pronostico' as const,
      temp_min: 18 + offset,
      temp_max: 30 + offset,
      probabilidad_lluvia: offset === 2 ? 18 : 8,
      icono: '☀️',
    };
  });
  const historialDays = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(Date.now() - (5 - index) * 86400000);
    return {
      dia: date.toLocaleDateString('es-MX', { weekday: 'short' }),
      fecha: date.toISOString().slice(0, 10),
      periodo: 'historico' as const,
      temp_min: 17 + index,
      temp_max: 29 + index,
      probabilidad_lluvia: index === 1 ? 25 : 5,
      icono: index === 1 ? '🌦️' : '☀️',
    };
  });
  const rainExpected = forecastDays.some((day) => day.probabilidad_lluvia >= 35);
  const historicalRainDays = historialDays.filter((day) => day.probabilidad_lluvia >= 35).length;
  const daysWithoutRain = rainExpected ? 0 : Math.max(3, mockDronState.dias_sin_lluvia);
  mockDronState.dias_sin_lluvia = daysWithoutRain;
  mockDronState.requiere_riego_emergencia = daysWithoutRain >= 3;
  const nextWatering = new Date(Date.now() + (mockDronState.requiere_riego_emergencia ? 0 : 24) * 3600000);

  if (mockDronState.requiere_riego_emergencia) {
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

  return {
    parcelas,
    tanques: [
      {
        id: 'tanque-1',
        nombre: 'Cisterna Principal',
        tipo: 'cisterna',
        capacidad_litros: 50000,
        nivel_actual_porcentaje: +data.nivel_tanque.toFixed(2),
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
      pronostico_lluvia_3dias: rainExpected,
      dias_consecutivos_sin_lluvia: daysWithoutRain,
      probabilidad_lluvia: 5,
      temperatura_exterior: data.temperatura,
      temperatura_max: 33,
      temperatura_min: 19,
      condicion_texto: 'Despejado / Sequía temporal',
      humedad_relativa_exterior: data.humedad_ambiental,
      velocidad_viento: 12.5,
      pronostico_dias: [...historialDays, ...forecastDays],
      proximo_riego: nextWatering.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }),
      requiere_riego_emergencia: mockDronState.requiere_riego_emergencia,
      razon_riego_emergencia: mockDronState.requiere_riego_emergencia
        ? 'No se esperan lluvias suficientes durante los próximos 3 días.'
        : 'Se esperan precipitaciones; el riego de emergencia permanece detenido.',
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
    const liveDemoState = generateMockDashboard();
    let base: DashboardSummary = liveDemoState;
    if (backendUp) {
      const backendDashboard = await apiGet<DashboardSummary>('/dashboard/summary');
      base = {
        ...backendDashboard,
        modo_global_riego: mockModoGlobalRiego,
        clima: { ...backendDashboard.clima, ...liveDemoState.clima },
        tanques: backendDashboard.tanques?.length ? backendDashboard.tanques : liveDemoState.tanques,
      };
    }
    // El pronóstico real (Open-Meteo) manda sobre el simulado para regar, posponer y alertar.
    if (climaEnVivo) base = { ...base, clima: { ...base.clima, ...climaEnVivo } };

    const dashboard = sincronizarDron(simularRiegoParcelas(base));
    return { ...dashboard, alertas_activas: [...dashboard.alertas_activas, ...evaluarAlertasInteligentes(dashboard)] };
  },

  // La página consulta el clima en vivo y lo comparte con la simulación.
  setClimaEnVivo(clima: PronosticoClima | null): void {
    climaEnVivo = clima;
  },

  // Estado del reporte de un escaneo al backend (para no notificar dos veces).
  estadoReporteEscaneo(id: string): 'pendiente' | 'backend' | 'local' | undefined {
    return reporteEscaneo.get(id);
  },

  // Cultivos
  async getCultivos(): Promise<Cultivo[]> {
    const backendUp = await checkBackend();
    if (backendUp) {
      return apiGet<Cultivo[]>('/cultivos');
    }
    return Object.values(CULTIVOS_MORELOS);
  },

  // Parcelas
  async getParcelas(): Promise<Parcela[]> {
    const backendUp = await checkBackend();
    if (backendUp) {
      return apiGet<Parcela[]>('/parcelas');
    }
    const dashboard = generateMockDashboard();
    return dashboard.parcelas.map((p) => p.parcela);
  },

  // Crear Parcela
  async createParcela(dto: CreateParcelaDTO): Promise<ParcelaDashboard> {
    exigirTecnico();
    const backendUp = await checkBackend();
    // Si el backend rechaza el alta (permisos, validación) no se guarda localmente.
    const backendResult: { id?: string } | null = backendUp ? await apiPost('/parcelas', dto) : null;

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
      metodo_riego: dto.metodo_riego ?? null,
      instalaciones_riego: dto.instalaciones_riego ?? null,
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

  async updateParcela(id: string, dto: UpdateParcelaDTO): Promise<Parcela> {
    if (!esTecnico()) {
      const restringidos = Object.keys(dto).filter((campo) => !CAMPOS_PRODUCTOR.has(campo));
      if (restringidos.length) throw new Error(`Solo el técnico puede cambiar: ${restringidos.join(', ')}.`);
    }
    const backendUp = await checkBackend();
    if (backendUp) {
      return apiPut<Parcela>(`/parcelas/${id}`, dto);
    }

    mockParcelOverrides.set(id, { ...mockParcelOverrides.get(id), ...dto });
    const dashboardItem = generateMockDashboard().parcelas.find((item) => item.parcela.id === id);
    if (!dashboardItem) throw new Error('No se encontró la parcela seleccionada.');
    return dashboardItem.parcela;
  },

  // Válvulas
  async toggleValvula(parcelaId: string): Promise<Valvula> {
    if (mockModoGlobalRiego === 'automatico') {
      throw new Error('El modo automático controla las válvulas según sensores y clima. Cambia a modo manual para modificarlas.');
    }
    const parcela = parcelasConocidas.find((p) => p.parcela.id === parcelaId);
    if (parcela && !parcelaOperable(parcela)) {
      throw new Error('Solo se riegan parcelas activas con cultivo.');
    }
    if (parcela && !tuberiaInstalada(parcela)) {
      throw new Error('El sistema de riego seleccionado aún no está instalado en esta parcela. Elige otro o pide al técnico la instalación.');
    }
    const nextState = !valvulaPorParcela.get(parcelaId);
    valvulaPorParcela.set(parcelaId, nextState);

    // El simulador manda sobre el flujo; el backend solo registra el estado de la electroválvula.
    const backendUp = await checkBackend();
    if (backendUp) {
      try {
        const valves = await apiGet<Valvula[]>('/valves');
        const valve = valves.find((item) => item.parcela_id === parcelaId || item.id === parcelaId);
        if (valve) {
          await apiPost<Valvula>(`/valves/${valve.id}/toggle`, { estado: nextState ? 'abierta' : 'cerrada' });
        }
      } catch (err) {
        console.warn('No se pudo registrar la válvula en el backend:', err);
      }
    }
    return {
      id: parcelaId,
      parcela_id: parcelaId,
      tanque_id: 'tanque-1',
      nombre: `Válvula ${parcela?.parcela.nombre ?? parcelaId}`,
      posicion_x: 0,
      posicion_y: 0,
      posicion_z: 0,
      estado: nextState ? 'abierta' : 'cerrada',
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
    if (mockModoGlobalRiego === 'manual') {
      if (mockDronState.mision_activa) regresarDronABase('Interrumpida al cambiar a modo manual');
      mockDronState.llave_paso_recarga_abierta = false;
    }
    return mockModoGlobalRiego;
  },

  getModoGlobalRiego(): 'automatico' | 'manual' {
    return mockModoGlobalRiego;
  },

  activarRiegoManualTodo(): void {
    this.regarTodoManual();
  },

  regarTodoManual(): void {
    if (mockModoGlobalRiego === 'automatico') return;
    parcelasConocidas.filter((p) => parcelaOperable(p) && tuberiaInstalada(p)).forEach((p) => valvulaPorParcela.set(p.parcela.id, true));
  },

  rellenarTanque(nivel: number = 100): void {
    if (mockModoGlobalRiego === 'automatico') return;
    mockSimulationData.nivel_tanque = nivel;
  },

  detenerRiegoTodo(): void {
    if (mockModoGlobalRiego === 'automatico') return;
    parcelasConocidas.forEach((p) => valvulaPorParcela.set(p.parcela.id, false));
  },

  // ---- Control del Sistema de Dron de Riego de Emergencia ----
  getDronState(): DronRiego {
    return { ...mockDronState };
  },

  // Sensor de presencia de objeto en la estación de recarga
  toggleDronPresencia(): boolean {
    if (mockDronState.mision_activa) return mockDronState.en_posicion_recarga;
    if (mockModoGlobalRiego === 'automatico') return mockDronState.en_posicion_recarga;
    mockDronState.en_posicion_recarga = !mockDronState.en_posicion_recarga;
    // Si se retira el dron de la base, se cierra la llave de paso por seguridad
    if (!mockDronState.en_posicion_recarga) {
      mockDronState.llave_paso_recarga_abierta = false;
    }
    return mockDronState.en_posicion_recarga;
  },

  // Llave de paso: solo se puede abrir si el sensor detecta objeto en posición
  toggleDronLlavePaso(): { success: boolean; message: string; abierta: boolean } {
    if (mockModoGlobalRiego === 'automatico') {
      return { success: false, message: 'Cambia a modo manual para modificar la recarga del dron.', abierta: mockDronState.llave_paso_recarga_abierta };
    }
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

  // Dosis que el dron aplicaría sobre una parcela (para vista previa en el panel).
  calcularDosisDron(parcela: ParcelaDashboard, tipo: TipoMisionDron): number {
    return calcularDosisDron(parcela, tipo);
  },

  // Despacho manual de una misión de riego o fumigación sobre una parcela concreta.
  despacharDron(parcela: ParcelaDashboard | undefined, tipo: TipoMisionDron): { success: boolean; message: string } {
    if (mockModoGlobalRiego === 'automatico') {
      return { success: false, message: 'El modo automático decide las misiones del dron. Cambia a modo manual para despacharlo.' };
    }
    if (mockDronState.mision_activa) {
      return { success: false, message: 'El dron ya está en misión. Detenlo antes de asignar otra.' };
    }
    if (!parcela) {
      return { success: false, message: 'Selecciona una parcela específica para evitar que el dron aplique en zonas no indicadas.' };
    }
    if (!parcelaOperable(parcela)) {
      return { success: false, message: 'La parcela debe estar activa y tener cultivo para una misión del dron.' };
    }
    if (tipo === 'escaneo') {
      iniciarMisionDron(parcela, 'escaneo');
      return {
        success: true,
        message: `Escaneo de plagas iniciado sobre ${parcela.parcela.nombre} (~${Math.round(duracionEscaneoSeg(parcela))} s).`,
      };
    }
    if (mockDronState.nivel_agua_porcentaje <= DRON_NIVEL_MINIMO_DESPEGUE) {
      return { success: false, message: `No es posible despegar: el tanque del dron está bajo ${DRON_NIVEL_MINIMO_DESPEGUE}%. Realiza la recarga.` };
    }
    if (tipo === 'riego' && Number(parcela.humedad_suelo) >= Number(parcela.cultivo!.humedad_maxima)) {
      return { success: false, message: `El suelo de ${parcela.parcela.nombre} está saturado; regar desperdiciaría agua.` };
    }
    if (tipo === 'fumigacion' && mockDronState.nivel_biopreparado_porcentaje <= 10) {
      return { success: false, message: 'Cartucho de biopreparado vacío. Recárgalo antes de fumigar.' };
    }
    iniciarMisionDron(parcela, tipo);
    const dosis = mockDronState.litros_objetivo ?? 0;
    const disponible = dronLitros(mockDronState.nivel_agua_porcentaje);
    const aviso = dosis > disponible ? ` El tanque solo tiene ${disponible.toFixed(1)} L: la aplicación será parcial.` : '';
    return {
      success: true,
      message: `${tipo === 'fumigacion' ? 'Fumigación' : 'Riego'} iniciado sobre ${parcela.parcela.nombre}: ${dosis.toFixed(1)} L.${aviso}`,
    };
  },

  detenerDronEmergencia(): { success: boolean; message: string } {
    if (mockModoGlobalRiego === 'automatico') {
      return { success: false, message: 'El modo automático controla el dron. Cambia a modo manual para detenerlo.' };
    }
    regresarDronABase('Detenida por el operador');
    return { success: true, message: 'El dron detuvo la aplicación y regresó a la base.' };
  },

  // Llenado manual del dron: el agua se toma de la cisterna.
  llenarDronManual(): { success: boolean; message: string } {
    if (mockModoGlobalRiego === 'automatico') {
      return { success: false, message: 'Cambia a modo manual para llenar el tanque del dron.' };
    }
    if (!mockDronState.en_posicion_recarga || mockDronState.mision_activa) {
      return { success: false, message: 'El dron debe estar acoplado en la base para llenarse.' };
    }
    const faltante = dronLitros(100) - dronLitros(mockDronState.nivel_agua_porcentaje);
    const litros = Math.min(faltante, cisternaLitros());
    if (litros <= 0) {
      return {
        success: faltante <= 0,
        message: faltante <= 0 ? 'El tanque del dron ya está lleno.' : 'La cisterna está vacía: no hay agua para el dron.',
      };
    }
    transferirCisternaADron(litros);
    return {
      success: true,
      message: `Se transfirieron ${litros.toFixed(1)} L de la cisterna al dron (${mockDronState.nivel_agua_porcentaje.toFixed(0)}%).`,
    };
  },

  // Recarga del cartucho de biopreparado orgánico para fumigación.
  recargarBiopreparado(): { success: boolean; message: string } {
    if (mockModoGlobalRiego === 'automatico') {
      return { success: false, message: 'Cambia a modo manual para recargar el biopreparado.' };
    }
    if (!mockDronState.en_posicion_recarga || mockDronState.mision_activa) {
      return { success: false, message: 'El dron debe estar acoplado en la base para recargar el biopreparado.' };
    }
    mockDronState.nivel_biopreparado_porcentaje = 100;
    return { success: true, message: `Cartucho de biopreparado recargado (${mockDronState.capacidad_biopreparado_litros} L).` };
  },
};
