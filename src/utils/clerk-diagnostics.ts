import { supabase } from '@/integrations/supabase/client';

// Debug helper functions
const debugLog = (message: string, data?: any) => {
  console.log(`[ClerkDiagnostics] 🔍 ${message}`, data !== undefined ? data : '');
};

const errorLog = (message: string, error?: any) => {
  console.error(`[ClerkDiagnostics] ❌ ${message}`, error !== undefined ? error : '');
  if (error?.stack) {
    console.error(`[ClerkDiagnostics] Stack:`, error.stack);
  }
};

/**
 * Sets up a global diagnostics tool for Clerk organization debugging
 * Allows inspecting and rescuing organization metadata from the browser console
 */
export const setupClerkDiagnostics = (organization: any, supabaseClient = supabase) => {
  if (!organization || !organization.id) {
    errorLog('No valid organization provided for diagnostics setup');
    return;
  }
  
  try {
    (window as any).__clerkDiagnostics = {
      organization,
      
      // Inspect the organization object structure
      inspect: () => {
        console.group('🔍 Clerk Organization Inspector');
        console.log('Organization Object:', organization);
        console.log('Organization ID:', organization.id);
        console.log('Organization Type:', Object.prototype.toString.call(organization));
        
        try {
          console.log('Organization Constructor:', organization.constructor?.name);
          console.log('Organization Keys:', Object.keys(organization));
          console.log('Prototype Chain:', Object.getPrototypeOf(organization)?.constructor?.name);
          console.log('Has privateMetadata property:', 'privateMetadata' in organization);
          console.log('Has publicMetadata property:', 'publicMetadata' in organization);
        } catch (err) {
          console.error('Error inspecting organization object:', err);
        }
        
        // Inspect metadata properties
        console.log('privateMetadata:', organization.privateMetadata);
        console.log('publicMetadata:', organization.publicMetadata);
        
        // Try alternative access methods
        try {
          console.log('Alternative access attempts:');
          console.log('- Bracket notation:', organization['privateMetadata']);
          console.log('- Reflect.get():', Reflect.get(organization, 'privateMetadata'));
          
          // Look for property descriptors
          const proto = Object.getPrototypeOf(organization);
          if (proto) {
            const descriptors = Object.getOwnPropertyDescriptors(proto);
            console.log('- Prototype property descriptors:', descriptors);
          }
        } catch (err) {
          console.error('Error with alternative access methods:', err);
        }
        
        console.groupEnd();
      },
      
      // Test the reload method and its effect on metadata
      testReload: async () => {
        console.group('🔄 Organization Reload Test');
        
        try {
          console.log('Before reload:');
          console.log('- privateMetadata:', organization.privateMetadata);
          console.log('- publicMetadata:', organization.publicMetadata);
          
          console.log('Calling organization.reload()...');
          const startTime = performance.now();
          await organization.reload();
          const endTime = performance.now();
          
          console.log(`Reload completed in ${Math.round(endTime - startTime)}ms`);
          console.log('After reload:');
          console.log('- privateMetadata:', organization.privateMetadata);
          console.log('- publicMetadata:', organization.publicMetadata);
          
          // Check if metadata changed
          const beforePrivate = JSON.stringify(organization.privateMetadata);
          const afterPrivate = JSON.stringify(organization.privateMetadata);
          console.log('- privateMetadata changed:', beforePrivate !== afterPrivate);
        } catch (err) {
          console.error('Reload failed:', err);
        }
        
        console.groupEnd();
      },
      
      // Attempt to fix organization metadata via edge function
      rescueMetadata: async (schoolId: string) => {
        if (!schoolId) {
          console.error('No schoolId provided for rescue operation');
          return { success: false, error: 'No schoolId provided' };
        }
        
        console.group('🚨 RESCUE MODE: Fixing Organization Metadata');
        console.log('Organization ID:', organization.id);
        console.log('SchoolId to set:', schoolId);
        
        try {
          // First create the fix-organization-metadata function if it doesn't exist
          console.log('Creating temporary edge function to fix metadata');
          const { data: setupData, error: setupError } = await supabaseClient.functions.invoke('admin-operations', {
            body: {
              operation: 'setup-metadata-fixer',
              organizationId: organization.id,
              secretKey: prompt('Enter Clerk secret key (required for metadata update):')
            }
          });
          
          if (setupError) {
            console.error('Setup failed:', setupError);
            console.groupEnd();
            return { success: false, error: setupError };
          }
          
          console.log('Setup response:', setupData);
          
          // Now fix the metadata
          console.log('Fixing organization metadata...');
          const { data, error } = await supabaseClient.functions.invoke('fix-organization-metadata', {
            body: {
              organizationId: organization.id,
              schoolId: schoolId,
              operation: 'fix-private-metadata'
            }
          });
          
          if (error) {
            console.error('Fix operation failed:', error);
            console.groupEnd();
            return { success: false, error };
          }
          
          console.log('Fix operation response:', data);
          
          // Reload to verify changes
          console.log('Reloading organization to verify changes...');
          await organization.reload();
          
          console.log('After fix:');
          console.log('- privateMetadata:', organization.privateMetadata);
          console.log('- privateMetadata.schoolId:', organization.privateMetadata?.schoolId);
          
          const success = !!organization.privateMetadata?.schoolId;
          if (success) {
            console.log('✅ Fix operation successful! SchoolId is now in privateMetadata');
          } else {
            console.error('❌ Fix operation failed or not reflected in client');
          }
          
          console.groupEnd();
          return { success, data };
        } catch (err) {
          console.error('Fix operation error:', err);
          console.groupEnd();
          return { success: false, error: err };
        }
      },
      
      // Check SDK version compatibility
      checkVersion: () => {
        try {
          const sdkInfo = {
            clerkReactVersion: (window as any).Clerk?.version || 'Unknown',
            organizationHasPrivateMetadata: !!organization.privateMetadata,
            organizationHasPublicMetadata: !!organization.publicMetadata
          };
          
          console.log('Clerk SDK Version Info:', sdkInfo);
          return sdkInfo;
        } catch (err) {
          console.error('Version check failed:', err);
          return { error: err };
        }
      }
    };
    
    debugLog('Clerk diagnostic tools installed in window.__clerkDiagnostics');
    console.info(
      '%c🔧 Clerk Diagnostics Available 🔧\n' +
      'Run these commands in console:\n' +
      '- window.__clerkDiagnostics.inspect()\n' +
      '- window.__clerkDiagnostics.testReload()\n' +
      '- window.__clerkDiagnostics.rescueMetadata("school-id-here")\n' +
      '- window.__clerkDiagnostics.checkVersion()',
      'background: #4F46E5; color: white; padding: 4px 8px; border-radius: 4px;'
    );
    
    return (window as any).__clerkDiagnostics;
  } catch (err) {
    errorLog('Failed to set up Clerk diagnostics:', err);
    return null;
  }
};

