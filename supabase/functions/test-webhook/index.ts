import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);
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
    console.log("=== TEST WEBHOOK FUNCTION STARTED ===");
    // Get request payload
    const payload = await req.json();
    console.log(`Request payload: ${JSON.stringify(payload, null, 2)}`);
    const { schoolId } = payload;
    if (!schoolId) {
      return new Response(JSON.stringify({
        error: "School ID is required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Create a test event that simulates a checkout.session.completed event
    const testEvent = {
      id: `evt_test_${Date.now()}`,
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_test_${Date.now()}`,
          customer: `cus_test_${Date.now()}`,
          subscription: `sub_test_${Date.now()}`,
          status: "complete",
          metadata: {
            schoolId: schoolId,
            teacherSeats: "2",
            studentSeats: "10"
          }
        }
      }
    };
    console.log(`Created test event: ${JSON.stringify(testEvent, null, 2)}`);
    // Call the stripe-webhook function directly
    try {
      const webhookResponse = await fetch(`${supabaseUrl}/functions/v1/stripe-webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`
        },
        body: JSON.stringify(testEvent)
      });
      const webhookResult = await webhookResponse.text();
      console.log(`Webhook response status: ${webhookResponse.status}`);
      console.log(`Webhook response: ${webhookResult}`);
      // Check if the subscription was updated
      const { data: subscription, error } = await supabase.from("subscriptions").select("*").eq("school_id", schoolId).maybeSingle();
      if (error) {
        console.error(`Error fetching subscription: ${error.message}`);
      } else {
        console.log(`Subscription after webhook: ${JSON.stringify(subscription, null, 2)}`);
      }
      return new Response(JSON.stringify({
        success: true,
        message: "Test webhook processed",
        webhookStatus: webhookResponse.status,
        webhookResponse: webhookResult,
        subscription: subscription || null
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } catch (webhookError) {
      console.error(`Error calling webhook: ${webhookError.message}`);
      return new Response(JSON.stringify({
        error: `Failed to call webhook: ${webhookError.message}`,
        testEvent
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  } catch (error) {
    console.error(`Error in test webhook: ${error.message}`);
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
