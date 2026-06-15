import { useEffect, type ReactNode } from "react";

export function Modal({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title?: ReactNode; subtitle?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="dy-sheet-backdrop" onClick={onClose}>
      <div className="dy-sheet" onClick={e => e.stopPropagation()}>
        <div className="dy-sheet-handle" />
        {title ? <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{title}</h2> : null}
        {subtitle ? <p style={{ fontSize: 13, color: "var(--dy-muted)", marginBottom: 14 }}>{subtitle}</p> : null}
        {children}
      </div>
    </div>
  );
}