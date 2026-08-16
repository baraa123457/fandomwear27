/**
 * Generated from the live Postgres schema (supabase/migrations applied +
 * introspected), in the same shape `supabase gen types typescript --linked`
 * produces. Once you link your real project, regenerate the authoritative
 * version with:
 *
 *   npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
 *
 * This file should match that output structurally as long as your linked
 * project has these same migrations applied.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      coupons: {
        Row: {
          id: string
          code: string
          type: Database["public"]["Enums"]["discount_type"]
          value: number
          active: boolean
          expires: string
          uses: number
          max_uses: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          type: Database["public"]["Enums"]["discount_type"]
          value: number
          active?: boolean
          expires: string
          uses?: number
          max_uses?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          type?: Database["public"]["Enums"]["discount_type"]
          value?: number
          active?: boolean
          expires?: string
          uses?: number
          max_uses?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          id: string
          name: string
          email: string
          orders: number
          total_spent: number
          joined: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          orders?: number
          total_spent?: number
          joined?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          orders?: number
          total_spent?: number
          joined?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          name: string
          slug: string
          price: number
          size: Database["public"]["Enums"]["product_size"]
          color: string
          universe: string
          art_icon: string
          quantity: number
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          name: string
          slug: string
          price: number
          size: Database["public"]["Enums"]["product_size"]
          color: string
          universe: string
          art_icon: string
          quantity: number
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          name?: string
          slug?: string
          price?: number
          size?: Database["public"]["Enums"]["product_size"]
          color?: string
          universe?: string
          art_icon?: string
          quantity?: number
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
          id: string
          customer: string
          email: string
          order_date: string
          items: number
          total: number
          status: Database["public"]["Enums"]["admin_order_status"]
          user_id: string | null
          subtotal: number
          discount: number
          coupon_code: string | null
          shipping_cost: number
          tax: number
          payment_method: string | null
          shipping_address: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          customer: string
          email: string
          order_date?: string
          items: number
          total: number
          status?: Database["public"]["Enums"]["admin_order_status"]
          user_id?: string | null
          subtotal?: number
          discount?: number
          coupon_code?: string | null
          shipping_cost?: number
          tax?: number
          payment_method?: string | null
          shipping_address?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer?: string
          email?: string
          order_date?: string
          items?: number
          total?: number
          status?: Database["public"]["Enums"]["admin_order_status"]
          user_id?: string | null
          subtotal?: number
          discount?: number
          coupon_code?: string | null
          shipping_cost?: number
          tax?: number
          payment_method?: string | null
          shipping_address?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          slug: string
          name: string
          universe: string
          category: string
          price: number
          compare_at_price: number | null
          description: string
          material: string
          sizes: Database["public"]["Enums"]["product_size"][]
          colors: Json
          rating: number
          review_count: number
          stock: number
          tags: Database["public"]["Enums"]["product_tag"][]
          art_icon: string
          image: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          slug: string
          name: string
          universe: string
          category: string
          price: number
          compare_at_price?: number | null
          description?: string
          material?: string
          sizes?: Database["public"]["Enums"]["product_size"][]
          colors?: Json
          rating?: number
          review_count?: number
          stock?: number
          tags?: Database["public"]["Enums"]["product_tag"][]
          art_icon?: string
          image?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          universe?: string
          category?: string
          price?: number
          compare_at_price?: number | null
          description?: string
          material?: string
          sizes?: Database["public"]["Enums"]["product_size"][]
          colors?: Json
          rating?: number
          review_count?: number
          stock?: number
          tags?: Database["public"]["Enums"]["product_tag"][]
          art_icon?: string
          image?: string | null
          created_at?: string
          updated_at?: string
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
      reviews: {
        Row: {
          id: string
          product_id: string
          author: string
          rating: number
          title: string
          body: string
          review_date: string
          verified: boolean
          size: Database["public"]["Enums"]["product_size"] | null
          created_at: string
        }
        Insert: {
          id: string
          product_id: string
          author: string
          rating: number
          title?: string
          body?: string
          review_date?: string
          verified?: boolean
          size?: Database["public"]["Enums"]["product_size"] | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          author?: string
          rating?: number
          title?: string
          body?: string
          review_date?: string
          verified?: boolean
          size?: Database["public"]["Enums"]["product_size"] | null
          created_at?: string
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
          id: string
          label: string
          tagline: string
          color: string
          icon: string
          product_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          label: string
          tagline?: string
          color: string
          icon: string
          product_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          label?: string
          tagline?: string
          color?: string
          icon?: string
          product_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          user_id: string
          product_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          product_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          product_id?: string
          created_at?: string
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
      [_ in never]: never
    }
    Functions: {
      create_order: {
        Args: {
          p_items: Json
          p_email: string
          p_full_name: string
          p_line1: string
          p_city: string
          p_state: string
          p_zip: string
          p_country: string
          p_payment_method: string
          p_coupon_code?: string | null
        }
        Returns: Database["public"]["Tables"]["orders"]["Row"]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
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
