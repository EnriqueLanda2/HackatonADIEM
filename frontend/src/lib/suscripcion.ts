// =============================================================================
// Suscripciones: Básico (sin dron) y Pro (con dron).
// El plan se guarda por usuario en el navegador.
// =============================================================================

export type PlanId = 'basico' | 'pro';

export interface PlanInfo {
  id: PlanId;
  nombre: string;
  precioMensual: number | null; // null: sin costo, incluido en la instalación de tuberías
  descripcion: string;
  incluyeDron: boolean;
  beneficios: string[];
  excluye: string[];
}

export const PLANES: Record<PlanId, PlanInfo> = {
  basico: {
    id: 'basico',
    nombre: 'Básico',
    precioMensual: null,
    descripcion: 'Monitoreo y riego automático de tus parcelas.',
    incluyeDron: false,
    beneficios: ['Sensores y telemetría en vivo', 'Riego automático y manual', 'Alertas y notificaciones', 'Modelado 3D de parcelas'],
    excluye: ['Dron de riego de emergencia', 'Fumigación y escaneo IA de plagas'],
  },
  pro: {
    id: 'pro',
    nombre: 'Pro',
    precioMensual: 799,
    descripcion: 'Todo lo del Básico más el dron agrícola.',
    incluyeDron: true,
    beneficios: ['Todo lo del plan Básico', 'Dron de riego de emergencia', 'Fumigación con dron', 'Escaneo IA de plagas', 'Estación de carga del dron'],
    excluye: [],
  },
};

export const planDeSesion = (plan?: PlanId): PlanId => (plan === 'pro' ? 'pro' : 'basico');

const TIPOS_PLAGA = new Set(['plaga_detectada', 'riesgo_plaga', 'escaneo_limpio']);

// Las alertas y avisos de plagas (IA y escaneo del dron) son exclusivos del plan Pro.
export function sinPlagas<T extends { alertas_activas: { tipo: string; leida?: boolean }[]; estadisticas: { alertas_sin_leer: number }; dron?: unknown }>(data: T): T {
  const alertas = data.alertas_activas.filter((a) => !TIPOS_PLAGA.has(a.tipo));
  return {
    ...data,
    alertas_activas: alertas,
    estadisticas: { ...data.estadisticas, alertas_sin_leer: alertas.filter((a) => !a.leida).length },
    dron: data.dron ? { ...(data.dron as object), ultima_mision: undefined } : data.dron,
  };
}
