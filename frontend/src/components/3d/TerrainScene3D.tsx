'use client';

import { useRef, useMemo, useState } from 'react';
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
  optimo: '#8DA432',    // 50-75% Apple Green
  saturado: '#365004',  // >75% Dark Green
};

export function getStatusFromHumidity(hum: number) {
  if (hum < 35) return { label: 'Crítico', color: HUMIDITY_COLORS.critico, key: 'critico' };
  if (hum < 50) return { label: 'Bajo', color: HUMIDITY_COLORS.bajo, key: 'bajo' };
  if (hum <= 75) return { label: 'Óptimo', color: HUMIDITY_COLORS.optimo, key: 'optimo' };
  return { label: 'Saturado', color: HUMIDITY_COLORS.saturado, key: 'saturado' };
}

const ZONE_POSITIONS: Record<string, [number, number, number]> = {
  zona_alta: [-3.4, 0.25, 0],   // Caña (Norte)
  zona_media: [0, 0.25, 0],     // Tomate (Centro)
  zona_baja: [3.4, 0.25, 0],    // Arroz (Sur)
};

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
        <meshStandardMaterial color="#27272a" roughness={0.4} />
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
function SolenoidValve3D({ isOpen, position }: { isOpen: boolean; position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.25, 12]} />
        <meshStandardMaterial
          color={isOpen ? '#22c55e' : '#ef4444'}
          emissive={isOpen ? '#22c55e' : '#7f1d1d'}
          emissiveIntensity={isOpen ? 0.6 : 0.2}
          metalness={0.6}
        />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.14, 0.1, 0.14]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.7} />
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

