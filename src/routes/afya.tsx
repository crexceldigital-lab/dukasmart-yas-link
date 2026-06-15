import { createFileRoute } from "@tanstack/react-router";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka } from "@/lib/duka/store";
import { getTier, TIERS } from "@/lib/duka/utils";
import { CreditRing } from "@/components/duka/CreditRing";

export const Route = createFileRoute("/afya")({
  head: () => ({ meta: [{ title: "Afya ya Biashara — Duka Yangu" }, { name: "description", content: "Tazama kiwango chako cha mkopo na jinsi ya kukikuza." }] }),
  component: () => (<AuthGuard><Shell><Afya /></Shell></AuthGuard>),
});

function Afya() {
  const { merchant } = useDuka();
  if (!merchant) return null;
  const score = merchant.creditScore;
  const tier = getTier(score);
  const next = TIERS.find(t => t.min > tier.max);
  const pointsToNext = next ? next.min - score : 0;

  return (
    <>
      <Topbar title="Afya ya Biashara" subtitle="Rekodi yako ya biashara" />
      <div style={{ padding: 16, display: "grid", gap: 16 }}>
        <div className="dy-card" style={{ paddingTop: 24, textAlign: "center" }}>
          <CreditRing score={score} />
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dy-text)", marginTop: 12 }}>{tier.english}</div>
          {next ? <div style={{ fontSize: 12.5, color: "var(--dy-muted)", marginTop: 4 }}>Pointi {pointsToNext} zinakupeleka kiwango cha <b style={{ color: next.color }}>{next.swahili}</b></div> : <div style={{ fontSize: 12.5, color: "var(--dy-green)", marginTop: 4, fontWeight: 700 }}>Umefika kiwango cha juu kabisa! 🎉</div>}
        </div>

        <div className="dy-card" style={{ padding: 0 }}>
          {TIERS.map((t, i) => {
            const active = t.swahili === tier.swahili;
            return (
              <div key={t.swahili} style={{
                display: "flex", alignItems: "center", gap: 12, padding: 14,
                borderTop: i === 0 ? "none" : "1px solid var(--dy-border)",
                background: active ? "#F0F6FF" : "transparent",
                border: active ? "1.5px solid #1A3E6F" : undefined,
                borderRadius: active ? 12 : 0, margin: active ? 6 : 0,
              }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{t.swahili} <span style={{ color: "var(--dy-muted)", fontWeight: 500, fontSize: 12 }}>({t.min}-{t.max})</span></div>
                  <div style={{ fontSize: 12, color: "var(--dy-muted)", marginTop: 2 }}>{t.benefit}</div>
                </div>
                {active ? <div style={{ fontSize: 20 }}>👈</div> : null}
              </div>
            );
          })}
        </div>

        <div style={{ background: "#F0F6FF", border: "1px solid #BCDBFF", color: "#1A3E6F", padding: 14, borderRadius: 12, fontSize: 13 }}>
          💡 <b>Vidokezo:</b> Kuza Afya yako kwa kuuza mara kwa mara, kuwa na bidhaa nyingi zinazopatikana, na kupokea malipo kwa Mixx by Yas.
        </div>
      </div>
    </>
  );
}