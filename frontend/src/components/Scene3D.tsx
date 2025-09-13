"use client";

import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { ReactNode } from "react";

type Scene3DProps = {
  children: ReactNode;
  mini?: boolean;
};

export default function Scene3D({ children, mini = false }: Scene3DProps) {
  const containerStyle = mini
    ? { position: "fixed" as const, top: 0, right: 0, width: "20%", height: "20%", zIndex: 40 }
    : { width: "100%", height: "100%",  top: 0, right: 0, position: "relative" as const };
  return (
    <div style={containerStyle}>
      <Canvas shadows camera={{ position: [0, 0, 8], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
        {children}
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}


