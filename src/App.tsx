import React, { useState, useEffect, ErrorInfo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { useToast } from "@/hooks/use-toast";
import ClerkDebugger from "@/utils/clerk-debug";
import AppRoutes from "@/components/AppRoutes";
import { TempoDevtools } from "tempo-devtools";
import ProtectedRoute from "@/components/ProtectedRoute";

// Initialize Tempo Devtools
if (import.meta.env.VITE_TEMPO === "true") {
  TempoDevtools.init();
}

const queryClient = new QueryClient();

// Create a component to show when app is in demo mode
const ClerkDemoModeNotice = () => {
  const { toast } = useToast();

  React.useEffect(() => {
    toast({
      title: "Demo Mode Active",
      description:
        "Clerk API key is missing. Authentication features are limited. Set VITE_CLERK_PUBLISHABLE_KEY to enable full functionality.",
      duration: 10000,
    });
  }, [toast]);

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-100 text-yellow-800 p-2 text-center text-sm z-50">
      ⚠️ Demo Mode: Authentication features are limited. Set Clerk API key for full functionality.
    </div>
  );
};

// Create a fallback component to show when Clerk key is missing
const ClerkKeyMissing = () => {
  const { toast } = useToast();

  React.useEffect(() => {
    toast({
      title: "Configuration Error",
      description:
        "Clerk API key is missing. Please add VITE_CLERK_PUBLISHABLE_KEY to your environment.",
      variant: "destructive",
    });
  }, [toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Configuration Error
        </h1>
        <p className="mb-4">
          The Clerk API key is missing. The application cannot function without
          this key.
        </p>
        <p className="text-sm text-gray-600">
          Please make sure{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded">
            VITE_CLERK_PUBLISHABLE_KEY
          </code>{" "}
          is set in your environment.
        </p>
      </div>
    </div>
  );
};

// Error Boundary Component for catching unhandled errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    // Report to Tempo if in Tempo environment
    if (import.meta.env.VITE_TEMPO === "true") {
      console.error("Error reported to Tempo:", error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Something went wrong
            </h1>
            <p className="mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface AppProps {
  isDemoMode?: boolean;
}

const App = ({ isDemoMode = false }: AppProps) => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {isDemoMode && <ClerkDemoModeNotice />}
          <BrowserRouter>
            <AppRoutes />
            <ClerkDebugger />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
