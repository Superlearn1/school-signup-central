
import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";

console.log("Environment Variables:", import.meta.env);

// We'll use a default demo key when no real key is provided
// This allows the app to load in development environments
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_demo_mode_fallback";
console.log("Clerk Publishable Key:", PUBLISHABLE_KEY);

// Flag to indicate if we're in demo mode (no real key)
const isDemoMode = !import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <App isDemoMode={isDemoMode} />
    </ClerkProvider>
  </React.StrictMode>
);
