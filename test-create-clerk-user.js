// Script to create a test user in Clerk and then use that user for organization tests
import fetch from 'node-fetch';

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

// Test creating a user and adding to an organization
const testClerkUserAndOrg = async () => {
  // Define constants
  const SUPABASE_URL = 'https://bssiyrqombhhnvhwgkhz.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzc2l5cnFvbWJoaG52aHdna2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NTYxNTQsImV4cCI6MjA1OTMzMjE1NH0.lwJGE6T-Zse2BqYLwB2STZDzZ2guoI8wAQvRlYD5L2M';
  
  try {
    // Step 1: Create a new organization
    console.log(`${colors.cyan}=== CREATING NEW ORGANIZATION ====${colors.reset}`);
    const createOrgResponse = await fetch(`${SUPABASE_URL}/functions/v1/create-organization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        name: `Test Org ${Date.now()}`,
        schoolId: `test-school-${Date.now()}`,
        createTestUser: true
      })
    });
    
    const orgResult = await createOrgResponse.json();
    console.log(JSON.stringify(orgResult, null, 2));
    
    if (!orgResult.id) {
      console.log(`${colors.red}Failed to create organization${colors.reset}`);
      return;
    }
    
    const newOrgId = orgResult.id;
    console.log(`${colors.green}Created organization: ${newOrgId}${colors.reset}`);
    
    // If there's a created test user, try to add that user to the organization
    if (orgResult.testUserId) {
      const userId = orgResult.testUserId;
      console.log(`${colors.green}Created test user: ${userId}${colors.reset}`);
      
      // Try to manually add the test user to the organization
      console.log(`\n${colors.cyan}=== MANUALLY ADDING USER TO ORGANIZATION ====${colors.reset}`);
      const addResponse = await fetch(`${SUPABASE_URL}/functions/v1/manual-add-to-organization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          organizationId: newOrgId,
          userId: userId,
          role: 'admin'
        })
      });
      
      const addResult = await addResponse.json();
      console.log(JSON.stringify(addResult, null, 2));
      
      if (addResult.success) {
        console.log(`${colors.green}Successfully added user to organization${colors.reset}`);
      } else {
        console.log(`${colors.red}Failed to add user to organization: ${addResult.error}${colors.reset}`);
      }
      
      // Verify the membership
      console.log(`\n${colors.cyan}=== VERIFYING USER MEMBERSHIP ====${colors.reset}`);
      const verifyResponse = await fetch(`${SUPABASE_URL}/functions/v1/verify-admin-membership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          organizationId: newOrgId,
          userId: userId
        })
      });
      
      const verifyResult = await verifyResponse.json();
      console.log(JSON.stringify(verifyResult, null, 2));
      
      if (verifyResult.success) {
        console.log(`${colors.green}Successfully verified user membership${colors.reset}`);
      } else {
        console.log(`${colors.red}Failed to verify user membership${colors.reset}`);
      }
    } else {
      console.log(`${colors.yellow}No test user was created${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}Error in test: ${error.message}${colors.reset}`);
  }
};

testClerkUserAndOrg().catch(console.error); 