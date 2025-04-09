import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
// Prioritize the role key as it's the one that's definitely available
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);
serve(async (req)=>{
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    console.log("=== CHECK SUBSCRIPTION FUNCTION ===");
    console.log(`SUPABASE_URL available: ${!!supabaseUrl}`);
    console.log(`SUPABASE_SERVICE_ROLE_KEY available: ${!!supabaseKey}`);
    console.log(`Service key length: ${supabaseKey.length}`);
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return new Response(JSON.stringify({
        error: "Invalid JSON in request body"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const { schoolId } = body;
    if (!schoolId) {
      console.log("Missing required parameter: schoolId");
      return new Response(JSON.stringify({
        error: "schoolId is required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log(`Checking subscription for school ID: ${schoolId}`);
    // Get the subscription for the school
    const { data: subscription, error } = await supabase.from("subscriptions").select("*").eq("school_id", schoolId).single();
    if (error) {
      console.error("Error fetching subscription:", error);
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (!subscription) {
      console.log(`No subscription found for school ID: ${schoolId}`);
      return new Response(JSON.stringify({
        exists: false,
        message: "No subscription found"
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log(`Found subscription: ${JSON.stringify(subscription, null, 2)}`);
    // Check which fields might be missing
    const requiredFields = [
      "stripe_customer_id",
      "stripe_subscription_id",
      "status",
      "total_teacher_seats",
      "used_teacher_seats",
      "total_student_seats",
      "used_student_seats"
    ];
    const missingFields = requiredFields.filter((field)=>!subscription[field]);
    return new Response(JSON.stringify({
      exists: true,
      subscription,
      isComplete: missingFields.length === 0,
      missingFields: missingFields.length > 0 ? missingFields : undefined
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
