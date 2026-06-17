import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useDuka, type Merchant } from "@/lib/duka/store";
import { useToast } from "@/components/duka/Toast";
import { normalizePhone } from "@/lib/duka/utils";
import { YasLogo } from "@/components/duka/YasLogo";
import { LangToggle, useI18n } from "@/lib/duka/i18n";
import { Store } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Karibu — DUKA SMART" }, { name: "description", content: "Ingia kwenye DUKA SMART kwa nambari yako ya YAS." }] }),
  component: LoginPage,
});

const CATEGORIES = ["Fashion","Food","Electronics","Services","Other"];
const CITIES = ["Dar es Salaam","Arusha","Mwanza","Mbeya","Dodoma","Tanga","Morogoro","Zanzibar","Mengineyo"];
const DEMO_OTP = "123456";

function LoginPage() {
  const { login, merchant } = useDuka();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  const [step, setStep] = useState<1|2|3>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [countdown, setCountdown] = useState(0);
  const [isNew, setIsNew] = useState(false);
  const [biz, setBiz] = useState({ businessName: "", category: "Fashion", city: "Dar es Salaam", bio: "" });

  useEffect(() => { if (merchant) navigate({ to: "/" }); }, [merchant, navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendOtp = () => {
    const n = normalizePhone(phone);
    if (n.length < 12) { toast(t("Weka nambari sahihi ya simu", "Enter a valid phone number")); return; }
    setStep(2); setCountdown(60); setOtp(Array(6).fill(""));
  };

  const verify = (code: string) => {
    // Demo: accept 123456 or any 6 digits
    if (code.length !== 6) return;
    const np = normalizePhone(phone);
    // Staff login: if this number is in the persisted owner's staffPhones, sign in as staff.
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("dy_state_v1") : null;
      if (raw) {
        const p = JSON.parse(raw) as { merchant?: Merchant };
        if (p.merchant?.staffPhones?.includes(np)) {
          login(p.merchant, "staff");
          toast(t("Karibu, mfanyakazi!", "Welcome, staff!"));
          navigate({ to: "/" });
          return;
        }
      }
    } catch {}
    // Decide: phone ending in "1" => existing demo merchant, others => new
    const existing = np.endsWith("1");
    if (existing) {
      const m: Merchant = {
        merchantId: "a0000000-0000-0000-0000-000000000001",
        dukaId: "DY-00001",
        phone: np,
        businessName: "African Boy",
        category: "Fashion",
        city: "Dar es Salaam",
        bio: "The original East African streetwear brand. Quality drip, real culture.",
        creditScore: 78,
        createdAt: "2026-01-01T00:00:00Z",
        plan: "free",
        proRenewalDate: null,
        customSlug: null,
        staffPhones: [],
      };
      login(m, "owner"); toast(t("Karibu tena!", "Welcome back!")); navigate({ to: "/" });
    } else {
      setIsNew(true); setStep(3);
    }
  };

  const register = () => {
    if (!biz.businessName.trim()) { toast(t("Weka jina la biashara", "Enter a business name")); return; }
    const id = Math.floor(Math.random() * 90000) + 10000;
    const m: Merchant = {
      merchantId: "m-" + id,
      dukaId: "DY-" + String(id).padStart(5, "0"),
      phone: normalizePhone(phone),
      businessName: biz.businessName.trim(),
      category: biz.category,
      city: biz.city,
      bio: biz.bio.slice(0, 120),
      creditScore: 15,
      createdAt: new Date().toISOString(),
      plan: "free",
      proRenewalDate: null,
      customSlug: null,
      staffPhones: [],
    };
    login(m, "owner"); toast(t("Duka lako limefunguliwa!", "Your shop is open!")); navigate({ to: "/" });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", maxWidth: 430, margin: "0 auto", background: "linear-gradient(180deg,#123274 0%,#0B1F4D 38%,#F7F8FB 38%)" }}>
      <div style={{ padding: "40px 22px 32px", color: "#fff", display: "flex", alignItems: "center", gap: 14 }}>
        <YasLogo size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.02em", lineHeight: 1 }}>
            DUKA <span style={{ color: "#FFD100" }}>SMART</span>
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.8, marginTop: 6 }}>Powered by YAS Business & Mixx</div>
        </div>
        <LangToggle />
      </div>
      <div style={{ background: "#fff", borderRadius: "28px 28px 0 0", padding: 24, flex: 1, marginTop: 8 }}>
        {step === 1 && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>{t("Karibu!", "Welcome!")}</h1>
            <p style={{ fontSize: 14, color: "var(--dy-muted)", marginTop: 6 }}>{t("Ingiza nambari yako ya YAS ili kuanza", "Enter your YAS number to get started")}</p>
            <label className="dy-label" style={{ marginTop: 22 }}>{t("Nambari ya Simu", "Phone Number")}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="dy-input" style={{ width: 96, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 700 }}>TZ +255</div>
              <input className="dy-input" inputMode="numeric" placeholder="711 000 001" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <button className="dy-btn dy-btn-primary" style={{ marginTop: 20 }} onClick={sendOtp}>{t("Endelea", "Continue")}</button>
            <p style={{ fontSize: 11.5, color: "var(--dy-muted)", marginTop: 14, textAlign: "center" }}>{t("Demo: tumia nambari inayoishia na ", "Demo: use a number ending with ")}<b>1</b>{t(" kwa duka lililopo", " for an existing shop")}</p>
          </>
        )}
        {step === 2 && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>{t("Thibitisha Nambari", "Verify Your Number")}</h1>
            <p style={{ fontSize: 14, color: "var(--dy-muted)", marginTop: 6 }}>{t("Tumetuma msimbo kwa ", "We sent a code to ")}<b>+255 {phone}</b></p>
            <div style={{ marginTop: 18 }}>
              <OtpInput value={otp} onChange={setOtp} onComplete={verify} />
            </div>
            <div style={{ background: "rgba(0,168,107,0.1)", color: "#00A86B", padding: 10, borderRadius: 10, fontSize: 12.5, marginTop: 14, textAlign: "center", fontWeight: 600 }}>
              {t("Demo OTP: ", "Demo OTP: ")}<b>{DEMO_OTP}</b>{t(" (au msimbo wowote wa tarakimu 6)", " (or any 6-digit code)")}
            </div>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--dy-muted)" }}>
              {countdown > 0 ? <>{t(`Tuma tena baada ya ${countdown}s`, `Resend in ${countdown}s`)}</> : <button onClick={() => { setCountdown(60); toast(t("Msimbo umetumwa tena", "Code resent")); }} style={{ background: "none", border: "none", color: "var(--dy-navy)", fontWeight: 700 }}>{t("Tuma msimbo tena", "Resend code")}</button>}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 8 }}><Store size={22} strokeWidth={2.5} /> {t("Fungua Duka Lako", "Open Your Shop")}</h1>
            <p style={{ fontSize: 14, color: "var(--dy-muted)", marginTop: 6 }}>{t("Tunahitaji taarifa chache za biashara yako", "We need a few details about your business")}</p>
            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              <div><label className="dy-label">{t("Jina la Biashara *", "Business Name *")}</label><input className="dy-input" value={biz.businessName} onChange={e => setBiz(b => ({ ...b, businessName: e.target.value }))} placeholder={t("k.m. Mama Asha Foods", "e.g. Mama Asha Foods")} /></div>
              <div><label className="dy-label">{t("Aina ya Biashara *", "Business Type *")}</label>
                <select className="dy-input" value={biz.category} onChange={e => setBiz(b => ({ ...b, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="dy-label">{t("Jiji *", "City *")}</label>
                <select className="dy-input" value={biz.city} onChange={e => setBiz(b => ({ ...b, city: e.target.value }))}>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="dy-label">{t(`Maelezo (${120 - biz.bio.length} kushoto)`, `Description (${120 - biz.bio.length} left)`)}</label>
                <textarea className="dy-input" rows={3} maxLength={120} value={biz.bio} onChange={e => setBiz(b => ({ ...b, bio: e.target.value }))} placeholder={t("Eleza biashara yako kwa kifupi", "Briefly describe your business")} />
              </div>
              <button className="dy-btn dy-btn-primary" onClick={register} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Store size={16} strokeWidth={2.5} /> {t("Fungua Duka Langu", "Open My Shop")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OtpInput({ value, onChange, onComplete }: { value: string[]; onChange: (v: string[]) => void; onComplete: (code: string) => void }) {
  const refs = useRef<(HTMLInputElement|null)[]>([]);
  return (
    <div className="dy-otp">
      {value.map((d, i) => (
        <input key={i} ref={el => { refs.current[i] = el; }} inputMode="numeric" maxLength={1} value={d}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, "").slice(0,1);
            const next = [...value]; next[i] = v; onChange(next);
            if (v && i < 5) refs.current[i+1]?.focus();
            const code = next.join("");
            if (code.length === 6 && next.every(x => x)) onComplete(code);
          }}
          onKeyDown={e => {
            if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i-1]?.focus();
          }}
        />
      ))}
    </div>
  );
}