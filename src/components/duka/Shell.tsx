import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { YasLogo } from "./YasLogo";

export function Topbar({ title, subtitle, right }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="dy-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        <YasLogo size={32} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</h1>
          {subtitle ? <div className="sub">{subtitle}</div> : null}
        </div>
      </div>
      {right}
    </div>
  );
}

const tabs: { to: string; label: string; icon: ReactNode }[] = [
  { to: "/", label: "Nyumbani", icon: <HomeIcon /> },
  { to: "/bidhaa", label: "Bidhaa", icon: <BoxIcon /> },
  { to: "/mauzo", label: "Mauzo", icon: <TrendIcon /> },
  { to: "/afya", label: "Afya", icon: <StarIcon /> },
  { to: "/akaunti", label: "Akaunti", icon: <UserIcon /> },
];

export function BottomNav() {
  const path = useRouterState({ select: s => s.location.pathname });
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