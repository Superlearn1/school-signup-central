
import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminSignup from "./pages/AdminSignup";
import Subscription from "./pages/Subscription";
import Dashboard from "./pages/Dashboard";
import StudentManagement from "./pages/StudentManagement";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      retry: 1,
    },
  },
});

// Hardcoded key as fallback for development
// In production, this should come from environment variables
const FALLBACK_CLERK_KEY = "pk_test_cGxlYXNpbmctZG9iZXJtYW4tNDAuY2xlcmsuYWNjb3VudHMuZGV2JA";

// Create a fallback component to show when Clerk key is missing
const ClerkKeyMissing = () => {
  const { toast } = useToast();
  
  React.useEffect(() => {
    toast({
      title: "Configuration Error",
      description: "Clerk API key is missing. Please add VITE_CLERK_PUBLISHABLE_KEY to your environment.",
      variant: "destructive"
    });
  }, [toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
        <p className="mb-4">
          The Clerk API key is missing. The application cannot function without this key.
        </p>
        <p className="text-sm text-gray-600">
          Please make sure <code className="bg-gray-100 px-1 py-0.5 rounded">VITE_CLERK_PUBLISHABLE_KEY</code> is set in your environment.
        </p>
      </div>
    </div>
  );
};

const App = () => {
  const [clerkPubKey, setClerkPubKey] = useState<string | null>(null);
  
  useEffect(() => {
    // Try to get the key from environment
    const envKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
    
    if (envKey) {
      console.log("Using Clerk key from environment variables");
      setClerkPubKey(envKey);
      return;
    }
    
    console.warn("No Clerk key found in environment variables, using fallback key");
    // Use fallback key for development
    setClerkPubKey(FALLBACK_CLERK_KEY);
  }, []);

  // If no Clerk key is available, show the error page
  if (!clerkPubKey) {
    return <ClerkKeyMissing />;
  }

  // It's crucial to have BrowserRouter as the outermost router provider
  // before any components that use router hooks
  return (
    <BrowserRouter>
      <ClerkProvider 
        publishableKey={clerkPubKey}
        appearance={{
          elements: {
            organizationSwitcherTrigger: "py-2 px-4"
          },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/admin-signup" element={<AdminSignup />} />
                <Route 
                  path="/subscription" 
                  element={
                    <ProtectedRoute>
                      <Subscription />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/students" 
                  element={
                    <ProtectedRoute>
                      <StudentManagement />
                    </ProtectedRoute>
                  } 
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </BrowserRouter>
  );
};

export default App;
