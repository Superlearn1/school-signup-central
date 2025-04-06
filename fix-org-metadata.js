// Script to fix organization metadata in Clerk
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

const fixOrganizationMetadata = async () => {
  console.log(`${colors.cyan}=== CHECKING ORGANIZATION METADATA ====${colors.reset}`);
  
  try {
    // 1. First, fetch organizations from Clerk
    console.log(`${colors.blue}Fetching organizations from Clerk...${colors.reset}`);
    const orgResponse = await fetch('https://api.clerk.dev/v1/organizations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!orgResponse.ok) {
      throw new Error(`Failed to fetch organizations: ${orgResponse.statusText}`);
    }
    
    const organizations = await orgResponse.json();
    console.log(`${colors.green}Found ${organizations.data.length} organizations${colors.reset}`);
    
    // 2. Fetch schools from Supabase
    console.log(`${colors.blue}Fetching schools from Supabase...${colors.reset}`);
    const schoolsResponse = await fetch(`${SUPABASE_URL}/rest/v1/schools?select=*`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    if (!schoolsResponse.ok) {
      throw new Error(`Failed to fetch schools: ${schoolsResponse.statusText}`);
    }
    
    const schools = await schoolsResponse.json();
    console.log(`${colors.green}Found ${schools.length} schools${colors.reset}`);
    
    // 3. Fetch organizations from Supabase
    console.log(`${colors.blue}Fetching organization mappings from Supabase...${colors.reset}`);
    const orgMappingsResponse = await fetch(`${SUPABASE_URL}/rest/v1/organizations?select=*`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    if (!orgMappingsResponse.ok) {
      throw new Error(`Failed to fetch organization mappings: ${orgMappingsResponse.statusText}`);
    }
    
    const orgMappings = await orgMappingsResponse.json();
    console.log(`${colors.green}Found ${orgMappings.length} organization mappings${colors.reset}`);
    
    // 4. Check and update each organization's metadata
    for (const org of organizations.data) {
      console.log(`\n${colors.yellow}Organization: ${org.name} (${org.id})${colors.reset}`);
      
      // Check if this org has schoolId in metadata
      const hasSchoolId = org.public_metadata && org.public_metadata.schoolId;
      console.log(`  Has schoolId in metadata: ${hasSchoolId ? colors.green + 'Yes' + colors.reset : colors.red + 'No' + colors.reset}`);
      
      // Find mapping in Supabase
      const mapping = orgMappings.find(m => m.clerk_org_id === org.id);
      if (mapping) {
        console.log(`  Found mapping in Supabase: school_id = ${mapping.school_id}`);
        
        // Check if the school exists
        const school = schools.find(s => s.id === mapping.school_id);
        if (school) {
          console.log(`  School exists: ${school.name}`);
          
          // If metadata is missing or incorrect, update it
          if (!hasSchoolId || org.public_metadata.schoolId !== mapping.school_id) {
            console.log(`${colors.yellow}  Updating organization metadata...${colors.reset}`);
            
            const updateResponse = await fetch(`https://api.clerk.dev/v1/organizations/${org.id}/public_metadata`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                public_metadata: {
                  ...org.public_metadata,
                  schoolId: mapping.school_id
                }
              })
            });
            
            if (updateResponse.ok) {
              console.log(`${colors.green}  ✓ Successfully updated metadata${colors.reset}`);
            } else {
              const updateError = await updateResponse.json();
              console.log(`${colors.red}  ✗ Failed to update metadata: ${JSON.stringify(updateError)}${colors.reset}`);
            }
          } else {
            console.log(`${colors.green}  ✓ Metadata is correct${colors.reset}`);
          }
        } else {
          console.log(`${colors.red}  ✗ School with ID ${mapping.school_id} not found${colors.reset}`);
        }
      } else {
        console.log(`${colors.red}  ✗ No mapping found in Supabase${colors.reset}`);
        
        // Let's see if we can find a school by name similarity
        const schoolNameFromOrg = org.name.toLowerCase().replace(/\s+/g, ' ').trim();
        const possibleSchools = schools.filter(s => {
          const schoolName = s.name.toLowerCase().replace(/\s+/g, ' ').trim();
          return schoolName === schoolNameFromOrg || 
                 schoolName.includes(schoolNameFromOrg) || 
                 schoolNameFromOrg.includes(schoolName);
        });
        
        if (possibleSchools.length === 1) {
          console.log(`${colors.yellow}  Found a possible matching school: ${possibleSchools[0].name}${colors.reset}`);
          
          // Create mapping in Supabase
          console.log(`${colors.blue}  Creating mapping in Supabase...${colors.reset}`);
          const createMappingResponse = await fetch(`${SUPABASE_URL}/rest/v1/organizations`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'apikey': SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              clerk_org_id: org.id,
              school_id: possibleSchools[0].id
            })
          });
          
          if (createMappingResponse.ok) {
            console.log(`${colors.green}  ✓ Successfully created mapping${colors.reset}`);
            
            // Update metadata in Clerk
            console.log(`${colors.yellow}  Updating organization metadata...${colors.reset}`);
            const updateResponse = await fetch(`https://api.clerk.dev/v1/organizations/${org.id}/public_metadata`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                public_metadata: {
                  ...org.public_metadata,
                  schoolId: possibleSchools[0].id
                }
              })
            });
            
            if (updateResponse.ok) {
              console.log(`${colors.green}  ✓ Successfully updated metadata${colors.reset}`);
            } else {
              const updateError = await updateResponse.json();
              console.log(`${colors.red}  ✗ Failed to update metadata: ${JSON.stringify(updateError)}${colors.reset}`);
            }
          } else {
            const createError = await createMappingResponse.json();
            console.log(`${colors.red}  ✗ Failed to create mapping: ${JSON.stringify(createError)}${colors.reset}`);
          }
        } else if (possibleSchools.length > 1) {
          console.log(`${colors.yellow}  Found multiple possible matching schools:${colors.reset}`);
          possibleSchools.forEach((s, i) => {
            console.log(`    ${i+1}. ${s.name} (${s.id})`);
          });
        } else {
          console.log(`${colors.red}  ✗ No matching school found${colors.reset}`);
        }
      }
      
      // 5. Check members of this organization
      console.log(`${colors.blue}  Checking organization members...${colors.reset}`);
      const membersResponse = await fetch(`https://api.clerk.dev/v1/organizations/${org.id}/memberships`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (membersResponse.ok) {
        const members = await membersResponse.json();
        console.log(`  Organization has ${members.data.length} members:`);
        
        for (const member of members.data) {
          const role = member.role;
          console.log(`    - User ${member.public_user_data.user_id} with role: ${role}`);
        }
      } else {
        console.log(`${colors.red}  ✗ Failed to fetch members: ${membersResponse.statusText}${colors.reset}`);
      }
    }
    
    console.log(`\n${colors.green}=== DONE CHECKING ORGANIZATION METADATA ====${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  }
};

// Run the function
fixOrganizationMetadata().catch(console.error); 