function ParcelZone({ parcela, position, onClick, selected }: ParcelZoneProps) {
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
  const phVal = parcela.ph_suelo ?? (cropId === 'arroz' ? 6.5 : cropId === 'tomate_rojo' ? 6.2 : 6.8);

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
        <meshStandardMaterial color={selected ? '#eab308' : hovered ? '#ffffff' : '#27272a'} roughness={0.9} />
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

      {/* Partículas de riego cuando la válvula está abierta */}
      {isOpen && (
        <Sparkles
          count={80}
          scale={[2.5, 1.8, 3.5]}
          size={3.5}
          speed={2.2}
          opacity={0.7}
          color="#60a5fa"
          position={[0, 1.0, 0]}
        />
      )}

      {/* Varilla / Soporte fino que conecta visualmente el terreno con la tarjeta flotante */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 1.7, 4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.25} />
      </mesh>

      {/* ===================================================================== */}
      {/* ETIQUETA FLOTANTE DISCRETA CON PALETA DE MARCA                       */}
      {/* ===================================================================== */}
      <Html position={[0, 2.3, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="bg-[#131d08]/90 backdrop-blur-md px-3 py-1 rounded-full text-xs whitespace-nowrap border border-[#8DA432]/35 shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
          <span className="font-semibold text-[#FFFCE9] text-[11px]">{parcela.parcela.nombre}</span>
          <span className="text-[#8DA432]/50 text-[10px]">·</span>
          <span className="font-bold text-[#EDE383] text-[11px]">💧 {parcela.humedad_suelo.toFixed(0)}%</span>
          {isOpen && (
            <span className="text-[10px] text-[#8DA432] font-semibold flex items-center gap-1 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8DA432]" />
              Regando
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

// =============================================================================
// Modelo 3D del Dron de Riego de Emergencia y su Estación de Carga
// =============================================================================
function DroneAndDock3D({ dron }: { dron?: DronRiego }) {
  const dronRef = useRef<THREE.Group>(null);
  const rotorsRef = useRef<THREE.Mesh[]>([]);
  const isSpraying = dron?.estado === 'regando' || dron?.mision_activa;

  // Animación del vuelo del dron sobre las parcelas
  useFrame((state) => {
    // Rotar hélices
    rotorsRef.current.forEach((rotor) => {
      if (rotor) rotor.rotation.y += isSpraying ? 0.8 : 0.05;
    });

    if (dronRef.current) {
      if (isSpraying) {
        // Trayectoria circular de patrullaje de riego sobre las 3 parcelas
        const t = state.clock.elapsedTime * 0.8;
        dronRef.current.position.x = Math.sin(t) * 4.0;
        dronRef.current.position.z = Math.cos(t * 0.7) * 2.2;
        dronRef.current.position.y = 3.6 + Math.sin(t * 2) * 0.15;
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
            color={llaveAbierta ? '#3b82f6' : '#94a3b8'}
            emissive={llaveAbierta ? '#3b82f6' : '#000000'}
            emissiveIntensity={llaveAbierta ? 0.8 : 0}
          />
        </mesh>

        {/* Etiqueta de la Base */}
        <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="bg-black/90 text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold border border-white/10 shadow-lg whitespace-nowrap">
            Estación Dron: {enBase ? '🟢 Objeto presente' : '⚪ Libre'}
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
            <Sparkles
              count={120}
              scale={[3.0, 2.5, 3.0]}
              size={4.0}
              speed={3.5}
              opacity={0.85}
              color="#38bdf8"
            />
          </group>
        )}

        {/* Etiqueta del Dron en Vuelo */}
        {isSpraying && (
          <Html position={[0, 0.7, 0]} center style={{ pointerEvents: 'none' }}>
            <div className="bg-sky-950/90 text-sky-200 border border-sky-400/50 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-lg animate-pulse whitespace-nowrap">
              🚁 RIEGO POR DRON EN CURSO
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
function CisternAndPiping({ nivel }: { nivel: number }) {
  const waterRef = useRef<THREE.Mesh>(null);
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
        <meshStandardMaterial color="#3f3f46" roughness={0.9} />
      </mesh>

      <Html position={[0, 1.35, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="bg-[#131d08]/90 text-[#FFFCE9] px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border border-[#8DA432]/40 shadow-xl backdrop-blur-md">
          🚰 Cisterna: {nivel.toFixed(0)}%
        </div>
      </Html>
    </group>
  );
}

function WaterPipes() {
  return (
    <group>
      <mesh position={[1.5, 0.05, -1.7]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 8.5, 8]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  );
}

// =============================================================================
// Escena 3D Principal
// =============================================================================
interface TerrainScene3DProps {
  parcelas: ParcelaDashboard[];
  tanqueNivel: number;
  tanqueCapacidad: number;
  dron?: DronRiego;
  onParcelaSelect?: (parcelaId: string) => void;
  selectedParcelaId?: string;
}

export default function TerrainScene3D({
  parcelas,
  tanqueNivel,
  dron,
  onParcelaSelect,
  selectedParcelaId,
}: TerrainScene3DProps) {
  return (
    <div className="relative w-full h-full min-h-[440px] md:min-h-[480px] rounded-xl overflow-hidden bg-[#101807]">
      <Canvas
        shadows
        camera={{ position: [0, 9.8, 10.2], fov: 44 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#101807']} />

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
          <planeGeometry args={[18, 10]} />
          <meshStandardMaterial color="#1a270a" roughness={0.95} />
        </mesh>

        {/* Caminos de grava entre parcelas */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, -0.15, 0]} receiveShadow>
          <planeGeometry args={[18, 1.2]} />
          <meshStandardMaterial color="#365004" roughness={0.9} />
        </mesh>

        {/* Renderizado de parcelas dinámicas */}
        {parcelas.map((p, idx) => {
          const zoneKey = p.parcela.zona_3d || 'zona_media';
          const basePos = ZONE_POSITIONS[zoneKey] || [0, 0.25, 0];
          const sameZoneIdx = parcelas.slice(0, idx).filter(
            (item) => (item.parcela.zona_3d || 'zona_media') === zoneKey
          ).length;
          const pos: [number, number, number] = [
            basePos[0],
            basePos[1],
            basePos[2] + sameZoneIdx * 4.2,
          ];

          return (
            <ParcelZone
              key={p.parcela.id}
              parcela={p}
              position={pos}
              onClick={() => onParcelaSelect?.(p.parcela.id)}
              selected={selectedParcelaId === p.parcela.id}
            />
          );
        })}

        {/* Cisterna volumétrica y tuberías */}
        <CisternAndPiping nivel={tanqueNivel} />
        <WaterPipes />

        {/* Dron Agrícola de Emergencia y Base con Sensor de Presencia */}
        <DroneAndDock3D dron={dron} />

        <OrbitControls
          enablePan={false}
          maxPolarAngle={Math.PI / 2.25}
          minDistance={7}
          maxDistance={22}
        />
      </Canvas>

      {/* Leyenda fija en la esquina inferior */}
      <div className="absolute bottom-3 left-3 bg-[#111111]/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-white/10 flex items-center gap-3.5 text-[11px] text-zinc-300 pointer-events-none shadow-xl">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#ef4444]" />
          <span>Crítico &lt;35%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" />
          <span>Bajo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#22c55e]" />
          <span>Óptimo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" />
          <span>Saturado &gt;75%</span>
        </div>
      </div>
    </div>
  );
}
