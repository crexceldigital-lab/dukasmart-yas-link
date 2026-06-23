export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_cat"]
          created_at: string
          date: string
          id: string
          merchant_id: string
          note: string | null
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_cat"]
          created_at?: string
          date?: string
          id?: string
          merchant_id: string
          note?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_cat"]
          created_at?: string
          date?: string
          id?: string
          merchant_id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          bio: string | null
          business_name: string
          category: string
          city: string
          created_at: string
          credit_score: number
          custom_slug: string | null
          duka_id: string
          id: string
          phone: string
          plan: Database["public"]["Enums"]["plan_type"]
          pro_renewal_date: string | null
          profile_photo: string | null
          staff_phones: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          business_name?: string
          category?: string
          city?: string
          created_at?: string
          credit_score?: number
          custom_slug?: string | null
          duka_id?: string
          id?: string
          phone: string
          plan?: Database["public"]["Enums"]["plan_type"]
          pro_renewal_date?: string | null
          profile_photo?: string | null
          staff_phones?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          business_name?: string
          category?: string
          city?: string
          created_at?: string
          credit_score?: number
          custom_slug?: string | null
          duka_id?: string
          id?: string
          phone?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          pro_renewal_date?: string | null
          profile_photo?: string | null
          staff_phones?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          amount: number
          created_at: string
          id: string
          is_active: boolean
          label: string
          merchant_id: string
          product_description: string | null
          product_id: string | null
          product_photo: string | null
          slug: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          merchant_id: string
          product_description?: string | null
          product_id?: string | null
          product_photo?: string | null
          slug: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          merchant_id?: string
          product_description?: string | null
          product_id?: string | null
          product_photo?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed: boolean
          created_at: string
          expires_at: string
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed?: boolean
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          buying_price_tzs: number | null
          created_at: string
          description: string | null
          id: string
          is_available: boolean
          merchant_id: string
          name: string
          photo_url: string | null
          price_tzs: number
          stock_count: number | null
          units_sold: number
          updated_at: string
        }
        Insert: {
          buying_price_tzs?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          merchant_id: string
          name: string
          photo_url?: string | null
          price_tzs: number
          stock_count?: number | null
          units_sold?: number
          updated_at?: string
        }
        Update: {
          buying_price_tzs?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          merchant_id?: string
          name?: string
          photo_url?: string | null
          price_tzs?: number
          stock_count?: number | null
          units_sold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      restocks: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          new_buying_price: number | null
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          new_buying_price?: number | null
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          new_buying_price?: number | null
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "restocks_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restocks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          claimed: boolean
          created_at: string
          id: string
          label: string
          merchant_id: string
          value: string
        }
        Insert: {
          claimed?: boolean
          created_at?: string
          id?: string
          label: string
          merchant_id: string
          value: string
        }
        Update: {
          claimed?: boolean
          created_at?: string
          id?: string
          label?: string
          merchant_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          buyer_name: string | null
          buyer_phone: string | null
          confirmed_at: string | null
          created_at: string
          failed_at: string | null
          id: string
          link_id: string | null
          merchant_id: string
          product_id: string | null
          product_name: string
          provider: string | null
          provider_tx_id: string | null
          ref: string | null
          status: Database["public"]["Enums"]["tx_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_name?: string | null
          buyer_phone?: string | null
          confirmed_at?: string | null
          created_at?: string
          failed_at?: string | null
          id?: string
          link_id?: string | null
          merchant_id: string
          product_id?: string | null
          product_name: string
          provider?: string | null
          provider_tx_id?: string | null
          ref?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_name?: string | null
          buyer_phone?: string | null
          confirmed_at?: string | null
          created_at?: string
          failed_at?: string | null
          id?: string
          link_id?: string | null
          merchant_id?: string
          product_id?: string | null
          product_name?: string
          provider?: string | null
          provider_tx_id?: string | null
          ref?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "payment_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cur_mid: { Args: never; Returns: string }
      gen_duka_id: { Args: never; Returns: string }
      get_link_with_merchant: {
        Args: { p_slug: string }
        Returns: {
          amount: number
          label: string
          merchant_city: string
          merchant_name: string
          product_description: string
          product_photo: string
        }[]
      }
    }
    Enums: {
      expense_cat:
        | "rent"
        | "transport"
        | "supplies"
        | "wages"
        | "utilities"
        | "other"
      plan_type: "free" | "pro"
      tx_status: "pending" | "confirmed" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      expense_cat: [
        "rent",
        "transport",
        "supplies",
        "wages",
        "utilities",
        "other",
      ],
      plan_type: ["free", "pro"],
      tx_status: ["pending", "confirmed", "failed"],
    },
  },
} as const
