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
const clerk = Clerk({ secretKey: clerkSecretKey });

serve(async (req) => {
  console.log(`Request received: ${req.method} ${new URL(req.url).pathname}`);
  
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get request payload
    const payload = await req.json();
    const { organizationId, userId, role = "admin", diagnosticRequest = false } = payload;
    console.log(`Payload received: organizationId=${organizationId}, userId=${userId}, role=${role}, diagnosticRequest=${diagnosticRequest}`);

    // If this is a diagnostic request, perform additional checks
    if (diagnosticRequest) {
      console.log("Running in diagnostic mode");
      
      const diagnosticResults = {
        clerkKeyInfo: {
          present: !!clerkSecretKey,
          length: clerkSecretKey ? clerkSecretKey.length : 0,
          prefix: clerkSecretKey ? clerkSecretKey.substring(0, 7) : null,
          valid: clerkSecretKey ? clerkSecretKey.startsWith('sk_test_') || clerkSecretKey.startsWith('sk_live_') : false
        },
        apiTests: {
          listUsers: null,
          listOrganizations: null,
          specificOrganization: null,
          specificUser: null
        },
        errors: []
      };
      
      // Test listing users
      try {
        const users = await clerk.users.getUserList({ limit: 1 });
        diagnosticResults.apiTests.listUsers = {
          success: true,
          count: users.length,
          firstUser: users.length > 0 ? {
            id: users[0].id,
            email: users[0].emailAddresses[0]?.emailAddress || 'no email'
          } : null
        };
      } catch (error) {
        diagnosticResults.apiTests.listUsers = {
          success: false,
          error: error.message
        };
        diagnosticResults.errors.push(`User listing failed: ${error.message}`);
      }
      
      // Test listing organizations
      try {
        const organizations = await clerk.organizations.getOrganizationList({ limit: 1 });
        diagnosticResults.apiTests.listOrganizations = {
          success: true,
          count: organizations.length,
          firstOrg: organizations.length > 0 ? {
            id: organizations[0].id,
            name: organizations[0].name
          } : null
        };
      } catch (error) {
        diagnosticResults.apiTests.listOrganizations = {
          success: false,
          error: error.message
        };
        diagnosticResults.errors.push(`Organization listing failed: ${error.message}`);
      }
      
      // If organization ID provided, try to get that specific organization
      if (organizationId) {
        try {
          const organization = await clerk.organizations.getOrganization({
            organizationId
          });
          diagnosticResults.apiTests.specificOrganization = {
            success: true,
            name: organization.name,
            id: organization.id
          };
        } catch (error) {
          diagnosticResults.apiTests.specificOrganization = {
            success: false,
            error: error.message
          };
          diagnosticResults.errors.push(`Specific organization (${organizationId}) retrieval failed: ${error.message}`);
        }
      }
      
      // If user ID provided, try to get that specific user
      if (userId) {
        try {
          const user = await clerk.users.getUser(userId);
          diagnosticResults.apiTests.specificUser = {
            success: true,
            id: user.id,
            email: user.emailAddresses[0]?.emailAddress || 'no email'
          };
        } catch (error) {
          diagnosticResults.apiTests.specificUser = {
            success: false,
            error: error.message
          };
          diagnosticResults.errors.push(`Specific user (${userId}) retrieval failed: ${error.message}`);
        }
      }
      
      // Additional test: If both user and org exist, try to get memberships
      if (diagnosticResults.apiTests.specificUser?.success && 
          diagnosticResults.apiTests.specificOrganization?.success) {
        try {
          const memberships = await clerk.users.getOrganizationMembershipList({ userId });
          const relevantMembership = memberships.find(m => m.organization.id === organizationId);
          
          diagnosticResults.membershipTest = {
            success: true,
            userMemberships: memberships.length,
            relevantMembership: relevantMembership ? {
              id: relevantMembership.id,
              role: relevantMembership.role
            } : null,
            isAlreadyMember: !!relevantMembership
          };
        } catch (error) {
          diagnosticResults.membershipTest = {
            success: false,
            error: error.message
          };
          diagnosticResults.errors.push(`Membership check failed: ${error.message}`);
        }
      }
      
      return new Response(
        JSON.stringify({
          diagnosticResults,
          recommendations: diagnosticResults.errors.length > 0 ? [
            "Check if CLERK_SECRET_KEY has necessary permissions",
            "Verify the key is from the same Clerk instance where resources exist",
            "After updating the key, redeploy all functions"
          ] : ["No issues detected with Clerk API key permissions"]
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Validate inputs
    if (!organizationId || typeof organizationId !== 'string' || !organizationId.startsWith('org_')) {
      return new Response(
        JSON.stringify({
          error: `Invalid organizationId format: ${organizationId}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (!userId || typeof userId !== 'string' || !userId.startsWith('user_')) {
      return new Response(
        JSON.stringify({
          error: `Invalid userId format: ${userId}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // First verify organization exists
    try {
      console.log(`Verifying organization: ${organizationId}`);
      const organization = await clerk.organizations.getOrganization({
        organizationId
      });
      console.log(`Organization verified: ${organization.name}`);
    } catch (orgError) {
      console.error(`Organization verification failed: ${orgError.message}`);
      console.error(JSON.stringify(orgError, null, 2));
      return new Response(
        JSON.stringify({ 
          error: `Organization not found: ${orgError.message}`,
          details: orgError,
          suggestedAction: "Verify this organization ID exists and is accessible with your API key"
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Verify user exists
    try {
      console.log(`Verifying user: ${userId}`);
      const user = await clerk.users.getUser(userId);
      console.log(`User verified: ${user.emailAddresses[0]?.emailAddress || 'unknown email'}`);
    } catch (userError) {
      console.error(`User verification failed: ${userError.message}`);
      console.error(JSON.stringify(userError, null, 2));
      return new Response(
        JSON.stringify({ 
          error: `User not found: ${userError.message}`,
          details: userError,
          suggestedAction: "Verify this user ID exists and is accessible with your API key" 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Check if user is already a member
    let existingMembership = null;
    try {
      console.log(`Checking existing memberships for user: ${userId}`);
      const memberships = await clerk.users.getOrganizationMembershipList({ userId });
      console.log(`Found ${memberships.length} memberships for user`);
      existingMembership = memberships.find(m => m.organization.id === organizationId);
      
      if (existingMembership) {
        console.log(`User is already a member with role: ${existingMembership.role}`);
        
        // If already an admin, we're done
        if (existingMembership.role === role) {
          return new Response(
            JSON.stringify({
              success: true,
              alreadyMember: true,
              membershipId: existingMembership.id,
              role: existingMembership.role,
              message: `User is already a member with role ${existingMembership.role}`
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
        
        // If not an admin, update role
        try {
          console.log(`Updating membership role from ${existingMembership.role} to ${role}`);
          await clerk.organizations.updateOrganizationMembership(existingMembership.id, {
            role
          });
          console.log(`Successfully updated role to ${role}`);
          
          return new Response(
            JSON.stringify({
              success: true,
              alreadyMember: true,
              wasPromoted: true,
              membershipId: existingMembership.id,
              role: role,
              message: `User role updated to ${role}`
            }),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        } catch (updateError) {
          console.error(`Failed to update role: ${updateError.message}`);
          console.error(JSON.stringify(updateError, null, 2));
          return new Response(
            JSON.stringify({ 
              error: `Failed to update role: ${updateError.message}`,
              details: updateError,
              suggestedAction: "Verify that the API key has permissions to update membership roles"
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
      }
    } catch (membershipError) {
      console.error(`Error checking memberships: ${membershipError.message}`);
      console.error(JSON.stringify(membershipError, null, 2));
      // Continue to create membership even if check fails
    }

    // Add user to organization
    try {
      console.log(`Adding user ${userId} to organization ${organizationId} with role ${role}`);
      
      // Log request payload for createOrganizationMembership
      console.log(`createOrganizationMembership payload: { organizationId: ${organizationId}, userId: ${userId}, role: ${role} }`);
      
      // Using a direct API call first for detailed error inspection
      const response = await fetch(`https://api.clerk.dev/v1/organizations/${organizationId}/memberships`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${clerkSecretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          role: role.toLowerCase()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Direct API call failed with status ${response.status}`);
        console.error(JSON.stringify(errorData, null, 2));
        
        // Check if the error is specifically about the role
        if (errorData.errors && errorData.errors[0]?.meta?.param_name === 'role') {
          console.log("Role parameter is incorrect. Trying with 'org:admin' instead of 'admin'");
          
          // Try with org:admin instead
          const retryResponse = await fetch(`https://api.clerk.dev/v1/organizations/${organizationId}/memberships`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${clerkSecretKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user_id: userId,
              role: "org:admin"
            })
          });
          
          if (retryResponse.ok) {
            const membership = await retryResponse.json();
            console.log(`Successfully created membership with ID: ${membership.id} using 'org:admin' role`);
            
            // Verify membership was actually created
            let verified = false;
            try {
              const verifyMemberships = await clerk.users.getOrganizationMembershipList({ userId });
              verified = verifyMemberships.some(m => m.organization.id === organizationId);
              console.log(`Membership verification: ${verified ? 'successful' : 'failed'}`);
            } catch (verifyError) {
              console.error(`Error verifying membership: ${verifyError.message}`);
            }
            
            return new Response(
              JSON.stringify({
                success: true,
                membershipId: membership.id,
                role: "org:admin",
                verified: verified,
                message: "Successfully added user to organization with role 'org:admin'"
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              }
            );
          } else {
            const retryErrorData = await retryResponse.json();
            console.error(`Retry with 'org:admin' also failed with status ${retryResponse.status}`);
            console.error(JSON.stringify(retryErrorData, null, 2));
            
            // Try one more time with basic_member
            const finalRetryResponse = await fetch(`https://api.clerk.dev/v1/organizations/${organizationId}/memberships`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${clerkSecretKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                user_id: userId,
                role: "basic_member"
              })
            });
            
            if (finalRetryResponse.ok) {
              const membership = await finalRetryResponse.json();
              console.log(`Successfully created membership with ID: ${membership.id} using 'basic_member' role`);
              
              return new Response(
                JSON.stringify({
                  success: true,
                  membershipId: membership.id,
                  role: "basic_member",
                  message: "Successfully added user as basic member (not admin)"
                }),
                {
                  status: 200,
                  headers: { ...corsHeaders, "Content-Type": "application/json" }
                }
              );
            }
            
            throw new Error(`All role variations failed. Last error: ${retryResponse.statusText}`);
          }
        }
        
        if (response.status === 404) {
          return new Response(
            JSON.stringify({ 
              error: `Failed to add user to organization: Not Found`,
              details: errorData,
              suggestedAction: "Verify that both organization and user IDs exist and are accessible with your API key",
              apiErrorDetails: {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries([...response.headers])
              }
            }),
            {
              status: response.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
        
        throw new Error(`API call failed: ${response.statusText}`);
      }
      
      const membership = await response.json();
      console.log(`Successfully created membership with ID: ${membership.id}`);
      
      // Verify membership was actually created
      let verified = false;
      try {
        const verifyMemberships = await clerk.users.getOrganizationMembershipList({ userId });
        verified = verifyMemberships.some(m => m.organization.id === organizationId);
        console.log(`Membership verification: ${verified ? 'successful' : 'failed'}`);
      } catch (verifyError) {
        console.error(`Error verifying membership: ${verifyError.message}`);
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          membershipId: membership.id,
          role: role,
          verified: verified,
          message: "Successfully added user to organization"
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } catch (error) {
      console.error(`Failed to add user to organization: ${error.message}`);
      console.error(JSON.stringify(error, null, 2));
      
      return new Response(
        JSON.stringify({ 
          error: `Failed to add user to organization: ${error.message}`,
          details: error,
          suggestedAction: "Check API key permissions for creating organization memberships"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error(`Unhandled error in manual-add-to-organization: ${error.message}`);
    console.error(error.stack || "No stack trace available");
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});