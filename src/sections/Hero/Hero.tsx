import { useRef } from "react";
import ScrollSequence from "../../components/character/ScrollSequence";
import AboutCard from "../../components/character/AboutCard";
import { config } from "../../config/portfolio-config";
const FRAME_PORTION = 0.45;
export default function Hero() {
  const leftRef = useRef<HTMLHeadingElement>(null);
  const rightRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const aboutControl = useRef<((progress: number) => void) | null>(null);

  // Runs on every scroll tick, so we change styles directly (no React re-render)
  const handleProgress = (p: number) => {
    const t = Math.min(p / 0.1, 1); // text fades during the first 10% of the scroll
    if (leftRef.current) {
      leftRef.current.style.opacity = String(1 - t);
      leftRef.current.style.transform = `translate3d(${-60 * t}px,0,0)`;
    }
    if (rightRef.current) {
      rightRef.current.style.opacity = String(1 - t);
      rightRef.current.style.transform = `translate3d(${60 * t}px,0,0)`;
    }
    if (hintRef.current) {
      hintRef.current.style.opacity = String(1 - Math.min(p / 0.04, 1));
    }
    // the card plays during the second half of the scroll
       aboutControl.current?.(
      Math.min(Math.max((p - FRAME_PORTION) / (1 - FRAME_PORTION), 0), 1)
    );
  };

  return (
    <ScrollSequence
      frameCount={195}
      basePath="/frames"
            scrollLength="+=900%"
      framePortion={FRAME_PORTION}
      onProgress={handleProgress}
    >
      <h1
        ref={leftRef}
        className="pointer-events-none absolute z-10 font-type text-[clamp(1.75rem,5.5vw,5.5rem)] leading-none text-ink/70 will-change-transform max-md:left-0 max-md:right-0 max-md:top-[12%] max-md:text-center md:right-[63%] md:top-[30%] md:text-right"
      >
        {config.greeting}
      </h1>
      <p
        ref={rightRef}
        className="pointer-events-none absolute z-10 font-type text-[clamp(2rem,6.5vw,6.5rem)] leading-none text-ink will-change-transform max-md:left-0 max-md:right-0 max-md:top-[20%] max-md:text-center md:left-[52%] md:top-[29%]"
      >
        {config.firstName}.
      </p>

      <div
        ref={hintRef}
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-muted"
      >
        SCROLL
        <span className="h-10 w-px bg-muted/60" />
      </div>

      <AboutCard controlRef={aboutControl} />
    </ScrollSequence>
  );
}