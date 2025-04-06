
// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/fetch_data

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface RequestBody {
  name: string;
  schoolId: string;
  adminUserId: string;  // Add admin user ID to the request
}

// Define proper CORS headers that include all required headers
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
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      });
    }

    // Get the request body
    const body: RequestBody = await req.json();

    // Validate the request body
    if (!body.name || !body.schoolId || !body.adminUserId) {
      return new Response(JSON.stringify({ error: "Missing required fields: name, schoolId, or adminUserId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get the Clerk secret key from environment variables
    const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!clerkSecretKey) {
      return new Response(JSON.stringify({ error: "Server configuration error: CLERK_SECRET_KEY not set" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log("Creating organization in Clerk with name:", body.name);

    // Create a new organization in Clerk
    const createResponse = await fetch("https://api.clerk.dev/v1/organizations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: body.name,
        public_metadata: {
          schoolId: body.schoolId,
        },
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error("Clerk API error during organization creation:", errorData);
      return new Response(JSON.stringify({ error: `Clerk API error: ${createResponse.statusText}`, details: errorData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: createResponse.status,
      });
    }

    const orgData = await createResponse.json();
    console.log("Successfully created organization in Clerk with ID:", orgData.id);
    
    // Now add the admin user to the organization with admin role
    console.log(`Adding admin user ${body.adminUserId} to organization ${orgData.id}`);
    const membershipResponse = await fetch(`https://api.clerk.dev/v1/organizations/${orgData.id}/memberships`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: body.adminUserId,
        role: "admin",
      }),
    });

    if (!membershipResponse.ok) {
      const membershipError = await membershipResponse.json();
      console.error("Failed to add admin user to organization:", membershipError);
      // Still return the org ID since it was created, even if adding admin failed
      return new Response(JSON.stringify({ 
        id: orgData.id, 
        warning: "Organization created but admin user could not be added automatically" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const membershipData = await membershipResponse.json();
    console.log("Admin user successfully added to organization:", membershipData);
    
    // Return the organization ID with success message
    return new Response(JSON.stringify({ 
      id: orgData.id,
      message: "Organization created and admin user added successfully" 
    }), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ error: `Server error: ${error.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
