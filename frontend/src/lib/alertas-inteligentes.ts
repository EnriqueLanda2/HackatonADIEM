// =============================================================================
// Alertas inteligentes: evalúan el estado completo del sembradío (cisterna, dron,
// suelo, clima y riesgo de plagas) y generan las alertas que también se envían
// como push notifications. Cada alerta tiene un id estable por condición para
// que la misma situación no se notifique dos veces.
// =============================================================================

import { Alerta, DashboardSummary, PronosticoClima, Severidad, TipoAlerta } from '@/types';

export const CISTERNA_NIVEL_BAJO = 35;
export const CISTERNA_NIVEL_CRITICO = 20;
export const PROBABILIDAD_LLUVIA_ALTA = 60;
const RIESGO_PLAGA_ALERTA = 0.7;
const ESCANEO_RECIENTE_MS = 6 * 3600000;

// Lluvia esperada en las próximas horas: conviene no regar.
export function lluviaProxima(clima?: Partial<PronosticoClima> | null): boolean {
  if (!clima) return false;
  return Boolean(clima.pronostico_lluvia_12h) || Number(clima.probabilidad_lluvia ?? 0) >= PROBABILIDAD_LLUVIA_ALTA;
}

export function sequiaProbable(clima?: Partial<PronosticoClima> | null): boolean {
  if (!clima) return false;
  return Number(clima.dias_consecutivos_sin_lluvia ?? 0) >= 3 && !clima.pronostico_lluvia_3dias && !lluviaProxima(clima);
}

const alerta = (id: string, tipo: TipoAlerta, severidad: Severidad, titulo: string, mensaje: string, parcela_id?: string): Alerta => ({
  id,
  tipo,
  severidad,
  titulo,
  mensaje,
  parcela_id,
  leida: false,
  activa: true,
  created_at: new Date().toISOString(),
});

export function evaluarAlertasInteligentes(dashboard: DashboardSummary): Alerta[] {
  const nuevas: Alerta[] = [];
  const existentes = dashboard.alertas_activas;
  const yaExiste = (tipo: TipoAlerta, parcelaId?: string) =>
    existentes.some((a) => a.tipo === tipo && (parcelaId === undefined || a.parcela_id === parcelaId));
  const manual = dashboard.modo_global_riego === 'manual';
  const clima = dashboard.clima;

  // Agua: cisterna y tanque del dron
  const cisterna = Number(dashboard.tanques[0]?.nivel_actual_porcentaje ?? 100);
  if (cisterna < CISTERNA_NIVEL_CRITICO && !yaExiste('nivel_reserva')) {
    nuevas.push(alerta('ia-cisterna-critica', 'nivel_reserva', 'critica', '🚨 Cisterna en nivel crítico',
      `La cisterna está al ${cisterna.toFixed(0)}%. El riego automático se suspendió; recárgala lo antes posible.`));
  } else if (cisterna >= CISTERNA_NIVEL_CRITICO && cisterna < CISTERNA_NIVEL_BAJO) {
    nuevas.push(alerta('ia-cisterna-baja', 'nivel_reserva', 'media', '🚰 Nivel de agua bajo',
      `La cisterna está al ${cisterna.toFixed(0)}%. Planea la recarga antes de llegar al ${CISTERNA_NIVEL_CRITICO}%.`));
  }
  const dron = dashboard.dron;
  if (dron && Number(dron.nivel_agua_porcentaje) <= 15 && !dron.mision_activa && !yaExiste('dron_vacio')) {
    nuevas.push(alerta('ia-dron-agua', 'dron_vacio', 'media', '🚁 Tanque del dron casi vacío',
      `El dron tiene ${Number(dron.nivel_agua_porcentaje).toFixed(0)}% de agua y no puede despegar. Acóplalo en la base para recargar.`));
  }

  // Parcelas en riesgo hídrico
  dashboard.parcelas.forEach((p) => {
    if (!p.parcela.activa || !p.tiene_cultivo || !p.cultivo) return;
    const humedad = Number(p.humedad_suelo);
    const minima = Number(p.cultivo.humedad_minima);
    if (humedad < minima && !yaExiste('humedad_critica', p.parcela.id)) {
      nuevas.push(alerta(`ia-humedad-${p.parcela.id}`, 'humedad_critica', humedad < minima - 10 ? 'critica' : 'alta',
        `⚠️ ${p.parcela.nombre} en riesgo`,
        `Humedad del suelo de ${humedad.toFixed(0)}% (mínimo ${minima}% para ${p.cultivo.nombre}).${
          p.riego_pospuesto_por_lluvia ? ' El riego se pospuso porque se espera lluvia.' : ''
        }`, p.parcela.id));
    }

    // Riesgo de plaga estimado por la IA, si no hay un escaneo reciente
    const riesgo = p.riesgo_plaga;
    const escaneoReciente = p.ultimo_escaneo && Date.now() - new Date(p.ultimo_escaneo.fecha).getTime() < ESCANEO_RECIENTE_MS;
    if (riesgo && riesgo.probabilidad >= RIESGO_PLAGA_ALERTA && !escaneoReciente && !yaExiste('plaga_detectada', p.parcela.id)) {
      nuevas.push(alerta(`ia-riesgo-plaga-${p.parcela.id}`, 'riesgo_plaga', 'media',
        `🤖 Riesgo de plaga ${Math.round(riesgo.probabilidad * 100)}% en ${p.parcela.nombre}`,
        `La IA estima riesgo alto de ${riesgo.plaga_probable}: ${riesgo.factores.slice(0, 2).join(', ').toLowerCase()}. Escanea la parcela con el dron para confirmarlo.`,
        p.parcela.id));
    }
  });

  // Clima: sequía y lluvia próxima
  if (sequiaProbable(clima)) {
    nuevas.push(alerta('ia-sequia', 'sequia', 'alta', '☀️ Sequía probable',
      `${clima.dias_consecutivos_sin_lluvia} días sin lluvia y no se esperan precipitaciones en 3 días. Revisa la reserva de agua y prioriza las parcelas más secas.`));
  }
  if (lluviaProxima(clima)) {
    const abiertas = dashboard.parcelas.filter((p) => p.valvula_estado === 'abierta').length;
    const probabilidad = Number(clima.probabilidad_lluvia ?? 0).toFixed(0);
    nuevas.push(
      manual
        ? alerta('ia-lluvia-manual', 'lluvia_proxima', 'alta', '🌧️ Lluvia próxima: no riegues',
            `${probabilidad}% de probabilidad de lluvia en las próximas horas. Estás en riego manual${
              abiertas === 1 ? ' con 1 válvula abierta: ciérrala' : abiertas > 1 ? ` con ${abiertas} válvulas abiertas: ciérralas` : ': evita regar'
            } para no desperdiciar agua.`)
        : alerta('ia-lluvia-auto', 'lluvia_proxima', 'baja', '🌧️ Lluvia próxima',
            `${probabilidad}% de probabilidad de lluvia. El riego automático pospondrá las parcelas que no estén en nivel crítico.`)
    );
  }

  return nuevas;
}
