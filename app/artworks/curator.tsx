"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Download, Ellipsis, Save, X } from "lucide-react";
import { Backdrop, BackdropProvider } from "@/components/backdrop";
import AgentBridge from "@/components/agent-bridge";
import GamePicker, { choiceGame } from "@/components/game-picker";
import { Container } from "@/components/page-container";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Eyebrow } from "@/components/ui/typography";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { AlertDialog, AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { artworkUrl, curatorDraftSchema, exportCuration, type CuratorDraft, type CuratorGame } from "@/lib/artwork-curation";
import type { Game } from "@/lib/game-types";

const storageKey = "artwork-curator-v1";

async function request<T>(params = ""): Promise<T> {
  const response = await fetch(`/artworks/data${params}`);
  if (!response.ok) throw new Error((await response.json()).error ?? "Request failed.");
  return response.json();
}

function searchGames(query: string) {
  return request<Game[]>(`?q=${encodeURIComponent(query)}`);
}

function pickerGame(game: CuratorGame): Game {
  return { id: game.id, name: game.name, cover: game.cover ?? null, artwork: null, artworks: [] };
}

export function ArtworkCurator() {
  const draft = useQuery({
    queryKey: ["artwork-curator"],
    queryFn: async (): Promise<CuratorDraft> => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const result = curatorDraftSchema.safeParse(JSON.parse(saved));
          if (result.success) return result.data;
        }
      } catch { /* Storage may be unavailable; the editor still supports export. */ }
      return { version: 1, games: await request<CuratorGame[]>() };
    },
    staleTime: Infinity,
    retry: false,
  });
  if (!draft.data) return (
    <Container className="py-10">
      <h1 className="text-2xl font-semibold">Artwork curator</h1>
      <p className="my-4 text-quiet" role="status">{draft.error?.message ?? "Loading the current rotation from IGDB…"}</p>
      {draft.isError && <Button onClick={() => void draft.refetch()}>Retry loading</Button>}
    </Container>
  );
  return <CuratorEditor initial={draft.data} />;
}

