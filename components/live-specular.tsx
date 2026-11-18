"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

// Reduced motion still shows the edge; the renderer holds it still.
const preference = "(prefers-reduced-transparency: reduce)";
function subscribe(onChange: () => void) {
  const media = matchMedia(preference);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const mobileQuery = "(max-width: 600px)";
function subscribeMobile(onChange: () => void) {
  const media = matchMedia(mobileQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

// Marks where the artwork renderer draws the live light edge.
export default function LiveSpecular({ onBox }: { onBox: (box: HTMLElement | null, compact: boolean) => void }) {
  const reduced = useSyncExternalStore(subscribe, () => matchMedia(preference).matches, () => true);
  const mobile = useSyncExternalStore(subscribeMobile, () => matchMedia(mobileQuery).matches, () => false);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    onBox(reduced ? null : container.current, mobile);
  }, [reduced, mobile, onBox]);
  useEffect(() => () => onBox(null, false), [onBox]);
  if (reduced) return null;

  return <div ref={container} className="pointer-events-none absolute inset-0 portrait:-bottom-[min(35svh,240px)] portrait:min-h-[max(90svh,640px)]" data-testid="live-specular" aria-hidden="true" />;
}
