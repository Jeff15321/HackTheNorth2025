"use client";

import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import * as THREE from "three";

type Vector3Tuple = [number, number, number];

export type Hero3DProps = {
  bodyColor?: string;
  position?: Vector3Tuple;
  index?: number;
  pageId?: string;
  zoomActive?: boolean;
  glbPath?: string;
  xRotationLock?: number;
};

export default function Hero3D({ bodyColor = "#34D399", position = [0, 0, 0], index = 0, pageId, zoomActive = false, glbPath, xRotationLock = 0 }: Hero3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(new THREE.Euler());
  const targetScale = useRef(0);
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
    // Focused: behave as before (full mouse tilt on X/Y, Z locked)
    // Unfocused: lock X to xRotationLock, Z to 0, allow Y tilt only
    const baseX = xRotationLock || 0;
    const targetX = zoomActive ? (-mouse.y * maxTilt) : baseX;
    const targetY = zoomActive ? (mouse.x * maxTilt + 1.2) : (mouse.x * maxTilt);
    const targetZ = 0;
    targetRotation.current.set( targetX, targetY, targetZ);
    const baseScale = zoomActive ? 0.5 : 1.5; // shrink when focused (zoomActive)
    const hoverActive = !zoomActive && hovered;
    targetScale.current = hoverActive ? baseScale * 1.1 : baseScale;

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
        targetRotation.current.z,
        5,
        delta
      );
      const s = THREE.MathUtils.damp(groupRef.current.scale.x, targetScale.current, 6, delta);
      groupRef.current.scale.setScalar(s);
    }
  });
  // Compute declarative position with x-shift based on zoomActive
  const adjustedPosition = useMemo(() => {
    const shift = zoomActive ? -1.75 : 0;
    return [position[0] + shift, position[1], position[2]] as [number, number, number];
  }, [position, zoomActive]);

  return (
    <group
      ref={groupRef}
      position={adjustedPosition as unknown as THREE.Vector3 | undefined}
      castShadow
      receiveShadow
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!zoomActive) setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        if (!zoomActive) setHovered(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        // Clicking character 5 is disabled (no-op). Others open their pages.
        if (index === 4) return;
        select(index, new THREE.Vector3(position[0], position[1], position[2]));
        if (pageId) openPage(pageId);
      }}
    >
      {glbPath ? (
        <GLBModel path={glbPath} />
      ) : (
        <>
          {/* Body */}
          <mesh geometry={bodyGeometry} material={bodyMaterial} castShadow receiveShadow />
          {/* Eyes */}
          <mesh geometry={eyeGeometry} material={eyeMaterial} position={[-0.35, 0.3, 0.8]} castShadow />
          <mesh geometry={eyeGeometry} material={eyeMaterial} position={[0.35, 0.3, 0.8]} castShadow />
          {/* Pupils */}
          <mesh geometry={pupilGeometry} material={pupilMaterial} position={[-0.35, 0.3, 1.03]} />
          <mesh geometry={pupilGeometry} material={pupilMaterial} position={[0.35, 0.3, 1.03]} />
        </>
      )}
    </group>
  );
}

function GLBModel({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  return <primitive object={scene} />;
}

