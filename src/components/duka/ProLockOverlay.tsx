import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useProGate } from "@/lib/duka/useProGate";
import { useI18n } from "@/lib/duka/i18n";

export function ProLockOverlay({ children, message }: { children: ReactNode; message?: string }) {
  const { openUpgrade } = useProGate();
  const { t } = useI18n();
  return (
    <div style={{ position: "relative" }}>
      <div aria-hidden style={{ filter: "blur(6px)", pointerEvents: "none", userSelect: "none", opacity: 0.6 }}>
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          background: "rgba(247,248,251,0.55)",
          borderRadius: 14,
        }}
      >
        <div style={{ textAlign: "center", padding: 16, display: "grid", justifyItems: "center", gap: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F5A623", color: "#fff", display: "grid", placeItems: "center", boxShadow: "0 6px 16px rgba(245,166,35,0.35)" }}>
            <Lock size={20} strokeWidth={2.5} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--dy-navy)" }}>
            {message ?? t("Kipengele cha Pro", "Pro Feature")}
          </div>
          <button
            onClick={openUpgrade}
            style={{ background: "var(--dy-navy)", color: "#fff", border: "none", borderRadius: 999, padding: "8px 16px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
          >
            {t("Pandisha hadi Pro", "Upgrade to Pro")}
          </button>
        </div>
      </div>
    </div>
  );
}