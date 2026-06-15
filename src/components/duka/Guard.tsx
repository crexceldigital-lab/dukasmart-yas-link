import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useDuka } from "@/lib/duka/store";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { merchant, loading } = useDuka();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !merchant) navigate({ to: "/login" });
  }, [loading, merchant, navigate]);
  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <span className="dy-spinner dy-spinner-dark" />
      </div>
    );
  }
  if (!merchant) return null;
  return <>{children}</>;
}