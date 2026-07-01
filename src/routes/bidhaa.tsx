import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka, type Product } from "@/lib/duka/store";
import { formatTZS, categoryIcon } from "@/lib/duka/utils";
import { Modal } from "@/components/duka/Modal";
import { useToast } from "@/components/duka/Toast";
import { useI18n } from "@/lib/duka/i18n";
import { Package, Plus, Pencil, ToggleLeft, Trash2, Save, CheckCircle2, Upload, X, ImageIcon, AlertTriangle, FileText, PackagePlus, TrendingUp } from "lucide-react";
import { useProGate } from "@/lib/duka/useProGate";
import { generateCatalogue } from "@/lib/duka/pdfCatalogue";

export const Route = createFileRoute("/bidhaa")({
  head: () => ({ meta: [{ title: "Bidhaa — DUKA SMART" }, { name: "description", content: "Simamia bidhaa zako: ongeza, hariri na ondoa." }] }),
  component: () => (<AuthGuard><Shell><Bidhaa /></Shell></AuthGuard>),
});

function Bidhaa() {
  const { products, merchant, addProduct, updateProduct, toggleProduct, deleteProduct, restockProduct } = useDuka();
  const toast = useToast();
  const { t } = useI18n();
  const { isPro, openUpgrade, requirePro } = useProGate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [dismissLow, setDismissLow] = useState(false);
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [restockQty, setRestockQty] = useState("");

  const startAdd = () => {
    if (!isPro && products.length >= 20) { openUpgrade(); return; }
    setEditing(null); setOpen(true);
  };
  const startEdit = (p: Product) => { setEditing(p); setOpen(true); };

  const lowStock = isPro ? products.filter(p => p.stockCount != null && p.stockCount <= 5 && p.isAvailable) : [];

  const exportPdf = () => requirePro(async () => {
    if (!merchant) return;
    try { await generateCatalogue(merchant, products); toast(t("Katalogi imetengenezwa", "Catalogue generated")); }
    catch { toast(t("Imeshindikana", "Failed to generate")); }
  });

  return (
    <>
      <Topbar
        title={t("Bidhaa Zangu", "My Products")}
        subtitle={`${products.length}${isPro ? "" : " / 20"} ${t("bidhaa", "products")}`}
        right={
          <button onClick={startAdd} aria-label={t("Ongeza bidhaa", "Add product")} style={{ width: 38, height: 38, borderRadius: 12, background: "var(--dy-yellow)", color: "var(--dy-navy)", border: "none", fontSize: 20, fontWeight: 800, cursor: "pointer" }}>+</button>
        }
      />
      <div style={{ padding: 16 }}>
        {/* Stock Value Summary Card */}
        {products.length > 0 && (() => {
          const productsWithStock = products.filter(p => p.stockCount != null && p.stockCount > 0);
          const stockValueSelling = productsWithStock.reduce((sum, p) => sum + p.priceTzs * (p.stockCount ?? 0), 0);
          const stockValueCost = productsWithStock.filter(p => p.buyingPriceTzs != null).reduce((sum, p) => sum + (p.buyingPriceTzs ?? 0) * (p.stockCount ?? 0), 0);
          const totalUnits = productsWithStock.reduce((sum, p) => sum + (p.stockCount ?? 0), 0);
          const grossMargin = stockValueCost > 0 ? ((stockValueSelling - stockValueCost) / stockValueSelling * 100).toFixed(0) : null;
          return (
            <div className="dy-card" style={{ marginBottom: 12, background: "linear-gradient(135deg, rgba(18,50,116,0.04), rgba(0,168,107,0.04))", border: "1px solid rgba(0,168,107,0.2)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:700, color:"var(--dy-navy)", marginBottom:10, textTransform:"uppercase", letterSpacing:".04em" }}>
                <Package size={13} strokeWidth={2.5} /> {t("Thamani ya Stoki", "Stock Value")}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                <div>
                  <div style={{ fontSize:10, color:"var(--dy-muted)", fontWeight:600, textTransform:"uppercase" }}>{t("Bei ya Mauzo","Selling Value")}</div>
                  <div style={{ fontSize:15, fontWeight:900, color:"var(--dy-green)", marginTop:2 }}>{formatTZS(stockValueSelling)}</div>
                </div>
                {stockValueCost > 0 && (
                  <div>
                    <div style={{ fontSize:10, color:"var(--dy-muted)", fontWeight:600, textTransform:"uppercase" }}>{t("Bei ya Ununuzi","Cost Value")}</div>
                    <div style={{ fontSize:15, fontWeight:900, color:"var(--dy-navy)", marginTop:2 }}>{formatTZS(stockValueCost)}</div>
                  </div>
                )}
                {grossMargin && (
                  <div>
                    <div style={{ fontSize:10, color:"var(--dy-muted)", fontWeight:600, textTransform:"uppercase" }}>{t("Faida ya Jumla","Gross Margin")}</div>
                    <div style={{ fontSize:15, fontWeight:900, color:"#00A86B", marginTop:2 }}>{grossMargin}%</div>
                  </div>
                )}
                {!stockValueCost && (
                  <div>
                    <div style={{ fontSize:10, color:"var(--dy-muted)", fontWeight:600, textTransform:"uppercase" }}>{t("Bidhaa","SKUs")}</div>
                    <div style={{ fontSize:15, fontWeight:900, color:"var(--dy-navy)", marginTop:2 }}>{productsWithStock.length}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize:10, color:"var(--dy-muted)", fontWeight:600, textTransform:"uppercase" }}>{t("Vipande","Total Units")}</div>
                  <div style={{ fontSize:15, fontWeight:900, color:"var(--dy-navy)", marginTop:2 }}>{totalUnits.toLocaleString()}</div>
                </div>
              </div>
            </div>
          );
        })()}
        {isPro && lowStock.length > 0 && !dismissLow && (
          <div style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.45)", color: "var(--dy-navy)", padding: 12, borderRadius: 12, fontSize: 13, display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <AlertTriangle size={18} color="#F5A623" strokeWidth={2.5} />
            <span style={{ flex: 1 }}>
              <b>{lowStock.length}</b> {t("bidhaa zinaisha stoki. Angalia.", lowStock.length === 1 ? "product is running low on stock." : "products are running low on stock.")}
            </span>
            <button onClick={() => setDismissLow(true)} style={{ background: "transparent", border: "none", color: "var(--dy-navy)", cursor: "pointer", display: "inline-flex" }} aria-label="dismiss">
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {products.length > 0 && (
          <button
            className="dy-btn dy-btn-ghost"
            onClick={exportPdf}
            style={{ marginBottom: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <FileText size={16} strokeWidth={2.5} /> {t("Katalogi ya PDF", "PDF Catalogue")}
            {!isPro && <span style={{ fontSize: 10, fontWeight: 900, background: "#F5A623", color: "#fff", padding: "2px 6px", borderRadius: 999 }}>PRO</span>}
          </button>
        )}

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
              const low = isPro && p.stockCount != null && p.stockCount <= 5 && p.isAvailable;
              return (
              <div key={p.id} className="dy-card" style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ position: "relative", aspectRatio: "1", borderRadius: 10, background: "#F0F4F8", display: "grid", placeItems: "center", overflow: "hidden" }}>
                  {p.photoUrl ? <img src={p.photoUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <CatIcon size={44} strokeWidth={1.5} color="var(--dy-navy)" />}
                  <span className="dy-pill" style={{ position: "absolute", top: 6, right: 6, background: p.isAvailable ? "rgba(0,168,107,0.95)" : "rgba(231,76,60,0.95)", color: "#fff" }}>{p.isAvailable ? t("Inapatikana", "Available") : t("Imeisha", "Out")}</span>
                  {low && (
                    <span className="dy-pill" style={{ position: "absolute", top: 6, left: 6, background: "#F5A623", color: "#fff", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <AlertTriangle size={10} strokeWidth={3} /> {t("Stoki Inaisha", "Low Stock")}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, minHeight: 32 }}>{p.name}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "var(--dy-green)" }}>{formatTZS(p.priceTzs)}</div>
                {isPro && p.buyingPriceTzs != null && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--dy-green)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <TrendingUp size={11} strokeWidth={2.5} />
                    {t("Faida:", "Profit:")} {formatTZS(p.priceTzs - p.buyingPriceTzs)} {t("/ moja", "/ each")}
                  </div>
                )}
                {p.bonusVoiceMins && (
                  <div style={{ fontSize: 11, fontWeight: 700, display:"inline-flex", alignItems:"center", gap:4,
                    color: p.bonusAwarded ? "var(--dy-muted)" : "var(--dy-green)",
                    textDecoration: p.bonusAwarded ? "line-through" : "none" }}>
                    📞 {p.bonusAwarded
                      ? t("Bonus imetumika", "Bonus awarded")
                      : t(`Dakika ${p.bonusVoiceMins} bure kwa mnunuzi wa 1 wa YAS`, `${p.bonusVoiceMins}min free for 1st YAS buyer`)
                    }
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                  <IconBtn title={t("Hariri", "Edit")} onClick={() => startEdit(p)}><Pencil size={14} strokeWidth={2.5} /></IconBtn>
                  <IconBtn title={t("Geuza", "Toggle")} onClick={() => { toggleProduct(p.id); toast(p.isAvailable ? t("Imefichwa", "Hidden") : t("Inapatikana", "Available")); }}><ToggleLeft size={14} strokeWidth={2.5} /></IconBtn>
                  <IconBtn title={t("Futa", "Delete")} color="#E74C3C" onClick={() => { if (confirm(t(`Futa "${p.name}"?`, `Delete "${p.name}"?`))) { deleteProduct(p.id); toast(t("Imefutwa", "Deleted")); } }}><Trash2 size={14} strokeWidth={2.5} /></IconBtn>
                </div>
                {isPro && (
                  restockingId === p.id ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        autoFocus className="dy-input" inputMode="numeric"
                        placeholder={t("Kiasi?", "Qty?")} value={restockQty}
                        onChange={e => setRestockQty(e.target.value.replace(/\D/g, ""))}
                        style={{ minHeight: 36, padding: "6px 10px", fontSize: 13 }}
                      />
                      <button onClick={() => {
                        const n = Number(restockQty);
                        if (n > 0) { restockProduct(p.id, n); toast(t("Stoki imeongezwa", "Stock added")); }
                        setRestockingId(null); setRestockQty("");
                      }} style={{ background: "var(--dy-green)", color: "#fff", border: "none", borderRadius: 8, padding: "0 10px", cursor: "pointer", minHeight: 36 }}>
                        <CheckCircle2 size={14} strokeWidth={2.5} />
                      </button>
                      <button onClick={() => { setRestockingId(null); setRestockQty(""); }} style={{ background: "#F0F4F8", border: "none", borderRadius: 8, padding: "0 8px", cursor: "pointer", minHeight: 36 }}>
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setRestockingId(p.id); setRestockQty(""); }}
                      style={{ background: "rgba(0,168,107,0.1)", color: "var(--dy-green)", border: "none", borderRadius: 8, padding: "6px 0", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 32 }}>
                      <PackagePlus size={12} strokeWidth={2.5} /> {t("Ongeza Stoki", "Restock")}
                    </button>
                  )
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      <ProductSheet
        open={open} onClose={() => setOpen(false)} editing={editing} isPro={isPro}
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

function ProductSheet({ open, onClose, editing, isPro, onSave }: { open: boolean; onClose: () => void; editing: Product | null; isPro: boolean; onSave: (data: { name: string; priceTzs: number; buyingPriceTzs?: number; description?: string; photoUrl?: string; stockCount?: number; bonusVoiceMins?: number }) => void }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState("");
  const [stock, setStock] = useState("");
  const [uploadErr, setUploadErr] = useState("");
  const [bonusEnabled, setBonusEnabled] = useState(false);

  // Reset fields when opening
  useResetOnOpen(open, () => {
    setName(editing?.name ?? ""); setPrice(editing ? String(editing.priceTzs) : ""); setDesc(editing?.description ?? "");
    setBuyPrice(editing?.buyingPriceTzs != null ? String(editing.buyingPriceTzs) : "");
    setPhoto(editing?.photoUrl ?? ""); setStock(editing?.stockCount != null ? String(editing.stockCount) : ""); setUploadErr("");
    setBonusEnabled(!!(editing?.bonusVoiceMins));
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
        {isPro && (
          <div>
            <label className="dy-label">{t("Bei ya Ununuzi (Hiari)", "Buying Price (Optional)")}</label>
            <input className="dy-input" inputMode="numeric" value={buyPrice} onChange={e => setBuyPrice(e.target.value.replace(/\D/g, ""))} placeholder="40000" />
            <div style={{ fontSize: 11.5, color: "var(--dy-muted)", marginTop: 4 }}>
              {t("Hii inatusaidia kuhesabu faida yako", "This helps us calculate your profit")}
            </div>
          </div>
        )}
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

        {/* Feature 4: Voice Bonus — Pro only */}
        {isPro && (
          <div style={{ padding:"12px 14px", borderRadius:12, border:`1.5px solid ${bonusEnabled ? "rgba(0,168,107,0.4)" : "#E2E8F0"}`,
            background: bonusEnabled ? "rgba(0,168,107,0.05)" : "#FAFAFA" }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--dy-navy)", display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <span style={{ fontSize:16 }}>📞</span>
                  {t("Bonus Malipo — Dakika 3 za Bure", "Payment Bonus — 3 Free Voice Minutes")}
                </div>
                <div style={{ fontSize:11.5, color:"var(--dy-muted)", lineHeight:1.5 }}>
                  {t("Mnunuzi wa kwanza wa YAS anayenunua bidhaa hii anapata dakika 3 za simu (mtandao wowote) bure.", "The first YAS customer who buys this product gets 3 free voice minutes on any network.")}
                </div>
                {bonusEnabled && editing?.bonusAwarded && (
                  <div style={{ marginTop:6, fontSize:11.5, color:"var(--dy-green)", fontWeight:700, display:"flex", alignItems:"center", gap:4 }}>
                    <CheckCircle2 size={12} strokeWidth={2.5} />
                    {t("Bonus imeshatumika kwa mnunuzi wa kwanza.", "Bonus already awarded to the first buyer.")}
                  </div>
                )}
              </div>
              <button
                onClick={() => setBonusEnabled(v => !v)}
                disabled={!!(editing?.bonusAwarded)}
                style={{
                  width:44, height:26, borderRadius:999, border:"none", cursor: editing?.bonusAwarded ? "default" : "pointer",
                  background: bonusEnabled ? "var(--dy-green)" : "#CBD5E0",
                  position:"relative", flexShrink:0, transition:"background 200ms ease", marginTop:2,
                }}>
                <span style={{
                  position:"absolute", top:3, left: bonusEnabled ? 22 : 3, width:20, height:20,
                  borderRadius:"50%", background:"#fff", transition:"left 200ms ease",
                  boxShadow:"0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </button>
            </div>
          </div>
        )}

        <button className="dy-btn dy-btn-primary" onClick={() => {
          if (!name.trim() || !price) return;
          onSave({
            name: name.trim(), priceTzs: Number(price),
            buyingPriceTzs: isPro && buyPrice ? Number(buyPrice) : undefined,
            description: desc || undefined, photoUrl: photo || undefined,
            stockCount: stock ? Number(stock) : undefined,
            bonusVoiceMins: isPro && bonusEnabled && !(editing?.bonusAwarded) ? 3 : undefined,
          });
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