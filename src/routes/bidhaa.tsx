import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka, type Product } from "@/lib/duka/store";
import { formatTZS, categoryIcon } from "@/lib/duka/utils";
import { Modal } from "@/components/duka/Modal";
import { useToast } from "@/components/duka/Toast";
import { useI18n } from "@/lib/duka/i18n";
import { Package, Plus, Pencil, ToggleLeft, Trash2, Save, CheckCircle2, Upload, X, ImageIcon } from "lucide-react";

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
  const [uploadErr, setUploadErr] = useState("");

  // Reset fields when opening
  useResetOnOpen(open, () => {
    setName(editing?.name ?? ""); setPrice(editing ? String(editing.priceTzs) : ""); setDesc(editing?.description ?? "");
    setPhoto(editing?.photoUrl ?? ""); setStock(editing?.stockCount != null ? String(editing.stockCount) : ""); setUploadErr("");
  });

  const handleFile = async (file: File) => {
    setUploadErr("");
    if (!file.type.startsWith("image/")) { setUploadErr(t("Chagua faili la picha tu", "Please select an image file")); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadErr(t("Picha kubwa sana (kiwango cha juu 5MB)", "Image too large (max 5MB)")); return; }
    try {
      const dataUrl = await compressImage(file, 800, 0.8);
      setPhoto(dataUrl);
    } catch {
      setUploadErr(t("Imeshindwa kupakia picha", "Failed to load image"));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? t("Hariri Bidhaa", "Edit Product") : t("Ongeza Bidhaa Mpya", "Add New Product")}>
      <div style={{ display: "grid", gap: 12 }}>
        <div><label className="dy-label">{t("Jina la Bidhaa *", "Product Name *")}</label><input className="dy-input" value={name} onChange={e => setName(e.target.value)} placeholder={t("k.m. AB Classic Hoodie", "e.g. AB Classic Hoodie")} /></div>
        <div><label className="dy-label">{t("Bei (TZS) *", "Price (TZS) *")}</label><input className="dy-input" inputMode="numeric" value={price} onChange={e => setPrice(e.target.value.replace(/\D/g, ""))} placeholder="65000" /></div>
        <div><label className="dy-label">{t("Maelezo", "Description")}</label><textarea className="dy-input" rows={2} value={desc} onChange={e => setDesc(e.target.value)} /></div>
        <div>
          <label className="dy-label">{t("Picha ya Bidhaa", "Product Image")}</label>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 80, height: 80, borderRadius: 10, background: "#F0F4F8", display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0, border: "1px solid #E5EAF0" }}>
              {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={28} strokeWidth={1.5} color="var(--dy-muted)" />}
            </div>
            <div style={{ flex: 1, display: "grid", gap: 6 }}>
              <label className="dy-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#F0F4F8", color: "var(--dy-navy)", cursor: "pointer", margin: 0, padding: "10px 12px" }}>
                <Upload size={16} strokeWidth={2.5} /> {photo ? t("Badilisha Picha", "Change Image") : t("Pakia Picha", "Upload Image")}
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
              </label>
              {photo && (
                <button type="button" onClick={() => setPhoto("")} style={{ background: "transparent", border: "none", color: "#E74C3C", fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, padding: 0 }}>
                  <X size={12} strokeWidth={2.5} /> {t("Ondoa picha", "Remove image")}
                </button>
              )}
              {uploadErr && <div style={{ fontSize: 12, color: "#E74C3C" }}>{uploadErr}</div>}
            </div>
          </div>
        </div>
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

async function compressImage(file: File, maxDim: number, quality: number): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("image load"));
    i.src = dataUrl;
  });
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * ratio); height = Math.round(height * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}