/**
 * Run a comprehensive diagnosis of Clerk organization structure and metadata
 */
export const diagnoseClerkOrganization = async (organization: any) => {
  if (!organization) {
    return { success: false, error: 'No organization provided' };
  }
  
  try {
    const report = {
      organizationId: organization.id,
      hasPrivateMetadata: !!organization.privateMetadata,
      hasPublicMetadata: !!organization.publicMetadata,
      privateMetadataContent: organization.privateMetadata,
      publicMetadataContent: organization.publicMetadata,
      metadata: {
        schoolIdLocation: null as string | null,
        schoolIdValue: null as string | null,
      },
      organizationStructure: {
        constructorName: organization.constructor?.name,
        hasReloadMethod: typeof organization.reload === 'function',
        hasGetMembershipsMethod: typeof organization.getMemberships === 'function',
        hasInviteMemberMethod: typeof organization.inviteMember === 'function',
      }
    };
    
    // Determine where schoolId is located
    if (organization.privateMetadata?.schoolId) {
      report.metadata.schoolIdLocation = 'privateMetadata';
      report.metadata.schoolIdValue = organization.privateMetadata.schoolId;
    } else if (organization.publicMetadata?.schoolId) {
      report.metadata.schoolIdLocation = 'publicMetadata';
      report.metadata.schoolIdValue = organization.publicMetadata.schoolId;
    }
    
    debugLog('Organization diagnosis report:', report);
    return { success: true, report };
  } catch (err) {
    errorLog('Diagnosis failed:', err);
    return { success: false, error: err };
  }
};

export default {
  setupClerkDiagnostics,
  diagnoseClerkOrganization
}; 