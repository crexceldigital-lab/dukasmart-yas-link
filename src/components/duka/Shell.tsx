import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { YasLogo } from "./YasLogo";
import { LangToggle, useI18n } from "@/lib/duka/i18n";
import { useDuka } from "@/lib/duka/store";
import { ProBadge } from "./ProBadge";

export function Topbar({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  const { merchant } = useDuka();
  const isPro = merchant?.plan === "pro";
  return (
    <div className="dy-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        <YasLogo size={32} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
            {isPro ? <ProBadge /> : null}
          </h1>
          {subtitle ? <div className="sub">{subtitle}</div> : null}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <LangToggle />
        {right}
      </div>
    </div>
  );
}

export function BottomNav() {
  const path = useRouterState({ select: s => s.location.pathname });
  const { t } = useI18n();
  const tabs: { to: string; label: string; icon: ReactNode }[] = [
    { to: "/",        label: t("Nyumbani", "Home"),     icon: <HomeIcon /> },
    { to: "/bidhaa",  label: t("Bidhaa",   "Products"), icon: <BoxIcon /> },
    { to: "/mauzo",   label: t("Mauzo",    "Sales"),    icon: <TrendIcon /> },
    { to: "/afya",    label: t("Afya",     "Health"),   icon: <StarIcon /> },
    { to: "/msaidizi",label: t("Msaidizi", "Assistant"),icon: <SparkleChatIcon /> },
    { to: "/akaunti", label: t("Akaunti",  "Account"),  icon: <UserIcon /> },
  ];
  return (
    <nav className="dy-bottom-nav">
      {tabs.map(t => {
        const active = path === t.to;
        return (
          <Link key={t.to} to={t.to} className={"dy-tab" + (active ? " active" : "")}>
            {t.icon}<span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="dy-shell">
      {children}
      <BottomNav />
    </div>
  );
}

function HomeIcon() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>); }
function BoxIcon() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>); }
function TrendIcon() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="14 7 21 7 21 14"/></svg>); }
function StarIcon() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9 12 2"/></svg>); }
function UserIcon() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></svg>); }
function SparkleChatIcon() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/><path d="M14 8.5l.7 1.6 1.8.3-1.3 1.2.3 1.8-1.5-.8-1.5.8.3-1.8L11.5 10.4l1.8-.3z"/></svg>); }