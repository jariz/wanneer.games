declare module "liquid-gl" {
  export interface LiquidLens {
    el: HTMLElement;
    options: Pick<Options, "frost" | "refraction" | "bevelDepth">;
    setTint(color: string | null): void;
    destroy(): void;
  }
  interface Options {
    target: string;
    snapshot: string;
    content: false;
    engine: "auto";
    zIndex: number;
    resolution: number;
    refraction: number;
    aberration: number;
    interaction: "none";
    bevelDepth: number;
    bevelWidth: number;
    frost: number;
    magnify: number;
    tint: string;
    shadow: boolean;
    specular: boolean;
    reveal: "none";
    on: { init(lens: LiquidLens): void };
  }
  const liquidGL: {
    (options: Options): LiquidLens | LiquidLens[] | undefined;
    registerDynamic(elements: Element | Element[]): void;
  };
  export default liquidGL;
}
