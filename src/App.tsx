
import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminSignup from "./pages/AdminSignup";
import Subscription from "./pages/Subscription";
import Dashboard from "./pages/Dashboard";
import StudentManagement from "./pages/StudentManagement";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

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

// Temporarily hardcoded key for development purposes
// In production, this should be properly secured
const TEMP_CLERK_KEY = "pk_test_cGxlYXNpbmctZG9iZXJtYW4tNDAuY2xlcmsuYWNjb3VudHMuZGV2JA";

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
    
    // For development purposes only - in production, implement proper key management
    // This is a temporary solution to get the app working for demonstration
    console.log("Using fallback Clerk key for development");
    setClerkPubKey(TEMP_CLERK_KEY);
    console.log("Clerk key being used:", TEMP_CLERK_KEY);
    
    // Log warning about using temporary key
    console.warn("Using temporary Clerk key for development. In production, secure your API keys properly.");
  }, []);

  // If no Clerk key is available, show the error page
  if (!clerkPubKey) {
    return <ClerkKeyMissing />;
  }

  return (
    <ClerkProvider 
      publishableKey={clerkPubKey}
      // Add explicit settings for Clerk including organization settings
      appearance={{
        elements: {
          organizationSwitcherTrigger: "py-2 px-4"
        },
      }}
      // Ensure organization features are properly activated
      organization={{
        enabled: true
      }}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
};

// Clerk protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

export default App;
