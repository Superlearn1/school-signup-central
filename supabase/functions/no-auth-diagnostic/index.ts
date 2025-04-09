import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
// This function is specifically designed to be accessible without authentication
// to help diagnose environment variables and configuration issues
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
    console.log("=== NO AUTH DIAGNOSTIC LOG ===");
    console.log(`Request method: ${req.method}`);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    // Check environment variables
    console.log("Environment variables check:");
    // Check Stripe environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const stripeTeacherPriceId = Deno.env.get("STRIPE_TEACHER_PRICE_ID");
    const stripeStudentPriceId = Deno.env.get("STRIPE_STUDENT_PRICE_ID");
    // Check Supabase environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const frontendUrl = Deno.env.get("FRONTEND_URL");
    // Prepare safe response that doesn't leak secrets
    const envVarsStatus = {
      stripe: {
        STRIPE_SECRET_KEY: !!stripeSecretKey,
        STRIPE_SECRET_KEY_LENGTH: stripeSecretKey?.length || 0,
        STRIPE_SECRET_KEY_PREFIX: stripeSecretKey?.substring(0, 3) || "",
        STRIPE_WEBHOOK_SECRET: !!stripeWebhookSecret,
        STRIPE_WEBHOOK_SECRET_LENGTH: stripeWebhookSecret?.length || 0,
        STRIPE_WEBHOOK_SECRET_PREFIX: stripeWebhookSecret?.substring(0, 4) || "",
        STRIPE_TEACHER_PRICE_ID: !!stripeTeacherPriceId,
        STRIPE_TEACHER_PRICE_ID_VALUE: stripeTeacherPriceId || "not set",
        STRIPE_STUDENT_PRICE_ID: !!stripeStudentPriceId,
        STRIPE_STUDENT_PRICE_ID_VALUE: stripeStudentPriceId || "not set"
      },
      supabase: {
        SUPABASE_URL: !!supabaseUrl,
        SUPABASE_URL_VALUE: supabaseUrl || "not set",
        SUPABASE_SERVICE_KEY: !!supabaseServiceKey,
        SUPABASE_SERVICE_KEY_LENGTH: supabaseServiceKey?.length || 0,
        SUPABASE_SERVICE_KEY_PREFIX: supabaseServiceKey?.substring(0, 3) || "",
        SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceRoleKey,
        SUPABASE_SERVICE_ROLE_KEY_LENGTH: supabaseServiceRoleKey?.length || 0,
        SUPABASE_SERVICE_ROLE_KEY_PREFIX: supabaseServiceRoleKey?.substring(0, 3) || ""
      },
      other: {
        FRONTEND_URL: !!frontendUrl,
        FRONTEND_URL_VALUE: frontendUrl || "not set"
      }
    };
    // Log the results server-side for debugging
    console.log("Environment variables status:", JSON.stringify(envVarsStatus, null, 2));
    return new Response(JSON.stringify({
      success: true,
      message: "Diagnostic completed successfully",
      environment: envVarsStatus
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error in no-auth diagnostic webhook:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      diagnostic: "error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
