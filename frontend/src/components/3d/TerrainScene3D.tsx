'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ParcelaDashboard } from '@/types';

// =============================================================================
// Semáforo de Colores de Humedad
// =============================================================================
export const HUMIDITY_COLORS = {
  critico: '#ef4444',   // <35% Rojo
  bajo: '#f59e0b',      // 35-50% Amarillo / Ámbar
  optimo: '#22c55e',    // 50-75% Verde
  saturado: '#3b82f6',  // >75% Azul
};

export function getStatusFromHumidity(hum: number) {
  if (hum < 35) return { label: 'Crítico', color: HUMIDITY_COLORS.critico, key: 'critico' };
  if (hum < 50) return { label: 'Bajo', color: HUMIDITY_COLORS.bajo, key: 'bajo' };
  if (hum <= 75) return { label: 'Óptimo', color: HUMIDITY_COLORS.optimo, key: 'optimo' };
  return { label: 'Saturado', color: HUMIDITY_COLORS.saturado, key: 'saturado' };
}

// Posiciones espaciales en la maqueta 3D
const ZONE_POSITIONS: Record<string, [number, number, number]> = {
  zona_alta: [-3.2, 0.15, 0],   // Caña (Norte)
  zona_media: [0, 0.15, 0],     // Tomate (Centro)
  zona_baja: [3.2, 0.15, 0],    // Arroz (Sur)
};

const TANK_POSITION: [number, number, number] = [6.2, 0.8, -0.5];

// =============================================================================
// Parcela 3D Individual
// =============================================================================
interface ParcelMeshProps {
  parcela: ParcelaDashboard;
  position: [number, number, number];
  onClick?: () => void;
}

function ParcelMesh({ parcela, position, onClick }: ParcelMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const colorRef = useRef(new THREE.Color(getStatusFromHumidity(parcela.humedad_suelo).color));
  const [hovered, setHovered] = useState(false);

  const status = useMemo(() => getStatusFromHumidity(parcela.humedad_suelo), [parcela.humedad_suelo]);

  // Transición suave (lerp) del color al cambiar el valor
  useFrame(() => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      colorRef.current.lerp(new THREE.Color(status.color), 0.08);
      mat.color.copy(colorRef.current);
    }
  });

  const nombreCorto = parcela.cultivo.nombre.split(' ')[0];

  return (
    <group position={position}>
      {/* Parcela con bordes redondeados y relieve */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
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
        receiveShadow
        castShadow
      >
        <planeGeometry args={[2.7, 3.8]} />
        <meshStandardMaterial
          roughness={0.4}
          metalness={parcela.humedad_suelo > 75 ? 0.6 : 0.1}
        />
      </mesh>

      {/* Borde / Marco de la parcela */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[2.9, 4.0]} />
        <meshBasicMaterial color={hovered ? '#ffffff' : '#27272a'} />
      </mesh>

      {/* Riego animado (indicador si la válvula está abierta) */}
      {parcela.valvula_estado === 'abierta' && (
        <mesh position={[0, 0.3, 0]}>
          <ringGeometry args={[0.3, 0.45, 16]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Etiqueta HTML limpia encima de la parcela */}
      <Html position={[0, 1.2, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="bg-black/85 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide whitespace-nowrap border border-white/10 shadow-lg backdrop-blur-sm">
          {nombreCorto} {parcela.humedad_suelo.toFixed(0)}%
        </div>
      </Html>
    </group>
  );
}

// =============================================================================
// Cisterna 3D
// =============================================================================
function Tank3D({ nivel, position }: { nivel: number; position: [number, number, number] }) {
  const waterRef = useRef<THREE.Mesh>(null);
  const isCritical = nivel < 25;

  useFrame((state) => {
    if (waterRef.current) {
      waterRef.current.position.y = -0.7 + (nivel / 100) * 1.4 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
    }
  });

  return (
    <group position={position}>
      {/* Contenedor transparente de la cisterna */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 1.6, 24]} />
        <meshStandardMaterial
          color="#38bdf8"
          transparent
          opacity={0.35}
          roughness={0.1}
          metalness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Agua interna */}
      <mesh ref={waterRef} position={[0, -0.7 + (nivel / 100) * 1.4, 0]}>
        <cylinderGeometry args={[0.85, 0.85, Math.max(0.05, (nivel / 100) * 1.5), 24]} />
        <meshStandardMaterial
          color={isCritical ? '#ef4444' : '#2563eb'}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Etiqueta flotante */}
      <Html position={[0, 1.4, 0]} center style={{ pointerEvents: 'none' }}>
        <div className="bg-black/85 text-white px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap border border-white/10 shadow-lg backdrop-blur-sm">
          Cisterna {nivel.toFixed(0)}%
        </div>
      </Html>
    </group>
  );
}

// =============================================================================
// Componente Principal Escena 3D
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
    <div className="relative w-full h-full min-h-[380px] md:min-h-[440px] rounded-xl overflow-hidden bg-[#18181b]">
      {/* Canvas 3D */}
      <Canvas
        shadows
        camera={{ position: [0, 9.5, 9.5], fov: 42 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#18181b']} />

        {/* Luces */}
        <ambientLight intensity={0.85} />
        <directionalLight position={[6, 12, 6]} intensity={1.2} castShadow />

        {/* Base de la maqueta (suelo oscuro elegante) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, -0.05, 0]} receiveShadow>
          <planeGeometry args={[16, 8]} />
          <meshStandardMaterial color="#27272a" roughness={0.9} />
        </mesh>

        {/* Parcelas */}
        {parcelas.map((p) => {
          const zoneKey = p.parcela.zona_3d || 'zona_media';
          return (
            <ParcelMesh
              key={p.parcela.id}
              parcela={p}
              position={ZONE_POSITIONS[zoneKey] || [0, 0.15, 0]}
              onClick={() => onParcelaSelect?.(p.parcela.id)}
            />
          );
        })}

        {/* Cisterna */}
        <Tank3D nivel={tanqueNivel} position={TANK_POSITION} />

        {/* Controles de cámara limitados */}
        <OrbitControls
          enablePan={false}
          maxPolarAngle={Math.PI / 2.3}
          minDistance={7}
          maxDistance={18}
        />
      </Canvas>

      {/* Leyenda fija en la parte inferior */}
      <div className="absolute bottom-3 left-3 bg-[#111111]/90 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 flex items-center gap-4 text-[11px] text-zinc-300 pointer-events-none">
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
