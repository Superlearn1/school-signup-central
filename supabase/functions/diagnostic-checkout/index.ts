import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import Stripe from "https://esm.sh/stripe@12.0.0";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient()
});
serve(async (req)=>{
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
      status: 200
    });
  }
  // Allow anonymous access for diagnostic functions
  // Skip JWT verification for this endpoint
  try {
    console.log("=== CHECKOUT DIAGNOSTIC LOG ===");
    console.log(`Request method: ${req.method}`);
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));
    // Get request payload
    const payload = await req.json();
    console.log("Request payload:", payload);
    // Check environment variables
    console.log("Environment variables check:");
    console.log(`STRIPE_SECRET_KEY set: ${!!Deno.env.get("STRIPE_SECRET_KEY")}`);
    console.log(`STRIPE_TEACHER_PRICE_ID set: ${!!Deno.env.get("STRIPE_TEACHER_PRICE_ID")}`);
    console.log(`STRIPE_STUDENT_PRICE_ID set: ${!!Deno.env.get("STRIPE_STUDENT_PRICE_ID")}`);
    console.log(`FRONTEND_URL set: ${!!Deno.env.get("FRONTEND_URL")}`);
    // Test Stripe connection
    try {
      const testProduct = await stripe.products.list({
        limit: 1
      });
      console.log(`Stripe connection test: Success. Found ${testProduct.data.length} products`);
    } catch (stripeError) {
      console.error("Stripe connection test failed:", stripeError);
    }
    return new Response(JSON.stringify({
      diagnostic: "success"
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error in diagnostic checkout:", error);
    return new Response(JSON.stringify({
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
