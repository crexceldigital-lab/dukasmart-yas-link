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
  head: () => ({ meta: [{ title: "Karibu — DUKA SMART" },{ name: "description", content: "Ingia kwenye DUKA SMART kwa nambari yako ya YAS." }] }),
  component: LoginPage,
});

const CATEGORIES = ["Fashion","Food","Electronics","Services","Other"];
const CITIES = ["Dar es Salaam","Arusha","Mwanza","Mbeya","Dodoma","Tanga","Morogoro","Zanzibar","Mengineyo"];

function LoginPage() {
  const { merchant } = useDuka();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  const [step, setStep] = useState<1|2|3>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [biz, setBiz] = useState({ businessName:"", category:"Fashion", city:"Dar es Salaam", bio:"" });
  const refs = useRef<(HTMLInputElement|null)[]>([]);

  useEffect(() => { if(merchant) navigate({ to:"/" }); }, [merchant, navigate]);
  useEffect(() => { if(countdown<=0)return; const ti=setTimeout(()=>setCountdown(c=>c-1),1000); return()=>clearTimeout(ti); }, [countdown]);

  const sendOtp = async () => {
    const n=normalizePhone(phone);
    if(n.length<12){ toast(t("Weka nambari sahihi ya simu","Enter a valid phone number")); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { phone: n } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Send failed");
      setStep(2); setCountdown(60); setOtp(Array(6).fill(""));
      setTimeout(()=>refs.current[0]?.focus(),100);
    } catch(e:unknown) {
      toast(t("Imeshindikana: "+(e instanceof Error?e.message:""), "Failed: "+(e instanceof Error?e.message:"")));
    } finally { setBusy(false); }
  };

  const verifyOtp = async (code:string) => {
    if(code.length!==6)return;
    setBusy(true);
    try {
      const n = normalizePhone(phone);
      const { data: vr, error: vErr } = await supabase.functions.invoke("verify-otp", { body: { phone: n, code } });
      if (vErr) throw vErr;
      if (!vr?.ok) throw new Error(vr?.error ?? "Invalid code");
      const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({ email: vr.email, password: vr.password });
      if (signErr) throw signErr;
      if (!signIn.user) throw new Error("No user");
      const { data:existing } = await supabase.from("merchants").select("id").eq("user_id",signIn.user.id).single();
      if(!existing){ setStep(3); }
      else { toast(t("Karibu tena!","Welcome back!")); navigate({ to:"/" }); }
    } catch(e:unknown) {
      toast(t("Msimbo si sahihi","Invalid code"));
      setOtp(Array(6).fill("")); refs.current[0]?.focus();
    } finally { setBusy(false); }
  };

  const createProfile = async () => {
    if(!biz.businessName.trim()){ toast(t("Weka jina la biashara","Enter business name")); return; }
    setBusy(true);
    try {
      const { data:{ user } } = await supabase.auth.getUser();
      if(!user)throw new Error("Not authenticated");
      const { error } = await supabase.from("merchants").insert({
        user_id:user.id, phone:normalizePhone(phone),
        business_name:biz.businessName.trim(), category:biz.category,
        city:biz.city, bio:biz.bio.slice(0,120),
      });
      if(error)throw error;
      toast(t("Karibu DUKA SMART! 🎉","Welcome to DUKA SMART! 🎉"));
      navigate({ to:"/" });
    } catch(e:unknown) {
      toast(t("Imeshindikana","Failed: ")+(e instanceof Error?e.message:""));
    } finally { setBusy(false); }
  };

  const handleOtpChange = (i:number,val:string) => {
    if(!/^\d*$/.test(val))return;
    const next=[...otp]; next[i]=val.slice(-1); setOtp(next);
    if(val&&i<5)refs.current[i+1]?.focus();
    const full=next.join(""); if(full.length===6)verifyOtp(full);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", maxWidth:430, margin:"0 auto", background:"linear-gradient(180deg,#123274 0%,#0B1F4D 38%,#F7F8FB 38%)" }}>
      <div style={{ padding:"40px 22px 32px", color:"#fff", display:"flex", alignItems:"center", gap:14 }}>
        <YasLogo size={56} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:30, fontWeight:900, letterSpacing:"0.02em", lineHeight:1 }}>DUKA <span style={{ color:"#FFD100" }}>SMART</span></div>
          <div style={{ fontSize:12.5, opacity:0.8, marginTop:6 }}>Powered by YAS Business & Mixx</div>
        </div>
        <LangToggle />
      </div>
      <div style={{ background:"#fff", borderRadius:"28px 28px 0 0", padding:24, flex:1 }}>
        {step===1 && (
          <>
            <h1 style={{ fontSize:22, fontWeight:800 }}>{t("Karibu!","Welcome!")}</h1>
            <p style={{ fontSize:14, color:"var(--dy-muted)", marginTop:6 }}>{t("Ingiza nambari yako ya simu ili kuanza","Enter your phone number to get started")}</p>
            <label className="dy-label" style={{ marginTop:22 }}>{t("Nambari ya Simu","Phone Number")}</label>
            <div style={{ display:"flex", gap:8 }}>
              <div className="dy-input" style={{ width:96, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>TZ +255</div>
              <input className="dy-input" inputMode="numeric" placeholder="711 000 001" value={phone} onChange={e=>setPhone(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendOtp()} />
            </div>
            <button className="dy-btn dy-btn-primary" style={{ marginTop:20, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }} onClick={sendOtp} disabled={busy}>
              {busy?<Loader2 size={16} className="animate-spin"/>:<Store size={16} strokeWidth={2.5}/>}
              {t("Endelea","Continue")}
            </button>
          </>
        )}
        {step===2 && (
          <>
            <h1 style={{ fontSize:22, fontWeight:800 }}>{t("Thibitisha Nambari","Verify Your Number")}</h1>
            <p style={{ fontSize:14, color:"var(--dy-muted)", marginTop:6 }}>{t("Tumetuma msimbo kwa","We sent a code to")} <b>+255 {phone}</b></p>
            <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:22 }}>
              {otp.map((d,i)=>(
                <input key={i} ref={el=>{refs.current[i]=el;}} type="text" inputMode="numeric" maxLength={1} value={d}
                  onChange={e=>handleOtpChange(i,e.target.value)}
                  onKeyDown={e=>{if(e.key==="Backspace"&&!otp[i]&&i>0)refs.current[i-1]?.focus();}}
                  style={{ width:44, height:52, textAlign:"center", fontSize:22, fontWeight:900, border:"2px solid "+(d?"var(--dy-navy)":"var(--dy-border)"), borderRadius:12, background:"var(--dy-surface)", color:"var(--dy-navy)", outline:"none" }}
                />
              ))}
            </div>
            {busy&&<div style={{ textAlign:"center", marginTop:14, display:"flex", alignItems:"center", justifyContent:"center", gap:6, color:"var(--dy-muted)", fontSize:13 }}><Loader2 size={14} className="animate-spin"/>{t("Inathibitisha...","Verifying...")}</div>}
            <div style={{ textAlign:"center", marginTop:16 }}>
              <button
                onClick={sendOtp}
                disabled={countdown>0 || busy}
                style={{
                  background: countdown>0 ? "var(--dy-surface)" : "transparent",
                  border: "1.5px solid " + (countdown>0 ? "var(--dy-border)" : "var(--dy-navy)"),
                  color: countdown>0 ? "var(--dy-muted)" : "var(--dy-navy)",
                  fontWeight: 700,
                  fontSize: 13,
                  padding: "10px 18px",
                  borderRadius: 10,
                  cursor: countdown>0 ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {busy && countdown===0 && <Loader2 size={14} className="animate-spin"/>}
                {countdown>0
                  ? t(`Tuma tena baada ya ${countdown}s`, `Resend in ${countdown}s`)
                  : t("Tuma msimbo tena","Resend code")}
              </button>
            </div>
            <button onClick={()=>{setStep(1);setOtp(Array(6).fill(""));}} style={{ marginTop:12, background:"none", border:"none", color:"var(--dy-muted)", fontSize:12, cursor:"pointer", display:"block", margin:"12px auto 0" }}>
              ← {t("Badilisha nambari","Change number")}
            </button>
          </>
        )}
        {step===3 && (
          <>
            <h1 style={{ fontSize:22, fontWeight:800, display:"inline-flex", alignItems:"center", gap:8 }}><Store size={22} strokeWidth={2.5}/>{t("Fungua Duka Lako","Open Your Shop")}</h1>
            <p style={{ fontSize:14, color:"var(--dy-muted)", marginTop:6 }}>{t("Tunahitaji taarifa chache za biashara yako","We need a few details about your business")}</p>
            <div style={{ display:"grid", gap:12, marginTop:18 }}>
              <div><label className="dy-label">{t("Jina la Biashara *","Business Name *")}</label><input className="dy-input" value={biz.businessName} onChange={e=>setBiz(b=>({...b,businessName:e.target.value}))} placeholder={t("k.m. Mama Asha Foods","e.g. Mama Asha Foods")} autoFocus/></div>
              <div><label className="dy-label">{t("Aina ya Biashara *","Business Type *")}</label>
                <select className="dy-input" value={biz.category} onChange={e=>setBiz(b=>({...b,category:e.target.value}))}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select></div>
              <div><label className="dy-label">{t("Jiji *","City *")}</label>
                <select className="dy-input" value={biz.city} onChange={e=>setBiz(b=>({...b,city:e.target.value}))}>
                  {CITIES.map(c=><option key={c}>{c}</option>)}
                </select></div>
              <div><label className="dy-label">{t(`Maelezo (${120-biz.bio.length} kushoto)`,`Description (${120-biz.bio.length} left)`)}</label>
                <textarea className="dy-input" rows={3} maxLength={120} value={biz.bio} onChange={e=>setBiz(b=>({...b,bio:e.target.value}))} placeholder={t("Eleza biashara yako kwa kifupi","Briefly describe your business")}/></div>
              <button className="dy-btn dy-btn-primary" onClick={createProfile} disabled={busy} style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                {busy&&<Loader2 size={16} className="animate-spin"/>}
                {t("Fungua Duka Langu 🚀","Open My Shop 🚀")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}