// Edge function to fix organization metadata issues
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Debug helper functions
const debugLog = (message: string, data?: any) => {
  console.log(`[fix-metadata] 🔍 ${message}`, data !== undefined ? JSON.stringify(data, null, 2) : '');
};

const errorLog = (message: string, error?: any) => {
  console.error(`[fix-metadata] ❌ ${message}`, error !== undefined ? error : '');
  if (error?.stack) {
    console.error(`[fix-metadata] Stack:`, error.stack);
  }
};

serve(async (req) => {
  // Add a unique request ID for tracking
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  debugLog(`Request received [${requestId}]: ${req.method} ${new URL(req.url).pathname}`);
  
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    debugLog(`Handling CORS preflight request [${requestId}]`);
    return new Response("ok", { 
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
      } 
    });
  }

  try {
    // Get the Clerk secret key from environment
    const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!clerkSecretKey) {
      errorLog(`[${requestId}] CLERK_SECRET_KEY environment variable is not set`);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Server configuration error: Missing Clerk API key",
          requestId
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    debugLog(`[${requestId}] Parsing request body`);
    const payload = await req.json();
    const { 
      organizationId,
      schoolId,
      privateMetadata,
      publicMetadata,
      operation = 'fix-private-metadata'
    } = payload;

    // Input validation
    if (!organizationId) {
      errorLog(`[${requestId}] Missing organizationId`);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing required parameter: organizationId",
          requestId
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // First, fetch the current organization to get its metadata
    debugLog(`[${requestId}] Fetching current organization data: ${organizationId}`);
    let originalOrganization;
    try {
      const fetchResponse = await fetch(`https://api.clerk.com/v1/organizations/${organizationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${clerkSecretKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text();
        errorLog(`[${requestId}] Failed to fetch organization: ${fetchResponse.status}`, errorText);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Failed to fetch organization: ${fetchResponse.statusText}`,
            error: errorText,
            requestId
          }),
          {
            status: fetchResponse.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      originalOrganization = await fetchResponse.json();
      debugLog(`[${requestId}] Current organization data:`, {
        id: originalOrganization.id,
        name: originalOrganization.name,
        privateMetadataKeys: Object.keys(originalOrganization.private_metadata || {}),
        publicMetadataKeys: Object.keys(originalOrganization.public_metadata || {})
      });
    } catch (fetchError) {
      errorLog(`[${requestId}] Error fetching organization`, fetchError);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Error fetching organization: ${fetchError.message}`,
          error: fetchError,
          requestId
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Prepare the update operation based on operation type
    let updateData = {};
    
    if (operation === 'fix-private-metadata' && schoolId) {
      // Just update private_metadata.schoolId
      updateData = {
        private_metadata: {
          ...(originalOrganization.private_metadata || {}),
          schoolId: schoolId
        }
      };
      debugLog(`[${requestId}] Preparing to fix private_metadata.schoolId:`, updateData);
    } else if (operation === 'full-update') {
      // Full metadata update
      updateData = {
        ...(privateMetadata ? { private_metadata: privateMetadata } : {}),
        ...(publicMetadata ? { public_metadata: publicMetadata } : {})
      };
      debugLog(`[${requestId}] Preparing full metadata update:`, updateData);
    } else if (operation === 'move-to-private') {
      // Move schoolId from public to private metadata
      const existingSchoolId = originalOrganization.public_metadata?.schoolId || schoolId;
      if (!existingSchoolId) {
        errorLog(`[${requestId}] No schoolId found to move to private metadata`);
        return new Response(
          JSON.stringify({
            success: false,
            message: "No schoolId found to move to private metadata",
            requestId
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      // Create new metadata objects
      const newPrivateMetadata = {
        ...(originalOrganization.private_metadata || {}),
        schoolId: existingSchoolId
      };
      
      // Create public metadata without schoolId
      const newPublicMetadata = { ...(originalOrganization.public_metadata || {}) };
      delete newPublicMetadata.schoolId;
      
      updateData = {
        private_metadata: newPrivateMetadata,
        public_metadata: newPublicMetadata
      };
      
      debugLog(`[${requestId}] Preparing to move schoolId from public to private:`, updateData);
    } else {
      errorLog(`[${requestId}] Invalid operation: ${operation}`);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Invalid operation: ${operation}`,
          requestId
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Update the organization
    debugLog(`[${requestId}] Updating organization metadata`);
    try {
      const updateResponse = await fetch(`https://api.clerk.com/v1/organizations/${organizationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${clerkSecretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        errorLog(`[${requestId}] Failed to update organization: ${updateResponse.status}`, errorText);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Failed to update organization: ${updateResponse.statusText}`,
            error: errorText,
            requestId
          }),
          {
            status: updateResponse.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      const updatedOrganization = await updateResponse.json();
      debugLog(`[${requestId}] Organization updated successfully`);

      // Return success response with updated organization data
      return new Response(
        JSON.stringify({
          success: true,
          message: "Organization metadata updated successfully",
          organization: {
            id: updatedOrganization.id,
            name: updatedOrganization.name,
            privateMetadata: updatedOrganization.private_metadata,
            publicMetadata: updatedOrganization.public_metadata
          },
          requestId
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } catch (updateError) {
      errorLog(`[${requestId}] Error updating organization`, updateError);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Error updating organization: ${updateError.message}`,
          error: updateError,
          requestId
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    errorLog(`[${requestId}] Unhandled error in fix-organization-metadata function`, error);
    return new Response(
      JSON.stringify({
        success: false,
        message: `Unhandled error: ${error.message}`,
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