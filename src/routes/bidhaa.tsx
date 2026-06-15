import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka, type Product } from "@/lib/duka/store";
import { formatTZS, categoryEmoji } from "@/lib/duka/utils";
import { Modal } from "@/components/duka/Modal";
import { useToast } from "@/components/duka/Toast";

export const Route = createFileRoute("/bidhaa")({
  head: () => ({ meta: [{ title: "Bidhaa — Duka Yangu" }, { name: "description", content: "Simamia bidhaa zako: ongeza, hariri na ondoa." }] }),
  component: () => (<AuthGuard><Shell><Bidhaa /></Shell></AuthGuard>),
});

function Bidhaa() {
  const { products, merchant, addProduct, updateProduct, toggleProduct, deleteProduct } = useDuka();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const startAdd = () => { setEditing(null); setOpen(true); };
  const startEdit = (p: Product) => { setEditing(p); setOpen(true); };

  return (
    <>
      <Topbar
        title="Bidhaa Zangu"
        subtitle={`${products.length} / 20 bidhaa`}
        right={
          <button onClick={startAdd} aria-label="Ongeza bidhaa" style={{ width: 38, height: 38, borderRadius: 12, background: "#00A86B", color: "#fff", border: "none", fontSize: 20, fontWeight: 800, cursor: "pointer" }}>+</button>
        }
      />
      <div style={{ padding: 16 }}>
        {products.length === 0 ? (
          <div style={{ padding: "60px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 56 }}>📦</div>
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 10 }}>Hakuna Bidhaa Bado</div>
            <p style={{ fontSize: 13, color: "var(--dy-muted)", marginTop: 6 }}>Anza kwa kuongeza bidhaa yako ya kwanza</p>
            <button className="dy-btn dy-btn-primary" style={{ marginTop: 18, width: "auto", padding: "12px 22px" }} onClick={startAdd}>＋ Ongeza Bidhaa ya Kwanza</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {products.map(p => (
              <div key={p.id} className="dy-card" style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ position: "relative", aspectRatio: "1", borderRadius: 10, background: "#F0F4F8", display: "grid", placeItems: "center", overflow: "hidden" }}>
                  {p.photoUrl ? <img src={p.photoUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontSize: 44 }}>{categoryEmoji(merchant?.category ?? "Other")}</div>}
                  <span className="dy-pill" style={{ position: "absolute", top: 6, right: 6, background: p.isAvailable ? "rgba(0,168,107,0.95)" : "rgba(231,76,60,0.95)", color: "#fff" }}>{p.isAvailable ? "Inapatikana" : "Imeisha"}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, minHeight: 32 }}>{p.name}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "var(--dy-green)" }}>{formatTZS(p.priceTzs)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                  <IconBtn title="Hariri" onClick={() => startEdit(p)}>✏️</IconBtn>
                  <IconBtn title="Geuza" onClick={() => { toggleProduct(p.id); toast(p.isAvailable ? "Imefichwa" : "Inapatikana"); }}>🔀</IconBtn>
                  <IconBtn title="Futa" color="#E74C3C" onClick={() => { if (confirm(`Futa "${p.name}"?`)) { deleteProduct(p.id); toast("Imefutwa"); } }}>🗑</IconBtn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProductSheet
        open={open} onClose={() => setOpen(false)} editing={editing}
        onSave={(data) => {
          if (editing) { updateProduct(editing.id, data); toast("Mabadiliko yamehifadhiwa"); }
          else { addProduct({ ...data, isAvailable: true }); toast("Bidhaa imeongezwa ✓"); }
          setOpen(false);
        }}
      />
    </>
  );
}

function IconBtn({ children, onClick, title, color }: { children: React.ReactNode; onClick: () => void; title: string; color?: string }) {
  return <button onClick={onClick} title={title} style={{ background: "#F0F4F8", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 14, color: color ?? "var(--dy-text)", cursor: "pointer", minHeight: 36 }}>{children}</button>;
}

function ProductSheet({ open, onClose, editing, onSave }: { open: boolean; onClose: () => void; editing: Product | null; onSave: (data: { name: string; priceTzs: number; description?: string; photoUrl?: string; stockCount?: number }) => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState("");
  const [stock, setStock] = useState("");

  // Reset fields when opening
  useResetOnOpen(open, () => {
    setName(editing?.name ?? ""); setPrice(editing ? String(editing.priceTzs) : ""); setDesc(editing?.description ?? "");
    setPhoto(editing?.photoUrl ?? ""); setStock(editing?.stockCount != null ? String(editing.stockCount) : "");
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Hariri Bidhaa" : "Ongeza Bidhaa Mpya"}>
      <div style={{ display: "grid", gap: 12 }}>
        <div><label className="dy-label">Jina la Bidhaa *</label><input className="dy-input" value={name} onChange={e => setName(e.target.value)} placeholder="k.m. AB Classic Hoodie" /></div>
        <div><label className="dy-label">Bei (TZS) *</label><input className="dy-input" inputMode="numeric" value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ""))} placeholder="65000" /></div>
        <div><label className="dy-label">Maelezo</label><textarea className="dy-input" rows={2} value={desc} onChange={e => setDesc(e.target.value)} /></div>
        <div><label className="dy-label">URL ya Picha</label><input className="dy-input" value={photo} onChange={e => setPhoto(e.target.value)} placeholder="https://..." /></div>
        <div><label className="dy-label">Idadi Iliyopo</label><input className="dy-input" inputMode="numeric" value={stock} onChange={e => setStock(e.target.value.replace(/\D/g, ""))} placeholder="10" /></div>
        <button className="dy-btn dy-btn-primary" onClick={() => {
          if (!name.trim() || !price) return;
          onSave({ name: name.trim(), priceTzs: Number(price), description: desc || undefined, photoUrl: photo || undefined, stockCount: stock ? Number(stock) : undefined });
        }}>{editing ? "💾 Hifadhi Mabadiliko" : "✅ Ongeza Bidhaa"}</button>
      </div>
    </Modal>
  );
}

function useResetOnOpen(open: boolean, fn: () => void) {
  useEffect(() => { if (open) fn(); /* eslint-disable-next-line */ }, [open]);
}