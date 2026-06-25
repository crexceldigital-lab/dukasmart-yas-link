import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDuka } from "@/lib/duka/store";
import { YasLogo } from "@/components/duka/YasLogo";
import { Loader2, Phone, KeyRound, Store, CheckCircle2, AlertCircle, Info } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Karibu — POKEA" }] }),
  component: LoginPage,
});

type Step = "phone" | "otp" | "profile";
type Banner = { kind: "ok" | "err" | "info"; text: string } | null;

const CATEGORIES = ["Duka la Vyakula", "Mavazi", "Vipodozi", "Vifaa vya Nyumbani", "Huduma", "Other"];

function normalizePhone(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("0")) d = "255" + d.slice(1);
  if (d.startsWith("7") || d.startsWith("6")) d = "255" + d;
  return d;
}

function LoginPage() {
  const { merchant } = useDuka();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [cooldown, setCooldown] = useState(0);
  const [profile, setProfile] = useState({ business_name: "", category: CATEGORIES[0], city: "", bio: "" });
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => { if (merchant) navigate({ to: "/" }); }, [merchant, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [cooldown]);

  async function requestOtp() {
    const digits = normalizePhone(phone);
    if (digits.length < 12) {
      setBanner({ kind: "err", text: "Tafadhali andika namba sahihi (mfano 0712345678)." });
      return;
    }
    setBusy(true); setBanner(null); setDemoCode(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { phone: digits } });
      if (error) throw error;
      if (data?.channel === "demo" && data?.demoCode) {
        setDemoCode(String(data.demoCode));
        setBanner({ kind: "info", text: `Demo mode: msimbo wako ni ${data.demoCode}` });
      } else if (data?.ok) {
        setBanner({ kind: "ok", text: "SMS imetumwa. Angalia simu yako." });
      } else {
        setBanner({ kind: "err", text: data?.error ?? "Imeshindikana kutuma SMS." });
      }
      setStep("otp");
      setCooldown(60);
    } catch (e) {
      setBanner({ kind: "err", text: e instanceof Error ? e.message : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  async function resendOtp() {
    if (cooldown > 0 || busy) return;
    await requestOtp();
  }

  async function verifyOtp() {
    if (code.length !== 6) { setBanner({ kind: "err", text: "Msimbo lazima uwe tarakimu 6." }); return; }
    setBusy(true); setBanner(null);
    try {
      const digits = normalizePhone(phone);
      const { data, error } = await supabase.functions.invoke("verify-otp", { body: { phone: digits, code } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Msimbo si sahihi");

      const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({
        email: data.email, password: data.password,
      });
      if (signErr) throw signErr;
      if (!signIn.user) throw new Error("Sign-in failed");

      const { data: existing } = await supabase
        .from("merchants").select("id").eq("user_id", signIn.user.id).maybeSingle();

      if (existing) {
        window.location.href = "/";
      } else {
        setStep("profile");
        setBanner({ kind: "ok", text: "Imeingia! Kamilisha taarifa za duka." });
      }
    } catch (e) {
      setBanner({ kind: "err", text: e instanceof Error ? e.message : "Tatizo limetokea" });
    } finally {
      setBusy(false);
    }
  }

  async function createMerchant() {
    if (!profile.business_name.trim() || !profile.city.trim()) {
      setBanner({ kind: "err", text: "Jaza jina la duka na jiji." });
      return;
    }
    setBusy(true); setBanner(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("No session");
      const digits = normalizePhone(phone);
      const { error } = await supabase.from("merchants").insert({
        user_id: u.user.id, phone: digits, ...profile,
      });
      if (error) throw error;
      window.location.href = "/";
    } catch (e) {
      setBanner({ kind: "err", text: e instanceof Error ? e.message : "Imeshindikana" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      maxWidth: 430, margin: "0 auto",
      background: "linear-gradient(180deg,#123274 0%,#0B1F4D 100%)",
      color: "#fff", padding: 24, gap: 18,
    }}>
      <YasLogo size={64} />
      <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "0.02em", textAlign: "center" }}>
        DUKA <span style={{ color: "#FFD100" }}>SMART</span>
      </div>

      <div style={{
        width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16, padding: 20, backdropFilter: "blur(6px)",
      }}>
        {step === "phone" && (
          <>
            <Label icon={<Phone size={16} />} text="Namba ya simu" />
            <input
              autoFocus inputMode="tel" placeholder="0712 345 678" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={inputStyle}
            />
            <PrimaryBtn busy={busy} onClick={requestOtp} label="Tuma Msimbo" />
          </>
        )}

        {step === "otp" && (
          <>
            <Label icon={<KeyRound size={16} />} text={`Msimbo umetumwa kwa +${normalizePhone(phone)}`} />
            <input
              autoFocus inputMode="numeric" maxLength={6} placeholder="123456" value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              style={{ ...inputStyle, textAlign: "center", letterSpacing: "0.5em", fontSize: 22 }}
            />
            <PrimaryBtn busy={busy} onClick={verifyOtp} label="Thibitisha" />
            <button
              type="button" onClick={resendOtp} disabled={cooldown > 0 || busy}
              style={{
                marginTop: 10, width: "100%", padding: "10px 12px", borderRadius: 10,
                background: "transparent", color: "#FFD100", border: "1px solid rgba(255,209,0,0.4)",
                fontWeight: 600, cursor: cooldown > 0 ? "not-allowed" : "pointer", opacity: cooldown > 0 ? 0.6 : 1,
              }}
            >
              {busy ? <Loader2 size={14} className="animate-spin" style={{ display: "inline" }} /> :
                cooldown > 0 ? `Tuma tena (${cooldown}s)` : "Tuma tena msimbo"}
            </button>
            <button
              type="button" onClick={() => { setStep("phone"); setCode(""); setBanner(null); setDemoCode(null); }}
              style={{ marginTop: 8, width: "100%", padding: 8, background: "transparent", color: "rgba(255,255,255,0.7)", border: "none", fontSize: 13, cursor: "pointer" }}
            >Badilisha namba</button>
          </>
        )}

        {step === "profile" && (
          <>
            <Label icon={<Store size={16} />} text="Taarifa za duka lako" />
            <input placeholder="Jina la duka" value={profile.business_name}
              onChange={(e) => setProfile({ ...profile, business_name: e.target.value })} style={inputStyle} />
            <select value={profile.category}
              onChange={(e) => setProfile({ ...profile, category: e.target.value })} style={inputStyle}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Jiji (mfano Dar es Salaam)" value={profile.city}
              onChange={(e) => setProfile({ ...profile, city: e.target.value })} style={inputStyle} />
            <input placeholder="Maelezo mafupi (hiari)" value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })} style={inputStyle} />
            <PrimaryBtn busy={busy} onClick={createMerchant} label="Anza Kutumia" />
          </>
        )}

        {banner && <BannerView b={banner} />}
        {demoCode && step === "otp" && (
          <button
            type="button" onClick={() => setCode(demoCode)}
            style={{ marginTop: 8, width: "100%", padding: 8, background: "rgba(255,209,0,0.12)", color: "#FFD100", border: "1px dashed rgba(255,209,0,0.4)", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
          >Tap kujaza msimbo wa demo</button>
        )}
      </div>

      <p style={{ fontSize: 11, opacity: 0.6, textAlign: "center", marginTop: 4 }}>
        Kwa kuingia, unakubali masharti ya huduma ya POKEA.
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 10,
  background: "rgba(255,255,255,0.95)", color: "#0B1F4D",
  border: "none", outline: "none", fontSize: 16, marginBottom: 10, fontWeight: 500,
};

function Label({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13, opacity: 0.9 }}>
      {icon}<span>{text}</span>
    </div>
  );
}

function PrimaryBtn({ busy, onClick, label }: { busy: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button" onClick={onClick} disabled={busy}
      style={{
        width: "100%", padding: "13px 16px", borderRadius: 12,
        background: "#FFD100", color: "#0B1F4D", border: "none",
        fontSize: 16, fontWeight: 800, cursor: busy ? "wait" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      }}
    >
      {busy && <Loader2 size={16} className="animate-spin" />}
      {label}
    </button>
  );
}

function BannerView({ b }: { b: NonNullable<Banner> }) {
  const palette = b.kind === "ok"
    ? { bg: "rgba(34,197,94,0.15)", fg: "#86efac", icon: <CheckCircle2 size={14} /> }
    : b.kind === "err"
    ? { bg: "rgba(239,68,68,0.15)", fg: "#fca5a5", icon: <AlertCircle size={14} /> }
    : { bg: "rgba(59,130,246,0.15)", fg: "#93c5fd", icon: <Info size={14} /> };
  return (
    <div style={{
      marginTop: 12, padding: "10px 12px", borderRadius: 8,
      background: palette.bg, color: palette.fg, fontSize: 13,
      display: "flex", alignItems: "flex-start", gap: 8,
    }}>
      <span style={{ marginTop: 2 }}>{palette.icon}</span>
      <span>{b.text}</span>
    </div>
  );
}
