import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka } from "@/lib/duka/store";
import { useToast } from "@/components/duka/Toast";
import { useI18n } from "@/lib/duka/i18n";
import { Save, LogOut, Crown, Sparkles, Check, X, UserPlus, Link2, Wallet, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ProBadge } from "@/components/duka/ProBadge";
import { useProGate } from "@/lib/duka/useProGate";
import { ManageSubscriptionModal } from "@/components/duka/ManageSubscriptionModal";
import { normalizePhone } from "@/lib/duka/utils";

export const Route = createFileRoute("/akaunti")({
  head: () => ({ meta: [{ title: "Akaunti — DUKA SMART" }, { name: "description", content: "Wasifu wako na mipangilio ya duka." }] }),
  component: () => (<AuthGuard><Shell><Akaunti /></Shell></AuthGuard>),
});

const CATEGORIES = ["Fashion","Food","Electronics","Services","Other"];
const CITIES = ["Dar es Salaam","Arusha","Mwanza","Mbeya","Dodoma","Tanga","Morogoro","Zanzibar","Mengineyo"];

function Akaunti() {
  const { merchant, sessionRole, updateProfile, logout, setCustomSlug, addStaffPhone, removeStaffPhone } = useDuka();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  const { isPro, openUpgrade } = useProGate();
  const [manageOpen, setManageOpen] = useState(false);
  const [slugInput, setSlugInput] = useState(merchant?.customSlug ?? "");
  const [staffInput, setStaffInput] = useState("");
  const [form, setForm] = useState({
    businessName: merchant?.businessName ?? "",
    category: merchant?.category ?? "Other",
    city: merchant?.city ?? "Dar es Salaam",
    bio: merchant?.bio ?? "",
  });
  if (!merchant) return null;
  const isOwner = sessionRole === "owner";

  const save = () => {
    if (!form.businessName.trim()) { toast(t("Weka jina la biashara", "Enter a business name")); return; }
    updateProfile({ ...form, bio: form.bio.slice(0, 120) });
    toast(t("Mabadiliko yamehifadhiwa", "Changes saved"));
  };

  const slugValid = /^[a-z0-9-]{3,30}$/.test(slugInput);
  const slugAvailable = slugValid; // Single-merchant demo store — always available.
  const saveSlug = () => {
    if (!slugValid) { toast(t("Slug si sahihi", "Invalid slug")); return; }
    setCustomSlug(slugInput);
    toast(t("Kiungo kimehifadhiwa", "Link saved"));
  };

  const addStaff = async () => {
    const n = normalizePhone(staffInput);
    if (n.length < 12) { toast(t("Nambari si sahihi", "Invalid number")); return; }
    const ok = await addStaffPhone(n);
    if (!ok) { toast(t("Imefika kikomo au tayari ipo", "Limit reached or already added")); return; }
    setStaffInput("");
    toast(t("Mfanyakazi ameongezwa", "Staff added"));
  };

  return (
    <>
      <Topbar title={t("Wasifu Wangu", "My Profile")} subtitle={merchant.dukaId} />
      <div style={{ padding: 16, display: "grid", gap: 16 }}>
        {/* Pro upgrade / member card */}
        {isOwner && (
          isPro ? (
            <div className="dy-card" style={{ background: "linear-gradient(135deg, var(--dy-navy) 0%, var(--dy-navy-2) 100%)", color: "#fff", border: "none", display: "grid", gap: 8 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Crown size={18} color="#FFD100" strokeWidth={2.5} />
                <span style={{ fontSize: 15, fontWeight: 800 }}>{t("Mwanachama wa Pro", "Pro Member")}</span>
                <ProBadge />
              </div>
              {merchant.proRenewalDate && (
                <div style={{ fontSize: 12.5, opacity: 0.85 }}>
                  {t("Inajiongeza tena: ", "Renews on: ")}{new Date(merchant.proRenewalDate).toLocaleDateString()}
                </div>
              )}
              <button onClick={() => setManageOpen(true)} style={{ alignSelf: "flex-start", background: "transparent", border: "none", color: "#FFD100", fontWeight: 700, fontSize: 13, padding: 0, marginTop: 4, cursor: "pointer" }}>
                {t("Simamia Usajili →", "Manage Subscription →")}
              </button>
            </div>
          ) : (
            <div className="dy-card" style={{ background: "linear-gradient(135deg, #FFF4B8 0%, #FFE680 100%)", border: "1px solid #F5A623", display: "grid", gap: 10 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Crown size={18} color="#F5A623" strokeWidth={2.5} />
                <span style={{ fontSize: 15, fontWeight: 900, color: "var(--dy-navy)" }}>{t("Pandisha hadi Duka Smart Pro", "Upgrade to Duka Smart Pro")}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--dy-navy)", lineHeight: 1.5 }}>
                {t("Bidhaa zisizo na kikomo, wateja wako wote, na zaidi — TZS 8,000/mwezi", "Unlimited products, all your customers, and more — TZS 8,000/month")}
              </p>
              <button className="dy-btn" onClick={openUpgrade} style={{ background: "var(--dy-navy)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Sparkles size={16} strokeWidth={2.5} /> {t("Pandisha Sasa", "Upgrade Now")}
              </button>
            </div>
          )
        )}

        <div className="dy-hero" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{t("Kitambulisho cha Duka Lako", "Your Shop ID")}</div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "2px", marginTop: 4 }}>{merchant.dukaId}</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>+{merchant.phone}</div>
          {sessionRole === "staff" && (
            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.85 }}>{t("Umeingia kama mfanyakazi", "Signed in as staff")}</div>
          )}
        </div>

        {isOwner && (
        <div className="dy-card" style={{ display: "grid", gap: 12 }}>
          <div><label className="dy-label">{t("Jina la Biashara", "Business Name")}</label><input className="dy-input" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} /></div>
          <div><label className="dy-label">{t("Aina", "Type")}</label>
            <select className="dy-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="dy-label">{t("Jiji", "City")}</label>
            <select className="dy-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="dy-label">{t(`Maelezo (${120 - form.bio.length} kushoto)`, `Description (${120 - form.bio.length} left)`)}</label>
            <textarea className="dy-input" rows={3} maxLength={120} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
          </div>
          <button className="dy-btn dy-btn-primary" onClick={save} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Save size={16} strokeWidth={2.5} /> {t("Hifadhi Mabadiliko", "Save Changes")}
          </button>
        </div>
        )}

        {isOwner && isPro && (
          <div className="dy-card" style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800 }}>
              <Link2 size={16} strokeWidth={2.5} color="var(--dy-navy)" />
              {t("Kiungo Chako Maalum", "Your Custom Link")}
            </div>
            <div style={{ fontSize: 12, color: "var(--dy-muted)" }}>
              dukasmart.app/<b>{merchant.customSlug ?? merchant.dukaId}</b>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <span className="dy-input" style={{ width: 130, display: "inline-flex", alignItems: "center", fontWeight: 700, color: "var(--dy-muted)" }}>dukasmart.app/</span>
              <input className="dy-input" value={slugInput} onChange={e => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="lizzlooks" />
            </div>
            <div style={{ fontSize: 12, color: slugInput ? (slugValid ? "var(--dy-green)" : "var(--dy-red)") : "var(--dy-muted)" }}>
              {slugInput
                ? (slugValid
                    ? (slugAvailable ? t("✓ Inapatikana", "✓ Available") : t("✗ Tayari inatumika", "✗ Already taken"))
                    : t("Tumia herufi ndogo, namba na alama '-' (3–30)", "Lowercase letters, numbers, and '-' only (3–30)"))
                : t("Andika slug yako mpya", "Type your new slug")}
            </div>
            <button className="dy-btn dy-btn-primary" onClick={saveSlug} disabled={!slugValid} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Save size={16} strokeWidth={2.5} /> {t("Hifadhi Kiungo", "Save Link")}
            </button>
          </div>
        )}

        {isOwner && isPro && (
          <div className="dy-card" style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 800 }}>
              <UserPlus size={16} strokeWidth={2.5} color="var(--dy-navy)" />
              {t("Wafanyakazi (hadi 2)", "Staff (up to 2)")}
            </div>
            {(merchant.staffPhones ?? []).length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--dy-muted)" }}>{t("Hujaongeza mfanyakazi yeyote", "No staff added yet")}</div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {(merchant.staffPhones ?? []).map(p => (
                  <div key={p} style={{ display: "flex", alignItems: "center", gap: 8, background: "#F0F4F8", borderRadius: 10, padding: "8px 12px" }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700 }}>+{p}</span>
                    <button onClick={() => removeStaffPhone(p)} style={{ background: "transparent", border: "none", color: "var(--dy-red)", cursor: "pointer", display: "inline-flex" }} aria-label="remove">
                      <X size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {(merchant.staffPhones ?? []).length < 2 && (
              <div style={{ display: "flex", gap: 8 }}>
                <input className="dy-input" inputMode="numeric" placeholder="0712 345 678" value={staffInput} onChange={e => setStaffInput(e.target.value)} />
                <button onClick={addStaff} className="dy-btn dy-btn-primary" style={{ width: "auto", padding: "0 16px" }}>
                  <Check size={16} strokeWidth={2.5} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="dy-card">
          <button className="dy-btn dy-btn-danger-ghost" onClick={() => { if (confirm(t("Toka nje ya akaunti?", "Sign out of your account?"))) { logout(); navigate({ to: "/login" }); } }} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <LogOut size={16} strokeWidth={2.5} /> {t("Toka (Logout)", "Log Out")}
          </button>
        </div>

        <div className="dy-card" style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dy-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>{t("Zana Zaidi", "More Tools")}</div>
          <Link to="/matumizi" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit", padding: "8px 0" }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(231,76,60,0.12)", color: "var(--dy-red)", display: "grid", placeItems: "center" }}>
              <Wallet size={18} strokeWidth={2.5} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                {t("Matumizi", "Expenses")}
                {!isPro && <span style={{ fontSize: 10, fontWeight: 900, background: "#F5A623", color: "#fff", padding: "2px 6px", borderRadius: 999 }}>PRO</span>}
              </div>
              <div style={{ fontSize: 12, color: "var(--dy-muted)" }}>{t("Fuatilia gharama zako", "Track your costs")}</div>
            </div>
            <ArrowRight size={16} strokeWidth={2.5} color="var(--dy-muted)" />
          </Link>
        </div>

        <div style={{ textAlign: "center", padding: "10px 0 20px", color: "var(--dy-muted)", fontSize: 11.5, lineHeight: 1.6 }}>
          DUKA SMART v1.0 • Powered by YAS Business & Mixx by Yas<br/>
          Built by Revoltek Limited • Dar es Salaam
        </div>
      </div>
      <ManageSubscriptionModal open={manageOpen} onClose={() => setManageOpen(false)} />
    </>
  );
}