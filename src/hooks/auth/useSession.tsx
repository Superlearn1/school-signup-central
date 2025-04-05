
import { useUser, useSession as useClerkSession } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import SessionService from "@/services/auth/sessionService";

/**
 * Hook to manage user session state
 */
export const useSession = () => {
  const { session } = useClerkSession();
  const { user } = useUser();
  const [isExpired, setIsExpired] = useState(false);

  // Monitor session state and handle timeouts
  useEffect(() => {
    // Update session in SessionService when it changes
    SessionService.setSession(session);

    // Set up monitoring for session expiration
    // Clerk handles this internally, but we can add additional logic if needed
    const checkSessionValidity = () => {
      const isValid = SessionService.isSessionValid(session);
      setIsExpired(!isValid);
    };

    // Check immediately
    checkSessionValidity();

    // Set up periodic checking (if needed)
    const interval = setInterval(checkSessionValidity, 60000); // Check every minute

    return () => {
      clearInterval(interval);
    };
  }, [session]);

  return {
    session,
    user,
    isExpired,
    hasSession: !!session,
  };
};
