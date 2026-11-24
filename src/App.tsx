import { useSmoothScroll } from "./hooks/useSmoothScroll";
import Hero from "./sections/Hero/Hero";
import LampCord from "./components/theme/LampCord";

export default function App() {
  useSmoothScroll();

  return (
    <>
      <LampCord />
      <main>
        <Hero />
        <section className="flex h-screen items-center justify-center font-type text-3xl text-ink">
          About — coming in Phase 3
        </section>
      </main>
    </>
  );
}