import { useState } from "react";
import { Modal } from "./Modal";
import { useDuka, type PaymentLink } from "@/lib/duka/store";
import { formatTZS } from "@/lib/duka/utils";
import { useToast } from "./Toast";
import { useI18n } from "@/lib/duka/i18n";
import { Package, Pencil, Zap, MessageCircle, Copy, Check, PartyPopper, ArrowLeft, Users, Plus, Trash2, Lock } from "lucide-react";
import { useProGate } from "@/lib/duka/useProGate";

export function PaymentLinkModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { products, createLink, merchant } = useDuka();
  const toast = useToast();
  const { t, lang } = useI18n();
  const { isPro, openUpgrade } = useProGate();
  const [mode, setMode] = useState<"product"|"custom"|"bulk">("product");
  const available = products.filter(p => p.isAvailable);
  const [productId, setProductId] = useState(available[0]?.id ?? "");
  const [customAmount, setCustomAmount] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [copied, setCopied] = useState(false);
  // Bulk mode state
  const [bulkProductId, setBulkProductId] = useState(available[0]?.id ?? "");
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkUseProduct, setBulkUseProduct] = useState(true);
  const [bulkRows, setBulkRows] = useState<{ name: string; phone: string }[]>([{ name: "", phone: "" }, { name: "", phone: "" }]);
  const [bulkLinks, setBulkLinks] = useState<{ row: { name: string; phone: string }; link: PaymentLink }[] | null>(null);

  const reset = () => { setLink(null); setCopied(false); setCustomAmount(""); setCustomLabel(""); setBulkLinks(null); };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (mode === "product") {
      const pid = productId || available[0]?.id;
      if (!pid) { toast(t("Hakuna bidhaa zinazopatikana", "No available products")); return; }
      setLink(await createLink({ productId: pid }));
    } else {
      const amt = Number((customAmount || "").replace(/\D/g, ""));
      if (!amt) { toast(t("Weka kiasi sahihi", "Enter a valid amount")); return; }
      setLink(await createLink({ customAmountTzs: amt, customLabel: customLabel || t("Malipo", "Payment") }));
    }
  };

  const url = link && typeof window !== "undefined" ? `${window.location.origin}/pay/${link.slug}` : "";

  const copy = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); toast(t("Imenakiliwa!", "Copied!")); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  const whatsapp = () => {
    if (!url || !link) return;
    const lines = lang === "en" ? [
      `*POKEA* — Payment Request`,
      ``,
      `Hello! Please complete your payment:`,
      ``,
      `Item: ${link.label}`,
      `Amount: ${formatTZS(link.amount)}`,
      `Payment Link: ${url}`,
      ``,
      `Pay securely via *Mixx by Yas*.`,
      `— ${merchant?.businessName ?? "POKEA"}`,
    ].join("\n") : [
      `*POKEA* — Ombi la Malipo`,
      ``,
      `Habari! Tafadhali kamilisha malipo yako:`,
      ``,
      `Bidhaa: ${link.label}`,
      `Kiasi: ${formatTZS(link.amount)}`,
      `Kiungo cha Malipo: ${url}`,
      ``,
      `Lipa salama kupitia *Mixx by Yas*.`,
      `— ${merchant?.businessName ?? "POKEA"}`,
    ].join("\n");
    window.open("https://wa.me/?text=" + encodeURIComponent(lines), "_blank");
  };

  const buildWaText = (linkRec: PaymentLink, url: string) => {
    return lang === "en"
      ? `*POKEA* — Payment Request\n\nItem: ${linkRec.label}\nAmount: ${formatTZS(linkRec.amount)}\nPayment Link: ${url}\n\nPay securely via *Mixx by Yas*.\n— ${merchant?.businessName ?? "POKEA"}`
      : `*POKEA* — Ombi la Malipo\n\nBidhaa: ${linkRec.label}\nKiasi: ${formatTZS(linkRec.amount)}\nKiungo cha Malipo: ${url}\n\nLipa salama kupitia *Mixx by Yas*.\n— ${merchant?.businessName ?? "POKEA"}`;
  };

  const generateBulk = async () => {
    const validRows = bulkRows.filter(r => r.phone.replace(/\D/g, "").length >= 9);
    if (validRows.length === 0) { toast(t("Weka angalau mnunuzi mmoja", "Add at least one buyer")); return; }
    let amt = 0; let lbl = "";
    if (bulkUseProduct) {
      const p = products.find(x => x.id === bulkProductId);
      if (!p) { toast(t("Chagua bidhaa", "Select a product")); return; }
      amt = p.priceTzs; lbl = p.name;
    } else {
      amt = Number((bulkAmount || "").replace(/\D/g, ""));
      if (!amt) { toast(t("Weka kiasi sahihi", "Enter a valid amount")); return; }
      lbl = t("Malipo", "Payment");
    }
    const out = await Promise.all(validRows.map(async row => ({
      row,
      link: await createLink(bulkUseProduct ? { productId: bulkProductId } : { customAmountTzs: amt, customLabel: lbl }),
    })));
    setBulkLinks(out);
    toast(t(`Viungo ${out.length} vimetengenezwa`, `${out.length} links generated`));
  };

  const shareAllBulk = () => {
    if (!bulkLinks) return;
    bulkLinks.forEach((b, i) => {
      const u = `${window.location.origin}/pay/${b.link.slug}`;
      setTimeout(() => window.open("https://wa.me/?text=" + encodeURIComponent(buildWaText(b.link, u)), "_blank"), i * 350);
    });
  };

  return (
    <Modal open={open} onClose={close} title={link ? t("Kiungo Kimeundwa!", "Link Created!") : t("Unda Kiungo cha Malipo", "Create Payment Link")} subtitle={link ? undefined : t("Shiriki kiungo na mnunuzi wako — watalipa kwa Mixx by Yas", "Share the link with your buyer — they'll pay via Mixx by Yas")}>
      {bulkLinks ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, textAlign: "center" }}>
            {bulkLinks.length} {t("viungo vimetengenezwa", "links generated")}
          </div>
          <div style={{ display: "grid", gap: 8, maxHeight: 240, overflowY: "auto" }}>
            {bulkLinks.map(b => {
              const u = `${window.location.origin}/pay/${b.link.slug}`;
              return (
                <div key={b.link.linkId} style={{ background: "#F0F4F8", borderRadius: 10, padding: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700 }}>{b.row.name || `+${b.row.phone}`}</div>
                    <div style={{ fontSize: 11, color: "var(--dy-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u}</div>
                  </div>
                  <button onClick={() => window.open("https://wa.me/" + b.row.phone.replace(/\D/g,"") + "?text=" + encodeURIComponent(buildWaText(b.link, u)), "_blank")} style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 8, padding: "8px 10px", display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                    <MessageCircle size={14} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
          </div>
          <button className="dy-btn" style={{ background: "#25D366", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={shareAllBulk}>
            <MessageCircle size={16} strokeWidth={2.5} /> {t("Shiriki Vyote", "Share All")}
          </button>
          <button className="dy-btn dy-btn-ghost" onClick={reset} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><ArrowLeft size={16} strokeWidth={2.5} /> {t("Rudi", "Back")}</button>
        </div>
      ) : !link ? (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, background: "#F0F4F8", padding: 4, borderRadius: 12 }}>
            <button onClick={() => setMode("product")} className="dy-btn" style={{ background: mode==="product" ? "#fff" : "transparent", color: "var(--dy-text)", boxShadow: mode==="product" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", minHeight: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Package size={14} strokeWidth={2.5} /> {t("Bidhaa", "Product")}</button>
            <button onClick={() => setMode("custom")} className="dy-btn" style={{ background: mode==="custom" ? "#fff" : "transparent", color: "var(--dy-text)", boxShadow: mode==="custom" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", minHeight: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Pencil size={14} strokeWidth={2.5} /> {t("Kiasi Maalum", "Custom Amount")}</button>
            <button
              onClick={() => { if (!isPro) { openUpgrade(); return; } setMode("bulk"); }}
              className="dy-btn"
              style={{ background: mode==="bulk" ? "#fff" : "transparent", color: isPro ? "var(--dy-text)" : "var(--dy-muted)", boxShadow: mode==="bulk" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", minHeight: 40, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, position: "relative" }}
            >
              {isPro ? <Users size={14} strokeWidth={2.5} /> : <Lock size={12} strokeWidth={2.5} />}
              {t("Wingi", "Bulk")}
              {!isPro && <span style={{ fontSize: 8, fontWeight: 900, background: "#F5A623", color: "#fff", padding: "1px 4px", borderRadius: 999 }}>PRO</span>}
            </button>
          </div>
          {mode === "product" && (
            <div>
              <label className="dy-label">{t("Chagua Bidhaa", "Select Product")}</label>
              <select className="dy-input" value={productId} onChange={e => setProductId(e.target.value)}>
                {available.length === 0 ? <option value="">{t("Hakuna bidhaa zinazopatikana", "No available products")}</option> : null}
                {available.map(p => <option key={p.id} value={p.id}>{p.name} — {formatTZS(p.priceTzs)}</option>)}
              </select>
            </div>
          )}
          {mode === "custom" && (
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
          {mode === "bulk" && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <button onClick={() => setBulkUseProduct(true)} className="dy-btn" style={{ background: bulkUseProduct ? "var(--dy-navy)" : "#F0F4F8", color: bulkUseProduct ? "#fff" : "var(--dy-text)", minHeight: 36, fontSize: 12 }}>{t("Bidhaa", "Product")}</button>
                <button onClick={() => setBulkUseProduct(false)} className="dy-btn" style={{ background: !bulkUseProduct ? "var(--dy-navy)" : "#F0F4F8", color: !bulkUseProduct ? "#fff" : "var(--dy-text)", minHeight: 36, fontSize: 12 }}>{t("Kiasi", "Amount")}</button>
              </div>
              {bulkUseProduct ? (
                <select className="dy-input" value={bulkProductId} onChange={e => setBulkProductId(e.target.value)}>
                  {available.map(p => <option key={p.id} value={p.id}>{p.name} — {formatTZS(p.priceTzs)}</option>)}
                </select>
              ) : (
                <input className="dy-input" inputMode="numeric" placeholder="50000" value={bulkAmount} onChange={e => setBulkAmount(e.target.value.replace(/\D/g, ""))} />
              )}
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dy-muted)" }}>{t("Wanunuzi", "Buyers")} ({bulkRows.length}/50)</div>
              <div style={{ display: "grid", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                {bulkRows.map((r, i) => (
                  <div key={i} style={{ display: "flex", gap: 6 }}>
                    <input className="dy-input" style={{ flex: 1, minHeight: 40, padding: "8px 10px" }} placeholder={t("Jina", "Name")} value={r.name} onChange={e => setBulkRows(rs => rs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                    <input className="dy-input" style={{ flex: 1, minHeight: 40, padding: "8px 10px" }} inputMode="numeric" placeholder="0712..." value={r.phone} onChange={e => setBulkRows(rs => rs.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} />
                    <button onClick={() => setBulkRows(rs => rs.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", color: "var(--dy-red)", cursor: "pointer", display: "inline-flex", padding: "0 6px" }} aria-label="remove"><Trash2 size={14} strokeWidth={2.5} /></button>
                  </div>
                ))}
              </div>
              {bulkRows.length < 50 && (
                <button onClick={() => setBulkRows(rs => [...rs, { name: "", phone: "" }])} className="dy-btn dy-btn-ghost" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40 }}>
                  <Plus size={14} strokeWidth={2.5} /> {t("Ongeza Mnunuzi", "Add Buyer")}
                </button>
              )}
              <button className="dy-btn dy-btn-primary" onClick={generateBulk} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Zap size={16} strokeWidth={2.5} /> {t("Tengeneza Viungo Vyote", "Generate All Links")}
              </button>
            </div>
          )}
          {mode !== "bulk" && (
            <button className="dy-btn dy-btn-primary" onClick={submit} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Zap size={16} strokeWidth={2.5} /> {t("Unda Kiungo", "Create Link")}</button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14, textAlign: "center" }}>
          <div className="dy-celebrate" style={{ color: "var(--dy-green)", display: "inline-flex", justifyContent: "center" }}><PartyPopper size={44} strokeWidth={2} /></div>
          <div>
            <div style={{ fontSize: 14, color: "var(--dy-muted)" }}>{link.label}</div>
            <div style={{ fontSize: 30, fontWeight: 900, color: "var(--dy-green)" }}>{formatTZS(link.amount)}</div>
          </div>
          <div style={{ background: "#F0F4F8", padding: 12, borderRadius: 10, fontSize: 13, color: "var(--dy-navy)", wordBreak: "break-all", textAlign: "left", fontWeight: 600 }}>{url}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button className="dy-btn" style={{ background: "#25D366", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={whatsapp}><MessageCircle size={16} strokeWidth={2.5} /> WhatsApp</button>
            <button className="dy-btn dy-btn-ghost" onClick={copy} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{copied ? <><Check size={16} strokeWidth={2.5} /> {t("Imenakiliwa!", "Copied!")}</> : <><Copy size={16} strokeWidth={2.5} /> {t("Nakili", "Copy")}</>}</button>
          </div>
          <button className="dy-btn dy-btn-ghost" onClick={reset} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}><ArrowLeft size={16} strokeWidth={2.5} /> {t("Unda Kiungo Kingine", "Create Another Link")}</button>
        </div>
      )}
    </Modal>
  );
}