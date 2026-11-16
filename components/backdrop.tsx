"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Game } from "@/lib/game-types";
import { createLensRenderer, type LensRenderer } from "@/lib/lens-renderer";

const autoplayInterval = 5000;

type BackdropState = {
  artwork: Game[];
  active: Game | undefined;
  step: (offset: number) => void;
  pin: (game: Game | null) => void;
};
const BackdropContext = createContext<BackdropState | null>(null);

export function useBackdrop() {
  const backdrop = useContext(BackdropContext);
  if (!backdrop) throw new Error("useBackdrop requires BackdropProvider");
  return backdrop;
}

// Shows a game's artwork while mounted, e.g. the game chosen in the planner.
export function usePinnedBackdrop(game: Game | null) {
  const { pin } = useBackdrop();
  useEffect(() => {
    pin(game?.artwork ? game : null);
    return () => pin(null);
  }, [game, pin]);
}

// A pinned game leads and stays put; otherwise the backgrounds rotate.
export function BackdropProvider({ backgrounds, featured, children }: { backgrounds: Game[]; featured: Game | null; children: ReactNode }) {
  const [pinned, pin] = useState<Game | null>(null);
  const lead = pinned ?? featured;
  const artwork = lead ? [lead, ...backgrounds.filter((game) => game.id !== lead.id)] : backgrounds;
  // The index belongs to the current lead, so a new lead starts at its own artwork.
  const [position, setPosition] = useState({ lead: lead?.id, index: 0 });
  const index = position.lead === lead?.id ? position.index : 0;
  const step = (offset: number) => setPosition({ lead: lead?.id, index: (index + offset + artwork.length) % artwork.length });
  const autoplay = !lead && artwork.length > 1;

  // Keyed on index, so stepping manually restarts the timer.
  useEffect(() => {
    if (!autoplay) return;
    const timer = setTimeout(() => setPosition({ lead: undefined, index: (index + 1) % artwork.length }), autoplayInterval);
    return () => clearTimeout(timer);
  }, [autoplay, index, artwork.length]);

  return (
    <BackdropContext value={{ artwork, active: artwork[index], step, pin }}>
      {children}
    </BackdropContext>
  );
}

export function Backdrop() {
  const { artwork, active } = useBackdrop();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const renderer = useRef<LensRenderer | null>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-transparency: reduce)").matches) return;
    const created = createLensRenderer(canvasRef.current!, regionRef.current!);
    if (!created) return;
    renderer.current = created;
    document.documentElement.dataset.lensActive = "";
    return () => {
      created.destroy();
      renderer.current = null;
      delete document.documentElement.dataset.lensActive;
    };
  }, []);

  useEffect(() => renderer.current?.setImage(active?.artwork ?? null), [active]);

  return (
    <>
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 -z-10 hidden size-full [:root[data-lens-active]_&]:block" aria-hidden="true" />
      <div
        ref={regionRef}
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[max(484px,100svh)] overflow-hidden phone:h-[max(536px,100svh)]"
        aria-hidden="true"
        data-testid="backdrop"
      >
        <div className="absolute inset-0 brightness-[.55] saturate-50 [:root[data-lens-active]_&]:hidden">
          {artwork.map((game) => (
            <div
              key={game.id}
              className="absolute inset-0 scale-[1.035] bg-cover bg-center opacity-0 transition-[opacity,transform] duration-1000 data-[active]:scale-100 data-[active]:opacity-100"
              data-active={game.id === active?.id || undefined}
              data-game={game.name}
              style={{ backgroundImage: `url("${game.artwork}")` }}
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-canvas/90 via-canvas/50 to-canvas/20 [:root[data-lens-active]_&]:hidden" />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/30 to-canvas/30 [:root[data-lens-active]_&]:hidden" />
      </div>
    </>
  );
}
