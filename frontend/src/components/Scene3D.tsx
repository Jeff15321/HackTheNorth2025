"use client";

import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { ReactNode } from "react";

type Scene3DProps = {
  children: ReactNode;
  backgroundUrl?: string;
};

export default function Scene3D({ children, backgroundUrl }: Scene3DProps) {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {backgroundUrl && (
        <div style={{ position: "absolute", inset: 0, zIndex: -1 }}>
          <img src={backgroundUrl} alt="scene background" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}
      <Canvas shadows camera={{ position: [0, 0, 8], fov: 20 }} gl={{ alpha: true }} style={{ background: "transparent" }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
        {children}
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}


