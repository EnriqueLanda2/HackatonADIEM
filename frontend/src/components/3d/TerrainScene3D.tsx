'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { ParcelaDashboard } from '@/types';
import { getColorHumedad } from '@/lib/crop-profiles';

// =============================================================================
// Componente: Terreno 3D con mapeo de humedad
// =============================================================================

interface TerrainZoneProps {
  parcela: ParcelaDashboard;
  position: [number, number, number];
  size: [number, number];
  onClick?: () => void;
  selected?: boolean;
}

function TerrainZone({ parcela, position, size, onClick, selected }: TerrainZoneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const colorRef = useRef(new THREE.Color());

  // Calcular color basado en humedad
  const targetColor = useMemo(() => {
    return getColorHumedad(parcela.humedad_suelo, parcela.cultivo);
  }, [parcela.humedad_suelo, parcela.cultivo]);

  // Animación suave de color
  useFrame(() => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      colorRef.current.lerp(new THREE.Color(targetColor), 0.05);
      material.color.copy(colorRef.current);
    }
  });

  // Generar geometría con variación de altura (low-poly terrain)
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(size[0], size[1], 12, 12);
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      // Variación de altura basada en posición (simulando relieve)
      const height =
        Math.sin(x * 0.5) * 0.3 +
        Math.cos(y * 0.7) * 0.2 +
        Math.random() * 0.1;
      posAttr.setZ(i, height + position[1] * 0.3);
    }
    geo.computeVertexNormals();
    return geo;
  }, [size, position]);

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={onClick}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={targetColor}
          roughness={0.8}
          metalness={0.1}
          flatShading
        />
      </mesh>

      {/* Etiqueta del cultivo y sensores */}
      <Html
        position={[0, 1.5, 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`bg-black/85 text-white px-3 py-1.5 rounded-lg text-xs whitespace-nowrap backdrop-blur-sm border ${
            selected ? 'border-yellow-400' : 'border-white/20'
          }`}
        >
          <div className="font-bold flex items-center gap-1.5">
            <span>{parcela.tiene_cultivo && parcela.cultivo ? parcela.cultivo.icono : '🍂'}</span>
            <span>{parcela.parcela.nombre}</span>
            <span
              className={`text-[8px] px-1.5 py-0.2 rounded font-normal ${
                parcela.tiene_cultivo && parcela.cultivo
                  ? 'bg-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/30 text-amber-300'
              }`}
            >
              {parcela.tiene_cultivo && parcela.cultivo ? 'Con cultivo' : 'Sin cultivo'}
            </span>
          </div>
          <div className="text-[10px] opacity-80 mt-0.5">
            💧 Suelo: {parcela.humedad_suelo.toFixed(0)}% | 🌡️ {parcela.temperatura.toFixed(1)}°C | 🧪 pH {(parcela.ph_suelo ?? 6.8).toFixed(1)}
          </div>
        </div>
      </Html>

      {/* Borde de selección */}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <planeGeometry args={[size[0] + 0.2, size[1] + 0.2]} />
          <meshBasicMaterial
            color="#FFD700"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}

// =============================================================================
// Componente: Marcador de Válvula 3D
// =============================================================================

interface ValveMarkerProps {
  position: [number, number, number];
  isOpen: boolean;
  label: string;
}

function ValveMarker({ position, isOpen, label }: ValveMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);

  // Animación de pulsación cuando está abierta
  useFrame((state) => {
    if (meshRef.current) {
      if (isOpen) {
        meshRef.current.scale.setScalar(
          1 + Math.sin(state.clock.elapsedTime * 3) * 0.15
        );
      } else {
        meshRef.current.scale.setScalar(1);
      }
    }

    // Animación de partículas de agua
    if (particlesRef.current && isOpen) {
      particlesRef.current.rotation.y += 0.02;
      const positions = particlesRef.current.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        let y = positions.getY(i);
        y -= 0.03;
        if (y < -0.5) y = 1;
        positions.setY(i, y);
      }
      positions.needsUpdate = true;
    }
  });

  // Partículas de agua
  const particleGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(30 * 3);
    for (let i = 0; i < 30; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.8;
      positions[i * 3 + 1] = Math.random() * 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  return (
    <group position={position}>
      {/* Cuerpo de la válvula */}
      <mesh ref={meshRef} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 0.4, 8]} />
        <meshStandardMaterial
          color={isOpen ? '#4CAF50' : '#F44336'}
          emissive={isOpen ? '#4CAF50' : '#F44336'}
          emissiveIntensity={isOpen ? 0.3 : 0.1}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Indicador superior */}
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial
          color={isOpen ? '#00E676' : '#FF1744'}
          emissive={isOpen ? '#00E676' : '#FF1744'}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Partículas de agua (solo cuando abierta) */}
      {isOpen && (
        <points ref={particlesRef} geometry={particleGeometry}>
          <pointsMaterial
            color="#64B5F6"
            size={0.05}
            transparent
            opacity={0.6}
          />
        </points>
      )}

      {/* Etiqueta */}
      <Html position={[0, 0.7, 0]} center distanceFactor={6}>
        <div
          className={`px-2 py-1 rounded text-[10px] font-bold ${
            isOpen
              ? 'bg-green-500/90 text-white'
              : 'bg-red-500/90 text-white'
          }`}
        >
          {isOpen ? '💧 ABIERTA' : '🔒 CERRADA'}
        </div>
      </Html>
    </group>
  );
}

