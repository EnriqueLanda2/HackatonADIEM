'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { activarNotificaciones, enviarPrueba, EstadoNotificaciones, estadoNotificaciones, notificar } from '@/lib/push';
import { DashboardSummary, Severidad } from '@/types';

const SEVERIDAD_MINIMA: Severidad[] = ['media', 'alta', 'critica'];
// El backend ya envía la push de los escaneos que el dron le reporta.
const TIPOS_DEL_ESCANEO = new Set(['plaga_detectada', 'escaneo_limpio']);

/*
 * Convierte en notificaciones:
 * - las alertas nuevas (agua baja, riesgo, sequía, lluvia próxima, riesgo de plaga…);
 * - el resultado de cada escaneo del dron (plaga sí/no).
 * Solo avisa cuando una condición aparece; si desaparece y vuelve, avisa otra vez.
 */
export function useNotificaciones(data: DashboardSummary | null) {
  const [estado, setEstado] = useState<EstadoNotificaciones>('inactivo');
  const vistas = useRef<Set<string> | null>(null);
  const escaneosVistos = useRef<Set<string>>(new Set());

  useEffect(() => {
    estadoNotificaciones().then(setEstado);
  }, []);

  useEffect(() => {
    if (!data) return;
    const activas = data.alertas_activas.filter(
      (a) => !TIPOS_DEL_ESCANEO.has(a.tipo) && (SEVERIDAD_MINIMA.includes(a.severidad) || a.tipo === 'lluvia_proxima')
    );
    const ids = new Set(activas.map((a) => a.id));

    // En la primera carga las alertas existentes ya se ven en pantalla: no se notifican.
    if (vistas.current === null) {
      vistas.current = ids;
    } else if (estado !== 'inactivo' && estado !== 'bloqueado' && estado !== 'no_soportado') {
      activas
        .filter((a) => !vistas.current!.has(a.id))
        .forEach((a) =>
          void notificar({ clave: a.id, titulo: a.titulo, mensaje: a.mensaje, tipo: a.tipo, severidad: a.severidad, parcela_id: a.parcela_id }, estado)
        );
      vistas.current = ids;
    } else {
      vistas.current = ids;
    }

    // Resultado del escaneo del dron: si el backend no lo pudo notificar, se avisa localmente.
    const escaneo = data.dron?.ultima_mision?.escaneo;
    if (escaneo && !escaneosVistos.current.has(escaneo.id)) {
      const reporte = api.estadoReporteEscaneo(escaneo.id);
      if (reporte === 'backend') {
        escaneosVistos.current.add(escaneo.id);
      } else if (reporte === 'local' || reporte === undefined) {
        escaneosVistos.current.add(escaneo.id);
        if (estado !== 'inactivo' && estado !== 'bloqueado' && estado !== 'no_soportado') {
          void notificar(
            {
              clave: `escaneo-${escaneo.id}`,
              titulo: escaneo.plaga_detectada ? `🐛 Plaga detectada en ${escaneo.parcela_nombre}` : `✅ Sin plaga en ${escaneo.parcela_nombre}`,
              mensaje: escaneo.plaga_detectada
                ? `${escaneo.plaga} (confianza ${Math.round(escaneo.confianza * 100)}%). ${escaneo.recomendacion ?? ''}`
                : `El escaneo no detectó plagas (confianza ${Math.round(escaneo.confianza * 100)}%).`,
              tipo: escaneo.plaga_detectada ? 'plaga_detectada' : 'escaneo_limpio',
              severidad: escaneo.plaga_detectada ? escaneo.severidad ?? 'alta' : 'baja',
              parcela_id: escaneo.parcela_id,
              cooldown_min: 0,
            },
            estado
          );
        }
      }
      // 'pendiente': se revisa en el siguiente ciclo del dashboard
    }
  }, [data, estado]);

  const activar = useCallback(async () => {
    const nuevo = await activarNotificaciones();
    setEstado(nuevo);
    if (nuevo === 'push' || nuevo === 'local') await enviarPrueba(nuevo);
    return nuevo;
  }, []);

  const probar = useCallback(() => enviarPrueba(estado), [estado]);

  return { estado, activar, probar };
}
