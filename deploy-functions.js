// Script to deploy Supabase Edge Functions with proper CORS handling
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Functions to deploy
const functions = [
  "check-env-vars",
  "diagnostic-checkout",
  "diagnostic-webhook",
  "stripe-diagnostic",
  "test-webhook",
  "verify-checkout-session",
  "update-subscription",
  "stripe-webhook",
];

// Ensure _shared/cors.ts has the right content
const corsPath = path.join(__dirname, "supabase/functions/_shared/cors.ts");
const corsContent = `// CORS headers for allowing cross-origin requests to our Edge Functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
`;

fs.writeFileSync(corsPath, corsContent, "utf8");
console.log("Updated CORS headers file");

// Deploy each function
functions.forEach((func) => {
  try {
    console.log(`Deploying ${func}...`);
    execSync(
      `npx supabase functions deploy ${func} --project-ref bssiyrqombhhnvhwgkhz --no-verify-jwt`,
      {
        stdio: "inherit",
      },
    );
    console.log(`Successfully deployed ${func}`);
  } catch (error) {
    console.error(`Error deploying ${func}:`, error.message);
  }
});

console.log("Deployment completed");
