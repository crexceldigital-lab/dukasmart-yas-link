import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka } from "@/lib/duka/store";
import { useToast } from "@/components/duka/Toast";
import { useI18n } from "@/lib/duka/i18n";
import { Save, LogOut, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/akaunti")({
  head: () => ({ meta: [{ title: "Akaunti — DUKA SMART" }, { name: "description", content: "Wasifu wako na mipangilio ya duka." }] }),
  component: () => (<AuthGuard><Shell><Akaunti /></Shell></AuthGuard>),
});

const CATEGORIES = ["Fashion","Food","Electronics","Services","Other"];
const CITIES = ["Dar es Salaam","Arusha","Mwanza","Mbeya","Dodoma","Tanga","Morogoro","Zanzibar","Mengineyo"];

function Akaunti() {
  const { merchant, updateProfile, logout } = useDuka();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  const [form, setForm] = useState({
    businessName: merchant?.businessName ?? "",
    category: merchant?.category ?? "Other",
    city: merchant?.city ?? "Dar es Salaam",
    bio: merchant?.bio ?? "",
  });
  if (!merchant) return null;

  const save = () => {
    if (!form.businessName.trim()) { toast(t("Weka jina la biashara", "Enter a business name")); return; }
    updateProfile({ ...form, bio: form.bio.slice(0, 120) });
    toast(t("Mabadiliko yamehifadhiwa", "Changes saved"));
  };

  return (
    <>
      <Topbar title={t("Wasifu Wangu", "My Profile")} subtitle={merchant.dukaId} />
      <div style={{ padding: 16, display: "grid", gap: 16 }}>
        <div className="dy-hero" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{t("Kitambulisho cha Duka Lako", "Your Shop ID")}</div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "2px", marginTop: 4 }}>{merchant.dukaId}</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>+{merchant.phone}</div>
        </div>

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
          <button className="dy-btn dy-btn-danger-ghost" onClick={() => { if (confirm(t("Toka nje ya akaunti?", "Sign out of your account?"))) { logout(); navigate({ to: "/login" }); } }} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <LogOut size={16} strokeWidth={2.5} /> {t("Toka (Logout)", "Log Out")}
          </button>
        </div>

        <div style={{ textAlign: "center", padding: "10px 0 20px", color: "var(--dy-muted)", fontSize: 11.5, lineHeight: 1.6 }}>
          DUKA SMART v1.0 • Powered by YAS Business & Mixx by Yas<br/>
          Built by Revoltek Limited • Dar es Salaam
        </div>
      </div>
    </>
  );
}