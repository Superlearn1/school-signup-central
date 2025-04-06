// Diagnostic script to check Clerk API key status
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

// Testing different Clerk API endpoints
const clerkDiagnostics = async () => {
  const testOrganizationId = 'org_2vLuXtK5LlOi2B8P18iSkJkOix6'; // Use a recently created org ID
  const testUserId = 'user_2vLuXiqkgwiJ8Lo4AlNQeJAsOXd'; // Use a recently created user ID
  
  // 1. First check if Edge Functions can see environment variables
  console.log(`${colors.cyan}=== CHECKING EDGE FUNCTION ENVIRONMENT ====${colors.reset}`);
  try {
    const envResponse = await fetch('https://bssiyrqombhhnvhwgkhz.supabase.co/functions/v1/create-organization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzc2l5cnFvbWJoaG52aHdna2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NTYxNTQsImV4cCI6MjA1OTMzMjE1NH0.lwJGE6T-Zse2BqYLwB2STZDzZ2guoI8wAQvRlYD5L2M'
      },
      body: JSON.stringify({ 
        debug: true, 
        checkEnv: true,
        schoolId: 'test-school-id',
        name: 'Test School',
        adminUserId: testUserId
      })
    });
    
    const envData = await envResponse.json();
    console.log(envData);
    
    if (envData.clerkKeyPresent === true) {
      console.log(`${colors.green}✓ CLERK_SECRET_KEY is present in the Edge Function environment${colors.reset}`);
      
      if (envData.clerkKeyInfo?.valid === false) {
        console.log(`${colors.red}✗ CLERK_SECRET_KEY is present but has invalid format${colors.reset}`);
        console.log(`${colors.yellow}  Key prefix: ${envData.clerkKeyInfo.prefix}... (should start with sk_test_ or sk_live_)${colors.reset}`);
      } else if (envData.clerkKeyInfo?.valid === true) {
        console.log(`${colors.green}✓ CLERK_SECRET_KEY has valid format${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}✗ CLERK_SECRET_KEY is NOT present in the Edge Function environment${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}Error checking environment: ${error.message}${colors.reset}`);
  }
  
  // 2. Run comprehensive API permission diagnostics
  console.log(`\n${colors.cyan}=== RUNNING COMPREHENSIVE API DIAGNOSTICS ====${colors.reset}`);
  try {
    const diagnosticResponse = await fetch('https://bssiyrqombhhnvhwgkhz.supabase.co/functions/v1/manual-add-to-organization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzc2l5cnFvbWJoaG52aHdna2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NTYxNTQsImV4cCI6MjA1OTMzMjE1NH0.lwJGE6T-Zse2BqYLwB2STZDzZ2guoI8wAQvRlYD5L2M'
      },
      body: JSON.stringify({
        organizationId: testOrganizationId,
        userId: testUserId,
        diagnosticRequest: true
      })
    });
    
    const diagnosticData = await diagnosticResponse.json();
    console.log(`${colors.yellow}API Diagnostics Results:${colors.reset}`);
    
    // Print key info
    const keyInfo = diagnosticData.diagnosticResults?.clerkKeyInfo;
    if (keyInfo) {
      console.log(`  API Key: ${keyInfo.present ? colors.green + '✓ Present' : colors.red + '✗ Missing'}${colors.reset}`);
      console.log(`  Format: ${keyInfo.valid ? colors.green + '✓ Valid' : colors.red + '✗ Invalid'}${colors.reset}`);
      if (keyInfo.prefix) {
        console.log(`  Prefix: ${keyInfo.prefix}...`);
      }
    }
    
    // Print API test results
    const apiTests = diagnosticData.diagnosticResults?.apiTests;
    if (apiTests) {
      console.log(`\n${colors.yellow}API Endpoints Access:${colors.reset}`);
      
      // List Users
      if (apiTests.listUsers) {
        console.log(`  List Users: ${apiTests.listUsers.success 
          ? colors.green + '✓ Success' 
          : colors.red + '✗ Failed: ' + apiTests.listUsers.error}${colors.reset}`);
        
        if (apiTests.listUsers.success && apiTests.listUsers.firstUser) {
          console.log(`    Sample User: ${apiTests.listUsers.firstUser.id} (${apiTests.listUsers.firstUser.email})`);
        }
      }
      
      // List Organizations
      if (apiTests.listOrganizations) {
        console.log(`  List Organizations: ${apiTests.listOrganizations.success 
          ? colors.green + '✓ Success' 
          : colors.red + '✗ Failed: ' + apiTests.listOrganizations.error}${colors.reset}`);
        
        if (apiTests.listOrganizations.success && apiTests.listOrganizations.firstOrg) {
          console.log(`    Sample Organization: ${apiTests.listOrganizations.firstOrg.id} (${apiTests.listOrganizations.firstOrg.name})`);
        }
      }
      
      // Specific Organization
      if (apiTests.specificOrganization) {
        console.log(`  Get Specific Org (${testOrganizationId}): ${apiTests.specificOrganization.success 
          ? colors.green + '✓ Success' 
          : colors.red + '✗ Failed: ' + apiTests.specificOrganization.error}${colors.reset}`);
      }
      
      // Specific User
      if (apiTests.specificUser) {
        console.log(`  Get Specific User (${testUserId}): ${apiTests.specificUser.success 
          ? colors.green + '✓ Success' 
          : colors.red + '✗ Failed: ' + apiTests.specificUser.error}${colors.reset}`);
      }
    }
    
    // Print membership test results
    const membershipTest = diagnosticData.diagnosticResults?.membershipTest;
    if (membershipTest) {
      console.log(`\n${colors.yellow}Membership Test:${colors.reset}`);
      console.log(`  Check Memberships: ${membershipTest.success 
        ? colors.green + '✓ Success' 
        : colors.red + '✗ Failed: ' + membershipTest.error}${colors.reset}`);
      
      if (membershipTest.success) {
        console.log(`  User has ${membershipTest.userMemberships} organization memberships`);
        console.log(`  Already member of test org: ${membershipTest.isAlreadyMember 
          ? colors.green + '✓ Yes' 
          : colors.yellow + '✗ No'}${colors.reset}`);
      }
    }
    
    // Print errors and recommendations
    if (diagnosticData.diagnosticResults?.errors && diagnosticData.diagnosticResults?.errors.length > 0) {
      console.log(`\n${colors.red}Errors:${colors.reset}`);
      diagnosticData.diagnosticResults.errors.forEach((error, i) => {
        console.log(`  ${i+1}. ${error}`);
      });
    }
    
    if (diagnosticData.recommendations && diagnosticData.recommendations.length > 0) {
      console.log(`\n${colors.cyan}Recommendations:${colors.reset}`);
      diagnosticData.recommendations.forEach((rec, i) => {
        console.log(`  ${i+1}. ${rec}`);
      });
    }
  } catch (error) {
    console.error(`${colors.red}Error running diagnostics: ${error.message}${colors.reset}`);
  }
  
  // 3. Try to manually add test user to organization
  console.log(`\n${colors.cyan}=== TESTING MANUAL ADD TO ORGANIZATION ====${colors.reset}`);
  try {
    const manualAddResponse = await fetch('https://bssiyrqombhhnvhwgkhz.supabase.co/functions/v1/manual-add-to-organization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzc2l5cnFvbWJoaG52aHdna2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NTYxNTQsImV4cCI6MjA1OTMzMjE1NH0.lwJGE6T-Zse2BqYLwB2STZDzZ2guoI8wAQvRlYD5L2M'
      },
      body: JSON.stringify({
        organizationId: testOrganizationId,
        userId: testUserId,
        role: 'admin'
      })
    });
    
    const manualAddData = await manualAddResponse.json();
    console.log(JSON.stringify(manualAddData, null, 2));
    
    if (manualAddData.error) {
      console.log(`${colors.red}✗ Manual add failed: ${manualAddData.error}${colors.reset}`);
      
      if (manualAddData.suggestedAction) {
        console.log(`${colors.yellow}Suggested action: ${manualAddData.suggestedAction}${colors.reset}`);
      }
      
      if (manualAddData.details?.errors) {
        console.log(`${colors.yellow}Details:${colors.reset}`);
        manualAddData.details.errors.forEach(err => {
          console.log(`  - Code: ${err.code}, Message: ${err.message}`);
        });
      }
    } else if (manualAddData.success) {
      console.log(`${colors.green}✓ Successfully added user to organization${colors.reset}`);
      if (manualAddData.alreadyMember) {
        console.log(`  Note: User was already a member of this organization`);
      }
    }
  } catch (error) {
    console.error(`${colors.red}Error testing manual add: ${error.message}${colors.reset}`);
  }
  
  console.log(`\n${colors.cyan}=== FINAL RECOMMENDATIONS ====${colors.reset}`);
  console.log(`1. Make sure CLERK_SECRET_KEY is set in Supabase: Run 'supabase secrets set CLERK_SECRET_KEY=sk_xxx'`);
  console.log(`2. Verify the key has the right permissions in Clerk dashboard (particularly 'organizations:write')`);
  console.log(`3. Confirm the key is from the same Clerk account where your organizations exist`);
  console.log(`4. After updating the key, redeploy all functions with 'supabase functions deploy [function-name]'`);
};

clerkDiagnostics().catch(console.error); 