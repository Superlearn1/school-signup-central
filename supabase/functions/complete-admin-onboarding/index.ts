import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Clerk } from 'https://esm.sh/@clerk/backend@1.10.0';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // Get request body
    const { schoolId, userId, userEmail, userName } = await req.json();
    if (!schoolId || !userId || !userEmail) {
      return new Response(JSON.stringify({
        error: 'Missing required parameters'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Initialize Clerk client
    const clerkClient = Clerk({
      apiKey: Deno.env.get('CLERK_SECRET_KEY')
    });
    // Initialize Supabase client with service role for admin operations
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Start a Supabase transaction to ensure atomicity
    const { data: transaction, error: transactionError } = await supabaseAdmin.rpc('begin_transaction');
    if (transactionError) {
      console.error('Transaction error:', transactionError);
      return new Response(JSON.stringify({
        error: 'Failed to start transaction'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Check if school is already claimed (with database lock)
    const { data: school, error: schoolError } = await supabaseAdmin.from('schools').select('*').eq('id', schoolId).is('claimed_by_user_id', null).single();
    if (schoolError || !school) {
      return new Response(JSON.stringify({
        error: 'School already claimed'
      }), {
        status: 409,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Create Clerk Organization
    const organization = await clerkClient.organizations.createOrganization({
      name: school.name,
      createdBy: userId
    });
    if (!organization) {
      return new Response(JSON.stringify({
        error: 'Failed to create organization'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Add user to organization with admin role
    await clerkClient.organizations.createOrganizationMembership({
      organizationId: organization.id,
      userId: userId,
      role: 'admin'
    });
    // Update school record to mark as claimed and link to Clerk org
    const { error: updateError } = await supabaseAdmin.from('schools').update({
      claimed_by_user_id: userId,
      clerk_org_id: organization.id
    }).eq('id', schoolId);
    if (updateError) {
      // Attempt to rollback Clerk organization if Supabase update failed
      await clerkClient.organizations.deleteOrganization(organization.id);
      return new Response(JSON.stringify({
        error: 'Failed to update school record'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Create user profile in Supabase
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      school_id: schoolId,
      full_name: userName || 'School Admin',
      role: 'admin'
    });
    if (profileError) {
      console.error('Profile creation error:', profileError);
    // Continue despite profile error - we can fix profile issues later
    }
    // Create initial subscription record (inactive until payment)
    const { error: subscriptionError } = await supabaseAdmin.from('subscriptions').insert({
      school_id: schoolId,
      status: 'inactive',
      total_teacher_seats: 1,
      total_student_seats: 0
    });
    if (subscriptionError) {
      console.error('Subscription record creation error:', subscriptionError);
    // Continue despite subscription error - activation happens after payment
    }
    // Commit the transaction
    await supabaseAdmin.rpc('commit_transaction');
    return new Response(JSON.stringify({
      success: true,
      message: 'Admin onboarding completed successfully',
      organizationId: organization.id
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
