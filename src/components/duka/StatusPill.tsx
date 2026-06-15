import type { TxStatus } from "@/lib/duka/store";

export function StatusPill({ status }: { status: TxStatus }) {
  const map: Record<TxStatus, { label: string; bg: string; fg: string }> = {
    confirmed: { label: "Imekamilika", bg: "rgba(0,168,107,0.12)", fg: "#00A86B" },
    pending:   { label: "Inasubiri",   bg: "rgba(245,166,35,0.15)", fg: "#B7791F" },
    failed:    { label: "Imeshindwa",  bg: "rgba(231,76,60,0.12)",  fg: "#C0392B" },
  };
  const c = map[status];
  return <span className="dy-pill" style={{ background: c.bg, color: c.fg }}>{c.label}</span>;
}