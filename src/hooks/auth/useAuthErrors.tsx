
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

type ErrorType = 
  | "authentication"
  | "registration"
  | "validation"
  | "verification"
  | "password"
  | "server"
  | "unknown";

interface ErrorState {
  message: string;
  type: ErrorType;
  field?: string;
}

/**
 * Hook to standardize error handling for authentication operations
 */
export const useAuthErrors = () => {
  const [errors, setErrors] = useState<ErrorState[]>([]);
  const { toast } = useToast();

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const addError = useCallback((message: string, type: ErrorType = "unknown", field?: string) => {
    const newError = { message, type, field };
    setErrors(prev => [...prev, newError]);
    
    // Also show toast for important errors
    if (type !== "validation") {
      toast({
        variant: "destructive",
        title: getErrorTitle(type),
        description: message,
      });
    }
    
    return newError;
  }, [toast]);

  const hasErrors = useCallback((type?: ErrorType) => {
    if (!type) return errors.length > 0;
    return errors.some(error => error.type === type);
  }, [errors]);

  const getFieldError = useCallback((field: string) => {
    return errors.find(error => error.field === field)?.message;
  }, [errors]);

  return {
    errors,
    addError,
    clearErrors,
    hasErrors,
    getFieldError,
  };
};

/**
 * Helper function to get the appropriate title for each error type
 */
function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case "authentication":
      return "Authentication Failed";
    case "registration":
      return "Registration Failed";
    case "validation":
      return "Validation Error";
    case "verification":
      return "Verification Failed";
    case "password":
      return "Password Error";
    case "server":
      return "Server Error";
    default:
      return "Error";
  }
}
