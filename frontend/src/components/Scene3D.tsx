"use client";

import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { ReactNode } from "react";

type Scene3DProps = {
  children: ReactNode;
};

export default function Scene3D({ children }: Scene3DProps) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas shadows camera={{ position: [0, 0, 8], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
        {children}
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}


