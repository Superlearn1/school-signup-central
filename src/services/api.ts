
import { createClient } from '@supabase/supabase-js';
import { School } from '@/types';

// Initialize Supabase client (this assumes environment variables are set)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const fetchSchools = async (): Promise<School[]> => {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching schools:', error);
    throw error;
  }

  return data || [];
};

export const checkSchoolAvailability = async (schoolId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('schools')
    .select('claimed, user_id')
    .eq('id', schoolId)
    .single();

  if (error) {
    console.error('Error checking school availability:', error);
    throw error;
  }

  return !data.claimed;
};

export const claimSchool = async (schoolId: string, userId: string): Promise<void> => {
  const { error } = await supabase
    .from('schools')
    .update({ claimed: true, user_id: userId })
    .eq('id', schoolId);

  if (error) {
    console.error('Error claiming school:', error);
    throw error;
  }
};

export const createOrganization = async (schoolId: string, userId: string, schoolName: string) => {
  // Create an organization in your database
  const { data, error } = await supabase
    .from('organizations')
    .insert([
      { 
        school_id: schoolId, 
        admin_id: userId, 
        name: schoolName,
        created_at: new Date()
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating organization:', error);
    throw error;
  }

  return data;
};
