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

// Helper to validate userId format (basic check)
const isValidUserId = (userId: string): boolean => {
  return typeof userId === 'string' && userId.startsWith('user_');
};

serve(async (req) => {
  // Enhanced logging
  console.log(`Request received: ${req.method} ${new URL(req.url).pathname}`);
  
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get request payload and log it (without sensitive data)
    const payload = await req.json();
    const { name, schoolId, adminUserId: initialAdminUserId, debug, checkEnv, createTestUser } = payload;
    console.log(`Payload received: name=${name}, schoolId=${schoolId}, adminUserId type=${typeof initialAdminUserId}, starts with: ${initialAdminUserId?.substring(0, 5) || 'undefined'}`);

    // Use a mutable variable for adminUserId
    let adminUserId = initialAdminUserId;

    // Special diagnostic mode to check environment variables
    if (debug === true || checkEnv === true) {
      console.log("Running in diagnostic mode");
      const secretKeyInfo = clerkSecretKey ? {
        length: clerkSecretKey.length,
        prefix: clerkSecretKey.substring(0, 7),
        valid: clerkSecretKey.startsWith('sk_test_') || clerkSecretKey.startsWith('sk_live_')
      } : null;
      
      return new Response(
        JSON.stringify({
          clerkKeyPresent: !!clerkSecretKey,
          clerkKeyInfo: secretKeyInfo,
          env: {
            SUPABASE_ENV: Deno.env.get("SUPABASE_ENV"),
            SUPABASE_URL: Deno.env.get("SUPABASE_URL"),
            SUPABASE_ANON_KEY: !!Deno.env.get("SUPABASE_ANON_KEY"),
            SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Support creating a test user if requested
    let testUserId = null;
    if (createTestUser === true) {
      try {
        console.log("Creating a test user for organization membership testing");
        const testUser = await clerk.users.createUser({
          firstName: "Test",
          lastName: `User ${Date.now()}`,
          emailAddress: [`test-${Date.now()}@example.com`],
          password: `SecureP@ssw0rd-${Date.now()}`
        });
        testUserId = testUser.id;
        console.log(`Created test user with ID: ${testUserId}`);
        
        // Update adminUserId to use the test user
        if (!adminUserId) {
          console.log(`Using test user ${testUserId} as adminUserId`);
          adminUserId = testUserId;
        }
      } catch (userError) {
        console.error(`Failed to create test user: ${userError.message}`);
      }
    }

    // Enhanced validation
    if (!name || !schoolId) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: name and schoolId are required"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (!adminUserId || !isValidUserId(adminUserId)) {
      return new Response(
        JSON.stringify({
          error: `Invalid adminUserId format: ${adminUserId}. Must start with 'user_'`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Verify user exists before creating organization
    try {
      console.log(`Verifying user exists: ${adminUserId}`);
      const user = await clerk.users.getUser(adminUserId);
      console.log(`User exists with email: ${user.emailAddresses[0]?.emailAddress || 'not found'}`);
    } catch (userError) {
      console.error(`Failed to verify user exists: ${userError.message}`);
      return new Response(
        JSON.stringify({ 
          error: `User verification failed: ${userError.message}`,
          details: userError 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Create the organization in Clerk
    let organization;
    let adminAdded = false;
    let warning = null;

    try {
      // Create organization in Clerk
      console.log(`Creating organization: "${name}" for school: ${schoolId}`);
      organization = await clerk.organizations.createOrganization({
        name: name,
        // Add more metadata if needed
        privateMetadata: {
          schoolId: schoolId,
          createdAt: new Date().toISOString()
        }
      });
      
      console.log(`Created Clerk organization: ${organization.id} for school: ${schoolId}`);
      
      // Add the admin user to the organization
      try {
        console.log(`Attempting to add user ${adminUserId} as admin to organization ${organization.id}`);
        const membership = await clerk.organizations.createOrganizationMembership({
          organizationId: organization.id,
          userId: adminUserId,
          role: "org:admin"
        });
        
        adminAdded = true;
        console.log(`Successfully added user ${adminUserId} as admin to organization ${organization.id}. Membership ID: ${membership.id}`);
        
        // Verify membership actually worked
        try {
          const memberships = await clerk.users.getOrganizationMembershipList({ userId: adminUserId });
          const foundMembership = memberships.find(m => m.organization.id === organization.id);
          
          if (foundMembership) {
            console.log(`Verified: User ${adminUserId} is a member of organization ${organization.id} with role ${foundMembership.role}`);
          } else {
            console.error(`Verification failed: User ${adminUserId} is not a member of organization ${organization.id} despite successful membership creation`);
            warning = "Membership verification failed - user not found in organization membership list";
            adminAdded = false;
          }
        } catch (verifyError) {
          console.error(`Failed to verify membership: ${verifyError.message}`);
          warning = `Membership verification failed: ${verifyError.message}`;
        }
        
      } catch (membershipError) {
        adminAdded = false;
        console.error(`Failed to add user as admin: ${membershipError.message}`);
        warning = `Admin user created but membership failed: ${membershipError.message}`;
        
        // Try with different error handling approach
        try {
          console.log("Attempting alternative membership creation approach...");
          await clerk.organizations.createOrganizationMembership({
            organizationId: organization.id,
            userId: adminUserId,
            role: "org:admin"
          });
          adminAdded = true;
          console.log("Alternative membership creation approach succeeded");
        } catch (retryError) {
          console.error(`Alternative approach also failed: ${retryError.message}`);
        }
      }
    } catch (error) {
      console.error(`Failed to create Clerk organization: ${error.message}`);
      // Format the error for better debugging
      const formattedError = {
        message: error.message,
        type: error.name || typeof error,
        stack: error.stack,
        details: error.details || null
      };
      
      return new Response(
        JSON.stringify({ 
          error: `Failed to create Clerk organization: ${error.message}`,
          details: formattedError
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Return response with clear indication of partial success if applicable
    const responseStatus = adminAdded ? 200 : 207; // Use 207 Multi-Status for partial success
    
    return new Response(
      JSON.stringify({
        id: organization.id,
        name: name,
        adminAdded: adminAdded,
        membershipVerified: adminAdded && !warning,
        warning: warning,
        success: true,
        testUserId: testUserId
      }),
      {
        status: responseStatus,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error(`Unhandled error in create-organization function: ${error.message}`);
    console.error(error.stack || "No stack trace available");
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        type: error.name || typeof error
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
