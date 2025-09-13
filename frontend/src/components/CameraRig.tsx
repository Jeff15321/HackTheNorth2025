"use client";

import { useEffect, useMemo } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export type CameraRigProps = {
  /** World position the camera should look at and align x/y with */
  target?: THREE.Vector3 | null;
  /** Z offset from the target (camera will be placed at target.z + zOffset) */
  zOffset?: number; // positive values move camera closer on -Z if target.z is 0
  /** Damping strength for smooth motion */
  damping?: number;
  /** When no target is provided, move camera toward this world position */
  idlePosition?: THREE.Vector3;
  /** When no target is provided, look at this world position (defaults to origin) */
  idleLookAt?: THREE.Vector3;
};

/**
 * Smoothly moves the camera to align x/y with `target` and position z at `target.z + zOffset`.
 * Also orients the camera to look at the `target`.
 */
export default function CameraRig({ target, zOffset = 4, damping = 6, idlePosition, idleLookAt }: CameraRigProps) {
  const { camera } = useThree();
  const storeIdle = useSceneStore((s) => s.idleCameraPos);

  // Mutable working vectors to avoid allocations per frame
  const lookAtTarget = useMemo(() => new THREE.Vector3(), []);
  const origin = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useEffect(() => {
    // If target changes abruptly, no special handling needed; damping will interpolate.
  }, [target]);

  useFrame((_, delta) => {
    if (target) {
      const desiredX = target.x;
      const desiredY = target.y;
      const desiredZ = target.z + zOffset;

      camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredX, damping, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredY, damping, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredZ, damping, delta);

      lookAtTarget.lerp(target, 1 - Math.exp(-damping * delta));
      camera.lookAt(lookAtTarget);
      return;
    }

    const idle = idlePosition ?? storeIdle;
    if (idle) {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, idle.x, damping, delta);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, idle.y, damping, delta);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, idle.z, damping, delta);

      const lookGoal = idleLookAt ?? origin;
      lookAtTarget.lerp(lookGoal, 1 - Math.exp(-damping * delta));
      camera.lookAt(lookAtTarget);
    }
  });

  return null;
}


