
import { supabase } from '@/integrations/supabase/client';

/**
 * Creates a Clerk organization via Supabase Edge Function
 * @param name The name of the organization
 * @param schoolId The ID of the school to associate with the organization
 * @param adminUserId The Clerk ID of the admin user
 * @returns The created organization's ID
 */
export const createClerkOrganization = async (name: string, schoolId: string, adminUserId: string): Promise<string> => {
  try {
    console.log(`Attempting to create Clerk organization "${name}" for school ID: ${schoolId} with admin: ${adminUserId}`);
    
    // Add request ID for tracking the request through logs
    const requestId = `req_${Math.random().toString(36).substring(2, 10)}`;
    
    // Ensure we set the schoolId in both private and public metadata for maximum compatibility
    const { data, error } = await supabase.functions.invoke('create-organization', {
      body: { 
        name, 
        schoolId, 
        adminUserId, 
        requestId,
        // Explicitly request setting schoolId in both locations
        setInBothMetadataLocations: true,
        // Increase delay between org creation and member addition to 5000ms (5 seconds)
        memberAdditionDelay: 5000
      },
    });

    if (error) {
      console.error('Error creating Clerk organization:', error);
      throw new Error(error.message || 'Failed to create organization');
    }

    if (!data || !data.id) {
      console.error('Invalid response from create-organization function:', data);
      throw new Error('No organization ID returned from the server');
    }

    // Check if the admin was added successfully
    if (data.adminAdded === false) {
      console.warn('Warning: Organization created but admin was not added:', data.warning);
      
      // Immediately try to fix the admin membership
      try {
        console.log('Immediately attempting to fix admin membership...');
        await verifyOrganizationAdminWithRetry(data.id, adminUserId, 5);
      } catch (fixError) {
        console.error('Failed immediate fix for admin membership:', fixError);
      }
      
      // Also schedule a delayed retry with exponential backoff
      // This helps overcome potential propagation delays in Clerk's systems
      const scheduleRetries = async () => {
        const retryTimes = [3000, 7000, 15000, 30000]; // Increased delays
        
        for (let i = 0; i < retryTimes.length; i++) {
          await new Promise(resolve => setTimeout(resolve, retryTimes[i]));
          try {
            console.log(`Retry ${i+1}/${retryTimes.length} to fix admin membership after ${retryTimes[i]}ms delay...`);
            const success = await checkAndFixOrganizationAdmin(data.id, adminUserId);
            if (success) {
              console.log(`Successfully fixed admin membership on retry ${i+1}`);
              break;
            }
          } catch (retryError) {
            console.error(`Failed to fix admin membership on retry ${i+1}:`, retryError);
          }
        }
      };
      
      // Start retry sequence in the background without blocking
      scheduleRetries();

    } else if (data.membershipVerified === false) {
      console.warn('Warning: Admin added but verification failed:', data.warning);
      
      // Schedule a verification check
      setTimeout(async () => {
        try {
          console.log('Attempting to verify admin membership after delay...');
          await checkAndFixOrganizationAdmin(data.id, adminUserId);
        } catch (fixError) {
          console.error('Failed to verify admin membership after delay:', fixError);
        }
      }, 5000); // Increased from 3000ms to 5000ms
    }

    // Log the user's membership status for debugging
    setTimeout(async () => {
      try {
        const { data: membershipData } = await supabase.functions.invoke('verify-admin-membership', {
          body: { organizationId: data.id, userId: adminUserId },
        });
        console.log('Membership status check:', membershipData);
      } catch (checkError) {
        console.error('Failed to check membership status:', checkError);
      }
    }, 10000); // Increased from 8000ms to 10000ms

    console.log('Successfully created Clerk organization with ID:', data.id);
    return data.id;
  } catch (error: any) {
    console.error('Error in createClerkOrganization:', error);
    throw new Error(error.message || 'Failed to create organization');
  }
};

/**
 * Verifies and fixes admin membership in a Clerk organization
 * @param organizationId The ID of the Clerk organization
 * @param userId Optional specific user ID to check/fix (defaults to current user from JWT)
 * @param requestId Optional request ID for tracking through logs
 * @returns Success status
 */
