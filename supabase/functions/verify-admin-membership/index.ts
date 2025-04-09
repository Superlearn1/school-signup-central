import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
// Load Clerk SDK
import { Clerk } from "https://esm.sh/@clerk/backend@0.36.1";
// Log the environment
console.log(`CLERK_SECRET_KEY present: ${!!Deno.env.get("CLERK_SECRET_KEY")}`);
console.log(`Running in environment: ${Deno.env.get("SUPABASE_ENV") || "unknown"}`);
// Initialize Clerk client with secret key from environment
const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
if (!clerkSecretKey) {
  console.error("CLERK_SECRET_KEY environment variable is not set");
}
const clerk = Clerk({
  secretKey: clerkSecretKey
});
// Helper to validate ID formats
const isValidId = (id, prefix)=>{
  return typeof id === "string" && id.startsWith(prefix);
};
serve(async (req)=>{
  // Enhanced logging
  console.log(`Request received: ${req.method} ${new URL(req.url).pathname}`);
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    // Get request payload and log it
    const payload = await req.json();
    const { organizationId, userId } = payload;
    console.log(`Payload received: organizationId=${organizationId}, userId=${userId || "not provided"}`);
    // Enhanced validation
    if (!organizationId || !isValidId(organizationId, "org_")) {
      return new Response(JSON.stringify({
        error: `Invalid or missing organizationId: ${organizationId}. Must start with 'org_'`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    if (!userId || !isValidId(userId, "user_")) {
      return new Response(JSON.stringify({
        error: `Invalid or missing userId: ${userId}. Must start with 'user_'`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // First, verify the organization exists
    try {
      console.log(`Verifying organization exists: ${organizationId}`);
      const organization = await clerk.organizations.getOrganization({
        organizationId: organizationId
      });
      console.log(`Organization verified: ${organization.name}`);
    } catch (orgError) {
      console.error(`Organization verification failed: ${orgError.message}`);
      return new Response(JSON.stringify({
        error: `Organization verification failed: ${orgError.message}`,
        details: orgError
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Next, verify the user exists
    try {
      console.log(`Verifying user exists: ${userId}`);
      const user = await clerk.users.getUser(userId);
      console.log(`User verified: ${user.emailAddresses[0]?.emailAddress || "email not found"}`);
    } catch (userError) {
      console.error(`User verification failed: ${userError.message}`);
      return new Response(JSON.stringify({
        error: `User verification failed: ${userError.message}`,
        details: userError
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Check if the user is already a member of the organization
    let isAlreadyMember = false;
    let isAdmin = false;
    let wasPromoted = false;
    let wasAdded = false;
    let errors = [];
    try {
      console.log(`Fetching memberships for user: ${userId}`);
      // Get memberships for the user
      const memberships = await clerk.users.getOrganizationMembershipList({
        userId
      });
      console.log(`Found ${memberships.length} organization memberships for user`);
      // Check if user is already a member of this organization
      const existingMembership = memberships.find((m)=>m.organization.id === organizationId);
      if (existingMembership) {
        isAlreadyMember = true;
        isAdmin = existingMembership.role === "admin";
        console.log(`User is already a member with role: ${existingMembership.role}`);
        // If member exists but is not admin, promote them
        if (!isAdmin) {
          try {
            console.log(`Promoting user from ${existingMembership.role} to admin role`);
            // First, log detailed information about the membership for debugging
            console.log(`Membership details before promotion: ID=${existingMembership.id}, Role=${existingMembership.role}`);
            console.log(`Organization ID: ${organizationId}, User ID: ${userId}`);
            // Use direct API call for more control and better error handling
            const response = await fetch(`https://api.clerk.dev/v1/organization_memberships/${existingMembership.id}`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${clerkSecretKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                role: "org:admin"
              })
            });
            if (response.ok) {
              const updatedMembership = await response.json();
              wasPromoted = true;
              isAdmin = true;
              console.log(`Successfully promoted user to admin role. New role: ${updatedMembership.role}`);
            } else {
              const errorData = await response.json();
              console.error(`Direct API call for promotion failed with status ${response.status}`);
              console.error(JSON.stringify(errorData, null, 2));
              errors.push(`Promotion failed: ${response.statusText}`);
              // Fall back to SDK method if direct API call fails
              console.log(`Falling back to SDK method for promotion`);
              await clerk.organizations.updateOrganizationMembership(existingMembership.id, {
                role: "org:admin"
              });
              wasPromoted = true;
              isAdmin = true;
              console.log(`Successfully promoted user to admin role using SDK fallback`);
            }
          } catch (promoteError) {
            console.error(`Failed to promote user: ${promoteError.message}`);
            console.error(promoteError.stack || "No stack trace available");
            errors.push(`Promotion failed: ${promoteError.message}`);
          }
        }
      } else {
        console.log(`User is not a member of this organization, will add as admin`);
        // User is not a member, add them as admin
        try {
          const newMembership = await clerk.organizations.createOrganizationMembership({
            organizationId,
            userId,
            role: "org:admin"
          });
          wasAdded = true;
          isAdmin = true;
          console.log(`Successfully added user as admin. Membership ID: ${newMembership.id}`);
          // Verify membership was actually created
          const updatedMemberships = await clerk.users.getOrganizationMembershipList({
            userId
          });
          const verifyMembership = updatedMemberships.find((m)=>m.organization.id === organizationId);
          if (!verifyMembership) {
            console.error(`Membership verification failed: membership not found after creation`);
            wasAdded = false;
            isAdmin = false;
            errors.push("Membership creation appeared to succeed but verification failed");
          }
        } catch (addError) {
          console.error(`Failed to add user as member: ${addError.message}`);
          errors.push(`Adding user failed: ${addError.message}`);
          // Try alternative approach
          try {
            console.log("Attempting alternative membership creation approach...");
            // Try direct API call or different parameters
            await clerk.organizations.createOrganizationMembership({
              organizationId,
              userId,
              role: "org:admin"
            });
            wasAdded = true;
            isAdmin = true;
            console.log("Alternative membership creation approach succeeded");
          } catch (retryError) {
            console.error(`Alternative approach also failed: ${retryError.message}`);
            errors.push(`Alternative approach failed: ${retryError.message}`);
          }
        }
      }
      console.log(`Final membership status: isAlreadyMember=${isAlreadyMember}, isAdmin=${isAdmin}, wasPromoted=${wasPromoted}, wasAdded=${wasAdded}`);
    } catch (error) {
      console.error(`Failed to verify/fix membership: ${error.message}`);
      return new Response(JSON.stringify({
        error: `Failed to verify/fix membership: ${error.message}`,
        details: {
          message: error.message,
          type: error.name || typeof error,
          stack: error.stack
        }
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Return appropriate status code based on outcome
    const responseStatus = isAdmin && (isAlreadyMember || wasAdded || wasPromoted) ? 200 : 207;
    // Return successful response
    return new Response(JSON.stringify({
      success: isAdmin,
      alreadyMember: isAlreadyMember,
      isAdmin: isAdmin,
      wasPromoted: wasPromoted,
      wasAdded: wasAdded,
      errors: errors.length > 0 ? errors : null
    }), {
      status: responseStatus,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error(`Unhandled error in verify-admin-membership function: ${error.message}`);
    console.error(error.stack || "No stack trace available");
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack,
      type: error.name || typeof error
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
