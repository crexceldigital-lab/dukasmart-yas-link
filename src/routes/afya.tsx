import { createFileRoute } from "@tanstack/react-router";
import { Shell, Topbar } from "@/components/duka/Shell";
import { AuthGuard } from "@/components/duka/Guard";
import { useDuka } from "@/lib/duka/store";
import { getTier, TIERS } from "@/lib/duka/utils";
import { CreditRing } from "@/components/duka/CreditRing";
import { useI18n } from "@/lib/duka/i18n";
import { Lightbulb, ChevronLeft, Trophy } from "lucide-react";

export const Route = createFileRoute("/afya")({
  head: () => ({ meta: [{ title: "Afya ya Biashara — POKEA" }, { name: "description", content: "Tazama kiwango chako cha mkopo na jinsi ya kukikuza." }] }),
  component: () => (<AuthGuard><Shell><Afya /></Shell></AuthGuard>),
});

function Afya() {
  const { merchant } = useDuka();
  const { t, lang } = useI18n();
  if (!merchant) return null;
  const score = merchant.creditScore;
  const tier = getTier(score);
  const next = TIERS.find(t => t.min > tier.max);
  const pointsToNext = next ? next.min - score : 0;

  return (
    <>
      <Topbar title={t("Afya ya Biashara", "Business Health")} subtitle={t("Rekodi yako ya biashara", "Your business record")} />
      <div style={{ padding: 16, display: "grid", gap: 16 }}>
        <div className="dy-card" style={{ paddingTop: 24, textAlign: "center" }}>
          <CreditRing score={score} />
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--dy-text)", marginTop: 12 }}>{lang === "en" ? tier.english : tier.swahili}</div>
          {next ? <div style={{ fontSize: 12.5, color: "var(--dy-muted)", marginTop: 4 }}>{t(`Pointi ${pointsToNext} zinakupeleka kiwango cha `, `${pointsToNext} points to tier `)}<b style={{ color: next.color }}>{lang === "en" ? next.english : next.swahili}</b></div> : <div style={{ fontSize: 12.5, color: "var(--dy-green)", marginTop: 4, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}><Trophy size={14} strokeWidth={2.5} /> {t("Umefika kiwango cha juu kabisa!", "You've reached the top tier!")}</div>}
        </div>

        <div className="dy-card" style={{ padding: 0 }}>
          {TIERS.map((tierItem, i) => {
            const active = tierItem.swahili === tier.swahili;
            return (
              <div key={tierItem.swahili} style={{
                display: "flex", alignItems: "center", gap: 12, padding: 14,
                borderTop: i === 0 ? "none" : "1px solid var(--dy-border)",
                background: active ? "rgba(18,50,116,0.06)" : "transparent",
                border: active ? "1.5px solid var(--dy-navy)" : undefined,
                borderRadius: active ? 12 : 0, margin: active ? 6 : 0,
              }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: tierItem.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{lang === "en" ? tierItem.english : tierItem.swahili} <span style={{ color: "var(--dy-muted)", fontWeight: 500, fontSize: 12 }}>({tierItem.min}-{tierItem.max})</span></div>
                  <div style={{ fontSize: 12, color: "var(--dy-muted)", marginTop: 2 }}>{tierItem.benefit}</div>
                </div>
                {active ? <ChevronLeft size={20} strokeWidth={2.5} color="var(--dy-navy)" /> : null}
              </div>
            );
          })}
        </div>

        <div style={{ background: "rgba(18,50,116,0.06)", border: "1px solid rgba(18,50,116,0.18)", color: "var(--dy-navy)", padding: 14, borderRadius: 12, fontSize: 13, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Lightbulb size={18} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
          <div><b>{t("Vidokezo:", "Tips:")}</b> {t("Kuza Afya yako kwa kuuza mara kwa mara, kuwa na bidhaa nyingi zinazopatikana, na kupokea malipo kwa Mixx by Yas.", "Grow your Health by selling regularly, keeping more products available, and accepting payments via Mixx by Yas.")}</div>
        </div>
      </div>
    </>
  );
}