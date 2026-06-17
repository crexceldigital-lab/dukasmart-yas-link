import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useDuka } from "@/lib/duka/store";
import { formatTZS } from "@/lib/duka/utils";
import { YasLogo, DukaSmartWordmark } from "@/components/duka/YasLogo";
import { LangToggle, useI18n } from "@/lib/duka/i18n";
import { Link2, CreditCard, Lock, Info, Clock, Check, X, RotateCcw } from "lucide-react";
import { ProBadge } from "@/components/duka/ProBadge";

export const Route = createFileRoute("/pay/$slug")({
  head: () => ({ meta: [{ title: "Lipa kwa Mixx by Yas — DUKA SMART" }, { name: "description", content: "Lipa salama kupitia Mixx by Yas." }] }),
  component: PayPage,
});

function PayPage() {
  const { slug } = Route.useParams();
  const { merchant, links, getLink, startTransaction, confirmTransaction, failTransaction, getTransaction } = useDuka();
  const { t } = useI18n();
  // Resolve slug: direct link, then merchant customSlug / dukaId → newest active link.
  const resolveLink = () => {
    const direct = getLink(slug);
    if (direct) return direct;
    if (merchant && (merchant.customSlug === slug || merchant.dukaId.toLowerCase() === slug.toLowerCase())) {
      return links[0];
    }
    return undefined;
  };
  const [link, setLink] = useState(resolveLink());
  const [phone, setPhone] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [stage, setStage] = useState<"form"|"pending"|"confirmed"|"failed">("form");
  const [txId, setTxId] = useState<string | null>(null);

  useEffect(() => { setLink(resolveLink()); /* eslint-disable-next-line */ }, [slug, getLink, merchant, links]);

  // Demo: auto-confirm after 6 seconds, with 15% chance of failure
  useEffect(() => {
    if (stage !== "pending" || !txId) return;
    const t = setTimeout(() => {
      if (Math.random() < 0.85) { confirmTransaction(txId); setStage("confirmed"); }
      else { failTransaction(txId); setStage("failed"); }
    }, 6000);
    return () => clearTimeout(t);
  }, [stage, txId, confirmTransaction, failTransaction]);

  if (!link) {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "var(--dy-bg)", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <div>
          <Link2 size={56} strokeWidth={1.5} color="var(--dy-muted)" />
          <h1 style={{ fontSize: 20, fontWeight: 800, marginTop: 12 }}>{t("Kiungo Hakipatikani", "Link Not Found")}</h1>
          <p style={{ fontSize: 14, color: "var(--dy-muted)", marginTop: 6 }}>{t("Kiungo hiki cha malipo hakipo au kimemalizika muda wake.", "This payment link doesn't exist or has expired.")}</p>
        </div>
      </div>
    );
  }

  const tx = txId ? getTransaction(txId) : null;
  const ref = tx?.ref;

  const submit = () => {
    if (phone.replace(/\D/g,"").length < 9) return;
    const t = startTransaction(slug, phone.replace(/\D/g,""), buyerName || undefined);
    setTxId(t.id); setStage("pending");
  };

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "var(--dy-bg)" }}>
      <header style={{ background: "var(--dy-navy)", color: "#fff", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <YasLogo size={26} />
          <DukaSmartWordmark size={15} />
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>{t("Lipa kwa Mixx by Yas", "Pay with Mixx by Yas")}</span>
          <LangToggle />
        </span>
      </header>
      {stage === "form" && (
        <>
          <div style={{ background: "linear-gradient(135deg, var(--dy-navy) 0%, var(--dy-navy-2) 100%)", color: "#fff", padding: "26px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff", color: "var(--dy-navy)", display: "grid", placeItems: "center", fontWeight: 900 }}>{(merchant?.businessName ?? "D")[0]}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{t("Unalipa", "Paying")}</div>
                <div style={{ fontSize: 16, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {merchant?.businessName ?? t("Duka", "Shop")}
                  {merchant?.plan === "pro" && <ProBadge />}
                </div>
              </div>
            </div>
            {link.productPhoto ? <img src={link.productPhoto} alt="" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 14, marginTop: 16 }} /> : null}
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 16 }}>{link.label}</div>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.02em", marginTop: 2 }}>{formatTZS(link.amount)}</div>
          </div>

          <div style={{ padding: 20, display: "grid", gap: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{t("Lipa kwa Mixx by Yas", "Pay with Mixx by Yas")}</div>
            <div><label className="dy-label">{t("Nambari yako ya Mixx *", "Your Mixx Number *")}</label>
              <div style={{ display: "flex", gap: 8 }}>
              <div className="dy-input" style={{ width: 96, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 700 }}>TZ +255</div>
                <input className="dy-input" inputMode="numeric" placeholder="711 000 001" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>
            <div><label className="dy-label">{t("Jina lako (hiari)", "Your Name (optional)")}</label><input className="dy-input" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder={t("k.m. Asha", "e.g. Asha")} /></div>
            <button className="dy-btn dy-btn-primary" onClick={submit} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <CreditCard size={16} strokeWidth={2.5} /> {t(`Lipa ${formatTZS(link.amount)}`, `Pay ${formatTZS(link.amount)}`)}
            </button>
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--dy-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Lock size={12} strokeWidth={2.5} /> {t("Malipo salama kupitia Mixx by Yas", "Secure payment via Mixx by Yas")}
            </div>
            <div style={{ background: "rgba(18,50,116,0.06)", border: "1px solid rgba(18,50,116,0.18)", padding: 12, borderRadius: 10, fontSize: 12.5, color: "var(--dy-navy)", lineHeight: 1.5, display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Info size={16} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{t('Baada ya kubofya "Lipa", utapokea ujumbe wa USSD kwenye simu yako. Ingiza PIN yako ya Mixx ili kukamilisha malipo.', 'After tapping "Pay", you\'ll receive a USSD prompt on your phone. Enter your Mixx PIN to complete payment.')}</span>
            </div>
          </div>
        </>
      )}

      {stage === "pending" && (
        <div style={{ display: "grid", placeItems: "center", padding: "60px 20px", textAlign: "center", gap: 18 }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: "rgba(245,166,35,0.15)", display: "grid", placeItems: "center", color: "var(--dy-yellow)" }}><Clock size={44} strokeWidth={2} /></div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{t("Inasubiri Uthibitisho", "Awaiting Confirmation")}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "var(--dy-yellow)", marginTop: 8 }}>{formatTZS(link.amount)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--dy-muted)", fontSize: 13 }}>
            <span className="dy-spinner dy-spinner-dark" /> {t("Inasubiri uthibitisho...", "Waiting for confirmation...")}
          </div>
          <button className="dy-btn dy-btn-ghost" style={{ width: "auto", padding: "10px 18px" }} onClick={() => { if (txId) failTransaction(txId); setStage("failed"); }}>{t("Malipo hayakufanikiwa? Jaribu Tena", "Payment didn't go through? Try Again")}</button>
        </div>
      )}

      {stage === "confirmed" && (
        <div style={{ display: "grid", placeItems: "center", padding: "60px 20px", textAlign: "center", gap: 16 }}>
          <div className="dy-celebrate" style={{ width: 90, height: 90, borderRadius: "50%", background: "var(--dy-green)", color: "#fff", display: "grid", placeItems: "center" }}><Check size={48} strokeWidth={3} /></div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{t("Malipo Yamekamilika!", "Payment Complete!")}</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "var(--dy-green)" }}>{formatTZS(link.amount)}</div>
          <div style={{ fontSize: 14, color: "var(--dy-muted)" }}>{t("Umelipa ", "You paid ")}<b style={{ color: "var(--dy-text)" }}>{merchant?.businessName ?? t("Duka", "Shop")}</b>{t(" kwa mafanikio", " successfully")}</div>
          {ref ? <div style={{ background: "#F0F4F8", padding: 12, borderRadius: 10, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 14, color: "var(--dy-text)" }}>{t("Risiti: ", "Receipt: ")}{ref}</div> : null}
          <div style={{ fontSize: 12, color: "var(--dy-muted)" }}>{t("Risiti imetumwa kwa nambari yako ya Mixx", "Receipt sent to your Mixx number")}</div>
          <div style={{ marginTop: 30, fontSize: 11.5, color: "var(--dy-muted)" }}>Powered by DUKA SMART × Mixx by Yas</div>
        </div>
      )}

      {stage === "failed" && (
        <div style={{ display: "grid", placeItems: "center", padding: "60px 20px", textAlign: "center", gap: 16 }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: "var(--dy-red)", color: "#fff", display: "grid", placeItems: "center" }}><X size={48} strokeWidth={3} /></div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{t("Malipo Yameshindwa", "Payment Failed")}</div>
          <div style={{ fontSize: 14, color: "var(--dy-muted)" }}>{t("Tatizo limetokea wakati wa kuthibitisha malipo yako. Tafadhali jaribu tena.", "Something went wrong while confirming your payment. Please try again.")}</div>
          <button className="dy-btn dy-btn-primary" style={{ width: "auto", padding: "12px 22px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => { setStage("form"); setTxId(null); }}>
            <RotateCcw size={16} strokeWidth={2.5} /> {t("Jaribu Tena", "Try Again")}
          </button>
        </div>
      )}
      <footer style={{ borderTop: "1px solid var(--dy-border)", marginTop: 24, padding: "16px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "var(--dy-muted)", fontSize: 11.5 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <YasLogo size={22} />
          <DukaSmartWordmark size={13} color="var(--dy-navy)" accent="var(--dy-navy-2)" />
        </span>
        <span>Powered by DUKA SMART × Mixx by Yas</span>
      </footer>
    </div>
  );
}