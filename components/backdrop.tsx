"use client";

import { createContext, useContext, useEffect, useMemo, useCallback, useRef, useState, type ReactNode } from "react";
import type { Game } from "@/lib/game-types";
import { createArtworkRenderer, type ArtworkRenderer } from "@/lib/artwork-renderer";
import { advanceArtwork, type ArtworkPosition } from "@/lib/artwork-slideshow";
import dynamic from "next/dynamic";

const LiveSpecular = dynamic(() => import("./live-specular"), { ssr: false });

const autoplayInterval = 10000;

type BackdropState = {
  artwork: Game[];
  active: Game | undefined;
  previous: Game | undefined;
  step: (offset: number) => void;
  pin: (game: Game | null) => void;
  live: boolean;
  setLive: (live: boolean) => void;
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
  const [live, setLive] = useState(false);
  const lead = pinned ?? featured;
  const artwork = useMemo(() => {
    const games = lead ? [lead, ...backgrounds.filter((game) => game.id !== lead.id)] : backgrounds;
    return games.flatMap((game) =>
      [...new Set([game.artwork, ...game.artworks].filter((image): image is string => Boolean(image)))]
        .map((image) => ({ ...game, artwork: image })),
    );
  }, [backgrounds, lead]);
  // A changed lead starts at its requested image, including curator previews of the same game.
  const leadKey = lead ? `${lead.id}:${lead.artwork ?? ""}` : undefined;
  const [position, setPosition] = useState<ArtworkPosition & { lead: string | undefined }>({ lead: leadKey, history: [0], cursor: 0 });
  const currentPosition = position.lead === leadKey && [...position.history, ...(position.remaining ?? [])].every((index) => index < artwork.length)
    ? position : { history: [0], cursor: 0, previous: undefined };
  const index = currentPosition.history[currentPosition.cursor];
  const step = useCallback((offset: number) => {
    const valid = position.lead === leadKey && [...position.history, ...(position.remaining ?? [])].every((index) => index < artwork.length);
    const next = advanceArtwork(artwork, valid ? position : { history: [0], cursor: 0 }, offset);
    setPosition({ ...next, lead: leadKey });
  }, [artwork, leadKey, position]);
  const autoplay = !lead && artwork.length > 1;

  // Manual navigation restarts the timer and preserves the viewed-image history.
  useEffect(() => {
    if (!autoplay) return;
    const timer = setTimeout(() => {
      step(1);
    }, autoplayInterval);
    return () => clearTimeout(timer);
  }, [autoplay, position, step]);

  return (
    <BackdropContext value={{ artwork, active: artwork[index], previous: currentPosition.previous === undefined ? undefined : artwork[currentPosition.previous], step, pin, live, setLive }}>
      {children}
    </BackdropContext>
  );
}

export function Backdrop() {
  const { active, previous, live } = useBackdrop();
  const nearby = [...new Set([previous, active])].filter((game): game is Game => Boolean(game));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const renderer = useRef<ArtworkRenderer | null>(null);
  const setEffect = useCallback((canvas: HTMLCanvasElement | null) => renderer.current?.setEffect(canvas), []);

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
          {nearby.map((game) => (
            <div
              key={`${game.id}:${game.artwork}`}
              className="absolute inset-0 scale-[1.035] bg-cover bg-center opacity-0 transition-[opacity,transform] duration-1000 data-[active]:scale-100 data-[active]:opacity-100"
              data-active={(game.id === active?.id && game.artwork === active.artwork) || undefined}
              data-game={game.name}
              style={{ backgroundImage: `url("${game.artwork}")` }}
            />
          ))}
        </div>
        {live && active?.artwork && <LiveSpecular onCanvas={setEffect} />}
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/30 to-transparent [:root[data-lens-active]_&]:hidden" />
      </div>
    </>
  );
}
