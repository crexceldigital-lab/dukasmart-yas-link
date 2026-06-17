import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka } from "@/lib/duka/store";
import { formatTZS, formatDate, getGreeting, getTier } from "@/lib/duka/utils";
import { StatusPill } from "@/components/duka/StatusPill";
import { PaymentLinkModal } from "@/components/duka/PaymentLinkModal";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Nyumbani — DUKA SMART" },
    { name: "description", content: "Dashibodi yako ya biashara. Tazama mauzo, kuunda viungo vya malipo na zaidi." },
  ] }),
  component: () => (<AuthGuard><Shell><Dashboard /></Shell></AuthGuard>),
});

function Dashboard() {
  const { merchant, products, transactions, rewards, stats } = useDuka();
  const [open, setOpen] = useState(false);
  if (!merchant) return null;
  const tier = getTier(merchant.creditScore);

  const top = [...products]
    .map(p => ({ ...p, revenue: (p.unitsSold ?? 0) * p.priceTzs }))
    .sort((a,b) => (b.unitsSold ?? 0) - (a.unitsSold ?? 0))
    .slice(0, 3);
  const medals = ["🥇","🥈","🥉"];
  const recent = transactions.slice(0, 5);

  return (
    <>
      <Topbar
        title={merchant.businessName}
        subtitle={`${merchant.dukaId} • ${merchant.city}`}
        right={<span className="dy-pill" style={{ background: "rgba(0,168,107,0.2)", color: "#fff", border: `1px solid ${tier.color}` }}>{tier.swahili}</span>}
      />
      <div style={{ padding: 16, display: "grid", gap: 14 }}>
        <div className="dy-hero">
          <div style={{ fontSize: 13, opacity: 0.85 }}>{getGreeting()}, {merchant.businessName.split(" ")[0]} 👋</div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>Mauzo ya leo</div>
          <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.02em", marginTop: 2 }}>{formatTZS(stats.today.total)}</div>
          <div style={{ fontSize: 12.5, opacity: 0.8 }}>{stats.today.count} miamala leo</div>
          <button className="dy-btn dy-btn-primary" style={{ marginTop: 14 }} onClick={() => setOpen(true)}>⚡ Unda Kiungo cha Malipo</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <StatCard label="Wiki Hii" value={formatTZS(stats.week.total)} sub={`${stats.week.count} miamala`} accent="var(--dy-green)" />
          <StatCard label="Mwezi Huu" value={formatTZS(stats.month.total)} sub={`${stats.month.count} miamala`} />
          <StatCard label="Jumla Yote" value={formatTZS(stats.allTime.total)} sub={`${stats.allTime.count} miamala`} />
          <div className="dy-card" style={{ background: "linear-gradient(135deg, #1A3E6F, #2A5FAF)", color: "#fff", border: "none" }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, opacity: 0.8, textTransform: "uppercase", letterSpacing: ".06em" }}>Afya ya Biashara</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>{merchant.creditScore}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#7CE3B5", marginTop: 2 }}>{tier.swahili}</div>
          </div>
        </div>

        {top.length > 0 && (
          <section className="dy-card">
            <h3 style={sectionTitle}>⭐ Bidhaa Zinazouza</h3>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {top.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 22 }}>{medals[i]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--dy-muted)" }}>{p.unitsSold ?? 0} zimeuzwa</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dy-green)" }}>{formatTZS(p.revenue)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {rewards.length > 0 && (
          <section className="dy-card">
            <h3 style={sectionTitle}>🎁 Zawadi za YAS</h3>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {rewards.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#F5A623,#E08E0B)", color: "#fff", display: "grid", placeItems: "center", fontSize: 18 }}>🎁</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dy-yellow)" }}>{r.value}</div>
                    <div style={{ fontSize: 12, color: "var(--dy-muted)" }}>{r.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="dy-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={sectionTitle}>Miamala ya Hivi Karibuni</h3>
            <Link to="/mauzo" style={{ fontSize: 12, fontWeight: 700, color: "var(--dy-navy)" }}>Yote →</Link>
          </div>
          {recent.length === 0 ? (
            <div style={{ padding: "30px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 40 }}>🧾</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 8 }}>Bado Hakuna Miamala</div>
              <p style={{ fontSize: 13, color: "var(--dy-muted)", marginTop: 4 }}>Unda kiungo cha kwanza ili kuanza kuuza</p>
              <button className="dy-btn dy-btn-primary" style={{ marginTop: 12, width: "auto", padding: "10px 18px" }} onClick={() => setOpen(true)}>⚡ Unda Kiungo</button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              {recent.map(t => {
                const icon = t.status === "confirmed" ? "✅" : t.status === "pending" ? "⏳" : "❌";
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 18 }}>{icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.productName}</div>
                      <div style={{ fontSize: 11.5, color: "var(--dy-muted)" }}>{formatDate(t.createdAt)}</div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--dy-green)" }}>{formatTZS(t.amount)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <PaymentLinkModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const sectionTitle: React.CSSProperties = { fontSize: 14, fontWeight: 800, color: "var(--dy-text)" };

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="dy-card">
      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--dy-muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, marginTop: 6, color: accent ?? "var(--dy-text)" }}>{value}</div>
      {sub ? <div style={{ fontSize: 11.5, color: "var(--dy-muted)" }}>{sub}</div> : null}
    </div>
  );
}