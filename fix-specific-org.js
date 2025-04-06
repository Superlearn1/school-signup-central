// Script to fix a specific organization
import fetch from 'node-fetch';

// Define constants
const SUPABASE_URL = 'https://bssiyrqombhhnvhwgkhz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzc2l5cnFvbWJoaG52aHdna2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NTYxNTQsImV4cCI6MjA1OTMzMjE1NH0.lwJGE6T-Zse2BqYLwB2STZDzZ2guoI8wAQvRlYD5L2M';
const CLERK_SECRET_KEY = 'sk_test_MbFgErPpyGCXbY9x3Y5L1pu0QAgVzItn2gpmkrkVRT';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Parameters to fix a specific organization - edit these as needed
const ORGANIZATION_ID = 'org_2vLvckzd8MueBQx0y3XfhCy0yRe'; // Replace with the organization ID you want to fix

const fixSpecificOrganization = async () => {
  console.log(`${colors.cyan}=== FIXING SPECIFIC ORGANIZATION ====${colors.reset}`);
  
  try {
    // 1. First, get the organization details
    console.log(`${colors.blue}Fetching organization details...${colors.reset}`);
    const orgResponse = await fetch(`https://api.clerk.com/v1/organizations/${ORGANIZATION_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!orgResponse.ok) {
      throw new Error(`Failed to fetch organization: ${orgResponse.statusText}`);
    }
    
    const organization = await orgResponse.json();
    console.log(`${colors.green}Found organization: ${organization.name} (${organization.id})${colors.reset}`);
    
    // Generate a clean school name
    const schoolName = organization.name.replace(/Test Org \d+/i, 'Test School');
    
    // 2. Check organization members to get the admin user ID
    console.log(`${colors.blue}Checking organization members to get admin user...${colors.reset}`);
    const membersResponse = await fetch(`https://api.clerk.com/v1/organizations/${organization.id}/memberships`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!membersResponse.ok) {
      throw new Error(`Failed to fetch members: ${membersResponse.statusText}`);
    }
    
    const members = await membersResponse.json();
    console.log(`Organization has ${members.data.length} members.`);
    
    // Get the admin user to set as claimed_by_user_id
    let adminUserId = null;
    
    // Check if any members need role updates
    for (const member of members.data) {
      console.log(`  - User ${member.public_user_data.user_id} with role: ${member.role}`);
      
      // Keep track of the admin user
      if (member.role === 'org:admin' || member.role === 'admin') {
        adminUserId = member.public_user_data.user_id;
      }
      
      // If role is not correctly set as org:admin, update it
      if (member.role !== 'org:admin') {
        console.log(`${colors.yellow}    Updating member role to org:admin...${colors.reset}`);
        const updateRoleResponse = await fetch(`https://api.clerk.com/v1/organizations/${organization.id}/memberships/${member.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: 'org:admin'
          })
        });
        
        if (updateRoleResponse.ok) {
          console.log(`${colors.green}    Successfully updated member role${colors.reset}`);
          adminUserId = member.public_user_data.user_id;
        } else {
          const errorDetails = await updateRoleResponse.text();
          console.log(`${colors.red}    Failed to update member role: ${errorDetails}${colors.reset}`);
        }
      }
    }
    
    if (!adminUserId) {
      throw new Error('No admin user found in the organization');
    }
    
    // 3. Check if school with this clerk_org_id already exists
    console.log(`${colors.blue}Checking if school already exists...${colors.reset}`);
    const existingSchoolResponse = await fetch(`${SUPABASE_URL}/rest/v1/schools?clerk_org_id=eq.${organization.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const existingSchools = await existingSchoolResponse.json();
    let schoolId = null;
    
    if (existingSchools && existingSchools.length > 0) {
      // School exists, update it
      schoolId = existingSchools[0].id;
      console.log(`${colors.green}Found existing school with ID: ${schoolId}${colors.reset}`);
      
      // Update the existing school
      console.log(`${colors.blue}Updating existing school...${colors.reset}`);
      const updateSchoolResponse = await fetch(`${SUPABASE_URL}/rest/v1/schools?id=eq.${schoolId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          name: schoolName,
          claimed: true,
          claimed_by_user_id: adminUserId,
          clerk_org_id: organization.id
        })
      });
      
      if (!updateSchoolResponse.ok) {
        const errorDetails = await updateSchoolResponse.text();
        throw new Error(`Failed to update school: ${updateSchoolResponse.statusText} - ${errorDetails}`);
      }
      
      console.log(`${colors.green}Successfully updated school${colors.reset}`);
    } else {
      // School doesn't exist, create it
      console.log(`${colors.blue}Creating new school in Supabase...${colors.reset}`);
      const schoolResponse = await fetch(`${SUPABASE_URL}/rest/v1/schools`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: schoolName,
          suburb: 'Testville',
          state: 'NSW',
          postcode: '2000',
          claimed: true,
          claimed_by_user_id: adminUserId,
          clerk_org_id: organization.id
        })
      });
      
      if (!schoolResponse.ok) {
        const errorDetails = await schoolResponse.text();
        throw new Error(`Failed to create school: ${schoolResponse.statusText} - ${errorDetails}`);
      }
      
      const school = await schoolResponse.json();
      schoolId = school[0]?.id;
      console.log(`${colors.green}Created school with ID: ${schoolId}${colors.reset}`);
    }
    
    // 4. Check if organization mapping exists
    console.log(`${colors.blue}Checking if organization mapping exists...${colors.reset}`);
    const existingMappingResponse = await fetch(`${SUPABASE_URL}/rest/v1/organizations?clerk_org_id=eq.${organization.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const existingMappings = await existingMappingResponse.json();
    
    if (existingMappings && existingMappings.length > 0) {
      // Mapping exists, update it
      console.log(`${colors.green}Found existing organization mapping${colors.reset}`);
      const mappingId = existingMappings[0].id;
      
      console.log(`${colors.blue}Updating organization mapping...${colors.reset}`);
      const updateMappingResponse = await fetch(`${SUPABASE_URL}/rest/v1/organizations?id=eq.${mappingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          school_id: schoolId,
          admin_id: adminUserId,
          name: schoolName,
          clerk_org_id: organization.id
        })
      });
      
      if (!updateMappingResponse.ok) {
        const errorDetails = await updateMappingResponse.text();
        throw new Error(`Failed to update mapping: ${updateMappingResponse.statusText} - ${errorDetails}`);
      }
      
      console.log(`${colors.green}Successfully updated organization mapping${colors.reset}`);
    } else {
      // Mapping doesn't exist, create it
      console.log(`${colors.blue}Creating organization mapping...${colors.reset}`);
      const mappingResponse = await fetch(`${SUPABASE_URL}/rest/v1/organizations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          clerk_org_id: organization.id,
          school_id: schoolId,
          admin_id: adminUserId,
          name: schoolName
        })
      });
      
      if (!mappingResponse.ok) {
        const errorDetails = await mappingResponse.text();
        throw new Error(`Failed to create mapping: ${mappingResponse.statusText} - ${errorDetails}`);
      }
      
      console.log(`${colors.green}Created organization mapping in Supabase${colors.reset}`);
    }
    
    // 5. Check if subscription exists
    console.log(`${colors.blue}Checking if subscription exists...${colors.reset}`);
    const existingSubscriptionResponse = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?school_id=eq.${schoolId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const existingSubscriptions = await existingSubscriptionResponse.json();
    
    if (existingSubscriptions && existingSubscriptions.length > 0) {
      // Subscription exists, update it
      console.log(`${colors.green}Found existing subscription${colors.reset}`);
      const subscriptionId = existingSubscriptions[0].id;
      
      console.log(`${colors.blue}Updating subscription...${colors.reset}`);
      const updateSubscriptionResponse = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?id=eq.${subscriptionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          total_teacher_seats: 10,
          used_teacher_seats: 0,
          total_student_seats: 1500,
          used_student_seats: 0,
          status: 'active'
        })
      });
      
      if (!updateSubscriptionResponse.ok) {
        const errorDetails = await updateSubscriptionResponse.text();
        throw new Error(`Failed to update subscription: ${updateSubscriptionResponse.statusText} - ${errorDetails}`);
      }
      
      console.log(`${colors.green}Successfully updated subscription${colors.reset}`);
    } else {
      // Subscription doesn't exist, create it
      console.log(`${colors.blue}Creating subscription for school...${colors.reset}`);
      const subscriptionResponse = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          school_id: schoolId,
          stripe_customer_id: `cus_test_${Date.now()}`,
          stripe_subscription_id: `sub_test_${Date.now()}`,
          total_teacher_seats: 10,
          used_teacher_seats: 0,
          total_student_seats: 1500,
          used_student_seats: 0,
          status: 'active'
        })
      });
      
      if (!subscriptionResponse.ok) {
        const errorDetails = await subscriptionResponse.text();
        throw new Error(`Failed to create subscription: ${subscriptionResponse.statusText} - ${errorDetails}`);
      }
      
      console.log(`${colors.green}Created subscription for school${colors.reset}`);
    }
    
    // 6. Update the organization metadata in Clerk
    console.log(`${colors.blue}Updating organization metadata in Clerk...${colors.reset}`);
    const updateMetadataResponse = await fetch(`https://api.clerk.com/v1/organizations/${organization.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        private_metadata: {
          ...organization.private_metadata,
          schoolId: schoolId
        }
      })
    });
    
    if (!updateMetadataResponse.ok) {
      const errorDetails = await updateMetadataResponse.text();
      throw new Error(`Failed to update metadata: ${updateMetadataResponse.statusText} - ${errorDetails}`);
    }
    
    console.log(`${colors.green}Successfully updated organization metadata with schoolId=${schoolId}${colors.reset}`);
    
    console.log(`\n${colors.green}=== ORGANIZATION FIXED SUCCESSFULLY ====${colors.reset}`);
    console.log(`${colors.green}Organization ID: ${organization.id}${colors.reset}`);
    console.log(`${colors.green}School ID: ${schoolId}${colors.reset}`);
    console.log(`${colors.green}The issue should now be resolved. Try inviting a teacher.${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  }
};

// Run the function
fixSpecificOrganization().catch(console.error); 