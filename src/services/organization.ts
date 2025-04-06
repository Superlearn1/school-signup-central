
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
    
    const { data, error } = await supabase.functions.invoke('create-organization', {
      body: { name, schoolId, adminUserId },
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
      
      // Schedule a fix after a short delay
      setTimeout(async () => {
        try {
          console.log('Attempting to fix admin membership after delay...');
          await checkAndFixOrganizationAdmin(data.id, adminUserId);
        } catch (fixError) {
          console.error('Failed to fix admin membership after delay:', fixError);
        }
      }, 5000);
    } else if (data.membershipVerified === false) {
      console.warn('Warning: Admin added but verification failed:', data.warning);
      
      // Still try to fix it just to be sure
      setTimeout(async () => {
        try {
          console.log('Attempting to verify admin membership after delay...');
          await checkAndFixOrganizationAdmin(data.id, adminUserId);
        } catch (fixError) {
          console.error('Failed to verify admin membership after delay:', fixError);
        }
      }, 5000);
    }

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
 * @returns Success status
 */
export const checkAndFixOrganizationAdmin = async (organizationId: string, userId?: string): Promise<boolean> => {
  try {
    console.log(`Attempting to verify admin membership for organization: ${organizationId}${userId ? `, user: ${userId}` : ''}`);
    
    const requestBody: { organizationId: string; userId?: string } = { 
      organizationId
    };
    
    // Include userId in the request if provided
    if (userId) {
      requestBody.userId = userId;
    }
    
    const { data, error } = await supabase.functions.invoke('verify-admin-membership', {
      body: requestBody,
    });

    if (error) {
      console.error('Error checking admin membership:', error);
      
      // If we get a 404, the organization might not exist yet
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        console.error('Organization not found. It may not have propagated yet or was deleted');
      }
      
      return false;
    }

    if (!data || !data.success) {
      console.error('Failed to verify admin membership:', data);
      return false;
    }

    console.log('Admin membership verification result:', data);
    
    // Log what happened during the verification
    if (data.alreadyMember && data.isAdmin) {
      console.log('User is already an admin of this organization');
    } else if (data.wasPromoted) {
      console.log('User was successfully promoted to admin role');
    } else if (data.wasAdded) {
      console.log('User was successfully added as admin to the organization');
    }

    return data.success;
  } catch (error) {
    console.error('Failed to verify admin membership:', error);
    return false;
  }
};

/**
 * Attempts to verify and fix organization admin membership with multiple retries
 * @param organizationId The organization ID to check
 * @param userId Optional specific user ID (defaults to current authenticated user)
 * @param maxAttempts Maximum number of retry attempts
 * @returns Success status
 */
export const verifyOrganizationAdminWithRetry = async (
  organizationId: string, 
  userId?: string,
  maxAttempts = 3
): Promise<boolean> => {
  let attempts = 0;
  let success = false;
  
  while (!success && attempts < maxAttempts) {
    attempts++;
    console.log(`Attempt ${attempts}/${maxAttempts} to verify organization admin membership`);
    
    success = await checkAndFixOrganizationAdmin(organizationId, userId);
    
    if (success) {
      console.log(`Successfully verified admin membership on attempt ${attempts}`);
      return true;
    }
    
    if (attempts < maxAttempts) {
      // Exponential backoff delay
      const delayMs = Math.pow(2, attempts) * 1000;
      console.log(`Verification failed, waiting ${delayMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.error(`Failed to verify admin membership after ${attempts} attempts`);
  return false;
};
