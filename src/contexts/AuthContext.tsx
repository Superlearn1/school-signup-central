
import React, { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { useSession } from "@/hooks/auth/useSession";
import { useOnboarding } from "@/hooks/auth/useOnboarding";
import { Profile } from "@/types";

interface AuthContextType {
  // User state
  user: ReturnType<typeof useAuth>["user"];
  profile: Profile | null;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  organization: ReturnType<typeof useAuth>["organization"];
  
  // Auth actions
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  
  // Session state
  session: ReturnType<typeof useSession>["session"];
  isSessionExpired: boolean;
  
  // Onboarding state
  onboarding: ReturnType<typeof useOnboarding>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const sessionData = useSession();
  const onboarding = useOnboarding();

  const value: AuthContextType = {
    // User state
    user: auth.user,
    profile: auth.profile,
    isAdmin: auth.isAdmin,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    organization: auth.organization,
    
    // Auth actions
    signOut: auth.signOut,
    hasRole: auth.hasRole,
    
    // Session state
    session: sessionData.session,
    isSessionExpired: sessionData.isExpired,
    
    // Onboarding state
    onboarding,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use the auth context
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
