
import { supabase } from '@/integrations/supabase/client';

/**
 * Creates a Clerk organization via Supabase Edge Function
 * @param name The name of the organization
 * @param schoolId The ID of the school to associate with the organization
 * @returns The created organization's ID
 */
export const createClerkOrganization = async (name: string, schoolId: string): Promise<string> => {
  try {
    console.log(`Attempting to create Clerk organization "${name}" for school ID: ${schoolId}`);
    
    const { data, error } = await supabase.functions.invoke('create-organization', {
      body: { name, schoolId },
    });

    if (error) {
      console.error('Error creating Clerk organization:', error);
      throw new Error(error.message || 'Failed to create organization');
    }

    if (!data || !data.id) {
      console.error('Invalid response from create-organization function:', data);
      throw new Error('No organization ID returned from the server');
    }

    console.log('Successfully created Clerk organization with ID:', data.id);
    return data.id;
  } catch (error: any) {
    console.error('Error in createClerkOrganization:', error);
    throw new Error(error.message || 'Failed to create organization');
  }
}
