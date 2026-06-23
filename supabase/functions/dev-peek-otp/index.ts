// TEMP dev-only helper: brute-forces the most recent unconsumed OTP for a phone.
// Delete after end-to-end verification.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
function hmac(secret: string, msg: string): string {
  return createHmac("sha256", secret).update(msg).digest("base64");
}
Deno.serve(async (req) => {
  const { phone, start, end } = await req.json();
  const digits = String(phone).replace(/\D/g, "");
  const { data: row } = await supabase.from("phone_otps").select("code_hash").eq("phone", digits).eq("consumed", false).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!row) return new Response(JSON.stringify({ error: "no row" }), { status: 404 });
  const secret = Deno.env.get("OTP_SECRET") ?? "fallback-secret";
  const s = start ?? 100000;
  const e = end ?? 1000000;
  for (let i = s; i < e; i++) {
    if (hmac(secret, i + ":" + digits) === row.code_hash) return new Response(JSON.stringify({ code: String(i) }));
  }
  return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
});
