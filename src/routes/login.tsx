import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useDuka, type Merchant } from "@/lib/duka/store";
import { useToast } from "@/components/duka/Toast";
import { normalizePhone } from "@/lib/duka/utils";
import { YasLogo } from "@/components/duka/YasLogo";

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
    if (n.length < 12) { toast("Weka nambari sahihi ya simu"); return; }
    setStep(2); setCountdown(60); setOtp(Array(6).fill(""));
  };

  const verify = (code: string) => {
    // Demo: accept 123456 or any 6 digits
    if (code.length !== 6) return;
    // Decide: phone ending in "1" => existing demo merchant, others => new
    const existing = normalizePhone(phone).endsWith("1");
    if (existing) {
      const m: Merchant = {
        merchantId: "a0000000-0000-0000-0000-000000000001",
        dukaId: "DY-00001",
        phone: normalizePhone(phone),
        businessName: "African Boy",
        category: "Fashion",
        city: "Dar es Salaam",
        bio: "The original East African streetwear brand. Quality drip, real culture.",
        creditScore: 78,
        createdAt: "2026-01-01T00:00:00Z",
      };
      login(m); toast("Karibu tena! 👋"); navigate({ to: "/" });
    } else {
      setIsNew(true); setStep(3);
    }
  };

  const register = () => {
    if (!biz.businessName.trim()) { toast("Weka jina la biashara"); return; }
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
    };
    login(m); toast("🏪 Duka lako limefunguliwa!"); navigate({ to: "/" });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", maxWidth: 430, margin: "0 auto", background: "linear-gradient(180deg,#123274 0%,#0B1F4D 38%,#F7F8FB 38%)" }}>
      <div style={{ padding: "40px 22px 32px", color: "#fff", display: "flex", alignItems: "center", gap: 14 }}>
        <YasLogo size={56} />
        <div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.02em", lineHeight: 1 }}>
            DUKA <span style={{ color: "#FFD100" }}>SMART</span>
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.8, marginTop: 6 }}>Powered by YAS Business & Mixx</div>
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: "28px 28px 0 0", padding: 24, flex: 1, marginTop: 8 }}>
        {step === 1 && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Karibu! 👋</h1>
            <p style={{ fontSize: 14, color: "var(--dy-muted)", marginTop: 6 }}>Ingiza nambari yako ya YAS ili kuanza</p>
            <label className="dy-label" style={{ marginTop: 22 }}>Nambari ya Simu</label>
            <div style={{ display: "flex", gap: 8 }}>
              <div className="dy-input" style={{ width: 96, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 700 }}>🇹🇿 +255</div>
              <input className="dy-input" inputMode="numeric" placeholder="711 000 001" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <button className="dy-btn dy-btn-primary" style={{ marginTop: 20 }} onClick={sendOtp}>Endelea</button>
            <p style={{ fontSize: 11.5, color: "var(--dy-muted)", marginTop: 14, textAlign: "center" }}>Demo: tumia nambari inayoishia na <b>1</b> kwa duka lililopo</p>
          </>
        )}
        {step === 2 && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Thibitisha Nambari</h1>
            <p style={{ fontSize: 14, color: "var(--dy-muted)", marginTop: 6 }}>Tumetuma msimbo kwa <b>+255 {phone}</b></p>
            <div style={{ marginTop: 18 }}>
              <OtpInput value={otp} onChange={setOtp} onComplete={verify} />
            </div>
            <div style={{ background: "rgba(0,168,107,0.1)", color: "#00A86B", padding: 10, borderRadius: 10, fontSize: 12.5, marginTop: 14, textAlign: "center", fontWeight: 600 }}>
              Demo OTP: <b>{DEMO_OTP}</b> (au msimbo wowote wa tarakimu 6)
            </div>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--dy-muted)" }}>
              {countdown > 0 ? <>Tuma tena baada ya {countdown}s</> : <button onClick={() => { setCountdown(60); toast("Msimbo umetumwa tena"); }} style={{ background: "none", border: "none", color: "var(--dy-navy)", fontWeight: 700 }}>Tuma msimbo tena</button>}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>Fungua Duka Lako 🏪</h1>
            <p style={{ fontSize: 14, color: "var(--dy-muted)", marginTop: 6 }}>Tunahitaji taarifa chache za biashara yako</p>
            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              <div><label className="dy-label">Jina la Biashara *</label><input className="dy-input" value={biz.businessName} onChange={e => setBiz(b => ({ ...b, businessName: e.target.value }))} placeholder="k.m. Mama Asha Foods" /></div>
              <div><label className="dy-label">Aina ya Biashara *</label>
                <select className="dy-input" value={biz.category} onChange={e => setBiz(b => ({ ...b, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="dy-label">Jiji *</label>
                <select className="dy-input" value={biz.city} onChange={e => setBiz(b => ({ ...b, city: e.target.value }))}>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="dy-label">Maelezo ({120 - biz.bio.length} kushoto)</label>
                <textarea className="dy-input" rows={3} maxLength={120} value={biz.bio} onChange={e => setBiz(b => ({ ...b, bio: e.target.value }))} placeholder="Eleza biashara yako kwa kifupi" />
              </div>
              <button className="dy-btn dy-btn-primary" onClick={register}>🏪 Fungua Duka Langu</button>
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