import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from its previous value to `target` using an
 * ease-out curve. Returns the in-progress value to render each frame.
 *
 * Re-triggers automatically whenever `target` changes (e.g. a new
 * realtime transaction lands and stats.today.total goes up) — it does
 * NOT replay on every render, only when the target actually changes.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(target);
  const prevTarget = useRef(target);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const from = prevTarget.current;
    const to = target;
    prevTarget.current = target;

    if (from === to) {
      setValue(to);
      return;
    }

    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    }
    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}
