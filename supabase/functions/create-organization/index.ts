
// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/fetch_data

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface RequestBody {
  name: string;
  schoolId: string;
  adminUserId: string;
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
      console.error("Method not allowed:", req.method);
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 405,
      });
    }

    // Get the request body
    const body: RequestBody = await req.json();

    // Validate the request body
    if (!body.name || !body.schoolId || !body.adminUserId) {
      console.error("Missing required fields:", body);
      return new Response(JSON.stringify({ error: "Missing required fields: name, schoolId, or adminUserId" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get the Clerk secret key from environment variables
    const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!clerkSecretKey || clerkSecretKey.trim() === "") {
      console.error("CLERK_SECRET_KEY not set or empty");
      return new Response(JSON.stringify({ error: "Server configuration error: CLERK_SECRET_KEY not set or empty" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log("Creating organization in Clerk with name:", body.name);
    console.log("Admin user ID:", body.adminUserId);

    // 1. Check if user exists in Clerk first
    const userResponse = await fetch(`https://api.clerk.dev/v1/users/${body.adminUserId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      console.error("User verification failed:", errorData);
      return new Response(JSON.stringify({ 
        error: `User verification failed: ${userResponse.statusText}`, 
        details: errorData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: userResponse.status,
      });
    }

    const userData = await userResponse.json();
    console.log("User exists in Clerk:", userData.id);

    // 2. Create a new organization in Clerk
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
      return new Response(JSON.stringify({ 
        error: `Clerk API error: ${createResponse.statusText}`, 
        details: errorData 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: createResponse.status,
      });
    }

    const orgData = await createResponse.json();
    if (!orgData || !orgData.id) {
      console.error("Invalid response from Clerk organization creation:", orgData);
      return new Response(JSON.stringify({ error: "Invalid organization response from Clerk" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500, 
      });
    }

    console.log("Successfully created organization in Clerk with ID:", orgData.id);
    
    // 3. Add the admin user to the organization with admin role
    // Increased delay - wait 3 seconds instead of 1 to ensure Clerk has fully processed the organization creation
    console.log("Waiting for organization to propagate in Clerk system...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log(`Adding admin user ${body.adminUserId} to organization ${orgData.id}`);
    
    // Implement retry logic for adding the admin user
    let membershipResponse = null;
    let membershipSuccess = false;
    let membershipError = null;
    let attemptCount = 0;
    const maxAttempts = 3;
    
    while (!membershipSuccess && attemptCount < maxAttempts) {
      attemptCount++;
      console.log(`Attempt ${attemptCount} to add admin user to organization...`);
      
      try {
        membershipResponse = await fetch(`https://api.clerk.dev/v1/organizations/${orgData.id}/memberships`, {
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
        
        if (membershipResponse.ok) {
          membershipSuccess = true;
          const membershipData = await membershipResponse.json();
          console.log("Admin user successfully added to organization:", membershipData);
        } else {
          membershipError = await membershipResponse.json();
          console.error(`Attempt ${attemptCount} failed:`, membershipError);
          
          // Wait longer between retries
          const waitTime = attemptCount * 2000; // Progressive backoff
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      } catch (error) {
        console.error(`Attempt ${attemptCount} threw exception:`, error);
        membershipError = error;
        
        // Wait longer between retries
        const waitTime = attemptCount * 2000;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    if (!membershipSuccess) {
      console.error("All attempts to add admin user failed:", membershipError);
      
      // Return the organization ID but with error details
      // Use status 200 since org was created, but include detailed error info
      return new Response(JSON.stringify({ 
        id: orgData.id, 
        warning: "Organization created but admin user could not be added automatically. Will retry on next login.",
        adminAdded: false,
        error: membershipError
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, // Return 200 since org was created
      });
    }
    
    // 4. Verify the membership exists
    console.log("Verifying organization membership...");
    const verifyMembershipResponse = await fetch(`https://api.clerk.dev/v1/organizations/${orgData.id}/memberships`, {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
    });
    
    if (!verifyMembershipResponse.ok) {
      console.error("Failed to verify memberships:", await verifyMembershipResponse.json());
      return new Response(JSON.stringify({ 
        id: orgData.id,
        warning: "Organization created and admin user added, but membership verification failed.",
        adminAdded: true,
        membershipVerified: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const memberships = await verifyMembershipResponse.json();
    console.log("Current organization memberships:", memberships);
    
    const adminExists = memberships.data.some(
      member => member.public_user_data.user_id === body.adminUserId && member.role === "admin"
    );
    
    if (!adminExists) {
      console.error("Admin user not found in organization memberships after adding");
      return new Response(JSON.stringify({ 
        id: orgData.id,
        warning: "Organization created but admin user membership was not verified. Will retry on next login.",
        adminAdded: true,
        membershipVerified: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200, 
      });
    }
    
    // Return the organization ID with detailed success information
    return new Response(JSON.stringify({ 
      id: orgData.id,
      message: "Organization created and admin user added successfully",
      adminAdded: true,
      membershipVerified: true,
      membershipStatus: "success",
    }), {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Unhandled error:", error.message, error.stack);
    return new Response(JSON.stringify({ 
      error: `Server error: ${error.message}`,
      stack: error.stack 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
