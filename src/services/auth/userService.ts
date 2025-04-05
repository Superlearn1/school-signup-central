
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types";

/**
 * User management service for Superlearn
 * Handles user profiles, roles, and related operations
 */
class UserService {
  /**
   * Get a user's profile from Supabase
   */
  static async getUserProfile(userId: string): Promise<{ 
    success: boolean; 
    profile?: Profile; 
    error?: string; 
  }> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("clerk_user_id", userId)
        .single();

      if (error) throw error;

      return {
        success: true,
        profile: data as Profile,
      };
    } catch (error: any) {
      console.error("Get user profile error:", error);
      return {
        success: false,
        error: error.message || "Failed to retrieve user profile",
      };
    }
  }

  /**
   * Check if user is the first in their school/organization
   * First user is automatically granted admin role
   */
  static async isFirstUserInSchool(schoolId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("school_id", schoolId);

      if (error) throw error;

      // If no profiles exist for this school, this is the first user
      return count === 0;
    } catch (error) {
      console.error("Error checking if first user:", error);
      return false;
    }
  }

  /**
   * Check if a user has a specific role
   */
  static async hasRole(userId: string, role: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("clerk_user_id", userId)
        .single();

      if (error) throw error;

      return data?.role === role;
    } catch (error) {
      console.error("Role check error:", error);
      return false;
    }
  }
}

export default UserService;
