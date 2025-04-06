
// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/fetch_data

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface RequestBody {
  name: string;
  schoolId: string;
}

serve(async (req) => {
  // Handle CORS for local development
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      status: 204,
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        headers: { "Content-Type": "application/json" },
        status: 405,
      });
    }

    // Get the request body
    const body: RequestBody = await req.json();

    // Validate the request body
    if (!body.name || !body.schoolId) {
      return new Response(JSON.stringify({ error: "Missing required fields: name or schoolId" }), {
        headers: { "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get the Clerk secret key from environment variables
    const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!clerkSecretKey) {
      return new Response(JSON.stringify({ error: "Server configuration error: CLERK_SECRET_KEY not set" }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Create a new organization in Clerk
    const response = await fetch("https://api.clerk.dev/v1/organizations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: body.name,
        metadata: {
          schoolId: body.schoolId,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Clerk API error:", errorData);
      return new Response(JSON.stringify({ error: `Clerk API error: ${response.statusText}` }), {
        headers: { "Content-Type": "application/json" },
        status: response.status,
      });
    }

    const data = await response.json();
    
    // Return the organization ID
    return new Response(JSON.stringify({ id: data.id }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: `Server error: ${error.message}` }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
