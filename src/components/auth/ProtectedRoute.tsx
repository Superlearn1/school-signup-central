
import React, { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  redirectTo = "/",
}) => {
  const { isAuthenticated, isLoading, hasRole } = useAuthContext();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return (
      <Navigate
        to={`${redirectTo}?returnTo=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  }

  // If role is required but user doesn't have it
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <Navigate
        to="/dashboard"
        state={{ accessDenied: true, requiredRole }}
        replace
      />
    );
  }

  return <>{children}</>;
};
