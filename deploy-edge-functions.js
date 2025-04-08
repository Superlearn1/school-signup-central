// Improved script to deploy Supabase Edge Functions
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  "create-checkout-session",
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
console.log("✅ Updated CORS headers file");

// Get Supabase project ID from environment
const SUPABASE_PROJECT_ID =
  process.env.SUPABASE_PROJECT_ID || "bssiyrqombhhnvhwgkhz";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error(
    "❌ Error: SUPABASE_SERVICE_KEY environment variable must be set",
  );
  process.exit(1);
}

console.log(`🚀 Deploying functions to project: ${SUPABASE_PROJECT_ID}`);

// Try to deploy using Supabase CLI first
let cliSuccess = false;
try {
  console.log("📦 Attempting deployment using Supabase CLI...");

  // Check if Supabase CLI is installed
  try {
    execSync("npx supabase --version", { stdio: "pipe" });
    console.log("✅ Supabase CLI is available");
  } catch (e) {
    console.log("⚠️ Supabase CLI not found, installing...");
    execSync("npm install -g supabase", { stdio: "inherit" });
  }

  // Deploy each function using CLI
  for (const func of functions) {
    console.log(`📤 Deploying ${func}...`);
    execSync(
      `npx supabase functions deploy ${func} --project-ref ${SUPABASE_PROJECT_ID} --no-verify-jwt`,
      { stdio: "inherit" },
    );
    console.log(`✅ Successfully deployed ${func} using CLI`);
  }

  cliSuccess = true;
  console.log("🎉 All functions successfully deployed using Supabase CLI!");
} catch (error) {
  console.error(`⚠️ CLI deployment failed: ${error.message}`);
  console.log("🔄 Falling back to direct API deployment...");
}

// If CLI deployment failed, try direct API approach
if (!cliSuccess) {
  try {
    console.log("📦 Attempting deployment using direct API calls...");

    // Get Supabase URL
    const SUPABASE_URL =
      process.env.SUPABASE_URL || `https://${SUPABASE_PROJECT_ID}.supabase.co`;
    console.log(`🔗 Using Supabase URL: ${SUPABASE_URL}`);

    // Deploy each function using direct API calls
    for (const func of functions) {
      try {
        console.log(`📤 Deploying ${func}...`);

        // Read the function code
        const functionPath = path.join(
          __dirname,
          `supabase/functions/${func}/index.ts`,
        );
        if (!fs.existsSync(functionPath)) {
          console.log(
            `⚠️ Function file not found: ${functionPath}, skipping...`,
          );
          continue;
        }

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

        console.log(`✅ Successfully deployed ${func} using API`);
      } catch (funcError) {
        console.error(`❌ Error deploying ${func}:`, funcError.message);
      }
    }

    console.log("🎉 Deployment via API completed");
  } catch (apiError) {
    console.error(`❌ API deployment failed: ${apiError.message}`);
    process.exit(1);
  }
}

console.log("✨ Deployment process completed");
