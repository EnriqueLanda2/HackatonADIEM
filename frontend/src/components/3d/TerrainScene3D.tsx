'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { ParcelaDashboard, DronRiego } from '@/types';

// =============================================================================
// Semáforo y Constantes
// =============================================================================
export const HUMIDITY_COLORS = {
  critico: '#925E06',   // <35% Golden Brown
  bajo: '#EDE383',      // 35-50% Flax
  optimo: '#8DA432',    // 50-75% Apple green
  saturado: '#365004',  // >75% Dark green
};

export function getStatusFromHumidity(hum: number) {
  if (hum < 35) return { label: 'Crítico', color: HUMIDITY_COLORS.critico, key: 'critico' };
  if (hum < 50) return { label: 'Bajo', color: HUMIDITY_COLORS.bajo, key: 'bajo' };
  if (hum <= 75) return { label: 'Óptimo', color: HUMIDITY_COLORS.optimo, key: 'optimo' };
  return { label: 'Saturado', color: HUMIDITY_COLORS.saturado, key: 'saturado' };
}

// Las parcelas se acomodan en una cuadrícula: 3 por fila, centrada en la maqueta.
// La cisterna y la base del dron quedan a la derecha, fuera de la cuadrícula.
const PARCELAS_POR_FILA = 3;
const ESPACIO_COLUMNAS = 3.4;
const ESPACIO_FILAS = 4.4;

function posicionParcela(indice: number, total: number): [number, number, number] {
  const fila = Math.floor(indice / PARCELAS_POR_FILA);
  const filas = Math.ceil(total / PARCELAS_POR_FILA);
  const col = indice % PARCELAS_POR_FILA;
  const enEstaFila = Math.min(PARCELAS_POR_FILA, total - fila * PARCELAS_POR_FILA);
  return [(col - (enEstaFila - 1) / 2) * ESPACIO_COLUMNAS, 0.25, (fila - (filas - 1) / 2) * ESPACIO_FILAS];
}

const TANK_POSITION: [number, number, number] = [6.4, 0.9, -0.2];
const DRON_DOCK_POSITION: [number, number, number] = [6.4, 0.15, 2.2];

// =============================================================================
// Modelos 3D de Cultivos
// =============================================================================