export function CuratorEditor({ initial }: { initial: CuratorDraft }) {
  const [games, setGames] = useState(initial.games);
  const [activeId, setActiveId] = useState<number | "all">("all");
  const [previewId, setPreviewId] = useState<string>();
  const [saveError, setSaveError] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [clearOpen, setClearOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const tabButtons = useRef(new Map<number, HTMLButtonElement>());
  const sidebar = useRef<HTMLElement>(null);
  const hero = useRef<HTMLElement>(null);
  const allTab = useRef<HTMLButtonElement>(null);
  const isAll = activeId === "all";
  const active = games.find((game) => game.id === activeId);
  const candidates = (isAll ? games : active ? [active] : []).flatMap((game) =>
    game.candidates.filter((art) => !isAll || game.selected.includes(art.imageId)).map((art) => ({ game, art })),
  );
  const previewEntry = candidates.find(({ art }) => art.imageId === previewId) ?? candidates[0];
  const preview = previewEntry?.art;
  const previewIndex = candidates.indexOf(previewEntry);
  const selectedCount = games.reduce((sum, game) => sum + game.selected.length, 0);
  const featured = previewEntry ? {
    ...pickerGame(previewEntry.game), artwork: artworkUrl(previewEntry.art.imageId, true), artworks: [artworkUrl(previewEntry.art.imageId, true)],
  } : null;
  const add = useMutation({
    mutationFn: (id: number) => request<CuratorGame[]>(`?id=${id}`),
    onSuccess: (result) => {
      const game = result[0];
      if (!game) return;
      if (!games.some((item) => item.id === game.id)) updateGames([...games, { ...game, selected: [] }]);
      openGame(game);
    },
  });
  const save = useMutation({
    mutationFn: async () => {
      const response = await fetch("/artworks/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportCuration(games)),
      });
      if (!response.ok) throw new Error((await response.json()).error ?? "Saving failed.");
    },
  });

  function updateGames(next: CuratorGame[]) {
    save.reset();
    setGames(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 1, games: next }));
      setSaveError(false);
    } catch { setSaveError(true); }
  }

  function removeGame(id: number) {
    const next = games.filter((game) => game.id !== id);
    const replacement = activeId === id ? next[Math.min(games.findIndex((game) => game.id === id), next.length - 1)] : active;
    updateGames(next);
    if (replacement && activeId === id) openGame(replacement);
    if (!replacement) {
      setActiveId("all");
      setPreviewId(undefined);
    }
    requestAnimationFrame(() => {
      if (replacement) tabButtons.current.get(replacement.id)?.focus();
      else if (next.length) allTab.current?.focus();
      else sidebar.current?.querySelector("input")?.focus();
    });
  }

  function openGame(game: CuratorGame) {
    setActiveId(game.id);
    setPreviewId(game.selected[0] ?? game.candidates[0]?.imageId);
  }

  function select(ids: string[], gameId = activeId) {
    updateGames(games.map((game) => game.id === gameId ? { ...game, selected: ids } : game));
  }

  function show(imageId: string) {
    setPreviewId(imageId);
    hero.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }

  function step(offset: number) {
    if (!candidates.length) return;
    show(candidates[(previewIndex + offset + candidates.length) % candidates.length].art.imageId);
  }

  function download() {
    const blob = new Blob([JSON.stringify(exportCuration(games), null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "artwork-curation.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <BackdropProvider backgrounds={[]} featured={featured}>
      <div lang="en" className="relative isolate min-h-dvh" data-glass-tone="clear">
        <Backdrop />
        <AgentBridge />
        <header className="glass sticky top-0 z-40 border-b border-glass-edge shadow-none before:hidden" data-lens="bar">
          <Container className="flex h-16 items-center justify-between gap-4 phone:h-[76px]">
            <Link href="/" className="whitespace-nowrap text-[15px] font-bold tracking-[-.5px] phone:text-xl">wanneer<span className="font-normal text-quiet">.games</span></Link>
            <div className="flex items-center gap-3">
              {save.isError && <p className="max-w-48 text-[11px] text-orange-200" role="alert">{save.error.message}</p>}
              {save.isSuccess && <span className="text-[11px] text-quiet" role="status">Saved & applied</span>}
              <div className="inline-flex">
                <Button size="sm" className={process.env.NODE_ENV === "development" ? "rounded-r-none" : undefined} onClick={download}><Download size={14} aria-hidden="true" />Export</Button>
                {process.env.NODE_ENV === "development" && <Button size="sm" className="rounded-l-none border-l-canvas/25 px-3 phone:px-3" aria-label="Save and apply artwork" title="Save & apply to the homepage" disabled={save.isPending} onClick={() => save.mutate()}>
                  {save.isSuccess ? <Check size={15} aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
                </Button>}
              </div>
            </div>
          </Container>
        </header>
        <main>
          <section ref={hero} aria-label="Artwork preview" data-testid="artwork-preview" data-image-id={preview?.imageId} className="relative flex min-h-[56.25vw] scroll-mt-16 items-end phone:min-h-[max(460px,calc(100svh_-_226px))] phone:scroll-mt-[76px]">
            <Container className="flex items-end justify-between gap-4 pb-7">
              <div>
                <Eyebrow className="mb-2 text-[8px]">ARTWORK PREVIEW</Eyebrow>
                <h2 className="text-xl font-semibold tracking-tight phone:text-3xl">{previewEntry?.game.name ?? active?.name ?? "All selected artwork"}</h2>
                <p className="mt-2 text-[10px] text-quiet">{preview ? `${preview.imageId} · ${preview.kind}${preview.width && preview.height ? ` · ${preview.width} × ${preview.height}` : ""}` : "No artwork available"}</p>
              </div>
              {preview && <div className="flex items-center gap-2">
                <span className="mr-2 font-mono text-[10px] text-quiet">{previewIndex + 1} / {candidates.length}</span>
                <Button variant="overlay" size="icon" data-lens="" aria-label="Previous artwork" onClick={() => step(-1)}><ChevronLeft size={18} /></Button>
                <Button variant="overlay" size="icon" data-lens="" aria-label="Next artwork" onClick={() => step(1)}><ChevronRight size={18} /></Button>
              </div>}
            </Container>
          </section>
          <Container className="pb-12">
            <Tabs aria-label="Games to curate" orientation="vertical" value={String(activeId)} onValueChange={(value) => {
              if (value === "all") {
                setActiveId("all");
                setPreviewId(undefined);
                return;
              }
              const game = games.find((item) => String(item.id) === value);
              if (game) openGame(game);
            }} className="grid gap-7 border-t border-glass-edge pt-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-9">
              <aside ref={sidebar}>
                <GamePicker
                  key={pickerKey}
                  games={[]}
                  value={null}
                  label="Add a game"
                  placeholder="Search IGDB…"
                  allowCustomValue={false}
                  searchGames={searchGames}
                  searchKey="artwork-curator"
                  onValueChange={(choice) => {
                    const game = choiceGame(choice);
                    if (!game) return;
                    setPickerKey((key) => key + 1);
                    add.reset();
                    const existing = games.find((item) => item.id === game.id);
                    if (existing) openGame(existing);
                    else add.mutate(game.id);
                  }}
                />
                {add.isPending && <p className="mt-3 text-xs text-quiet" role="status">Loading candidates…</p>}
                {add.error && <p className="mt-3 text-xs text-orange-200" role="alert">{add.error.message}</p>}
                <h2 className="mb-3 mt-6 text-xs font-semibold">Your rotation</h2>
                <div className="-m-1 p-1">
                  <TabsList aria-label="Games to curate" className="flex w-full flex-col gap-1">
                    <TabsTab ref={allTab} value="all" aria-label="All" className="w-full justify-between py-2.5 text-left phone:px-2.5">
                      <span>All</span><span className="font-mono text-[9px]">{selectedCount}</span>
                    </TabsTab>
                    {games.map((game) => (
                      <div key={game.id} className="relative">
                        <TabsTab ref={(element) => { if (element) tabButtons.current.set(game.id, element); else tabButtons.current.delete(game.id); }} value={String(game.id)} className="w-full justify-between py-2.5 pr-9 text-left phone:pl-2.5 phone:pr-9">
                          <span>{game.name}</span>{" "}<span className="shrink-0 font-mono text-[9px]">{game.selected.length}/{game.candidates.length}</span>
                        </TabsTab>
                        <Button variant="link" size="icon-sm" className="absolute right-1 top-1/2 -translate-y-1/2 p-0" aria-label={`Remove ${game.name}`} onClick={() => removeGame(game.id)}><X size={13} aria-hidden="true" /></Button>
                      </div>
                    ))}
                  </TabsList>
                </div>
                {saveError && <p className="mt-4 text-[11px] text-orange-200" role="alert">Local save failed. Export to keep your progress.</p>}
              </aside>
              <TabsPanel value={String(activeId)} className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">{isAll ? "All selected artwork" : "Pick the keepers"}</h2>
                    <p className="mt-1 text-[11px] text-quiet">{isAll ? selectedCount : active?.selected.length ?? 0} selected · {isAll ? "Everything currently enabled across your games." : "Click an image to preview. Check it to keep it."}</p>
                  </div>
                  {games.length > 0 && <Menu onAction={(action) => {
                    if (action === "select" && active) select(active.candidates.map((art) => art.imageId));
                    if (action === "clear" && active) select([]);
                    if (action === "clear-all") setClearOpen(true);
                  }}>
                    <MenuTrigger render={<Button ref={menuTrigger} variant="ghost" size="icon" />} aria-label="Selection actions"><Ellipsis size={18} aria-hidden="true" /></MenuTrigger>
                    <MenuContent align="end">
                      {active && <>
                        <MenuItem value="select">Select all</MenuItem>
                        <MenuItem value="clear">Clear selection</MenuItem>
                        <MenuSeparator />
                      </>}
                      <MenuItem value="clear-all" className="text-orange-200">Clear all…</MenuItem>
                    </MenuContent>
                  </Menu>}
                </div>
                {active && !active.candidates.length && <p className="text-sm text-quiet">No artwork or screenshots on IGDB for this game. Try another game.</p>}
                {isAll && !candidates.length && <p className="text-sm text-quiet">{games.length ? "Nothing selected yet. Choose a game on the left and check the artwork you want to keep." : "Add a game to start choosing artwork."}</p>}
                <div className="grid grid-cols-2 gap-3 phone:grid-cols-3 desktop:grid-cols-4">
                  {candidates.map(({ game, art }) => (
                    <article key={`${game.id}-${art.imageId}`} data-preview={preview?.imageId === art.imageId || undefined} className="overflow-hidden rounded-lg border border-glass-edge bg-surface/30 data-[preview]:border-brand">
                      <Button variant="ghost" size="none" aria-label={`Preview ${art.imageId}`} aria-pressed={preview?.imageId === art.imageId} className="block w-full overflow-hidden rounded-none border-0" onClick={() => show(art.imageId)}>
                        {/* Direct CDN thumbnails avoid filling the optimizer cache with rejected candidates. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={artworkUrl(art.imageId)} alt="" loading="lazy" className="aspect-video w-full bg-canvas object-cover" />
                      </Button>
                      {isAll && <p className="px-2.5 pt-2.5 text-[11px] font-medium">{game.name}</p>}
                      <div className="flex items-center justify-between gap-2 p-2.5">
                        <label className="flex min-w-0 cursor-pointer items-center gap-2">
                          <Checkbox aria-label={`Keep ${art.imageId}`} checked={game.selected.includes(art.imageId)} onCheckedChange={(checked) => select(checked === true ? [...new Set([...game.selected, art.imageId])] : game.selected.filter((id) => id !== art.imageId), game.id)} />
                          <span className="truncate font-mono text-[9px] text-quiet">{art.imageId}</span>
                        </label>
                        <Button variant="link" size="none" className="shrink-0 p-1" render={<a href={artworkUrl(art.imageId, true)} target="_blank" rel="noreferrer" />} aria-label={`View full size ${art.imageId}`}>↗</Button>
                      </div>
                    </article>
                  ))}
                </div>
              </TabsPanel>
            </Tabs>
          </Container>
        </main>
        <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
          <AlertDialogContent keepMounted finalFocus={() => menuTrigger.current}>
            <AlertDialogTitle>Clear every selection?</AlertDialogTitle>
            <AlertDialogDescription>Uncheck all artwork across all {games.length} games. Your games stay in the list.</AlertDialogDescription>
            <div className="flex justify-end gap-2">
              <AlertDialogClose render={<Button variant="secondary" />}>Cancel</AlertDialogClose>
              <AlertDialogClose value="confirm" data-agent-confirm="Clears every artwork selection across all games" render={<Button />} onClick={() => updateGames(games.map((game) => ({ ...game, selected: [] })))}>Clear every selection</AlertDialogClose>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </BackdropProvider>
  );
}
