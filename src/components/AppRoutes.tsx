import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import Index from "@/pages/Index";
import NotFound from "@/pages/NotFound";
import AdminSignup from "@/pages/AdminSignup";
import SubscriptionSetupPage from "@/pages/SubscriptionSetupPage";
import SubscriptionSuccess from "@/pages/SubscriptionSuccess";
import SubscriptionCancel from "@/pages/SubscriptionCancel";
import Dashboard from "@/pages/Dashboard";
import StudentManagement from "@/pages/StudentManagement";
import RecoveryTool from "@/pages/admin/RecoveryTool";
import StripeDebugger from "@/pages/admin/StripeDebugger";
import StripeWebhookGuide from "@/pages/admin/StripeWebhookGuide";
import SignIn from "@/pages/SignIn";
import { useRoutes } from "react-router-dom";

// Import tempo routes for storyboards
import routes from "tempo-routes";

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

const AppRoutes = () => {
  return (
    <>
      {/* For the tempo routes - only included in development */}
      {import.meta.env.VITE_TEMPO && useRoutes(routes)}

      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/admin-signup" element={<AdminSignup />} />
        <Route path="/sign-up" element={<Navigate to="/admin-signup" />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route
          path="/subscription-setup"
          element={
            <ProtectedRoute>
              <SubscriptionSetupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription/success"
          element={
            <ProtectedRoute>
              <SubscriptionSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription/cancel"
          element={
            <ProtectedRoute>
              <SubscriptionCancel />
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
        <Route
          path="/admin/stripe-debug"
          element={
            <ProtectedRoute>
              <StripeDebugger />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/stripe-webhook-guide"
          element={
            <ProtectedRoute>
              <StripeWebhookGuide />
            </ProtectedRoute>
          }
        />
        {/* Allow Tempo to capture routes before the catchall */}
        {import.meta.env.VITE_TEMPO && <Route path="/tempobook/*" />}
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default AppRoutes;
