import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
      status: 200,
    });
  }

  // Allow anonymous access for diagnostic functions
  // Skip JWT verification for this endpoint

  try {
    // Check environment variables
    const envVars = [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_TEACHER_PRICE_ID",
      "STRIPE_STUDENT_PRICE_ID",
      "FRONTEND_URL",
      "SUPABASE_URL",
      "SUPABASE_SERVICE_KEY",
    ];

    const results = {};

    for (const varName of envVars) {
      const value = Deno.env.get(varName) || "";
      results[varName] = {
        set: !!value,
        // For security, only show prefix of sensitive values
        preview: value
          ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
          : "",
        length: value.length,
      };
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error checking environment variables:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
