
import { useUser, useClerk, useOrganization } from "@clerk/clerk-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import UserService from "@/services/auth/userService";
import { useNavigate, useLocation } from "react-router-dom";
import { Profile } from "@/types";

export const useAuth = () => {
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { organization } = useOrganization();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Load user profile from Supabase when Clerk user is available
  useEffect(() => {
    const loadProfile = async () => {
      if (isSignedIn && user && user.id) {
        try {
          const { success, profile, error } = await UserService.getUserProfile(user.id);
          
          if (success && profile) {
            setProfile(profile);
            setIsAdmin(profile.role === "admin");
          } else if (error) {
            console.error("Failed to load user profile:", error);
            // Don't show toast here as it might appear on every page load
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
        }
      } else {
        // Reset state when user is not signed in
        setProfile(null);
        setIsAdmin(false);
      }
      
      // Always set loading to false when done, whether successful or not
      setIsLoading(false);
    };

    if (isUserLoaded) {
      loadProfile();
    }
  }, [isUserLoaded, isSignedIn, user]);

  // Handle sign out with proper error handling
  const handleSignOut = useCallback(async () => {
    try {
      setIsLoading(true);
      await signOut();
      setProfile(null);
      setIsAdmin(false);
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
      navigate("/");
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: error.message || "An error occurred during sign out.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [signOut, toast, navigate]);

  // Check if user has a specific role
  const hasRole = useCallback((role: string): boolean => {
    if (!profile) return false;
    return profile.role === role;
  }, [profile]);

  return {
    user,
    profile,
    isAdmin,
    isAuthenticated: isSignedIn,
    isLoading: isLoading || !isUserLoaded,
    organization,
    signOut: handleSignOut,
    hasRole,
  };
};