// Caña de Azúcar (Tallos altos en filas con hojas)
function SugarCaneCrop() {
  const stalks = useMemo(() => {
    const list: [number, number, number, number][] = [];
    for (let x = -1.0; x <= 1.0; x += 0.45) {
      for (let z = -1.4; z <= 1.4; z += 0.45) {
        list.push([x + (Math.random() - 0.5) * 0.1, 0, z + (Math.random() - 0.5) * 0.1, 0.8 + Math.random() * 0.4]);
      }
    }
    return list;
  }, []);

  return (
    <group position={[0, 0.1, 0]}>
      {stalks.map(([x, y, z, h], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh position={[0, h / 2, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.045, h, 6]} />
            <meshStandardMaterial color="#84cc16" roughness={0.7} />
          </mesh>
          <mesh position={[0, h, 0]}>
            <coneGeometry args={[0.15, 0.3, 5]} />
            <meshStandardMaterial color="#4ade80" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Tomate Rojo (Plantas bajas en surcos con frutos rojos)
function TomatoCrop() {
  const bushes = useMemo(() => {
    const list: [number, number, number][] = [];
    for (let x = -0.9; x <= 0.9; x += 0.6) {
      for (let z = -1.3; z <= 1.3; z += 0.55) {
        list.push([x, 0.2, z]);
      }
    }
    return list;
  }, []);

  return (
    <group position={[0, 0.1, 0]}>
      {bushes.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh castShadow>
            <sphereGeometry args={[0.22, 7, 7]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} />
          </mesh>
          <mesh position={[0.12, 0.05, 0.12]}>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshStandardMaterial color="#ef4444" roughness={0.3} emissive="#ef4444" emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[-0.12, -0.05, -0.1]}>
            <sphereGeometry args={[0.055, 6, 6]} />
            <meshStandardMaterial color="#ef4444" roughness={0.3} emissive="#ef4444" emissiveIntensity={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Arroz (Terraza inundada con espejo de agua y plántulas)
function RiceCrop() {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (waterRef.current) {
      waterRef.current.position.y = 0.08 + Math.sin(state.clock.elapsedTime * 1.5) * 0.005;
    }
  });

  const seedlings = useMemo(() => {
    const list: [number, number, number][] = [];
    for (let x = -1.0; x <= 1.0; x += 0.4) {
      for (let z = -1.4; z <= 1.4; z += 0.4) {
        list.push([x + (Math.random() - 0.5) * 0.08, 0.12, z + (Math.random() - 0.5) * 0.08]);
      }
    }
    return list;
  }, []);

  return (
    <group position={[0, 0.05, 0]}>
      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <planeGeometry args={[2.5, 3.6]} />
        <meshStandardMaterial
          color="#38bdf8"
          roughness={0.1}
          metalness={0.8}
          transparent
          opacity={0.85}
        />
      </mesh>

      {seedlings.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <coneGeometry args={[0.06, 0.25, 4]} />
          <meshStandardMaterial color="#a3e635" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// Parcela en descanso (tierra arada sin cultivo)
function RestSoil() {
  return (
    <group position={[0, 0.15, 0]}>
      {[-0.8, -0.2, 0.4, 1.0].map((z, i) => (
        <mesh key={i} position={[0, 0.05, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.08, 0.08, 2.4, 6]} />
          <meshStandardMaterial color="#543d2b" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

// Sonda / Estación IoT 3D
function SensorProbe3D({ statusColor }: { statusColor: string }) {
  const ledRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ledRef.current) {
      const mat = ledRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.6 + Math.sin(state.clock.elapsedTime * 4) * 0.4;
    }
  });

  return (
    <group position={[0.9, 0.1, 1.3]}>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.7, 8]} />
        <meshStandardMaterial color="#71717a" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.16, 0.18, 0.12]} />
        <meshStandardMaterial color="#365004" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.8, 0]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.18, 0.02, 0.14]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.2} metalness={0.9} />
      </mesh>
      <mesh ref={ledRef} position={[0, 0.75, 0.07]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={1}
        />
      </mesh>
    </group>
  );
}

// Válvula de solenoide 3D
// Goteo: cintas a ras de suelo con gotas pequeñas que caen junto a la raíz.
function DripLines3D({ isOpen }: { isOpen: boolean }) {
  // Las cintas van sobre la superficie del terreno (y = 0.15) para que se vean entre las plantas.
  const lineasX = [-0.9, 0, 0.9];
  const emisoresZ = useMemo(() => Array.from({ length: 8 }, (_, i) => -1.4 + i * 0.4), []);
  const gotas = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    if (!isOpen) return;
    const t = state.clock.elapsedTime;
    gotas.current.forEach((gota, i) => {
      if (!gota) return;
      const fase = (t * 1.4 + i * 0.37) % 1; // cada gota cae y reaparece
      gota.position.y = 0.42 - fase * 0.24;
      gota.scale.setScalar(1 - fase * 0.5);
    });
  });

  return (
    <group position={[0, 0, 0]}>
      {lineasX.map((x, li) => (
        <group key={x} position={[x, 0, 0]}>
          {/* Cinta de goteo */}
          <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 3.4, 8]} />
            <meshStandardMaterial color={isOpen ? '#0ea5e9' : '#e2e8f0'} emissive={isOpen ? '#0ea5e9' : '#000000'} emissiveIntensity={isOpen ? 0.6 : 0} roughness={0.5} />
          </mesh>
          {/* Franja de suelo mojado */}
          {isOpen && (
            <mesh position={[0, 0.162, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.45, 3.4]} />
              <meshBasicMaterial color="#38bdf8" transparent opacity={0.35} />
            </mesh>
          )}
          {/* Emisores y gotas cayendo */}
          {emisoresZ.map((z, ei) => (
            <group key={z} position={[0, 0, z]}>
              <mesh position={[0, 0.2, 0]}>
                <sphereGeometry args={[0.055, 8, 8]} />
                <meshStandardMaterial color={isOpen ? '#7dd3fc' : '#94a3b8'} emissive={isOpen ? '#38bdf8' : '#000000'} emissiveIntensity={isOpen ? 0.8 : 0} />
              </mesh>
              {isOpen && (
                <mesh ref={(el) => { gotas.current[li * emisoresZ.length + ei] = el; }} position={[0, 0.35, 0]}>
                  <sphereGeometry args={[0.055, 8, 8]} />
                  <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1} transparent opacity={0.9} />
                </mesh>
              )}
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

// Aspersión: elevadores con un abanico de agua alto que moja el follaje.

function MicroSprinklers3D({ isOpen }: { isOpen: boolean }) {
  const heads = useRef<THREE.Group[]>([]);
  useFrame((_, delta) => {
    if (isOpen) heads.current.forEach((head) => head && (head.rotation.y += delta * 6));
  });
  return (
    <group>
      {[
        [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]
      ].map(([x, z], idx) => (
        <group key={idx} position={[x, 0, z]}>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.3, 6]} />
            <meshStandardMaterial color="#4ade80" metalness={0.5} />
          </mesh>
          <group ref={(el) => { if (el) heads.current[idx] = el; }} position={[0, 0.3, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.02, 0.02, 0.1, 6]} />
              <meshStandardMaterial color="#EDE383" />
            </mesh>
            {isOpen && (
              <mesh position={[0, -0.1, 0]}>
                <coneGeometry args={[0.2, 0.2, 12, 1, true]} />
                <meshBasicMaterial color="#60a5fa" transparent opacity={0.3} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        </group>
      ))}
    </group>
  );
}

function Sprinklers3D({ isOpen }: { isOpen: boolean }) {
  const heads = useRef<THREE.Group[]>([]);
  useFrame((_, delta) => {
    if (isOpen) heads.current.forEach((head) => head && (head.rotation.y += delta * 3));
  });
  return (
    <group>
      {[
        [-0.8, -0.9],
        [0.8, 0.9],
      ].map(([x, z], idx) => (
        <group key={idx} position={[x, 0, z]}>
          <mesh position={[0, 0.35, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.7, 6]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
          </mesh>
          <group ref={(el) => { if (el) heads.current[idx] = el; }} position={[0, 0.72, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.015, 0.015, 0.22, 6]} />
              <meshStandardMaterial color="#EDE383" />
            </mesh>
          </group>
          {isOpen && (
            <Sparkles count={60} scale={[2.0, 1.4, 2.0]} size={3.2} speed={2.4} opacity={0.75} color="#38bdf8" position={[0, 0.9, 0]} />
          )}
        </group>
      ))}
    </group>
  );
}

function SolenoidValve3D({ isOpen, position }: { isOpen: boolean; position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.25, 12]} />
        <meshStandardMaterial
          color={isOpen ? '#8DA432' : '#925E06'}
          emissive={isOpen ? '#8DA432' : '#925E06'}
          emissiveIntensity={isOpen ? 0.7 : 0.2}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.14, 0.1, 0.14]} />
        <meshStandardMaterial color="#365004" metalness={0.7} />
      </mesh>
    </group>
  );
}

// =============================================================================
// Parcela 3D Individual con Etiqueta Elevada
// =============================================================================
interface ParcelZoneProps {
  parcela: ParcelaDashboard;
  position: [number, number, number];
  onClick?: () => void;
  selected?: boolean;
}

function ParcelZone({ parcela, position, onClick, selected, compacto = false }: ParcelZoneProps & { compacto?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const colorRef = useRef(new THREE.Color(getStatusFromHumidity(parcela.humedad_suelo).color));
  const [hovered, setHovered] = useState(false);

  const status = useMemo(() => getStatusFromHumidity(parcela.humedad_suelo), [parcela.humedad_suelo]);

  useFrame(() => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      colorRef.current.lerp(new THREE.Color(status.color), 0.08);
      mat.color.copy(colorRef.current);
    }
  });

  const cropId = parcela.cultivo?.id;
  const isOpen = parcela.valvula_estado === 'abierta';
  const phRaw = Number(parcela.ph_suelo ?? (cropId?.includes('arroz') ? 6.5 : cropId?.includes('tomate') ? 6.2 : 6.8));
  const phVal = isNaN(phRaw) ? 6.8 : phRaw;
  const humedadSuelo = Number(parcela.humedad_suelo ?? 0);
  const tempSuelo = Number(parcela.temperatura ?? 24);

  return (
    <group position={position}>
      {/* Terreno 3D con relieve */}
      <mesh
        ref={meshRef}
        position={[0, 0, 0]}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[2.7, 0.3, 3.8]} />
        <meshStandardMaterial roughness={0.8} />
      </mesh>

      {/* Borde exterior de la parcela */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[2.85, 0.25, 3.95]} />
        <meshStandardMaterial color={selected ? '#EDE383' : hovered ? '#8DA432' : '#273a06'} roughness={0.9} />
      </mesh>

      {/* Renderizado de Cultivo o Tierra en Descanso */}
      {parcela.tiene_cultivo && parcela.cultivo ? (
        <>
          {cropId === 'cana_azucar' && <SugarCaneCrop />}
          {cropId === 'tomate_rojo' && <TomatoCrop />}
          {cropId === 'arroz' && <RiceCrop />}
          {!['cana_azucar', 'tomate_rojo', 'arroz'].includes(cropId || '') && <TomatoCrop />}
        </>
      ) : (
        <RestSoil />
      )}

      {/* Sonda IoT */}
      <SensorProbe3D statusColor={status.color} />

      {/* Válvula de solenoide */}
      <SolenoidValve3D isOpen={isOpen} position={[-1.15, 0.15, -1.7]} />

      {/* Tuberías instaladas (goteo, aspersión o las dos); solo riegan las que están en uso */}
      {parcela.tiene_cultivo && parcela.sistemas_instalados?.includes('goteo') && (
        <DripLines3D isOpen={isOpen && Boolean(parcela.sistemas_activos?.includes('goteo'))} />
      )}
      {parcela.tiene_cultivo && parcela.sistemas_instalados?.includes('aspersion_presurizada') && (
        <Sprinklers3D isOpen={isOpen && Boolean(parcela.sistemas_activos?.includes('aspersion_presurizada'))} />
      )}



      {/* Varilla / Soporte fino que conecta visualmente el terreno con la tarjeta flotante */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 1.7, 4]} />
        <meshBasicMaterial color="#EDE383" transparent opacity={0.35} />
      </mesh>

      {/* ===================================================================== */}
      {/* ETIQUETA FLOTANTE CON MAYOR PADDING Y ELEVACIÓN (NO TAPA EL CULTIVO)  */}
      {/* ===================================================================== */}
      <Html position={[0, 2.5, 0]} center style={{ pointerEvents: 'none' }}>
        {compacto ? (
          // En teléfono: nombre corto y humedad, para no tapar la escena
          <div className="flex max-w-[120px] items-center gap-1 whitespace-nowrap rounded-lg border border-applegreen/40 bg-panel/95 px-1.5 py-0.5 text-[9px] text-creme shadow-lg">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
            <span className="truncate font-bold">{parcela.parcela.nombre.split(' - ').pop()}</span>
            <span className="font-semibold text-flax">{humedadSuelo.toFixed(0)}%</span>
          </div>
        ) : (
          <div className="bg-panel/95 text-creme px-4 py-2.5 rounded-2xl text-xs whitespace-nowrap border border-applegreen/40 shadow-2xl backdrop-blur-md flex flex-col items-center gap-1.5 transition-transform hover:scale-105">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-creme">{parcela.parcela.nombre}</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold text-creme shadow-sm"
                style={{ backgroundColor: status.color }}
              >
                {status.label}
              </span>
            </div>

            <div className="text-[11px] text-flax font-medium flex items-center gap-2 bg-card px-2.5 py-1 rounded-lg border border-applegreen/30">
              <span className="text-creme font-bold">💧 {humedadSuelo.toFixed(0)}%</span>
              <span className="text-applegreen">·</span>
              <span className="text-flax font-semibold">🌡️ {tempSuelo.toFixed(1)}°C</span>
              <span className="text-applegreen">·</span>
              <span className="text-applegreen font-semibold">🧪 pH {phVal.toFixed(1)}</span>
            </div>
          </div>
        )}
      </Html>
    </group>
  );
}

// =============================================================================
// Modelo 3D del Dron de Riego de Emergencia y su Estación de Carga
// =============================================================================
function DroneAndDock3D({ dron, parcelas, compacto = false }: { dron?: DronRiego; parcelas: ParcelaDashboard[]; compacto?: boolean }) {
  const dronRef = useRef<THREE.Group>(null);
  const rotorsRef = useRef<THREE.Mesh[]>([]);
  const target = parcelas.find((parcela) => parcela.parcela.id === dron?.objetivo_parcela_id);
  // Sin parcela objetivo no hay aspersión: evita que el dron "riegue" sobre la base.
  const isSpraying = Boolean(dron?.mision_activa && target);
  const fumigando = dron?.tipo_mision === 'fumigacion';
  const escaneando = dron?.tipo_mision === 'escaneo';
  const targetPosition = target ? posicionParcela(parcelas.indexOf(target), parcelas.length) : null;

  // Animación del vuelo del dron sobre las parcelas
  useFrame((state) => {
    // Rotar hélices
    rotorsRef.current.forEach((rotor) => {
      if (rotor) rotor.rotation.y += isSpraying ? 0.8 : 0.05;
    });

    if (dronRef.current) {
      if (isSpraying) {
        // El vuelo queda limitado a la parcela objetivo; no patrulla el resto.
        const t = state.clock.elapsedTime * 0.8;
        const [targetX, , targetZ] = targetPosition ?? DRON_DOCK_POSITION;
        dronRef.current.position.x = targetX + Math.sin(t) * 0.8;
        dronRef.current.position.z = targetZ + Math.cos(t * 0.7) * 0.7;
        dronRef.current.position.y = 3.0 + Math.sin(t * 2) * 0.15;
        dronRef.current.rotation.y = -t;
        dronRef.current.rotation.z = Math.cos(t) * 0.1;
      } else {
        // En reposo en la base de recarga
        dronRef.current.position.set(DRON_DOCK_POSITION[0], DRON_DOCK_POSITION[1] + 0.28, DRON_DOCK_POSITION[2]);
        dronRef.current.rotation.set(0, 0, 0);
      }
    }
  });

  const enBase = dron?.en_posicion_recarga ?? true;
  const llaveAbierta = dron?.llave_paso_recarga_abierta ?? false;

  return (
    <group>
      {/* ----------------- ESTACIÓN DE RECARGA CON SENSOR DE PRESENCIA ----------------- */}
      <group position={DRON_DOCK_POSITION}>
        {/* Plataforma de aterrizaje octagonal / cuadrada */}
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <cylinderGeometry args={[0.9, 1.0, 0.1, 8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>

        {/* Marca de helipuerto "H" */}
        <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.8, 0.8]} />
          <meshBasicMaterial color={enBase ? '#22c55e' : '#eab308'} wireframe />
        </mesh>

        {/* Poste con Sensor de Presencia (Ultrasónico / Óptico) */}
        <mesh position={[0.75, 0.35, 0.6]}>
          <cylinderGeometry args={[0.02, 0.02, 0.7, 8]} />
          <meshStandardMaterial color="#64748b" metalness={0.8} />
        </mesh>
        {/* Caja del sensor de presencia */}
        <mesh position={[0.75, 0.7, 0.6]}>
          <boxGeometry args={[0.12, 0.14, 0.1]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* LED indicador de presencia de objeto */}
        <mesh position={[0.75, 0.72, 0.66]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial
            color={enBase ? '#22c55e' : '#ef4444'}
            emissive={enBase ? '#22c55e' : '#ef4444'}
            emissiveIntensity={1.2}
          />
        </mesh>

        {/* Tubería y Llave de Paso para llenado de agua */}
        <mesh position={[0.6, 0.25, -0.6]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.5, 8]} />
          <meshStandardMaterial color="#475569" metalness={0.7} />
        </mesh>
        {/* Llave de paso (válvula con manija) */}
        <mesh position={[0.6, 0.4, -0.6]}>
          <boxGeometry args={[0.09, 0.09, 0.09]} />
          <meshStandardMaterial
            color={llaveAbierta ? '#8DA432' : '#365004'}
            emissive={llaveAbierta ? '#8DA432' : '#000000'}
            emissiveIntensity={llaveAbierta ? 0.8 : 0}
          />
        </mesh>

        {/* Etiqueta de la Base */}
        <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
          <div className={`whitespace-nowrap rounded-lg border border-applegreen/40 bg-panel/95 font-bold text-creme shadow-lg ${compacto ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'}`}>
            {compacto ? `Base ${enBase ? '🟢' : '⚪'}` : `Estación Dron: ${enBase ? '🟢 Objeto detectado' : '⚪ Libre'}`}
          </div>
        </Html>
      </group>

      {/* ----------------- DRON AGRÍCOLA QUADCOPTER ----------------- */}
      <group ref={dronRef}>
        {/* Cuerpo central del dron */}
        <mesh castShadow>
          <boxGeometry args={[0.45, 0.12, 0.45]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.3} />
        </mesh>

        {/* Tanque de agua del dron (cilindro central translúcido) */}
        <mesh position={[0, 0.11, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.18, 12]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.75} roughness={0.1} />
        </mesh>

        {/* Brazos para los 4 motores */}
        {[
          [0.35, 0, 0.35],
          [-0.35, 0, 0.35],
          [0.35, 0, -0.35],
          [-0.35, 0, -0.35],
        ].map(([bx, by, bz], idx) => (
          <group key={idx} position={[bx, by, bz]}>
            {/* Brazo de fibra de carbono */}
            <mesh position={[-bx * 0.3, 0, -bz * 0.3]} rotation={[0, Math.atan2(bz, bx), 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.4, 6]} />
              <meshStandardMaterial color="#1e293b" metalness={0.9} />
            </mesh>
            {/* Motor */}
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.08, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
            {/* Hélice giratoria */}
            <mesh
              ref={(el) => {
                if (el) rotorsRef.current[idx] = el;
              }}
              position={[0, 0.09, 0]}
            >
              <boxGeometry args={[0.4, 0.008, 0.04]} />
              <meshBasicMaterial color="#0f172a" />
            </mesh>
          </group>
        ))}

        {/* Tren de aterrizaje */}
        <mesh position={[0, -0.12, 0.18]}>
          <boxGeometry args={[0.5, 0.02, 0.03]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
        <mesh position={[0, -0.12, -0.18]}>
          <boxGeometry args={[0.5, 0.02, 0.03]} />
          <meshStandardMaterial color="#334155" />
        </mesh>

        {/* Boquillas de aspersión y partículas de agua si está en misión */}
        {isSpraying && (
          <group position={[0, -0.2, 0]}>
            {/* Escaneo: haz de la cámara. Riego: gotas de agua. Fumigación: bruma fina de biopreparado. */}
            {escaneando ? (
              <mesh position={[0, -1.4, 0]}>
                <coneGeometry args={[1.3, 2.8, 24, 1, true]} />
                <meshBasicMaterial color="#8DA432" transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
            ) : (
            <Sparkles
              count={fumigando ? 220 : 120}
              scale={fumigando ? [3.6, 2.8, 3.6] : [3.0, 2.5, 3.0]}
              size={fumigando ? 2.2 : 4.0}
              speed={fumigando ? 1.6 : 3.5}
              opacity={fumigando ? 0.6 : 0.85}
              color={fumigando ? '#EDE383' : '#38bdf8'}
            />
            )}
          </group>
        )}

        {/* Etiqueta del Dron en Vuelo */}
        {isSpraying && (
          <Html position={[0, 0.7, 0]} center style={{ pointerEvents: 'none' }}>
            <div className={`animate-pulse whitespace-nowrap rounded-full border border-flax/60 bg-ink/90 font-bold text-creme shadow-lg ${compacto ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'}`}>
              {compacto
                ? escaneando ? '🔍 Escaneo' : fumigando ? '🧪 Fumigando' : '💧 Regando'
                : escaneando ? '🔍 ESCANEO IA DE PLAGAS' : fumigando ? '🧪 FUMIGACIÓN EN CURSO' : '💧 RIEGO POR DRON EN CURSO'}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

// =============================================================================
// Cisterna 3D y Red de Tuberías
// =============================================================================
function CisternAndPiping({ nivel: rawNivel, compacto = false }: { nivel: number; compacto?: boolean }) {
  const waterRef = useRef<THREE.Mesh>(null);
  const nivel = Number(rawNivel ?? 80);
  const isCritical = nivel < 25;

  useFrame((state) => {
    if (waterRef.current) {
      waterRef.current.position.y = -0.65 + (nivel / 100) * 1.3 + Math.sin(state.clock.elapsedTime * 2) * 0.015;
    }
  });

  return (
    <group position={TANK_POSITION}>
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.95, 0.95, 1.8, 24]} />
        <meshStandardMaterial
          color="#94a3b8"
          transparent
          opacity={0.3}
          metalness={0.9}
          roughness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={waterRef} position={[0, -0.65 + (nivel / 100) * 1.3, 0]}>
        <cylinderGeometry args={[0.9, 0.9, Math.max(0.08, (nivel / 100) * 1.6), 24]} />
        <meshStandardMaterial
          color={isCritical ? '#ef4444' : '#2563eb'}
          transparent
          opacity={0.85}
          roughness={0.1}
        />
      </mesh>

      <mesh position={[0, -0.95, 0]}>
        <cylinderGeometry args={[1.1, 1.1, 0.2, 24]} />
        <meshStandardMaterial color="#365004" roughness={0.9} />
      </mesh>

      <Html position={[0, 1.35, 0]} center style={{ pointerEvents: 'none' }}>
        <div className={`whitespace-nowrap rounded-xl border border-applegreen/40 bg-panel/95 font-bold text-creme shadow-xl backdrop-blur-md ${compacto ? 'px-1.5 py-0.5 text-[9px]' : 'px-3 py-1.5 text-xs'}`}>
          🚰 {compacto ? '' : 'Cisterna: '}{nivel.toFixed(0)}%
        </div>
      </Html>
    </group>
  );
}

function WaterPipes({ z = -1.7 }: { z?: number }) {
  return (
    <group>
      <mesh position={[1.5, 0.05, z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 8.5, 8]} />
        <meshStandardMaterial color="#8DA432" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

function useMediaQuery(query: string) {
  const [coincide, setCoincide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const consulta = window.matchMedia(query);
    const cambio = () => setCoincide(consulta.matches);
    consulta.addEventListener('change', cambio);
    return () => consulta.removeEventListener('change', cambio);
  }, [query]);
  return coincide;
}

// =============================================================================
// Escena 3D Principal
// =============================================================================
interface TerrainScene3DProps {
  parcelas: ParcelaDashboard[];
  tanqueNivel: number;
  tanqueCapacidad: number;
  dron?: DronRiego;
  incluyeDron?: boolean;
  onParcelaSelect?: (parcelaId: string) => void;
  selectedParcelaId?: string;
}

export default function TerrainScene3D({
  parcelas,
  tanqueNivel,
  dron,
  incluyeDron = true,
  onParcelaSelect,
  selectedParcelaId,
}: TerrainScene3DProps) {
  // Pantalla angosta (teléfono): cámara más lejana, etiquetas compactas y menos resolución.
  const compacto = useMediaQuery('(max-width: 639px)');
  // Las etiquetas completas solo caben sin encimarse en monitores grandes.
  const etiquetasCompactas = useMediaQuery('(max-width: 1535px)');
  const filas = Math.max(1, Math.ceil(parcelas.length / PARCELAS_POR_FILA));
  const alejar = 1 + (filas - 1) * 0.55; // más filas, cámara más lejos

  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-xl bg-panel sm:min-h-[440px] md:min-h-[480px]">
      <Canvas
        key={`${compacto ? 'compacto' : 'amplio'}-${filas}`}
        shadows={!compacto}
        dpr={[1, 2]}
        camera={compacto ? { position: [1.2, 12.5 * alejar, 14 * alejar], fov: 50 } : { position: [0, 9.8 * alejar, 10.2 * alejar], fov: 44 }}
        gl={{ antialias: true, powerPreference: 'low-power' }}
      >
        <color attach="background" args={['#1c2a04']} />

        <ambientLight intensity={0.75} />
        <directionalLight
          position={[8, 15, 8]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-6, 6, -3]} intensity={0.4} color="#EDE383" />

        {/* Suelo base de la maqueta agrícola */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, -0.16, 0]} receiveShadow>
          <planeGeometry args={[18, Math.max(10, filas * ESPACIO_FILAS + 2)]} />
          <meshStandardMaterial color="#273a06" roughness={0.95} />
        </mesh>

        {/* Caminos de grava entre parcelas */}
        {Array.from({ length: filas }, (_, f) => (
          <mesh key={f} rotation={[-Math.PI / 2, 0, 0]} position={[0.5, -0.15, (f - (filas - 1) / 2) * ESPACIO_FILAS]} receiveShadow>
            <planeGeometry args={[18, 1.2]} />
            <meshStandardMaterial color="#365004" roughness={0.9} />
          </mesh>
        ))}

        {/* Renderizado de parcelas dinámicas */}
        {parcelas.map((p, idx) => (
          <ParcelZone
            key={p.parcela.id}
            parcela={p}
            position={posicionParcela(idx, parcelas.length)}
            onClick={() => onParcelaSelect?.(p.parcela.id)}
            selected={selectedParcelaId === p.parcela.id}
            compacto={etiquetasCompactas}
          />
        ))}

        {/* Cisterna volumétrica y tuberías */}
        <CisternAndPiping nivel={tanqueNivel} compacto={etiquetasCompactas} />
        {Array.from({ length: filas }, (_, f) => (
          <WaterPipes key={f} z={(f - (filas - 1) / 2) * ESPACIO_FILAS - 1.7} />
        ))}

        {/* Dron Agrícola de Emergencia y Base con Sensor de Presencia */}
        {incluyeDron && <DroneAndDock3D dron={dron} parcelas={parcelas} compacto={etiquetasCompactas} />}

        <OrbitControls
          // En teléfono la cámara mira al centro real de la maqueta (parcelas, cisterna y base del dron).
          target={compacto ? [1.2, 0, 1.8] : [0, 0, 0]}
          enablePan={false}
          maxPolarAngle={Math.PI / 2.25}
          minDistance={7}
          maxDistance={(compacto ? 32 : 22) * alejar}
        />
      </Canvas>

      {/* Leyenda fija en la esquina inferior */}
      <div className="pointer-events-none absolute bottom-2 left-2 grid grid-cols-2 gap-x-3 gap-y-1 rounded-xl border border-applegreen/40 bg-panel/92 px-2.5 py-2 text-[10px] text-creme shadow-xl backdrop-blur-md sm:bottom-3 sm:left-3 sm:flex sm:items-center sm:gap-3.5 sm:px-3.5 sm:py-2.5 sm:text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-goldenbrown" />
          <span>Crítico &lt;35%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-flax" />
          <span>Bajo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-applegreen" />
          <span>Óptimo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-darkgreen" />
          <span>Saturado &gt;75%</span>
        </div>
      </div>
    </div>
  );
}
