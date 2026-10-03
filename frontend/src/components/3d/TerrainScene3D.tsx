'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { ParcelaDashboard } from '@/types';

// =============================================================================
// Semáforo y Constantes
// =============================================================================
export const HUMIDITY_COLORS = {
  critico: '#ef4444',   // <35% Rojo
  bajo: '#f59e0b',      // 35-50% Amarillo
  optimo: '#22c55e',    // 50-75% Verde
  saturado: '#3b82f6',  // >75% Azul
};

export function getStatusFromHumidity(hum: number) {
  if (hum < 35) return { label: 'Crítico', color: HUMIDITY_COLORS.critico, key: 'critico' };
  if (hum < 50) return { label: 'Bajo', color: HUMIDITY_COLORS.bajo, key: 'bajo' };
  if (hum <= 75) return { label: 'Óptimo', color: HUMIDITY_COLORS.optimo, key: 'optimo' };
  return { label: 'Saturado', color: HUMIDITY_COLORS.saturado, key: 'saturado' };
}

const ZONE_POSITIONS: Record<string, [number, number, number]> = {
  zona_alta: [-3.3, 0.25, 0],   // Caña (Norte)
  zona_media: [0, 0.25, 0],     // Tomate (Centro)
  zona_baja: [3.3, 0.25, 0],    // Arroz (Sur)
};

const TANK_POSITION: [number, number, number] = [6.2, 0.9, -0.2];

// =============================================================================
// Modelos 3D de Cultivos Endémicos
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
          {/* Tallo */}
          <mesh position={[0, h / 2, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.045, h, 6]} />
            <meshStandardMaterial color="#84cc16" roughness={0.7} />
          </mesh>
          {/* Hojas superiores */}
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
          {/* Arbusto verde */}
          <mesh castShadow>
            <sphereGeometry args={[0.22, 7, 7]} />
            <meshStandardMaterial color="#15803d" roughness={0.8} />
          </mesh>
          {/* Frutos rojos (tomates) */}
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
      {/* Espejo de agua inundada reflectante */}
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

      {/* Plántulas de arroz que sobresalen del agua */}
      {seedlings.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <coneGeometry args={[0.06, 0.25, 4]} />
          <meshStandardMaterial color="#a3e635" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// Sonda / Estación de Telemetría Física 3D (Sensor IoT)
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
      {/* Varilla clavada en la tierra */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.7, 8]} />
        <meshStandardMaterial color="#71717a" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Caja de sensores IoT */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.16, 0.18, 0.12]} />
        <meshStandardMaterial color="#27272a" roughness={0.4} />
      </mesh>
      {/* Mini panel solar */}
      <mesh position={[0, 0.8, 0]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.18, 0.02, 0.14]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.2} metalness={0.9} />
      </mesh>
      {/* LED de estado del sensor parpadeante */}
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

// Válvula de Solenoide 3D en la esquina con tubería
function SolenoidValve3D({ isOpen, position }: { isOpen: boolean; position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Cuerpo de válvula */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.25, 12]} />
        <meshStandardMaterial
          color={isOpen ? '#22c55e' : '#ef4444'}
          emissive={isOpen ? '#22c55e' : '#7f1d1d'}
          emissiveIntensity={isOpen ? 0.6 : 0.2}
          metalness={0.6}
        />
      </mesh>
      {/* Tapa de solenoide */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.14, 0.1, 0.14]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.7} />
      </mesh>
    </group>
  );
}

// =============================================================================
// Parcela 3D Completa
// =============================================================================
interface ParcelZoneProps {
  parcela: ParcelaDashboard;
  position: [number, number, number];
  onClick?: () => void;
}

