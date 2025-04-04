
import { createClient } from '@supabase/supabase-js';
import { School, Organization, Profile, Subscription, Student, Resource, ResourceAdaptation, NCCDEvidence } from '@/types';
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

  return (data || []) as School[];
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
  // Use raw query to avoid type issues with the organizations table
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
    .select();

  if (error) {
    console.error('Error creating organization:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to create organization');
  }

  return data[0] as Organization;
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
    .select();

  if (error) {
    console.error('Error creating profile:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to create profile');
  }

  return data[0] as Profile;
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
    .select();

  if (error) {
    console.error('Error initializing subscription:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to initialize subscription');
  }

  return data[0] as Subscription;
};

// Student management API functions
export const fetchStudents = async (schoolId: string): Promise<Student[]> => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('school_id', schoolId)
    .order('full_name');

  if (error) {
    console.error('Error fetching students:', error);
    throw error;
  }

  // Transform the data to match our Student type format
  const students = (data || []).map(student => {
    // For UI display, split full_name into first_name and last_name if needed
    let firstName = '';
    let lastName = '';
    
    if (student.full_name) {
      const nameParts = student.full_name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    return {
      ...student,
      first_name: firstName,
      last_name: lastName,
      disabilities: student.disabilities || []
    } as Student;
  });

  return students;
};

export const createStudent = async (student: Omit<Student, 'id' | 'created_at'>): Promise<Student> => {
  // Transform from our UI format to database format
  const dbStudent = {
    school_id: student.school_id,
    student_id: student.student_id,
    full_name: `${student.first_name} ${student.last_name}`.trim(),
    disabilities: student.disabilities || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('students')
    .insert([dbStudent])
    .select();

  if (error) {
    console.error('Error creating student:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to create student');
  }

  // Transform back to our Student type format
  const newStudent = {
    ...data[0],
    first_name: student.first_name,
    last_name: student.last_name,
    disabilities: data[0].disabilities || []
  } as Student;

  return newStudent;
};

export const updateStudent = async (studentId: string, updates: Partial<Omit<Student, 'id' | 'created_at'>>): Promise<Student> => {
  // Transform from our UI format to database format
  const dbUpdates: any = { ...updates };
  
  // If both first_name and last_name are provided, update full_name
  if (updates.first_name !== undefined || updates.last_name !== undefined) {
    // Get the current student to get the existing names if only one part is being updated
    const { data: currentStudent } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .single();
    
    const firstName = updates.first_name !== undefined ? updates.first_name : currentStudent?.first_name || '';
    const lastName = updates.last_name !== undefined ? updates.last_name : currentStudent?.last_name || '';
    
    dbUpdates.full_name = `${firstName} ${lastName}`.trim();
    
    // Remove first_name and last_name from dbUpdates as they're not in the database
    delete dbUpdates.first_name;
    delete dbUpdates.last_name;
  }
  
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('students')
    .update(dbUpdates)
    .eq('id', studentId)
    .select();

  if (error) {
    console.error('Error updating student:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to update student');
  }

  // Transform back to our Student type format
  const nameParts = data[0].full_name ? data[0].full_name.split(' ') : ['', ''];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const updatedStudent = {
    ...data[0],
    first_name: firstName,
    last_name: lastName,
    disabilities: data[0].disabilities || []
  } as Student;

  return updatedStudent;
};

export const deleteStudent = async (studentId: string): Promise<void> => {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', studentId);

  if (error) {
    console.error('Error deleting student:', error);
    throw error;
  }
};

// Resource management API functions
export const fetchResources = async (schoolId: string): Promise<Resource[]> => {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching resources:', error);
    throw error;
  }

  // Transform data to match our Resource type
  const resources = (data || []).map(resource => ({
    ...resource,
    content: resource.content || '',
  } as Resource));

  return resources;
};

export const createResource = async (resource: Omit<Resource, 'id' | 'created_at'>): Promise<Resource> => {
  // Make sure we're using created_by instead of teacher_id
  const dbResource = {
    school_id: resource.school_id,
    created_by: resource.created_by,
    title: resource.title,
    content: resource.content || '',
    type: resource.type,
    subject: resource.subject || null,
    objective: resource.objective || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('resources')
    .insert([dbResource])
    .select();

  if (error) {
    console.error('Error creating resource:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to create resource');
  }

  return data[0] as Resource;
};
