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
      nccd_evidence: {
        Row: {
          created_at: string
          id: string
          pdf_url: string
          resource_adaptation_id: string
          school_id: string
          student_id: string
          taught_on: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pdf_url: string
          resource_adaptation_id: string
          school_id: string
          student_id: string
          taught_on: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pdf_url?: string
          resource_adaptation_id?: string
          school_id?: string
          student_id?: string
          taught_on?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dccd_evidence_resource_adaptation_id_fkey"
            columns: ["resource_adaptation_id"]
            isOneToOne: true
            referencedRelation: "resource_adaptations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dccd_evidence_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dccd_evidence_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dccd_evidence_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          admin_id: string
          clerk_org_id: string | null
          created_at: string
          id: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          admin_id: string
          clerk_org_id?: string | null
          created_at?: string
          id?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          admin_id?: string
          clerk_org_id?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          clerk_user_id: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string
          school_id: string
        }
        Insert: {
          clerk_user_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role: string
          school_id: string
        }
        Update: {
          clerk_user_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_adaptations: {
        Row: {
          adapted_content: string
          created_at: string
          created_by: string
          disabilities_considered: Json | null
          generated_by_ai: boolean | null
          id: string
          resource_id: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          adapted_content: string
          created_at?: string
          created_by: string
          disabilities_considered?: Json | null
          generated_by_ai?: boolean | null
          id?: string
          resource_id?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          adapted_content?: string
          created_at?: string
          created_by?: string
          disabilities_considered?: Json | null
          generated_by_ai?: boolean | null
          id?: string
          resource_id?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_adaptations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_adaptations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_adaptations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_adaptations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          id: string
          objective: string | null
          school_id: string
          subject: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: string
          id?: string
          objective?: string | null
          school_id: string
          subject?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          objective?: string | null
          school_id?: string
          subject?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          acara_id: string | null
          claimed: boolean | null
          claimed_by_user_id: string | null
          clerk_org_id: string | null
          created_at: string
          id: string
          name: string
          postcode: string | null
          state: string | null
          suburb: string | null
        }
        Insert: {
          acara_id?: string | null
          claimed?: boolean | null
          claimed_by_user_id?: string | null
          clerk_org_id?: string | null
          created_at?: string
          id?: string
          name: string
          postcode?: string | null
          state?: string | null
          suburb?: string | null
        }
        Update: {
          acara_id?: string | null
          claimed?: boolean | null
          claimed_by_user_id?: string | null
          clerk_org_id?: string | null
          created_at?: string
          id?: string
          name?: string
          postcode?: string | null
          state?: string | null
          suburb?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string
          created_by: string | null
          disabilities: Json | null
          full_name: string
          id: string
          school_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          disabilities?: Json | null
          full_name: string
          id?: string
          school_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          disabilities?: Json | null
          full_name?: string
          id?: string
          school_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          school_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          total_student_seats: number
          total_teacher_seats: number
          updated_at: string
          used_student_seats: number
          used_teacher_seats: number
        }
        Insert: {
          created_at?: string
          id?: string
          school_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          total_student_seats?: number
          total_teacher_seats?: number
          updated_at?: string
          used_student_seats?: number
          used_teacher_seats?: number
        }
        Update: {
          created_at?: string
          id?: string
          school_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          total_student_seats?: number
          total_teacher_seats?: number
          updated_at?: string
          used_student_seats?: number
          used_teacher_seats?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_school_and_org: {
        Args: { p_school_id: string; p_clerk_org_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
