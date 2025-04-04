
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
import { useToast } from "@/hooks/use-toast";

const queryClient = new QueryClient();

// Get Clerk publishable key from environment
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Display a helpful error message if the key is missing
if (!clerkPubKey) {
  console.error("ERROR: Clerk publishable key is missing! Make sure VITE_CLERK_PUBLISHABLE_KEY is set.");
}

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
  // If no Clerk key is available, show the error page
  if (!clerkPubKey) {
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
};

export default App;
