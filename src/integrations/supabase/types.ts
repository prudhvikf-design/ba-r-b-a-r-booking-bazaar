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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          cancel_reason: string | null
          cancelled_by: string | null
          created_at: string
          customer_id: string
          duration_min: number
          end_at: string
          id: string
          notes: string | null
          price_paise: number
          salon_id: string
          service_id: string
          service_name: string
          staff_id: string
          start_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_by?: string | null
          created_at?: string
          customer_id: string
          duration_min: number
          end_at: string
          id?: string
          notes?: string | null
          price_paise: number
          salon_id: string
          service_id: string
          service_name: string
          staff_id: string
          start_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_by?: string | null
          created_at?: string
          customer_id?: string
          duration_min?: number
          end_at?: string
          id?: string
          notes?: string | null
          price_paise?: number
          salon_id?: string
          service_id?: string
          service_name?: string
          staff_id?: string
          start_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      salon_hours: {
        Row: {
          close_time: string
          is_closed: boolean
          open_time: string
          salon_id: string
          weekday: number
        }
        Insert: {
          close_time?: string
          is_closed?: boolean
          open_time?: string
          salon_id: string
          weekday: number
        }
        Update: {
          close_time?: string
          is_closed?: boolean
          open_time?: string
          salon_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "salon_hours_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      salons: {
        Row: {
          address_line: string
          amenities: string[]
          area: string
          city: string
          cover_image: string | null
          created_at: string
          description: string | null
          gender: Database["public"]["Enums"]["salon_gender"]
          id: string
          is_demo: boolean
          name: string
          owner_id: string | null
          phone: string | null
          pincode: string | null
          rating: number | null
          review_count: number
          slug: string
          status: Database["public"]["Enums"]["salon_status"]
          tagline: string | null
          updated_at: string
        }
        Insert: {
          address_line: string
          amenities?: string[]
          area: string
          city: string
          cover_image?: string | null
          created_at?: string
          description?: string | null
          gender?: Database["public"]["Enums"]["salon_gender"]
          id?: string
          is_demo?: boolean
          name: string
          owner_id?: string | null
          phone?: string | null
          pincode?: string | null
          rating?: number | null
          review_count?: number
          slug: string
          status?: Database["public"]["Enums"]["salon_status"]
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          address_line?: string
          amenities?: string[]
          area?: string
          city?: string
          cover_image?: string | null
          created_at?: string
          description?: string | null
          gender?: Database["public"]["Enums"]["salon_gender"]
          id?: string
          is_demo?: boolean
          name?: string
          owner_id?: string | null
          phone?: string | null
          pincode?: string | null
          rating?: number | null
          review_count?: number
          slug?: string
          status?: Database["public"]["Enums"]["salon_status"]
          tagline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "salons_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration_min: number
          id: string
          is_active: boolean
          name: string
          price_paise: number
          salon_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          duration_min: number
          id?: string
          is_active?: boolean
          name: string
          price_paise: number
          salon_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration_min?: number
          id?: string
          is_active?: boolean
          name?: string
          price_paise?: number
          salon_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          salon_id: string
          specialties: string[]
          title: string | null
          updated_at: string
          years_experience: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          salon_id: string
          specialties?: string[]
          title?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          salon_id?: string
          specialties?: string[]
          title?: string | null
          updated_at?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _resolve_booking_slot: {
        Args: {
          _exclude_booking: string
          _salon_id: string
          _service_id: string
          _staff_id: string
          _start_at: string
        }
        Returns: {
          duration_min: number
          end_at: string
          price_paise: number
          service_name: string
          staff_id: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          booking_count: number
          city: string
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          roles: Database["public"]["Enums"]["app_role"][]
        }[]
      }
      admin_overview: { Args: never; Returns: Json }
      admin_set_role: {
        Args: {
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      cancel_booking: {
        Args: { _booking_id: string; _reason?: string }
        Returns: undefined
      }
      create_booking: {
        Args: {
          _notes?: string
          _salon_id: string
          _service_id: string
          _staff_id: string
          _start_at: string
        }
        Returns: string
      }
      get_available_slots: {
        Args: {
          _date: string
          _salon_id: string
          _service_id: string
          _staff_id: string
        }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_customer_of_my_salon: {
        Args: { _customer_id: string }
        Returns: boolean
      }
      owns_salon: { Args: { _salon_id: string }; Returns: boolean }
      register_salon: {
        Args: {
          _address_line: string
          _area: string
          _city: string
          _description?: string
          _gender?: Database["public"]["Enums"]["salon_gender"]
          _name: string
          _phone?: string
          _pincode?: string
        }
        Returns: string
      }
      reschedule_booking: {
        Args: { _booking_id: string; _staff_id?: string; _start_at: string }
        Returns: undefined
      }
      salon_visible: { Args: { _salon_id: string }; Returns: boolean }
      set_booking_status: {
        Args: {
          _booking_id: string
          _status: Database["public"]["Enums"]["booking_status"]
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "salon_owner" | "customer"
      booking_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
      salon_gender: "unisex" | "men" | "women"
      salon_status: "pending" | "active" | "suspended"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "salon_owner", "customer"],
      booking_status: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
      ],
      salon_gender: ["unisex", "men", "women"],
      salon_status: ["pending", "active", "suspended"],
    },
  },
} as const