function ParcelZone({ parcela, position, onClick }: ParcelZoneProps) {
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

  const cropId = parcela.cultivo.id;
  const nombreCorto = parcela.cultivo.nombre.split(' ')[0];
  const isOpen = parcela.valvula_estado === 'abierta';
  const phVal = parcela.ph_suelo ?? (cropId === 'arroz' ? 6.5 : cropId === 'tomate_rojo' ? 6.2 : 6.8);

  return (
    <group position={position}>
      {/* Terreno 3D con relieve/volumen (Caja 3D con profundidad de suelo) */}
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

      {/* Borde exterior de protección / cerca */}
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[2.85, 0.25, 3.95]} />
        <meshStandardMaterial color={hovered ? '#ffffff' : '#27272a'} roughness={0.9} />
      </mesh>

      {/* Representación 3D del Cultivo */}
      {cropId === 'cana_azucar' && <SugarCaneCrop />}
      {cropId === 'tomate_rojo' && <TomatoCrop />}
      {cropId === 'arroz' && <RiceCrop />}
      {/* Si es otro cultivo genérico */}
      {!['cana_azucar', 'tomate_rojo', 'arroz'].includes(cropId) && <TomatoCrop />}

      {/* Sonda de Sensor IoT clavadita en la parcela */}
      <SensorProbe3D statusColor={status.color} />

      {/* Válvula de riego con tubería */}
      <SolenoidValve3D isOpen={isOpen} position={[-1.15, 0.15, -1.7]} />

      {/* Aspersores / Partículas de agua cuando la válvula está abierta */}
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

      {/* Etiqueta Flotante de Telemetría de Sensores en Tiempo Real */}
      <Html position={[0, 1.7, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="bg-black/90 text-white px-3 py-1.5 rounded-xl text-xs whitespace-nowrap border border-white/15 shadow-2xl backdrop-blur-md flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-100">{nombreCorto}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md font-semibold text-white" style={{ backgroundColor: status.color }}>
              {status.label}
            </span>
          </div>
          <div className="text-[11px] text-zinc-300 font-medium flex items-center gap-2">
            <span>💧 {parcela.humedad_suelo.toFixed(0)}%</span>
            <span>·</span>
            <span>🌡️ {parcela.temperatura.toFixed(1)}°C</span>
            <span>·</span>
            <span>🧪 pH {phVal.toFixed(1)}</span>
          </div>
        </div>
      </Html>
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
      {/* Cilindro exterior transparente con aros de acero */}
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

      {/* Agua interna animada */}
      <mesh ref={waterRef} position={[0, -0.65 + (nivel / 100) * 1.3, 0]}>
        <cylinderGeometry args={[0.9, 0.9, Math.max(0.08, (nivel / 100) * 1.6), 24]} />
        <meshStandardMaterial
          color={isCritical ? '#ef4444' : '#2563eb'}
          transparent
          opacity={0.85}
          roughness={0.1}
        />
      </mesh>

      {/* Base de concreto */}
      <mesh position={[0, -0.95, 0]}>
        <cylinderGeometry args={[1.1, 1.1, 0.2, 24]} />
        <meshStandardMaterial color="#3f3f46" roughness={0.9} />
      </mesh>

      {/* Etiqueta de la Cisterna */}
      <Html position={[0, 1.35, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="bg-black/90 text-white px-3 py-1.2 rounded-xl text-xs font-semibold whitespace-nowrap border border-white/15 shadow-xl backdrop-blur-md">
          🚰 Cisterna: {nivel.toFixed(0)}%
        </div>
      </Html>
    </group>
  );
}

// Tuberías de conexión desde la Cisterna a cada Parcela
function WaterPipes() {
  return (
    <group>
      {/* Tubería principal subterránea/elevada hacia Caña */}
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
  onParcelaSelect?: (parcelaId: string) => void;
  selectedParcelaId?: string;
}

export default function TerrainScene3D({
  parcelas,
  tanqueNivel,
  onParcelaSelect,
}: TerrainScene3DProps) {
  return (
    <div className="relative w-full h-full min-h-[420px] md:min-h-[460px] rounded-xl overflow-hidden bg-[#18181b]">
      <Canvas
        shadows
        camera={{ position: [0, 9.2, 9.8], fov: 43 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#18181b']} />

        {/* Iluminación balanceada */}
        <ambientLight intensity={0.75} />
        <directionalLight
          position={[7, 14, 8]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-6, 6, -3]} intensity={0.4} color="#60a5fa" />

        {/* Suelo base de la maqueta agrícola */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, -0.16, 0]} receiveShadow>
          <planeGeometry args={[17, 9.5]} />
          <meshStandardMaterial color="#27272a" roughness={0.95} />
        </mesh>

        {/* Caminos de grava entre parcelas */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, -0.15, 0]} receiveShadow>
          <planeGeometry args={[17, 1.2]} />
          <meshStandardMaterial color="#3f3f46" roughness={0.9} />
        </mesh>

        {/* Renderizado de las 3 parcelas 3D */}
        {parcelas.map((p) => {
          const zoneKey = p.parcela.zona_3d || 'zona_media';
          return (
            <ParcelZone
              key={p.parcela.id}
              parcela={p}
              position={ZONE_POSITIONS[zoneKey] || [0, 0.25, 0]}
              onClick={() => onParcelaSelect?.(p.parcela.id)}
            />
          );
        })}

        {/* Cisterna volumétrica y tuberías */}
        <CisternAndPiping nivel={tanqueNivel} />
        <WaterPipes />

        {/* Controles orbitales con límite de ángulo para no ver bajo el suelo */}
        <OrbitControls
          enablePan={false}
          maxPolarAngle={Math.PI / 2.25}
          minDistance={7}
          maxDistance={18}
        />
      </Canvas>

      {/* Leyenda fija en la esquina inferior */}
      <div className="absolute bottom-3 left-3 bg-[#111111]/90 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 flex items-center gap-3 text-[11px] text-zinc-300 pointer-events-none">
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
