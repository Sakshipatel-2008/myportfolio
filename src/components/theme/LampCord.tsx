import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { useTheme } from "../../hooks/useTheme";

const LENGTH = 100; // resting length of the thread
const MAX_PULL = 90; // how far it can be dragged
const THRESHOLD = 50; // pull beyond this to switch the theme

export default function LampCord() {
  const { theme, toggle } = useTheme();

  const swayRef = useRef<SVGGElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const knobRef = useRef<SVGGElement>(null);
  const swayTween = useRef<gsap.core.Tween | null>(null);
  const pull = useRef({ v: 0 });
  const drag = useRef<{ startY: number } | null>(null);

  // Move the thread end + knob (direct DOM updates = no React re-renders)
  const render = () => {
    const y = LENGTH + pull.current.v;
    lineRef.current?.setAttribute("y2", String(y));
    knobRef.current?.setAttribute("transform", `translate(20 ${y})`);
  };

  useEffect(() => {
    render();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !swayRef.current) return;

    swayTween.current = gsap.fromTo(
      swayRef.current,
      { rotation: -2.5, svgOrigin: "20 0" },
      {
        rotation: 2.5,
        svgOrigin: "20 0",
        duration: 3.2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      }
    );
    return () => {
      swayTween.current?.kill();
    };
  }, []);

  const springBack = () => {
    gsap.to(pull.current, {
      v: 0,
      duration: 1,
      ease: "elastic.out(1, 0.3)",
      onUpdate: render,
      onComplete: () => swayTween.current?.resume(),
    });
  };

  const fire = () => {
    const r = knobRef.current?.getBoundingClientRect();
    const x = r ? r.left + r.width / 2 : window.innerWidth - 40;
    const y = r ? r.top + r.height / 2 : 200;
    toggle(x, y);
    springBack();
  };

  const onDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY };
    gsap.killTweensOf(pull.current);
    swayTween.current?.pause();
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    pull.current.v = Math.min(Math.max(e.clientY - drag.current.startY, 0), MAX_PULL);
    render();
  };

  const onUp = () => {
    if (!drag.current) return;
    const pulled = pull.current.v;
    drag.current = null;
    // a real pull OR a simple tap toggles; anything in between just springs back
    if (pulled >= THRESHOLD || pulled < 5) fire();
    else springBack();
  };

  // Keyboard users: Tab to the knob, press Enter or Space
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    swayTween.current?.pause();
    gsap.to(pull.current, { v: 60, duration: 0.15, onUpdate: render, onComplete: fire });
  };

  return (
    <svg
      className="fixed right-[clamp(1.25rem,6vw,5rem)] top-0 z-50 text-ink"
      width="40"
      height={LENGTH + MAX_PULL + 40}
      viewBox={`0 0 40 ${LENGTH + MAX_PULL + 40}`}
      style={{ overflow: "visible", touchAction: "none" }}
    >
      <g ref={swayRef}>
        <line
          ref={lineRef}
          x1="20"
          y1="0"
          x2="20"
          y2={LENGTH}
          stroke="currentColor"
          strokeWidth="1.2"
          opacity="0.7"
        />
        <g
          ref={knobRef}
          role="button"
          tabIndex={0}
          aria-label="Pull the cord to switch between night and paper mode"
          aria-pressed={theme === "paper"}
          style={{ cursor: "grab", outline: "none" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          <circle r="24" fill="transparent" /> {/* big invisible touch target */}
          <circle r="7" fill="currentColor" />
          <text
            y="26"
            textAnchor="middle"
            fontSize="9"
            letterSpacing="2"
            fill="currentColor"
            opacity="0.6"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            PULL
          </text>
        </g>
      </g>
    </svg>
  );
}