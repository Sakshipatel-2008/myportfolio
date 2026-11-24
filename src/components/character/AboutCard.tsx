import { useEffect, useRef, type ElementType, type MutableRefObject } from "react";
import { gsap } from "gsap";
import { config } from "../../config/portfolio-config";

type Props = {
  // the parent calls controlRef.current(0..1) to scrub the whole animation
  controlRef: MutableRefObject<((progress: number) => void) | null>;
};

// ---- Tweak these to change the feel -------------------------------
const START_X = -150; // where the cursor flies in from (relative to box top-left)
const START_Y = -110;
const EXIT_X = 70; // where it drifts off to after drawing
const EXIT_Y = 50;
const LEAD = 12; // caret blinks this many "letters" before typing starts
const TAIL = 12; // …and this many after typing ends
const SECONDS_PER_LETTER = 0.025; // typing speed (relative, scroll decides real speed)
// ------------------------------------------------------------------

// Box positions: [right box, left box]
const POSITIONS = [
  "max-md:inset-x-3 max-md:top-[40%] md:bottom-[8vh] md:right-[4vw] md:w-[min(30vw,430px)]",
  "max-md:inset-x-3 max-md:bottom-3 md:bottom-[8vh] md:left-[4vw] md:w-[min(26vw,370px)]",
];

// Each letter is its own span so it can be "typed". Screen readers get the plain text.
function Typed({
  text,
  as: Tag = "p",
  className,
}: {
  text: string;
  as?: ElementType;
  className?: string;
}) {
  return (
    <Tag className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {Array.from(text).map((ch, i) => (
          <span key={i} className="t-char">
            {ch}
          </span>
        ))}
      </span>
    </Tag>
  );
}

function Cursor({ tag }: { tag: string }) {
  return (
    <div
      data-cursor
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 z-30 opacity-0 will-change-transform"
    >
      {/* normal arrow */}
      <svg
        data-arrow
        width="14"
        height="20"
        viewBox="0 0 16 22"
        className="absolute -left-px -top-px text-ink"
      >
        <path
          d="M1 1v17l4.5-4 3.3 7.5 2.7-1.2-3.2-7.3H15z"
          fill="currentColor"
          stroke="var(--color-bg)"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>

      {/* crosshair "+" used while drawing */}
      <svg
        data-plus
        width="18"
        height="18"
        viewBox="-9 -9 18 18"
        className="absolute -left-[9px] -top-[9px] text-ink opacity-0"
      >
        <path d="M-8 0H8M0 -8V8" stroke="var(--color-bg)" strokeWidth="3" />
        <path d="M-8 0H8M0 -8V8" stroke="currentColor" strokeWidth="1.2" />
      </svg>

      <span className="absolute left-3 top-4 whitespace-nowrap bg-ink px-1.5 py-px font-mono text-[9px] tracking-wider text-bg">
        {tag}
      </span>
      <span
        data-dim
        className="absolute left-3 top-[34px] whitespace-nowrap bg-bg px-1.5 py-px font-mono text-[9px] tracking-wider text-ink opacity-0"
      >
        0 × 0
      </span>
    </div>
  );
}

