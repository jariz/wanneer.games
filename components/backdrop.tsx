"use client";

import { createContext, useContext, useEffect, useMemo, useCallback, useRef, useState, type ReactNode } from "react";
import type { BackdropArtwork } from "@/lib/artwork";
import { createArtworkRenderer, type ArtworkRenderer } from "@/lib/artwork-renderer";
import { advanceArtwork, type ArtworkPosition } from "@/lib/artwork-slideshow";
import dynamic from "next/dynamic";

const LiveSpecular = dynamic(() => import("./live-specular"), { ssr: false });

const autoplayInterval = 10000;

type BackdropState = {
  artwork: BackdropArtwork[];
  active: BackdropArtwork | undefined;
  previous: BackdropArtwork | undefined;
  step: (offset: number) => void;
  pin: (gameId: number | null) => void;
};
const BackdropContext = createContext<BackdropState | null>(null);

export function useBackdrop() {
  const backdrop = useContext(BackdropContext);
  if (!backdrop) throw new Error("useBackdrop requires BackdropProvider");
  return backdrop;
}

// Shows a game's artwork while mounted, e.g. the game chosen in the planner.
export function usePinnedBackdrop(gameId: number | null) {
  const { pin } = useBackdrop();
  useEffect(() => {
    pin(gameId);
    return () => pin(null);
  }, [gameId, pin]);
}

// A pinned game leads and stays put; otherwise the backgrounds rotate.
export function BackdropProvider({ backgrounds, featured, children }: { backgrounds: BackdropArtwork[]; featured: BackdropArtwork | null; children: ReactNode }) {
  const [pinned, pin] = useState<number | null>(null);
  const lead = backgrounds.find((game) => game.id === pinned) ?? featured;
  const artwork = useMemo(() => {
    const games = lead ? [lead, ...backgrounds.filter((game) => game.id !== lead.id)] : backgrounds;
    return games.flatMap((game) =>
      [...new Set([game.artwork, ...game.artworks])]
        .map((image) => ({ ...game, artwork: image })),
    );
  }, [backgrounds, lead]);
  // A changed lead starts at its requested image, including curator previews of the same game.
  const leadKey = lead ? `${lead.id}:${lead.artwork}` : undefined;
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
    <BackdropContext value={{ artwork, active: artwork[index], previous: currentPosition.previous === undefined ? undefined : artwork[currentPosition.previous], step, pin }}>
      {children}
    </BackdropContext>
  );
}

export function Backdrop({ live = false }: { live?: boolean }) {
  const { active, previous } = useBackdrop();
  const nearby = [...new Set([previous, active])].filter((game): game is BackdropArtwork => Boolean(game));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const renderer = useRef<ArtworkRenderer | null>(null);
  const setEffect = useCallback((canvas: HTMLCanvasElement | null) => renderer.current?.setEffect(canvas), []);

  useEffect(() => {
    const region = regionRef.current!;
    let destroyGlass: (() => void) | undefined;
    const showFallback = () => {
      region.dataset.fallback = "";
      delete document.documentElement.dataset.lensActive;
      destroyGlass?.();
      destroyGlass = undefined;
    };
    if (matchMedia("(prefers-reduced-transparency: reduce)").matches) {
      showFallback();
      return () => { delete region.dataset.fallback; };
    }
    let disposed = false;
    const created = createArtworkRenderer(canvasRef.current!, regionRef.current!, () => {
      delete region.dataset.fallback;
      document.documentElement.dataset.lensActive = "";
      import("@/lib/liquid-glass").then(({ createLiquidGlass }) => {
        if (!disposed && !destroyGlass && region.dataset.fallback === undefined) destroyGlass = createLiquidGlass(canvasRef.current!);
      }).catch((error) => console.warn("Liquid glass unavailable:", error));
    }, showFallback);
    if (!created) {
      showFallback();
      return () => { delete region.dataset.fallback; };
    }
    renderer.current = created;
    return () => {
      disposed = true;
      destroyGlass?.();
      created.destroy();
      renderer.current = null;
      delete document.documentElement.dataset.lensActive;
      delete region.dataset.fallback;
    };
  }, []);

  useEffect(() => renderer.current?.setImage(active?.artwork ?? null), [active?.artwork]);

  return (
    <>
      <canvas ref={canvasRef} data-testid="artwork-canvas" className="pointer-events-none absolute inset-x-0 top-0 -z-10 w-full opacity-0 transition-opacity duration-500 motion-reduce:transition-none [:root[data-lens-active]_&]:opacity-100" aria-hidden="true" />
      <div
        ref={regionRef}
        className="group/backdrop pointer-events-none absolute inset-x-0 top-16 -z-10 aspect-video overflow-hidden portrait:overflow-visible phone:top-[76px] phone:h-[max(460px,calc(100svh_-_226px),56.25vw)]"
        aria-hidden="true"
        data-testid="backdrop"
      >
        <div className="absolute inset-0 hidden overflow-hidden brightness-[.82] group-data-[fallback]/backdrop:block">
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
        {live && <LiveSpecular onCanvas={setEffect} />}
        <div className="absolute inset-0 hidden bg-gradient-to-t from-canvas via-canvas/30 to-transparent group-data-[fallback]/backdrop:block" />
      </div>
    </>
  );
}
