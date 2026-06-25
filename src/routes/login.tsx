import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDuka } from "@/lib/duka/store";
import { YasLogo } from "@/components/duka/YasLogo";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Karibu — POKEA" }] }),
  component: LoginPage,
});

const DEMO_PHONE = "255700000000";
const DEMO_BUSINESS = {
  business_name: "Duka la Demo",
  category: "Other",
  city: "Dar es Salaam",
  bio: "Akaunti ya majaribio",
};

function LoginPage() {
  const { merchant } = useDuka();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Inakuingiza...");
  const ran = useRef(false);

  useEffect(() => {
    if (merchant) {
      window.location.href = "/";
      return;
    }
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        setStatus("Inafungua akaunti ya majaribio...");
        const { data, error } = await supabase.functions.invoke("dev-bypass", {
          body: { phone: DEMO_PHONE },
        });
        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error ?? "bypass failed");

        setStatus("Inaingia...");
        const { data: signIn, error: signErr } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (signErr) throw signErr;
        if (!signIn.user) throw new Error("no user");

        setStatus("Inaandaa duka lako...");
        const { data: existing } = await supabase
          .from("merchants")
          .select("id")
          .eq("user_id", signIn.user.id)
          .maybeSingle();

        if (!existing) {
          const { error: insErr } = await supabase.from("merchants").insert({
            user_id: signIn.user.id,
            phone: DEMO_PHONE,
            ...DEMO_BUSINESS,
          });
          if (insErr) throw insErr;
        }

        window.location.href = "/";
      } catch (e) {
        setStatus("Imeshindikana: " + (e instanceof Error ? e.message : String(e)));
      }
    })();
  }, [merchant, navigate]);

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      maxWidth: 430, margin: "0 auto",
      background: "linear-gradient(180deg,#123274 0%,#0B1F4D 100%)",
      color: "#fff", padding: 24, gap: 18, textAlign: "center",
    }}>
      <YasLogo size={72} />
      <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: "0.02em" }}>
        DUKA <span style={{ color: "#FFD100" }}>SMART</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <Loader2 size={18} className="animate-spin" />
        <span style={{ fontSize: 14, opacity: 0.9 }}>{status}</span>
      </div>
    </div>
  );
}
