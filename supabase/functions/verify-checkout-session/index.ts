import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import Stripe from "https://esm.sh/stripe@12.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient()
});
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);
serve(async (req)=>{
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    console.log("=== VERIFY CHECKOUT SESSION STARTED ===");
    // Get request payload
    const payload = await req.json();
    console.log(`Full request payload: ${JSON.stringify(payload, null, 2)}`);
    const { sessionId } = payload;
    console.log(`Verifying checkout session: ${sessionId}`);
    if (!sessionId) {
      return new Response(JSON.stringify({
        error: "Session ID is required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Retrieve the checkout session from Stripe
    console.log(`Retrieving session from Stripe with ID: ${sessionId}`);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    console.log(`Retrieved session from Stripe: ${JSON.stringify(session, null, 2)}`);
    console.log(`Session status: ${session.status}`);
    console.log(`Session customer: ${session.customer}`);
    console.log(`Session subscription: ${session.subscription}`);
    // If the session doesn't have a subscription ID, it might not be completed yet
    if (!session.subscription) {
      return new Response(JSON.stringify({
        success: false,
        error: "Checkout session does not have a subscription"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Extract metadata
    const { schoolId } = session.metadata || {};
    if (!schoolId) {
      return new Response(JSON.stringify({
        success: false,
        error: "No school ID in metadata"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Check if the subscription exists in our database
    const { data: subscriptionData, error: fetchError } = await supabase.from("subscriptions").select("*").eq("school_id", schoolId).single();
    if (fetchError) {
      console.error("Error fetching subscription from database:", fetchError);
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to fetch subscription"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // If the subscription doesn't have Stripe IDs, update it
    if (!subscriptionData.stripe_customer_id || !subscriptionData.stripe_subscription_id) {
      console.log(`Subscription missing Stripe IDs. Updating for school: ${schoolId}`);
      // Get subscription details from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
      // Update the subscription in our database
      const { error: updateError } = await supabase.from("subscriptions").update({
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        status: "active",
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", subscriptionData.id);
      if (updateError) {
        console.error("Error updating subscription in database:", updateError);
        return new Response(JSON.stringify({
          success: false,
          error: "Failed to update subscription"
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      console.log(`Successfully updated subscription for school: ${schoolId}`);
    } else {
      console.log(`Subscription already has Stripe IDs for school: ${schoolId}`);
    }
    // Return success response with subscription data
    return new Response(JSON.stringify({
      success: true,
      subscription: {
        id: subscriptionData.id,
        status: subscriptionData.status,
        teacherSeats: subscriptionData.total_teacher_seats,
        studentSeats: subscriptionData.total_student_seats
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error verifying checkout session:", error);
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
