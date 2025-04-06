
// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/fetch_data

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface RequestBody {
  organizationId: string;
}

// Define proper CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      });
    }

    // Get authorization header to identify the user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Missing authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Get the Clerk token from the authorization header
    const token = authHeader.replace("Bearer ", "");

    // Get the request body
    const body: RequestBody = await req.json();

    // Validate the request body
    if (!body.organizationId) {
      return new Response(JSON.stringify({ success: false, error: "Missing required field: organizationId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get the Clerk secret key from environment variables
    const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!clerkSecretKey) {
      return new Response(JSON.stringify({ success: false, error: "Server configuration error: CLERK_SECRET_KEY not set" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Get the user's ID from the token
    const userResponse = await fetch("https://api.clerk.dev/v1/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ success: false, error: "Invalid user token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    console.log(`Verifying membership for user ${userId} in organization ${body.organizationId}`);

    // Get the organization's memberships
    const membershipsResponse = await fetch(`https://api.clerk.dev/v1/organizations/${body.organizationId}/memberships`, {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!membershipsResponse.ok) {
      const errorData = await membershipsResponse.json();
      console.error("Failed to get organization memberships:", errorData);
      return new Response(JSON.stringify({ success: false, error: "Failed to verify organization membership" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const memberships = await membershipsResponse.json();
    
    // Check if the user is already a member
    const isUserMember = memberships.some((membership: any) => membership.public_user_data.user_id === userId);
    
    if (isUserMember) {
      console.log(`User ${userId} is already a member of organization ${body.organizationId}`);
      return new Response(JSON.stringify({ success: true, message: "User is already a member of the organization" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`User ${userId} is not a member of organization ${body.organizationId}. Adding now...`);

    // Add the user as an admin to the organization
    const addResponse = await fetch(`https://api.clerk.dev/v1/organizations/${body.organizationId}/memberships`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        role: "admin",
      }),
    });

    if (!addResponse.ok) {
      const errorData = await addResponse.json();
      console.error("Failed to add user to organization:", errorData);
      return new Response(JSON.stringify({ success: false, error: "Failed to add user to organization" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const addData = await addResponse.json();
    console.log(`User ${userId} successfully added to organization ${body.organizationId} as admin`);
    
    return new Response(JSON.stringify({ success: true, message: "User added to organization as admin", data: addData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: `Server error: ${error.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
