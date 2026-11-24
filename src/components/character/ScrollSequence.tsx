import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  frameCount: number;
  basePath: string; // e.g. "/frames"
  scrollLength?: string; // how long the pinned scroll lasts
  onProgress?: (progress: number) => void;
  children?: ReactNode;
};

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function ScrollSequence({
  frameCount,
  basePath,
  scrollLength = "+=400%",
  onProgress,
  children,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  // reduced-motion visitors see the final (sitting) frame, no scrubbing
  const frameRef = useRef(prefersReduced() ? frameCount - 1 : 0);
  const onProgressRef = useRef(onProgress);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    onProgressRef.current = onProgress;
  });

  // Draw one frame, scaled to cover the canvas
  const draw = useCallback((index: number) => {
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    if (!canvas || !img || !img.complete || !img.naturalWidth) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (cw - dw) * 0.45; // horizontal anchor (keeps her in view on phones)
    const dy = (ch - dh) * 0.85; // vertical anchor (keeps the flowers in view)
    ctx.drawImage(img, dx, dy, dw, dh);
  }, []);

  // 1) Preload all frames
  useEffect(() => {
    let cancelled = false;
    let count = 0;
    const imgs: HTMLImageElement[] = [];

    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      img.src = `${basePath}/frame_${String(i).padStart(3, "0")}.webp`;
      img.onload = () => {
        if (cancelled) return;
        count++;
        if (count % 5 === 0 || count === frameCount) setLoaded(count);
        if (i - 1 === frameRef.current) draw(i - 1);
      };
      imgs.push(img);
    }
    imagesRef.current = imgs;

    return () => {
      cancelled = true;
    };
  }, [frameCount, basePath, draw]);

  // 2) Keep the canvas sharp and sized to the screen
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round(c.clientHeight * dpr);
      draw(frameRef.current);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  // 3) Tie scroll position to the frame number
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || prefersReduced()) return;

    const ctx = gsap.context(() => {
      const state = { frame: 0 };
      gsap.to(state, {
        frame: frameCount - 1,
        snap: { frame: 1 },
        ease: "none",
        scrollTrigger: {
          trigger: wrap,
          start: "top top",
          end: scrollLength,
          scrub: 0.5,
          pin: true,
          onUpdate: (self) => onProgressRef.current?.(self.progress),
        },
        onUpdate: () => {
          frameRef.current = state.frame;
          draw(state.frame);
        },
      });
    }, wrap);

    return () => ctx.revert();
  }, [frameCount, scrollLength, draw]);

  return (
    <div ref={wrapRef} className="relative h-screen w-full overflow-hidden bg-bg">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {children}
      {loaded < frameCount && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs tracking-widest text-muted">
          LOADING {Math.round((loaded / frameCount) * 100)}%
        </div>
      )}
    </div>
  );
  <canvas ref={canvasRef} className="hero-canvas absolute inset-0 h-full w-full" />
}
