// =============================================================================
// IA de plagas
// 1. Modelo predictivo: estima la probabilidad de plaga con los sensores y el
//    historial de la parcela (regresión logística con factores explicables).
// 2. Clasificador del dron: al escanear la parcela decide si hay plaga (booleano)
//    con un nivel de confianza. En la demo la "imagen" se simula con un nivel de
//    infestación oculto que evoluciona según las condiciones del cultivo.
// =============================================================================

import { Cultivo, EscaneoPlaga, ParcelaDashboard, RiesgoPlaga, Severidad } from '@/types';

interface PerfilPlagas {
  susceptibilidad: number; // 0-1
  hongo: string;
  insecto: string;
}

// Plagas más comunes de cada cultivo en Morelos.
const PERFILES: { clave: string; perfil: PerfilPlagas }[] = [
  { clave: 'tomate', perfil: { susceptibilidad: 0.9, hongo: 'Tizón tardío (Phytophthora infestans)', insecto: 'Mosca blanca (Bemisia tabaci)' } },
  { clave: 'maíz', perfil: { susceptibilidad: 0.7, hongo: 'Tizón foliar (Exserohilum turcicum)', insecto: 'Gusano cogollero (Spodoptera frugiperda)' } },
  { clave: 'arroz', perfil: { susceptibilidad: 0.6, hongo: 'Piricularia (Pyricularia oryzae)', insecto: 'Chinche café del arroz' } },
  { clave: 'aguacate', perfil: { susceptibilidad: 0.6, hongo: 'Tristeza del aguacate (Phytophthora cinnamomi)', insecto: 'Trips del aguacate' } },
  { clave: 'caña', perfil: { susceptibilidad: 0.5, hongo: 'Roya café (Puccinia melanocephala)', insecto: 'Barrenador del tallo (Diatraea saccharalis)' } },
  { clave: 'sorgo', perfil: { susceptibilidad: 0.5, hongo: 'Antracnosis (Colletotrichum sublineola)', insecto: 'Pulgón amarillo (Melanaphis sacchari)' } },
  { clave: 'nopal', perfil: { susceptibilidad: 0.4, hongo: 'Pudrición blanda', insecto: 'Cochinilla del nopal' } },
];

const PERFIL_GENERICO: PerfilPlagas = { susceptibilidad: 0.5, hongo: 'Hongo foliar', insecto: 'Insecto chupador' };

export const UMBRAL_DETECCION = 0.35; // infestación a partir de la cual la cámara la distingue
const FUMIGACION_PROTECCION_MS = 12 * 3600000;

