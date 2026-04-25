"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import * as THREE from "three";

function MeshNodes() {
  const groupRef = useRef<THREE.Group>(null);
  const lineRef = useRef<THREE.LineSegments>(null);

  const { positions, linePositions } = useMemo(() => {
    const count = 80;
    const pos = new Float32Array(count * 3);
    const spread = 14;
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread;
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
    }

    // Connect nearby nodes
    const lines: number[] = [];
    const threshold = 3.5;
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < threshold) {
          lines.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
          lines.push(pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
        }
      }
    }

    return { positions: pos, linePositions: new Float32Array(lines) };
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      groupRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#A78BFA"
          transparent
          opacity={0.8}
          sizeAttenuation
        />
      </points>
      <lineSegments ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#A78BFA" transparent opacity={0.06} />
      </lineSegments>
      {/* Highlight a few nodes as larger spheres — violet primary */}
      {[0, 5, 12, 20, 35, 48].map((i) => (
        <Float key={i} speed={1.5} rotationIntensity={0} floatIntensity={0.5}>
          <mesh
            position={[
              positions[i * 3],
              positions[i * 3 + 1],
              positions[i * 3 + 2],
            ]}
          >
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshBasicMaterial color="#A78BFA" transparent opacity={0.9} />
          </mesh>
          <mesh
            position={[
              positions[i * 3],
              positions[i * 3 + 1],
              positions[i * 3 + 2],
            ]}
          >
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshBasicMaterial color="#A78BFA" transparent opacity={0.12} />
          </mesh>
        </Float>
      ))}
      {/* Rose accent nodes */}
      {[8, 18, 30, 42, 55].map((i) => (
        <Float key={`rose-${i}`} speed={1.2} rotationIntensity={0} floatIntensity={0.4}>
          <mesh
            position={[
              positions[i * 3],
              positions[i * 3 + 1],
              positions[i * 3 + 2],
            ]}
          >
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color="#F43F5E" transparent opacity={0.7} />
          </mesh>
          <mesh
            position={[
              positions[i * 3],
              positions[i * 3 + 1],
              positions[i * 3 + 2],
            ]}
          >
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color="#F43F5E" transparent opacity={0.08} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

export default function NetworkMesh() {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.5} />
        <MeshNodes />
        <Stars
          radius={50}
          depth={50}
          count={1500}
          factor={2}
          saturation={0.2}
          fade
          speed={0.4}
        />
      </Canvas>
    </div>
  );
}
