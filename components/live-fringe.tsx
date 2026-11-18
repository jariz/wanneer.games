"use client";

import { useState, useSyncExternalStore } from "react";
import { DiffuseBlur, Group, LinearGradient, Shader, Strands, WaveletNoise } from "shaders/react";

const preference = "(prefers-reduced-motion: reduce), (prefers-reduced-transparency: reduce)";
function subscribe(onChange: () => void) {
  const media = matchMedia(preference);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export default function LiveFringe() {
  const reduced = useSyncExternalStore(subscribe, () => matchMedia(preference).matches, () => true);
  const [ready, setReady] = useState(false);
  if (reduced) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" data-testid="live-fringe" aria-hidden="true" data-liquid-ignore="">
      <Shader
        disableTelemetry
        toneMapping="aces"
        onReady={() => setReady(true)}
        data-ready={ready || undefined}
        className="absolute left-0 top-0 h-[60%] w-[60%] origin-top-left scale-[1.666667] opacity-0 transition-opacity duration-[2000ms] data-[ready]:opacity-[.15]"
      >
        <LinearGradient id="fringeFade" visible={false} colorA="#ffffff" colorB="#000000" start={{ x: 0.5, y: 0.2 }} end={{ x: 0.5, y: 0.85 }} />
        <Strands
          id="fringeStrands"
          amplitude={1.8}
          colorSpeed={0}
          colorVariance={0}
          frequency={0.5}
          lineCount={5}
          lineWidth={0.15}
          softness={1}
          speed={0.2}
          spread={0.75}
          stops={[{ color: "#00e5ff", position: 0 }, { color: "#ff5fa2", position: 1 }]}
          visible={false}
        />
        <Group maskSource="fringeFade" maskType="luminance">
          <WaveletNoise
            balance={{ type: "map", source: "fringeStrands", channel: "alpha", inputMax: 1, inputMin: 0, outputMax: 1, outputMin: -0.65 }}
            colorSpace="oklab"
            contrast={1.9}
            detail={1.14}
            scale={4.1}
            speed={0.5}
            stops={[{ color: "#c0ec92", position: 0 }, { color: "#043fed", position: 0.4256 }, { color: "#000000", position: 1 }]}
          />
          <DiffuseBlur intensity={12} />
        </Group>
      </Shader>
    </div>
  );
}
