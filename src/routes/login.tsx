// ============================================================
// DUKA SMART — Real OTP Login
// Replace: src/routes/login.tsx
//
// Uses Supabase phone auth (OTP via SMS).
// Configure SMS provider in: Supabase Dashboard > Auth > SMS Provider
// Recommended: Africa's Talking (cheap, covers Tanzania well)
// ============================================================

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDuka } from "@/lib/duka/store";
import { useToast } from "@/components/duka/Toast";
import { normalizePhone } from "@/lib/duka/utils";
import { YasLogo } from "@/components/duka/YasLogo";
import { LangToggle, useI18n } from "@/lib/duka/i18n";
import { Store, Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Karibu — DUKA SMART" },
      { name: "description", content: "Ingia kwenye DUKA SMART kwa nambari yako ya YAS." },
    ],
  }),
  component: LoginPage,
});

const CATEGORIES = ["Fashion", "Food", "Electronics", "Services", "Other"];
const CITIES = ["Dar es Salaam", "Arusha", "Mwanza", "Mbeya", "Dodoma", "Tanga", "Morogoro", "Zanzibar", "Mengineyo"];

function LoginPage() {
  const { merchant } = useDuka();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [biz, setBiz] = useState({
    businessName: "",
    category: "Fashion",
    city: "Dar es Salaam",
    bio: "",
  });

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (merchant) navigate({ to: "/" });
  }, [merchant, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Step 1: Send OTP
  const sendOtp = async () => {
    const normalized = normalizePhone(phone);
    if (normalized.length < 12) {
      toast(t("Weka nambari sahihi ya simu", "Enter a valid phone number"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: "+" + normalized,
      });
      if (error) throw error;
      setStep(2);
      setCountdown(60);
      setOtp(Array(6).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast(t("Imeshindikana kutuma msimbo: " + msg, "Failed to send code: " + msg));
    } finally {
      setBusy(false);
    }
  };

  // Step 2: Verify OTP
  const verifyOtp = async (code: string) => {
    if (code.length !== 6) return;
    const normalized = normalizePhone(phone);
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: "+" + normalized,
        token: code,
        type: "sms",
      });
      if (error) throw error;
      if (!data.user) throw new Error("No user returned");

      // Check if merchant exists
      const { data: existing } = await supabase
        .from("merchants")
        .select("id")
        .eq("user_id", data.user.id)
        .single();

      if (!existing) {
        // New user — collect business info
        setIsNew(true);
        setStep(3);
      } else {
        // Existing merchant — done
        toast(t("Karibu tena!", "Welcome back!"));
        navigate({ to: "/" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast(t("Msimbo si sahihi: " + msg, "Invalid code: " + msg));
      setOtp(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  // Step 3: Create merchant profile (first-time)
  const createProfile = async () => {
    if (!biz.businessName.trim()) {
      toast(t("Weka jina la biashara", "Enter a business name"));
      return;
    }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const normalized = normalizePhone(phone);
      const { error } = await supabase.from("merchants").insert({
        user_id: user.id,
        phone: normalized,
        business_name: biz.businessName.trim(),
        category: biz.category,
        city: biz.city,
        bio: biz.bio.slice(0, 120),
      });
      if (error) throw error;

      toast(t("Karibu DUKA SMART! 🎉", "Welcome to DUKA SMART! 🎉"));
      navigate({ to: "/" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast(t("Imeshindikana: " + msg, "Failed: " + msg));
    } finally {
      setBusy(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
    const full = next.join("");
    if (full.length === 6) verifyOtp(full);
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      verifyOtp(pasted);
    }
    e.preventDefault();
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--dy-bg)" }}>
      <div style={{ position: "absolute", top: 16, right: 16 }}>
        <LangToggle />
      </div>

      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <YasLogo size={48} />
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--dy-navy)", marginTop: 12 }}>DUKA SMART</h1>
          <p style={{ fontSize: 13, color: "var(--dy-muted)", marginTop: 4 }}>
            {t("Mfumo wa mauzo kwa Watanzania", "POS for Tanzanian entrepreneurs")}
          </p>
        </div>

        {/* Step 1: Phone */}
        {step === 1 && (
          <div className="dy-card" style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: "var(--dy-navy)" }}>
                {t("Nambari ya Simu", "Phone Number")}
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
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
                  onKeyDown={e => e.key === "Enter" && sendOtp()}
                  autoFocus
                />
              </div>
            </div>
            <button
              className="dy-btn"
              onClick={sendOtp}
              disabled={busy}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Store size={16} />}
              {t("Tuma Msimbo", "Send Code")}
            </button>
          </div>
        )}

        {/* Step 2: OTP */}
        {step === 2 && (
          <div className="dy-card" style={{ display: "grid", gap: 20 }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--dy-text)" }}>
                {t("Msimbo umetumwa kwa", "Code sent to")}{" "}
                <b>+255 {phone}</b>
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }} onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  style={{
                    width: 44, height: 52, textAlign: "center", fontSize: 22, fontWeight: 900,
                    border: "2px solid " + (digit ? "var(--dy-navy)" : "var(--dy-border)"),
                    borderRadius: 12, background: "var(--dy-surface)", color: "var(--dy-navy)",
                    outline: "none", transition: "border 150ms ease",
                  }}
                />
              ))}
            </div>
            {busy && (
              <div style={{ textAlign: "center", color: "var(--dy-muted)", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Loader2 size={14} className="animate-spin" />
                {t("Inathibitisha...", "Verifying...")}
              </div>
            )}
            <button
              style={{ background: "transparent", border: "none", color: countdown > 0 ? "var(--dy-muted)" : "var(--dy-navy)", fontWeight: 700, fontSize: 13, cursor: countdown > 0 ? "default" : "pointer" }}
              disabled={countdown > 0 || busy}
              onClick={sendOtp}
            >
              {countdown > 0
                ? t(`Tuma tena kwa sekunde ${countdown}`, `Resend in ${countdown}s`)
                : t("Tuma msimbo tena", "Resend code")}
            </button>
            <button
              style={{ background: "transparent", border: "none", color: "var(--dy-muted)", fontSize: 12, cursor: "pointer" }}
              onClick={() => { setStep(1); setOtp(Array(6).fill("")); }}
            >
              ← {t("Badilisha nambari", "Change number")}
            </button>
          </div>
        )}

        {/* Step 3: Business setup (new users only) */}
        {step === 3 && (
          <div className="dy-card" style={{ display: "grid", gap: 14 }}>
            <div style={{ textAlign: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 28 }}>🏪</div>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: "var(--dy-navy)", marginTop: 8 }}>
                {t("Weka Duka Lako", "Set Up Your Shop")}
              </h2>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--dy-muted)" }}>
                {t("Jina la Biashara *", "Business Name *")}
              </label>
              <input
                className="dy-input"
                style={{ marginTop: 4 }}
                placeholder={t("Mfano: African Boy Fashion", "e.g. African Boy Fashion")}
                value={biz.businessName}
                onChange={e => setBiz(b => ({ ...b, businessName: e.target.value }))}
                autoFocus
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--dy-muted)" }}>
                  {t("Aina ya Biashara", "Category")}
                </label>
                <select
                  className="dy-input"
                  style={{ marginTop: 4 }}
                  value={biz.category}
                  onChange={e => setBiz(b => ({ ...b, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--dy-muted)" }}>
                  {t("Mji", "City")}
                </label>
                <select
                  className="dy-input"
                  style={{ marginTop: 4 }}
                  value={biz.city}
                  onChange={e => setBiz(b => ({ ...b, city: e.target.value }))}
                >
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--dy-muted)" }}>
                {t("Maelezo ya Duka (hiari)", "Shop Bio (optional)")}
              </label>
              <textarea
                className="dy-input"
                style={{ marginTop: 4, resize: "none", minHeight: 70 }}
                placeholder={t("Niambie kuhusu biashara yako...", "Tell us about your business...")}
                maxLength={120}
                value={biz.bio}
                onChange={e => setBiz(b => ({ ...b, bio: e.target.value }))}
              />
              <div style={{ fontSize: 11, color: "var(--dy-muted)", textAlign: "right" }}>
                {biz.bio.length}/120
              </div>
            </div>
            <button
              className="dy-btn"
              onClick={createProfile}
              disabled={busy}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              {t("Anza DUKA SMART 🚀", "Start DUKA SMART 🚀")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
