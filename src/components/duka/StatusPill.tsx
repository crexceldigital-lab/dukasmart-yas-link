import type { TxStatus } from "@/lib/duka/store";
import { useI18n } from "@/lib/duka/i18n";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

export function StatusPill({ status }: { status: TxStatus }) {
  const { t } = useI18n();
  const map: Record<TxStatus, { label: string; bg: string; fg: string; Icon: typeof CheckCircle2 }> = {
    confirmed: { label: t("Imekamilika", "Completed"), bg: "rgba(0,168,107,0.12)", fg: "#00A86B", Icon: CheckCircle2 },
    pending:   { label: t("Inasubiri",   "Pending"),   bg: "rgba(245,166,35,0.15)", fg: "#B7791F", Icon: Clock },
    failed:    { label: t("Imeshindwa",  "Failed"),    bg: "rgba(231,76,60,0.12)",  fg: "#C0392B", Icon: XCircle },
  };
  const c = map[status];
  return (
    <span className="dy-pill" style={{ background: c.bg, color: c.fg, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <c.Icon size={12} strokeWidth={2.5} />
      {c.label}
    </span>
  );
}