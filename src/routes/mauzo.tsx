import { createFileRoute } from "@tanstack/react-router";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka } from "@/lib/duka/store";
import { formatTZS, formatDate } from "@/lib/duka/utils";
import { StatusPill } from "@/components/duka/StatusPill";

export const Route = createFileRoute("/mauzo")({
  head: () => ({ meta: [{ title: "Mauzo — DUKA SMART" }, { name: "description", content: "Historia kamili ya mauzo yako." }] }),
  component: () => (<AuthGuard><Shell><Mauzo /></Shell></AuthGuard>),
});

function Mauzo() {
  const { transactions, stats } = useDuka();
  return (
    <>
      <Topbar title="Mauzo Yangu" subtitle={`${transactions.length} miamala`} />
      <div style={{ padding: 16, display: "grid", gap: 14 }}>
        <div className="dy-hero">
          <div style={{ fontSize: 13, opacity: 0.8 }}>Jumla ya Mauzo Yaliyokamilika</div>
          <div style={{ fontSize: 36, fontWeight: 900, marginTop: 4, letterSpacing: "-0.02em" }}>{formatTZS(stats.allTime.total)}</div>
          <div style={{ fontSize: 12.5, opacity: 0.8 }}>{stats.allTime.count} miamala iliyokamilika</div>
        </div>

        {transactions.length === 0 ? (
          <div className="dy-card" style={{ textAlign: "center", padding: 30 }}>
            <div style={{ fontSize: 44 }}>📭</div>
            <div style={{ fontWeight: 800, marginTop: 8 }}>Hakuna Mauzo Bado</div>
            <p style={{ fontSize: 13, color: "var(--dy-muted)" }}>Mauzo yataonekana hapa baada ya mteja kulipa</p>
          </div>
        ) : (
          <div className="dy-card" style={{ padding: 0, overflow: "hidden" }}>
            {transactions.map((t, i) => {
              const colors = { confirmed: "#00A86B", pending: "#F5A623", failed: "#E74C3C" } as const;
              const icon = t.status === "confirmed" ? "✓" : t.status === "pending" ? "⏳" : "✕";
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderTop: i === 0 ? "none" : "1px solid var(--dy-border)" }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: colors[t.status] + "22", color: colors[t.status], display: "grid", placeItems: "center", fontSize: 16, fontWeight: 800, flexShrink: 0 }}>{icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.productName}</div>
                    <div style={{ fontSize: 11.5, color: "var(--dy-muted)" }}>{formatDate(t.createdAt)} • {t.buyerPhone ?? "—"}</div>
                    <div style={{ marginTop: 4 }}><StatusPill status={t.status} /></div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: t.status === "confirmed" ? "var(--dy-green)" : "var(--dy-text)" }}>{formatTZS(t.amount)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}