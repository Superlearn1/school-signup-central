// Test script to verify Clerk organization creation and membership addition
const testManualAddToOrg = async () => {
  const SUPABASE_URL = 'https://bssiyrqombhhnvhwgkhz.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzc2l5cnFvbWJoaG52aHdna2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NTYxNTQsImV4cCI6MjA1OTMzMjE1NH0.lwJGE6T-Zse2BqYLwB2STZDzZ2guoI8wAQvRlYD5L2M';
  
  // Using actual values from the database query
  const TEST_ORG_ID = 'org_2vLr3NF9TcVW8LhWwlbMChxoiyx'; // Academy of Mary Immaculate
  const TEST_USER_ID = 'user_2vLr2zS7trOVFIJwZ6e46PFtGdr'; // Current admin from the database
  
  // Let's also try with a different user ID that isn't already an admin
  const TEST_NEW_USER_ID = 'user_2vKjJo4PTWN1xRkNPjSSh3mq2Qy'; // Different user
  
  try {
    console.log('Testing verify-admin-membership function with current admin...');
    
    // First, check if the current admin is recognized as an admin
    const verifyCurrentResponse = await fetch(`${SUPABASE_URL}/functions/v1/verify-admin-membership`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        requestId: `verify_current_${Date.now()}`
      })
    });
    
    const verifyCurrentResult = await verifyCurrentResponse.json();
    console.log('Verify current admin result:', JSON.stringify(verifyCurrentResult, null, 2));
    
    // Now try adding a different user
    console.log('\nTesting manual-add-to-organization function with new user...');
    
    const manualAddResponse = await fetch(`${SUPABASE_URL}/functions/v1/manual-add-to-organization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        userId: TEST_NEW_USER_ID,
        role: 'admin',
        requestId: `test_manual_${Date.now()}`
      })
    });
    
    const manualAddResult = await manualAddResponse.json();
    console.log('Manual add result:', JSON.stringify(manualAddResult, null, 2));
    
    // Verify the new user's membership
    const verifyNewResponse = await fetch(`${SUPABASE_URL}/functions/v1/verify-admin-membership`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        organizationId: TEST_ORG_ID,
        userId: TEST_NEW_USER_ID,
        requestId: `verify_new_${Date.now()}`
      })
    });
    
    const verifyNewResult = await verifyNewResponse.json();
    console.log('Verify new user result:', JSON.stringify(verifyNewResult, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

testManualAddToOrg(); 