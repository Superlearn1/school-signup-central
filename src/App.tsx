
import React from 'react';
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
import RecoveryTool from "./pages/admin/RecoveryTool";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ClerkDebugger from "@/utils/clerk-debug";

const queryClient = new QueryClient();

// Create a fallback component to show when Clerk key is missing
const ClerkKeyMissing = () => {
  const { toast } = useToast();
  
  React.useEffect(() => {
    console.error('ENVIRONMENT CONFIGURATION ERROR');
    console.error('Available environment variables:', {
      VITE_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
      ...import.meta.env
    });

    toast({
      title: "Configuration Error",
      description: "Clerk API key is missing or incorrectly set. Please check your environment configuration.",
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
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Troubleshooting Steps:</h2>
          <ol className="list-decimal list-inside text-sm text-gray-600">
            <li>Verify you have added VITE_CLERK_PUBLISHABLE_KEY</li>
            <li>Check that the key starts with 'pk_test_'</li>
            <li>Restart the development server</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  // Debug logging for environment variables
  console.log('ALL ENV VARS:', import.meta.env);
  
  // Use the environment variable directly with additional checks
  const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  
  // Comprehensive key validation
  if (!clerkPubKey || typeof clerkPubKey !== 'string' || !clerkPubKey.startsWith('pk_test_')) {
    console.error('Invalid or missing Clerk Publishable Key:', clerkPubKey);
    return <ClerkKeyMissing />;
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
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
              <Route 
                path="/admin/recovery" 
                element={
                  <ProtectedRoute>
                    <RecoveryTool />
                  </ProtectedRoute>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ClerkDebugger />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
};

export default App;
