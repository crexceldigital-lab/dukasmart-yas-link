// ============================================================
// DUKA SMART — Payment Webhook Edge Function
// Deploy: supabase functions deploy payment-webhook
//
// This single handler supports multiple payment providers.
// Add your provider's secret in Supabase Dashboard >
// Edge Functions > Secrets:
//   MIXX_WEBHOOK_SECRET
//   MPESA_WEBHOOK_SECRET
//   SUPABASE_SERVICE_ROLE_KEY (auto-injected)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // service role bypasses RLS
);

// ---- Provider adapters ----------------------------------------
// Each adapter receives the raw body + headers and returns a
// normalized PaymentResult or null if the signature is invalid.

interface PaymentResult {
  provider: string;
  providerTxId: string;
  status: "confirmed" | "failed";
  ref: string;
  // The transaction ID we stored when we initiated the payment.
  // Providers call this "external_id", "account_reference", etc.
  internalTxId: string;
  reason?: string;
}

async function adaptMixx(body: Record<string, unknown>, headers: Headers): Promise<PaymentResult | null> {
  const secret = Deno.env.get("MIXX_WEBHOOK_SECRET");
  if (secret) {
    const sig = headers.get("x-mixx-signature") ?? "";
    // TODO: replace with Mixx's actual HMAC verification once you have docs
    // For now accept if secret matches a header value they send
    if (sig !== secret) {
      console.warn("[mixx] Invalid signature");
      return null;
    }
  }

  // ---- Mixx payload shape (adjust when you get real API docs) ----
  // {
  //   "event": "payment.success" | "payment.failed",
  //   "transaction_id": "MX123456",          <- their ID
  //   "external_id": "our-uuid",             <- what we passed when initiating
  //   "amount": 35000,
  //   "phone": "255712345678",
  //   "reference": "MX-REF-ABC"
  // }
  const event = body.event as string;
  const ok = event === "payment.success" || event === "payment.completed";
  const failed = event === "payment.failed" || event === "payment.cancelled";

  if (!ok && !failed) return null;

  return {
    provider: "mixx",
    providerTxId: body.transaction_id as string,
    status: ok ? "confirmed" : "failed",
    ref: (body.reference as string) ?? (body.transaction_id as string),
    internalTxId: body.external_id as string,
    reason: failed ? (body.reason as string) : undefined,
  };
}

async function adaptMpesa(body: Record<string, unknown>, _headers: Headers): Promise<PaymentResult | null> {
  // ---- Vodacom Tanzania M-Pesa C2B/STK Push callback shape ----
  // {
  //   "Body": {
  //     "stkCallback": {
  //       "MerchantRequestID": "our-uuid",
  //       "CheckoutRequestID": "ws_CO_...",
  //       "ResultCode": 0,          <- 0 = success
  //       "ResultDesc": "The service request is processed successfully.",
  //       "CallbackMetadata": {
  //         "Item": [
  //           { "Name": "Amount", "Value": 35000 },
  //           { "Name": "MpesaReceiptNumber", "Value": "QK18HTYYJ8" },
  //           ...
  //         ]
  //       }
  //     }
  //   }
  // }
  const callback = (body?.Body as Record<string, unknown>)?.stkCallback as Record<string, unknown> | undefined;
  if (!callback) return null;

  const resultCode = callback.ResultCode as number;
  const ok = resultCode === 0;
  const items: Array<{ Name: string; Value: unknown }> =
    ((callback.CallbackMetadata as Record<string, unknown>)?.Item as Array<{ Name: string; Value: unknown }>) ?? [];

  const receipt = items.find(i => i.Name === "MpesaReceiptNumber")?.Value as string ?? "";

  return {
    provider: "mpesa",
    providerTxId: callback.CheckoutRequestID as string,
    status: ok ? "confirmed" : "failed",
    ref: receipt,
    internalTxId: callback.MerchantRequestID as string,
    reason: ok ? undefined : (callback.ResultDesc as string),
  };
}

