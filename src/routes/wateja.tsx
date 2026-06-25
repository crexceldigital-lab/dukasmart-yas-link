import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka } from "@/lib/duka/store";
import { formatTZS, formatDate } from "@/lib/duka/utils";
import { useI18n } from "@/lib/duka/i18n";
import { useProGate } from "@/lib/duka/useProGate";
import { Search, Users } from "lucide-react";

export const Route = createFileRoute("/wateja")({
  head: () => ({ meta: [{ title: "Wateja — POKEA" }, { name: "description", content: "Hifadhidata yako ya wateja." }] }),
  component: () => (<AuthGuard><Shell><Wateja /></Shell></AuthGuard>),
});

function Wateja() {
  const { customers, transactions } = useDuka();
  const { t } = useI18n();
  const { isPro, openUpgrade } = useProGate();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!isPro) { openUpgrade(); navigate({ to: "/" }); }
  }, [isPro, openUpgrade, navigate]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(c => (c.name?.toLowerCase().includes(term)) || c.phone.includes(term));
  }, [customers, q]);

  const detail = selected ? customers.find(c => c.phone === selected) : null;
  const detailTx = selected ? transactions.filter(t => t.buyerPhone === selected && t.status === "confirmed") : [];

  return (
    <>
      <Topbar title={t("Wateja Wako", "Your Customers")} subtitle={`${customers.length} ${t("wateja", "customers")}`} />
      <div style={{ padding: 16, display: "grid", gap: 12 }}>
        <div style={{ position: "relative" }}>
          <Search size={16} strokeWidth={2.5} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--dy-muted)" }} />
          <input className="dy-input" style={{ paddingLeft: 36 }} placeholder={t("Tafuta mteja", "Search customer")} value={q} onChange={e => setQ(e.target.value)} />
        </div>

        {filtered.length === 0 ? (
          <div className="dy-card" style={{ textAlign: "center", padding: "30px 16px" }}>
            <Users size={40} strokeWidth={1.5} color="var(--dy-muted)" />
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>{t("Hakuna wateja", "No customers")}</div>
          </div>
        ) : (
          <div className="dy-card" style={{ display: "grid", gap: 10 }}>
            {filtered.map(c => (
              <button key={c.phone} onClick={() => setSelected(c.phone === selected ? null : c.phone)} style={{ background: "transparent", border: "none", padding: 0, textAlign: "left", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--dy-navy)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 14, flexShrink: 0 }}>
                  {(c.name ?? c.phone).slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name ?? `+${c.phone}`}</div>
                  <div style={{ fontSize: 11.5, color: "var(--dy-muted)" }}>{c.purchaseCount} {t("ununuzi", "purchases")} • {formatDate(c.lastPurchase)}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dy-green)" }}>{formatTZS(c.totalSpent)}</div>
              </button>
            ))}
          </div>
        )}

        {detail && (
          <div className="dy-card" style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{detail.name ?? `+${detail.phone}`}</div>
            {detailTx.map(t => (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>{t.productName}</span>
                <b style={{ color: "var(--dy-green)" }}>{formatTZS(t.amount)}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}