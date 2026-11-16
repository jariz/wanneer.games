"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Game } from "@/lib/game-types";
import { createArtworkRenderer, type ArtworkRenderer } from "@/lib/artwork-renderer";

const autoplayInterval = 10000;

function nextArtwork(game: Game, previous = game.artwork) {
  const alternatives = game.artworks.filter((image) => image !== previous);
  return alternatives[Math.floor(Math.random() * alternatives.length)] ?? previous;
}

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
  const games = lead ? [lead, ...backgrounds.filter((game) => game.id !== lead.id)] : backgrounds;
  // The index belongs to the current lead, so a new lead starts at its own artwork.
  const [position, setPosition] = useState<{ lead: number | undefined; index: number; images: Record<number, string | null> }>({ lead: lead?.id, index: 0, images: {} });
  const index = position.lead === lead?.id ? position.index : 0;
  const artwork = games.map((game) => position.images[game.id] ? { ...game, artwork: position.images[game.id] } : game);
  const step = (offset: number) => {
    if (!artwork.length) return;
    const next = (index + offset + artwork.length) % artwork.length;
    const game = artwork[next];
    setPosition({ lead: lead?.id, index: next, images: { ...position.images, [game.id]: nextArtwork(game) } });
  };
  const autoplay = !lead && artwork.length > 1;

  // Keyed on index, so stepping manually restarts the timer.
  useEffect(() => {
    if (!autoplay) return;
    const timer = setTimeout(() => {
      const next = (index + 1) % backgrounds.length;
      const game = backgrounds[next];
      setPosition({ lead: undefined, index: next, images: { ...position.images, [game.id]: nextArtwork(game, position.images[game.id] ?? game.artwork) } });
    }, autoplayInterval);
    return () => clearTimeout(timer);
  }, [autoplay, index, backgrounds, position.images]);

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
  const renderer = useRef<ArtworkRenderer | null>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-transparency: reduce)").matches) return;
    const created = createArtworkRenderer(canvasRef.current!, regionRef.current!);
    if (!created) return;
    renderer.current = created;
    document.documentElement.dataset.lensActive = "";
    let disposed = false;
    let destroyGlass: (() => void) | undefined;
    import("@/lib/liquid-glass").then(({ createLiquidGlass }) => {
      if (!disposed) destroyGlass = createLiquidGlass(canvasRef.current!);
    }).catch((error) => console.warn("Liquid glass unavailable:", error));
    return () => {
      disposed = true;
      destroyGlass?.();
      created.destroy();
      renderer.current = null;
      delete document.documentElement.dataset.lensActive;
    };
  }, []);

  useEffect(() => renderer.current?.setImage(active?.artwork ?? null), [active?.artwork]);

  return (
    <>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-x-0 top-0 -z-10 hidden w-full [:root[data-lens-active]_&]:block" aria-hidden="true" />
      <div
        ref={regionRef}
        className="pointer-events-none absolute inset-x-0 top-16 -z-10 aspect-video overflow-hidden phone:top-[76px] phone:h-[max(460px,calc(100svh_-_226px),56.25vw)]"
        aria-hidden="true"
        data-testid="backdrop"
      >
        <div className="absolute inset-0 brightness-[.82] [:root[data-lens-active]_&]:hidden">
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
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/30 to-transparent [:root[data-lens-active]_&]:hidden" />
      </div>
    </>
  );
}
