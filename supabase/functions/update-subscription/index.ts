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
    console.log("=== UPDATE SUBSCRIPTION STARTED ===");
    // Get request payload
    const payload = await req.json();
    console.log(`Full request payload: ${JSON.stringify(payload, null, 2)}`);
    const { teacherSeats, studentSeats, schoolId } = payload;
    console.log(`Request received: teacherSeats=${teacherSeats}, studentSeats=${studentSeats}, schoolId=${schoolId}`);
    // Validate inputs
    if (!schoolId || typeof schoolId !== "string") {
      return new Response(JSON.stringify({
        error: "Invalid or missing schoolId"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (!teacherSeats || typeof teacherSeats !== "number" || teacherSeats < 1) {
      return new Response(JSON.stringify({
        error: "Teacher seats must be at least 1"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (typeof studentSeats !== "number" || studentSeats < 0) {
      return new Response(JSON.stringify({
        error: "Student seats must be at least 0"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Get the subscription from the database
    const { data: subscriptionData, error: fetchError } = await supabase.from("subscriptions").select("*").eq("school_id", schoolId).single();
    if (fetchError || !subscriptionData) {
      console.error("Error fetching subscription from database:", fetchError);
      return new Response(JSON.stringify({
        error: "Subscription not found"
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // If there's a Stripe subscription ID, update it in Stripe
    if (subscriptionData.stripe_subscription_id) {
      try {
        // Get the current subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionData.stripe_subscription_id);
        // Find the items for teacher and student seats
        const items = [];
        for (const item of subscription.items.data){
          if (item.price.id === Deno.env.get("STRIPE_TEACHER_PRICE_ID")) {
            items.push({
              id: item.id,
              quantity: teacherSeats
            });
          } else if (item.price.id === Deno.env.get("STRIPE_STUDENT_PRICE_ID")) {
            items.push({
              id: item.id,
              quantity: studentSeats
            });
          }
        }
        // Update the subscription in Stripe
        await stripe.subscriptions.update(subscriptionData.stripe_subscription_id, {
          items
        });
      } catch (stripeError) {
        console.error("Error updating Stripe subscription:", stripeError);
      // Continue with database update even if Stripe update fails
      }
    }
    // Update the subscription in the database
    const { error: updateError } = await supabase.from("subscriptions").update({
      total_teacher_seats: teacherSeats,
      total_student_seats: studentSeats,
      updated_at: new Date().toISOString()
    }).eq("id", subscriptionData.id);
    if (updateError) {
      console.error("Error updating subscription in database:", updateError);
      return new Response(JSON.stringify({
        error: "Failed to update subscription"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Return success response
    return new Response(JSON.stringify({
      success: true,
      teacherSeats,
      studentSeats
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error updating subscription:", error);
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
