import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka } from "@/lib/duka/store";
import { useToast } from "@/components/duka/Toast";

export const Route = createFileRoute("/akaunti")({
  head: () => ({ meta: [{ title: "Akaunti — Duka Yangu" }, { name: "description", content: "Wasifu wako na mipangilio ya duka." }] }),
  component: () => (<AuthGuard><Shell><Akaunti /></Shell></AuthGuard>),
});

const CATEGORIES = ["Fashion","Food","Electronics","Services","Other"];
const CITIES = ["Dar es Salaam","Arusha","Mwanza","Mbeya","Dodoma","Tanga","Morogoro","Zanzibar","Mengineyo"];

function Akaunti() {
  const { merchant, updateProfile, logout } = useDuka();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    businessName: merchant?.businessName ?? "",
    category: merchant?.category ?? "Other",
    city: merchant?.city ?? "Dar es Salaam",
    bio: merchant?.bio ?? "",
  });
  if (!merchant) return null;

  const save = () => {
    if (!form.businessName.trim()) { toast("Weka jina la biashara"); return; }
    updateProfile({ ...form, bio: form.bio.slice(0, 120) });
    toast("✅ Mabadiliko yamehifadhiwa");
  };

  return (
    <>
      <Topbar title="Wasifu Wangu" subtitle={merchant.dukaId} />
      <div style={{ padding: 16, display: "grid", gap: 16 }}>
        <div className="dy-hero" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Kitambulisho cha Duka Lako</div>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "2px", marginTop: 4 }}>{merchant.dukaId}</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>+{merchant.phone}</div>
        </div>

        <div className="dy-card" style={{ display: "grid", gap: 12 }}>
          <div><label className="dy-label">Jina la Biashara</label><input className="dy-input" value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} /></div>
          <div><label className="dy-label">Aina</label>
            <select className="dy-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="dy-label">Jiji</label>
            <select className="dy-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="dy-label">Maelezo ({120 - form.bio.length} kushoto)</label>
            <textarea className="dy-input" rows={3} maxLength={120} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />
          </div>
          <button className="dy-btn dy-btn-primary" onClick={save}>💾 Hifadhi Mabadiliko</button>
          <button className="dy-btn dy-btn-danger-ghost" onClick={() => { if (confirm("Toka nje ya akaunti?")) { logout(); navigate({ to: "/login" }); } }}>🚪 Toka (Logout)</button>
        </div>

        <div style={{ textAlign: "center", padding: "10px 0 20px", color: "var(--dy-muted)", fontSize: 11.5, lineHeight: 1.6 }}>
          Duka Yangu v1.0 • Powered by YAS Business & Mixx by Yas<br/>
          Built by Revoltek Limited • Dar es Salaam
        </div>
      </div>
    </>
  );
}