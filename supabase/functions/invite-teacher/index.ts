import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Load Clerk SDK
import { Clerk } from "https://esm.sh/@clerk/backend@0.36.1";

// Debug helper functions
const debugLog = (message: string, data?: any) => {
  console.log(`[invite-teacher] 🔍 ${message}`, data !== undefined ? JSON.stringify(data, null, 2) : '');
};

const errorLog = (message: string, error?: any) => {
  console.error(`[invite-teacher] ❌ ${message}`, error !== undefined ? error : '');
  if (error?.stack) {
    console.error(`[invite-teacher] Stack:`, error.stack);
  }
};

// Initialize Clerk client with secret key from environment
const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
if (!clerkSecretKey) {
  errorLog("CLERK_SECRET_KEY environment variable is not set");
}
const clerk = Clerk({ secretKey: clerkSecretKey });

serve(async (req) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  debugLog(`Request received [${requestId}]: ${req.method} ${new URL(req.url).pathname}`);
  
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    debugLog(`Handling CORS preflight request [${requestId}]`);
    return new Response("ok", { 
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
      } 
    });
  }

  try {
    debugLog(`Parsing request body [${requestId}]`);
    // Get request payload
    const payload = await req.json();
    const { organizationId, emailAddress, schoolId } = payload;
    debugLog(`Received invitation request [${requestId}]`, { 
      organizationId, 
      emailAddress,
      schoolId,
      hasClerkKey: !!clerkSecretKey,
      clerkKeyPrefix: clerkSecretKey ? clerkSecretKey.substring(0, 7) : null
    });

    // Input validation
    if (!organizationId || !emailAddress) {
      errorLog(`Missing required parameters [${requestId}]`, { organizationId, emailAddress });
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required parameters: organizationId and emailAddress are required"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Verify the organization exists
    try {
      debugLog(`Verifying organization exists [${requestId}]: ${organizationId}`);
      const organization = await clerk.organizations.getOrganization({
        organizationId
      });
      debugLog(`Organization verified [${requestId}]: ${organization.name}`, {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        privateMetadataKeys: Object.keys(organization.privateMetadata || {}),
        publicMetadataKeys: Object.keys(organization.publicMetadata || {}),
        createdAt: organization.createdAt
      });
    } catch (orgError) {
      errorLog(`Organization verification failed [${requestId}]`, orgError);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: `Organization not found: ${orgError.message}`,
          error: orgError,
          requestId
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Try to send the invitation - try multiple role variations
    const rolesToTry = ["member", "basic_member", "org:member", "admin", "org:admin", "org:teacher", ""];
    let success = false;
    let invitation = null;
    let errorDetails = [];

    debugLog(`Attempting invitation with ${rolesToTry.length} different roles [${requestId}]`);
    
    for (const role of rolesToTry) {
      try {
        debugLog(`Attempting to create invitation with role [${requestId}]: ${role || "(empty)"}`);
        
        // Log the full request details we'll send to Clerk
        const requestBody = {
          email_address: emailAddress,
          ...(role ? { role } : {})
        };
        
        debugLog(`Sending to Clerk [${requestId}]`, {
          url: `https://api.clerk.com/v1/organizations/${organizationId}/invitations`,
          method: 'POST',
          body: requestBody
        });
        
        const startTime = performance.now();
        const response = await fetch(`https://api.clerk.com/v1/organizations/${organizationId}/invitations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${clerkSecretKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        const endTime = performance.now();
        
        debugLog(`Clerk API response time [${requestId}]: ${Math.round(endTime - startTime)}ms`);
        debugLog(`Response status [${requestId}]: ${response.status} ${response.statusText}`);

        // Process the response
        const responseText = await response.text();
        debugLog(`Raw response for role ${role} [${requestId}]:`, responseText);
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          errorLog(`JSON parse error for role ${role} [${requestId}]:`, parseError);
          responseData = { parseError: true, text: responseText };
        }
        
        if (response.ok) {
          debugLog(`Successfully created invitation with role [${requestId}]: ${role}`);
          invitation = responseData;
          success = true;
          break;
        } else {
          errorLog(`Failed to create invitation with role '${role}' [${requestId}]:`, responseData);
          errorDetails.push({
            role,
            message: responseData?.errors?.[0]?.message || "Unknown error",
            code: responseData?.errors?.[0]?.code,
            status: response.status
          });
        }
      } catch (error) {
        errorLog(`Error trying role '${role}' [${requestId}]:`, error);
        errorDetails.push({ role, error: error.message });
      }
    }

    if (success) {
      debugLog(`Successfully sent invitation [${requestId}]`, invitation);
      return new Response(
        JSON.stringify({
          success: true,
          invitation,
          message: "Invitation sent successfully",
          requestId
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } else {
      errorLog(`All invitation attempts failed [${requestId}]`, { errorDetails });
      return new Response(
        JSON.stringify({
          success: false,
          message: "Failed to send invitation after trying multiple role variations",
          details: errorDetails,
          rolesToTry,
          requestId
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    errorLog(`Unhandled error in invite-teacher function [${requestId}]`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        message: error.message,
        error: error.stack,
        requestId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
}); 