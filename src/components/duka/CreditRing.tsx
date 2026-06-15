import { useEffect, useState } from "react";
import { getTier } from "@/lib/duka/utils";

export function CreditRing({ score }: { score: number }) {
  const tier = getTier(score);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setProgress(score), 80);
    return () => clearTimeout(t);
  }, [score]);
  const size = 180, stroke = 14, r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, progress)) / 100) * c;
  return (
    <div style={{ display: "grid", placeItems: "center", position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={tier.color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", textAlign: "center" }}>
        <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1, color: "var(--dy-text)" }}>{score}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: tier.color, marginTop: 4, textTransform: "uppercase", letterSpacing: ".08em" }}>{tier.swahili}</div>
      </div>
    </div>
  );
}