// ---------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const headers = req.headers;
  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") ?? "mixx";

  // Pick adapter
  let result: PaymentResult | null = null;
  if (provider === "mixx") {
    result = await adaptMixx(body, headers);
  } else if (provider === "mpesa") {
    result = await adaptMpesa(body, headers);
  }

  if (!result) {
    console.warn("[webhook] Unrecognized or unauthorized payload", provider, body);
    return new Response(JSON.stringify({ ok: false, error: "unrecognized" }), {
      status: 200, // return 200 to prevent provider retries on auth failures
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log("[webhook] Processing", result);

  // Log raw event
  const { data: tx } = await supabase
    .from("transactions")
    .select("id, merchant_id")
    .eq("id", result.internalTxId)
    .single();

  if (!tx) {
    console.warn("[webhook] Transaction not found:", result.internalTxId);
    return new Response(JSON.stringify({ ok: false, error: "tx_not_found" }), { status: 200 });
  }

  await supabase.from("payment_events").insert({
    transaction_id: result.internalTxId,
    merchant_id: tx.merchant_id,
    event: result.status === "confirmed" ? "confirmed" : "failed",
    raw_payload: body as Record<string, unknown>,
  });

  // Confirm or fail the transaction
  if (result.status === "confirmed") {
    const { error } = await supabase.rpc("confirm_transaction", {
      p_tx_id: result.internalTxId,
      p_ref: result.ref,
      p_provider_tx_id: result.providerTxId,
    });
    if (error) {
      console.error("[webhook] confirm_transaction failed:", error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 200 });
    }

    // ── Voice Bonus: award to the first YAS buyer ──────────────────
    // After a confirmed payment, check if the transaction's product has
    // an unawarded voice bonus. If so, mark it as awarded and provision
    // the voice minutes via the YAS Business API.
    try {
      const { data: txFull } = await supabase
        .from("transactions")
        .select("product_id, buyer_phone, merchant_id")
        .eq("id", result.internalTxId)
        .single();

      if (txFull?.product_id) {
        const { data: product } = await supabase
          .from("products")
          .select("id, bonus_voice_mins, bonus_awarded")
          .eq("id", txFull.product_id)
          .single();

        if (product?.bonus_voice_mins && !product.bonus_awarded && txFull.buyer_phone) {
          // Mark as awarded immediately (idempotent — webhook may retry)
          const { error: awardErr } = await supabase
            .from("products")
            .update({ bonus_awarded: true })
            .eq("id", product.id)
            .eq("bonus_awarded", false); // only update if not already awarded (race condition guard)

          if (!awardErr) {
            console.log(`[webhook] Voice bonus: ${product.bonus_voice_mins}min → ${txFull.buyer_phone}`);

            // ── YAS Business API call to provision voice minutes ────
            // TODO: Replace with real YAS Business API endpoint when available.
            // The payload below is a placeholder based on the expected shape.
            // Contact YAS Business integration team for the actual endpoint and auth.
            const yasApiKey = Deno.env.get("YAS_BUSINESS_API_KEY");
            const yasApiUrl = Deno.env.get("YAS_BUSINESS_API_URL");
            if (yasApiKey && yasApiUrl) {
              try {
                const apiRes = await fetch(`${yasApiUrl}/v1/rewards/voice`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${yasApiKey}`,
                  },
                  body: JSON.stringify({
                    phone: txFull.buyer_phone,      // buyer's phone number
                    minutes: product.bonus_voice_mins,
                    merchant_id: txFull.merchant_id,
                    transaction_id: result.internalTxId,
                    note: `POKEA Bonus — Product purchase voice reward`,
                  }),
                });
                if (!apiRes.ok) {
                  console.warn("[webhook] YAS voice API returned non-200:", await apiRes.text());
                }
              } catch (apiErr) {
                console.error("[webhook] YAS voice API call failed:", apiErr);
                // Don't fail the webhook — the bonus_awarded flag is already set.
                // YAS support can re-provision manually using the transaction_id.
              }
            } else {
              console.warn("[webhook] YAS_BUSINESS_API_KEY or YAS_BUSINESS_API_URL not set — voice bonus logged but not provisioned.");
            }
          }
        }
      }
    } catch (bonusErr) {
      // Never let bonus logic block the main webhook response
      console.error("[webhook] Voice bonus award error (non-fatal):", bonusErr);
    }
    // ── End Voice Bonus ───────────────────────────────────────────
  } else {
    await supabase.rpc("fail_transaction", {
      p_tx_id: result.internalTxId,
      p_reason: result.reason ?? "Provider reported failure",
    });
  }

  console.log("[webhook] Done ✓", result.internalTxId, result.status);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
