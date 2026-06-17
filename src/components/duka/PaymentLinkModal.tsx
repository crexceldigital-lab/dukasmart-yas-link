import { useState } from "react";
import { Modal } from "./Modal";
import { useDuka, type PaymentLink } from "@/lib/duka/store";
import { formatTZS } from "@/lib/duka/utils";
import { useToast } from "./Toast";
import { useI18n } from "@/lib/duka/i18n";

export function PaymentLinkModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { products, createLink, merchant } = useDuka();
  const toast = useToast();
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<"product"|"custom">("product");
  const available = products.filter(p => p.isAvailable);
  const [productId, setProductId] = useState(available[0]?.id ?? "");
  const [customAmount, setCustomAmount] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => { setLink(null); setCopied(false); setCustomAmount(""); setCustomLabel(""); };
  const close = () => { reset(); onClose(); };

  const submit = () => {
    if (mode === "product") {
      const pid = productId || available[0]?.id;
      if (!pid) { toast(t("Hakuna bidhaa zinazopatikana", "No available products")); return; }
      setLink(createLink({ productId: pid }));
    } else {
      const amt = Number((customAmount || "").replace(/\D/g, ""));
      if (!amt) { toast(t("Weka kiasi sahihi", "Enter a valid amount")); return; }
      setLink(createLink({ customAmountTzs: amt, customLabel: customLabel || t("Malipo", "Payment") }));
    }
  };

  const url = link && typeof window !== "undefined" ? `${window.location.origin}/pay/${link.slug}` : "";

  const copy = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); toast(t("Imenakiliwa! ✓", "Copied! ✓")); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  const whatsapp = () => {
    if (!url || !link) return;
    const lines = lang === "en" ? [
      `*DUKA SMART* — Payment Request`,
      ``,
      `Hello! 👋 Please complete your payment:`,
      ``,
      `🛒 Item: ${link.label}`,
      `💰 Amount: ${formatTZS(link.amount)}`,
      `🔗 Payment Link: ${url}`,
      ``,
      `Pay securely via *Mixx by Yas*.`,
      `— ${merchant?.businessName ?? "DUKA SMART"}`,
    ].join("\n") : [
      `*DUKA SMART* — Ombi la Malipo`,
      ``,
      `Habari! 👋 Tafadhali kamilisha malipo yako:`,
      ``,
      `🛒 Bidhaa: ${link.label}`,
      `💰 Kiasi: ${formatTZS(link.amount)}`,
      `🔗 Kiungo cha Malipo: ${url}`,
      ``,
      `Lipa salama kupitia *Mixx by Yas*.`,
      `— ${merchant?.businessName ?? "DUKA SMART"}`,
    ].join("\n");
    window.open("https://wa.me/?text=" + encodeURIComponent(lines), "_blank");
  };

  return (
    <Modal open={open} onClose={close} title={link ? t("🎉 Kiungo Kimeundwa!", "🎉 Link Created!") : t("Unda Kiungo cha Malipo", "Create Payment Link")} subtitle={link ? undefined : t("Shiriki kiungo na mnunuzi wako — watalipa kwa Mixx by Yas", "Share the link with your buyer — they'll pay via Mixx by Yas")}>
      {!link ? (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "#F0F4F8", padding: 4, borderRadius: 12 }}>
            <button onClick={() => setMode("product")} className="dy-btn" style={{ background: mode==="product" ? "#fff" : "transparent", color: "var(--dy-text)", boxShadow: mode==="product" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", minHeight: 40 }}>{t("📦 Bidhaa", "📦 Product")}</button>
            <button onClick={() => setMode("custom")} className="dy-btn" style={{ background: mode==="custom" ? "#fff" : "transparent", color: "var(--dy-text)", boxShadow: mode==="custom" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", minHeight: 40 }}>{t("✍️ Kiasi Maalum", "✍️ Custom Amount")}</button>
          </div>
          {mode === "product" ? (
            <div>
              <label className="dy-label">{t("Chagua Bidhaa", "Select Product")}</label>
              <select className="dy-input" value={productId} onChange={e => setProductId(e.target.value)}>
                {available.length === 0 ? <option value="">{t("Hakuna bidhaa zinazopatikana", "No available products")}</option> : null}
                {available.map(p => <option key={p.id} value={p.id}>{p.name} — {formatTZS(p.priceTzs)}</option>)}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="dy-label">{t("Kiasi (TZS)", "Amount (TZS)")}</label>
                <input className="dy-input" inputMode="numeric" placeholder="50000" value={customAmount} onChange={e => setCustomAmount(e.target.value.replace(/\D/g,""))} />
              </div>
              <div>
                <label className="dy-label">{t("Maelezo (hiari)", "Description (optional)")}</label>
                <input className="dy-input" placeholder={t("k.m. Huduma ya ushonaji", "e.g. Tailoring service")} value={customLabel} onChange={e => setCustomLabel(e.target.value)} />
              </div>
            </>
          )}
          <button className="dy-btn dy-btn-primary" onClick={submit}>{t("⚡ Unda Kiungo", "⚡ Create Link")}</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14, textAlign: "center" }}>
          <div style={{ fontSize: 40 }} className="dy-celebrate">🎉</div>
          <div>
            <div style={{ fontSize: 14, color: "var(--dy-muted)" }}>{link.label}</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "var(--dy-green)" }}>{formatTZS(link.amount)}</div>
          </div>
          <div style={{ background: "#F0F4F8", padding: 12, borderRadius: 10, fontSize: 13, color: "var(--dy-navy)", wordBreak: "break-all", textAlign: "left", fontWeight: 600 }}>{url}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="dy-btn" style={{ background: "#25D366", color: "#fff" }} onClick={whatsapp}>📱 WhatsApp</button>
            <button className="dy-btn dy-btn-ghost" onClick={copy}>{copied ? t("✓ Imenakiliwa!", "✓ Copied!") : t("📋 Nakili", "📋 Copy")}</button>
          </div>
          <button className="dy-btn dy-btn-ghost" onClick={reset}>{t("← Unda Kiungo Kingine", "← Create Another Link")}</button>
        </div>
      )}
    </Modal>
  );
}