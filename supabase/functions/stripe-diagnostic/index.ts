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

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Allow anonymous access for diagnostic functions
  // Skip JWT verification for this endpoint

  try {
    // Get request payload
    const { action, schoolId, sessionId, subscriptionId } = await req.json();
    console.log(
      `Diagnostic request: action=${action}, schoolId=${schoolId}, sessionId=${sessionId}, subscriptionId=${subscriptionId}`,
    );

    let result = {};

    switch (action) {
      case "check-environment":
        result = await checkEnvironment();
        break;
      case "check-stripe-connection":
        result = await checkStripeConnection();
        break;
      case "check-supabase-connection":
        result = await checkSupabaseConnection();
        break;
      case "check-subscription-table":
        result = await checkSubscriptionTable();
        break;
      case "get-school-subscription":
        if (!schoolId) {
          throw new Error("schoolId is required for this action");
        }
        result = await getSchoolSubscription(schoolId);
        break;
      case "get-checkout-session":
        if (!sessionId) {
          throw new Error("sessionId is required for this action");
        }
        result = await getCheckoutSession(sessionId);
        break;
      case "get-stripe-subscription":
        if (!subscriptionId) {
          throw new Error("subscriptionId is required for this action");
        }
        result = await getStripeSubscription(subscriptionId);
        break;
      case "fix-missing-stripe-ids":
        if (!schoolId || !sessionId) {
          throw new Error(
            "schoolId and sessionId are required for this action",
          );
        }
        result = await fixMissingStripeIds(schoolId, sessionId);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in stripe diagnostic:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function checkEnvironment() {
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

  return { environment: results };
}

async function checkStripeConnection() {
  try {
    const testProduct = await stripe.products.list({ limit: 1 });
    return {
      stripeConnection: {
        success: true,
        message: `Successfully connected to Stripe API. Found ${testProduct.data.length} products.`,
      },
    };
  } catch (error) {
    return {
      stripeConnection: {
        success: false,
        message: `Failed to connect to Stripe API: ${error.message}`,
      },
    };
  }
}

async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("count")
      .limit(1);
    if (error) {
      return {
        supabaseConnection: {
          success: false,
          message: `Failed to connect to Supabase: ${error.message}`,
        },
      };
    }
    return {
      supabaseConnection: {
        success: true,
        message: "Successfully connected to Supabase.",
      },
    };
  } catch (error) {
    return {
      supabaseConnection: {
        success: false,
        message: `Failed to connect to Supabase: ${error.message}`,
      },
    };
  }
}

async function checkSubscriptionTable() {
  try {
    // Check if the subscriptions table exists and has the right columns
    const { data: tableInfo, error: tableError } = await supabase.rpc(
      "get_table_info",
      { table_name: "subscriptions" },
    );

    if (tableError) {
      return {
        subscriptionTable: {
          success: false,
          message: `Failed to get table info: ${tableError.message}`,
        },
      };
    }

    // Check for required columns
    const requiredColumns = [
      "id",
      "school_id",
      "stripe_customer_id",
      "stripe_subscription_id",
      "status",
      "total_teacher_seats",
      "total_student_seats",
      "used_teacher_seats",
      "used_student_seats",
      "current_period_end",
      "created_at",
      "updated_at",
    ];

    const missingColumns = [];
    for (const column of requiredColumns) {
      if (!tableInfo.some((col) => col.column_name === column)) {
        missingColumns.push(column);
      }
    }

    if (missingColumns.length > 0) {
      return {
        subscriptionTable: {
          success: false,
          message: `Missing required columns: ${missingColumns.join(", ")}`,
          columns: tableInfo,
        },
      };
    }

    // Get a sample of recent subscriptions
    const { data: recentSubs, error: recentError } = await supabase
      .from("subscriptions")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(3);

    if (recentError) {
      return {
        subscriptionTable: {
          success: false,
          message: `Failed to get recent subscriptions: ${recentError.message}`,
          columns: tableInfo,
        },
      };
    }

    // Check for subscriptions with missing Stripe IDs
    const { data: missingIds, error: missingError } = await supabase
      .from("subscriptions")
      .select("id, school_id, status, updated_at")
      .or("stripe_customer_id.is.null,stripe_subscription_id.is.null")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(5);

    return {
      subscriptionTable: {
        success: true,
        message: "Subscription table exists with all required columns.",
        columns: tableInfo,
        recentSubscriptions: recentSubs,
        missingStripeIds: missingIds || [],
      },
    };
  } catch (error) {
    return {
      subscriptionTable: {
        success: false,
        message: `Error checking subscription table: ${error.message}`,
      },
    };
  }
}

async function getSchoolSubscription(schoolId) {
  try {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("school_id", schoolId)
      .single();

    if (error) {
      return {
        schoolSubscription: {
          success: false,
          message: `Failed to get subscription for school ${schoolId}: ${error.message}`,
        },
      };
    }

    // If there's a Stripe subscription ID, get the details from Stripe
    let stripeSubscription = null;
    if (data.stripe_subscription_id) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(
          data.stripe_subscription_id,
        );
      } catch (stripeError) {
        console.error(
          `Error retrieving Stripe subscription: ${stripeError.message}`,
        );
      }
    }

    return {
      schoolSubscription: {
        success: true,
        subscription: data,
        stripeSubscription,
      },
    };
  } catch (error) {
    return {
      schoolSubscription: {
        success: false,
        message: `Error getting school subscription: ${error.message}`,
      },
    };
  }
}

async function getCheckoutSession(sessionId) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // If there's a subscription ID, get the subscription details
    let subscription = null;
    if (session.subscription) {
      try {
        subscription = await stripe.subscriptions.retrieve(
          session.subscription,
        );
      } catch (subError) {
        console.error(`Error retrieving subscription: ${subError.message}`);
      }
    }

    return {
      checkoutSession: {
        success: true,
        session,
        subscription,
      },
    };
  } catch (error) {
    return {
      checkoutSession: {
        success: false,
        message: `Failed to get checkout session: ${error.message}`,
      },
    };
  }
}

async function getStripeSubscription(subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return {
      stripeSubscription: {
        success: true,
        subscription,
      },
    };
  } catch (error) {
    return {
      stripeSubscription: {
        success: false,
        message: `Failed to get Stripe subscription: ${error.message}`,
      },
    };
  }
}

async function fixMissingStripeIds(schoolId, sessionId) {
  try {
    // Get the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session.subscription || !session.customer) {
      return {
        fixResult: {
          success: false,
          message:
            "Checkout session does not have subscription or customer IDs",
          session,
        },
      };
    }

    // Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription,
    );

    // Update the subscription in the database
    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        status: subscription.status,
        current_period_end: new Date(
          subscription.current_period_end * 1000,
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("school_id", schoolId)
      .select();

    if (error) {
      return {
        fixResult: {
          success: false,
          message: `Failed to update subscription: ${error.message}`,
          session,
          subscription,
        },
      };
    }

    return {
      fixResult: {
        success: true,
        message: "Successfully updated subscription with Stripe IDs",
        updatedSubscription: data[0],
        session,
        subscription,
      },
    };
  } catch (error) {
    return {
      fixResult: {
        success: false,
        message: `Error fixing missing Stripe IDs: ${error.message}`,
      },
    };
  }
}
