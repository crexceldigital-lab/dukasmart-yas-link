// ============================================================
// POKEA — Supabase Client
// Replace: src/integrations/supabase/client.ts
//
// Set these in your Lovable project:
//   .env  →  VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
// Get them from: Supabase Dashboard > Project Settings > API
// ============================================================

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env\n" +
    "Get them from: Supabase Dashboard > Project Settings > API"
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    headers: {
      "x-app-name": "duka-smart",
    },
  },
});

// Storage helpers
export const STORAGE_BUCKET = "duka-assets";

export async function uploadFile(
  file: File,
  path: string // e.g. "products/merchant-id/photo.jpg"
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) { console.error("[storage] upload failed:", error); return null; }
  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}

export async function deleteFile(path: string): Promise<void> {
  await supabase.storage.from(STORAGE_BUCKET).remove([path]);
}

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// Full DB type definitions matching our schema
export type Database = {
  public: {
    Tables: {
      merchants: {
        Row: {
          id: string; user_id: string; duka_id: string; phone: string;
          business_name: string; category: string; city: string; bio: string;
          profile_photo: string | null; credit_score: number;
          plan: "free" | "pro"; pro_renewal_date: string | null;
          custom_slug: string | null; staff_phones: string[];
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["merchants"]["Row"], "id" | "duka_id" | "credit_score" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["merchants"]["Insert"]>;
      };
      products: {
        Row: {
          id: string; merchant_id: string; name: string;
          price_tzs: number; buying_price_tzs: number | null;
          description: string | null; photo_url: string | null;
          stock_count: number; is_available: boolean; units_sold: number;
          created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "units_sold" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      transactions: {
        Row: {
          id: string; merchant_id: string; link_id: string | null;
          product_id: string | null; product_name: string;
          amount: number; status: "pending" | "confirmed" | "failed";
          buyer_phone: string | null; buyer_name: string | null;
          ref: string | null; provider: string | null;
          provider_tx_id: string | null; confirmed_at: string | null;
          failed_at: string | null; created_at: string; updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["transactions"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
      };
      payment_links: {
        Row: {
          id: string; merchant_id: string; slug: string; amount: number;
          label: string; product_id: string | null; product_photo: string | null;
          product_description: string | null; is_active: boolean; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payment_links"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["payment_links"]["Insert"]>;
      };
      expenses: {
        Row: {
          id: string; merchant_id: string; amount: number;
          category: "rent" | "transport" | "supplies" | "wages" | "utilities" | "other";
          note: string | null; date: string; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["expenses"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
      };
      restocks: {
        Row: {
          id: string; merchant_id: string; product_id: string;
          quantity: number; new_buying_price: number | null; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["restocks"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["restocks"]["Insert"]>;
      };
      rewards: {
        Row: { id: string; merchant_id: string; label: string; value: string; claimed: boolean; created_at: string; };
        Insert: Omit<Database["public"]["Tables"]["rewards"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["rewards"]["Insert"]>;
      };
      payment_events: {
        Row: {
          id: string; transaction_id: string; merchant_id: string;
          event: "initiated" | "pending" | "confirmed" | "failed" | "refunded";
          raw_payload: Json | null; created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["payment_events"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["payment_events"]["Insert"]>;
      };
      staff_sessions: {
        Row: {
          id: string; merchant_id: string; staff_phone: string;
          user_id: string | null; created_at: string; expires_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["staff_sessions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["staff_sessions"]["Insert"]>;
      };
      otp_cache: {
        Row: { phone: string; hash: string; expires_at: string; created_at: string; };
        Insert: Omit<Database["public"]["Tables"]["otp_cache"]["Row"], "created_at">;
        Update: Partial<Database["public"]["Tables"]["otp_cache"]["Insert"]>;
      };
    };
    Functions: {
      confirm_transaction: {
        Args: { p_tx_id: string; p_ref: string; p_provider_tx_id?: string };
        Returns: Database["public"]["Tables"]["transactions"]["Row"];
      };
      fail_transaction: {
        Args: { p_tx_id: string; p_reason?: string };
        Returns: Database["public"]["Tables"]["transactions"]["Row"];
      };
      recalculate_credit_score: {
        Args: { p_merchant_id: string };
        Returns: number;
      };
      get_merchant_by_slug: {
        Args: { p_slug: string };
        Returns: Array<{
          id: string; business_name: string; category: string;
          city: string; bio: string; profile_photo: string | null;
          plan: "free" | "pro"; duka_id: string; custom_slug: string | null;
        }>;
      };
      get_link_with_merchant: {
        Args: { p_slug: string };
        Returns: Array<{
          link_id: string; link_slug: string; amount: number; label: string;
          product_photo: string | null; product_description: string | null;
          merchant_name: string; merchant_plan: "free" | "pro"; merchant_city: string;
        }>;
      };
      current_merchant_id: { Args: Record<never, never>; Returns: string; };
    };
  };
};
