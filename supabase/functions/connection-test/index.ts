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
  try {
    console.log("=== SUPABASE CONNECTION TEST ===");
    console.log(`SUPABASE_URL available: ${!!supabaseUrl}`);
    console.log(`SUPABASE_SERVICE_KEY available: ${!!supabaseKey}`);
    // Test database connection
    const { data, error } = await supabase.from("subscriptions").select("count").limit(1);
    if (error) {
      console.error("Database connection test failed:", error);
      return new Response(JSON.stringify({
        success: false,
        message: "Failed to connect to Supabase database",
        error: error.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Test storage access
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    return new Response(JSON.stringify({
      success: true,
      message: "Successfully connected to Supabase",
      databaseTest: "Passed",
      storageTest: bucketsError ? "Failed" : "Passed",
      buckets: buckets || [],
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error in connection test:", error);
    return new Response(JSON.stringify({
      success: false,
      message: "Error testing Supabase connection",
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
