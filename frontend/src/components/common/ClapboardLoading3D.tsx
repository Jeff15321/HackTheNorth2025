"use client";

import Scene3D from "@/components/Scene3D";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type JumpingGLBProps = {
  path: string;
  position?: [number, number, number];
  phase?: number;
  scale?: number;
  amplitude?: number; // jump height
};

function JumpingGLB({ path, position = [0, 0, 0], phase = 0, scale = 1, amplitude = 1 }: JumpingGLBProps) {
  const { scene } = useGLTF(path);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<THREE.Group>(null);
  const base = useMemo(() => new THREE.Vector3(position[0] || 0, position[1] || 0, position[2] || 0), [position]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const y = Math.max(0, Math.sin(t * 3 + phase)) * amplitude;
    if (groupRef.current) groupRef.current.position.set(base.x, base.y + y, base.z);
  });

  return (
    <group ref={groupRef} position={position as unknown as THREE.Vector3} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}

export default function ClapboardLoading3D() {
  // Smaller scale (~5x smaller) and closer spacing
  const s = 0.18;
  const z = -5.0;
  const y = -0.3; // sit near the bottom edge of the viewport
  const dx = 0.4; // closer together
  return (
    <div className="w-full h-screen relative bottom-[40vh]">
      <Scene3D>
        <JumpingGLB path="/glb/character1.glb" position={[-dx, y, z]} phase={0} scale={s} amplitude={0.4} />
        <JumpingGLB path="/glb/character2.glb" position={[0, y, z]} phase={0.6} scale={s} amplitude={0.4} />
        <JumpingGLB path="/glb/character3.glb" position={[dx, y, z]} phase={1.2} scale={s} amplitude={0.4} />
      </Scene3D>

      <div className="absolute inset-x-0 bottom-3 text-center">
        <div style={{ fontSize: "30px" }} className="inline-block rounded-xl bg-black/50 px-9 py-2 text-2xl text-white tracking-wide">Loading…</div>
      </div>
    </div>
  );
}

useGLTF.preload("/glb/character1.glb");
useGLTF.preload("/glb/character2.glb");
useGLTF.preload("/glb/character3.glb");


