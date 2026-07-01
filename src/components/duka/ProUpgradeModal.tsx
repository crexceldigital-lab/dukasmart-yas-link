import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { useDuka } from "@/lib/duka/store";
import { useI18n } from "@/lib/duka/i18n";
import { useToast } from "./Toast";
import { Check, CreditCard, Clock, X, RotateCcw, Crown, PartyPopper } from "lucide-react";

const PRICE = 8000;

export function ProUpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { merchant, upgradeToPro } = useDuka();
  const { t } = useI18n();
  const toast = useToast();
  const [stage, setStage] = useState<"intro" | "pending" | "confirmed" | "failed">("intro");

  useEffect(() => { if (open) setStage("intro"); }, [open]);

  useEffect(() => {
    if (stage !== "pending") return;
    const id = setTimeout(() => {
      if (Math.random() < 0.92) setStage("confirmed");
      else setStage("failed");
    }, 4500);
    return () => clearTimeout(id);
  }, [stage]);

  useEffect(() => {
    if (stage !== "confirmed") return;
    upgradeToPro();
    toast(t("Karibu kwenye Pokea Pro!", "Welcome to Pokea Pro!"));
    const id = setTimeout(() => onClose(), 1800);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const features: [string, string][] = [
    [t("Bidhaa zisizo na kikomo", "Unlimited products"), ""],
    [t("Hifadhidata ya wateja wako", "Your customer database"), ""],
    [t("Viungo vya malipo kwa wingi", "Bulk payment links"), ""],
    [t("Arifa za stoki kuisha", "Low-stock alerts"), ""],
    [t("Kiungo chako maalum cha duka", "Your custom shop link"), ""],
    [t("Wafanyakazi wengine 2", "2 additional staff"), ""],
    [t("Katalogi ya PDF moja kwa moja", "Auto PDF catalogue"), ""],
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Crown size={20} color="#F5A623" strokeWidth={2.5} />
          {t("Pandisha hadi Pokea Pro", "Upgrade to Pokea Pro")}
        </span>
      }
      subtitle={stage === "intro" ? t("Fungua nguvu kamili ya duka lako", "Unlock the full power of your shop") : undefined}
    >
      {stage === "intro" && (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 10 }}>
            {features.map(([sw]) => (
              <div key={sw} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(0,168,107,0.15)", color: "var(--dy-green)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Check size={14} strokeWidth={3} />
                </span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{sw}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "var(--dy-navy)", color: "#fff", borderRadius: 14, padding: 18, textAlign: "center" }}>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-0.02em" }}>TZS 8,000</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{t("/mwezi", "/month")}</div>
          </div>
          <button className="dy-btn" style={{ background: "var(--dy-green)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => setStage("pending")}>
            <CreditCard size={16} strokeWidth={2.5} /> {t("Lipa kwa Mixx by Yas", "Pay with Mixx by Yas")}
          </button>
          <div style={{ fontSize: 11.5, color: "var(--dy-muted)", textAlign: "center" }}>
            {t(`Tutatuma USSD kwa +${merchant?.phone ?? ""} ili kuthibitisha PIN.`, `We'll send a USSD prompt to +${merchant?.phone ?? ""} to confirm with your PIN.`)}
          </div>
        </div>
      )}

      {stage === "pending" && (
        <div style={{ display: "grid", placeItems: "center", padding: "30px 10px", textAlign: "center", gap: 14 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(245,166,35,0.15)", color: "var(--dy-yellow)", display: "grid", placeItems: "center" }}>
            <Clock size={40} strokeWidth={2} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{t("Inasubiri Uthibitisho", "Awaiting Confirmation")}</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "var(--dy-yellow)" }}>TZS {PRICE.toLocaleString()}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--dy-muted)", fontSize: 13 }}>
            <span className="dy-spinner dy-spinner-dark" />
            {t("Ingiza PIN yako ya Mixx kukamilisha", "Enter your Mixx PIN to complete")}
          </div>
        </div>
      )}

      {stage === "confirmed" && (
        <div style={{ display: "grid", placeItems: "center", padding: "30px 10px", textAlign: "center", gap: 14 }}>
          <div className="dy-celebrate" style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--dy-green)", color: "#fff", display: "grid", placeItems: "center" }}>
            <PartyPopper size={40} strokeWidth={2.5} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{t("Karibu Pro!", "Welcome to Pro!")}</div>
          <div style={{ fontSize: 13, color: "var(--dy-muted)" }}>{t("Akaunti yako imepandishwa.", "Your account has been upgraded.")}</div>
        </div>
      )}

      {stage === "failed" && (
        <div style={{ display: "grid", placeItems: "center", padding: "30px 10px", textAlign: "center", gap: 14 }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--dy-red)", color: "#fff", display: "grid", placeItems: "center" }}>
            <X size={40} strokeWidth={3} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{t("Malipo Yameshindwa", "Payment Failed")}</div>
          <button className="dy-btn dy-btn-primary" style={{ width: "auto", padding: "12px 22px", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={() => setStage("intro")}>
            <RotateCcw size={16} strokeWidth={2.5} /> {t("Jaribu Tena", "Try Again")}
          </button>
        </div>
      )}
    </Modal>
  );
}