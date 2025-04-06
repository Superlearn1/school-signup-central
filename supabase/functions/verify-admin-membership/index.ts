
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface RequestBody {
  organizationId: string;
}

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
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      });
    }

    const body: RequestBody = await req.json();
    const { organizationId } = body;

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "Missing required organizationId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!clerkSecretKey) {
      return new Response(JSON.stringify({ error: "Server configuration error: CLERK_SECRET_KEY not set" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Get JWT from request (if available)
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Extract JWT token
    const token = authHeader.split(" ")[1];

    // Get user ID from Clerk
    const userResponse = await fetch("https://api.clerk.dev/v1/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ error: "Failed to get user information" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    // Get organization memberships to check if user is already a member
    const membershipsResponse = await fetch(`https://api.clerk.dev/v1/organizations/${organizationId}/memberships`, {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
      },
    });

    const memberships = await membershipsResponse.json();
    
    // Check if user is already a member
    const isUserMember = memberships.data?.some(membership => membership.public_user_data.user_id === userId);
    
    if (isUserMember) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "User is already a member of the organization" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If not, add the user as admin
    const addResponse = await fetch(`https://api.clerk.dev/v1/organizations/${organizationId}/memberships`, {
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
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to add user to organization",
        details: errorData
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Still return 200 to not break the flow
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "User successfully added to organization" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ 
      success: false,
      error: `Server error: ${error.message}` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200, // Still return 200 to not break the flow
    });
  }
});
