"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Vibrant } from "node-vibrant/browser";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { FlowingGradient, Shader } from "shaders/react";

const BASE = "#14161c";
const RENDER_SCALE = 0.6;
const SEAM_MASK = "linear-gradient(to right, #000 0 46%, transparent)";
const motionQuery = "(prefers-reduced-motion: reduce)";
const COLOR_FADE_MS = 1000;
type Colors = [string, string, string];

function mixHex(from: string, to: string, progress: number) {
  return "#" + [1, 3, 5].map((offset) => {
    const start = parseInt(from.slice(offset, offset + 2), 16);
    const end = parseInt(to.slice(offset, offset + 2), 16);
    return Math.round(start + (end - start) * progress).toString(16).padStart(2, "0");
  }).join("");
}

function useBlendedColors(b: string, c: string, d: string, reducedMotion: boolean): Colors {
  const [colors, setColors] = useState<Colors>([BASE, BASE, BASE]);
  const current = useRef(colors);

  useEffect(() => {
    // Start from the displayed colors, even when another switch interrupts a fade.
    const from = current.current;
    const target: Colors = [b, c, d];
    const started = performance.now();
    let frame: number;
    function tick(now: number) {
      const progress = reducedMotion ? 1 : Math.min((now - started) / COLOR_FADE_MS, 1);
      const eased = progress * progress * (3 - 2 * progress);
      const next = target.map((color, i) => mixHex(from[i], color, eased)) as Colors;
      current.current = next;
      setColors(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [b, c, d, reducedMotion]);

  return colors;
}

function subscribeMotion(onChange: () => void) {
  const media = matchMedia(motionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

export default function HeroFlow({ src }: { src: string | null | undefined }) {
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    () => matchMedia(motionQuery).matches,
    () => true,
  );
  const { data: palette } = useQuery({
    queryKey: ["art-palette", src],
    queryFn: () => Vibrant.from(src!).getPalette(),
    enabled: !!src,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    retry: false,
  });
  const vibrant = palette?.Vibrant?.hex ?? BASE;
  const dark = palette?.DarkVibrant?.hex ?? vibrant;
  const light = palette?.LightVibrant?.hex ?? dark;
  const [b, c, d] = useBlendedColors(vibrant, dark, light, reducedMotion);

  return (
    <div className="absolute inset-0" data-testid="hero-flow">
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          maskImage: SEAM_MASK,
          WebkitMaskImage: SEAM_MASK,
          backgroundColor: BASE,
          backgroundImage: [
            `radial-gradient(120% 100% at 2% 82%, ${b} 0%, ${b}00 55%)`,
            `radial-gradient(100% 90% at 28% 6%, ${d} 0%, ${d}00 52%)`,
            `radial-gradient(85% 85% at 40% 50%, ${c} 0%, ${c}00 50%)`,
          ].join(", "),
          backgroundBlendMode: "screen",
        }}
      >
        {!reducedMotion && (
          <Shader
            disableTelemetry
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: `${RENDER_SCALE * 100}%`,
              height: `${RENDER_SCALE * 100}%`,
              transform: `scale(${1 / RENDER_SCALE})`,
            }}
          >
            <FlowingGradient
              colorA={BASE}
              colorB={b}
              colorC={c}
              colorD={d}
              colorSpace="oklch"
              speed={0.5}
              distortion={0.5}
            />
          </Shader>
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/30 to-transparent" />
    </div>
  );
}
