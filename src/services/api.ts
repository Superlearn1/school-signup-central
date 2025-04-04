
import { createClient } from '@supabase/supabase-js';
import { School, Organization, Profile, Subscription } from '@/types';
import { supabase } from '@/integrations/supabase/client';

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
    .select('claimed')
    .eq('id', schoolId)
    .single();

  if (error) {
    console.error('Error checking school availability:', error);
    throw error;
  }

  return !data.claimed;
};

export const claimSchool = async (schoolId: string, clerkUserId: string): Promise<void> => {
  const { error } = await supabase
    .from('schools')
    .update({ claimed: true, claimed_by_user_id: clerkUserId })
    .eq('id', schoolId);

  if (error) {
    console.error('Error claiming school:', error);
    throw error;
  }
};

export const createOrganization = async (schoolId: string, adminId: string, schoolName: string, clerkOrgId?: string): Promise<Organization> => {
  const { data, error } = await supabase
    .from('organizations')
    .insert([
      { 
        school_id: schoolId, 
        admin_id: adminId, 
        name: schoolName,
        clerk_org_id: clerkOrgId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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

export const createProfile = async (userId: string, schoolId: string, role: string, fullName?: string): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .insert([
      {
        id: userId,
        school_id: schoolId,
        role: role,
        full_name: fullName,
        clerk_user_id: userId
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    throw error;
  }

  return data;
};

export const initializeSubscription = async (schoolId: string): Promise<Subscription> => {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert([
      {
        school_id: schoolId,
        status: 'inactive',
        total_teacher_seats: 1,
        used_teacher_seats: 0,
        total_student_seats: 0,
        used_student_seats: 0
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error initializing subscription:', error);
    throw error;
  }

  return data;
};
