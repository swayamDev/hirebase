"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

/**
 * Scroll-triggered reveal: children fade/rise in when they enter the
 * viewport. Renders visible immediately under prefers-reduced-motion.
 */
export function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [intersected, setIntersected] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const shown = reducedMotion || intersected;

  useEffect(() => {
    if (reducedMotion) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    // One-time mount check (not a per-render cascade): reveal immediately
    // if already scrolled into view (initial viewport, anchor jump),
    // otherwise wait for the observer callback to fire.
    if (node.getBoundingClientRect().top < window.innerHeight) {
      setIntersected(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIntersected(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn(
        "transition-all duration-700 ease-out",
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
