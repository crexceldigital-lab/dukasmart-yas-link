import { useState } from "react";
import { Modal } from "./Modal";
import { useDuka, type PaymentLink } from "@/lib/duka/store";
import { formatTZS } from "@/lib/duka/utils";
import { useToast } from "./Toast";

export function PaymentLinkModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { products, createLink, merchant } = useDuka();
  const toast = useToast();
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
      if (!pid) { toast("Hakuna bidhaa zinazopatikana"); return; }
      setLink(createLink({ productId: pid }));
    } else {
      const amt = Number((customAmount || "").replace(/\D/g, ""));
      if (!amt) { toast("Weka kiasi sahihi"); return; }
      setLink(createLink({ customAmountTzs: amt, customLabel: customLabel || "Malipo" }));
    }
  };

  const url = link && typeof window !== "undefined" ? `${window.location.origin}/pay/${link.slug}` : "";

  const copy = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); setCopied(true); toast("Imenakiliwa! ✓"); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  const whatsapp = () => {
    if (!url || !link) return;
    const text = encodeURIComponent(`Habari! Tafadhali lipa ${formatTZS(link.amount)} kwa ${link.label} kupitia Mixx by Yas:\n${url}\n— ${merchant?.businessName ?? "DUKA SMART"}`);
    window.open("https://wa.me/?text=" + text, "_blank");
  };

  return (
    <Modal open={open} onClose={close} title={link ? "🎉 Kiungo Kimeundwa!" : "Unda Kiungo cha Malipo"} subtitle={link ? undefined : "Shiriki kiungo na mnunuzi wako — watalipa kwa Mixx by Yas"}>
      {!link ? (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "#F0F4F8", padding: 4, borderRadius: 12 }}>
            <button onClick={() => setMode("product")} className="dy-btn" style={{ background: mode==="product" ? "#fff" : "transparent", color: "var(--dy-text)", boxShadow: mode==="product" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", minHeight: 40 }}>📦 Bidhaa</button>
            <button onClick={() => setMode("custom")} className="dy-btn" style={{ background: mode==="custom" ? "#fff" : "transparent", color: "var(--dy-text)", boxShadow: mode==="custom" ? "0 1px 4px rgba(0,0,0,0.08)" : "none", minHeight: 40 }}>✍️ Kiasi Maalum</button>
          </div>
          {mode === "product" ? (
            <div>
              <label className="dy-label">Chagua Bidhaa</label>
              <select className="dy-input" value={productId} onChange={e => setProductId(e.target.value)}>
                {available.length === 0 ? <option value="">Hakuna bidhaa zinazopatikana</option> : null}
                {available.map(p => <option key={p.id} value={p.id}>{p.name} — {formatTZS(p.priceTzs)}</option>)}
              </select>
            </div>
          ) : (
            <>
              <div>
                <label className="dy-label">Kiasi (TZS)</label>
                <input className="dy-input" inputMode="numeric" placeholder="50000" value={customAmount} onChange={e => setCustomAmount(e.target.value.replace(/\D/g,""))} />
              </div>
              <div>
                <label className="dy-label">Maelezo (hiari)</label>
                <input className="dy-input" placeholder="k.m. Huduma ya ushonaji" value={customLabel} onChange={e => setCustomLabel(e.target.value)} />
              </div>
            </>
          )}
          <button className="dy-btn dy-btn-primary" onClick={submit}>⚡ Unda Kiungo</button>
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
            <button className="dy-btn dy-btn-ghost" onClick={copy}>{copied ? "✓ Imenakiliwa!" : "📋 Nakili"}</button>
          </div>
          <button className="dy-btn dy-btn-ghost" onClick={reset}>← Unda Kiungo Kingine</button>
        </div>
      )}
    </Modal>
  );
}