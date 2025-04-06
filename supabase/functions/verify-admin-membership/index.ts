
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
    // Ensure we have a POST request
    if (req.method !== "POST") {
      console.error("Method not allowed:", req.method);
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      });
    }

    // Extract the JWT token from the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(JSON.stringify({ error: "Missing or invalid authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const jwt = authHeader.substring(7);

    // Get request body
    const { organizationId } = await req.json() as RequestBody;
    if (!organizationId) {
      console.error("Missing organizationId in request body");
      return new Response(JSON.stringify({ error: "Missing organizationId in request body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Verifying admin membership for organization:", organizationId);

    // Get Clerk secret key
    const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!clerkSecretKey) {
      console.error("CLERK_SECRET_KEY not set");
      return new Response(JSON.stringify({ error: "Server configuration error: CLERK_SECRET_KEY not set" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Verify the JWT token and get user info from Clerk
    const tokenVerificationResponse = await fetch("https://api.clerk.dev/v1/sessions/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: jwt,
      }),
    });

    if (!tokenVerificationResponse.ok) {
      const errorData = await tokenVerificationResponse.json();
      console.error("Token verification failed:", errorData);
      return new Response(JSON.stringify({ error: "Invalid authentication token", details: errorData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const sessionData = await tokenVerificationResponse.json();
    const userId = sessionData.client_session.user_id;
    console.log("User ID from verified token:", userId);

    // Check if user is already a member of the organization
    const membershipResponse = await fetch(`https://api.clerk.dev/v1/organizations/${organizationId}/memberships`, {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!membershipResponse.ok) {
      const errorData = await membershipResponse.json();
      console.error("Failed to get organization memberships:", errorData);
      return new Response(JSON.stringify({ 
        error: "Failed to get organization memberships", 
        details: errorData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: membershipResponse.status,
      });
    }

    const memberships = await membershipResponse.json();
    console.log("Organization memberships:", memberships);

    // Check if current user is already a member
    const isUserMember = memberships.data.some(member => member.public_user_data.user_id === userId);
    console.log("Is user already a member:", isUserMember);

    if (isUserMember) {
      // User is already a member, check if they're an admin
      const userMembership = memberships.data.find(member => member.public_user_data.user_id === userId);
      const isAdmin = userMembership.role === "admin";
      console.log("Is user an admin:", isAdmin);

      if (isAdmin) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: "User is already an admin of this organization",
          alreadyMember: true,
          isAdmin: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        // User is a member but not an admin, promote them
        console.log("Promoting user to admin role");
        const promotionResponse = await fetch(`https://api.clerk.dev/v1/organizations/${organizationId}/memberships/${userMembership.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "admin",
          }),
        });

        if (!promotionResponse.ok) {
          const errorData = await promotionResponse.json();
          console.error("Failed to promote user to admin:", errorData);
          return new Response(JSON.stringify({ 
            success: false, 
            error: "Failed to promote user to admin", 
            details: errorData 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200, // Return 200 even if promotion fails
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: "User promoted to admin role",
          alreadyMember: true,
          isAdmin: true,
          wasPromoted: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    } else {
      // User is not a member, add them with admin role
      console.log(`Adding user ${userId} to organization ${organizationId} as admin`);
      const addMembershipResponse = await fetch(`https://api.clerk.dev/v1/organizations/${organizationId}/memberships`, {
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

      if (!addMembershipResponse.ok) {
        const errorData = await addMembershipResponse.json();
        console.error("Failed to add user to organization:", errorData);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Failed to add user to organization", 
          details: errorData 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200, // Return 200 even if adding fails
        });
      }

      const membershipData = await addMembershipResponse.json();
      console.log("User added to organization:", membershipData);

      return new Response(JSON.stringify({ 
        success: true, 
        message: "User added to organization as admin",
        alreadyMember: false,
        isAdmin: true,
        wasAdded: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error("Unhandled error:", error.message, error.stack);
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Server error: ${error.message}` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
