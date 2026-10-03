'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDashboard, useBackendStatus } from '@/hooks/useDashboard';
import { useNotificaciones } from '@/hooks/useNotificaciones';
import { api, API_URL } from '@/lib/api';
import { fetchLiveWeather } from '@/lib/weather-service';
import ParcelaCard from '@/components/dashboard/ParcelaCard';
import WeatherWidgetIOS from '@/components/dashboard/WeatherWidgetIOS';
import DroneControlPanel from '@/components/dashboard/DroneControlPanel';
import CreateParcelModal from '@/components/dashboard/CreateParcelModal';
import EditParcelModal from '@/components/dashboard/EditParcelModal';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import {
  TankPanel,
  Header,
} from '@/components/dashboard/Widgets';
import LoginScreen from '@/components/auth/LoginScreen';
import BitacoraPanel from '@/components/bitacora/BitacoraPanel';
import { registrarBitacora, tipoRiegoTexto } from '@/lib/bitacora';
import PlanesPanel from '@/components/suscripcion/PlanesPanel';
import { planDeSesion, PLANES, PlanId, sinPlagas } from '@/lib/suscripcion';
import RiegoTuberiasPanel from '@/components/dashboard/RiegoTuberiasPanel';
import InstalacionesPanel from '@/components/tecnico/InstalacionesPanel';
import InstalacionModal, { ObjetivoInstalacion } from '@/components/tecnico/InstalacionModal';
import { cambiarPlan, cerrarSesion, EVENTO_SESION_EXPIRADA, obtenerSesion } from '@/lib/auth';
import { instalacionesDe, METODOS_RIEGO, metodoRiegoDe, metodosDeSeleccion, RIEGO_POR_METODO, sistemasInstalados } from '@/lib/api';
import {
  Cultivo,
  InstalacionRiego,
  MetodoRiego,
  ParcelaDashboard,
  SeleccionRiego,
  PronosticoClima,
  CreateParcelaDTO,
  Sesion,
  UpdateParcelaDTO,
} from '@/types';

type Vista = 'tarjetas' | 'terreno' | 'instalaciones' | 'plan' | 'bitacora';

// Carga dinámica del componente 3D para evitar errores de renderizado en servidor
const TerrainScene3D = dynamic(
  () => import('@/components/3d/TerrainScene3D'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[360px] w-full items-center justify-center rounded-xl border border-applegreen/30 bg-card sm:min-h-[440px]">
        <div className="text-center">
          <div className="text-3xl mb-2 animate-bounce">🌱</div>
          <p className="text-flax text-xs">Cargando modelo 3D del terreno...</p>
        </div>
      </div>
    ),
  }
);

