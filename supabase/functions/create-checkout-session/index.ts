import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import Stripe from "https://esm.sh/stripe@12.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const TEACHER_PRICE_ID =
  Deno.env.get("STRIPE_TEACHER_PRICE_ID") || "price_teacher";
const STUDENT_PRICE_ID =
  Deno.env.get("STRIPE_STUDENT_PRICE_ID") || "price_student";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("=== CREATE CHECKOUT SESSION STARTED ===");

    // Get request payload
    const payload = await req.json();
    console.log(`Full request payload: ${JSON.stringify(payload, null, 2)}`);

    const { teacherSeats, studentSeats, schoolId } = payload;
    console.log(
      `Request received: teacherSeats=${teacherSeats}, studentSeats=${studentSeats}, schoolId=${schoolId}`,
    );

    // Validate inputs
    if (!schoolId || typeof schoolId !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid or missing schoolId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!teacherSeats || typeof teacherSeats !== "number" || teacherSeats < 1) {
      return new Response(
        JSON.stringify({ error: "Teacher seats must be at least 1" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (typeof studentSeats !== "number" || studentSeats < 0) {
      return new Response(
        JSON.stringify({ error: "Student seats must be at least 0" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create line items for Stripe checkout
    const lineItems = [];

    // Add teacher seats
    if (teacherSeats > 0) {
      lineItems.push({
        price: TEACHER_PRICE_ID,
        quantity: teacherSeats,
      });
    }

    // Add student seats
    if (studentSeats > 0) {
      lineItems.push({
        price: STUDENT_PRICE_ID,
        quantity: studentSeats,
      });
    }

    // Create Stripe checkout session
    console.log(
      `Creating checkout session with line items: ${JSON.stringify(lineItems, null, 2)}`,
    );

    // First, initialize the subscription in our database
    try {
      const { data: existingSubscription, error: checkError } = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/rest/v1/subscriptions?school_id=eq.${schoolId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_KEY") || ""}`,
          },
        },
      ).then((res) => res.json());

      if (!existingSubscription || existingSubscription.length === 0) {
        console.log(
          `No existing subscription found for school ${schoolId}, creating initial record...`,
        );

        const initSubscription = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/rest/v1/subscriptions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: Deno.env.get("SUPABASE_ANON_KEY") || "",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_KEY") || ""}`,
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              school_id: schoolId,
              status: "pending",
              total_teacher_seats: teacherSeats,
              total_student_seats: studentSeats,
              used_teacher_seats: 0,
              used_student_seats: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }),
          },
        );

        console.log(
          `Initialized subscription record: ${await initSubscription.text()}`,
        );
      } else {
        console.log(`Found existing subscription for school ${schoolId}`);
      }
    } catch (dbError) {
      console.error(
        `Error initializing subscription record: ${dbError.message}`,
      );
      // Continue with checkout creation even if this fails
    }

    const sessionParams = {
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "subscription",
      success_url: `${Deno.env.get("FRONTEND_URL") || "http://localhost:8080"}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get("FRONTEND_URL") || "http://localhost:8080"}/subscription/cancel`,
      metadata: {
        schoolId: schoolId,
        teacherSeats: teacherSeats.toString(),
        studentSeats: studentSeats.toString(),
      },
      // Ensure we collect customer details
      customer_email: Deno.env.get("TEST_CUSTOMER_EMAIL") || undefined,
      client_reference_id: schoolId,
    };

    console.log(
      `Session parameters: ${JSON.stringify(sessionParams, null, 2)}`,
    );

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(
      `Created checkout session: ${session.id} for schoolId: ${schoolId}`,
    );
    console.log(`Full session response: ${JSON.stringify(session, null, 2)}`);

    // Return checkout URL
    return new Response(JSON.stringify({ checkoutUrl: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
