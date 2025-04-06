#!/usr/bin/env node

/**
 * Organization Metadata Fix Utility
 * 
 * This script will:
 * 1. Query all organizations in Clerk
 * 2. Check each organization's metadata for schoolId
 * 3. Fix organizations with inconsistent metadata by ensuring schoolId is in both privateMetadata and publicMetadata
 * 4. Optionally focus on specific organizations by ID
 * 
 * Usage:
 *   node fix-all-orgs.js                      # Fix all organizations
 *   node fix-all-orgs.js --org ORG_ID         # Fix a specific organization
 *   node fix-all-orgs.js --school SCHOOL_ID   # Fix all organizations linked to a school
 */

import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

// Setup dotenv
dotenv.config();

// Setup for working with __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Configuration
const CLERK_API_KEY = process.env.CLERK_API_KEY || process.env.VITE_CLERK_SECRET_KEY;
const CLERK_API_URL = 'https://api.clerk.com/v1';

// Command line args
const args = process.argv.slice(2);
const options = {
  orgId: null,
  schoolId: null,
  dryRun: false
};

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--org' && i + 1 < args.length) {
    options.orgId = args[i + 1];
    i++;
  } else if (args[i] === '--school' && i + 1 < args.length) {
    options.schoolId = args[i + 1];
    i++;
  } else if (args[i] === '--dry-run') {
    options.dryRun = true;
  }
}

// Helper functions
const debugLog = (message, data) => {
  console.log(`[DEBUG] ${message}`, data !== undefined ? data : '');
};

const errorLog = (message, error) => {
  console.error(`[ERROR] ${message}`, error !== undefined ? error : '');
};

// Fetch all organizations or a specific one
async function fetchOrganizations() {
  try {
    let url = `${CLERK_API_URL}/organizations`;
    if (options.orgId) {
      url = `${CLERK_API_URL}/organizations/${options.orgId}`;
    }
    
    debugLog(`Fetching organizations from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CLERK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch organizations: ${response.statusText}`);
    }

    const responseBody = await response.json();
    debugLog(`API response format:`, JSON.stringify(responseBody).substring(0, 200) + '...');
    
    // Handle different response formats
    let organizations = [];
    
    if (options.orgId) {
      // Single organization response
      organizations = [responseBody];
    } else if (Array.isArray(responseBody)) {
      // Direct array response
      organizations = responseBody;
    } else if (responseBody.data && Array.isArray(responseBody.data)) {
      // { data: [...] } format
      organizations = responseBody.data;
    } else {
      console.warn('Unexpected API response format:', responseBody);
      organizations = [];
    }
    
    return organizations;
  } catch (error) {
    errorLog('Error fetching organizations:', error);
    return [];
  }
}

// Update organization metadata
async function updateOrganizationMetadata(orgId, privateMetadata, publicMetadata) {
  try {
    if (options.dryRun) {
      debugLog(`[DRY RUN] Would update org ${orgId} with:`, { privateMetadata, publicMetadata });
      return true;
    }
    
    const response = await fetch(`${CLERK_API_URL}/organizations/${orgId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CLERK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        private_metadata: privateMetadata,
        public_metadata: publicMetadata
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to update organization: ${response.statusText}`);
    }

    const data = await response.json();
    debugLog(`Successfully updated organization ${orgId}:`, data);
    return true;
  } catch (error) {
    errorLog(`Error updating organization ${orgId}:`, error);
    return false;
  }
}

// Main function
async function main() {
  debugLog('Starting organization metadata fix utility');
  debugLog('Options:', options);
  
  // 1. Fetch organizations
  const organizations = await fetchOrganizations();
  debugLog(`Found ${organizations.length} organizations to process`);
  
  // Track statistics
  const stats = {
    total: organizations.length,
    needsFix: 0,
    fixed: 0,
    failed: 0,
    alreadyConsistent: 0
  };
  
  // 2. Process each organization
  for (const org of organizations) {
    debugLog(`Processing organization: ${org.name} (${org.id})`);
    
    // Extract current metadata
    const privateMetadata = org.private_metadata || {};
    const publicMetadata = org.public_metadata || {};
    
    // Check for schoolId in either location
    const privateSchoolId = privateMetadata.schoolId;
    const publicSchoolId = publicMetadata.schoolId;
    
    // If filtering by schoolId, skip organizations that don't match
    if (options.schoolId && privateSchoolId !== options.schoolId && publicSchoolId !== options.schoolId) {
      debugLog(`Skipping organization ${org.id} - doesn't match school ID filter`);
      continue;
    }
    
    // Determine if fix is needed
    const needsConsistencyFix = 
      (privateSchoolId && !publicSchoolId) || 
      (!privateSchoolId && publicSchoolId) ||
      (privateSchoolId && publicSchoolId && privateSchoolId !== publicSchoolId);
    
    if (!privateSchoolId && !publicSchoolId) {
      debugLog(`Organization ${org.id} has no schoolId in either location, skipping`);
      continue;
    }
    
    if (needsConsistencyFix) {
      stats.needsFix++;
      
      // Determine which schoolId to use (prefer private)
      const correctSchoolId = privateSchoolId || publicSchoolId;
      
      debugLog(`Organization ${org.id} needs metadata fix:`, {
        privateSchoolId,
        publicSchoolId,
        correctSchoolId
      });
      
      // Update the metadata
      const updatedPrivateMetadata = {
        ...privateMetadata,
        schoolId: correctSchoolId
      };
      
      const updatedPublicMetadata = {
        ...publicMetadata,
        schoolId: correctSchoolId
      };
      
      const success = await updateOrganizationMetadata(
        org.id,
        updatedPrivateMetadata,
        updatedPublicMetadata
      );
      
      if (success) {
        stats.fixed++;
        console.log(`✅ Fixed organization ${org.id} (${org.name})`);
      } else {
        stats.failed++;
        console.log(`❌ Failed to fix organization ${org.id} (${org.name})`);
      }
    } else if (privateSchoolId && publicSchoolId && privateSchoolId === publicSchoolId) {
      stats.alreadyConsistent++;
      debugLog(`Organization ${org.id} already has consistent metadata`);
    }
  }
  
  // 3. Print summary
  console.log('\n--- Organization Fix Summary ---');
  console.log(`Total organizations: ${stats.total}`);
  console.log(`Organizations needing fixes: ${stats.needsFix}`);
  console.log(`Successfully fixed: ${stats.fixed}`);
  console.log(`Failed to fix: ${stats.failed}`);
  console.log(`Already consistent: ${stats.alreadyConsistent}`);
  
  if (options.dryRun) {
    console.log('\nThis was a dry run. No changes were made.');
    console.log('Run without --dry-run to apply the fixes.');
  }
}

// Run the script
main().catch(error => {
  errorLog('Unhandled error in main function:', error);
  process.exit(1);
}); 