export default function DashboardPage() {
  const { data, loading, error, refresh } = useDashboard(2000);
  const { isAvailable: backendAvailable, checking: backendChecking } = useBackendStatus();
  const [selectedParcelaId, setSelectedParcelaId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<Vista>('terreno');
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [sesionLista, setSesionLista] = useState(false);
  const [avisoLogin, setAvisoLogin] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [instalando, setInstalando] = useState<ObjetivoInstalacion | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [liveWeather, setLiveWeather] = useState<PronosticoClima | null>(null);
  const [cultivos, setCultivos] = useState<Cultivo[]>([]);
  const [editingParcela, setEditingParcela] = useState<ParcelaDashboard | null>(null);

  // La sesión se lee del navegador al montar (no existe en el render del servidor).
  useEffect(() => {
    const s = obtenerSesion();
    setSesion(s);
    setSesionLista(true);
    const expirada = () => {
      setSesion(null);
      setAvisoLogin('Tu sesión expiró o ya no es válida. Inicia sesión de nuevo.');
    };
    window.addEventListener(EVENTO_SESION_EXPIRADA, expirada);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, expirada);
  }, []);

  // Sin sesión no se evalúan alertas para notificar.
  const esPro = planDeSesion(sesion?.usuario.plan) === 'pro';
  const datosVisibles = useMemo(() => (data && !esPro ? sinPlagas(data) : data), [data, esPro]);
  const notificaciones = useNotificaciones(sesion ? datosVisibles : null);
  const esTecnico = sesion?.usuario.rol === 'tecnico';
  const plan = planDeSesion(sesion?.usuario.plan);
  const incluyeDron = PLANES[plan].incluyeDron;
  const elegirPlan = async (nuevo: PlanId) => {
    try {
      setSesion(await cambiarPlan(API_URL, nuevo));
      registrarBitacora({ categoria: 'suscripcion', accion: `Plan cambiado a ${PLANES[nuevo].nombre}` });
      mostrarAviso(`Plan ${PLANES[nuevo].nombre} activado.`);
    } catch (err) {
      mostrarAviso(err instanceof Error ? err.message : 'No se pudo cambiar el plan.');
    }
  };
  const mostrarAviso = useCallback((mensaje: string) => {
    setAviso(mensaje);
    setTimeout(() => setAviso(null), 5000);
  }, []);

  // Consulta meteorológica en tiempo real (Google Weather API / Open-Meteo)
  useEffect(() => {
    let mounted = true;
    const loadWeather = async () => {
      try {
        const w = await fetchLiveWeather();
        if (mounted) {
          setLiveWeather(w);
          api.setClimaEnVivo(w);
        }
      } catch (err) {
        console.error('Error al cargar clima en vivo:', err);
      }
    };
    loadWeather();
    const interval = setInterval(loadWeather, 60000); // 1 minuto
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    api.getCultivos().then((items) => {
      if (mounted) setCultivos(items);
    }).catch((err) => console.error('Error al cargar cultivos:', err));
    return () => { mounted = false; };
  }, []);

  // Toggle de válvula manual/automática
  const handleToggleValve = useCallback(
    async (valvulaId: string) => {
      try {
        const valvula = await api.toggleValvula(valvulaId);
        const pd = data?.parcelas.find((p) => p.parcela.id === valvulaId);
        registrarBitacora({
          categoria: 'riego',
          accion: `Riego manual: válvula ${valvula?.estado === 'abierta' ? 'abierta' : 'cerrada'}`,
          tipo_riego: pd ? tipoRiegoTexto(pd) : null,
          parcela: pd?.parcela.nombre ?? null,
        });
        refresh();
      } catch (err) {
        mostrarAviso(err instanceof Error ? err.message : 'No se pudo cambiar la válvula.');
      }
    },
    [refresh, mostrarAviso, data]
  );

  // Crear nueva parcela
  const handleCreateParcel = useCallback(
    async (dto: CreateParcelaDTO) => {
      // El modal muestra el error si el alta falla.
      await api.createParcela(dto);
      registrarBitacora({ categoria: 'parcela', accion: 'Parcela creada', parcela: dto.nombre });
      refresh();
      mostrarAviso(
        dto.instalaciones_riego?.some((i) => i.estado === 'pendiente')
          ? `Parcela "${dto.nombre}" creada. Marca sus tuberías como instaladas para habilitar el riego.`
          : `Parcela "${dto.nombre}" creada.`
      );
    },
    [refresh, mostrarAviso]
  );

  // Descartar alerta
  const handleDismissAlert = useCallback(
    async (alertaId: string) => {
      try {
        await api.marcarAlertaLeida(alertaId);
        refresh();
      } catch (err) {
        console.error('Error al descartar alerta:', err);
      }
    },
    [refresh]
  );

  const handleUpdateParcel = useCallback(
    async (dto: UpdateParcelaDTO) => {
      if (!editingParcela) return;
      await api.updateParcela(editingParcela.parcela.id, dto);
      registrarBitacora({
        categoria: 'parcela',
        accion: 'Parcela modificada',
        parcela: dto.nombre ?? editingParcela.parcela.nombre,
      });
      setEditingParcela(null);
      refresh();
    },
    [editingParcela, refresh]
  );

  // Elegir con qué sistema(s) instalados regar: goteo, aspersión o ambos (técnico y productor).
  const handleChangeMetodo = useCallback(
    async (parcela: ParcelaDashboard, seleccion: SeleccionRiego) => {
      try {
        await api.updateParcela(parcela.parcela.id, { metodo_riego: seleccion });
        registrarBitacora({
          categoria: 'riego',
          accion: 'Cambio de tipo de riego',
          detalle: `De ${tipoRiegoTexto(parcela)} a ${metodosDeSeleccion(seleccion).map((m) => RIEGO_POR_METODO[m].label).join(' + ')}`,
          tipo_riego: metodosDeSeleccion(seleccion).map((m) => RIEGO_POR_METODO[m].label).join(' + '),
          parcela: parcela.parcela.nombre,
        });
        refresh();
      } catch (err) {
        mostrarAviso(err instanceof Error ? err.message : 'No se pudo cambiar el sistema de riego.');
      }
    },
    [refresh, mostrarAviso]
  );

  // Lista de tuberías de la parcela. Si aún no hay registro, la instalación previa se conserva como instalada.
  const listaInstalaciones = useCallback((parcela: ParcelaDashboard): InstalacionRiego[] => {
    if (parcela.parcela.instalaciones_riego) return [...instalacionesDe(parcela)];
    return sistemasInstalados(parcela).map((metodo) => ({
      estado: 'instalada',
      metodo,
      metros_tuberia: 0,
      emisores: 0,
      notas: 'Instalación previa al registro',
    }));
  }, []);

  const guardarInstalaciones = useCallback(
    async (parcela: ParcelaDashboard, instalaciones: InstalacionRiego[], mensaje: string) => {
      const ordenadas = METODOS_RIEGO.map((m) => instalaciones.find((i) => i.metodo === m)).filter(Boolean) as InstalacionRiego[];
      // Si la selección usa un sistema retirado, se pasa a lo que quede instalado.
      const quedan = ordenadas.filter((i) => i.estado === 'instalada').map((i) => i.metodo);
      const seleccion = metodoRiegoDe(parcela);
      const seleccionValida = metodosDeSeleccion(seleccion).every((m) => ordenadas.some((i) => i.metodo === m));
      const nuevaSeleccion: SeleccionRiego | undefined = seleccionValida
        ? undefined
        : quedan.length === 2 ? 'ambos' : quedan[0] ?? ordenadas[0]?.metodo;
      await api.updateParcela(parcela.parcela.id, {
        instalaciones_riego: ordenadas,
        ...(nuevaSeleccion ? { metodo_riego: nuevaSeleccion } : {}),
      });
      registrarBitacora({ categoria: 'instalacion', accion: mensaje, parcela: parcela.parcela.nombre, tipo_riego: tipoRiegoTexto(parcela) });
      refresh();
      mostrarAviso(mensaje);
    },
    [refresh, mostrarAviso]
  );

  const guardarInstalacion = useCallback(
    async (parcela: ParcelaDashboard, instalacion: InstalacionRiego) => {
      const resto = listaInstalaciones(parcela).filter((i) => i.metodo !== instalacion.metodo);
      const nombre = RIEGO_POR_METODO[instalacion.metodo].label.toLowerCase();
      await guardarInstalaciones(
        parcela,
        [...resto, instalacion],
        instalacion.estado === 'instalada'
          ? `Tubería de ${nombre} en ${parcela.parcela.nombre} instalada: ya puede regar con ella.`
          : `Tubería de ${nombre} en ${parcela.parcela.nombre} registrada como pendiente.`
      );
    },
    [listaInstalaciones, guardarInstalaciones]
  );

  const marcarInstalada = useCallback(
    (parcela: ParcelaDashboard, metodo: MetodoRiego) => {
      const actual = instalacionesDe(parcela).find((i) => i.metodo === metodo);
      if (!actual) return;
      void guardarInstalacion(parcela, { ...actual, estado: 'instalada', fecha: new Date().toISOString(), tecnico: sesion?.usuario.nombre }).catch(
        (err) => mostrarAviso(err instanceof Error ? err.message : 'No se pudo guardar la instalación.')
      );
    },
    [guardarInstalacion, sesion, mostrarAviso]
  );

  const retirarInstalacion = useCallback(
    (parcela: ParcelaDashboard, metodo: MetodoRiego) => {
      const nombre = RIEGO_POR_METODO[metodo].label.toLowerCase();
      if (!window.confirm(`¿Retirar la tubería de ${nombre} de ${parcela.parcela.nombre}?`)) return;
      const resto = listaInstalaciones(parcela).filter((i) => i.metodo !== metodo);
      void guardarInstalaciones(parcela, resto, `Tubería de ${nombre} retirada de ${parcela.parcela.nombre}.`).catch((err) =>
        mostrarAviso(err instanceof Error ? err.message : 'No se pudo retirar la instalación.')
      );
    },
    [listaInstalaciones, guardarInstalaciones, mostrarAviso]
  );

  const handleLogout = useCallback(() => {
    registrarBitacora({ categoria: 'sesion', accion: 'Cierre de sesión' });
    cerrarSesion();
    setSesion(null);
    setAvisoLogin(null);
    setViewMode('terreno');
  }, []);

  if (!sesionLista) {
    return <div className="min-h-dvh bg-ink" />;
  }

  if (!sesion) {
    return (
      <LoginScreen
        aviso={avisoLogin}
        onLogin={(nueva) => {
          setSesion(nueva);
          registrarBitacora({ categoria: 'sesion', accion: 'Inicio de sesión' });
          setAvisoLogin(null);
          setViewMode(nueva.usuario.rol === 'tecnico' ? 'instalaciones' : 'terreno');
        }}
      />
    );
  }

  if (loading && !data) {
    return (
      <div className="min-h-dvh bg-ink flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🌱</div>
          <p className="text-flax text-sm font-medium">Iniciando agromIA...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-dvh bg-ink flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-flax text-sm mb-4">{error || 'Error al conectar'}</p>
          <button
            onClick={refresh}
            className="text-xs px-5 py-2 rounded-full bg-applegreen hover:bg-darkgreen text-ink hover:text-creme font-medium border border-flax/40 transition-colors shadow-md"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const stats = datosVisibles!.estadisticas;
  const climaDisplay = liveWeather
    ? {
        ...data.clima,
        ...liveWeather,
        pronostico_dias: liveWeather.pronostico_dias ?? data.clima.pronostico_dias,
        proximo_riego: liveWeather.proximo_riego ?? data.clima.proximo_riego,
        requiere_riego_emergencia:
          liveWeather.requiere_riego_emergencia ?? data.clima.requiere_riego_emergencia,
        razon_riego_emergencia:
          liveWeather.razon_riego_emergencia ?? data.clima.razon_riego_emergencia,
      }
    : data.clima;
  const dronData = data.dron || api.getDronState();
  const vistas: { id: Vista; label: string; corto: string }[] = [
    { id: 'tarjetas', label: 'Parcelas Solitas', corto: 'Parcelas' },
    { id: 'terreno', label: 'Métricas y Modelado', corto: 'Métricas' },
    { id: 'bitacora', label: '📒 Bitácora', corto: 'Bitácora' },
    { id: 'plan', label: `💳 Plan ${PLANES[plan].nombre}`, corto: 'Plan' },
    ...(esTecnico ? [{ id: 'instalaciones' as Vista, label: '🛠️ Instalaciones', corto: 'Instalaciones' }] : []),
  ];

  return (
    <div className="min-h-dvh bg-ink text-creme selection:bg-applegreen/30 antialiased font-sans">
      {/* Barra de Navegación Superior con botón de Nueva Parcela */}
      <Header
        backendStatus={backendAvailable}
        checking={backendChecking}
        onRefresh={refresh}
        onOpenCreateParcel={esTecnico ? () => setIsCreateModalOpen(true) : undefined}
        notificaciones={notificaciones}
        usuario={sesion.usuario}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-7xl px-[max(1rem,env(safe-area-inset-left))] pb-[calc(2rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:py-7">
        {/* ========================================================================= */}
        {/* FILA DE ESTADÍSTICAS SUPERIORES                                           */}
        {/* ========================================================================= */}
        <div className="mb-5 grid grid-cols-4 gap-2 sm:mb-8 sm:gap-4">
          <div className="bg-card/70 border border-applegreen/20 rounded-xl p-2.5 sm:p-3.5">
            <div className="mb-1 text-[10px] font-normal leading-tight text-flax sm:mb-1.5 sm:text-sm">Parcelas activas</div>
            <div className="text-xl font-semibold tracking-tight sm:text-3xl text-creme">
              {stats.parcelas_activas} / {stats.total_parcelas}
            </div>
          </div>

          <div className="bg-card/70 border border-applegreen/20 rounded-xl p-2.5 sm:p-3.5">
            <div className="mb-1 text-[10px] font-normal leading-tight text-flax sm:mb-1.5 sm:text-sm">Válvulas abiertas</div>
            <div className="text-xl font-semibold tracking-tight sm:text-3xl text-creme">
              {stats.valvulas_abiertas}
            </div>
          </div>

          <div
            className={`rounded-xl p-2.5 sm:p-3.5 transition-colors ${
              stats.alertas_sin_leer > 0
                ? 'bg-goldenbrown/35 border border-goldenbrown'
                : 'bg-card/70 border border-applegreen/20'
            }`}
          >
            <div
              className={`mb-1 text-[10px] font-normal leading-tight sm:mb-1.5 sm:text-sm ${
                stats.alertas_sin_leer > 0 ? 'text-flax font-semibold' : 'text-flax'
              }`}
            >
              Alertas<span className="hidden sm:inline">{stats.alertas_sin_leer > 0 ? ' ⚠️' : ''}</span>
            </div>
            <div
              className={`text-xl font-semibold tracking-tight sm:text-3xl ${
                stats.alertas_sin_leer > 0 ? 'text-creme' : 'text-creme'
              }`}
            >
              {stats.alertas_sin_leer}
            </div>
          </div>

          <div className="bg-card/70 border border-applegreen/20 rounded-xl p-2.5 sm:p-3.5">
            <div className="mb-1 text-[10px] font-normal leading-tight text-flax sm:mb-1.5 sm:text-sm">Litros hoy</div>
            <div className="text-xl font-semibold tracking-tight sm:text-3xl text-creme">
              {Number(stats.litros_hoy ?? 0).toLocaleString('es-MX')}
            </div>
          </div>
        </div>
{/* ========================================================================= */}
        {/* SELECTOR DE VISTAS CON ANIMACIÓN                                          */}
        {/* ========================================================================= */}
        <div className="mb-5 flex justify-center sm:mb-8">
          <div
            className="relative grid w-full rounded-2xl border border-applegreen/30 bg-card/80 p-1.5 shadow-lg sm:w-auto"
            style={{ gridTemplateColumns: `repeat(${vistas.length}, minmax(0, 1fr))` }}
          >
            <div
              className="absolute bottom-1.5 left-1.5 top-1.5 z-0 rounded-xl border border-applegreen/50 bg-darkgreen shadow-md transition-transform duration-300 ease-out"
              style={{
                width: `calc((100% - 0.75rem) / ${vistas.length})`,
                transform: `translateX(${Math.max(0, vistas.findIndex((v) => v.id === viewMode)) * 100}%)`,
              }}
            />
            {vistas.map((vista) => (
              <button
                key={vista.id}
                onClick={() => setViewMode(vista.id)}
                className={`relative z-10 rounded-xl px-3 py-2.5 text-xs font-bold transition-all duration-300 sm:px-6 sm:text-sm ${
                  viewMode === vista.id ? 'text-creme' : 'text-flax/50 hover:text-flax'
                }`}
              >
                <span className="sm:hidden">{vista.corto}</span>
                <span className="hidden sm:inline">{vista.label}</span>
              </button>
            ))}
          </div>
        </div>

        {aviso && (
          <div className="mb-6 flex animate-fade-in items-center justify-between rounded-xl border border-applegreen bg-darkgreen px-4 py-3 text-sm text-creme shadow-md">
            <span>ℹ️ {aviso}</span>
            <button onClick={() => setAviso(null)} className="ml-3 font-bold text-flax hover:text-creme">✕</button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CONTENIDO PRINCIPAL CON TRANSICIÓN                                        */}
        {/* ========================================================================= */}
        <div className="mb-6 fade-in-container">
          {/* VISTA 1: PARCELAS SOLITAS */}
          {viewMode === 'tarjetas' && (
            <div className="animate-fade-in">
              <div className="mb-5 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-applegreen">Operación agrícola</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight text-creme">Estado de tus parcelas</h2>
                  <p className="mt-1 text-xs text-flax/65">Sensores, cultivo y riego organizados por unidad de producción.</p>
                </div>
                <span className="w-fit rounded-full border border-applegreen/30 bg-card px-3 py-1.5 text-xs font-semibold text-flax">
                  {data.parcelas.filter((item) => item.parcela.activa).length} activas · {data.parcelas.length} totales
                </span>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
                {data.parcelas.map((pd) => (
                  <ParcelaCard
                    key={pd.parcela.id}
                    data={pd}
                    mostrarPlagas={esPro}
                    selected={selectedParcelaId === pd.parcela.id}
                    onSelect={() => setSelectedParcelaId(pd.parcela.id)}
                    onToggleValve={() => handleToggleValve(pd.parcela.id)}
                    modoGlobal={data.modo_global_riego ?? 'automatico'}
                    onEdit={() => setEditingParcela(pd)}
                    onChangeMetodo={(seleccion) => handleChangeMetodo(pd, seleccion)}
                  />
                ))}
              </div>
            </div>
          )}

          {viewMode === 'bitacora' && (
            <div className="animate-fade-in">
              <BitacoraPanel />
            </div>
          )}

          {viewMode === 'plan' && (
            <div className="animate-fade-in">
              <PlanesPanel planActual={plan} onElegir={elegirPlan} />
            </div>
          )}

          {/* VISTA 3 (técnico): ALTA DE PARCELAS E INSTALACIONES DE TUBERÍA */}
          {viewMode === 'instalaciones' && esTecnico && (
            <div className="animate-fade-in">
              <InstalacionesPanel
                parcelas={data.parcelas}
                onNuevaParcela={() => setIsCreateModalOpen(true)}
                onRegistrar={(parcela, metodo) => setInstalando({ parcela, metodo })}
                onMarcarInstalada={marcarInstalada}
                onRetirar={retirarInstalacion}
              />
            </div>
          )}

          {/* VISTA 2: MÉTRICAS, CONTROL Y MODELADO 3D */}
          {viewMode === 'terreno' && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-12">
                
                {/* COLUMNA IZQUIERDA: Clima y Cisterna Principal */}
                <div className="flex flex-col gap-4 sm:gap-6 lg:col-span-4">
                  <WeatherWidgetIOS clima={climaDisplay} />
                  {data.tanques[0] && <TankPanel tanque={data.tanques[0]} modoGlobal={data.modo_global_riego ?? 'automatico'} />}
                </div>

                {/* COLUMNA DERECHA: Modelado 3D y Sistema de Dron */}
                <div className="flex flex-col gap-4 sm:gap-6 lg:col-span-8">
                  <div className="flex flex-col rounded-2xl border border-applegreen/30 bg-card p-3 shadow-lg shadow-black/20 sm:min-h-[500px] sm:p-5">
                    <div className="mb-3 flex items-center justify-between px-1 sm:mb-4 sm:px-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-creme sm:text-base">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-applegreen">
                          <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
                          <path d="M9 3.2v15.6" /><path d="M15 5.2v15.6" />
                        </svg>
                        <span>Modelado 3D de las Parcelas</span>
                      </div>
                      <span className="text-[11px] text-flax/70 font-medium hidden sm:inline">
                        Interactivo · Telemetría en vivo
                      </span>
                    </div>
                    
                    <div className="relative h-[360px] w-full overflow-hidden rounded-xl border border-applegreen/10 bg-ink sm:h-full sm:min-h-[450px]">
                      <div className="absolute inset-0">
                        <TerrainScene3D
                          parcelas={data.parcelas}
                          tanqueNivel={Number(data.tanques[0]?.nivel_actual_porcentaje ?? 79)}
                          tanqueCapacidad={Number(data.tanques[0]?.capacidad_litros ?? 50000)}
                          dron={dronData}
                          incluyeDron={incluyeDron}
                          onParcelaSelect={setSelectedParcelaId}
                          selectedParcelaId={selectedParcelaId ?? undefined}
                        />
                      </div>
                    </div>
                  </div>

                  {incluyeDron ? (
                  <DroneControlPanel
                    dron={dronData}
                  parcelas={data.parcelas}
                    modoGlobal={data.modo_global_riego ?? 'automatico'}
                    onRefresh={refresh}
                  />
                  ) : (
                    <>
                    <RiegoTuberiasPanel
                      modoGlobal={data.modo_global_riego ?? 'automatico'}
                      onRefresh={refresh}
                    />
                    <div className="rounded-2xl border border-dashed border-applegreen/40 bg-card p-5 text-center">
                      <div className="text-2xl">🚁🔒</div>
                      <h3 className="mt-1 text-sm font-bold text-creme">Dron no incluido en tu plan Básico</h3>
                      <p className="mt-1 text-xs text-flax/70">Mejora a Pro para riego de emergencia, fumigación y escaneo IA de plagas con dron.</p>
                      <button onClick={() => setViewMode('plan')} className="mt-3 rounded-xl border border-applegreen/50 bg-darkgreen px-4 py-2 text-xs font-bold text-creme hover:bg-applegreen/40">Ver planes</button>
                    </div>
                    </>
                  )}
                </div>
                
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* PANEL DE ALERTAS ACTIVAS                                                  */}
        {datosVisibles!.alertas_activas.length > 0 && (
          <div className="mb-6">
            <AlertsPanel
              alertas={datosVisibles!.alertas_activas}
              onDismiss={handleDismissAlert}
            />
          </div>
        )}

        {/* Modal para Crear Nueva Parcela */}
        <CreateParcelModal
          isOpen={isCreateModalOpen && esTecnico}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateParcel}
        />
        <EditParcelModal
          isOpen={Boolean(editingParcela)}
          data={editingParcela}
          cultivos={cultivos}
          onClose={() => setEditingParcela(null)}
          onSubmit={handleUpdateParcel}
        />
        {esTecnico && (
          <InstalacionModal
            objetivo={instalando}
            tecnico={sesion.usuario.nombre}
            onClose={() => setInstalando(null)}
            onSubmit={(instalacion) => guardarInstalacion(instalando!.parcela, instalacion)}
          />
        )}
      </main>
    </div>
  );
}
