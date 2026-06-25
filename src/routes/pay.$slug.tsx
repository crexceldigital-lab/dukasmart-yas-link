// ============================================================
// POKEA — Public Pay Page
// Replace: src/routes/pay.$slug.tsx  (or pay.tsx with slug param)
//
// This is what buyers see when they tap a payment link.
// No login required. Calls initiate-payment Edge Function,
// then polls the transaction status every 3 seconds.
// ============================================================

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatTZS, normalizePhone } from "@/lib/duka/utils";
import { Loader2, CheckCircle2, XCircle, Phone, User } from "lucide-react";
import { YasLogo } from "@/components/duka/YasLogo";

export const Route = createFileRoute("/pay/$slug")({
  component: PayPage,
});

type Step = "loading" | "form" | "waiting" | "success" | "failed" | "not-found";

type LinkInfo = {
  label: string;
  amount: number;
  productPhoto?: string | null;
  productDescription?: string | null;
  merchantName: string;
  merchantCity: string;
};

function PayPage() {
  const { slug } = Route.useParams();
  const [step, setStep] = useState<Step>("loading");
  const [link, setLink] = useState<LinkInfo | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [provider] = useState<"mixx">("mixx");
  const [txId, setTxId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);

  // Load link info
  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc("get_link_with_merchant", { p_slug: slug });
      const row = data?.[0];
      if (!row) { setStep("not-found"); return; }
      setLink({
        label: row.label,
        amount: row.amount,
        productPhoto: row.product_photo,
        productDescription: row.product_description,
        merchantName: row.merchant_name,
        merchantCity: row.merchant_city,
      });
      setStep("form");
    }
    load();
  }, [slug]);

  // Poll transaction status
  useEffect(() => {
    if (!txId || step !== "waiting") return;
    pollCount.current = 0;

    pollRef.current = setInterval(async () => {
      pollCount.current++;
      const { data } = await supabase.functions.invoke("check-payment-status", {
        body: { transactionId: txId },
      });
      const status = (data as { ok?: boolean; status?: string } | null)?.status;
      if (status === "confirmed") { clearInterval(pollRef.current!); setStep("success"); }
      if (status === "failed") { clearInterval(pollRef.current!); setStep("failed"); }

      // Timeout after 3 minutes
      if (pollCount.current > 60) {
        clearInterval(pollRef.current!);
        setStep("failed");
        setError("Malipo hayakukamilika kwa wakati. Jaribu tena.");
      }
    }, 3000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [txId, step]);

  const handlePay = async () => {
    const normalized = normalizePhone(phone);
    if (normalized.length < 12) { setError("Weka nambari sahihi ya simu (mfano: 0712345678)"); return; }
    setError("");
    setBusy(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initiate-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            linkSlug: slug,
            buyerPhone: normalized,
            buyerName: name.trim() || undefined,
            provider,
          }),
        }
      );
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Imeshindikana");
      setTxId(data.transactionId);
      setStep("waiting");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Tatizo la mtandao. Jaribu tena.");
    } finally {
      setBusy(false);
    }
  };

  // ---- RENDERS ----

  if (step === "loading") return (
    <Screen><Loader2 size={36} className="animate-spin" style={{ color: "var(--dy-navy)" }} /></Screen>
  );

  if (step === "not-found") return (
    <Screen>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56 }}>🔗</div>
        <h2 style={{ fontWeight: 900, color: "var(--dy-navy)", marginTop: 12 }}>Kiungo Hakipatikani</h2>
        <p style={{ color: "var(--dy-muted)", fontSize: 14, marginTop: 8 }}>
          Kiungo hiki hakipo au kimeisha muda wake.
        </p>
      </div>
    </Screen>
  );

  if (step === "success") return (
    <Screen>
      <div style={{ textAlign: "center", display: "grid", gap: 12 }}>
        <CheckCircle2 size={72} style={{ color: "#22c55e", margin: "0 auto" }} />
        <h2 style={{ fontWeight: 900, color: "var(--dy-navy)", fontSize: 22 }}>Malipo Yamefanikiwa!</h2>
        <p style={{ color: "var(--dy-text)", fontSize: 15 }}>
          Umefanya malipo ya <b>{formatTZS(link?.amount ?? 0)}</b> kwa <b>{link?.merchantName}</b>.
        </p>
        <p style={{ color: "var(--dy-muted)", fontSize: 13 }}>Utapokea risiti kwenye simu yako hivi karibuni.</p>
        <div style={{ marginTop: 8, padding: "12px 20px", background: "#f0fdf4", borderRadius: 14, border: "1.5px solid #bbf7d0" }}>
          <p style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>Powered by Mixx by YAS × POKEA</p>
        </div>
      </div>
    </Screen>
  );

  if (step === "failed") return (
    <Screen>
      <div style={{ textAlign: "center", display: "grid", gap: 12 }}>
        <XCircle size={72} style={{ color: "#ef4444", margin: "0 auto" }} />
        <h2 style={{ fontWeight: 900, color: "var(--dy-navy)", fontSize: 22 }}>Malipo Hayakufanikiwa</h2>
        <p style={{ color: "var(--dy-muted)", fontSize: 14 }}>{error || "Malipo yalikataliwa au hayakukamilika."}</p>
        <button
          className="dy-btn"
          onClick={() => { setStep("form"); setTxId(null); setError(""); }}
          style={{ marginTop: 8 }}
        >
          Jaribu Tena
        </button>
      </div>
    </Screen>
  );

  if (step === "waiting") return (
    <Screen>
      <div style={{ textAlign: "center", display: "grid", gap: 16 }}>
        <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto" }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "3px solid #e2e8f0" }} />
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            border: "3px solid transparent", borderTopColor: "var(--dy-navy)",
            animation: "spin 1s linear infinite",
          }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Phone size={28} style={{ color: "var(--dy-navy)" }} />
          </div>
        </div>
        <h2 style={{ fontWeight: 900, color: "var(--dy-navy)", fontSize: 20 }}>Angalia Simu Yako</h2>
        <p style={{ color: "var(--dy-text)", fontSize: 14, lineHeight: 1.6 }}>
          Ombi la malipo la <b>{formatTZS(link?.amount ?? 0)}</b> limetumwa kwa <b>+255 {phone}</b>.
          <br />Ingiza PIN yako ya Mixx kuthibitisha.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%", background: "var(--dy-navy)",
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
        <p style={{ fontSize: 12, color: "var(--dy-muted)" }}>Inasubiri uthibitisho...</p>
        <button
          style={{ background: "none", border: "none", color: "var(--dy-muted)", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
          onClick={() => { setStep("form"); setTxId(null); if (pollRef.current) clearInterval(pollRef.current); }}
        >
          Ghairi malipo
        </button>
      </div>
    </Screen>
  );

  // Form step
  return (
    <Screen>
      <div style={{ width: "100%", maxWidth: 400, display: "grid", gap: 20 }}>
        {/* Merchant header */}
        <div style={{ textAlign: "center" }}>
          <YasLogo size={32} />
          <p style={{ fontSize: 12, color: "var(--dy-muted)", marginTop: 6 }}>
            {link?.merchantName} · {link?.merchantCity}
          </p>
        </div>

        {/* Product card */}
        <div className="dy-card" style={{ display: "grid", gap: 12 }}>
          {link?.productPhoto && (
            <img
              src={link.productPhoto}
              alt={link.label}
              style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 12 }}
            />
          )}
          <div>
            <p style={{ fontWeight: 900, fontSize: 18, color: "var(--dy-navy)" }}>{link?.label}</p>
            {link?.productDescription && (
              <p style={{ fontSize: 13, color: "var(--dy-muted)", marginTop: 4 }}>{link.productDescription}</p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "var(--dy-muted)" }}>Kiasi cha kulipa</span>
            <span style={{ fontWeight: 900, fontSize: 22, color: "var(--dy-navy)" }}>
              {formatTZS(link?.amount ?? 0)}
            </span>
          </div>
        </div>

        {/* Payment form */}
        <div className="dy-card" style={{ display: "grid", gap: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: "var(--dy-navy)" }}>Taja maelezo yako</p>

          {/* Name */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--dy-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <User size={12} /> Jina lako (hiari)
            </label>
            <input
              className="dy-input"
              style={{ marginTop: 4 }}
              placeholder="Mfano: John Doe"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Phone */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--dy-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <Phone size={12} /> Nambari ya simu *
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <div style={{ padding: "10px 12px", background: "var(--dy-surface)", border: "1.5px solid var(--dy-border)", borderRadius: 10, fontSize: 14, fontWeight: 700, color: "var(--dy-muted)", flexShrink: 0 }}>
                🇹🇿 +255
              </div>
              <input
                className="dy-input"
                style={{ flex: 1 }}
                type="tel"
                placeholder="712 345 678"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Provider */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--dy-muted)" }}>Lipa kwa</label>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <div
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 13, fontWeight: 700,
                  border: "2px solid var(--dy-navy)", background: "var(--dy-navy)",
                  color: "#fff", textAlign: "center",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <span style={{ background: "#fff", borderRadius: 6, padding: "2px 4px", display: "inline-flex" }}>
                  <YasLogo size={20} />
                </span>
                Mixx by YAS
              </div>
            </div>
          </div>

          {error && (
            <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 10, color: "#dc2626", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            className="dy-btn"
            onClick={handlePay}
            disabled={busy}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 16, padding: "14px 0" }}
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : null}
            Lipa {formatTZS(link?.amount ?? 0)}
          </button>

          <p style={{ fontSize: 11, color: "var(--dy-muted)", textAlign: "center" }}>
            Salama na ya siri · Powered by Mixx by YAS
          </p>
        </div>
      </div>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 24, background: "var(--dy-bg)",
    }}>
      {children}
    </div>
  );
}
