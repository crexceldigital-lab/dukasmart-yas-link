import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useDuka } from "@/lib/duka/store";
import { formatTZS, categoryEmoji } from "@/lib/duka/utils";

export const Route = createFileRoute("/pay/$slug")({
  head: () => ({ meta: [{ title: "Lipa kwa Mixx by Yas — DUKA SMART" }, { name: "description", content: "Lipa salama kupitia Mixx by Yas." }] }),
  component: PayPage,
});

function PayPage() {
  const { slug } = Route.useParams();
  const { merchant, getLink, startTransaction, confirmTransaction, failTransaction, getTransaction } = useDuka();
  const [link, setLink] = useState(getLink(slug));
  const [phone, setPhone] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [stage, setStage] = useState<"form"|"pending"|"confirmed"|"failed">("form");
  const [txId, setTxId] = useState<string | null>(null);

  useEffect(() => { setLink(getLink(slug)); }, [slug, getLink]);

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
          <div style={{ fontSize: 56 }}>🔗</div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginTop: 12 }}>Kiungo Hakipatikani</h1>
          <p style={{ fontSize: 14, color: "var(--dy-muted)", marginTop: 6 }}>Kiungo hiki cha malipo hakipo au kimemalizika muda wake.</p>
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
      {stage === "form" && (
        <>
          <div style={{ background: "linear-gradient(135deg,#1A3E6F,#2A5FAF)", color: "#fff", padding: "26px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff", color: "var(--dy-navy)", display: "grid", placeItems: "center", fontWeight: 900 }}>{(merchant?.businessName ?? "D")[0]}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, opacity: 0.8 }}>Unalipa</div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{merchant?.businessName ?? "Duka"}</div>
              </div>
            </div>
            {link.productPhoto ? <img src={link.productPhoto} alt="" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 14, marginTop: 16 }} /> : null}
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 16 }}>{link.label}</div>
            <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.02em", marginTop: 2 }}>{formatTZS(link.amount)}</div>
          </div>

          <div style={{ padding: 20, display: "grid", gap: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Lipa kwa Mixx by Yas</div>
            <div><label className="dy-label">Nambari yako ya Mixx *</label>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="dy-input" style={{ width: 96, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 700 }}>🇹🇿 +255</div>
                <input className="dy-input" inputMode="numeric" placeholder="711 000 001" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>
            <div><label className="dy-label">Jina lako (hiari)</label><input className="dy-input" value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="k.m. Asha" /></div>
            <button className="dy-btn dy-btn-primary" onClick={submit}>💳 Lipa {formatTZS(link.amount)}</button>
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--dy-muted)" }}>🔒 Malipo salama kupitia Mixx by Yas</div>
            <div style={{ background: "#F0F6FF", border: "1px solid #BCDBFF", padding: 12, borderRadius: 10, fontSize: 12.5, color: "#1A3E6F", lineHeight: 1.5 }}>
              ℹ️ Baada ya kubofya "Lipa", utapokea ujumbe wa USSD kwenye simu yako. Ingiza PIN yako ya Mixx ili kukamilisha malipo.
            </div>
          </div>
        </>
      )}

      {stage === "pending" && (
        <div style={{ display: "grid", placeItems: "center", padding: "60px 20px", textAlign: "center", gap: 18 }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: "rgba(245,166,35,0.15)", display: "grid", placeItems: "center", fontSize: 44 }}>⏳</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Inasubiri Uthibitisho</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "var(--dy-yellow)", marginTop: 8 }}>{formatTZS(link.amount)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--dy-muted)", fontSize: 13 }}>
            <span className="dy-spinner dy-spinner-dark" /> Inasubiri uthibitisho...
          </div>
          <button className="dy-btn dy-btn-ghost" style={{ width: "auto", padding: "10px 18px" }} onClick={() => { if (txId) failTransaction(txId); setStage("failed"); }}>Malipo hayakufanikiwa? Jaribu Tena</button>
        </div>
      )}

      {stage === "confirmed" && (
        <div style={{ display: "grid", placeItems: "center", padding: "60px 20px", textAlign: "center", gap: 16 }}>
          <div className="dy-celebrate" style={{ width: 90, height: 90, borderRadius: "50%", background: "var(--dy-green)", color: "#fff", display: "grid", placeItems: "center", fontSize: 48 }}>✓</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Malipo Yamekamilika!</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "var(--dy-green)" }}>{formatTZS(link.amount)}</div>
          <div style={{ fontSize: 14, color: "var(--dy-muted)" }}>Umelipa <b style={{ color: "var(--dy-text)" }}>{merchant?.businessName ?? "Duka"}</b> kwa mafanikio</div>
          {ref ? <div style={{ background: "#F0F4F8", padding: 12, borderRadius: 10, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 14, color: "var(--dy-text)" }}>Risiti: {ref}</div> : null}
          <div style={{ fontSize: 12, color: "var(--dy-muted)" }}>Risiti imetumwa kwa nambari yako ya Mixx</div>
          <div style={{ marginTop: 30, fontSize: 11.5, color: "var(--dy-muted)" }}>Powered by DUKA SMART × Mixx by Yas</div>
        </div>
      )}

      {stage === "failed" && (
        <div style={{ display: "grid", placeItems: "center", padding: "60px 20px", textAlign: "center", gap: 16 }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: "var(--dy-red)", color: "#fff", display: "grid", placeItems: "center", fontSize: 48 }}>✕</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Malipo Yameshindwa</div>
          <div style={{ fontSize: 14, color: "var(--dy-muted)" }}>Tatizo limetokea wakati wa kuthibitisha malipo yako. Tafadhali jaribu tena.</div>
          <button className="dy-btn dy-btn-primary" style={{ width: "auto", padding: "12px 22px" }} onClick={() => { setStage("form"); setTxId(null); }}>🔁 Jaribu Tena</button>
        </div>
      )}
    </div>
  );
}