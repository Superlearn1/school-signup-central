// Script to deploy Supabase Edge Functions using curl instead of the Supabase CLI
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

// Get Supabase service key from environment
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_SERVICE_KEY || !SUPABASE_URL) {
  console.error(
    "Error: SUPABASE_SERVICE_KEY and SUPABASE_URL environment variables must be set",
  );
  process.exit(1);
}

// Deploy each function using curl
functions.forEach((func) => {
  try {
    console.log(`Deploying ${func}...`);

    // Read the function code
    const functionPath = path.join(
      __dirname,
      `supabase/functions/${func}/index.ts`,
    );
    const functionCode = fs.readFileSync(functionPath, "utf8");

    // Create a temporary file with the function code
    const tempFilePath = path.join(__dirname, `${func}-temp.ts`);
    fs.writeFileSync(tempFilePath, functionCode, "utf8");

    // Deploy using curl
    const curlCommand = `curl -X POST '${SUPABASE_URL}/functions/v1/deploy' \
      -H 'Authorization: Bearer ${SUPABASE_SERVICE_KEY}' \
      -F 'file=@${tempFilePath}' \
      -F 'name=${func}' \
      -F 'verify_jwt=false'`;

    execSync(curlCommand, { stdio: "inherit" });

    // Clean up temp file
    fs.unlinkSync(tempFilePath);

    console.log(`Successfully deployed ${func}`);
  } catch (error) {
    console.error(`Error deploying ${func}:`, error.message);
  }
});

console.log("Deployment completed");