// ---- Builds the draw → release → type timeline for ONE box ----------
function buildBox(box: HTMLElement, cleanups: Array<() => void>) {
  const frame = box.querySelector<HTMLElement>("[data-frame]")!;
  const cursor = box.querySelector<HTMLElement>("[data-cursor]")!;
  const arrow = box.querySelector<SVGElement>("[data-arrow]")!;
  const plus = box.querySelector<SVGElement>("[data-plus]")!;
  const dim = box.querySelector<HTMLElement>("[data-dim]")!;
  const handles = Array.from(box.querySelectorAll<HTMLElement>("[data-handle]"));
  const chars = Array.from(box.querySelectorAll<HTMLElement>(".t-char"));
  const N = chars.length;

  let w = frame.offsetWidth;
  let h = frame.offsetHeight;

  // One plain object holds the state. The timeline animates it,
  // and render() turns it into what you see. Scrubbing back just works.
  const S = { fx: 0, fy: 0, px: 0, py: 0, ox: 0, oy: 0, a: 0, b: 0, m: 0, h: 0, s: 0 };

  let shown = 0;
  let caretEl: HTMLElement | null = null;
  let caretKind = "";

  const setCaret = (el: HTMLElement | null, kind: "after" | "before") => {
    if (caretEl === el && caretKind === kind) return;
    caretEl?.classList.remove("t-caret", "t-caret-before");
    caretEl = el;
    caretKind = kind;
    el?.classList.add(kind === "after" ? "t-caret" : "t-caret-before");
  };

  function render() {
    // cursor position = fly-in + drag along the diagonal + drift-off
    const x = START_X * (1 - S.fx) + S.px * w + S.ox * EXIT_X;
    const y = START_Y * (1 - S.fy) + S.py * h + S.oy * EXIT_Y;
    cursor.style.transform = `translate3d(${x}px,${y}px,0)`;
    cursor.style.opacity = String(S.a * (1 - S.b));

    // arrow while moving, "+" while drawing
    arrow.style.opacity = S.m ? "0" : "1";
    plus.style.opacity = S.m ? "1" : "0";
    dim.style.opacity = S.m ? "1" : "0";
    if (S.m) dim.textContent = `${Math.round(w * S.px)} × ${Math.round(h * S.py)}`;

    // the box grows from its top-left corner
    frame.style.clipPath = `inset(0px ${(1 - S.px) * 100}% ${(1 - S.py) * 100}% 0px)`;
    handles.forEach((el) => (el.style.opacity = String(S.h)));

    // typing
    const k = Math.min(Math.max(Math.floor(S.s) - LEAD, 0), N);
    if (k !== shown) {
      const lo = Math.min(k, shown);
      const hi = Math.max(k, shown);
      for (let i = lo; i < hi; i++) chars[i].classList.toggle("typed", i < k);
      shown = k;
    }
    const typing = N > 0 && S.s > 0 && S.s < N + LEAD + TAIL;
    if (!typing) setCaret(null, "after");
    else if (k === 0) setCaret(chars[0], "before");
    else setCaret(chars[k - 1], "after");
  }

  const ro = new ResizeObserver(() => {
    w = frame.offsetWidth;
    h = frame.offsetHeight;
    render();
  });
  ro.observe(frame);
  cleanups.push(() => {
    ro.disconnect();
    chars.forEach((c) => c.classList.remove("typed", "t-caret", "t-caret-before"));
  });

  const typeDuration = (N + LEAD + TAIL) * SECONDS_PER_LETTER;

  const tl = gsap.timeline({ onUpdate: render });
  tl.to(S, { a: 1, duration: 0.3, ease: "none" }, 0) // cursor appears
    .to(S, { fx: 1, duration: 0.9, ease: "power3.out" }, 0) // x and y use different easing,
    .to(S, { fy: 1, duration: 0.9, ease: "power1.inOut" }, 0) // so the flight is a curve
    .set(S, { m: 1 }, 1) // arrow → "+"
    .to(S, { px: 1, duration: 1.2, ease: "power2.inOut" }, 1.1) // drag to the corner
    .to(S, { py: 1, duration: 1.2, ease: "sine.inOut" }, 1.1)
    .set(S, { m: 0 }, 2.3) // "+" → arrow
    .to(S, { h: 1, duration: 0.25, ease: "none" }, 2.3) // handles appear
    .to(S, { h: 0, duration: 0.3, ease: "none" }, 2.8) // handles fade
    .to(S, { ox: 1, oy: 1, duration: 0.7, ease: "power2.in" }, 2.8) // cursor drifts away
    .to(S, { b: 1, duration: 0.4, ease: "none" }, 3.1)
    .to(S, { s: N + LEAD + TAIL, duration: typeDuration, ease: "none" }, 3.0); // typing

  render();
  return tl;
}

// Reduced-motion visitors: show everything at once
function showAll(box: HTMLElement) {
  box.querySelector<HTMLElement>("[data-frame]")!.style.clipPath = "none";
  box.querySelectorAll(".t-char").forEach((c) => c.classList.add("typed"));
  box.querySelector<HTMLElement>("[data-cursor]")!.style.display = "none";
  box.querySelectorAll<HTMLElement>("[data-handle]").forEach((el) => (el.style.display = "none"));
}

export default function AboutCard({ controlRef }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { boxes } = config.about;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const boxEls = Array.from(root.querySelectorAll<HTMLElement>("[data-box]"));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      boxEls.forEach(showAll);
      controlRef.current = () => {};
      return () => {
        controlRef.current = null;
      };
    }

    const cleanups: Array<() => void> = [];
    const ctx = gsap.context(() => {
      const master = gsap.timeline({ paused: true });
      let at = 0;
      boxEls.forEach((box) => {
        const t = buildBox(box, cleanups);
        master.add(t, at);
        at += t.duration() + 0.3; // next box starts after this one finishes
      });
      master.to({}, { duration: 0.6 }, at); // small hold at the end
      controlRef.current = (p) => {
        master.progress(p);
      };
    }, root);

    return () => {
      cleanups.forEach((fn) => fn());
      ctx.revert();
      controlRef.current = null;
    };
  }, [controlRef]);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-20">
      {boxes.map((box, i) => (
        <div key={box.id} data-box className={`absolute ${POSITIONS[i]}`}>
          <div data-frame className="border border-ink/40 bg-bg/85 p-4 md:p-5">
            {box.blocks.map((b) => (
              <section key={b.id} className="mb-4 last:mb-0">
                <Typed
                  as="h2"
                  text={b.label}
                  className="mb-1.5 font-mono text-[10px] tracking-[0.3em] text-muted"
                />
                <Typed
                  text={b.text}
                  className="font-type text-[clamp(0.85rem,1.25vw,1.1rem)] leading-relaxed text-ink"
                />
              </section>
            ))}
          </div>

          {/* selection handles, like in a design tool */}
          <i data-handle className="absolute -left-[4px] -top-[4px] h-[7px] w-[7px] border border-ink bg-bg opacity-0" />
          <i data-handle className="absolute -right-[4px] -top-[4px] h-[7px] w-[7px] border border-ink bg-bg opacity-0" />
          <i data-handle className="absolute -bottom-[4px] -left-[4px] h-[7px] w-[7px] border border-ink bg-bg opacity-0" />
          <i data-handle className="absolute -bottom-[4px] -right-[4px] h-[7px] w-[7px] border border-ink bg-bg opacity-0" />

          <Cursor tag={box.tag} />
        </div>
      ))}
    </div>
  );
}