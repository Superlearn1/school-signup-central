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
    // Log all request details
    console.log("=== WEBHOOK DIAGNOSTIC LOG ===");
    console.log(`Request method: ${req.method}`);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));

    // Get request body
    const body = await req.text();
    console.log(`Request body length: ${body.length} characters`);
    console.log(`Request body preview: ${body.substring(0, 200)}...`);

    // Check for Stripe signature
    const signature = req.headers.get("stripe-signature");
    console.log(`Stripe signature present: ${!!signature}`);

    // Check environment variables
    console.log("Environment variables check:");
    console.log(
      `STRIPE_SECRET_KEY set: ${!!Deno.env.get("STRIPE_SECRET_KEY")}`,
    );
    console.log(
      `STRIPE_WEBHOOK_SECRET set: ${!!Deno.env.get("STRIPE_WEBHOOK_SECRET")}`,
    );
    console.log(`SUPABASE_URL set: ${!!Deno.env.get("SUPABASE_URL")}`);
    console.log(
      `SUPABASE_SERVICE_KEY set: ${!!Deno.env.get("SUPABASE_SERVICE_KEY")}`,
    );

    return new Response(
      JSON.stringify({ received: true, diagnostic: "success" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in diagnostic webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message, diagnostic: "error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
