import { Modal } from "./Modal";
import { useDuka } from "@/lib/duka/store";
import { useI18n } from "@/lib/duka/i18n";
import { Calendar, X } from "lucide-react";

export function ManageSubscriptionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { merchant, cancelPro } = useDuka();
  const { t } = useI18n();
  if (!merchant) return null;
  const renewal = merchant.proRenewalDate ? new Date(merchant.proRenewalDate) : null;
  return (
    <Modal open={open} onClose={onClose} title={t("Simamia Usajili", "Manage Subscription")}>
      <div style={{ display: "grid", gap: 14 }}>
        <div className="dy-card" style={{ background: "#F0F4F8", border: "none" }}>
          <div style={{ fontSize: 12, color: "var(--dy-muted)" }}>{t("Mpango", "Plan")}</div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Pokea Pro</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dy-green)", marginTop: 4 }}>TZS 8,000 / {t("mwezi", "month")}</div>
        </div>
        {renewal && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--dy-text)" }}>
            <Calendar size={14} strokeWidth={2.5} color="var(--dy-navy)" />
            {t("Inajiongeza tena: ", "Renews on: ")}
            <b>{renewal.toLocaleDateString()}</b>
          </div>
        )}
        <button
          className="dy-btn dy-btn-danger-ghost"
          onClick={() => {
            if (confirm(t("Una uhakika unataka kughairi Pro?", "Are you sure you want to cancel Pro?"))) {
              cancelPro();
              onClose();
            }
          }}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          <X size={16} strokeWidth={2.5} /> {t("Ghairi Usajili", "Cancel Subscription")}
        </button>
      </div>
    </Modal>
  );
}