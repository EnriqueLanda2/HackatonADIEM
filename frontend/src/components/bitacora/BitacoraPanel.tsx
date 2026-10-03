'use client';

import React, { useEffect, useState } from 'react';
import { listarBitacora } from '@/lib/bitacora';

export default function BitacoraPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');

  useEffect(() => {
    let mounted = true;
    const fetchLogs = async () => {
      const data = await listarBitacora();
      if (mounted) {
        setLogs(data);
        setLoading(false);
      }
    };
    fetchLogs();
    const timer = setInterval(fetchLogs, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const logsFiltrados = logs.filter(
    (log) => filtroCategoria === 'todas' || log.categoria === filtroCategoria
  );

  const categoriasUnicas = Array.from(new Set(logs.map((log) => log.categoria))).filter(Boolean);

  if (loading) {
    return <div className="p-6 text-center text-flax/70 animate-pulse">Cargando bitácora de procesos...</div>;
  }

  return (
    <div className="bg-card/70 border border-applegreen/20 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-creme flex items-center gap-2">
            <span>📋</span> Bitácora de Auditoría
          </h2>
          <p className="text-xs text-flax/70 mt-1">Registro de procesos, control de riego y manipulación de parcelas</p>
        </div>
        
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="bg-ink border border-applegreen/40 text-creme text-sm rounded-xl focus:ring-applegreen focus:border-applegreen p-2.5 outline-none cursor-pointer"
        >
          <option value="todas">Todas las acciones</option>
          <option value="riego">💧 Riego</option>
          <option value="parcela">🌱 Parcelas</option>
          <option value="instalacion">🛠️ Instalaciones</option>
          <option value="dron">🚁 Dron</option>
          {categoriasUnicas
            .filter((c) => !['riego', 'parcela', 'instalacion', 'dron'].includes(c))
            .map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
        </select>
      </div>

      {logsFiltrados.length === 0 ? (
        <div className="text-center text-flax/60 py-10 bg-ink/40 rounded-xl border border-dashed border-applegreen/20">
          No hay registros para la categoría seleccionada.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-applegreen/20 bg-ink/50">
          <table className="w-full text-sm text-left text-creme">
            <thead className="text-xs text-flax/80 uppercase bg-card border-b border-applegreen/20">
              <tr>
                <th className="px-4 py-3 font-semibold">Fecha y Hora</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold">Acción Realizada</th>
                <th className="px-4 py-3 font-semibold">Usuario / IP</th>
                <th className="px-4 py-3 font-semibold">Dispositivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-applegreen/10">
              {logsFiltrados.map((log) => (
                <tr key={log.id} className="hover:bg-card/40 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-flax">
                    {new Date(log.fecha).toLocaleString('es-MX')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="bg-applegreen/20 border border-applegreen/50 text-applegreen text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {log.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-creme">{log.accion}</div>
                    {log.parcela && (
                      <div className="text-xs text-flax/80 mt-1 flex items-center gap-1">
                        <span>🌱</span> Parcela: <span className="font-medium text-creme">{log.parcela}</span>
                      </div>
                    )}
                    {log.tipo_riego && (
                      <div className="text-xs text-cyan-400 mt-0.5 flex items-center gap-1">
                        <span>💧</span> Riego: {log.tipo_riego}
                      </div>
                    )}
                    {log.detalle && <div className="text-[10px] text-flax/60 mt-1 italic">{log.detalle}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{log.usuario_nombre || 'Sistema Autónomo'}</div>
                    <div className="text-[10px] text-flax/60 flex items-center gap-1 mt-0.5 font-mono">
                      {log.ip || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      {log.navegador && log.sistema ? `${log.navegador} en ${log.sistema}` : 'Desconocido'}
                    </div>
                    {log.dispositivo && <div className="text-[10px] text-flax/50 mt-0.5">{log.dispositivo}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
