import { useEffect, useState } from "react";
import { getTier } from "@/lib/duka/utils";

export function CreditRing({ score, size = 180 }: { score: number; size?: number }) {
  const tier = getTier(score);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setProgress(score), 80);
    return () => clearTimeout(t);
  }, [score]);
  const stroke = size >= 100 ? 14 : Math.max(4, Math.round(size * 0.1));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, progress)) / 100) * c;
  const numberSize = Math.max(13, Math.round(size * 0.233));
  const tierSize = Math.max(9, Math.round(size * 0.072));
  return (
    <div style={{ display: "grid", placeItems: "center", position: "relative", width: size, height: size, margin: size >= 100 ? "0 auto" : 0, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={tier.color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", textAlign: "center" }}>
        <div style={{ fontSize: numberSize, fontWeight: 900, lineHeight: 1, color: size >= 100 ? "var(--dy-text)" : "#fff" }}>{score}</div>
        {size >= 100 && (
          <div style={{ fontSize: 13, fontWeight: 700, color: tier.color, marginTop: 4, textTransform: "uppercase", letterSpacing: ".08em" }}>{tier.swahili}</div>
        )}
      </div>
    </div>
  );
}