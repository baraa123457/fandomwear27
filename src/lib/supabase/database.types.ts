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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          expires: string
          id: string
          max_uses: number | null
          type: Database["public"]["Enums"]["discount_type"]
          updated_at: string
          uses: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          expires: string
          id?: string
          max_uses?: number | null
          type: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          uses?: number
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          expires?: string
          id?: string
          max_uses?: number | null
          type?: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          uses?: number
          value?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string
          id: string
          joined: string
          name: string
          orders: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          joined?: string
          name: string
          orders?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          joined?: string
          name?: string
          orders?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          art_icon: string
          color: string
          id: string
          name: string
          order_id: string
          price: number
          product_id: string
          quantity: number
          size: Database["public"]["Enums"]["product_size"]
          slug: string
          universe: string
        }
        Insert: {
          art_icon: string
          color: string
          id?: string
          name: string
          order_id: string
          price: number
          product_id: string
          quantity: number
          size: Database["public"]["Enums"]["product_size"]
          slug: string
          universe: string
        }
        Update: {
          art_icon?: string
          color?: string
          id?: string
          name?: string
          order_id?: string
          price?: number
          product_id?: string
          quantity?: number
          size?: Database["public"]["Enums"]["product_size"]
          slug?: string
          universe?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          coupon_code: string | null
          created_at: string
          customer: string
          discount: number
          email: string
          id: string
          items: number
          order_date: string
          payment_method: string | null
          shipping_address: Json | null
          shipping_cost: number
          status: Database["public"]["Enums"]["admin_order_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          customer: string
          discount?: number
          email: string
          id: string
          items: number
          order_date?: string
          payment_method?: string | null
          shipping_address?: Json | null
          shipping_cost?: number
          status?: Database["public"]["Enums"]["admin_order_status"]
          subtotal?: number
          tax?: number
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          customer?: string
          discount?: number
          email?: string
          id?: string
          items?: number
          order_date?: string
          payment_method?: string | null
          shipping_address?: Json | null
          shipping_cost?: number
          status?: Database["public"]["Enums"]["admin_order_status"]
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          art_icon: string
          category: string
          colors: Json
          compare_at_price: number | null
          created_at: string
          description: string
          id: string
          image: string | null
          images: string[]
          is_active: boolean
          material: string
          name: string
          price: number
          rating: number
          review_count: number
          sizes: Database["public"]["Enums"]["product_size"][]
          slug: string
          stock: number
          tags: Database["public"]["Enums"]["product_tag"][]
          universe: string
          updated_at: string
          video: string | null
        }
        Insert: {
          art_icon?: string
          category: string
          colors?: Json
          compare_at_price?: number | null
          created_at?: string
          description?: string
          id: string
          image?: string | null
          images?: string[]
          is_active?: boolean
          material?: string
          name: string
          price: number
          rating?: number
          review_count?: number
          sizes?: Database["public"]["Enums"]["product_size"][]
          slug: string
          stock?: number
          tags?: Database["public"]["Enums"]["product_tag"][]
          universe: string
          updated_at?: string
          video?: string | null
        }
        Update: {
          art_icon?: string
          category?: string
          colors?: Json
          compare_at_price?: number | null
          created_at?: string
          description?: string
          id?: string
          image?: string | null
          images?: string[]
          is_active?: boolean
          material?: string
          name?: string
          price?: number
          rating?: number
          review_count?: number
          sizes?: Database["public"]["Enums"]["product_size"][]
          slug?: string
          stock?: number
          tags?: Database["public"]["Enums"]["product_tag"][]
          universe?: string
          updated_at?: string
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_universe_fkey"
            columns: ["universe"]
            isOneToOne: false
            referencedRelation: "universes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name?: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author: string
          body: string
          created_at: string
          id: string
          product_id: string
          rating: number
          review_date: string
          size: Database["public"]["Enums"]["product_size"] | null
          title: string
          verified: boolean
        }
        Insert: {
          author: string
          body?: string
          created_at?: string
          id: string
          product_id: string
          rating: number
          review_date?: string
          size?: Database["public"]["Enums"]["product_size"] | null
          title?: string
          verified?: boolean
        }
        Update: {
          author?: string
          body?: string
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          review_date?: string
          size?: Database["public"]["Enums"]["product_size"] | null
          title?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      universes: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          label: string
          product_count: number
          tagline: string
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id: string
          label: string
          product_count?: number
          tagline?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          label?: string
          product_count?: number
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      product_sales_counts: {
        Row: {
          product_id: string | null
          total_sold: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_order: {
        Args: {
          p_city: string
          p_country: string
          p_coupon_code?: string
          p_email: string
          p_full_name: string
          p_items: Json
          p_line1: string
          p_payment_method: string
          p_state: string
          p_zip: string
        }
        Returns: {
          coupon_code: string | null
          created_at: string
          customer: string
          discount: number
          email: string
          id: string
          items: number
          order_date: string
          payment_method: string | null
          shipping_address: Json | null
          shipping_cost: number
          status: Database["public"]["Enums"]["admin_order_status"]
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      admin_order_status: "processing" | "shipped" | "delivered" | "cancelled"
      discount_type: "percentage" | "fixed"
      product_size: "S" | "M" | "L" | "XL" | "XXL"
      product_tag: "new" | "bestseller" | "sale" | "limited"
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
      admin_order_status: ["processing", "shipped", "delivered", "cancelled"],
      discount_type: ["percentage", "fixed"],
      product_size: ["S", "M", "L", "XL", "XXL"],
      product_tag: ["new", "bestseller", "sale", "limited"],
    },
  },
} as const
