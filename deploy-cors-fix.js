// Script to deploy CORS fixes for Supabase Edge Functions
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Functions to fix
const functions = ["diagnostic-checkout", "test-webhook", "connection-test"];

// Ensure _shared/cors.ts has the right content
const corsPath = path.join(__dirname, "supabase/functions/_shared/cors.ts");
const corsContent = `// CORS headers for allowing cross-origin requests to our Edge Functions
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
`;

fs.writeFileSync(corsPath, corsContent, "utf8");
console.log("✅ Updated CORS headers file");

// Get Supabase project ID and service key from environment
const SUPABASE_PROJECT_ID = process.env.SUPABASE_PROJECT_ID;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_SERVICE_KEY || !SUPABASE_URL) {
  console.error(
    "❌ Error: SUPABASE_SERVICE_KEY and SUPABASE_URL environment variables must be set",
  );
  process.exit(1);
}

console.log(`🚀 Deploying CORS fixes to Supabase functions`);

// Deploy each function using direct API calls
for (const func of functions) {
  try {
    console.log(`📤 Deploying ${func} with CORS fix...`);

    // Read the function code
    const functionPath = path.join(
      __dirname,
      `supabase/functions/${func}/index.ts`,
    );
    if (!fs.existsSync(functionPath)) {
      console.log(`⚠️ Function file not found: ${functionPath}, skipping...`);
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

    console.log(`✅ Successfully deployed ${func} with CORS fix`);
  } catch (funcError) {
    console.error(`❌ Error deploying ${func}:`, funcError.message);
  }
}

console.log("✨ CORS fix deployment completed");
