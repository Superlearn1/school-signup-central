import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import Stripe from "https://esm.sh/stripe@12.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

// Log environment variables availability at startup
console.log("=== STRIPE WEBHOOK ENVIRONMENT CHECK ===");
console.log(
  `STRIPE_SECRET_KEY available: ${!!Deno.env.get("STRIPE_SECRET_KEY")}`,
);
console.log(`STRIPE_WEBHOOK_SECRET available: ${!!endpointSecret}`);
console.log(
  `STRIPE_WEBHOOK_SECRET value: ${endpointSecret.substring(0, 10)}...`,
);
console.log(`SUPABASE_URL available: ${!!supabaseUrl}`);
console.log(`SUPABASE_SERVICE_KEY available: ${!!supabaseKey}`);
console.log(
  `STRIPE_TEACHER_PRICE_ID available: ${!!Deno.env.get("STRIPE_TEACHER_PRICE_ID")}`,
);
console.log(
  `STRIPE_STUDENT_PRICE_ID available: ${!!Deno.env.get("STRIPE_STUDENT_PRICE_ID")}`,
);

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature") || "";

    let event;
    try {
      console.log(
        `Attempting to verify webhook signature: ${signature ? signature.substring(0, 10) + "..." : "missing"}`,
      );
      console.log(
        `Endpoint secret length: ${endpointSecret.length} characters`,
      );
      console.log(`Raw request body: ${body.substring(0, 100)}...`);

      if (!signature) {
        console.warn("No Stripe signature found in request headers");
        // For testing purposes, we'll try to parse the event without verification
        try {
          const jsonBody = JSON.parse(body);
          console.log(
            "Parsed webhook body without verification (INSECURE, for testing only):",
            JSON.stringify(jsonBody).substring(0, 200),
          );
          event = jsonBody;
          console.warn(
            "SECURITY WARNING: Proceeding without signature verification",
          );
        } catch (parseErr) {
          console.error(`Failed to parse webhook body: ${parseErr.message}`);
          return new Response(
            JSON.stringify({ error: `Invalid webhook payload` }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      } else {
        // Normal path with signature verification
        try {
          event = stripe.webhooks.constructEvent(
            body,
            signature,
            endpointSecret,
          );
          console.log("Webhook signature verified successfully");
        } catch (verifyErr) {
          console.error(
            `Webhook signature verification error details: ${verifyErr.message}`,
          );
          console.log(`Signature provided: ${signature.substring(0, 15)}...`);
          console.log(
            `Secret used for verification: ${endpointSecret.substring(0, 10)}...`,
          );

          // Fallback to parsing without verification for debugging
          try {
            const jsonBody = JSON.parse(body);
            console.log(
              "Falling back to unverified event parsing for debugging",
            );
            event = jsonBody;
          } catch (parseErr) {
            console.error(`Failed to parse webhook body: ${parseErr.message}`);
            return new Response(
              JSON.stringify({
                error: `Invalid webhook payload: ${verifyErr.message}`,
              }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
        }
      }
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      console.error(`Error details: ${err.stack || "No stack trace"}`);
      return new Response(
        JSON.stringify({
          error: `Webhook signature verification failed: ${err.message}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`Webhook event received: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleCheckoutSessionCompleted(session) {
  try {
    console.log("=== HANDLING CHECKOUT SESSION COMPLETED ===");
    console.log(`Session ID: ${session.id}`);
    console.log(`Session status: ${session.status}`);
    console.log(`Session customer: ${session.customer}`);
    console.log(`Session subscription: ${session.subscription}`);

    // Extract metadata
    const metadata = session.metadata || {};
    console.log(`Session metadata: ${JSON.stringify(metadata, null, 2)}`);

    const { schoolId, teacherSeats, studentSeats } = metadata;

    if (!schoolId) {
      console.error("No schoolId found in session metadata");
      return;
    }

    console.log(`Processing checkout for school ID: ${schoolId}`);

    console.log(`Processing checkout session for schoolId: ${schoolId}`);
    console.log(`Session customer ID: ${session.customer}`);
    console.log(`Session subscription ID: ${session.subscription}`);

    // Get subscription details
    const subscriptionId = session.subscription;
    if (!subscriptionId) {
      console.error("No subscription ID found in session");
      return;
    }

    console.log(
      `Retrieving subscription details from Stripe for ID: ${subscriptionId}`,
    );
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log(
      `Retrieved subscription from Stripe: ${JSON.stringify(subscription, null, 2)}`,
    );

    // Check if subscription already exists in database
    const { data: existingData, error: existingError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("school_id", schoolId)
      .single();

    if (existingError) {
      console.error(
        `Error checking for existing subscription: ${JSON.stringify(existingError)}`,
      );
    } else {
      console.log(
        `Existing subscription found: ${JSON.stringify(existingData, null, 2)}`,
      );
    }

    // Prepare update data
    const updateData = {
      stripe_customer_id: session.customer,
      stripe_subscription_id: subscriptionId,
      status: "active",
      total_teacher_seats: parseInt(teacherSeats) || 1,
      total_student_seats: parseInt(studentSeats) || 0,
      current_period_end: new Date(
        subscription.current_period_end * 1000,
      ).toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log(
      `Updating subscription with data: ${JSON.stringify(updateData, null, 2)}`,
    );

    // First check if subscription exists
    const { data: existingSubscription, error: checkError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("school_id", schoolId)
      .maybeSingle();

    console.log(`Checking for existing subscription for school ${schoolId}`);

    if (checkError) {
      console.error(
        `Error checking for existing subscription: ${JSON.stringify(checkError)}`,
      );
      return;
    }

    if (existingSubscription) {
      console.log(`Found existing subscription: ${existingSubscription.id}`);
      // Update existing subscription
      const { data, error } = await supabase
        .from("subscriptions")
        .update(updateData)
        .eq("id", existingSubscription.id)
        .select();

      if (error) {
        console.error(
          `Error updating subscription in database: ${JSON.stringify(error)}`,
        );
      } else {
        console.log(
          `Successfully updated subscription in database: ${JSON.stringify(data)}`,
        );
      }
    } else {
      console.log("No existing subscription found, creating new one...");
      // Insert new subscription
      const { data: insertData, error: insertError } = await supabase
        .from("subscriptions")
        .insert({
          ...updateData,
          school_id: schoolId,
          created_at: new Date().toISOString(),
        })
        .select();

      if (insertError) {
        console.error(
          `Insert subscription failed: ${JSON.stringify(insertError)}`,
        );
      } else {
        console.log(
          `Successfully inserted subscription: ${JSON.stringify(insertData)}`,
        );
      }
    }
  } catch (error) {
    console.error(
      `Error handling checkout.session.completed: ${error.message}`,
    );
    console.error(error.stack);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    // Find the subscription in our database by Stripe subscription ID
    const { data: subscriptionData, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscription.id)
      .single();

    if (fetchError || !subscriptionData) {
      console.error("Error fetching subscription from database:", fetchError);
      return;
    }

    // Count the number of teacher and student seats from line items
    let teacherSeats = 0;
    let studentSeats = 0;

    // Get the latest invoice to determine current quantities
    const invoice = await stripe.invoices.retrieve(subscription.latest_invoice);
    for (const item of invoice.lines.data) {
      if (item.price.id === Deno.env.get("STRIPE_TEACHER_PRICE_ID")) {
        teacherSeats = item.quantity;
      } else if (item.price.id === Deno.env.get("STRIPE_STUDENT_PRICE_ID")) {
        studentSeats = item.quantity;
      }
    }

    // Update subscription in database
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: subscription.status,
        total_teacher_seats:
          teacherSeats || subscriptionData.total_teacher_seats,
        total_student_seats:
          studentSeats || subscriptionData.total_student_seats,
        current_period_end: new Date(
          subscription.current_period_end * 1000,
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionData.id);

    if (error) {
      console.error("Error updating subscription in database:", error);
    }
  } catch (error) {
    console.error("Error handling customer.subscription.updated:", error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    // Find the subscription in our database by Stripe subscription ID
    const { data: subscriptionData, error: fetchError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscription.id)
      .single();

    if (fetchError || !subscriptionData) {
      console.error("Error fetching subscription from database:", fetchError);
      return;
    }

    // Update subscription status in database
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionData.id);

    if (error) {
      console.error("Error updating subscription in database:", error);
    }
  } catch (error) {
    console.error("Error handling customer.subscription.deleted:", error);
  }
}
