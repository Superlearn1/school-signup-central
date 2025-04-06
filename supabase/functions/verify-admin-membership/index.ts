
// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/fetch_data

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface RequestBody {
  organizationId: string;
  userId?: string; // Optional: If provided, will verify this specific user instead of the authenticated user
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
    
    // Get Clerk secret key
    const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!clerkSecretKey || clerkSecretKey.trim() === "") {
      console.error("CLERK_SECRET_KEY not set or empty");
      return new Response(JSON.stringify({ error: "Server configuration error: CLERK_SECRET_KEY not set or empty" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Get request body
    const requestData = await req.json() as RequestBody;
    const { organizationId, userId: specificUserId } = requestData;
    
    if (!organizationId) {
      console.error("Missing organizationId in request body");
      return new Response(JSON.stringify({ error: "Missing organizationId in request body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Verifying admin membership for organization:", organizationId);
    
    // Determine which user ID to use - either from JWT or from request body
    let userId;
    
    if (specificUserId) {
      // Use the user ID provided in the request body
      userId = specificUserId;
      console.log("Using provided user ID for verification:", userId);
    } else if (authHeader && authHeader.startsWith("Bearer ")) {
      // Extract user ID from JWT
      const jwt = authHeader.substring(7);
      
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
      userId = sessionData.client_session?.user_id;
      
      if (!userId) {
        console.error("Could not extract user ID from session data:", sessionData);
        return new Response(JSON.stringify({ 
          error: "Failed to extract user ID from authentication token", 
          details: sessionData 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      
      console.log("User ID from verified token:", userId);
    } else {
      console.error("Missing authorization header or specific userId");
      return new Response(JSON.stringify({ 
        error: "Missing authentication. Provide either authorization header or userId in request body." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // First verify that the organization exists
    console.log(`Verifying organization ${organizationId} exists...`);
    const orgResponse = await fetch(`https://api.clerk.dev/v1/organizations/${organizationId}`, {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!orgResponse.ok) {
      const errorData = await orgResponse.json();
      console.error("Failed to verify organization exists:", errorData);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Organization does not exist or is inaccessible", 
        details: errorData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }
    
    const orgData = await orgResponse.json();
    console.log("Organization exists:", orgData.id, orgData.name);

    // Check if user exists in Clerk
    console.log(`Verifying user ${userId} exists...`);
    const userResponse = await fetch(`https://api.clerk.dev/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      console.error("Failed to verify user exists:", errorData);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "User does not exist or is inaccessible", 
        details: errorData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }
    
    const userData = await userResponse.json();
    console.log("User exists:", userData.id);

    // Check if user is already a member of the organization
    console.log("Checking if user is already a member of the organization...");
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
        success: false, 
        error: "Failed to get organization memberships", 
        details: errorData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const memberships = await membershipResponse.json();
    console.log(`Organization ${organizationId} has ${memberships.data.length} members`);

    // Check if current user is already a member
    const matchingMembers = memberships.data.filter(
      member => member.public_user_data.user_id === userId
    );
    const isUserMember = matchingMembers.length > 0;
    
    console.log("Is user already a member:", isUserMember);

    if (isUserMember) {
      // User is already a member, check if they're an admin
      const userMembership = matchingMembers[0];
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
            status: 500, // Return actual error status
          });
        }

        // Verify promotion was successful
        const updatedMembershipData = await promotionResponse.json();
        if (updatedMembershipData.role !== "admin") {
          console.error("Promotion response does not show admin role:", updatedMembershipData);
          return new Response(JSON.stringify({ 
            success: false, 
            error: "User promotion appeared to succeed but role was not updated", 
            details: updatedMembershipData 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
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
      
      // Implement retry logic for adding members
      let addMembershipSuccess = false;
      let addMembershipError = null;
      let attemptCount = 0;
      const maxAttempts = 3;
      
      while (!addMembershipSuccess && attemptCount < maxAttempts) {
        attemptCount++;
        console.log(`Attempt ${attemptCount} to add user to organization...`);
        
        try {
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

          if (addMembershipResponse.ok) {
            const membershipData = await addMembershipResponse.json();
            console.log("User added to organization:", membershipData);
            addMembershipSuccess = true;
            
            // Verify the role is admin
            if (membershipData.role !== "admin") {
              console.error("User added but not as admin:", membershipData);
              return new Response(JSON.stringify({ 
                success: false, 
                error: "User was added but not as admin", 
                details: membershipData 
              }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
              });
            }
          } else {
            addMembershipError = await addMembershipResponse.json();
            console.error(`Attempt ${attemptCount} failed:`, addMembershipError);
            
            // Wait longer between retries
            const waitTime = attemptCount * 2000; // Progressive backoff
            console.log(`Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } catch (error) {
          console.error(`Attempt ${attemptCount} threw exception:`, error);
          addMembershipError = error;
          
          // Wait between retries
          const waitTime = attemptCount * 2000;
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      if (!addMembershipSuccess) {
        console.error("All attempts to add user failed:", addMembershipError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Failed to add user to organization after multiple attempts", 
          details: addMembershipError 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      // Final verification that user was added as admin
      console.log("Verifying user was added as admin...");
      const verifyResponse = await fetch(`https://api.clerk.dev/v1/organizations/${organizationId}/memberships`, {
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!verifyResponse.ok) {
        console.error("Failed to verify final membership status:", await verifyResponse.json());
        return new Response(JSON.stringify({ 
          success: true, 
          message: "User appears to have been added but verification failed",
          alreadyMember: false,
          isAdmin: true,
          wasAdded: true,
          fullyVerified: false
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      const finalMemberships = await verifyResponse.json();
      const userIsNowAdmin = finalMemberships.data.some(
        member => member.public_user_data.user_id === userId && member.role === "admin"
      );
      
      if (!userIsNowAdmin) {
        console.error("User not found as admin in final verification!");
        return new Response(JSON.stringify({ 
          success: false, 
          error: "User appears to have been added but is not found as admin in verification", 
          membershipCount: finalMemberships.data.length
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: "User added to organization as admin",
        alreadyMember: false,
        isAdmin: true,
        wasAdded: true,
        fullyVerified: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error("Unhandled error:", error.message, error.stack);
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Server error: ${error.message}`,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
