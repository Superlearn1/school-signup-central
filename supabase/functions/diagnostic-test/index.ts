import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
// This function is specifically designed to diagnose environment variable issues
// with service keys and provide detailed information to fix the issues
serve(async (req)=>{
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
      status: 200
    });
  }
  try {
    // Log all request details
    console.log("=== DIAGNOSTIC TEST LOG ===");
    console.log(`Request method: ${req.method}`);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    // Check environment variables
    console.log("Environment variables check:");
    // Get all environment variables that our functions use
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const FRONTEND_URL = Deno.env.get("FRONTEND_URL");
    // Try to get headers from the request
    const authHeader = req.headers.get("authorization") || "none";
    const apiKeyHeader = req.headers.get("apikey") || "none";
    // Prepare response with safe details about environment
    const envVarsStatus = {
      supabase: {
        SUPABASE_URL: {
          exists: !!SUPABASE_URL,
          value: SUPABASE_URL?.substring(0, 10) + "..."
        },
        SUPABASE_SERVICE_KEY: {
          exists: !!SUPABASE_SERVICE_KEY,
          length: SUPABASE_SERVICE_KEY?.length || 0,
          prefix: SUPABASE_SERVICE_KEY?.substring(0, 5) || ""
        },
        SUPABASE_SERVICE_ROLE_KEY: {
          exists: !!SUPABASE_SERVICE_ROLE_KEY,
          length: SUPABASE_SERVICE_ROLE_KEY?.length || 0,
          prefix: SUPABASE_SERVICE_ROLE_KEY?.substring(0, 5) || ""
        },
        SUPABASE_ANON_KEY: {
          exists: !!SUPABASE_ANON_KEY,
          length: SUPABASE_ANON_KEY?.length || 0,
          prefix: SUPABASE_ANON_KEY?.substring(0, 5) || ""
        }
      },
      stripe: {
        STRIPE_SECRET_KEY: {
          exists: !!STRIPE_SECRET_KEY,
          length: STRIPE_SECRET_KEY?.length || 0,
          prefix: STRIPE_SECRET_KEY?.substring(0, 5) || ""
        },
        STRIPE_WEBHOOK_SECRET: {
          exists: !!STRIPE_WEBHOOK_SECRET,
          length: STRIPE_WEBHOOK_SECRET?.length || 0
        }
      },
      request: {
        authorization: authHeader.substring(0, 10) + "...",
        apikey: apiKeyHeader.substring(0, 10) + "..."
      },
      other: {
        FRONTEND_URL: {
          exists: !!FRONTEND_URL,
          value: FRONTEND_URL || "not set"
        }
      }
    };
    // Test if we can successfully create a client
    let clientTest = "Not tested";
    try {
      // Import directly within the try block to isolate any import errors
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.38.4");
      if (SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_KEY)) {
        // Try using whichever key is available
        const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_KEY;
        const client = createClient(SUPABASE_URL, key);
        // Try a simple database query
        const { data, error } = await client.from("schools").select("count").limit(1);
        if (error) {
          clientTest = `Error: ${error.message}`;
        } else {
          clientTest = `Success: ${JSON.stringify(data)}`;
        }
      } else {
        clientTest = "Missing required URL or service key";
      }
    } catch (err) {
      clientTest = `Exception: ${err.message}`;
    }
    // Log the results server-side for debugging
    console.log("Environment variables status:", JSON.stringify(envVarsStatus, null, 2));
    console.log("Database client test:", clientTest);
    return new Response(JSON.stringify({
      success: true,
      message: "Diagnostic test completed successfully",
      environment: envVarsStatus,
      clientTest: clientTest
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error in diagnostic test:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
