
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";

interface UseAuthRedirectOptions {
  requiredRole?: string;
  redirectAuthenticated?: string;
  redirectUnauthenticated?: string;
}

/**
 * Hook to handle authentication-based redirects
 * Can redirect based on authentication status and roles
 */
export const useAuthRedirect = ({
  requiredRole,
  redirectAuthenticated = "/dashboard",
  redirectUnauthenticated = "/",
}: UseAuthRedirectOptions = {}) => {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect while still loading authentication state
    if (isLoading) return;

    // If authentication is required but user is not authenticated
    if (!isAuthenticated && redirectUnauthenticated) {
      // Save the current path to redirect back after authentication
      const returnTo = location.pathname !== "/" ? location.pathname : undefined;
      
      // Build the redirect URL with the return path if necessary
      const redirectUrl = returnTo
        ? `${redirectUnauthenticated}?returnTo=${encodeURIComponent(returnTo)}`
        : redirectUnauthenticated;
        
      navigate(redirectUrl);
      return;
    }

    // If user is authenticated but this route is only for unauthenticated users
    if (isAuthenticated && redirectAuthenticated && location.pathname === "/") {
      navigate(redirectAuthenticated);
      return;
    }

    // If role is required but user doesn't have it
    if (
      requiredRole &&
      isAuthenticated &&
      !hasRole(requiredRole)
    ) {
      // Redirect to dashboard with access denied message
      navigate("/dashboard", { 
        state: { 
          accessDenied: true,
          requiredRole 
        } 
      });
      return;
    }
  }, [
    isAuthenticated,
    isLoading,
    requiredRole,
    hasRole,
    navigate,
    location.pathname,
    redirectAuthenticated,
    redirectUnauthenticated,
  ]);

  return { isLoading };
};
