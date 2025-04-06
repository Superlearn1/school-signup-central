
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

    if (data.warning) {
      console.warn('Warning while creating organization:', data.warning);
    }

    console.log('Successfully created Clerk organization with ID:', data.id);
    return data.id;
  } catch (error: any) {
    console.error('Error in createClerkOrganization:', error);
    throw new Error(error.message || 'Failed to create organization');
  }
};

/**
 * Updates the TeacherInviteModal to check and fix admin membership
 * @param organizationId The ID of the Clerk organization
 * @returns Success status
 */
export const checkAndFixOrganizationAdmin = async (organizationId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('verify-admin-membership', {
      body: { organizationId },
    });

    if (error) {
      console.error('Error checking admin membership:', error);
      return false;
    }

    return data?.success || false;
  } catch (error) {
    console.error('Failed to verify admin membership:', error);
    return false;
  }
};
