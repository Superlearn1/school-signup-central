import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
// Load Clerk SDK
import { Clerk } from "https://esm.sh/@clerk/backend@0.36.1";
// Debug helper functions
const debugLog = (message, data)=>{
  console.log(`[fix-organization-metadata] 🔍 ${message}`, data !== undefined ? JSON.stringify(data, null, 2) : '');
};
const errorLog = (message, error)=>{
  console.error(`[fix-organization-metadata] ❌ ${message}`, error !== undefined ? error : '');
  if (error?.stack) {
    console.error(`[fix-organization-metadata] Stack:`, error.stack);
  }
};
// Initialize Clerk client with secret key from environment
const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
if (!clerkSecretKey) {
  errorLog("CLERK_SECRET_KEY environment variable is not set");
}
const clerk = Clerk({
  secretKey: clerkSecretKey
});
serve(async (req)=>{
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
    const payload = await req.json();
    const { organizationId, schoolId, operation = 'fix' } = payload;
    debugLog(`Received metadata fix request [${requestId}]`, {
      organizationId,
      schoolId,
      operation,
      hasClerkKey: !!clerkSecretKey
    });
    // Input validation
    if (!organizationId || !schoolId) {
      errorLog(`Missing required parameters [${requestId}]`, {
        organizationId,
        schoolId
      });
      return new Response(JSON.stringify({
        success: false,
        message: "Missing required parameters: organizationId and schoolId are required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Verify the organization exists
    let organization;
    try {
      debugLog(`Verifying organization exists [${requestId}]: ${organizationId}`);
      organization = await clerk.organizations.getOrganization({
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
      return new Response(JSON.stringify({
        success: false,
        message: `Organization not found: ${orgError.message}`,
        error: orgError,
        requestId
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Get the current metadata
    const existingPrivateMetadata = organization.privateMetadata || {};
    const existingPublicMetadata = organization.publicMetadata || {};
    // Check if the schoolId is already set correctly
    const hasPrivateSchoolId = existingPrivateMetadata.schoolId === schoolId;
    const hasPublicSchoolId = existingPublicMetadata.schoolId === schoolId;
    debugLog(`Current metadata status [${requestId}]`, {
      hasPrivateSchoolId,
      hasPublicSchoolId,
      privateMetadata: existingPrivateMetadata,
      publicMetadata: existingPublicMetadata
    });
    // If the schoolId is already in the correct place, no need to update
    if (hasPrivateSchoolId) {
      debugLog(`SchoolId already correct in privateMetadata [${requestId}]`);
      // If it's also in publicMetadata, we can optionally clean it up, depending on the operation
      if (hasPublicSchoolId && operation === 'cleanup') {
        try {
          // Make a copy without the schoolId
          const cleanedPublicMetadata = {
            ...existingPublicMetadata
          };
          delete cleanedPublicMetadata.schoolId;
          debugLog(`Cleaning up redundant schoolId from publicMetadata [${requestId}]`);
          await clerk.organizations.updateOrganization({
            organizationId,
            publicMetadata: cleanedPublicMetadata
          });
          return new Response(JSON.stringify({
            success: true,
            message: "SchoolId was already in privateMetadata and has been removed from publicMetadata",
            requestId
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        } catch (updateError) {
          errorLog(`Failed to clean up publicMetadata [${requestId}]`, updateError);
          // Return success anyway since the main goal is achieved
          return new Response(JSON.stringify({
            success: true,
            message: "SchoolId was already in privateMetadata but cleanup of publicMetadata failed",
            error: updateError,
            requestId
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json"
            }
          });
        }
      }
      return new Response(JSON.stringify({
        success: true,
        message: "SchoolId is already correctly set in privateMetadata",
        requestId
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    // Update the metadata to include the schoolId in privateMetadata
    try {
      debugLog(`Updating organization metadata [${requestId}]`);
      // Create updated metadata that preserves existing values
      const updatedPrivateMetadata = {
        ...existingPrivateMetadata,
        schoolId
      };
      // Update the organization
      await clerk.organizations.updateOrganization({
        organizationId,
        privateMetadata: updatedPrivateMetadata
      });
      debugLog(`Successfully updated privateMetadata [${requestId}]`);
      // If the schoolId is in publicMetadata and we want to clean it up
      if (hasPublicSchoolId && operation === 'cleanup') {
        try {
          // Make a copy without the schoolId
          const cleanedPublicMetadata = {
            ...existingPublicMetadata
          };
          delete cleanedPublicMetadata.schoolId;
          debugLog(`Cleaning up redundant schoolId from publicMetadata [${requestId}]`);
          await clerk.organizations.updateOrganization({
            organizationId,
            publicMetadata: cleanedPublicMetadata
          });
          debugLog(`Successfully cleaned up publicMetadata [${requestId}]`);
        } catch (cleanupError) {
          errorLog(`Failed to clean up publicMetadata [${requestId}]`, cleanupError);
        // Continue anyway as the main goal is achieved
        }
      }
      return new Response(JSON.stringify({
        success: true,
        message: "SchoolId has been successfully added to privateMetadata",
        requestId
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } catch (updateError) {
      errorLog(`Failed to update organization metadata [${requestId}]`, updateError);
      // If we failed to update privateMetadata but schoolId exists in publicMetadata,
      // we can let the client know it will still work in legacy mode
      if (hasPublicSchoolId) {
        return new Response(JSON.stringify({
          success: false,
          message: "Failed to update privateMetadata but schoolId exists in publicMetadata (legacy mode)",
          error: updateError,
          legacyFallback: true,
          requestId
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
      return new Response(JSON.stringify({
        success: false,
        message: `Failed to update organization metadata: ${updateError.message}`,
        error: updateError,
        requestId
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  } catch (error) {
    errorLog(`Unhandled error in fix-organization-metadata function [${requestId}]`, error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message,
      error: error.stack,
      requestId
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
