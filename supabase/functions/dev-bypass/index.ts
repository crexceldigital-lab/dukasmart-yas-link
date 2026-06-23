// DEV BYPASS: signs the caller in as a fixed demo account, no OTP required.
// Returns synthetic email+password the client uses with signInWithPassword.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function randomPassword(): string {
  const a = new Uint8Array(24); crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/[^A-Za-z0-9]/g, "") + "Aa1!";
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  let body: { phone?: string } = {};
  try { body = await req.json(); } catch { /* default phone */ }
  const digits = (body.phone ?? "255700000000").replace(/\D/g, "");
  const email = `${digits}@phone.duka.app`;
  const password = randomPassword();

  const { data: row, error: selErr } = await supabase
    .from("phone_users").select("user_id").eq("phone", digits).maybeSingle();
  if (selErr) return new Response(JSON.stringify({ ok: false, error: selErr.message }), { status: 500, headers: CORS });

  let userId = row?.user_id as string | undefined;
  if (!userId) {
    const { data: created, error: cErr } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { phone: digits, login_method: "dev-bypass" },
    });
    if (cErr || !created.user) {
      return new Response(JSON.stringify({ ok: false, error: "create failed: " + (cErr?.message ?? "") }), { status: 500, headers: CORS });
    }
    userId = created.user.id;
    await supabase.from("phone_users").insert({ phone: digits, user_id: userId });
  } else {
    const { error: uErr } = await supabase.auth.admin.updateUserById(userId, { password });
    if (uErr) return new Response(JSON.stringify({ ok: false, error: "rotate failed: " + uErr.message }), { status: 500, headers: CORS });
  }

  return new Response(JSON.stringify({ ok: true, email, password, phone: digits }), { headers: CORS });
}

Deno.serve(async (req) => {
  try { return await handle(req); }
  catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: "Server error: " + msg }), { status: 500, headers: CORS });
  }
});
