import { useCallback, useState } from "react";

export type Theme = "night" | "paper";

const read = (): Theme =>
  document.documentElement.dataset.theme === "paper" ? "paper" : "night";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read);

  // x, y = where the circle reveal starts (the knob's position)
  const toggle = useCallback((x: number, y: number) => {
    const next: Theme = read() === "night" ? "paper" : "night";

    const apply = () => {
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch {
        /* storage can be blocked; the theme still changes */
      }
      setTheme(next);
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduce) {
      apply();
      return;
    }

    const transition = document.startViewTransition(apply);
    transition.ready.then(() => {
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 750,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  }, []);

  return { theme, toggle };
}