export const checkAndFixOrganizationAdmin = async (
  organizationId: string, 
  userId?: string,
  requestId: string = `reqfix_${Math.random().toString(36).substring(2, 15)}`
): Promise<boolean> => {
  console.log(`[${requestId}] Checking admin membership for org: ${organizationId}, user: ${userId || 'current user'}`);
  
  try {
    // First check if user is already a member via the verify endpoint
    const requestBody: { organizationId: string; userId?: string; requestId?: string } = { 
      organizationId,
      requestId
    };
    
    // Include userId in the request if provided
    if (userId) {
      requestBody.userId = userId;
    }
    
    // Try using direct fetch first for more control
    const verifyResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-admin-membership`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    const verifyData = await verifyResponse.json();
    
    if (verifyResponse.ok && verifyData.success) {
      console.log(`[${requestId}] Verification successful, user is an admin`);
      return true;
    }
    
    // If verify failed, use the manual add function as a final attempt
    if ((!verifyResponse.ok || verifyData.error) && verifyData.error !== "User is already a member" && userId) {
      console.warn(`[${requestId}] Verification failed, attempting manual add. Error: ${verifyData.error}`);
      return await manuallyAddUserToOrganization(organizationId, userId, 'admin', requestId);
    }
    
    // If no userId was provided or other error occurred, fall back to the original implementation
    console.log(`[${requestId}] Falling back to original implementation via supabase client`);
    const { data, error } = await supabase.functions.invoke('verify-admin-membership', {
      body: requestBody,
    });

    if (error) {
      console.error(`[${requestId}] Error checking admin membership:`, error);
      
      // If we get a 404, the organization might not exist yet
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.error(`[${requestId}] Organization not found. It may not have propagated yet or was deleted`);
      }
      
      // On any error, attempt manual add as last resort if userId is provided
      if (userId) {
        try {
          console.warn(`[${requestId}] Error during verification, attempting manual add as last resort`);
          return await manuallyAddUserToOrganization(organizationId, userId, 'admin', requestId);
        } catch (manualError) {
          console.error(`[${requestId}] Manual add failed as well:`, manualError);
        }
      }
      
      return false;
    }

    console.log(`[${requestId}] Admin membership verification result:`, data);
    return !!data?.success;
  } catch (error) {
    console.error(`[${requestId}] Error in checkAndFixOrganizationAdmin:`, error);
    
    // On any error, attempt manual add as last resort if userId is provided
    if (userId) {
      try {
        console.warn(`[${requestId}] Error during verification, attempting manual add as last resort`);
        return await manuallyAddUserToOrganization(organizationId, userId, 'admin', requestId);
      } catch (manualError) {
        console.error(`[${requestId}] Manual add failed as well:`, manualError);
      }
    }
    
    return false;
  }
};

/**
 * Attempts to verify and fix organization admin membership with multiple retries
 * @param organizationId The organization ID to check
 * @param userId Optional specific user ID (defaults to current authenticated user)
 * @param maxAttempts Maximum number of retry attempts
 * @param initialBackoff Initial backoff delay in milliseconds
 * @returns Success status
 */
export const verifyOrganizationAdminWithRetry = async (
  organizationId: string, 
  userId?: string,
  maxAttempts = 3,
  initialBackoff = 2000 // Increased from 1000ms to 2000ms
): Promise<boolean> => {
  let attempts = 0;
  let success = false;
  let backoffDelay = initialBackoff;
  
  while (!success && attempts < maxAttempts) {
    attempts++;
    console.log(`Attempt ${attempts}/${maxAttempts} to verify organization admin membership`);
    
    success = await checkAndFixOrganizationAdmin(organizationId, userId);
    
    if (success) {
      console.log(`Successfully verified admin membership on attempt ${attempts}`);
      return true;
    }
    
    if (attempts < maxAttempts) {
      // Exponential backoff delay with jitter
      backoffDelay = backoffDelay * 2 * (0.9 + Math.random() * 0.2);
      console.log(`Verification failed, waiting ${Math.round(backoffDelay)}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  console.error(`Failed to verify admin membership after ${attempts} attempts`);
  return false;
};

/**
 * Manually adds a user to an organization with the specified role
 * This can be used as a last resort if the normal flow fails
 */
export const manuallyAddUserToOrganization = async (
  organizationId: string, 
  userId: string, 
  role: string = 'admin',
  requestId: string = `reqmanual_${Math.random().toString(36).substring(2, 15)}`
): Promise<boolean> => {
  try {
    console.log(`[${requestId}] Manually adding user ${userId} to organization ${organizationId} with role ${role}`);
    
    // Try using our new dedicated endpoint for this purpose
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manual-add-to-organization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        organizationId,
        userId,
        role,
        requestId
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[${requestId}] Manual add failed:`, errorData);
      
      // Fall back to the original implementation
      console.log(`[${requestId}] Falling back to original implementation via supabase client`);
      const { data, error } = await supabase.functions.invoke('manual-add-to-organization', {
        body: { organizationId, userId, role },
      });
      
      if (error) {
        console.error(`[${requestId}] Fallback also failed:`, error);
        return false;
      }
      
      return !!data?.success;
    }

    const data = await response.json();
    console.log(`[${requestId}] Manual add result:`, data);
    
    return data.success === true;
  } catch (error) {
    console.error(`[${requestId}] Error in manuallyAddUserToOrganization:`, error);
    return false;
  }
};

export interface CreateOrganizationResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  success: boolean;
  warnings?: {
    adminNotAdded?: boolean;
  };
}

export const createOrganization = async (name: string, slug: string, adminUserId: string): Promise<CreateOrganizationResponse> => {
  // Generate a request ID for tracking through logs
  const requestId = `req_${Math.random().toString(36).substring(2, 15)}`;
  console.log(`[${requestId}] Creating organization: ${name}, slug: ${slug}, adminUserId: ${adminUserId}`);
  
  try {
    // Call the Edge Function to create organization
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-organization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        name,
        slug,
        adminUserId,
        requestId,
        // Increase delay between org creation and member addition to 5000ms (5 seconds)
        memberAdditionDelay: 5000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[${requestId}] Organization creation failed:`, errorData);
      throw new Error(`Failed to create organization: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    console.log(`[${requestId}] Organization created:`, data);

    // Check if admin was not added to org
    if (data.warnings?.adminNotAdded) {
      console.warn(`[${requestId}] Admin not added to organization initially, will attempt to fix`);
      
      // Immediately try to fix the admin membership
      try {
        await checkAndFixOrganizationAdmin(data.organization.id, adminUserId, requestId);
      } catch (fixError) {
        console.error(`[${requestId}] Initial attempt to fix admin membership failed:`, fixError);
        // Continue despite error - we'll retry later
      }
      
      // Schedule retries with exponential backoff
      const retryDelays = [3000, 7000, 15000, 30000]; // Increased delays
      retryDelays.forEach((delay, index) => {
        setTimeout(async () => {
          try {
            console.log(`[${requestId}] Retry #${index + 1} to verify admin membership after ${delay}ms`);
            await checkAndFixOrganizationAdmin(data.organization.id, adminUserId, `${requestId}_retry${index + 1}`);
          } catch (retryError) {
            console.error(`[${requestId}] Retry #${index + 1} failed:`, retryError);
          }
        }, delay);
      });
      
      // Additional verification after all retries
      setTimeout(async () => {
        try {
          console.log(`[${requestId}] Final verification of admin membership after all retries`);
          // Fix: Use supabase function to check membership instead of Clerk hooks
          const { data: membershipData, error: membershipError } = await supabase.functions.invoke('verify-admin-membership', {
            body: { organizationId: data.organization.id, userId: adminUserId, requestId: `${requestId}_final` },
          });
          
          if (membershipError) {
            console.error(`[${requestId}] Final membership check failed:`, membershipError);
          } else {
            console.log(`[${requestId}] Admin membership status after retries:`, 
              membershipData?.success 
                ? `Member with correct permissions` 
                : `Not a member or incorrect permissions: ${JSON.stringify(membershipData)}`);
          }
        } catch (error) {
          console.error(`[${requestId}] Final verification failed:`, error);
        }
      }, 45000); // Check after 45 seconds
    }

    return data;
  } catch (error) {
    console.error(`[${requestId}] Error in createOrganization:`, error);
    throw error;
  }
};
