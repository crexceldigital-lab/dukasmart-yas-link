import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka, type Product } from "@/lib/duka/store";
import { formatTZS, categoryIcon } from "@/lib/duka/utils";
import { Modal } from "@/components/duka/Modal";
import { useToast } from "@/components/duka/Toast";
import { useI18n } from "@/lib/duka/i18n";
import { Package, Plus, Pencil, ToggleLeft, Trash2, Save, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/bidhaa")({
  head: () => ({ meta: [{ title: "Bidhaa — DUKA SMART" }, { name: "description", content: "Simamia bidhaa zako: ongeza, hariri na ondoa." }] }),
  component: () => (<AuthGuard><Shell><Bidhaa /></Shell></AuthGuard>),
});

function Bidhaa() {
  const { products, merchant, addProduct, updateProduct, toggleProduct, deleteProduct } = useDuka();
  const toast = useToast();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const startAdd = () => { setEditing(null); setOpen(true); };
  const startEdit = (p: Product) => { setEditing(p); setOpen(true); };

  return (
    <>
      <Topbar
        title={t("Bidhaa Zangu", "My Products")}
        subtitle={`${products.length} / 20 ${t("bidhaa", "products")}`}
        right={
          <button onClick={startAdd} aria-label={t("Ongeza bidhaa", "Add product")} style={{ width: 38, height: 38, borderRadius: 12, background: "var(--dy-yellow)", color: "var(--dy-navy)", border: "none", fontSize: 20, fontWeight: 800, cursor: "pointer" }}>+</button>
        }
      />
      <div style={{ padding: 16 }}>
        {products.length === 0 ? (
          <div style={{ padding: "60px 16px", textAlign: "center" }}>
            <Package size={56} strokeWidth={1.5} color="var(--dy-muted)" />
            <div style={{ fontSize: 17, fontWeight: 800, marginTop: 10 }}>{t("Hakuna Bidhaa Bado", "No Products Yet")}</div>
            <p style={{ fontSize: 13, color: "var(--dy-muted)", marginTop: 6 }}>{t("Anza kwa kuongeza bidhaa yako ya kwanza", "Start by adding your first product")}</p>
            <button className="dy-btn dy-btn-primary" style={{ marginTop: 18, width: "auto", padding: "12px 22px", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={startAdd}>
              <Plus size={16} strokeWidth={2.5} /> {t("Ongeza Bidhaa ya Kwanza", "Add First Product")}
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {products.map(p => {
              const CatIcon = categoryIcon(merchant?.category ?? "Other");
              return (
              <div key={p.id} className="dy-card" style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ position: "relative", aspectRatio: "1", borderRadius: 10, background: "#F0F4F8", display: "grid", placeItems: "center", overflow: "hidden" }}>
                  {p.photoUrl ? <img src={p.photoUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <CatIcon size={44} strokeWidth={1.5} color="var(--dy-navy)" />}
                  <span className="dy-pill" style={{ position: "absolute", top: 6, right: 6, background: p.isAvailable ? "rgba(0,168,107,0.95)" : "rgba(231,76,60,0.95)", color: "#fff" }}>{p.isAvailable ? t("Inapatikana", "Available") : t("Imeisha", "Out")}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, minHeight: 32 }}>{p.name}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "var(--dy-green)" }}>{formatTZS(p.priceTzs)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                  <IconBtn title={t("Hariri", "Edit")} onClick={() => startEdit(p)}><Pencil size={14} strokeWidth={2.5} /></IconBtn>
                  <IconBtn title={t("Geuza", "Toggle")} onClick={() => { toggleProduct(p.id); toast(p.isAvailable ? t("Imefichwa", "Hidden") : t("Inapatikana", "Available")); }}><ToggleLeft size={14} strokeWidth={2.5} /></IconBtn>
                  <IconBtn title={t("Futa", "Delete")} color="#E74C3C" onClick={() => { if (confirm(t(`Futa "${p.name}"?`, `Delete "${p.name}"?`))) { deleteProduct(p.id); toast(t("Imefutwa", "Deleted")); } }}><Trash2 size={14} strokeWidth={2.5} /></IconBtn>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      <ProductSheet
        open={open} onClose={() => setOpen(false)} editing={editing}
        onSave={(data) => {
          if (editing) { updateProduct(editing.id, data); toast(t("Mabadiliko yamehifadhiwa", "Changes saved")); }
          else { addProduct({ ...data, isAvailable: true }); toast(t("Bidhaa imeongezwa", "Product added")); }
          setOpen(false);
        }}
      />
    </>
  );
}

function IconBtn({ children, onClick, title, color }: { children: React.ReactNode; onClick: () => void; title: string; color?: string }) {
  return <button onClick={onClick} title={title} style={{ background: "#F0F4F8", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 14, color: color ?? "var(--dy-text)", cursor: "pointer", minHeight: 36, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{children}</button>;
}

function ProductSheet({ open, onClose, editing, onSave }: { open: boolean; onClose: () => void; editing: Product | null; onSave: (data: { name: string; priceTzs: number; description?: string; photoUrl?: string; stockCount?: number }) => void }) {
  const { t } = useI18n();
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
    <Modal open={open} onClose={onClose} title={editing ? t("Hariri Bidhaa", "Edit Product") : t("Ongeza Bidhaa Mpya", "Add New Product")}>
      <div style={{ display: "grid", gap: 12 }}>
        <div><label className="dy-label">{t("Jina la Bidhaa *", "Product Name *")}</label><input className="dy-input" value={name} onChange={e => setName(e.target.value)} placeholder={t("k.m. AB Classic Hoodie", "e.g. AB Classic Hoodie")} /></div>
        <div><label className="dy-label">{t("Bei (TZS) *", "Price (TZS) *")}</label><input className="dy-input" inputMode="numeric" value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ""))} placeholder="65000" /></div>
        <div><label className="dy-label">{t("Maelezo", "Description")}</label><textarea className="dy-input" rows={2} value={desc} onChange={e => setDesc(e.target.value)} /></div>
        <div><label className="dy-label">{t("URL ya Picha", "Image URL")}</label><input className="dy-input" value={photo} onChange={e => setPhoto(e.target.value)} placeholder="https://..." /></div>
        <div><label className="dy-label">{t("Idadi Iliyopo", "Stock Count")}</label><input className="dy-input" inputMode="numeric" value={stock} onChange={e => setStock(e.target.value.replace(/\D/g, ""))} placeholder="10" /></div>
        <button className="dy-btn dy-btn-primary" onClick={() => {
          if (!name.trim() || !price) return;
          onSave({ name: name.trim(), priceTzs: Number(price), description: desc || undefined, photoUrl: photo || undefined, stockCount: stock ? Number(stock) : undefined });
        }} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {editing ? <><Save size={16} strokeWidth={2.5} /> {t("Hifadhi Mabadiliko", "Save Changes")}</> : <><CheckCircle2 size={16} strokeWidth={2.5} /> {t("Ongeza Bidhaa", "Add Product")}</>}
        </button>
      </div>
    </Modal>
  );
}

function useResetOnOpen(open: boolean, fn: () => void) {
  useEffect(() => { if (open) fn(); /* eslint-disable-next-line */ }, [open]);
}