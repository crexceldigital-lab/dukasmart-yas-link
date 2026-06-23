// ============================================================
// DUKA SMART — useRealtime Hook
// Add to: src/lib/duka/useRealtime.ts
//
// Subscribes to live database changes so the merchant's
// dashboard updates instantly when a payment comes in —
// without needing to refresh the page.
// ============================================================

import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type RealtimeOptions = {
  merchantId: string | undefined;
  onNewTransaction?: (tx: Record<string, unknown>) => void;
  onTransactionUpdated?: (tx: Record<string, unknown>) => void;
  onProductUpdated?: (prod: Record<string, unknown>) => void;
  onNewReward?: (reward: Record<string, unknown>) => void;
};

export function useRealtime({
  merchantId,
  onNewTransaction,
  onTransactionUpdated,
  onProductUpdated,
  onNewReward,
}: RealtimeOptions) {
  const setup = useCallback(() => {
    if (!merchantId) return null;

    const channel: RealtimeChannel = supabase
      .channel(`duka:${merchantId}`, {
        config: { broadcast: { self: false } },
      })
      // New transaction (payment link was tapped)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `merchant_id=eq.${merchantId}` },
        payload => {
          onNewTransaction?.(payload.new as Record<string, unknown>);
          // Play a subtle notification sound if available
          try {
            const audio = new Audio("/sounds/ping.mp3");
            audio.volume = 0.4;
            audio.play().catch(() => {}); // ignore autoplay restrictions
          } catch { /* ignore */ }
        }
      )
      // Transaction status changed (confirmed / failed)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions", filter: `merchant_id=eq.${merchantId}` },
        payload => {
          const row = payload.new as Record<string, unknown>;
          onTransactionUpdated?.(row);
          // Play success sound on confirmation
          if (row.status === "confirmed") {
            try {
              const audio = new Audio("/sounds/success.mp3");
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch { /* ignore */ }
          }
        }
      )
      // Product stock changed (after a sale)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products", filter: `merchant_id=eq.${merchantId}` },
        payload => {
          onProductUpdated?.(payload.new as Record<string, unknown>);
        }
      )
      // New reward earned
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "rewards", filter: `merchant_id=eq.${merchantId}` },
        payload => {
          onNewReward?.(payload.new as Record<string, unknown>);
        }
      )
      .subscribe(status => {
        if (status === "SUBSCRIBED") {
          console.log("[realtime] Connected to merchant channel:", merchantId);
        }
        if (status === "CHANNEL_ERROR") {
          console.warn("[realtime] Channel error — will retry");
        }
      });

    return channel;
  }, [merchantId, onNewTransaction, onTransactionUpdated, onProductUpdated, onNewReward]);

  useEffect(() => {
    const channel = setup();
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
        console.log("[realtime] Disconnected");
      }
    };
  }, [setup]);
}

// ---- Simple toast notification for new payments ----
// Call this from your dashboard page to get live alerts.
// Example:
//
//   useRealtime({
//     merchantId: merchant?.merchantId,
//     onTransactionUpdated: (tx) => {
//       if (tx.status === 'confirmed') {
//         toast(`💰 Malipo ya ${formatTZS(tx.amount as number)} yamefika!`);
//         refreshAll();
//       }
//     },
//   });
