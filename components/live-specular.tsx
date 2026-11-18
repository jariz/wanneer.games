"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LightEdge, Shader, TimeTrail } from "shaders/react";

const preference = "(prefers-reduced-motion: reduce), (prefers-reduced-transparency: reduce)";
function subscribe(onChange: () => void) {
  const media = matchMedia(preference);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export default function LiveSpecular({ onCanvas }: { onCanvas: (canvas: HTMLCanvasElement | null) => void }) {
  const reduced = useSyncExternalStore(subscribe, () => matchMedia(preference).matches, () => true);
  const [ready, setReady] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    onCanvas(ready && !reduced ? container.current?.querySelector("canvas") ?? null : null);
    return () => onCanvas(null);
  }, [ready, reduced, onCanvas]);
  if (reduced) return null;

  return (
    <div ref={container} className="pointer-events-none absolute inset-0 overflow-hidden [:root[data-lens-active]_&]:opacity-0" data-testid="live-specular" aria-hidden="true" data-liquid-ignore="">
      <Shader
        disableTelemetry
        toneMapping="aces"
        onReady={() => setReady(true)}
        onUnavailable={() => setReady(false)}
        data-ready={ready || undefined}
        className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-[2000ms] data-[ready]:opacity-100"
      >
        <TimeTrail motionThreshold={0.01} tint="#bebf5c" trailLength={0.18} trailOpacity={0.11} trailSource="alpha" zoom={0.98}>
          <LightEdge
            bloom={0.28}
            center={{ x: 0.5, y: 0.5 }}
            colorSpace="oklab"
            intensity={0.64}
            shape={{ type: "hemisphere3D", radius: 0.89, cut: 0, rotX: 30, rotY: 0, rotZ: 0 }}
            shapeType="hemisphere3D"
            smoke={0.64}
            smokeSize={0}
            softness={0.89}
            spots={1}
            spotSize={0.28}
            stops={[{ color: "#8cd65c", position: 0 }, { color: "#bebf5c", position: 0.5 }, { color: "#f0a85c", position: 1 }]}
            thickness={0.01}
          />
        </TimeTrail>
      </Shader>
    </div>
  );
}
