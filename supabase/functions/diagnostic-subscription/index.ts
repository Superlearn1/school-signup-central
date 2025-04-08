import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    console.log("=== SUBSCRIPTION DIAGNOSTIC LOG ===");

    // Check environment variables
    console.log("Environment variables check:");
    console.log(`SUPABASE_URL set: ${!!supabaseUrl}`);
    console.log(`SUPABASE_SERVICE_KEY set: ${!!supabaseKey}`);

    // Test Supabase connection
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("count")
        .limit(1);
      if (error) {
        console.error("Supabase connection test failed:", error);
      } else {
        console.log("Supabase connection test: Success");
      }

      // Check subscriptions table structure
      const { data: tableInfo, error: tableError } = await supabase.rpc(
        "get_table_info",
        { table_name: "subscriptions" },
      );
      if (tableError) {
        console.error("Failed to get table info:", tableError);
      } else {
        console.log("Subscriptions table columns:", tableInfo);
      }

      // Check recent subscriptions
      const { data: recentSubs, error: recentError } = await supabase
        .from("subscriptions")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(3);

      if (recentError) {
        console.error("Failed to get recent subscriptions:", recentError);
      } else {
        console.log("Recent subscriptions:", recentSubs);
      }
    } catch (dbError) {
      console.error("Database operation failed:", dbError);
    }

    return new Response(JSON.stringify({ diagnostic: "success" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in diagnostic subscription:", error);
    return new Response(
      JSON.stringify({ error: error.message, diagnostic: "error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