// =============================================================================
// Componente: Tanque de Agua 3D
// =============================================================================

interface WaterTankProps {
  nivel: number;
  capacidad: number;
  position: [number, number, number];
}

function WaterTank({ nivel, position }: WaterTankProps) {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (waterRef.current) {
      // Ondulación suave del agua
      waterRef.current.position.y =
        -0.5 + (nivel / 100) * 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
    }
  });

  const nivelCritico = nivel < 20;
  const nivelAlerta = nivel < 35;

  return (
    <group position={position}>
      {/* Estructura del tanque (cilindro transparente) */}
      <mesh>
        <cylinderGeometry args={[0.6, 0.6, 2, 16]} />
        <meshStandardMaterial
          color="#90A4AE"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Agua dentro del tanque */}
      <mesh ref={waterRef} position={[0, -0.5 + (nivel / 100) * 1, 0]}>
        <cylinderGeometry args={[0.55, 0.55, (nivel / 100) * 2, 16]} />
        <meshStandardMaterial
          color={nivelCritico ? '#F44336' : nivelAlerta ? '#FF9800' : '#2196F3'}
          transparent
          opacity={0.7}
          metalness={0.1}
          roughness={0.1}
        />
      </mesh>

      {/* Etiqueta */}
      <Html position={[0, 1.5, 0]} center distanceFactor={8}>
        <div
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
            nivelCritico
              ? 'bg-red-600 text-white animate-pulse'
              : nivelAlerta
              ? 'bg-orange-500 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          🏗️ Cisterna: {nivel.toFixed(0)}%
        </div>
      </Html>
    </group>
  );
}

// =============================================================================
// Componente Principal: Escena 3D del Terreno
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
  tanqueCapacidad,
  onParcelaSelect,
  selectedParcelaId,
}: TerrainScene3DProps) {
  // Posiciones predefinidas para las 3 zonas
  const zonePositions: Record<string, [number, number, number]> = {
    zona_alta: [-3, 0.8, 0],
    zona_media: [0, 0.3, 0],
    zona_baja: [3, -0.2, 0],
  };

  const valvePositions: Record<string, [number, number, number]> = {
    zona_alta: [-3, 1.8, -2],
    zona_media: [0, 1.3, -2],
    zona_baja: [3, 0.8, -2],
  };

  return (
    <div className="w-full h-[500px] md:h-[600px] rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-sky-900 to-sky-700">
      <Canvas
        shadows
        camera={{ position: [0, 8, 10], fov: 50 }}
        gl={{ antialias: true }}
      >
        {/* Iluminación */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-5, 5, -5]} intensity={0.3} color="#FFE0B2" />

        {/* Cielo */}
        <Environment preset="sunset" />

        {/* Terreno por parcela */}
        {parcelas.map((p, idx) => {
          const zone = p.parcela.zona_3d || 'zona_media';
          const basePos = zonePositions[zone] || [0, 0, 0];
          const sameZoneIdx = parcelas.slice(0, idx).filter(
            (item) => (item.parcela.zona_3d || 'zona_media') === zone
          ).length;
          const pos: [number, number, number] = [
            basePos[0],
            basePos[1],
            basePos[2] + sameZoneIdx * 4.5,
          ];

          return (
            <TerrainZone
              key={p.parcela.id}
              parcela={p}
              position={pos}
              size={[3, 4]}
              onClick={() => onParcelaSelect?.(p.parcela.id)}
              selected={selectedParcelaId === p.parcela.id}
            />
          );
        })}

        {/* Válvulas */}
        {parcelas.map((p, idx) => {
          const zone = p.parcela.zona_3d || 'zona_media';
          const basePos = valvePositions[zone] || [0, 1, -2];
          const sameZoneIdx = parcelas.slice(0, idx).filter(
            (item) => (item.parcela.zona_3d || 'zona_media') === zone
          ).length;
          const pos: [number, number, number] = [
            basePos[0],
            basePos[1],
            basePos[2] + sameZoneIdx * 4.5,
          ];

          return (
            <ValveMarker
              key={`valve-${p.parcela.id}`}
              position={pos}
              isOpen={p.valvula_estado === 'abierta'}
              label={p.parcela.nombre}
            />
          );
        })}

        {/* Tanque de agua */}
        <WaterTank
          nivel={tanqueNivel}
          capacidad={tanqueCapacidad}
          position={[6, 0, -3]}
        />

        {/* Plano de suelo base */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.5, 0]}
          receiveShadow
        >
          <planeGeometry args={[20, 15]} />
          <meshStandardMaterial color="#5D4037" roughness={1} />
        </mesh>

        {/* Controles de órbita */}
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          maxPolarAngle={Math.PI / 2.2}
          minDistance={5}
          maxDistance={20}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}
