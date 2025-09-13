"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import * as THREE from "three";

type Vector3Tuple = [number, number, number];

export type Hero3DProps = {
  bodyColor?: string;
  position?: Vector3Tuple;
  index?: number;
  pageId?: string;
};

export default function Hero3D({ bodyColor = "#34D399", position = [0, 0, 0], index = 0, pageId }: Hero3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(new THREE.Euler());
  const targetScale = useRef(1);
  const [hovered, setHovered] = useState(false);
  const select = useSceneStore((s) => s.select);
  const openPage = useSceneStore((s) => s.openPage);

  // Geometries
  const bodyGeometry = useMemo(() => new THREE.CylinderGeometry(0.8, 0.8, 2, 32), []);
  const eyeGeometry = useMemo(() => new THREE.SphereGeometry(0.2, 24, 16), []);
  const pupilGeometry = useMemo(() => new THREE.SphereGeometry(0.08, 16, 12), []);

  // Materials
  const bodyMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.3, metalness: 0.25 }),
    [bodyColor]
  );
  const eyeMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6, metalness: 0 }),
    []
  );
  const pupilMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#111111", roughness: 0.6, metalness: 0 }),
    []
  );

  useFrame(({ mouse }, delta) => {
    const maxTilt = Math.PI / 6; // 30deg
    const targetX = -mouse.y * maxTilt;
    const targetY = mouse.x * maxTilt;
    targetRotation.current.set(targetX, targetY, 0);
    targetScale.current = hovered ? 1.08 : 1.0;

    if (groupRef.current) {
      groupRef.current.rotation.x = THREE.MathUtils.damp(
        groupRef.current.rotation.x,
        targetRotation.current.x,
        5,
        delta
      );
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y,
        targetRotation.current.y,
        5,
        delta
      );
      groupRef.current.rotation.z = THREE.MathUtils.damp(
        groupRef.current.rotation.z,
        0,
        5,
        delta
      );
      const s = THREE.MathUtils.damp(groupRef.current.scale.x, targetScale.current, 6, delta);
      groupRef.current.scale.setScalar(s);
    }
  });

  return (
    <group
      ref={groupRef}
      position={position as unknown as THREE.Vector3 | undefined}
      castShadow
      receiveShadow
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        select(index, new THREE.Vector3(position[0], position[1], position[2]));
        if (pageId) openPage(pageId);
      }}
    >
      {/* Body */}
      <mesh geometry={bodyGeometry} material={bodyMaterial} castShadow receiveShadow />

      {/* Eyes */}
      <mesh geometry={eyeGeometry} material={eyeMaterial} position={[-0.35, 0.3, 0.8]} castShadow />
      <mesh geometry={eyeGeometry} material={eyeMaterial} position={[0.35, 0.3, 0.8]} castShadow />

      {/* Pupils */}
      <mesh geometry={pupilGeometry} material={pupilMaterial} position={[-0.35, 0.3, 1.03]} />
      <mesh geometry={pupilGeometry} material={pupilMaterial} position={[0.35, 0.3, 1.03]} />
    </group>
  );
}