export function perfilPlagas(cultivo?: Cultivo | null): PerfilPlagas {
  const nombre = (cultivo?.nombre ?? '').toLowerCase();
  return PERFILES.find((p) => nombre.includes(p.clave))?.perfil ?? PERFIL_GENERICO;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export interface ContextoPlaga {
  ultimaFumigacion?: number; // timestamp
  ultimoEscaneo?: EscaneoPlaga;
}

// Variables ambientales que favorecen plagas (0-1 cada una).
function condiciones(p: ParcelaDashboard) {
  const hr = Number(p.humedad_ambiental ?? 60);
  const umbralHongos = Number(p.cultivo?.hr_alerta_hongos ?? 80);
  const temperatura = Number(p.temperatura ?? 25);
  return {
    humedadAire: clamp01((hr - (umbralHongos - 15)) / 15),
    temperatura: clamp01(1 - Math.abs(temperatura - 25) / 10),
    follajeMojado: (p.sistemas_activos?.includes('aspersion_presurizada') || p.sistemas_activos?.includes('microaspersion')) && p.valvula_estado === 'abierta' ? 1 : 0,
    sueloSaturado: p.cultivo && Number(p.humedad_suelo) > Number(p.cultivo.humedad_maxima) ? 1 : 0,
    calor: temperatura > 27,
  };
}

// Modelo predictivo de riesgo (antes de escanear).
export function predecirRiesgoPlaga(p: ParcelaDashboard, ctx: ContextoPlaga, now = Date.now()): RiesgoPlaga {
  const perfil = perfilPlagas(p.cultivo);
  const c = condiciones(p);
  const fumigadaReciente = ctx.ultimaFumigacion != null && now - ctx.ultimaFumigacion < FUMIGACION_PROTECCION_MS;
  const diasSinFumigar = ctx.ultimaFumigacion ? (now - ctx.ultimaFumigacion) / 86400000 : 7;
  const positivoSinTratar =
    ctx.ultimoEscaneo?.plaga_detectada && (!ctx.ultimaFumigacion || ctx.ultimaFumigacion < new Date(ctx.ultimoEscaneo.fecha).getTime());

  const logit =
    -3.2 +
    2.2 * c.humedadAire +
    1.0 * c.temperatura +
    0.9 * c.follajeMojado +
    0.6 * c.sueloSaturado +
    0.8 * clamp01(diasSinFumigar / 7) +
    1.5 * perfil.susceptibilidad +
    (positivoSinTratar ? 2 : 0) -
    (fumigadaReciente ? 2 : 0);
  const probabilidad = +sigmoid(logit).toFixed(2);

  const factores: string[] = [];
  if (positivoSinTratar) factores.push('Plaga confirmada sin tratar');
  if (c.humedadAire >= 0.5) factores.push(`Humedad del aire alta (${Number(p.humedad_ambiental).toFixed(0)}%)`);
  if (c.follajeMojado) factores.push('Aspersión mojando el follaje');
  if (c.sueloSaturado) factores.push('Suelo saturado');
  if (c.temperatura >= 0.7) factores.push(`Temperatura favorable (${Number(p.temperatura).toFixed(0)} °C)`);
  if (fumigadaReciente) factores.push('Fumigada recientemente');
  else if (diasSinFumigar >= 7) factores.push('Sin fumigación reciente');
  if (perfil.susceptibilidad >= 0.7) factores.push('Cultivo muy susceptible');

  return {
    probabilidad,
    nivel: probabilidad >= 0.7 ? 'alto' : probabilidad >= 0.4 ? 'moderado' : 'bajo',
    factores,
    plaga_probable: plagaProbable(p),
  };
}

function plagaProbable(p: ParcelaDashboard): string {
  const perfil = perfilPlagas(p.cultivo);
  const c = condiciones(p);
  return c.humedadAire >= 0.5 || c.follajeMojado || !c.calor ? perfil.hongo : perfil.insecto;
}

// Nivel de infestación con el que arranca cada parcela en la demo.
export function infestacionInicial(p: ParcelaDashboard): number {
  return +(perfilPlagas(p.cultivo).susceptibilidad * 0.5).toFixed(2);
}

// La infestación crece con condiciones favorables y retrocede lentamente sin ellas.
export function evolucionarInfestacion(actual: number, p: ParcelaDashboard, minutos: number): number {
  const c = condiciones(p);
  const favorabilidad = 0.45 * c.humedadAire + 0.25 * c.temperatura + 0.2 * c.follajeMojado + 0.1 * c.sueloSaturado;
  return clamp01(actual + 0.02 * (favorabilidad - 0.35) * minutos);
}

// Una fumigación elimina hasta 85% de la infestación según la superficie cubierta.
export function aplicarFumigacion(actual: number, cobertura: number): number {
  return clamp01(actual * (1 - 0.85 * clamp01(cobertura)));
}

// Clasificador de visión del dron: devuelve el booleano de plaga con su confianza.
export function clasificarEscaneo(p: ParcelaDashboard, infestacion: number): Omit<EscaneoPlaga, 'id' | 'fecha'> {
  const plaga_detectada = infestacion >= UMBRAL_DETECCION;
  const confianza = +(0.6 + 0.38 * clamp01(Math.abs(infestacion - UMBRAL_DETECCION) / 0.3)).toFixed(2);
  const severidad: Severidad = infestacion >= 0.7 ? 'critica' : infestacion >= 0.5 ? 'alta' : 'media';
  const plaga = plagaProbable(p);
  return {
    parcela_id: p.parcela.id,
    parcela_nombre: p.parcela.nombre,
    plaga_detectada,
    confianza,
    plaga: plaga_detectada ? plaga : undefined,
    severidad: plaga_detectada ? severidad : 'baja',
    recomendacion: plaga_detectada
      ? `Fumigar con biopreparado orgánico${(p.sistemas_activos?.includes('aspersion_presurizada') || p.sistemas_activos?.includes('microaspersion')) ? ' y cambiar a riego por goteo para mantener seco el follaje' : ''}.`
      : 'Sin acción necesaria. Repetir el escaneo si sube la humedad ambiental.',
  };
}
